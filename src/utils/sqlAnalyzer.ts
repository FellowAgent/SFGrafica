export interface ParsedSQL {
  statements: SQLStatement[];
  totalLines: number;
  hasComments: boolean;
}

export interface SQLStatement {
  type: 'CREATE_TABLE' | 'ALTER_TABLE' | 'DROP_TABLE' | 'CREATE_FUNCTION' | 'DROP_FUNCTION' | 
        'CREATE_TRIGGER' | 'DROP_TRIGGER' | 'CREATE_INDEX' | 'DROP_INDEX' | 
        'INSERT' | 'UPDATE' | 'DELETE' | 'TRUNCATE' | 'UNKNOWN';
  content: string;
  tableName?: string;
  schemaName?: string;
  lineNumber: number;
  dangerLevel: 'safe' | 'warning' | 'critical';
}

export interface ClassifiedOperations {
  safe: SQLStatement[];
  warnings: SQLStatement[];
  critical: SQLStatement[];
  creates: SQLStatement[];
  alters: SQLStatement[];
  drops: SQLStatement[];
  functions: SQLStatement[];
  triggers: SQLStatement[];
  indexes: SQLStatement[];
  dataModifications: SQLStatement[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  operations: ClassifiedOperations;
  dangerLevel: 'safe' | 'medium' | 'high';
  summary: {
    totalOperations: number;
    destructiveOperations: number;
    affectedTables: string[];
  };
}

const DANGEROUS_PATTERNS = {
  critical: [
    { pattern: /DROP\s+DATABASE/i, message: 'DROP DATABASE não é permitido' },
    { pattern: /DROP\s+SCHEMA\s+(auth|storage|realtime|supabase_functions|vault)/i, message: 'Não é permitido modificar schemas do Supabase' },
    { pattern: /ALTER\s+TABLE\s+(auth|storage|realtime)\./i, message: 'Não é permitido alterar tabelas dos schemas do Supabase' },
    { pattern: /DROP\s+TABLE\s+(auth|storage|realtime)\./i, message: 'Não é permitido remover tabelas dos schemas do Supabase' },
  ],
  warning: [
    { pattern: /DROP\s+TABLE/i, message: 'DROP TABLE - tabelas serão removidas permanentemente' },
    { pattern: /TRUNCATE/i, message: 'TRUNCATE - todos os dados serão removidos' },
    { pattern: /DELETE\s+FROM(?!.*WHERE)/i, message: 'DELETE sem WHERE - todos os registros serão removidos' },
    { pattern: /DROP\s+COLUMN/i, message: 'DROP COLUMN - dados da coluna serão perdidos' },
  ],
  info: [
    { pattern: /CREATE\s+TABLE/i, message: 'Criar nova tabela' },
    { pattern: /ALTER\s+TABLE/i, message: 'Modificar tabela existente' },
    { pattern: /CREATE\s+FUNCTION/i, message: 'Criar nova função' },
    { pattern: /CREATE\s+TRIGGER/i, message: 'Criar novo trigger' },
    { pattern: /CREATE\s+INDEX/i, message: 'Criar novo índice' },
  ]
};

export class SQLAnalyzer {
  parseSQL(sql: string): ParsedSQL {
    const cleanSQL = this.removeComments(sql);
    const statements = this.extractStatements(cleanSQL);
    
    return {
      statements: statements.map((stmt, idx) => this.analyzeStatement(stmt, idx)),
      totalLines: sql.split('\n').length,
      hasComments: sql.includes('--') || sql.includes('/*'),
    };
  }

  private removeComments(sql: string): string {
    // Remove -- comments
    let cleaned = sql.replace(/--[^\n]*/g, '');
    // Remove /* */ comments
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
    return cleaned;
  }

  private extractStatements(sql: string): string[] {
    // Split by semicolon but be careful with function definitions
    const statements: string[] = [];
    let current = '';
    let inFunction = false;
    
    const lines = sql.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.match(/CREATE\s+(OR\s+REPLACE\s+)?FUNCTION/i)) {
        inFunction = true;
      }
      
      current += line + '\n';
      
      if (trimmed.match(/\$\$\s*;/i) || trimmed.match(/END\s*;/i)) {
        inFunction = false;
      }
      
      if (trimmed.endsWith(';') && !inFunction) {
        if (current.trim()) {
          statements.push(current.trim());
        }
        current = '';
      }
    }
    
    if (current.trim()) {
      statements.push(current.trim());
    }
    
