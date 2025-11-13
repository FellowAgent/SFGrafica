import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Extension {
  name: string;
  version: string;
}

interface EnumType {
  name: string;
  values: string[];
}

interface Column {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
  udt_name: string;
}

interface TableInfo {
  name: string;
  columns: Column[];
  primary_keys: string[];
  foreign_keys: Array<{
    column: string;
    foreign_table: string;
    foreign_column: string;
    delete_rule: string;
  }>;
}

interface Policy {
  table: string;
  name: string;
  permissive: string;
  roles: string[];
  command: string;
  qual: string | null;
  with_check: string | null;
}

interface FunctionInfo {
  name: string;
  definition: string;
}

interface TriggerInfo {
  name: string;
  table: string;
  timing: string;
  event: string;
  function_call: string;
}

interface IndexInfo {
  name: string;
  table: string;
  definition: string;
}

interface Bucket {
  name: string;
  public: boolean;
}

interface StoragePolicy {
  name: string;
  permissive: string;
  roles: string[];
  command: string;
  qual: string | null;
  with_check: string | null;
}

interface ViewInfo {
  name: string;
  definition: string;
  is_materialized: boolean;
}

interface SequenceInfo {
  name: string;
  data_type: string;
  start_value: string;
  increment: string;
  max_value: string;
  min_value: string;
  cache_value: string;
}

interface ConstraintInfo {
  table: string;
  name: string;
  type: string;
  definition: string;
}

