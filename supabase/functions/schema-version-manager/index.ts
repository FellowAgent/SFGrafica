import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VersionManagerRequest {
  action: 'get_current' | 'create_version' | 'compare_versions' | 'check_update' | 'list_versions';
  version?: string;
  description?: string;
  targetVersion?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, version, description, targetVersion }: VersionManagerRequest = await req.json();

    console.log('Schema Version Manager - Action:', action);

    switch (action) {
      case 'get_current': {
        const { data, error } = await supabase
          .from('schema_versions')
          .select('*')
          .eq('is_current', true)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        return new Response(JSON.stringify({ data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'list_versions': {
        const { data, error } = await supabase
          .from('schema_versions')
          .select('*')
          .order('applied_at', { ascending: false });

        if (error) throw error;

        return new Response(JSON.stringify({ data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'create_version': {
        if (!version || !description) {
          throw new Error('Version and description are required');
        }

        // 1. Exportar schema atual
        const exportResponse = await supabase.functions.invoke('export-schema', {
          body: { includeData: false }
        });

        if (exportResponse.error) throw exportResponse.error;

        const schemaExport = exportResponse.data;

        // 2. Gerar checksum
        const checksum = await generateChecksum(schemaExport.sql);

        // 3. Criar snapshot JSON
        const snapshot = {
          tables: schemaExport.tables || [],
          functions: schemaExport.functions || [],
          policies: schemaExport.policies || [],
          triggers: schemaExport.triggers || [],
          indexes: schemaExport.indexes || [],
          extensions: schemaExport.extensions || [],
          enums: schemaExport.enums || [],
          sequences: schemaExport.sequences || [],
          exportedAt: new Date().toISOString()
        };

        // 4. Marcar versão anterior como não-current
        await supabase
          .from('schema_versions')
          .update({ is_current: false })
          .eq('is_current', true);

        // 5. Inserir nova versão
        const { data, error } = await supabase
          .from('schema_versions')
          .insert({
            version,
            description,
            checksum,
            schema_snapshot: snapshot,
            is_current: true,
            applied_by: req.headers.get('x-user-id') || null
          })
          .select()
          .single();

        if (error) throw error;

        console.log('New schema version created:', version);

        return new Response(JSON.stringify({ data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'compare_versions': {
        if (!version || !targetVersion) {
          throw new Error('Both version and targetVersion are required');
        }

        const { data: versions, error } = await supabase
          .from('schema_versions')
          .select('*')
          .in('version', [version, targetVersion]);

        if (error) throw error;

        if (!versions || versions.length !== 2) {
          throw new Error('One or both versions not found');
        }

        const v1 = versions.find(v => v.version === version);
        const v2 = versions.find(v => v.version === targetVersion);

        // Comparar snapshots
        const differences = compareSnapshots(v1.schema_snapshot, v2.schema_snapshot);

        return new Response(JSON.stringify({
          version1: v1,
          version2: v2,
          differences
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'check_update': {
        const { data: currentVersion } = await supabase
          .from('schema_versions')
          .select('version, checksum')
          .eq('is_current', true)
          .single();

        // Exportar schema real atual
        const exportResponse = await supabase.functions.invoke('export-schema', {
          body: { includeData: false }
        });

        if (exportResponse.error) throw exportResponse.error;

        const realChecksum = await generateChecksum(exportResponse.data.sql);

        const updateAvailable = currentVersion && realChecksum !== currentVersion.checksum;

        return new Response(JSON.stringify({
          currentVersion: currentVersion?.version || null,
          currentChecksum: currentVersion?.checksum || null,
          realChecksum,
          updateAvailable,
          message: updateAvailable 
            ? 'Schema atual difere da versão registrada' 
            : 'Schema está sincronizado'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Error in schema-version-manager:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateChecksum(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function compareSnapshots(snap1: any, snap2: any): any {
  const differences: any = {
    tables: { added: [], removed: [], modified: [] },
    functions: { added: [], removed: [], modified: [] },
    policies: { added: [], removed: [], modified: [] },
    triggers: { added: [], removed: [], modified: [] },
    indexes: { added: [], removed: [], modified: [] },
  };

  // Comparar tabelas
  const tables1 = new Set((snap1?.tables || []).map((t: any) => t.name));
  const tables2 = new Set((snap2?.tables || []).map((t: any) => t.name));

  for (const table of tables2) {
    if (!tables1.has(table)) {
      differences.tables.added.push(table);
    }
  }

  for (const table of tables1) {
    if (!tables2.has(table)) {
      differences.tables.removed.push(table);
    }
  }

  // Comparar funções
  const functions1 = new Set((snap1?.functions || []).map((f: any) => f.name));
  const functions2 = new Set((snap2?.functions || []).map((f: any) => f.name));

  for (const func of functions2) {
    if (!functions1.has(func)) {
      differences.functions.added.push(func);
    }
  }

  for (const func of functions1) {
    if (!functions2.has(func)) {
      differences.functions.removed.push(func);
    }
  }

  // Comparar policies
  const policies1 = new Set((snap1?.policies || []).map((p: any) => `${p.table}.${p.name}`));
  const policies2 = new Set((snap2?.policies || []).map((p: any) => `${p.table}.${p.name}`));

  for (const policy of policies2) {
    if (!policies1.has(policy)) {
      differences.policies.added.push(policy);
    }
  }

  for (const policy of policies1) {
    if (!policies2.has(policy)) {
      differences.policies.removed.push(policy);
    }
  }

  return differences;
}
