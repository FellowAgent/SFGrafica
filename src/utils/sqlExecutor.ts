import { supabase } from '@/integrations/supabase/client';
import type { SQLStatement } from './sqlAnalyzer';

export interface ExecutionResult {
  success: boolean;
  statement: SQLStatement;
  error?: string;
  rowsAffected?: number;
  duration: number;
}

export interface ExecutionProgress {
  current: number;
  total: number;
  currentStatement: string;
  results: ExecutionResult[];
}

export class SQLExecutor {
  async executeStatement(statement: SQLStatement): Promise<ExecutionResult> {
    const startTime = performance.now();
    
    try {
      // Simulação - execução real seria via Edge Function
      const duration = performance.now() - startTime;

      return {
        success: false,
        statement,
        error: 'Execução automática não implementada. Use a Opção 1 (Validação + Instruções)',
        duration,
      };
    } catch (err) {
      const duration = performance.now() - startTime;
      return {
        success: false,
        statement,
        error: err instanceof Error ? err.message : 'Erro desconhecido',
        duration,
      };
    }
  }

  async executeInTransaction(
    statements: SQLStatement[],
    onProgress?: (progress: ExecutionProgress) => void
  ): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: statements.length,
          currentStatement: statement.content.substring(0, 100) + '...',
          results: [...results],
        });
      }

      const result = await this.executeStatement(statement);
      results.push(result);

      // Stop on first error
      if (!result.success) {
        break;
      }
    }

    return results;
  }

  async executeSafeOperations(
    statements: SQLStatement[],
    onProgress?: (progress: ExecutionProgress) => void
  ): Promise<ExecutionResult[]> {
    // Only execute safe operations (CREATE, ALTER ADD, CREATE INDEX, etc.)
    const safeStatements = statements.filter(stmt => 
      stmt.dangerLevel === 'safe' && 
      (stmt.type.includes('CREATE') || 
       (stmt.type === 'ALTER_TABLE' && stmt.content.toUpperCase().includes('ADD')))
    );

    return this.executeInTransaction(safeStatements, onProgress);
  }
}

export const sqlExecutor = new SQLExecutor();