async function getExtensions(supabase: any): Promise<Extension[]> {
  const { data, error } = await supabase.rpc('exec_sql_query', {
    sql_query: `
      SELECT extname as name, extversion as version 
      FROM pg_extension 
      WHERE extname NOT IN ('plpgsql')
      ORDER BY extname
    `
  });

  if (error) {
    console.error('Erro ao buscar extensões:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

async function getEnumTypes(supabase: any): Promise<EnumType[]> {
  const { data, error } = await supabase.rpc('exec_sql_query', {
    sql_query: `
      SELECT 
        t.typname as name,
        array_agg(e.enumlabel ORDER BY e.enumsortorder) as values
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      GROUP BY t.typname
      ORDER BY t.typname
    `
  });

  if (error) {
    console.error('Erro ao buscar ENUMs:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

async function getTables(supabase: any): Promise<string[]> {
  const { data, error } = await supabase.rpc('exec_sql_query', {
    sql_query: `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `
  });

  if (error) {
    console.error('Erro ao buscar tabelas:', error);
    return [];
  }

  const tables = Array.isArray(data) ? data : [];
  return tables.map((t: any) => t.table_name);
}

async function getTableInfo(supabase: any, tableName: string): Promise<TableInfo> {
  // Buscar colunas
  const { data: columnsData } = await supabase.rpc('exec_sql_query', {
    sql_query: `
      SELECT column_name, data_type, is_nullable, column_default, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = '${tableName}'
      ORDER BY ordinal_position
    `
  });
  
  const columns = Array.isArray(columnsData) ? columnsData : [];

  const tableInfo: TableInfo = {
    name: tableName,
    columns: columns?.map((c: any) => ({
      name: c.column_name,
      type: c.data_type,
      nullable: c.is_nullable === 'YES',
      default: c.column_default,
      udt_name: c.udt_name
    })) || [],
    primary_keys: [],
    foreign_keys: []
  };

  // Buscar primary keys
  const { data: pksData } = await supabase.rpc('exec_sql_query', {
    sql_query: `
      SELECT kcu.column_name
      FROM information_schema.key_column_usage kcu
      JOIN information_schema.table_constraints tc 
        ON kcu.constraint_name = tc.constraint_name
      WHERE tc.table_schema = 'public' 
        AND tc.table_name = '${tableName}'
        AND tc.constraint_type = 'PRIMARY KEY'
      ORDER BY kcu.ordinal_position
    `
  });

  const pks = Array.isArray(pksData) ? pksData : [];
  if (pks.length > 0) {
    tableInfo.primary_keys = pks.map(pk => pk.column_name);
  }

  // Buscar foreign keys
  const { data: fksData } = await supabase.rpc('exec_sql_query', {
    sql_query: `
      SELECT
        kcu.column_name as column,
        ccu.table_name AS foreign_table,
        ccu.column_name AS foreign_column,
        rc.delete_rule
      FROM information_schema.key_column_usage kcu
      JOIN information_schema.referential_constraints rc 
        ON kcu.constraint_name = rc.constraint_name
      JOIN information_schema.constraint_column_usage ccu 
        ON rc.constraint_name = ccu.constraint_name
      WHERE kcu.table_schema = 'public' 
        AND kcu.table_name = '${tableName}'
    `
  });

  const fks = Array.isArray(fksData) ? fksData : [];
  tableInfo.foreign_keys = fks;

  return tableInfo;
}

async function getPolicies(supabase: any): Promise<Policy[]> {
  const { data, error } = await supabase.rpc('exec_sql_query', {
    sql_query: `
      SELECT 
        tablename as table,
        policyname as name,
        permissive,
        roles,
        cmd as command,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname
    `
  });

  if (error) {
    console.error('Erro ao buscar políticas RLS:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

async function getFunctions(supabase: any): Promise<FunctionInfo[]> {
  const { data, error } = await supabase.rpc('exec_sql_query', {
    sql_query: `
      SELECT 
        p.proname as name,
        pg_get_functiondef(p.oid) as definition
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      LEFT JOIN pg_depend d ON d.objid = p.oid AND d.deptype = 'e'
      LEFT JOIN pg_extension e ON d.refobjid = e.oid
      WHERE n.nspname = 'public'
        AND p.prokind = 'f'
        AND e.oid IS NULL  -- Excluir funções que pertencem a extensões
      ORDER BY p.proname
    `
  });

  if (error) {
    console.error('Erro ao buscar funções:', error);
    return [];
  }

  console.log(`Funções encontradas: ${Array.isArray(data) ? data.length : 0} (excluindo funções de extensões)`);
  
  return Array.isArray(data) ? data : [];
}

async function getTriggers(supabase: any): Promise<TriggerInfo[]> {
  const { data, error } = await supabase.rpc('exec_sql_query', {
    sql_query: `
      SELECT 
        trigger_name as name,
        event_object_table as table,
        action_timing as timing,
        event_manipulation as event,
        action_statement as function_call
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      ORDER BY event_object_table, trigger_name
    `
  });

  if (error) {
    console.error('Erro ao buscar triggers:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

async function getIndexes(supabase: any): Promise<IndexInfo[]> {
  const { data, error } = await supabase.rpc('exec_sql_query', {
    sql_query: `
      SELECT 
        i.indexname as name,
        i.tablename as table,
        i.indexdef as definition
      FROM pg_indexes i
      WHERE i.schemaname = 'public'
        AND i.indexname NOT LIKE '%_pkey'
        -- Excluir índices criados automaticamente por constraints UNIQUE
        AND NOT EXISTS (
          SELECT 1 
          FROM pg_constraint c
          WHERE c.conname = i.indexname
            AND c.contype IN ('u', 'p')
        )
      ORDER BY i.tablename, i.indexname
    `
  });

  if (error) {
    console.error('Erro ao buscar índices:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

async function getBuckets(supabase: any): Promise<Bucket[]> {
  const { data, error } = await supabase.rpc('exec_sql_query', {
    sql_query: `
      SELECT id, name, public
      FROM storage.buckets
      ORDER BY name
    `
  });

  if (error) {
    console.error('Erro ao buscar buckets:', error);
    return [];
  }

  const buckets = Array.isArray(data) ? data : [];
  return buckets.map((b: any) => ({ name: b.name, public: b.public }));
}

async function getStoragePolicies(supabase: any): Promise<StoragePolicy[]> {
  const { data, error } = await supabase.rpc('exec_sql_query', {
    sql_query: `
      SELECT 
        policyname as name,
        permissive,
        roles,
        cmd as command,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'storage'
        AND tablename = 'objects'
      ORDER BY policyname
    `
  });

  if (error) {
    console.error('Erro ao buscar políticas de Storage:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

async function getViews(supabase: any): Promise<ViewInfo[]> {
  const { data, error } = await supabase.rpc('exec_sql_query', {
    sql_query: `
      SELECT 
        schemaname || '.' || viewname as name,
        definition,
        false as is_materialized
      FROM pg_views
      WHERE schemaname = 'public'
      UNION ALL
      SELECT 
        schemaname || '.' || matviewname as name,
        definition,
        true as is_materialized
      FROM pg_matviews
      WHERE schemaname = 'public'
      ORDER BY name
    `
  });

  if (error) {
    console.error('Erro ao buscar views:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

async function getSequences(supabase: any): Promise<SequenceInfo[]> {
  const { data, error } = await supabase.rpc('exec_sql_query', {
    sql_query: `
      SELECT 
        sequence_name as name,
        data_type,
        start_value,
        increment,
        maximum_value as max_value,
        minimum_value as min_value,
        cache_size as cache_value
      FROM information_schema.sequences
      WHERE sequence_schema = 'public'
      ORDER BY sequence_name
    `
  });

  if (error) {
    console.error('Erro ao buscar sequences:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

async function getConstraints(supabase: any): Promise<ConstraintInfo[]> {
  const { data, error } = await supabase.rpc('exec_sql_query', {
    sql_query: `
      SELECT 
        tc.table_name as table,
        tc.constraint_name as name,
        tc.constraint_type as type,
        pg_get_constraintdef(c.oid) as definition
      FROM information_schema.table_constraints tc
      JOIN pg_constraint c ON c.conname = tc.constraint_name
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE tc.table_schema = 'public'
        AND tc.constraint_type IN ('CHECK', 'UNIQUE')
      ORDER BY tc.table_name, tc.constraint_name
    `
  });

  if (error) {
    console.error('Erro ao buscar constraints:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

async function getTableData(supabase: any, tableName: string): Promise<any[]> {
  const { data, error } = await supabase.rpc('exec_sql_query', {
    sql_query: `SELECT * FROM public.${tableName} ORDER BY created_at`
  });

  if (error) {
    console.error(`Erro ao buscar dados da tabela ${tableName}:`, error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

function escapeValue(value: any): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  
  if (typeof value === 'number') {
    return value.toString();
  }
  
  if (typeof value === 'object') {
    // Arrays e objetos JSON
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }
  
  // Strings - escapar aspas simples
  return `'${value.toString().replace(/'/g, "''")}'`;
}

function generateDataInserts(tableName: string, data: any[]): string {
  if (data.length === 0) {
    return '';
  }

  let sql = `\n-- Dados da tabela: ${tableName}\n`;
  sql += `-- Total de registros: ${data.length}\n\n`;

  // Pegar colunas do primeiro registro
  const columns = Object.keys(data[0]);
  
  // Gerar INSERT statements em lote (100 registros por vez para performance)
  const batchSize = 100;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    
    sql += `INSERT INTO public.${tableName} (${columns.join(', ')}) VALUES\n`;
    
    const values = batch.map((row, idx) => {
      const rowValues = columns.map(col => escapeValue(row[col]));
      const isLast = idx === batch.length - 1;
      return `  (${rowValues.join(', ')})${isLast ? ';' : ','}`;
    });
    
    sql += values.join('\n') + '\n\n';
  }

  return sql;
}

interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  details?: string;
  affectedObjects?: string[];
}

interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
    infos: number;
  };
}

function validateSchema(
  tables: TableInfo[],
  constraints: ConstraintInfo[],
  indexes: IndexInfo[],
  triggers: TriggerInfo[],
  functions: FunctionInfo[],
  policies: Policy[],
  views: ViewInfo[],
  sequences: SequenceInfo[]
): ValidationResult {
  const issues: ValidationIssue[] = [];

  // 1. Validar tabelas sem Primary Key
  tables.forEach(table => {
    if (table.primary_keys.length === 0) {
      issues.push({
        severity: 'warning',
        category: 'Estrutura de Tabelas',
        message: `Tabela sem Primary Key`,
        details: 'Tabelas sem chave primária podem causar problemas de performance e integridade',
        affectedObjects: [table.name]
      });
    }
  });

  // 2. Validar Foreign Keys circulares
  const fkMap = new Map<string, string[]>();
  tables.forEach(table => {
    const refs = table.foreign_keys.map(fk => fk.foreign_table);
    if (refs.length > 0) {
      fkMap.set(table.name, refs);
    }
  });

  // Detectar ciclos
  const detectCycle = (table: string, visited = new Set<string>(), path: string[] = []): boolean => {
    if (visited.has(table)) {
      const cycleStart = path.indexOf(table);
      if (cycleStart >= 0) {
        issues.push({
          severity: 'warning',
          category: 'Foreign Keys',
          message: 'Dependência circular detectada',
          details: 'Foreign keys circulares podem causar problemas ao importar o schema',
          affectedObjects: path.slice(cycleStart).concat(table)
        });
        return true;
      }
      return false;
    }

    visited.add(table);
    path.push(table);

    const refs = fkMap.get(table) || [];
    for (const ref of refs) {
      if (detectCycle(ref, visited, [...path])) {
        return true;
      }
    }

    return false;
  };

  fkMap.forEach((_, table) => {
    detectCycle(table);
  });

  // 3. Validar constraints duplicados
  const constraintNames = new Map<string, string[]>();
  constraints.forEach(constraint => {
    const existing = constraintNames.get(constraint.name) || [];
    existing.push(constraint.table);
    constraintNames.set(constraint.name, existing);
  });

  constraintNames.forEach((tables, name) => {
    if (tables.length > 1) {
      issues.push({
        severity: 'error',
        category: 'Constraints',
        message: `Constraint duplicado: ${name}`,
        details: 'Constraints com o mesmo nome em tabelas diferentes podem causar conflitos',
        affectedObjects: tables
      });
    }
  });

  // 4. Validar índices duplicados
  const indexNames = new Map<string, string[]>();
  indexes.forEach(idx => {
    const existing = indexNames.get(idx.name) || [];
    existing.push(idx.table);
    indexNames.set(idx.name, existing);
  });

  indexNames.forEach((tables, name) => {
    if (tables.length > 1) {
      issues.push({
        severity: 'warning',
        category: 'Índices',
        message: `Índice duplicado: ${name}`,
        details: 'Índices com o mesmo nome podem causar conflitos na importação',
        affectedObjects: tables
      });
    }
  });

  // 5. Validar triggers órfãos (sem função correspondente)
  // Lista de funções conhecidas de extensões comuns que devem ser ignoradas
  const extensionFunctions = new Set([
    'gin_extract_query_trgm',
    'gin_extract_value_trgm',
    'gin_trgm_consistent',
    'gin_trgm_triconsistent',
    'gtrgm_compress',
    'gtrgm_decompress',
    'gtrgm_penalty',
    'gtrgm_picksplit',
    'gtrgm_union',
    'gtrgm_same',
    'gtrgm_consistent',
    'gtrgm_distance',
    'similarity',
    'similarity_op',
    'word_similarity',
    'word_similarity_op',
    'strict_word_similarity',
    'strict_word_similarity_op'
  ]);
  
  const functionNames = new Set(functions.map(f => f.name));
  triggers.forEach(trigger => {
    // Extrair nome da função do function_call
    const funcMatch = trigger.function_call.match(/(\w+)\s*\(/);
    if (funcMatch) {
      const funcName = funcMatch[1];
      // Ignorar funções de extensões conhecidas
      if (!functionNames.has(funcName) && !extensionFunctions.has(funcName)) {
        issues.push({
          severity: 'error',
          category: 'Triggers',
          message: `Trigger referencia função inexistente`,
          details: `Trigger '${trigger.name}' chama função '${funcName}' que não existe`,
          affectedObjects: [trigger.name]
        });
      }
    }
  });

  // 6. Validar políticas RLS sem tabela correspondente
  const tableNames = new Set(tables.map(t => t.name));
  policies.forEach(policy => {
    if (!tableNames.has(policy.table)) {
      issues.push({
        severity: 'error',
        category: 'RLS Policies',
        message: `Política RLS para tabela inexistente`,
        details: `Política '${policy.name}' referencia tabela '${policy.table}' que não existe`,
        affectedObjects: [policy.name]
      });
    }
  });

  // 7. Validar colunas NOT NULL sem DEFAULT em novas tabelas
  tables.forEach(table => {
    const notNullNoDefault = table.columns.filter(
      col => !col.nullable && !col.default && col.name !== 'id'
    );
    if (notNullNoDefault.length > 0) {
      issues.push({
        severity: 'warning',
        category: 'Estrutura de Tabelas',
        message: `Colunas NOT NULL sem valor DEFAULT`,
        details: `Tabela '${table.name}' tem colunas obrigatórias sem valor padrão`,
        affectedObjects: notNullNoDefault.map(col => `${table.name}.${col.name}`)
      });
    }
  });

  // 8. Validar sequences órfãos
  const usedSequences = new Set<string>();
  tables.forEach(table => {
    table.columns.forEach(col => {
      if (col.default?.includes('nextval')) {
        const seqMatch = col.default.match(/nextval\('([^']+)'/);
        if (seqMatch) {
          usedSequences.add(seqMatch[1].replace('public.', ''));
        }
      }
    });
  });

  sequences.forEach(seq => {
    if (!usedSequences.has(seq.name)) {
      issues.push({
        severity: 'info',
        category: 'Sequences',
        message: `Sequence não utilizado`,
        details: `Sequence '${seq.name}' não está sendo usado por nenhuma tabela`,
        affectedObjects: [seq.name]
      });
    }
  });

  // 9. Validar views que referenciam tabelas inexistentes
  views.forEach(view => {
    // Extrair nomes de tabelas da definição (simplificado)
    const tableRefs = view.definition.match(/FROM\s+(\w+)/gi) || [];
    tableRefs.forEach(ref => {
      const tableName = ref.replace(/FROM\s+/i, '').trim();
      if (!tableNames.has(tableName) && !tableName.includes('.')) {
        issues.push({
          severity: 'warning',
          category: 'Views',
          message: `View pode referenciar tabela inexistente`,
          details: `View '${view.name}' pode estar referenciando tabela '${tableName}'`,
          affectedObjects: [view.name]
        });
      }
    });
  });

  // Calcular sumário
  const summary = {
    errors: issues.filter(i => i.severity === 'error').length,
    warnings: issues.filter(i => i.severity === 'warning').length,
    infos: issues.filter(i => i.severity === 'info').length
  };

  return {
    isValid: summary.errors === 0,
    issues,
    summary
  };
}

function generateSQL(
  extensions: Extension[],
  enums: EnumType[],
  sequences: SequenceInfo[],
  tables: TableInfo[],
  constraints: ConstraintInfo[],
  views: ViewInfo[],
  functions: FunctionInfo[],
  triggers: TriggerInfo[],
  indexes: IndexInfo[],
  policies: Policy[],
  storagePolicies: StoragePolicy[],
  buckets: Bucket[],
  tableData?: Map<string, any[]>
): string {
  let sql = `-- =============================================
-- SCHEMA COMPLETO DO BANCO DE DADOS
-- Gerado automaticamente em: ${new Date().toISOString()}
-- =============================================

`;

  // =============================================
  // SEÇÃO 1: LIMPEZA DO SCHEMA EXISTENTE
  // =============================================
  
  sql += `\n-- =============================================
-- LIMPEZA DO SCHEMA EXISTENTE
-- ATENÇÃO: Os comandos abaixo irão REMOVER
-- todos os objetos customizados do banco
-- =============================================\n\n`;

  // 1. DROP POLICIES (RLS) - Remover políticas primeiro
  if (policies.length > 0 || storagePolicies.length > 0) {
    sql += `-- Remover Políticas RLS\n`;
    
    // Políticas de tabelas públicas
    policies.forEach(policy => {
      sql += `DROP POLICY IF EXISTS "${policy.name}" ON public.${policy.table};\n`;
    });
    
    // Políticas de storage
    storagePolicies.forEach(policy => {
      sql += `DROP POLICY IF EXISTS "${policy.name}" ON storage.objects;\n`;
    });
    
    sql += `\n`;
  }

  // 2. DROP TRIGGERS - Remover triggers antes das funções
  if (triggers.length > 0) {
    sql += `-- Remover Triggers\n`;
    triggers.forEach(trigger => {
      sql += `DROP TRIGGER IF EXISTS ${trigger.name} ON public.${trigger.table};\n`;
    });
    sql += `\n`;
  }

  // 3. DROP FUNCTIONS - Remover funções com CASCADE
  if (functions.length > 0) {
    sql += `-- Remover Funções\n`;
    functions.forEach(func => {
      sql += `DROP FUNCTION IF EXISTS public.${func.name} CASCADE;\n`;
    });
    sql += `\n`;
  }

  // 4. DROP INDEXES - Remover índices customizados
  if (indexes.length > 0) {
    sql += `-- Remover Índices\n`;
    indexes.forEach(idx => {
      sql += `DROP INDEX IF EXISTS public.${idx.name};\n`;
    });
    sql += `\n`;
  }

  // 5. DROP CONSTRAINTS - Remover constraints UNIQUE e CHECK explicitamente
  if (constraints.length > 0) {
    sql += `-- Remover Constraints (UNIQUE, CHECK)\n`;
    constraints.forEach(constraint => {
      sql += `ALTER TABLE IF EXISTS public.${constraint.table} DROP CONSTRAINT IF EXISTS ${constraint.name};\n`;
    });
    sql += `\n`;
  }

  // 6. DROP VIEWS - Remover views
  if (views.length > 0) {
    sql += `-- Remover Views\n`;
    views.forEach(view => {
      const viewType = view.is_materialized ? 'MATERIALIZED VIEW' : 'VIEW';
      sql += `DROP ${viewType} IF EXISTS ${view.name} CASCADE;\n`;
    });
    sql += `\n`;
  }

  // 7. DROP TABLES - Remover tabelas com CASCADE (remove FKs e constraints)
  if (tables.length > 0) {
    sql += `-- Remover Tabelas\n`;
    tables.forEach(table => {
      sql += `DROP TABLE IF EXISTS public.${table.name} CASCADE;\n`;
    });
    sql += `\n`;
  }

  // 8. DROP SEQUENCES - Remover sequences
  if (sequences.length > 0) {
    sql += `-- Remover Sequences\n`;
    sequences.forEach(seq => {
      sql += `DROP SEQUENCE IF EXISTS public.${seq.name} CASCADE;\n`;
    });
    sql += `\n`;
  }

  // 9. DROP TYPES - Remover tipos ENUM customizados
  if (enums.length > 0) {
    sql += `-- Remover Tipos ENUM\n`;
    enums.forEach(enumType => {
      sql += `DROP TYPE IF EXISTS public.${enumType.name} CASCADE;\n`;
    });
    sql += `\n`;
  }

  sql += `-- =============================================
-- FIM DA LIMPEZA
-- =============================================\n\n`;

  // =============================================
  // SEÇÃO 2: CRIAÇÃO DO NOVO SCHEMA
  // =============================================
  
  sql += `\n-- =============================================
-- CRIAÇÃO DO NOVO SCHEMA
-- =============================================\n\n`;

  // Extensões
  if (extensions.length > 0) {
    sql += `\n-- =============================================\n-- EXTENSÕES DO POSTGRESQL\n-- =============================================\n\n`;
    extensions.forEach(ext => {
      sql += `CREATE EXTENSION IF NOT EXISTS "${ext.name}" WITH SCHEMA public;\n`;
    });
  }

  // Sequences
  if (sequences.length > 0) {
    sql += `\n-- =============================================\n-- SEQUENCES\n-- =============================================\n\n`;
    sequences.forEach(seq => {
      sql += `-- Sequence: ${seq.name}\n`;
      sql += `CREATE SEQUENCE IF NOT EXISTS public.${seq.name}\n`;
      sql += `  AS ${seq.data_type}\n`;
      sql += `  START WITH ${seq.start_value}\n`;
      sql += `  INCREMENT BY ${seq.increment}\n`;
      sql += `  MINVALUE ${seq.min_value}\n`;
      sql += `  MAXVALUE ${seq.max_value}\n`;
      sql += `  CACHE ${seq.cache_value};\n\n`;
    });
  }

  // ENUMs
  if (enums.length > 0) {
    sql += `\n-- =============================================\n-- TIPOS CUSTOMIZADOS (ENUMS)\n-- =============================================\n\n`;
    enums.forEach(enumType => {
      sql += `CREATE TYPE public.${enumType.name} AS ENUM (\n`;
      sql += enumType.values.map(v => `  '${v}'`).join(',\n');
      sql += `\n);\n\n`;
    });
  }

  // Tabelas (sem foreign keys)
  if (tables.length > 0) {
    sql += `\n-- =============================================\n-- TABELAS (Estrutura)\n-- =============================================\n\n`;
    tables.forEach(table => {
      sql += `-- Tabela: ${table.name}\n`;
      sql += `CREATE TABLE IF NOT EXISTS public.${table.name} (\n`;
      
      const columnDefs = table.columns.map(col => {
        let def = `  ${col.name} ${col.udt_name.toUpperCase()}`;
        if (!col.nullable) def += ' NOT NULL';
        if (col.default) def += ` DEFAULT ${col.default}`;
        return def;
      });

      if (table.primary_keys.length > 0) {
        columnDefs.push(`  PRIMARY KEY (${table.primary_keys.join(', ')})`);
      }

      sql += columnDefs.join(',\n');
      sql += `\n);\n\n`;
    });

    // Foreign Keys (após todas as tabelas serem criadas)
    const allForeignKeys = tables.filter(t => t.foreign_keys.length > 0);
    if (allForeignKeys.length > 0) {
      sql += `\n-- =============================================\n-- FOREIGN KEYS (Relacionamentos)\n-- =============================================\n\n`;
      allForeignKeys.forEach(table => {
        table.foreign_keys.forEach(fk => {
          sql += `-- Foreign Key: ${table.name}.${fk.column} -> ${fk.foreign_table}.${fk.foreign_column}\n`;
          sql += `ALTER TABLE public.${table.name} ADD CONSTRAINT fk_${table.name}_${fk.column}\n`;
          sql += `  FOREIGN KEY (${fk.column}) REFERENCES public.${fk.foreign_table}(${fk.foreign_column})`;
          if (fk.delete_rule && fk.delete_rule !== 'NO ACTION') {
            sql += ` ON DELETE ${fk.delete_rule}`;
          }
          sql += `;\n\n`;
        });
      });
    }
  }

  // Constraints adicionais (CHECK, UNIQUE)
  if (constraints.length > 0) {
    sql += `\n-- =============================================\n-- CONSTRAINTS (CHECK, UNIQUE)\n-- =============================================\n\n`;
    constraints.forEach(constraint => {
      sql += `-- Constraint: ${constraint.name} na tabela ${constraint.table}\n`;
      sql += `ALTER TABLE IF EXISTS public.${constraint.table} DROP CONSTRAINT IF EXISTS ${constraint.name};\n`;
      sql += `ALTER TABLE public.${constraint.table} ADD CONSTRAINT ${constraint.name} ${constraint.definition};\n\n`;
    });
  }

  // Views
  if (views.length > 0) {
    sql += `\n-- =============================================\n-- VIEWS\n-- =============================================\n\n`;
    views.forEach(view => {
      sql += `-- ${view.is_materialized ? 'MATERIALIZED VIEW' : 'VIEW'}: ${view.name}\n`;
      const createClause = view.is_materialized 
        ? `CREATE MATERIALIZED VIEW IF NOT EXISTS`
        : `CREATE OR REPLACE VIEW`;
      sql += `${createClause} ${view.name} AS\n${view.definition};\n\n`;
    });
  }

  // Funções
  if (functions.length > 0) {
    sql += `\n-- =============================================\n-- FUNÇÕES DO BANCO DE DADOS\n-- =============================================\n\n`;
    functions.forEach(func => {
      sql += `-- Função: ${func.name}\n`;
      // Garantir que sempre use CREATE OR REPLACE FUNCTION
      const funcDef = func.definition.replace(
        /CREATE\s+FUNCTION\s+/i,
        'CREATE OR REPLACE FUNCTION '
      );
      sql += `${funcDef};\n\n`;
    });
  }

  // Triggers
  if (triggers.length > 0) {
    sql += `\n-- =============================================\n-- TRIGGERS\n-- =============================================\n\n`;
    triggers.forEach(trigger => {
      sql += `-- Trigger: ${trigger.name} na tabela ${trigger.table}\n`;
      sql += `DROP TRIGGER IF EXISTS ${trigger.name} ON public.${trigger.table};\n`;
      sql += `CREATE TRIGGER ${trigger.name}\n`;
      sql += `${trigger.timing} ${trigger.event} ON public.${trigger.table}\n`;
      sql += `FOR EACH ROW\n`;
      sql += `${trigger.function_call};\n\n`;
    });
  }

  // Índices
  if (indexes.length > 0) {
    sql += `\n-- =============================================\n-- ÍNDICES\n-- =============================================\n\n`;
    indexes.forEach(idx => {
      sql += `-- Índice: ${idx.name} na tabela ${idx.table}\n`;
      // Modificar a definição para incluir IF NOT EXISTS
      const idxDef = idx.definition.replace(
        /CREATE\s+(?:UNIQUE\s+)?INDEX\s+/i,
        (match) => match.trim() + ' IF NOT EXISTS '
      );
      sql += `${idxDef};\n\n`;
    });
  }

  // Políticas RLS
  if (policies.length > 0) {
    sql += `\n-- =============================================\n-- ROW LEVEL SECURITY (RLS)\n-- =============================================\n\n`;
    
    // Habilitar RLS nas tabelas
    const tablesWithRLS = [...new Set(policies.map(p => p.table))];
    tablesWithRLS.forEach(table => {
      sql += `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;\n\n`;
    });

    // Criar políticas
    policies.forEach(policy => {
      sql += `-- Política: ${policy.name} na tabela ${policy.table}\n`;
      sql += `DROP POLICY IF EXISTS "${policy.name}" ON public.${policy.table};\n`;
      sql += `CREATE POLICY "${policy.name}"\n`;
      sql += `ON public.${policy.table}\n`;
      sql += `AS ${policy.permissive}\n`;
      sql += `FOR ${policy.command}\n`;
      if (policy.roles && policy.roles.length > 0) {
        sql += `TO ${policy.roles.join(', ')}\n`;
      }
      if (policy.qual) {
        sql += `USING (${policy.qual})\n`;
      }
      if (policy.with_check) {
        sql += `WITH CHECK (${policy.with_check})\n`;
      }
      sql += `;\n\n`;
    });
  }

  // Storage Policies
  if (storagePolicies.length > 0) {
    sql += `\n-- =============================================\n-- STORAGE POLICIES (RLS)\n-- =============================================\n\n`;
    sql += `-- Habilitar RLS na tabela storage.objects\n`;
    sql += `ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;\n\n`;
    
    storagePolicies.forEach(policy => {
      sql += `-- Política de Storage: ${policy.name}\n`;
      sql += `DROP POLICY IF EXISTS "${policy.name}" ON storage.objects;\n`;
      sql += `CREATE POLICY "${policy.name}"\n`;
      sql += `ON storage.objects\n`;
      sql += `AS ${policy.permissive}\n`;
      sql += `FOR ${policy.command}\n`;
      if (policy.roles && policy.roles.length > 0) {
        sql += `TO ${policy.roles.join(', ')}\n`;
      }
      if (policy.qual) {
        sql += `USING (${policy.qual})\n`;
      }
      if (policy.with_check) {
        sql += `WITH CHECK (${policy.with_check})\n`;
      }
      sql += `;\n\n`;
    });
  }

  // Storage Buckets
  if (buckets.length > 0) {
    sql += `\n-- =============================================\n-- STORAGE BUCKETS\n-- =============================================\n`;
    sql += `-- ATENÇÃO: Os comandos abaixo devem ser executados no Supabase Dashboard\n`;
    sql += `-- ou via API de Storage, não via SQL Editor\n\n`;
    buckets.forEach(bucket => {
      sql += `-- Bucket: ${bucket.name} (${bucket.public ? 'Público' : 'Privado'})\n`;
      sql += `-- Criar via Dashboard -> Storage -> New Bucket\n`;
      sql += `-- Nome: ${bucket.name}\n`;
      sql += `-- Public: ${bucket.public}\n\n`;
    });
  }

  // =============================================
  // SEÇÃO: DADOS DAS TABELAS (se solicitado)
  // =============================================
  
  if (tableData && tableData.size > 0) {
    sql += `\n-- =============================================\n-- DADOS DAS TABELAS (BACKUP)\n-- =============================================\n\n`;
    
    sql += `-- ATENÇÃO: Desabilitar triggers temporariamente para evitar conflitos\n`;
    sql += `SET session_replication_role = 'replica';\n\n`;
    
    tableData.forEach((data, tableName) => {
      sql += generateDataInserts(tableName, data);
    });
    
    sql += `-- Reabilitar triggers\n`;
    sql += `SET session_replication_role = 'origin';\n\n`;
  }

  sql += `\n-- =============================================\n-- FIM DO SCHEMA\n-- =============================================\n`;

  return sql;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Iniciando exportação de schema...');

    // Parse request body to get selected components, validation mode, and data export options
    let selectedComponents: string[] | null = null;
    let validateOnly = false;
    let exportData = false;
    let dataTableNames: string[] = [];
    
    if (req.method === 'POST') {
      const body = await req.json();
      selectedComponents = body.components || null;
      validateOnly = body.validateOnly || false;
      exportData = body.exportData || false;
      dataTableNames = body.dataTableNames || [];
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extrair todos os componentes do schema
    console.log('Extraindo extensões...');
    const extensions = await getExtensions(supabaseAdmin);
    
    console.log('Extraindo tipos ENUM...');
    const enums = await getEnumTypes(supabaseAdmin);
    
    console.log('Extraindo sequences...');
    const sequences = await getSequences(supabaseAdmin);
    
    console.log('Extraindo tabelas...');
    const tableNames = await getTables(supabaseAdmin);
    const tables: TableInfo[] = [];
    for (const tableName of tableNames) {
      console.log(`Processando tabela: ${tableName}`);
      const tableInfo = await getTableInfo(supabaseAdmin, tableName);
      tables.push(tableInfo);
    }
    
    console.log('Extraindo constraints...');
    const constraints = await getConstraints(supabaseAdmin);
    
    console.log('Extraindo views...');
    const views = await getViews(supabaseAdmin);
    
    console.log('Extraindo funções...');
    const functions = await getFunctions(supabaseAdmin);
    
    console.log('Extraindo triggers...');
    const triggers = await getTriggers(supabaseAdmin);
    
    console.log('Extraindo índices...');
    const indexes = await getIndexes(supabaseAdmin);
    
    console.log('Extraindo políticas RLS...');
    const policies = await getPolicies(supabaseAdmin);
    
    console.log('Extraindo políticas de Storage...');
    const storagePolicies = await getStoragePolicies(supabaseAdmin);
    
    console.log('Extraindo storage buckets...');
    const buckets = await getBuckets(supabaseAdmin);

    // Filter components if selective export is requested
    const componentsToExport = {
      extensions: (!selectedComponents || selectedComponents.includes('extensions')) ? extensions : [],
      enums: (!selectedComponents || selectedComponents.includes('enums')) ? enums : [],
      sequences: (!selectedComponents || selectedComponents.includes('sequences')) ? sequences : [],
      tables: (!selectedComponents || selectedComponents.includes('tables')) ? tables : [],
      views: (!selectedComponents || selectedComponents.includes('views')) ? views : [],
      functions: (!selectedComponents || selectedComponents.includes('functions')) ? functions : [],
      triggers: (!selectedComponents || selectedComponents.includes('triggers')) ? triggers : [],
      indexes: (!selectedComponents || selectedComponents.includes('indexes')) ? indexes : [],
      rlsPolicies: (!selectedComponents || selectedComponents.includes('rls_policies')) ? policies : [],
      constraints: (!selectedComponents || selectedComponents.includes('constraints')) ? constraints : [],
      storagePolicies: (!selectedComponents || selectedComponents.includes('storage_policies')) ? storagePolicies : [],
      buckets: (!selectedComponents || selectedComponents.includes('storage_buckets')) ? buckets : []
    };

    // Exportar dados das tabelas se solicitado
    let tableDataMap: Map<string, any[]> | undefined;
    if (exportData && dataTableNames.length > 0) {
      console.log('Exportando dados das tabelas:', dataTableNames);
      tableDataMap = new Map();
      
      for (const tableName of dataTableNames) {
        console.log(`Buscando dados da tabela: ${tableName}`);
        const data = await getTableData(supabaseAdmin, tableName);
        tableDataMap.set(tableName, data);
        console.log(`  -> ${data.length} registros`);
      }
    }

    // Executar validação
    console.log('Validando schema...');
    const validation = validateSchema(
      tables,
      constraints,
      indexes,
      triggers,
      functions,
      policies,
      views,
      sequences
    );

    console.log('Validação concluída:', validation.summary);

    // Se for apenas validação, retornar resultado
    if (validateOnly) {
      return new Response(
        JSON.stringify({
          success: true,
          validateOnly: true,
          validation
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    console.log('Gerando SQL...');
    const sql = generateSQL(
      componentsToExport.extensions, 
      componentsToExport.enums, 
      componentsToExport.sequences,
      componentsToExport.tables, 
      componentsToExport.constraints,
      componentsToExport.views,
      componentsToExport.functions, 
      componentsToExport.triggers, 
      componentsToExport.indexes, 
      componentsToExport.rlsPolicies, 
      componentsToExport.storagePolicies,
      componentsToExport.buckets,
      tableDataMap
    );

    console.log('Exportação concluída com sucesso!');

    return new Response(
      JSON.stringify({
        success: true,
        sql,
        validation,
        metadata: {
          extensions_count: componentsToExport.extensions.length,
          enums_count: componentsToExport.enums.length,
          sequences_count: componentsToExport.sequences.length,
          tables_count: componentsToExport.tables.length,
          constraints_count: componentsToExport.constraints.length,
          views_count: componentsToExport.views.length,
          functions_count: componentsToExport.functions.length,
          triggers_count: componentsToExport.triggers.length,
          indexes_count: componentsToExport.indexes.length,
          policies_count: componentsToExport.rlsPolicies.length,
          storage_policies_count: componentsToExport.storagePolicies.length,
          buckets_count: componentsToExport.buckets.length,
          data_tables_count: tableDataMap?.size || 0,
          total_records: tableDataMap ? Array.from(tableDataMap.values()).reduce((sum, data) => sum + data.length, 0) : 0,
          generated_at: new Date().toISOString()
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Erro ao exportar schema:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
