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
  is_enum?: boolean;
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
    update_rule?: string;
    constraint_name?: string;
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

interface Grant {
  grantee: string;
  table_schema: string;
  table_name: string;
  privilege_type: string;
}

interface Role {
  name: string;
  is_superuser: boolean;
  inherit: boolean;
  can_create_role: boolean;
  can_create_db: boolean;
  can_login: boolean;
  can_replicate: boolean;
}

interface Comment {
  table_name: string;
  comment: string;
}

interface ColumnComment {
  table_name: string;
  column_name: string;
  comment: string;
}

interface DefaultPrivilege {
  role: string;
  schema: string;
  object_type: string;
  acl: string;
}

interface Owner {
  table_name: string;
  owner: string;
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
  // Primeiro, buscar lista de ENUMs para verificar tipos customizados
  const { data: enumsData } = await supabase.rpc('exec_sql_query', {
    sql_query: `
      SELECT typname as name
      FROM pg_type t
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE n.nspname = 'public'
        AND t.typtype = 'e'
    `
  });
  const enumNames = Array.isArray(enumsData) ? enumsData.map((e: any) => e.name) : [];
  
  // Buscar colunas com informações completas
  const { data: columnsData } = await supabase.rpc('exec_sql_query', {
    sql_query: `
      SELECT 
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        c.udt_name,
        c.character_maximum_length,
        c.numeric_precision,
        c.numeric_scale
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = '${tableName}'
      ORDER BY c.ordinal_position
    `
  });
  
  const columns = Array.isArray(columnsData) ? columnsData : [];

  // Processar colunas e formatar tipos corretamente
  const processedColumns = columns.map((c: any) => {
    let fullType = c.udt_name;
    
    // Verificar se é um ENUM
    const isEnum = enumNames.includes(c.udt_name);
    
    // Formatar tipos com precisão/escala
    if (c.udt_name === 'varchar' && c.character_maximum_length) {
      fullType = `varchar(${c.character_maximum_length})`;
    } else if (c.udt_name === 'numeric' || c.udt_name === 'decimal') {
      if (c.numeric_precision && c.numeric_scale) {
        fullType = `${c.udt_name}(${c.numeric_precision},${c.numeric_scale})`;
      } else if (c.numeric_precision) {
        fullType = `${c.udt_name}(${c.numeric_precision})`;
      }
    } else if (c.udt_name === 'timestamp' || c.udt_name === 'timestamptz') {
      fullType = 'timestamp with time zone';
    } else if (c.udt_name === 'timestamp without time zone') {
      fullType = 'timestamp';
    }
    // Para ENUMs, manter o nome como está (será referenciado como public.enum_name)
    
    return {
      name: c.column_name,
      type: c.data_type,
      nullable: c.is_nullable === 'YES',
      default: c.column_default,
      udt_name: fullType,
      is_enum: isEnum
    };
  });

