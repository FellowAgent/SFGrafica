import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Detecting schema drift...');

    // 1. Buscar versão atual registrada
    const { data: currentVersion, error: versionError } = await supabase
      .from('schema_versions')
      .select('*')
      .eq('is_current', true)
      .single();

    if (versionError && versionError.code !== 'PGRST116') {
      throw versionError;
    }

    if (!currentVersion) {
      return new Response(JSON.stringify({
        hasDrift: false,
        warning: 'No schema version registered. Please create a baseline version.',
        message: 'Nenhuma versão de schema registrada'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Exportar schema real atual
    const exportResponse = await supabase.functions.invoke('export-schema', {
      body: { includeData: false }
    });

    if (exportResponse.error) throw exportResponse.error;

    const realSchema = exportResponse.data;

    // 3. Gerar checksum do schema real
    const realChecksum = await generateChecksum(realSchema.sql);

    console.log('Expected checksum:', currentVersion.checksum);
    console.log('Real checksum:', realChecksum);

    // 4. Comparar checksums
    const hasDrift = realChecksum !== currentVersion.checksum;

    if (hasDrift) {
      console.log('DRIFT DETECTED!');

      // 5. Identificar diferenças específicas
      const realSnapshot = {
        tables: realSchema.tables || [],
        functions: realSchema.functions || [],
        policies: realSchema.policies || [],
        triggers: realSchema.triggers || [],
        indexes: realSchema.indexes || [],
      };

      const differences = compareSnapshots(currentVersion.schema_snapshot, realSnapshot);

      // 6. Registrar drift log
      const { error: logError } = await supabase
        .from('schema_drift_logs')
        .insert({
          expected_version: currentVersion.version,
          expected_checksum: currentVersion.checksum,
          actual_checksum: realChecksum,
          differences: differences,
        });

      if (logError) {
        console.error('Error logging drift:', logError);
      }

      return new Response(JSON.stringify({
        hasDrift: true,
        expectedVersion: currentVersion.version,
        expectedChecksum: currentVersion.checksum,
        actualChecksum: realChecksum,
        differences,
        message: 'Schema atual difere da versão registrada',
        severity: calculateDriftSeverity(differences)
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('No drift detected');

    return new Response(JSON.stringify({
      hasDrift: false,
      version: currentVersion.version,
      checksum: currentVersion.checksum,
      message: 'Schema está sincronizado'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error detecting drift:', error);
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

function compareSnapshots(expected: any, actual: any): any {
  const differences: any = {
    tables: { added: [], removed: [], modified: [] },
    functions: { added: [], removed: [] },
    policies: { added: [], removed: [] },
    triggers: { added: [], removed: [] },
    indexes: { added: [], removed: [] },
  };

  // Comparar tabelas
  const expectedTables = new Set((expected?.tables || []).map((t: any) => t.name || t));
  const actualTables = new Set((actual?.tables || []).map((t: any) => t.name || t));

  for (const table of actualTables) {
    if (!expectedTables.has(table)) {
      differences.tables.added.push(table);
    }
  }

  for (const table of expectedTables) {
    if (!actualTables.has(table)) {
      differences.tables.removed.push(table);
    }
  }

  // Comparar funções
  const expectedFunctions = new Set((expected?.functions || []).map((f: any) => f.name || f));
  const actualFunctions = new Set((actual?.functions || []).map((f: any) => f.name || f));

  for (const func of actualFunctions) {
    if (!expectedFunctions.has(func)) {
      differences.functions.added.push(func);
    }
  }

  for (const func of expectedFunctions) {
    if (!actualFunctions.has(func)) {
      differences.functions.removed.push(func);
    }
  }

  // Comparar policies
  const expectedPolicies = new Set((expected?.policies || []).map((p: any) => 
    `${p.table || p.tablename}.${p.name || p.policyname}`
  ));
  const actualPolicies = new Set((actual?.policies || []).map((p: any) => 
    `${p.table || p.tablename}.${p.name || p.policyname}`
  ));

  for (const policy of actualPolicies) {
    if (!expectedPolicies.has(policy)) {
      differences.policies.added.push(policy);
    }
  }

  for (const policy of expectedPolicies) {
    if (!actualPolicies.has(policy)) {
      differences.policies.removed.push(policy);
    }
  }

  return differences;
}

function calculateDriftSeverity(differences: any): 'low' | 'medium' | 'high' | 'critical' {
  const tablesRemoved = differences.tables.removed.length;
  const functionsRemoved = differences.functions.removed.length;
  const policiesRemoved = differences.policies.removed.length;

  if (tablesRemoved > 0) return 'critical';
  if (functionsRemoved > 2 || policiesRemoved > 5) return 'high';
  if (functionsRemoved > 0 || policiesRemoved > 0) return 'medium';
  return 'low';
}
