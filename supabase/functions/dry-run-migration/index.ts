import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DryRunRequest {
  statements: Array<{
    type: string;
    content: string;
    tableName?: string;
    schemaName?: string;
    lineNumber: number;
    dangerLevel: string;
  }>;
  migrationName: string;
}

interface DryRunResult {
  success: boolean;
  passed: boolean;
  statementsExecuted: number;
  statementsFailed: number;
  errors: Array<{
    statementNumber: number;
    error: string;
    statement: string;
  }>;
  warnings: string[];
  duration: number;
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

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const body: DryRunRequest = await req.json();
    const { statements, migrationName } = body;

    console.log('Starting dry-run for migration:', migrationName);

    const startTime = Date.now();
    const errors: Array<{ statementNumber: number; error: string; statement: string }> = [];
    const warnings: string[] = [];
    let executedCount = 0;
    let failedCount = 0;

    // Create temporary schema for testing
    const testSchemaName = `test_migration_${Date.now()}`;
    
    try {
      // Create test schema
      console.log('Creating test schema:', testSchemaName);
      const { error: createSchemaError } = await supabaseAdmin.rpc('exec_sql', {
        sql_query: `CREATE SCHEMA IF NOT EXISTS ${testSchemaName};`
      });

      if (createSchemaError) {
        throw new Error(`Failed to create test schema: ${createSchemaError.message}`);
      }

      // Execute each statement in the test schema
      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        
        // Skip certain operations in dry-run
        if (stmt.dangerLevel === 'critical') {
          warnings.push(`Skipping critical operation: ${stmt.type} (line ${stmt.lineNumber})`);
          continue;
        }

        // Modify statement to use test schema if it affects tables
        let testSQL = stmt.content;
        if (stmt.type.includes('TABLE') || stmt.type.includes('CREATE_INDEX')) {
          testSQL = testSQL.replace(/public\./g, `${testSchemaName}.`);
          if (!testSQL.includes(testSchemaName)) {
            // Add schema prefix if not present
            testSQL = testSQL.replace(/CREATE TABLE\s+(?!IF)/i, `CREATE TABLE ${testSchemaName}.`);
            testSQL = testSQL.replace(/ALTER TABLE\s+/i, `ALTER TABLE ${testSchemaName}.`);
            testSQL = testSQL.replace(/DROP TABLE\s+/i, `DROP TABLE ${testSchemaName}.`);
          }
        }

        console.log(`Dry-run executing statement ${i + 1}/${statements.length}:`, stmt.type);

        try {
          const { data, error: execError } = await supabaseAdmin.rpc('exec_sql', {
            sql_query: testSQL
          });

          if (execError || (data && !data.success)) {
            const errorMsg = execError?.message || data?.error || 'Unknown error';
            console.error('Dry-run statement error:', errorMsg);
            errors.push({
              statementNumber: i + 1,
              error: errorMsg,
              statement: stmt.content.substring(0, 100) + '...'
            });
            failedCount++;
          } else {
            executedCount++;
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          console.error('Dry-run statement exception:', errorMessage);
          errors.push({
            statementNumber: i + 1,
            error: errorMessage,
            statement: stmt.content.substring(0, 100) + '...'
          });
          failedCount++;
        }
      }

    } finally {
      // Always clean up test schema
      console.log('Cleaning up test schema:', testSchemaName);
      try {
        await supabaseAdmin.rpc('exec_sql', {
          sql_query: `DROP SCHEMA IF EXISTS ${testSchemaName} CASCADE;`
        });
      } catch (cleanupErr) {
        console.error('Error cleaning up test schema:', cleanupErr);
        warnings.push(`Failed to cleanup test schema: ${testSchemaName}`);
      }
    }

    const duration = Date.now() - startTime;
    const passed = failedCount === 0;

    console.log('Dry-run completed:', {
      passed,
      executedCount,
      failedCount,
      duration
    });

    const result: DryRunResult = {
      success: true,
      passed,
      statementsExecuted: executedCount,
      statementsFailed: failedCount,
      errors,
      warnings,
      duration
    };

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in dry-run-migration:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(
      JSON.stringify({
        success: false,
        passed: false,
        statementsExecuted: 0,
        statementsFailed: 0,
        errors: [{ statementNumber: 0, error: errorMessage, statement: '' }],
        warnings: [],
        duration: 0
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
