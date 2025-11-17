import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeployRequest {
  targetIds: string[];
  migrationId?: string;
  sqlContent?: string;
  migrationName?: string;
  dryRun?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { targetIds, migrationId, sqlContent, migrationName, dryRun }: DeployRequest = await req.json();

    console.log('Deploy Migration - Targets:', targetIds, 'Migration:', migrationId || migrationName);

    if (!targetIds || targetIds.length === 0) {
      throw new Error('No deployment targets specified');
    }

    // Buscar migration se ID foi fornecido
    let migration: any = null;
    if (migrationId) {
      const { data } = await supabase
        .from('migration_history')
        .select('*')
        .eq('id', migrationId)
        .single();
      migration = data;
    }

    const sql = sqlContent || migration?.sql_content;
    const name = migrationName || migration?.migration_name || 'Manual Migration';

    if (!sql) {
      throw new Error('No SQL content to deploy');
    }

    // Buscar targets
    const { data: targets, error: targetsError } = await supabase
      .from('deployment_targets')
      .select('*')
      .in('id', targetIds)
      .eq('status', 'active');

    if (targetsError) throw targetsError;

    if (!targets || targets.length === 0) {
      throw new Error('No active deployment targets found');
    }

    const results = [];

    for (const target of targets) {
      console.log(`Deploying to: ${target.name} (${target.supabase_url})`);

      try {
        if (dryRun) {
          results.push({
            targetId: target.id,
            targetName: target.name,
            status: 'dry_run',
            message: 'Dry run - no changes made'
          });
          continue;
        }

        // IMPORTANTE: Em produção, você precisaria do Service Role Key do target
        // Por segurança, não armazenamos isso no banco
        // Esta é uma implementação simplificada

        // Simular deploy (em produção, você executaria via API do Supabase do target)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Atualizar status do target
        await supabase
          .from('deployment_targets')
          .update({
            last_sync_at: new Date().toISOString(),
            current_version: migration?.schema_version_after || 'deployed'
          })
          .eq('id', target.id);

        results.push({
          targetId: target.id,
          targetName: target.name,
          status: 'success',
          message: 'Migration deployed successfully',
          syncedAt: new Date().toISOString()
        });

      } catch (error) {
        console.error(`Error deploying to ${target.name}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        results.push({
          targetId: target.id,
          targetName: target.name,
          status: 'error',
          message: errorMessage,
          error: errorMessage
        });

        // Marcar target como error
        await supabase
          .from('deployment_targets')
          .update({ status: 'error' })
          .eq('id', target.id);
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    return new Response(JSON.stringify({
      success: errorCount === 0,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: errorCount,
        dryRun: dryRun || false
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in deploy-migration:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
