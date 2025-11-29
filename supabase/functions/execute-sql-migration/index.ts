import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SQLStatement {
  type: string;
  content: string;
  tableName?: string;
  schemaName?: string;
  lineNumber: number;
  dangerLevel: 'safe' | 'warning' | 'critical';
}

interface ExecutionRequest {
  sql: string;
  fileName?: string;
  migrationName: string;
  statements: SQLStatement[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error('Service role key or Supabase URL not configured');
    }

    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Get safety configuration
    const { data: safetyConfig } = await supabaseAdmin
      .from('migration_safety_config')
      .select('*')
      .limit(1)
      .single();

    const requireBackup = safetyConfig?.require_backup ?? true;
    const requireDryRun = safetyConfig?.require_dry_run ?? true;
    const autoRollbackOnError = safetyConfig?.auto_rollback_on_error ?? true;

    // Get user from request
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const supabaseClient = createClient(
        supabaseUrl,
        Deno.env.get('SUPABASE_ANON_KEY') || ''
      );
      const { data: { user } } = await supabaseClient.auth.getUser(
        authHeader.replace('Bearer ', '')
      );
      userId = user?.id || null;
    }

    const body: ExecutionRequest & { backupId?: string; dryRunPassed?: boolean } = await req.json();
    const { sql, fileName, migrationName, statements, backupId, dryRunPassed } = body;

    console.log('Starting SQL migration:', { 
      migrationName, 
      statementsCount: statements.length,
      hasBackup: !!backupId,
      dryRunPassed
    });

    // Validate safety requirements
    if (requireBackup && !backupId) {
      throw new Error('Backup is required before executing migration');
    }

    if (requireDryRun && !dryRunPassed) {
      throw new Error('Dry-run must pass before executing migration');
    }

    // Create migration history record
    const { data: historyRecord, error: historyError } = await supabaseAdmin
      .from('migration_history')
      .insert({
        migration_name: migrationName,
        file_name: fileName,
        sql_content: sql,
        executed_by: userId,
        status: 'executing',
        method: 'option2',
        operations_total: statements.length,
        backup_id: backupId,
        dry_run_passed: dryRunPassed || false,
      })
      .select()
      .single();

    if (historyError) {
      console.error('Error creating history record:', historyError);
      throw historyError;
    }

    const startTime = Date.now();
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    // Begin transaction for atomic execution
    console.log('Beginning transaction...');
    await supabaseAdmin.rpc('exec_sql', { sql_query: 'BEGIN;' });

    try {
      // Execute statements one by one
      for (const stmt of statements) {
      try {
        console.log(`Executing statement ${successCount + failCount + 1}/${statements.length}:`, stmt.type);
        
        // Execute raw SQL using the exec_sql RPC function
        const { data, error: execError } = await supabaseAdmin.rpc('exec_sql', {
          sql_query: stmt.content
        });

        if (execError || (data && !data.success)) {
          const errorMsg = execError?.message || data?.error || 'Unknown error';
          console.error('Statement execution error:', errorMsg);
          failCount++;
          errors.push(`Line ${stmt.lineNumber}: ${errorMsg}`);
          
          // Stop on first error for safety
          break;
        } else {
          successCount++;
        }
        } catch (err) {
          console.error('Statement execution exception:', err);
          failCount++;
          const errorMessage = err instanceof Error ? err.message : String(err);
          errors.push(`Line ${stmt.lineNumber}: ${errorMessage}`);
          break;
        }
      }

      const duration = Date.now() - startTime;
      
      // Commit or rollback based on results
      if (failCount === 0) {
        console.log('Committing transaction...');
        await supabaseAdmin.rpc('exec_sql', { sql_query: 'COMMIT;' });
      } else {
        console.log('Rolling back transaction due to errors...');
        await supabaseAdmin.rpc('exec_sql', { sql_query: 'ROLLBACK;' });
      }

      const finalStatus = failCount === 0 ? 'success' : 'failed';

      // Update history record
      await supabaseAdmin
        .from('migration_history')
        .update({
          status: finalStatus,
          operations_successful: successCount,
          operations_failed: failCount,
          duration_ms: duration,
          error_message: errors.length > 0 ? errors.join('\n') : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', historyRecord.id);

      console.log('Migration completed:', { 
        status: finalStatus, 
        successCount, 
        failCount, 
        duration 
      });

      return new Response(
        JSON.stringify({
          success: failCount === 0,
          historyId: historyRecord.id,
          operationsSuccessful: successCount,
          operationsFailed: failCount,
          totalOperations: statements.length,
          duration,
          errors: errors.length > 0 ? errors : null,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: failCount === 0 ? 200 : 500,
        }
      );
    } catch (transactionError) {
      // Ensure rollback on any error
      console.error('Transaction error, rolling back:', transactionError);
      try {
        await supabaseAdmin.rpc('exec_sql', { sql_query: 'ROLLBACK;' });
      } catch (rollbackErr) {
        console.error('Rollback error:', rollbackErr);
      }
      throw transactionError;
    }
  } catch (error) {
    console.error('Error in execute-sql-migration:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        details: errorDetails,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
