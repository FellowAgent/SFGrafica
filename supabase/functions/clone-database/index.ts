import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0'
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0'
import postgres from 'https://deno.land/x/postgresjs@v3.4.3/mod.js'
import {
  fixMalformedACL,
  validateSQL,
  splitSQLStatements,
  executeStatement,
} from '../_shared/sql-utils.ts'
import type { ExecutionResult } from '../_shared/sql-utils.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DestinationConfig {
  supabaseUrl: string
  serviceRoleKey: string
  anonKey?: string
  projectId?: string
  databaseUrl?: string
}

interface SourceConfig {
  supabaseUrl?: string
  serviceRoleKey?: string
  anonKey?: string
  projectId?: string
  databaseUrl?: string
}

interface CloneRequest {
  destination: DestinationConfig
  source?: SourceConfig
  includeData?: boolean
  resetDestination?: boolean
  skipValidation?: boolean
  preferCliExecution?: boolean
}

interface CloneResponse extends Record<string, unknown> {
  success: boolean
  statements: {
    total: number
    executed: number
    successful: number
    failed: number
  }
  resetExecuted: boolean
  exportMetadata?: Record<string, unknown>
  validation?: {
    errors: number
    warnings: number
    infos: number
  }
  aclFixes?: string[]
  error?: string
  logs?: LogEntry[]
  executionMode?: 'cli' | 'direct_statements' | 'exec_sql_rpc'
}

type LogLevel = 'info' | 'warn' | 'error'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  details?: Record<string, unknown> | string
}

async function ensureResetDestination(destUrl: string, destServiceKey: string) {
  console.log('Invocando reset-destination...')
  
  const sourceClient = createClient(destUrl, destServiceKey)
  const { data, error } = await sourceClient.functions.invoke('reset-destination', {
    body: {
      destination: {
        supabaseUrl: destUrl,
        serviceRoleKey: destServiceKey
      }
    }
  })

  if (error) {
    console.error('Erro ao resetar destino:', error)
    throw new Error(`Erro ao resetar destino: ${error.message}`)
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Erro desconhecido ao resetar destino')
  }

  console.log('Schema destino resetado com sucesso.')
}

type PostgresClient = ReturnType<typeof postgres>

const DIRECT_RESET_SQL = `
DO $$
BEGIN
  EXECUTE 'DROP SCHEMA IF EXISTS public CASCADE';
  EXECUTE 'CREATE SCHEMA public AUTHORIZATION postgres';
  EXECUTE 'GRANT ALL ON SCHEMA public TO postgres';
  EXECUTE 'GRANT ALL ON SCHEMA public TO public';

  EXECUTE $func$
    CREATE OR REPLACE FUNCTION public.exec_sql(sql_query text)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO 'public'
    AS $body$
    DECLARE
      result JSONB;
    BEGIN
      EXECUTE sql_query;
      RETURN jsonb_build_object('success', true);
    EXCEPTION
      WHEN OTHERS THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', SQLERRM,
          'detail', SQLSTATE
        );
    END;
    $body$;
  $func$;

  EXECUTE $func_query$
    CREATE OR REPLACE FUNCTION public.exec_sql_query(sql_query text)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO 'public'
    AS $body$
    DECLARE
      result JSONB;
    BEGIN
      EXECUTE format('SELECT jsonb_agg(row_to_json(t)) FROM (%s) t', sql_query) INTO result;
      RETURN COALESCE(result, '[]'::jsonb);
    EXCEPTION
      WHEN OTHERS THEN
        RETURN jsonb_build_object(
          'error', SQLERRM,
          'detail', SQLSTATE
        );
    END;
    $body$;
  $func_query$;

  PERFORM pg_notify('pgrst', 'reload schema');
END;
$$;
`

async function resetDestinationDirect(pgClient: PostgresClient) {
  console.log('Resetando destino via conexão direta com Postgres...')
  await pgClient.unsafe(DIRECT_RESET_SQL)
  console.log('Destino resetado com sucesso (conexão direta).')
}

function fixDanglingDollarQuotes(sql: string): { sql: string; fixes: string[] } {
  let fixedSQL = sql
  const fixes: string[] = []

  fixedSQL = fixedSQL.replace(/(\bAS\s+)\$(?![A-Za-z0-9_]*\$)/g, (match, prefix) => {
    fixes.push(`Corrigido delimitador de função sem identificador (abertura): ${match.trim()}`)
    return `${prefix}$$`
  })

  fixedSQL = fixedSQL.replace(/\n\$(\s*;)/g, (_match, suffix) => {
    fixes.push('Corrigido delimitador de função sem identificador (fechamento).')
    return `\n$$${suffix}`
  })

  return { sql: fixedSQL, fixes }
}