    return statements.filter(s => s.length > 0);
  }

  private analyzeStatement(statement: string, lineNumber: number): SQLStatement {
    const upperStmt = statement.toUpperCase();
    
    let type: SQLStatement['type'] = 'UNKNOWN';
    let dangerLevel: SQLStatement['dangerLevel'] = 'safe';
    let tableName: string | undefined;
    let schemaName: string | undefined;
    
    // Determine statement type
    if (upperStmt.includes('CREATE TABLE')) {
      type = 'CREATE_TABLE';
      const match = statement.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:(\w+)\.)?(\w+)/i);
      if (match) {
        schemaName = match[1];
        tableName = match[2];
      }
    } else if (upperStmt.includes('ALTER TABLE')) {
      type = 'ALTER_TABLE';
      const match = statement.match(/ALTER\s+TABLE\s+(?:(\w+)\.)?(\w+)/i);
      if (match) {
        schemaName = match[1];
        tableName = match[2];
      }
      if (upperStmt.includes('DROP COLUMN')) {
        dangerLevel = 'warning';
      }
    } else if (upperStmt.includes('DROP TABLE')) {
      type = 'DROP_TABLE';
      dangerLevel = 'warning';
      const match = statement.match(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:(\w+)\.)?(\w+)/i);
      if (match) {
        schemaName = match[1];
        tableName = match[2];
      }
    } else if (upperStmt.includes('CREATE FUNCTION')) {
      type = 'CREATE_FUNCTION';
    } else if (upperStmt.includes('DROP FUNCTION')) {
      type = 'DROP_FUNCTION';
      dangerLevel = 'warning';
    } else if (upperStmt.includes('CREATE TRIGGER')) {
      type = 'CREATE_TRIGGER';
    } else if (upperStmt.includes('DROP TRIGGER')) {
      type = 'DROP_TRIGGER';
      dangerLevel = 'warning';
    } else if (upperStmt.includes('CREATE INDEX')) {
      type = 'CREATE_INDEX';
    } else if (upperStmt.includes('DROP INDEX')) {
      type = 'DROP_INDEX';
      dangerLevel = 'warning';
    } else if (upperStmt.includes('INSERT')) {
      type = 'INSERT';
    } else if (upperStmt.includes('UPDATE')) {
      type = 'UPDATE';
      dangerLevel = 'warning';
    } else if (upperStmt.includes('DELETE')) {
      type = 'DELETE';
      dangerLevel = 'warning';
    } else if (upperStmt.includes('TRUNCATE')) {
      type = 'TRUNCATE';
      dangerLevel = 'critical';
    }
    
    // Check for critical patterns
    for (const { pattern } of DANGEROUS_PATTERNS.critical) {
      if (pattern.test(statement)) {
        dangerLevel = 'critical';
        break;
      }
    }
    
    return {
      type,
      content: statement,
      tableName,
      schemaName,
      lineNumber,
      dangerLevel,
    };
  }

  classifyOperations(parsed: ParsedSQL): ClassifiedOperations {
    const classified: ClassifiedOperations = {
      safe: [],
      warnings: [],
      critical: [],
      creates: [],
      alters: [],
      drops: [],
      functions: [],
      triggers: [],
      indexes: [],
      dataModifications: [],
    };

    for (const stmt of parsed.statements) {
      // By danger level
      if (stmt.dangerLevel === 'safe') classified.safe.push(stmt);
      else if (stmt.dangerLevel === 'warning') classified.warnings.push(stmt);
      else if (stmt.dangerLevel === 'critical') classified.critical.push(stmt);

      // By operation type
      if (stmt.type.includes('CREATE')) classified.creates.push(stmt);
      if (stmt.type.includes('ALTER')) classified.alters.push(stmt);
      if (stmt.type.includes('DROP')) classified.drops.push(stmt);
      if (stmt.type.includes('FUNCTION')) classified.functions.push(stmt);
      if (stmt.type.includes('TRIGGER')) classified.triggers.push(stmt);
      if (stmt.type.includes('INDEX')) classified.indexes.push(stmt);
      if (['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'].includes(stmt.type)) {
        classified.dataModifications.push(stmt);
      }
    }

    return classified;
  }

  validateSQL(parsed: ParsedSQL): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const operations = this.classifyOperations(parsed);

    // Check for critical patterns
    for (const stmt of parsed.statements) {
      for (const { pattern, message } of DANGEROUS_PATTERNS.critical) {
        if (pattern.test(stmt.content)) {
          errors.push(`❌ ${message} (linha ${stmt.lineNumber})`);
        }
      }

      for (const { pattern, message } of DANGEROUS_PATTERNS.warning) {
        if (pattern.test(stmt.content)) {
          warnings.push(`⚠️ ${message} (linha ${stmt.lineNumber})`);
        }
      }
    }

    const affectedTables = new Set<string>();
    for (const stmt of parsed.statements) {
      if (stmt.tableName) {
        affectedTables.add(stmt.tableName);
      }
    }

    const dangerLevel = 
      operations.critical.length > 0 ? 'high' :
      operations.warnings.length > 0 ? 'medium' :
      'safe';

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      operations,
      dangerLevel,
      summary: {
        totalOperations: parsed.statements.length,
        destructiveOperations: operations.drops.length + operations.dataModifications.length,
        affectedTables: Array.from(affectedTables),
      },
    };
  }
}

export const sqlAnalyzer = new SQLAnalyzer();
