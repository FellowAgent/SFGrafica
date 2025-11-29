/**
 * Script para listar todas as tabelas do banco de dados
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis de ambiente
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

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

async function execSQLQuery(sql) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql_query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({ sql_query: sql }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro:', errorText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Erro:', error.message);
    return null;
  }
}

async function main() {
  console.log('\n📊 Listando tabelas do schema public...\n');
  
  const sql = `
    SELECT table_name, 
           (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as columns
    FROM information_schema.tables t
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;
  
  const result = await execSQLQuery(sql);
  
  console.log('Resultado:', typeof result, result);
  
  if (result && Array.isArray(result)) {
    console.log('Tabelas encontradas:\n');
    result.forEach(row => {
      console.log(`  📁 ${row.table_name} (${row.columns} colunas)`);
    });
    console.log(`\nTotal: ${result.length} tabelas`);
  } else if (result) {
    console.log('Resultado (não é array):', JSON.stringify(result, null, 2));
  }
  
  // Verificar se há tabela de status
  console.log('\n🔍 Procurando tabelas relacionadas a "status"...\n');
  
  const statusSql = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name LIKE '%status%'
    ORDER BY table_name;
  `;
  
  const statusResult = await execSQLQuery(statusSql);
  
  if (statusResult && statusResult.length > 0) {
    console.log('Tabelas com "status" no nome:');
    statusResult.forEach(row => {
      console.log(`  ✅ ${row.table_name}`);
    });
  } else {
    console.log('  ❌ Nenhuma tabela com "status" no nome encontrada');
  }
  
  // Verificar coluna status na tabela pedidos
  console.log('\n🔍 Verificando estrutura da tabela pedidos...\n');
  
  const pedidosSql = `
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'pedidos' AND table_schema = 'public'
    ORDER BY ordinal_position;
  `;
  
  const pedidosResult = await execSQLQuery(pedidosSql);
  
  if (pedidosResult) {
    console.log('Colunas da tabela pedidos:');
    pedidosResult.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });
  }
}

main().catch(console.error);

