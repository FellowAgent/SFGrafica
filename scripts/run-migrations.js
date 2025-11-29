/**
 * Script para executar todas as migrações do Supabase via API
 * 
 * Uso: node scripts/run-migrations.js
 * 
 * Variáveis de ambiente necessárias (ou use .env):
 * - VITE_SUPABASE_URL: URL do projeto Supabase
 * - VITE_SUPABASE_SERVICE_ROLE_KEY: Service Role Key do projeto
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis de ambiente do .env se existir
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = value;
      }
    }
  });
}

// Configuração
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Erro: VITE_SUPABASE_URL e VITE_SUPABASE_SERVICE_ROLE_KEY são obrigatórios');
  console.error('');
  console.error('Configure no arquivo .env ou passe como variáveis de ambiente:');
  console.error('  VITE_SUPABASE_URL=https://seu-projeto.supabase.co');
  console.error('  VITE_SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key');
  process.exit(1);
}

const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');

// Cores para o console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function execSQL(sql, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': SERVICE_ROLE_KEY,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ sql_query: sql }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        // Se a função exec_sql não existir, tentar criar
        if (errorText.includes('function') && errorText.includes('does not exist')) {
          if (attempt === 1) {
            log('⚠️  Função exec_sql não encontrada. Criando...', 'yellow');
            await createExecSqlFunction();
            continue;
          }
        }
        
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return { success: true };
    } catch (error) {
      if (attempt === retries) {
        return { success: false, error: error.message };
      }
      log(`  ⚠️  Tentativa ${attempt}/${retries} falhou, retentando...`, 'yellow');
      await sleep(1000 * attempt);
    }
  }
}

async function createExecSqlFunction() {
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    BEGIN
      EXECUTE sql_query;
    END;
    $$;
  `;

  // Usar a API REST diretamente para criar a função
  const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({ query: createFunctionSQL }),
  });

  if (!response.ok) {
    log('❌ Não foi possível criar a função exec_sql automaticamente.', 'red');
    log('   Por favor, execute este SQL manualmente no Supabase Dashboard:', 'yellow');
    log('', 'reset');
    log(createFunctionSQL, 'dim');
    process.exit(1);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    log(`❌ Diretório de migrações não encontrado: ${MIGRATIONS_DIR}`, 'red');
    process.exit(1);
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort(); // Ordenar por nome (timestamp)

  return files;
}

function splitSQLStatements(sql) {
  // Remove comentários de linha única
  let cleanSQL = sql.replace(/--.*$/gm, '');
  
  // Divide por `;` mas preserva blocos $$ (funções, triggers, etc)
  const statements = [];
  let current = '';
  let inDollarQuote = false;
  let dollarTag = '';
  
  for (let i = 0; i < cleanSQL.length; i++) {
    const char = cleanSQL[i];
    const nextChar = cleanSQL[i + 1] || '';
    
    // Detectar início/fim de dollar quote
    if (char === '$') {
      // Procurar pelo tag completo (ex: $$ ou $TAG$)
      let tag = '$';
      let j = i + 1;
      while (j < cleanSQL.length && (cleanSQL[j].match(/[a-zA-Z0-9_]/) || cleanSQL[j] === '$')) {
        tag += cleanSQL[j];
        if (cleanSQL[j] === '$') break;
        j++;
      }
      
      if (tag.endsWith('$')) {
        if (!inDollarQuote) {
          inDollarQuote = true;
          dollarTag = tag;
        } else if (tag === dollarTag) {
          inDollarQuote = false;
          dollarTag = '';
        }
      }
    }
    
    current += char;
    
    // Se encontrar ; fora de dollar quote, finalizar statement
    if (char === ';' && !inDollarQuote) {
      const trimmed = current.trim();
      if (trimmed && trimmed !== ';') {
        statements.push(trimmed);
      }
      current = '';
    }
  }
  
  // Adicionar último statement se existir
  const trimmed = current.trim();
  if (trimmed && trimmed !== ';') {
    statements.push(trimmed.endsWith(';') ? trimmed : trimmed + ';');
  }
  
  return statements.filter(s => s.length > 0);
}

async function runMigration(filename) {
  const filepath = path.join(MIGRATIONS_DIR, filename);
  const sql = fs.readFileSync(filepath, 'utf8');
  
  // Tentar executar o SQL completo primeiro
  const result = await execSQL(sql);
  
  if (result.success) {
    return { success: true };
  }
  
  // Se falhou, tentar dividir em statements e executar individualmente
  log(`  ⚠️  Execução completa falhou, tentando statement por statement...`, 'yellow');
  
  const statements = splitSQLStatements(sql);
  const errors = [];
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const stmtResult = await execSQL(stmt);
    
    if (!stmtResult.success) {
      // Ignorar alguns erros comuns
      const errorMsg = stmtResult.error || '';
      const isIgnorable = 
        errorMsg.includes('already exists') ||
        errorMsg.includes('does not exist') ||
        errorMsg.includes('duplicate key') ||
        errorMsg.includes('relation') && errorMsg.includes('already exists');
      
      if (!isIgnorable) {
        errors.push({
          statement: i + 1,
          sql: stmt.substring(0, 100) + '...',
          error: errorMsg,
        });
      }
    }
  }
  
  if (errors.length > 0) {
    return { success: false, errors };
  }
  
  return { success: true };
}

async function main() {
  console.log('');
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║       Script de Migração - Fellow Sync Suite               ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  console.log('');
  
  log(`📍 Projeto: ${SUPABASE_URL}`, 'blue');
  log(`📁 Diretório: ${MIGRATIONS_DIR}`, 'blue');
  console.log('');
  
  const files = getMigrationFiles();
  log(`📋 Encontradas ${files.length} migrações`, 'cyan');
  console.log('');
  
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  const failedMigrations = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const progress = `[${String(i + 1).padStart(2, '0')}/${files.length}]`;
    
    process.stdout.write(`${progress} ${file}... `);
    
    try {
      const result = await runMigration(file);
      
      if (result.success) {
        log('✅', 'green');
        successCount++;
      } else if (result.errors) {
        log('⚠️  (com avisos)', 'yellow');
        result.errors.forEach(err => {
          log(`     └─ Statement ${err.statement}: ${err.error.substring(0, 80)}`, 'dim');
        });
        failedMigrations.push({ file, errors: result.errors });
        errorCount++;
      }
    } catch (error) {
      log('❌', 'red');
      log(`     └─ ${error.message}`, 'red');
      failedMigrations.push({ file, errors: [{ error: error.message }] });
      errorCount++;
    }
    
    // Pequena pausa entre migrações para não sobrecarregar a API
    await sleep(100);
  }
  
  console.log('');
  log('════════════════════════════════════════════════════════════', 'cyan');
  log('                        RESUMO', 'cyan');
  log('════════════════════════════════════════════════════════════', 'cyan');
  console.log('');
  log(`✅ Sucesso:   ${successCount}`, 'green');
  if (errorCount > 0) {
    log(`⚠️  Com erros: ${errorCount}`, 'yellow');
  }
  if (skippedCount > 0) {
    log(`⏭️  Ignoradas: ${skippedCount}`, 'dim');
  }
  console.log('');
  
  if (failedMigrations.length > 0) {
    log('Migrações com problemas:', 'yellow');
    failedMigrations.forEach(m => {
      log(`  - ${m.file}`, 'yellow');
    });
    console.log('');
    log('💡 Dica: Alguns erros como "already exists" são normais', 'dim');
    log('   se você estiver rodando migrações em um banco existente.', 'dim');
  }
  
  console.log('');
  log('🎉 Processo de migração concluído!', 'green');
  console.log('');
}

main().catch(error => {
  log(`❌ Erro fatal: ${error.message}`, 'red');
  process.exit(1);
});

