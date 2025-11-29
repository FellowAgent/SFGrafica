import type { SQLStatement } from './sqlAnalyzer';

export interface RollbackStep {
  originalStatement: SQLStatement;
  rollbackSQL: string;
  canRollback: boolean;
  notes?: string;
}

export class RollbackGenerator {
  generateRollbackSQL(statements: SQLStatement[]): { sql: string; canRollback: boolean; steps: RollbackStep[] } {
    const steps: RollbackStep[] = [];
    let fullCanRollback = true;

    for (const stmt of statements) {
      const step = this.generateStepRollback(stmt);
      steps.push(step);
      if (!step.canRollback) {
        fullCanRollback = false;
      }
    }

    // Reverse order for rollback
    const rollbackSQL = steps
      .reverse()
      .filter(s => s.canRollback)
      .map(s => s.rollbackSQL)
      .join('\n\n');

    return {
      sql: rollbackSQL,
      canRollback: fullCanRollback,
      steps: steps.reverse() // Back to original order for display
    };
  }

  private generateStepRollback(stmt: SQLStatement): RollbackStep {
    const type = stmt.type;
    const content = stmt.content.trim();

    // CREATE TABLE
    if (type === 'CREATE_TABLE') {
      const tableName = this.extractTableName(content, 'CREATE TABLE');
      if (tableName) {
        return {
          originalStatement: stmt,
          rollbackSQL: `DROP TABLE IF EXISTS ${tableName} CASCADE;`,
          canRollback: true
        };
      }
    }

    // DROP TABLE (cannot rollback - data loss)
    if (type === 'DROP_TABLE') {
      return {
        originalStatement: stmt,
        rollbackSQL: `-- Cannot rollback DROP TABLE: ${stmt.tableName || 'unknown'}`,
        canRollback: false,
        notes: 'DROP TABLE cannot be rolled back without backup'
      };
    }

    // ALTER TABLE ADD COLUMN
    if (type === 'ALTER_TABLE' && content.toUpperCase().includes('ADD COLUMN')) {
      const tableName = this.extractTableName(content, 'ALTER TABLE');
      const columnName = this.extractColumnName(content, 'ADD COLUMN');
      if (tableName && columnName) {
        return {
          originalStatement: stmt,
          rollbackSQL: `ALTER TABLE ${tableName} DROP COLUMN IF EXISTS ${columnName};`,
          canRollback: true
        };
      }
    }

    // ALTER TABLE DROP COLUMN (cannot rollback - data loss)
    if (type === 'ALTER_TABLE' && content.toUpperCase().includes('DROP COLUMN')) {
      return {
        originalStatement: stmt,
        rollbackSQL: `-- Cannot rollback DROP COLUMN without backup`,
        canRollback: false,
        notes: 'DROP COLUMN cannot be rolled back without backup'
      };
    }

    // CREATE INDEX
    if (type === 'CREATE_INDEX') {
      const indexName = this.extractIndexName(content);
      if (indexName) {
        return {
          originalStatement: stmt,
          rollbackSQL: `DROP INDEX IF EXISTS ${indexName};`,
          canRollback: true
        };
      }
    }

    // DROP INDEX
    if (type === 'DROP_INDEX') {
      return {
        originalStatement: stmt,
        rollbackSQL: `-- Cannot automatically recreate index without original definition`,
        canRollback: false,
        notes: 'Index recreation requires original CREATE INDEX statement'
      };
    }

    // CREATE FUNCTION
    if (type === 'CREATE_FUNCTION') {
      const functionName = this.extractFunctionName(content);
      if (functionName) {
        return {
          originalStatement: stmt,
          rollbackSQL: `DROP FUNCTION IF EXISTS ${functionName} CASCADE;`,
          canRollback: true
        };
      }
    }

    // CREATE POLICY (handle as special case since it's not in the enum)
    if (content.toUpperCase().includes('CREATE POLICY')) {
      const policyName = this.extractPolicyName(content);
      const tableName = this.extractTableName(content, 'ON');
      if (policyName && tableName) {
        return {
          originalStatement: stmt,
          rollbackSQL: `DROP POLICY IF EXISTS ${policyName} ON ${tableName};`,
          canRollback: true
        };
      }
    }

    // INSERT (would need to track inserted IDs)
    if (type === 'INSERT') {
      return {
        originalStatement: stmt,
        rollbackSQL: `-- Cannot automatically rollback INSERT without tracking inserted IDs`,
        canRollback: false,
        notes: 'INSERT rollback requires ID tracking'
      };
    }

    // UPDATE (would need original values)
    if (type === 'UPDATE') {
      return {
        originalStatement: stmt,
        rollbackSQL: `-- Cannot rollback UPDATE without original values`,
        canRollback: false,
        notes: 'UPDATE rollback requires capturing original values'
      };
    }

    // DELETE (cannot rollback - data loss)
    if (type === 'DELETE') {
      return {
        originalStatement: stmt,
        rollbackSQL: `-- Cannot rollback DELETE without backup`,
        canRollback: false,
        notes: 'DELETE cannot be rolled back without backup'
      };
    }

    // TRUNCATE (cannot rollback - data loss)
    if (type === 'TRUNCATE') {
      return {
        originalStatement: stmt,
        rollbackSQL: `-- Cannot rollback TRUNCATE without backup`,
        canRollback: false,
        notes: 'TRUNCATE cannot be rolled back without backup'
      };
    }

    // Default: unknown rollback
    return {
      originalStatement: stmt,
      rollbackSQL: `-- Cannot generate automatic rollback for ${type}`,
      canRollback: false,
      notes: `Automatic rollback not supported for ${type}`
    };
  }

  private extractTableName(sql: string, prefix: string): string | null {
    const regex = new RegExp(`${prefix}\\s+(?:IF\\s+(?:NOT\\s+)?EXISTS\\s+)?([a-zA-Z_][a-zA-Z0-9_.]*)`, 'i');
    const match = sql.match(regex);
    return match ? match[1] : null;
  }

  private extractColumnName(sql: string, prefix: string): string | null {
    const regex = new RegExp(`${prefix}\\s+([a-zA-Z_][a-zA-Z0-9_]*)`, 'i');
    const match = sql.match(regex);
    return match ? match[1] : null;
  }

  private extractIndexName(sql: string): string | null {
    const regex = /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z_][a-zA-Z0-9_]*)/i;
    const match = sql.match(regex);
    return match ? match[1] : null;
  }

  private extractFunctionName(sql: string): string | null {
    const regex = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s*\(/i;
    const match = sql.match(regex);
    return match ? match[1] : null;
  }

  private extractPolicyName(sql: string): string | null {
    const regex = /CREATE\s+POLICY\s+["']?([a-zA-Z_][a-zA-Z0-9_ ]*)["']?/i;
    const match = sql.match(regex);
    return match ? match[1].trim() : null;
  }
}

export const rollbackGenerator = new RollbackGenerator();
