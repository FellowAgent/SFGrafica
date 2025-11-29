/**
 * Script para verificar o estado do banco de dados
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

// Lista de tabelas conhecidas para verificar
const TABLES_TO_CHECK = [
  'pedidos',
  'itens_pedido',
  'clientes',
  'produtos',
  'categorias',
  'perfis',
  'status_pedido',
  'status_pedidos',
  'status',
  'formas_pagamento',
  'pagamentos',
  'unidades_medida',
  'configuracoes_globais',
  'variacoes_produto',
  'templates_variacao',
  'atributos_variacao',
];

async function checkTable(tableName) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?select=count&limit=0`, {
      method: 'HEAD',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
      },
    });
    
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function getTableCount(tableName) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?select=*`, {
      method: 'HEAD',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Prefer': 'count=exact',
      },
    });
    
    if (response.ok) {
      const count = response.headers.get('content-range');
      if (count) {
        const match = count.match(/\/(\d+)/);
        return match ? parseInt(match[1]) : 0;
      }
    }
    return -1;
  } catch (error) {
    return -1;
  }
}

async function getTableData(tableName, limit = 3) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?select=*&limit=${limit}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
      },
    });
    
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         Verificação do Banco de Dados                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log(`📍 URL: ${SUPABASE_URL}\n`);
  
  console.log('📊 Verificando tabelas...\n');
  
  const existingTables = [];
  const missingTables = [];
  
  for (const table of TABLES_TO_CHECK) {
    const exists = await checkTable(table);
    if (exists) {
      const count = await getTableCount(table);
      existingTables.push({ name: table, count });
      console.log(`  ✅ ${table.padEnd(25)} - ${count >= 0 ? count + ' registros' : 'OK'}`);
    } else {
      missingTables.push(table);
      console.log(`  ❌ ${table.padEnd(25)} - NÃO EXISTE`);
    }
  }
  
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('\n📋 RESUMO:\n');
  console.log(`  ✅ Tabelas existentes: ${existingTables.length}`);
  console.log(`  ❌ Tabelas faltando:   ${missingTables.length}`);
  
  if (missingTables.length > 0) {
    console.log('\n⚠️  Tabelas que precisam ser criadas:');
    missingTables.forEach(t => console.log(`     - ${t}`));
  }
  
  // Verificar dados específicos
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('\n🔍 DETALHES DOS DADOS:\n');
  
  // Pedidos
  if (existingTables.find(t => t.name === 'pedidos')) {
    const pedidos = await getTableData('pedidos');
    if (pedidos && pedidos.length > 0) {
      console.log('📦 Últimos pedidos:');
      pedidos.forEach(p => {
        console.log(`   - #${p.numero_pedido || p.id} | Status: "${p.status}" | Cliente: ${p.cliente_id || 'N/A'}`);
      });
      
      // Verificar valores únicos de status
      const allPedidos = await getTableData('pedidos', 100);
      if (allPedidos) {
        const statusValues = [...new Set(allPedidos.map(p => p.status))];
        console.log(`\n   Status únicos encontrados: ${statusValues.join(', ')}`);
      }
    }
  }
  
  console.log('');
}

main().catch(console.error);

