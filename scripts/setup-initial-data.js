/**
 * Script para criar dados iniciais necessários para o funcionamento do sistema
 * 
 * Uso: node scripts/setup-initial-data.js
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
  process.exit(1);
}

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

async function execSQL(sql) {
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
      return { success: false, error: errorText };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function queryData(table, select = '*', filters = '') {
  try {
    let url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}`;
    if (filters) {
      url += `&${filters}`;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: errorText, data: [] };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message, data: [] };
  }
}

async function insertData(table, data) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: errorText };
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function checkAndCreateStatus() {
  log('\n📋 Verificando status de pedidos...', 'cyan');
  
  const result = await queryData('status_pedido', '*', 'order=ordem');
  
  if (!result.success) {
    log(`  ❌ Erro ao verificar status: ${result.error}`, 'red');
    return false;
  }
  
  if (result.data.length > 0) {
    log(`  ✅ Encontrados ${result.data.length} status configurados:`, 'green');
    result.data.forEach(s => {
      log(`     - ${s.nome} (ordem: ${s.ordem}, cor: ${s.cor})`, 'dim');
    });
    return true;
  }
  
  log('  ⚠️  Nenhum status encontrado. Criando status padrão...', 'yellow');
  
  const defaultStatus = [
    { nome: 'Novo', cor: '#3B82F6', ordem: 1, ativo: true, exibir_no_fluxo: true, exibir_no_inicio: true },
    { nome: 'Em Andamento', cor: '#F59E0B', ordem: 2, ativo: true, exibir_no_fluxo: true, exibir_no_inicio: true },
    { nome: 'Aguardando', cor: '#8B5CF6', ordem: 3, ativo: true, exibir_no_fluxo: true, exibir_no_inicio: true },
    { nome: 'Pronto', cor: '#10B981', ordem: 4, ativo: true, exibir_no_fluxo: true, exibir_no_inicio: true },
    { nome: 'Entregue', cor: '#06B6D4', ordem: 5, ativo: true, exibir_no_fluxo: true, exibir_no_inicio: true },
    { nome: 'Cancelado', cor: '#EF4444', ordem: 6, ativo: true, exibir_no_fluxo: false, exibir_no_inicio: false },
  ];
  
  for (const status of defaultStatus) {
    const insertResult = await insertData('status_pedido', status);
    if (insertResult.success) {
      log(`  ✅ Status "${status.nome}" criado`, 'green');
    } else {
      log(`  ❌ Erro ao criar status "${status.nome}": ${insertResult.error}`, 'red');
    }
  }
  
  return true;
}

async function checkAndCreateFormasPagamento() {
  log('\n💳 Verificando formas de pagamento...', 'cyan');
  
  const result = await queryData('formas_pagamento', '*', 'order=nome');
  
  if (!result.success) {
    log(`  ❌ Erro ao verificar formas de pagamento: ${result.error}`, 'red');
    return false;
  }
  
  if (result.data.length > 0) {
    log(`  ✅ Encontradas ${result.data.length} formas de pagamento`, 'green');
    return true;
  }
  
  log('  ⚠️  Nenhuma forma de pagamento encontrada. Criando padrão...', 'yellow');
  
  const defaultFormas = [
    { nome: 'Dinheiro', ativo: true },
    { nome: 'Cartão de Crédito', ativo: true },
    { nome: 'Cartão de Débito', ativo: true },
    { nome: 'PIX', ativo: true },
    { nome: 'Boleto', ativo: true },
    { nome: 'Transferência', ativo: true },
  ];
  
  for (const forma of defaultFormas) {
    const insertResult = await insertData('formas_pagamento', forma);
    if (insertResult.success) {
      log(`  ✅ Forma "${forma.nome}" criada`, 'green');
    } else {
      log(`  ❌ Erro ao criar forma "${forma.nome}": ${insertResult.error}`, 'red');
    }
  }
  
  return true;
}

async function checkAndCreateUnidadesMedida() {
  log('\n📏 Verificando unidades de medida...', 'cyan');
  
  const result = await queryData('unidades_medida', '*', 'order=nome');
  
  if (!result.success) {
    log(`  ❌ Erro ao verificar unidades de medida: ${result.error}`, 'red');
    return false;
  }
  
  if (result.data.length > 0) {
    log(`  ✅ Encontradas ${result.data.length} unidades de medida`, 'green');
    return true;
  }
  
  log('  ⚠️  Nenhuma unidade de medida encontrada. Criando padrão...', 'yellow');
  
  const defaultUnidades = [
    { nome: 'Unidade', sigla: 'UN' },
    { nome: 'Quilograma', sigla: 'KG' },
    { nome: 'Grama', sigla: 'G' },
    { nome: 'Litro', sigla: 'L' },
    { nome: 'Mililitro', sigla: 'ML' },
    { nome: 'Metro', sigla: 'M' },
    { nome: 'Centímetro', sigla: 'CM' },
    { nome: 'Caixa', sigla: 'CX' },
    { nome: 'Pacote', sigla: 'PCT' },
    { nome: 'Dúzia', sigla: 'DZ' },
  ];
  
  for (const unidade of defaultUnidades) {
    const insertResult = await insertData('unidades_medida', unidade);
    if (insertResult.success) {
      log(`  ✅ Unidade "${unidade.nome}" criada`, 'green');
    } else {
      log(`  ❌ Erro ao criar unidade "${unidade.nome}": ${insertResult.error}`, 'red');
    }
  }
  
  return true;
}

async function checkConfiguracoes() {
  log('\n⚙️  Verificando configurações globais...', 'cyan');
  
  const result = await queryData('configuracoes_globais', '*');
  
  if (!result.success) {
    log(`  ❌ Erro ao verificar configurações: ${result.error}`, 'red');
    return false;
  }
  
  log(`  ✅ Encontradas ${result.data.length} configurações globais`, 'green');
  return true;
}

async function checkPedidos() {
  log('\n📦 Verificando pedidos existentes...', 'cyan');
  
  const result = await queryData('pedidos', 'id,numero_pedido,status,created_at', 'order=created_at.desc&limit=5');
  
  if (!result.success) {
    log(`  ❌ Erro ao verificar pedidos: ${result.error}`, 'red');
    return false;
  }
  
  if (result.data.length > 0) {
    log(`  ✅ Encontrados pedidos. Últimos ${result.data.length}:`, 'green');
    result.data.forEach(p => {
      log(`     - #${p.numero_pedido || p.id} - Status: ${p.status} (${new Date(p.created_at).toLocaleDateString('pt-BR')})`, 'dim');
    });
  } else {
    log(`  ℹ️  Nenhum pedido encontrado no banco de dados`, 'yellow');
  }
  
  return true;
}

async function checkClientes() {
  log('\n👥 Verificando clientes existentes...', 'cyan');
  
  const result = await queryData('clientes', 'id,nome,email', 'order=created_at.desc&limit=5');
  
  if (!result.success) {
    log(`  ❌ Erro ao verificar clientes: ${result.error}`, 'red');
    return false;
  }
  
  if (result.data.length > 0) {
    log(`  ✅ Encontrados ${result.data.length} clientes`, 'green');
  } else {
    log(`  ℹ️  Nenhum cliente encontrado no banco de dados`, 'yellow');
  }
  
  return true;
}

async function checkProdutos() {
  log('\n🛍️  Verificando produtos existentes...', 'cyan');
  
  const result = await queryData('produtos', 'id,nome,preco', 'order=created_at.desc&limit=5');
  
  if (!result.success) {
    log(`  ❌ Erro ao verificar produtos: ${result.error}`, 'red');
    return false;
  }
  
  if (result.data.length > 0) {
    log(`  ✅ Encontrados ${result.data.length} produtos`, 'green');
  } else {
    log(`  ℹ️  Nenhum produto encontrado no banco de dados`, 'yellow');
  }
  
  return true;
}

async function main() {
  console.log('');
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║     Configuração de Dados Iniciais - Fellow Sync Suite     ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  console.log('');
  
  log(`📍 Projeto: ${SUPABASE_URL}`, 'blue');
  console.log('');
  
  // Verificar e criar dados essenciais
  await checkAndCreateStatus();
  await checkAndCreateFormasPagamento();
  await checkAndCreateUnidadesMedida();
  await checkConfiguracoes();
  
  // Verificar dados existentes
  await checkPedidos();
  await checkClientes();
  await checkProdutos();
  
  console.log('');
  log('════════════════════════════════════════════════════════════', 'cyan');
  log('🎉 Verificação e configuração concluída!', 'green');
  log('════════════════════════════════════════════════════════════', 'cyan');
  console.log('');
  log('💡 Se os status foram criados, recarregue a página do aplicativo.', 'yellow');
  console.log('');
}

main().catch(error => {
  log(`❌ Erro fatal: ${error.message}`, 'red');
  process.exit(1);
});