  const tableInfo: TableInfo = {
    name: tableName,
    columns: processedColumns,
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

  // Buscar foreign keys com nome da constraint
  const { data: fksData } = await supabase.rpc('exec_sql_query', {
    sql_query: `
      SELECT
        tc.constraint_name,
        kcu.column_name as column,
        ccu.table_name AS foreign_table,
        ccu.column_name AS foreign_column,
        rc.delete_rule,
        rc.update_rule
      FROM information_schema.key_column_usage kcu
      JOIN information_schema.table_constraints tc
        ON kcu.constraint_name = tc.constraint_name
        AND kcu.table_schema = tc.table_schema
        AND kcu.table_name = tc.table_name
      JOIN information_schema.referential_constraints rc 
        ON tc.constraint_name = rc.constraint_name
        AND tc.table_schema = rc.constraint_schema
      JOIN information_schema.constraint_column_usage ccu 
        ON rc.constraint_name = ccu.constraint_name
        AND rc.unique_constraint_schema = ccu.constraint_schema
      WHERE kcu.table_schema = 'public' 
        AND kcu.table_name = '${tableName}'
        AND tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.constraint_name, kcu.ordinal_position
    `
  });

  const fks = Array.isArray(fksData) ? fksData : [];
  tableInfo.foreign_keys = fks.map((fk: any) => ({
    column: fk.column,
    foreign_table: fk.foreign_table,
    foreign_column: fk.foreign_column,
    delete_rule: fk.delete_rule || 'NO ACTION',
    update_rule: fk.update_rule || 'NO ACTION',
    constraint_name: fk.constraint_name
  }));

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

// Roles protegidas do Supabase que não devem ser exportadas
const SUPABASE_PROTECTED_ROLES = [
  'postgres',
  'supabase_admin',
  'supabase_auth_admin',
  'supabase_storage_admin',
  'supabase_functions_admin',
  'supabase_realtime_admin',
  'authenticator',
  'service_role',
  'anon',
  'authenticated',
  'dashboard_user',        // Role do Supabase Dashboard
  'pgbouncer',             // Role do PgBouncer
  'supabase_read_only_user', // Role de leitura
  'pgsodium_keyiduser',    // Role da extensão pgsodium
  'pgsodium_keyholder',    // Role da extensão pgsodium
  'pgsodium_keymaker'      // Role da extensão pgsodium
];

async function getGrants(supabase: any): Promise<Grant[]> {
  const { data, error } = await supabase.rpc('exec_sql_query', {
    sql_query: `
      SELECT 
        grantee,
        table_schema,
        table_name,
        privilege_type
      FROM information_schema.table_privileges
      WHERE table_schema = 'public'
      ORDER BY table_name, grantee, privilege_type
    `
  });

  if (error) {
    console.error('Erro ao buscar GRANTs:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

async function getRoles(supabase: any): Promise<Role[]> {
  const { data, error } = await supabase.rpc('exec_sql_query', {
    sql_query: `
      SELECT 
        rolname as name,
        rolsuper as is_superuser,
        rolinherit as inherit,
        rolcreaterole as can_create_role,
        rolcreatedb as can_create_db,
        rolcanlogin as can_login,
        rolreplication as can_replicate
      FROM pg_roles
      WHERE rolname NOT LIKE 'pg_%'
      ORDER BY rolname
    `
  });

  if (error) {
    console.error('Erro ao buscar roles:', error);
    return [];
  }

  const roles = Array.isArray(data) ? data : [];
  return roles.filter(role => !SUPABASE_PROTECTED_ROLES.includes(role.name));
}

async function getTableComments(supabase: any): Promise<Comment[]> {
  const { data, error } = await supabase.rpc('exec_sql_query', {
    sql_query: `
      SELECT 
        c.relname as table_name,
        pg_catalog.obj_description(c.oid) as comment
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND pg_catalog.obj_description(c.oid) IS NOT NULL
    `
  });

  if (error) {
    console.error('Erro ao buscar comentários de tabelas:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

async function getColumnComments(supabase: any): Promise<ColumnComment[]> {
  const { data, error } = await supabase.rpc('exec_sql_query', {
    sql_query: `
      SELECT 
        c.relname as table_name,
        a.attname as column_name,
        pg_catalog.col_description(c.oid, a.attnum) as comment
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND a.attnum > 0
        AND NOT a.attisdropped
        AND pg_catalog.col_description(c.oid, a.attnum) IS NOT NULL
    `
  });

  if (error) {
    console.error('Erro ao buscar comentários de colunas:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

async function getDefaultPrivileges(supabase: any): Promise<DefaultPrivilege[]> {
  const { data, error } = await supabase.rpc('exec_sql_query', {
    sql_query: `
      SELECT 
        pg_get_userbyid(defaclrole) as role,
        defaclnamespace::regnamespace::text as schema,
        defaclobjtype as object_type,
        array_to_string(defaclacl, ',') as acl
      FROM pg_default_acl
      WHERE defaclnamespace = 'public'::regnamespace::oid
    `
  });

  if (error) {
    console.error('Erro ao buscar default privileges:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

async function getTableOwners(supabase: any): Promise<Owner[]> {
  const { data, error } = await supabase.rpc('exec_sql_query', {
    sql_query: `
      SELECT 
        c.relname as table_name,
        pg_catalog.pg_get_userbyid(c.relowner) as owner
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
    `
  });

  if (error) {
    console.error('Erro ao buscar table owners:', error);
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

function normalizeDefaultValue(rawValue: string): string {
  if (!rawValue) return rawValue;

  let value = rawValue.trim();

  // Remover parênteses desnecessários (ex: ('value'::text)::character varying)
  if (value.startsWith('(') && value.endsWith(')')) {
    value = value.slice(1, -1).trim();
  }

  // Remover prefixos "public."
  value = value.replace(/^public\./, '');
  value = value.replace(/public\.(\w+)\(/g, '$1(');

  // Normalizar nextval
  value = value.replace(/nextval\s*\(\s*'public\./g, "nextval('");

  const hasCast = value.includes('::');
  const hasFunctionCall = /\w+\s*\(/.test(value);
  const isBoolean = /^(true|false)$/i.test(value);
  const isNumeric = /^[+-]?\d+(\.\d+)?$/.test(value);

  if (hasCast || hasFunctionCall || isBoolean || isNumeric) {
    return value;
  }

  if (value.startsWith("'") && value.endsWith("'")) {
    return value;
  }

  return `'${value.replace(/'/g, "''")}'`;
}

function escapeValue(value: any, column?: Column): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  const columnType =
    (column?.type || column?.udt_name || '').toString().toLowerCase();
  const isJsonColumn = columnType.includes('json');
  
  if (isJsonColumn) {
    let jsonValue = value;
    
    if (typeof jsonValue === 'string') {
      const trimmed = jsonValue.trim();
      if (trimmed.length > 0) {
        try {
          jsonValue = JSON.parse(trimmed);
        } catch {
          // Keep original jsonValue if parsing fails
        }
      }
    }
    
    return `'${JSON.stringify(jsonValue).replace(/'/g, "''")}'`;
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

function generateDataInserts(tableName: string, data: any[], columnsMeta?: Column[]): string {
  if (data.length === 0) {
    return '';
  }

  let sql = `\n-- Dados da tabela: ${tableName}\n`;
  sql += `-- Total de registros: ${data.length}\n\n`;

  // Pegar colunas do primeiro registro
  const columns = Object.keys(data[0]);
  const columnMetaMap = new Map<string, Column>();
  columnsMeta?.forEach(col => columnMetaMap.set(col.name, col));
  
  // Gerar INSERT statements em lote (100 registros por vez para performance)
  const batchSize = 100;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    
    sql += `INSERT INTO public.${tableName} (${columns.join(', ')}) VALUES\n`;
    
    const values = batch.map((row, idx) => {
      const rowValues = columns.map(col => escapeValue(row[col], columnMetaMap.get(col)));
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

  // 7. Validar colunas NOT NULL sem DEFAULT em novas tabelas (apenas casos críticos)
  tables.forEach(table => {
    const criticalColumns = table.columns.filter(
      col => !col.nullable && 
             !col.default && 
             col.name !== 'id' &&
             !col.name.endsWith('_id') && // Ignorar FKs
             !col.name.includes('created_at') && // Ignorar timestamps
             !col.name.includes('updated_at')
    );
    if (criticalColumns.length > 0) {
      issues.push({
        severity: 'info', // Mudado de warning para info
        category: 'Estrutura de Tabelas',
        message: `Colunas NOT NULL sem valor DEFAULT`,
        details: `Tabela '${table.name}' tem colunas obrigatórias sem valor padrão (isso é normal se os valores são fornecidos manualmente)`,
        affectedObjects: criticalColumns.map(col => `${table.name}.${col.name}`)
      });
    }
  });

  // 8. Validar sequences órfãos (ignorar sequences automáticos de id)
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
    // Ignorar sequences gerados automaticamente (padrão: tablename_columnname_seq)
    const isAutoSequence = seq.name.match(/_id_seq$/) || seq.name.match(/_seq$/);
    
    if (!usedSequences.has(seq.name) && !isAutoSequence) {
      issues.push({
        severity: 'info', // Apenas informativo
        category: 'Sequences',
        message: `Sequence não utilizado`,
        details: `Sequence '${seq.name}' não está sendo usado por nenhuma tabela`,
        affectedObjects: [seq.name]
      });
    }
  });

  // 9. Validar views que referenciam tabelas inexistentes (simplificado)
  views.forEach(view => {
    // Apenas verificar se há referências óbvias a tabelas que não existem
    const tableRefs = view.definition.match(/FROM\s+public\.(\w+)/gi) || [];
    tableRefs.forEach(ref => {
      const tableName = ref.replace(/FROM\s+public\./i, '').trim();
      if (!tableNames.has(tableName)) {
        issues.push({
          severity: 'info', // Apenas informativo pois pode ser falso positivo
          category: 'Views',
          message: `View pode referenciar tabela desconhecida`,
          details: `View '${view.name}' referencia '${tableName}' (pode estar em outro schema)`,
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
  roles: Role[],
  grants: Grant[],
  tableComments: Comment[],
  columnComments: ColumnComment[],
  defaultPrivileges: DefaultPrivilege[],
  tableOwners: Owner[],
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
        // Usar o tipo completo (já formatado com precisão/escala se necessário)
        let typeName = col.udt_name;
        
        // Garantir que tipos ENUM sejam referenciados corretamente
        const isEnum = col.is_enum || enums.some(e => e.name === col.udt_name);
        if (isEnum) {
          typeName = `public.${col.udt_name}`;
        }
        
        let def = `  ${col.name} ${typeName}`;
        if (!col.nullable) def += ' NOT NULL';
        
        // Tratar valores DEFAULT
        if (col.default) {
          const normalizedDefault = normalizeDefaultValue(col.default);
          def += ` DEFAULT ${normalizedDefault}`;
        }
        
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
          
          // Usar o nome original da constraint se disponível, senão gerar um nome único
          const constraintName = fk.constraint_name || `fk_${table.name}_${fk.column}`;
          
          sql += `ALTER TABLE public.${table.name} DROP CONSTRAINT IF EXISTS ${constraintName};\n`;
          sql += `ALTER TABLE public.${table.name} ADD CONSTRAINT ${constraintName}\n`;
          sql += `  FOREIGN KEY (${fk.column}) REFERENCES public.${fk.foreign_table}(${fk.foreign_column})`;
          
          if (fk.delete_rule && fk.delete_rule !== 'NO ACTION') {
            sql += ` ON DELETE ${fk.delete_rule}`;
          }
          
          if (fk.update_rule && fk.update_rule !== 'NO ACTION') {
            sql += ` ON UPDATE ${fk.update_rule}`;
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
      let funcDef = func.definition.replace(
        /CREATE\s+FUNCTION\s+/i,
        'CREATE OR REPLACE FUNCTION '
      );

      const delimiterMatch = funcDef.match(/AS\s+(\$[A-Za-z0-9_]*\$)/i);
      if (delimiterMatch) {
        const delimiter = delimiterMatch[1];
        const escapeRegex = (str: string) =>
          str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const delimiterRegex = new RegExp(escapeRegex(delimiter), 'g');
        funcDef = funcDef.replace(delimiterRegex, '$$');
      }

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
  // SEÇÃO: ROLES CUSTOMIZADAS
  // =============================================
  
  if (roles.length > 0) {
    sql += `\n-- =============================================\n-- ROLES CUSTOMIZADAS\n-- =============================================\n`;
    sql += `-- ATENÇÃO: Não é possível dropar roles do Supabase que têm dependências\n`;
    sql += `-- As roles serão criadas apenas se não existirem\n\n`;
    
    roles.forEach(role => {
      sql += `-- Role: ${role.name}\n`;
      // NÃO fazer DROP ROLE pois pode ter dependências do sistema
      // Apenas criar se não existir
      sql += `DO $$\n`;
      sql += `BEGIN\n`;
      sql += `  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${role.name}') THEN\n`;
      sql += `    CREATE ROLE ${role.name}`;
      
      const attrs = [];
      if (role.is_superuser) attrs.push('SUPERUSER');
      if (role.can_create_db) attrs.push('CREATEDB');
      if (role.can_create_role) attrs.push('CREATEROLE');
      if (role.can_login) attrs.push('LOGIN');
      if (role.inherit) attrs.push('INHERIT');
      
      if (attrs.length > 0) {
        sql += ` WITH ${attrs.join(' ')}`;
      }
      
      sql += `;\n`;
      sql += `  END IF;\n`;
      sql += `END\n`;
      sql += `$$;\n\n`;
    });
  }

  // =============================================
  // SEÇÃO: COMENTÁRIOS (Documentação)
  // =============================================
  
  if (tableComments.length > 0 || columnComments.length > 0) {
    sql += `\n-- =============================================\n-- COMENTÁRIOS (Documentação)\n-- =============================================\n\n`;
    
    if (tableComments.length > 0) {
      sql += `-- Comentários de Tabelas\n`;
      tableComments.forEach(tc => {
        sql += `COMMENT ON TABLE public.${tc.table_name} IS '${tc.comment.replace(/'/g, "''")}';\n`;
      });
      sql += '\n';
    }

    if (columnComments.length > 0) {
      sql += `-- Comentários de Colunas\n`;
      columnComments.forEach(cc => {
        sql += `COMMENT ON COLUMN public.${cc.table_name}.${cc.column_name} IS '${cc.comment.replace(/'/g, "''")}';\n`;
      });
      sql += '\n';
    }
  }

  // =============================================
  // SEÇÃO: OWNERSHIP (Proprietários)
  // =============================================
  
  if (tableOwners.length > 0) {
    sql += `\n-- =============================================\n-- OWNERSHIP (Proprietários)\n-- =============================================\n\n`;
    tableOwners.forEach(owner => {
      sql += `ALTER TABLE public.${owner.table_name} OWNER TO ${owner.owner};\n`;
    });
    sql += '\n';
  }

  // =============================================
  // SEÇÃO: GRANTS (Permissões)
  // =============================================
  
  if (grants.length > 0) {
    sql += `\n-- =============================================\n-- PERMISSÕES (GRANTs)\n-- =============================================\n\n`;

    // Agrupar por tabela
    const grantsByTable = new Map<string, Grant[]>();
    grants.forEach(grant => {
      const key = `${grant.table_schema}.${grant.table_name}`;
      const existing = grantsByTable.get(key) || [];
      existing.push(grant);
      grantsByTable.set(key, existing);
    });

    grantsByTable.forEach((tableGrants, tableName) => {
      sql += `-- Permissões para ${tableName}\n`;
      
      // Agrupar por grantee
      const granteeMap = new Map<string, string[]>();
      tableGrants.forEach(grant => {
        const privileges = granteeMap.get(grant.grantee) || [];
        privileges.push(grant.privilege_type);
        granteeMap.set(grant.grantee, privileges);
      });

      granteeMap.forEach((privileges, grantee) => {
        sql += `GRANT ${privileges.join(', ')} ON ${tableName} TO ${grantee};\n`;
      });
      
      sql += '\n';
    });
  }

  // =============================================
  // SEÇÃO: DEFAULT PRIVILEGES
  // =============================================
  
  if (defaultPrivileges.length > 0) {
    sql += `\n-- =============================================\n-- DEFAULT PRIVILEGES\n-- =============================================\n\n`;
    
    defaultPrivileges.forEach(priv => {
      const objType = priv.object_type === 'r' ? 'TABLES' : 
                      priv.object_type === 'S' ? 'SEQUENCES' : 
                      priv.object_type === 'f' ? 'FUNCTIONS' : 'TYPES';
      
      // Parsear ACL do PostgreSQL (formato: role=privileges/grantor)
      // Exemplo: {postgres=arwdDxtm/postgres,anon=r/postgres}
      if (!priv.acl) return;
      
      const aclString = priv.acl.toString();
      const aclEntries = aclString.replace(/[{}]/g, '').split(',');
      
      aclEntries.forEach(entry => {
        const match = entry.match(/^([^=]+)=([^/]+)(?:\/(.+))?$/);
        if (!match) return;
        
        const [, grantee, privCodes] = match;
        
        // Mapear códigos de privilégios para nomes SQL
        const privMap: { [key: string]: string } = {
          'r': 'SELECT',
          'w': 'UPDATE',
          'a': 'INSERT',
          'd': 'DELETE',
          'D': 'TRUNCATE',
          'x': 'REFERENCES',
          't': 'TRIGGER',
          'X': 'EXECUTE',
          'U': 'USAGE',
          'C': 'CREATE',
          'c': 'CONNECT',
          'T': 'TEMPORARY'
          // 'm': 'MAINTAIN' - Removido: não suportado em versões antigas do PostgreSQL
        };
        
        const privileges: string[] = [];
        for (const code of privCodes) {
          if (privMap[code]) {
            privileges.push(privMap[code]);
          }
        }
        
        if (privileges.length > 0) {
          sql += `ALTER DEFAULT PRIVILEGES FOR ROLE ${priv.role} IN SCHEMA ${priv.schema}\n`;
          sql += `GRANT ${privileges.join(', ')} ON ${objType} TO ${grantee || 'PUBLIC'};\n\n`;
        }
      });
    });
  }

  // =============================================
  // SEÇÃO: DADOS DAS TABELAS (se solicitado)
  // =============================================

  const tableColumnMap = new Map<string, Column[]>();
  tables.forEach(table => {
    tableColumnMap.set(table.name, table.columns);
  });
  
  if (tableData && tableData.size > 0) {
    sql += `\n-- =============================================\n-- DADOS DAS TABELAS (BACKUP)\n-- =============================================\n\n`;
    
    sql += `-- ATENÇÃO: Desabilitar triggers temporariamente para evitar conflitos\n`;
    sql += `SET session_replication_role = 'replica';\n\n`;
    
    tableData.forEach((data, tableName) => {
      sql += generateDataInserts(tableName, data, tableColumnMap.get(tableName));
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
    let exportAllData = false;
    let dataTableNames: string[] = [];
    
    if (req.method === 'POST') {
      const body = await req.json();
      selectedComponents = body.components || null;
      validateOnly = body.validateOnly || false;
      exportData = body.exportData || false;
      exportAllData = body.exportAllData || false;
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
    
    console.log('Extraindo GRANTs...');
    const grants = await getGrants(supabaseAdmin);
    
    console.log('Extraindo roles customizadas...');
    const roles = await getRoles(supabaseAdmin);
    
    console.log('Extraindo comentários de tabelas...');
    const tableComments = await getTableComments(supabaseAdmin);
    
    console.log('Extraindo comentários de colunas...');
    const columnComments = await getColumnComments(supabaseAdmin);
    
    console.log('Extraindo default privileges...');
    const defaultPrivileges = await getDefaultPrivileges(supabaseAdmin);
    
    console.log('Extraindo table owners...');
    const tableOwners = await getTableOwners(supabaseAdmin);


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
      buckets: (!selectedComponents || selectedComponents.includes('storage_buckets')) ? buckets : [],
      roles: (!selectedComponents || selectedComponents.includes('roles')) ? roles : [],
      grants: (!selectedComponents || selectedComponents.includes('grants')) ? grants : [],
      tableComments: (!selectedComponents || selectedComponents.includes('comments')) ? tableComments : [],
      columnComments: (!selectedComponents || selectedComponents.includes('comments')) ? columnComments : [],
      defaultPrivileges: (!selectedComponents || selectedComponents.includes('default_privileges')) ? defaultPrivileges : [],
      tableOwners: (!selectedComponents || selectedComponents.includes('ownership')) ? tableOwners : []
    };

    // Exportar dados das tabelas se solicitado
    let tableDataMap: Map<string, any[]> | undefined;
    if (exportData) {
      const tablesToExport = (exportAllData || dataTableNames.length === 0)
        ? tableNames
        : dataTableNames;

      if (tablesToExport.length > 0) {
        console.log('Exportando dados das tabelas:', tablesToExport);
        tableDataMap = new Map();
        
        for (const tableName of tablesToExport) {
          console.log(`Buscando dados da tabela: ${tableName}`);
          const data = await getTableData(supabaseAdmin, tableName);
          tableDataMap.set(tableName, data);
          console.log(`  -> ${data.length} registros`);
        }
      } else {
        console.log('Exportação de dados habilitada, mas nenhuma tabela foi selecionada.');
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
      componentsToExport.roles,
      componentsToExport.grants,
      componentsToExport.tableComments,
      componentsToExport.columnComments,
      componentsToExport.defaultPrivileges,
      componentsToExport.tableOwners,
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
