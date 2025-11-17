import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SchemaDiffRequest {
  version1?: string;
  version2?: string;
  schemaSnapshot1?: any;
  schemaSnapshot2?: any;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { version1, version2, schemaSnapshot1, schemaSnapshot2 }: SchemaDiffRequest = await req.json();

    console.log('Schema Diff - Comparing:', version1, 'vs', version2);

    let snap1 = schemaSnapshot1;
    let snap2 = schemaSnapshot2;

    // Se versões foram fornecidas, buscar do banco
    if (version1 && !snap1) {
      const { data } = await supabase
        .from('schema_versions')
        .select('schema_snapshot')
        .eq('version', version1)
        .single();
      snap1 = data?.schema_snapshot;
    }

    if (version2 && !snap2) {
      const { data } = await supabase
        .from('schema_versions')
        .select('schema_snapshot')
        .eq('version', version2)
        .single();
      snap2 = data?.schema_snapshot;
    }

    if (!snap1 || !snap2) {
      throw new Error('Schema snapshots not found');
    }

    // Comparação detalhada
    const differences = performDetailedComparison(snap1, snap2);

    // Gerar SQL de migração
    const migrationSQL = generateMigrationSQL(differences);

    return new Response(JSON.stringify({
      differences,
      migrationSQL,
      summary: generateSummary(differences)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in schema-diff:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function performDetailedComparison(snap1: any, snap2: any): any {
  const differences: any = {
    tables: {
      added: [],
      removed: [],
      modified: []
    },
    columns: {
      added: [],
      removed: [],
      modified: []
    },
    functions: {
      added: [],
      removed: [],
      modified: []
    },
    policies: {
      added: [],
      removed: [],
      modified: []
    },
    triggers: {
      added: [],
      removed: [],
      modified: []
    },
    indexes: {
      added: [],
      removed: [],
      modified: []
    },
    extensions: {
      added: [],
      removed: []
    },
    enums: {
      added: [],
      removed: [],
      modified: []
    }
  };

  // Comparar tabelas
  const tables1 = new Map((snap1?.tables || []).map((t: any) => [t.name || t, t]));
  const tables2 = new Map((snap2?.tables || []).map((t: any) => [t.name || t, t]));

  for (const [name, table] of tables2) {
    if (!tables1.has(name)) {
      differences.tables.added.push({ name, table });
    } else {
      // Verificar se houve modificações na tabela
      const table1 = tables1.get(name);
      if (JSON.stringify(table1) !== JSON.stringify(table)) {
        differences.tables.modified.push({ name, old: table1, new: table });
      }
    }
  }

  for (const [name] of tables1) {
    if (!tables2.has(name)) {
      differences.tables.removed.push({ name });
    }
  }

  // Comparar funções
  const funcs1 = new Map((snap1?.functions || []).map((f: any) => [f.name || f, f]));
  const funcs2 = new Map((snap2?.functions || []).map((f: any) => [f.name || f, f]));

  for (const [name, func] of funcs2) {
    if (!funcs1.has(name)) {
      differences.functions.added.push({ name, function: func });
    } else {
      const func1 = funcs1.get(name);
      if (JSON.stringify(func1) !== JSON.stringify(func)) {
        differences.functions.modified.push({ name, old: func1, new: func });
      }
    }
  }

  for (const [name] of funcs1) {
    if (!funcs2.has(name)) {
      differences.functions.removed.push({ name });
    }
  }

  // Comparar policies
  const policies1 = new Map((snap1?.policies || []).map((p: any) => 
    [`${p.table || p.tablename}.${p.name || p.policyname}`, p]
  ));
  const policies2 = new Map((snap2?.policies || []).map((p: any) => 
    [`${p.table || p.tablename}.${p.name || p.policyname}`, p]
  ));

  for (const [key, policy] of policies2) {
    if (!policies1.has(key)) {
      differences.policies.added.push({ key, policy });
    } else {
      const policy1 = policies1.get(key);
      if (JSON.stringify(policy1) !== JSON.stringify(policy)) {
        differences.policies.modified.push({ key, old: policy1, new: policy });
      }
    }
  }

  for (const [key] of policies1) {
    if (!policies2.has(key)) {
      differences.policies.removed.push({ key });
    }
  }

  // Comparar triggers
  const triggers1 = new Set((snap1?.triggers || []).map((t: any) => t.name || t));
  const triggers2 = new Set((snap2?.triggers || []).map((t: any) => t.name || t));

  for (const trigger of triggers2) {
    if (!triggers1.has(trigger)) {
      differences.triggers.added.push({ name: trigger });
    }
  }

  for (const trigger of triggers1) {
    if (!triggers2.has(trigger)) {
      differences.triggers.removed.push({ name: trigger });
    }
  }

  // Comparar indexes
  const indexes1 = new Set((snap1?.indexes || []).map((i: any) => i.name || i));
  const indexes2 = new Set((snap2?.indexes || []).map((i: any) => i.name || i));

  for (const index of indexes2) {
    if (!indexes1.has(index)) {
      differences.indexes.added.push({ name: index });
    }
  }

  for (const index of indexes1) {
    if (!indexes2.has(index)) {
      differences.indexes.removed.push({ name: index });
    }
  }

  // Comparar extensões
  const exts1 = new Set((snap1?.extensions || []).map((e: any) => e.name || e));
  const exts2 = new Set((snap2?.extensions || []).map((e: any) => e.name || e));

  for (const ext of exts2) {
    if (!exts1.has(ext)) {
      differences.extensions.added.push({ name: ext });
    }
  }

  for (const ext of exts1) {
    if (!exts2.has(ext)) {
      differences.extensions.removed.push({ name: ext });
    }
  }

  // Comparar enums
  const enums1 = new Map((snap1?.enums || []).map((e: any) => [e.name || e, e]));
  const enums2 = new Map((snap2?.enums || []).map((e: any) => [e.name || e, e]));

  for (const [name, enumType] of enums2) {
    if (!enums1.has(name)) {
      differences.enums.added.push({ name, enum: enumType });
    } else {
      const enum1 = enums1.get(name);
      if (JSON.stringify(enum1) !== JSON.stringify(enumType)) {
        differences.enums.modified.push({ name, old: enum1, new: enumType });
      }
    }
  }

  for (const [name] of enums1) {
    if (!enums2.has(name)) {
      differences.enums.removed.push({ name });
    }
  }

  return differences;
}

function generateMigrationSQL(differences: any): string {
  const sqlStatements: string[] = [];

  sqlStatements.push('-- Generated Migration SQL');
  sqlStatements.push('-- WARNING: Review carefully before executing\n');

  // Extensões adicionadas
  if (differences.extensions.added.length > 0) {
    sqlStatements.push('-- Add Extensions');
    for (const ext of differences.extensions.added) {
      sqlStatements.push(`CREATE EXTENSION IF NOT EXISTS "${ext.name}";`);
    }
    sqlStatements.push('');
  }

  // Enums adicionados
  if (differences.enums.added.length > 0) {
    sqlStatements.push('-- Add Enums');
    for (const enumItem of differences.enums.added) {
      if (typeof enumItem.enum === 'object' && enumItem.enum.values) {
        const values = enumItem.enum.values.map((v: string) => `'${v}'`).join(', ');
        sqlStatements.push(`CREATE TYPE ${enumItem.name} AS ENUM (${values});`);
      }
    }
    sqlStatements.push('');
  }

  // Tabelas adicionadas
  if (differences.tables.added.length > 0) {
    sqlStatements.push('-- Add Tables');
    for (const table of differences.tables.added) {
      sqlStatements.push(`-- TODO: Add CREATE TABLE statement for ${table.name}`);
      sqlStatements.push(`-- Review schema snapshot for table structure`);
    }
    sqlStatements.push('');
  }

  // Funções adicionadas
  if (differences.functions.added.length > 0) {
    sqlStatements.push('-- Add Functions');
    for (const func of differences.functions.added) {
      sqlStatements.push(`-- TODO: Add CREATE FUNCTION statement for ${func.name}`);
    }
    sqlStatements.push('');
  }

  // Policies adicionadas
  if (differences.policies.added.length > 0) {
    sqlStatements.push('-- Add Policies');
    for (const policy of differences.policies.added) {
      sqlStatements.push(`-- TODO: Add CREATE POLICY statement for ${policy.key}`);
    }
    sqlStatements.push('');
  }

  // Triggers adicionados
  if (differences.triggers.added.length > 0) {
    sqlStatements.push('-- Add Triggers');
    for (const trigger of differences.triggers.added) {
      sqlStatements.push(`-- TODO: Add CREATE TRIGGER statement for ${trigger.name}`);
    }
    sqlStatements.push('');
  }

  // Indexes adicionados
  if (differences.indexes.added.length > 0) {
    sqlStatements.push('-- Add Indexes');
    for (const index of differences.indexes.added) {
      sqlStatements.push(`-- TODO: Add CREATE INDEX statement for ${index.name}`);
    }
    sqlStatements.push('');
  }

  // Removals (comentados por segurança)
  if (differences.tables.removed.length > 0) {
    sqlStatements.push('-- Remove Tables (COMMENTED FOR SAFETY)');
    for (const table of differences.tables.removed) {
      sqlStatements.push(`-- DROP TABLE IF EXISTS ${table.name} CASCADE;`);
    }
    sqlStatements.push('');
  }

  return sqlStatements.join('\n');
}

function generateSummary(differences: any): any {
  const summary = {
    totalChanges: 0,
    byCategory: {} as any,
    severity: 'low' as 'low' | 'medium' | 'high' | 'critical'
  };

  for (const [category, changes] of Object.entries(differences)) {
    const categoryChanges = changes as any;
    const count = (categoryChanges.added?.length || 0) + 
                  (categoryChanges.removed?.length || 0) + 
                  (categoryChanges.modified?.length || 0);
    
    if (count > 0) {
      summary.byCategory[category] = {
        added: categoryChanges.added?.length || 0,
        removed: categoryChanges.removed?.length || 0,
        modified: categoryChanges.modified?.length || 0,
        total: count
      };
      summary.totalChanges += count;
    }
  }

  // Calcular severidade
  if (differences.tables.removed.length > 0) {
    summary.severity = 'critical';
  } else if (differences.tables.added.length > 5 || differences.functions.removed.length > 3) {
    summary.severity = 'high';
  } else if (summary.totalChanges > 10) {
    summary.severity = 'medium';
  }

  return summary;
}
