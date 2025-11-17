import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0'

export interface ExecutionResult {
  statement: string
  success: boolean
  error?: string
  rowsAffected?: number
  executionTime: number
}

export const DANGEROUS_PATTERNS = [
  { pattern: /DROP\s+DATABASE/i, message: 'DROP DATABASE não é permitido' },
  { pattern: /ALTER\s+DATABASE/i, message: 'ALTER DATABASE não é permitido' },
  { pattern: /CREATE\s+DATABASE/i, message: 'CREATE DATABASE não é permitido' },
  { pattern: /DROP\s+SCHEMA\s+(auth|storage|realtime|supabase_functions|vault)/i, message: 'Não é permitido dropar schemas do Supabase' },
  { pattern: /DROP\s+ROLE\s+(postgres|supabase_admin|authenticator|service_role|anon|authenticated)/i, message: 'Não é permitido dropar roles do Supabase' },
]

export function fixMalformedACL(sql: string): { sql: string; fixes: string[] } {
  const fixes: string[] = []
  let fixedSQL = sql

  const aclGrantPattern =
    /GRANT\s+([^=\s]+=[^/]+\/[^,\s]+(?:,[^=\s]+=[^/]+\/[^,\s]+)*)\s+ON\s+(TABLES|SEQUENCES|FUNCTIONS|TYPES)\s+TO\s+(\w+)/gi

  fixedSQL = fixedSQL.replace(aclGrantPattern, (match, aclString, objType, targetRole) => {
    fixes.push(`Corrigida sintaxe ACL malformada: ${match.substring(0, 100)}...`)

    const aclEntries = aclString.split(',')
    const grantStatements: string[] = []

    aclEntries.forEach((entry: string) => {
      const aclMatch = entry.match(/^([^=]+)=([^/]+)(?:\/(.+))?$/)
      if (!aclMatch) return

      const [, grantee, privCodes] = aclMatch

      const privMap: Record<string, string> = {
        r: 'SELECT',
        w: 'UPDATE',
        a: 'INSERT',
        d: 'DELETE',
        D: 'TRUNCATE',
        x: 'REFERENCES',
        t: 'TRIGGER',
        X: 'EXECUTE',
        U: 'USAGE',
        C: 'CREATE',
        c: 'CONNECT',
        T: 'TEMPORARY',
      }

      const privileges: string[] = []
      for (const code of privCodes) {
        if (privMap[code]) {
          privileges.push(privMap[code])
        }
      }

      if (privileges.length > 0) {
        grantStatements.push(`GRANT ${privileges.join(', ')} ON ${objType} TO ${grantee || 'PUBLIC'}`)
      }
    })

    return grantStatements.join(';\n')
  })

  const defaultPrivPattern =
    /ALTER\s+DEFAULT\s+PRIVILEGES(?:\s+FOR\s+ROLE\s+\w+)?\s+IN\s+SCHEMA\s+\w+\s+GRANT\s+([^=\s]+=[^/]+\/[^,\s]+(?:,[^=\s]+=[^/]+\/[^,\s]+)*)\s+ON\s+(TABLES|SEQUENCES|FUNCTIONS|TYPES)/gi

  fixedSQL = fixedSQL.replace(defaultPrivPattern, (match, aclString, objType) => {
    fixes.push(`Corrigida sintaxe DEFAULT PRIVILEGES malformada: ${match.substring(0, 100)}...`)

    const aclEntries = aclString.split(',')
    const grantStatements: string[] = []

    aclEntries.forEach((entry: string) => {
      const aclMatch = entry.match(/^([^=]+)=([^/]+)(?:\/(.+))?$/)
      if (!aclMatch) return

      const [, grantee, privCodes, grantor] = aclMatch

      const privMap: Record<string, string> = {
        r: 'SELECT',
        w: 'UPDATE',
        a: 'INSERT',
        d: 'DELETE',
        D: 'TRUNCATE',
        x: 'REFERENCES',
        t: 'TRIGGER',
        X: 'EXECUTE',
        U: 'USAGE',
        C: 'CREATE',
        c: 'CONNECT',
        T: 'TEMPORARY',
      }

      const privileges: string[] = []
      for (const code of privCodes) {
        if (privMap[code]) privileges.push(privMap[code])
      }

      if (privileges.length > 0 && grantor) {
        grantStatements.push(
          `ALTER DEFAULT PRIVILEGES FOR ROLE ${grantor} GRANT ${privileges.join(', ')} ON ${objType} TO ${
            grantee || 'PUBLIC'
          }`,
        )
      }
    })

    return grantStatements.join(';\n')
  })

  return { sql: fixedSQL, fixes }
}