async function waitForExecSqlAvailability(
  client: SupabaseClient,
  options: { retries?: number; delayMs?: number } = {},
) {
  const retries = options.retries ?? 15
  const delayMs = options.delayMs ?? 500

  for (let attempt = 0; attempt < retries; attempt++) {
    const { error } = await client.rpc('exec_sql', {
      sql_query: 'SELECT 1;',
    })

    if (!error) {
      console.log('Função exec_sql disponível.')
      return
    }

    const notFound =
      error?.message?.includes('Could not find the function') ||
      error?.code === 'PGRST202'

    if (!notFound) {
      console.error('Erro inesperado ao verificar exec_sql:', error)
      throw new Error(error.message || 'Erro ao verificar exec_sql')
    }

    console.warn(
      `exec_sql ainda não disponível (tentativa ${attempt + 1}/${retries}). Aguardando ${delayMs}ms...`,
    )
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }

  throw new Error(
    'Função exec_sql ainda não está disponível após múltiplas tentativas. Aguarde alguns segundos e tente novamente.',
  )
}

async function executeStatementWithPg(
  pgClient: PostgresClient,
  statement: string,
): Promise<ExecutionResult> {
  const startTime = performance.now()
  const snippet = statement.substring(0, 200) + (statement.length > 200 ? '...' : '')

  try {
    await pgClient.unsafe(statement)
    return {
      statement: snippet,
      success: true,
      executionTime: performance.now() - startTime,
    }
  } catch (error) {
    return {
      statement: snippet,
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao executar SQL',
      executionTime: performance.now() - startTime,
    }
  }
}

function getStatementPreview(statement: string, limit = 600): string {
  const normalized = statement.trim().replace(/\s+/g, ' ');
  if (normalized.length <= limit) return normalized;
  return normalized.slice(0, limit) + ' [...]';
}

function extractSqlErrorSnippet(sql: string, position?: number, radius = 200): string | undefined {
  if (typeof position !== 'number' || Number.isNaN(position) || position <= 0) {
    return undefined;
  }
  const zeroBased = position - 1;
  const start = Math.max(0, zeroBased - radius);
  const end = Math.min(sql.length, zeroBased + radius);
  return sql.slice(start, end).replace(/\s+/g, ' ').trim();
}

