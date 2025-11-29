/**
 * Script para sincronizar status dos pedidos com a configuração
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
  console.log('║    Sincronização de Status de Pedidos                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Buscar todos os status configurados
  log('📋 Buscando status configurados...', 'cyan');
  const statusConfig = await getTableData('status_pedidos_config');
  const statusConfigurados = new Set((statusConfig || []).map(s => s.nome.toLowerCase()));
  
  log(`   Configurados: ${[...statusConfigurados].join(', ')}`, 'blue');
  
  // Buscar status únicos dos pedidos
  log('\n🔍 Buscando status dos pedidos...', 'cyan');
  const pedidos = await getTableData('pedidos');
  const statusPedidos = [...new Set((pedidos || []).map(p => p.status).filter(Boolean))];
  
  log(`   Nos pedidos: ${statusPedidos.join(', ')}`, 'blue');
  
  // Encontrar status faltantes
  const statusFaltantes = statusPedidos.filter(s => !statusConfigurados.has(s.toLowerCase()));
  
  if (statusFaltantes.length === 0) {
    log('\n✅ Todos os status dos pedidos já estão configurados!', 'green');
    return;
  }
  
  log(`\n⚠️  Status faltantes: ${statusFaltantes.join(', ')}`, 'yellow');
  
  // Cores para novos status
  const coresExtras = [
    '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16', 
    '#EAB308', '#A855F7', '#22C55E', '#0EA5E9', '#D946EF'
  ];
  
  // Encontrar a maior ordem atual
  const maxOrdem = Math.max(...(statusConfig || []).map(s => s.ordem || 0), 0);
  
  log('\n📝 Criando status faltantes...', 'cyan');
  
  for (let i = 0; i < statusFaltantes.length; i++) {
    const statusNome = statusFaltantes[i];
    
    const statusData = {
      nome: statusNome,
      cor: coresExtras[i % coresExtras.length],
      text_color: '#FFFFFF',
      ordem: maxOrdem + i + 1,
      ativo: true,
      exibir_no_inicio: true,
      is_status_entrega: false,
    };
    
    const insertResult = await insertData('status_pedidos_config', statusData);
    
    if (insertResult.success) {
      log(`   ✅ Status "${statusNome}" criado com cor ${statusData.cor}`, 'green');
    } else {
      log(`   ❌ Erro ao criar "${statusNome}": ${insertResult.error}`, 'red');
    }
  }
  
  console.log('\n════════════════════════════════════════════════════════════');
  log('🎉 Sincronização concluída!', 'green');
  log('💡 Recarregue a página do aplicativo para ver os pedidos.', 'yellow');
  console.log('════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);