export function validateSQL(sql: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  for (const { pattern, message } of DANGEROUS_PATTERNS) {
    if (pattern.test(sql)) {
      errors.push(message)
    }
  }

  if (!sql.trim()) {
    errors.push('SQL vazio')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export function splitSQLStatements(sql: string): string[] {
  let cleanedSQL = sql.replace(/--[^\n]*/g, '')
  cleanedSQL = cleanedSQL.replace(/\/\*[\s\S]*?\*\//g, '')

  const statements: string[] = []
  let current = ''
  let inString = false
  let stringChar = ''
  let functionDelimiter: string | null = null

  const matchDollarTag = (text: string, start: number): string | null => {
    if (text[start] !== '$') return null
    let end = start + 1
    while (end < text.length && /[A-Za-z0-9_]/.test(text[end])) {
      end++
    }
    if (end < text.length && text[end] === '$') {
      return text.slice(start, end + 1)
    }
    return null
  }

  for (let i = 0; i < cleanedSQL.length; i++) {
    const char = cleanedSQL[i]
    const prevChar = i > 0 ? cleanedSQL[i - 1] : ''

    if ((char === "'" || char === '"') && prevChar !== '\\') {
      if (!inString) {
        inString = true
        stringChar = char
      } else if (char === stringChar) {
        inString = false
      }
    }

    if (!inString) {
      if (!functionDelimiter && char === '$') {
        const delimiter = matchDollarTag(cleanedSQL, i)
        if (delimiter) {
          functionDelimiter = delimiter
          current += delimiter
          i += delimiter.length - 1
          continue
        }
      } else if (functionDelimiter) {
        if (
          cleanedSQL.startsWith(functionDelimiter, i)
        ) {
          current += functionDelimiter
          i += functionDelimiter.length - 1
          functionDelimiter = null
          continue
        }
      }
    }

    if (char === ';' && !inString && !functionDelimiter) {
      statements.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  if (current.trim()) {
    statements.push(current.trim())
  }

  return statements.filter((s) => s.length > 0)
}

export async function executeStatement(
  supabase: SupabaseClient,
  statement: string,
  dryRun: boolean,
): Promise<ExecutionResult> {
  const startTime = performance.now()

  try {
    if (dryRun) {
      const { error } = await supabase.rpc('exec_sql', {
        sql_query: `EXPLAIN ${statement}`,
      })

      const executionTime = performance.now() - startTime

      if (error) {
        return {
          statement: statement.substring(0, 200) + (statement.length > 200 ? '...' : ''),
          success: false,
          error: error.message,
          executionTime,
        }
      }

      return {
        statement: statement.substring(0, 200) + (statement.length > 200 ? '...' : ''),
        success: true,
        executionTime,
      }
    }

    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: statement,
    })

    const executionTime = performance.now() - startTime

    if (error) {
      return {
        statement: statement.substring(0, 200) + (statement.length > 200 ? '...' : ''),
        success: false,
        error: error.message,
        executionTime,
      }
    }

    if (data && typeof data === 'object' && 'success' in data && data.success === false) {
      return {
        statement: statement.substring(0, 200) + (statement.length > 200 ? '...' : ''),
        success: false,
        error: (data as any).error || 'Erro ao executar SQL',
        executionTime,
      }
    }

    return {
      statement: statement.substring(0, 200) + (statement.length > 200 ? '...' : ''),
      success: true,
      rowsAffected: (data as any)?.rows_affected || 0,
      executionTime,
    }
  } catch (err) {
    const executionTime = performance.now() - startTime
    return {
      statement: statement.substring(0, 200) + (statement.length > 200 ? '...' : ''),
      success: false,
      error: err instanceof Error ? err.message : 'Erro desconhecido',
      executionTime,
    }
  }
}