async function executeScriptWithPgCli(pgClient: PostgresClient, script: string) {
  await pgClient.unsafe('BEGIN;');
  try {
    await pgClient.unsafe(script);
    await pgClient.unsafe('COMMIT;');
  } catch (error) {
    try {
      await pgClient.unsafe('ROLLBACK;');
    } catch {
      // Best-effort rollback
    }
    throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const logEntries: LogEntry[] = []

  const log = (level: LogLevel, message: string, details?: Record<string, unknown> | string) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details,
    }
    logEntries.push(entry)

    const consoleFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
    if (details) {
      consoleFn(`[clone-database] ${message}`, details)
    } else {
      consoleFn(`[clone-database] ${message}`)
    }
  }

  const respond = (status: number, payload: Record<string, unknown>) =>
    new Response(JSON.stringify({ ...payload, logs: logEntries }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  let destPgClient: PostgresClient | null = null

  try {
    const body = (await req.json()) as CloneRequest
    const includeData = body.includeData !== false
    const resetDestination = body.resetDestination !== false
    const skipValidation = body.skipValidation || false

    const destinationDbUrl = body.destination?.databaseUrl?.trim()
    const useDirectPg = Boolean(destinationDbUrl)
    const preferCliExecution = useDirectPg && body.preferCliExecution !== false

    log('info', 'Solicitação de clonagem recebida', {
      includeData,
      resetDestination,
      skipValidation,
      mode: useDirectPg ? 'postgres_url' : 'supabase_api',
      executionStrategy: useDirectPg
        ? preferCliExecution
          ? 'cli_batch'
          : 'per_statement'
        : 'exec_sql_rpc',
    })

    if (useDirectPg && !body.destination?.supabaseUrl && destinationDbUrl) {
      body.destination.supabaseUrl = destinationDbUrl
    }

    if (!body.destination?.supabaseUrl) {
      log('error', 'URL do destino não informada')
      return respond(400, {
        success: false,
        error: 'Informe a URL do destino (projeto Supabase ou conexão Postgres).',
      })
    }

    if (!body.destination?.serviceRoleKey && !useDirectPg) {
      log('error', 'Service Role Key do destino não informada para modo Supabase')
      return respond(400, {
        success: false,
        error: 'Informe a Service Role Key do destino.',
      })
    }

    if (!body.destination?.serviceRoleKey && useDirectPg) {
      body.destination.serviceRoleKey = ''
    }

    const sourceUrl = body.source?.supabaseUrl || Deno.env.get('SUPABASE_URL') || ''
    const sourceServiceKey =
      body.source?.serviceRoleKey || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    if (!sourceUrl || !sourceServiceKey) {
      log('error', 'Variáveis de ambiente do banco de origem ausentes')
      throw new Error('Variáveis de ambiente do banco de origem não configuradas.')
    }

    log('info', 'Iniciando exportação do banco de origem')
    const sourceClient = createClient(sourceUrl, sourceServiceKey)
    const exportPayload = {
      components: null,
      exportData: includeData,
      exportAllData: includeData,
    }

    const { data: exportResult, error: exportError } = await sourceClient.functions.invoke('export-schema', {
      body: exportPayload,
    })

    if (exportError) {
      log('error', 'Erro ao exportar schema', { message: exportError.message })
      throw new Error(exportError.message || 'Erro ao invocar export-schema')
    }

    if (!exportResult?.success || !exportResult?.sql) {
      log('error', 'Exportação não retornou SQL válido')
      throw new Error(exportResult?.error || 'Exportação não retornou SQL válido')
    }

    log('info', 'Exportação concluída, iniciando processamento do SQL')
    let sql = exportResult.sql as string
    const aclResult = fixMalformedACL(sql)
    sql = aclResult.sql
    const dollarResult = fixDanglingDollarQuotes(sql)
    sql = dollarResult.sql
    const fixes = [...(aclResult.fixes || []), ...(dollarResult.fixes || [])]

    if (!skipValidation) {
      const validation = validateSQL(sql)
      if (!validation.valid) {
        log('error', 'Validação do SQL falhou', { errors: validation.errors?.length || 0 })
        return respond(400, {
          success: false,
          error: 'Validação do SQL falhou',
          validationErrors: validation.errors,
          aclFixes: fixes,
        })
      }
    }

    destPgClient = useDirectPg
      ? postgres(destinationDbUrl!, {
          prepare: false,
          idle_timeout: 30,
          connect_timeout: 30,
          max: 1,
        })
      : null

    const destClient = !useDirectPg
      ? createClient(body.destination.supabaseUrl, body.destination.serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null

    if (resetDestination) {
      if (useDirectPg && destPgClient) {
        log('info', 'Resetando destino via conexão direta')
        await resetDestinationDirect(destPgClient)
      } else {
        log('info', 'Resetando destino via função reset-destination')
        await ensureResetDestination(body.destination.supabaseUrl, body.destination.serviceRoleKey)
      }
    }

    if (!useDirectPg && destClient) {
      log('info', 'Aguardando disponibilidade da função exec_sql no destino')
      await waitForExecSqlAvailability(destClient)
    }

    // Adicionar a função exec_sql no início do SQL a ser executado
    const execSqlFunctionSQL = `
CREATE OR REPLACE FUNCTION public.exec_sql(sql_query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSONB;
BEGIN
  EXECUTE sql_query;
  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$;
`
    
    let sqlForExecution: string
    if (useDirectPg) {
      log('info', 'Exec_sql não necessário para conexão direta; usando SQL original')
      sqlForExecution = sql
    } else {
      const sqlWithFunction = `${execSqlFunctionSQL}\n\n${sql}`
      sqlForExecution = sqlWithFunction
    }

    log('info', 'Dividindo SQL em statements')
    const statements = splitSQLStatements(sqlForExecution)
    log('info', 'Statements prontos para execução', { totalStatements: statements.length })

    const executionResults: ExecutionResult[] = []
    let executed = 0
    let successCount = 0
    let failedCount = 0

    if (useDirectPg && destPgClient) {
      if (preferCliExecution) {
        log('info', 'Executando script completo via conexão direta (modo CLI)', {
          totalStatements: statements.length,
        })
        try {
          await executeScriptWithPgCli(destPgClient, sqlForExecution)
          executed = statements.length
          successCount = statements.length
        } catch (executionError) {
          failedCount = statements.length
          const pgError = executionError as Error & { position?: number | string; detail?: string }
          const rawPosition = pgError?.position
          const numericPosition =
            typeof rawPosition === 'number'
              ? rawPosition
              : typeof rawPosition === 'string'
                ? Number(rawPosition)
                : undefined
          const snippet =
            extractSqlErrorSnippet(sqlForExecution, Number.isFinite(numericPosition) ? numericPosition : undefined) ||
            getStatementPreview(sqlForExecution)

          log('error', 'Erro durante execução via modo CLI', {
            message: pgError?.message || String(executionError),
            position: numericPosition,
            detail: pgError?.detail,
            snippet,
          })

          return respond(500, {
            success: false,
            error: pgError?.message || 'Erro ao aplicar script completo no destino',
            statements: {
              total: statements.length,
              executed,
              successful: successCount,
              failed: failedCount,
            },
            aclFixes: fixes,
            statementPreview: snippet,
            sqlPosition: Number.isFinite(numericPosition) ? numericPosition : undefined,
            executionMode: 'cli',
          })
        }
      } else {
        log('info', 'Executando script via conexão direta (por statement)')
        await destPgClient.unsafe('BEGIN;')
        try {
          for (let i = 0; i < statements.length; i++) {
            const statement = statements[i]
            if (!statement.trim() || statement.trim().startsWith('--')) {
              continue
            }

            const result = await executeStatementWithPg(destPgClient, statement)
            executionResults.push(result)
            executed++

            if (result.success) {
              successCount++
            } else {
              failedCount++
              const preview = getStatementPreview(statement)
              log('error', 'Erro ao executar statement via conexão direta', {
                statementIndex: i + 1,
                error: result.error,
                preview,
              })
              await destPgClient.unsafe('ROLLBACK;')
              return respond(500, {
                success: false,
                error: `Erro no statement ${i + 1}: ${result.error}\nTrecho: ${preview}`,
                statements: {
                  total: statements.length,
                  executed,
                  successful: successCount,
                  failed: failedCount,
                },
                aclFixes: fixes,
                statementPreview: preview,
                statementIndex: i + 1,
                executionMode: 'direct_statements',
              })
            }
          }

          await destPgClient.unsafe('COMMIT;')
        } catch (executionError) {
          log('error', 'Erro durante execução via conexão direta', {
            message: executionError instanceof Error ? executionError.message : String(executionError),
          })
          try {
            await destPgClient.unsafe('ROLLBACK;')
          } catch (rollbackError) {
            log('warn', 'Falha ao executar ROLLBACK via conexão direta', {
              message: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
            })
          }

          return respond(500, {
            success: false,
            error:
              executionError instanceof Error
                ? executionError.message
                : 'Erro ao aplicar statements na conexão direta',
            statements: {
              total: statements.length,
              executed,
              successful: successCount,
              failed: failedCount,
            },
            aclFixes: fixes,
            executionMode: 'direct_statements',
          })
        }
      }
    } else if (destClient) {
      await destClient.rpc('exec_sql', { sql_query: 'BEGIN;' })

      try {
        for (let i = 0; i < statements.length; i++) {
          const statement = statements[i]
          if (!statement.trim() || statement.trim().startsWith('--')) {
            continue
          }

          log('info', 'Executando statement via exec_sql', { index: i + 1 })
          const result = await executeStatement(destClient, statement, false)
          executionResults.push(result)
          executed++

          if (result.success) {
            successCount++
          } else {
            failedCount++
          const preview = getStatementPreview(statement)
            log('error', 'Erro ao executar statement no destino', {
              index: i + 1,
              error: result.error,
              preview,
            })
            await destClient.rpc('exec_sql', { sql_query: 'ROLLBACK;' })
            return respond(500, {
              success: false,
              error: `Erro no statement ${i + 1}: ${result.error}\nTrecho: ${preview}`,
              statements: {
                total: statements.length,
                executed,
                successful: successCount,
                failed: failedCount,
              },
              aclFixes: fixes,
              statementPreview: preview,
              statementIndex: i + 1,
              executionMode: 'exec_sql_rpc',
            })
          }
        }

        await destClient.rpc('exec_sql', { sql_query: 'COMMIT;' })
      } catch (executionError) {
        log('error', 'Erro durante execução via exec_sql', {
          message: executionError instanceof Error ? executionError.message : String(executionError),
        })
        await destClient.rpc('exec_sql', { sql_query: 'ROLLBACK;' })
        throw executionError
      }
    } else {
      log('error', 'Cliente do destino não pôde ser inicializado')
      throw new Error('Não foi possível inicializar cliente do destino.')
    }

    const response: CloneResponse = {
      success: true,
      statements: {
        total: statements.length,
        executed,
        successful: successCount,
        failed: failedCount,
      },
      resetExecuted: resetDestination,
      exportMetadata: exportResult.metadata,
      validation: exportResult.validation?.summary,
      aclFixes: fixes?.length ? fixes : undefined,
      logs: logEntries,
      executionMode: useDirectPg ? (preferCliExecution ? 'cli' : 'direct_statements') : 'exec_sql_rpc',
    }

    log('info', 'Clonagem concluída com sucesso', {
      statementsTotal: statements.length,
      successCount,
      failedCount,
    })

    return respond(200, response)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    log('error', 'Erro durante processo de clonagem', { message })
    return respond(500, {
      success: false,
      error: message,
    })
  } finally {
    if (destPgClient) {
      try {
        await destPgClient.end({ timeout: 5 })
      } catch (err) {
        log('warn', 'Erro ao finalizar conexão direta com Postgres', {
          message: err instanceof Error ? err.message : String(err),
        })
      }
    }
  }
})

