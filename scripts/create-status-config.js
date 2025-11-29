/**
 * Script para criar a tabela status_pedidos_config e os status padrão
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

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
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

async function getTableData(tableName) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?select=*`, {
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

async function insertData(tableName, data) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}`, {
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

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║       Criação de Status de Pedidos                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Verificar se a tabela existe
  log('📋 Verificando tabela status_pedidos_config...', 'cyan');
  
  const tableExists = await checkTable('status_pedidos_config');
  
  if (!tableExists) {
    log('  ⚠️  Tabela não existe. Criando...', 'yellow');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS status_pedidos_config (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome TEXT NOT NULL UNIQUE,
        cor TEXT DEFAULT '#3B82F6',
        text_color TEXT DEFAULT '#FFFFFF',
        ordem INTEGER DEFAULT 0,
        ativo BOOLEAN DEFAULT true,
        exibir_no_inicio BOOLEAN DEFAULT true,
        exibir_no_fluxo BOOLEAN DEFAULT true,
        is_status_entrega BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      -- Habilitar RLS
      ALTER TABLE status_pedidos_config ENABLE ROW LEVEL SECURITY;
      
      -- Criar política para leitura (todos os usuários autenticados)
      DROP POLICY IF EXISTS "status_pedidos_config_select" ON status_pedidos_config;
      CREATE POLICY "status_pedidos_config_select" ON status_pedidos_config
        FOR SELECT USING (true);
      
      -- Criar política para escrita (apenas admin)
      DROP POLICY IF EXISTS "status_pedidos_config_insert" ON status_pedidos_config;
      CREATE POLICY "status_pedidos_config_insert" ON status_pedidos_config
        FOR INSERT WITH CHECK (true);
      
      DROP POLICY IF EXISTS "status_pedidos_config_update" ON status_pedidos_config;
      CREATE POLICY "status_pedidos_config_update" ON status_pedidos_config
        FOR UPDATE USING (true);
      
      DROP POLICY IF EXISTS "status_pedidos_config_delete" ON status_pedidos_config;
      CREATE POLICY "status_pedidos_config_delete" ON status_pedidos_config
        FOR DELETE USING (true);
    `;
    
    const createResult = await execSQL(createTableSQL);
    
    if (createResult.success) {
      log('  ✅ Tabela criada com sucesso!', 'green');
    } else {
      log(`  ❌ Erro ao criar tabela: ${createResult.error}`, 'red');
      return;
    }
  } else {
    log('  ✅ Tabela já existe', 'green');
  }
  
  // Verificar dados existentes
  log('\n📊 Verificando status existentes...', 'cyan');
  
  const existingData = await getTableData('status_pedidos_config');
  
  if (existingData && existingData.length > 0) {
    log(`  ✅ Encontrados ${existingData.length} status configurados:`, 'green');
    existingData.forEach(s => {
      log(`     - ${s.nome} (ordem: ${s.ordem}, cor: ${s.cor})`, 'reset');
    });
    log('\n💡 Status já configurados. Nenhuma ação necessária.', 'yellow');
    return;
  }
  
  // Buscar status únicos dos pedidos existentes
  log('\n🔍 Buscando status dos pedidos existentes...', 'cyan');
  
  const pedidos = await getTableData('pedidos');
  const statusUnicos = [...new Set(pedidos?.map(p => p.status).filter(Boolean) || [])];
  
  log(`  Encontrados ${statusUnicos.length} status únicos: ${statusUnicos.join(', ')}`, 'blue');
  
  // Criar os status baseados nos pedidos existentes
  log('\n📝 Criando configurações de status...', 'cyan');
  
  // Cores predefinidas para cada tipo de status
  const coresPadrao = {
    'novo pedido': { cor: '#3B82F6', text_color: '#FFFFFF' },
    'em produção': { cor: '#F59E0B', text_color: '#000000' },
    'encaminhar': { cor: '#8B5CF6', text_color: '#FFFFFF' },
    'entrega': { cor: '#06B6D4', text_color: '#FFFFFF' },
    'finalizada': { cor: '#10B981', text_color: '#FFFFFF' },
    'cancelado': { cor: '#EF4444', text_color: '#FFFFFF' },
  };
  
  // Cores aleatórias para status não mapeados
  const coresExtras = [
    '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16', 
    '#EAB308', '#A855F7', '#22C55E', '#0EA5E9', '#D946EF'
  ];
  
  let ordem = 1;
  let corIndex = 0;
  
  for (const statusNome of statusUnicos) {
    const nomeLower = statusNome.toLowerCase();
    const corConfig = coresPadrao[nomeLower] || { 
      cor: coresExtras[corIndex % coresExtras.length], 
      text_color: '#FFFFFF' 
    };
    
    if (!coresPadrao[nomeLower]) {
      corIndex++;
    }
    
    const statusData = {
      nome: statusNome,
      cor: corConfig.cor,
      text_color: corConfig.text_color,
      ordem: ordem++,
      ativo: true,
      exibir_no_inicio: true,
      exibir_no_fluxo: true,
      is_status_entrega: nomeLower.includes('entrega') || nomeLower.includes('finalizada'),
    };
    
    const insertResult = await insertData('status_pedidos_config', statusData);
    
    if (insertResult.success) {
      log(`  ✅ Status "${statusNome}" criado`, 'green');
    } else {
      log(`  ❌ Erro ao criar "${statusNome}": ${insertResult.error}`, 'red');
    }
  }
  
  console.log('\n════════════════════════════════════════════════════════════');
  log('🎉 Configuração de status concluída!', 'green');
  log('💡 Recarregue a página do aplicativo para ver os pedidos.', 'yellow');
  console.log('════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);

