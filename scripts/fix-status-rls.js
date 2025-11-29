/**
 * Script para corrigir as políticas RLS da tabela status_pedidos_config
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

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     Corrigindo Políticas RLS - status_pedidos_config       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // SQL para criar/atualizar políticas RLS
  const rlsSQL = `
    -- Desabilitar RLS temporariamente para limpeza
    ALTER TABLE status_pedidos_config DISABLE ROW LEVEL SECURITY;
    
    -- Remover políticas existentes
    DROP POLICY IF EXISTS "status_pedidos_config_select" ON status_pedidos_config;
    DROP POLICY IF EXISTS "status_pedidos_config_insert" ON status_pedidos_config;
    DROP POLICY IF EXISTS "status_pedidos_config_update" ON status_pedidos_config;
    DROP POLICY IF EXISTS "status_pedidos_config_delete" ON status_pedidos_config;
    DROP POLICY IF EXISTS "status_pedidos_config_select_authenticated" ON status_pedidos_config;
    DROP POLICY IF EXISTS "status_pedidos_config_all_authenticated" ON status_pedidos_config;
    
    -- Habilitar RLS
    ALTER TABLE status_pedidos_config ENABLE ROW LEVEL SECURITY;
    
    -- Política para permitir leitura por todos os usuários autenticados
    CREATE POLICY "status_pedidos_config_select_authenticated" ON status_pedidos_config
      FOR SELECT
      TO authenticated
      USING (true);
    
    -- Política para permitir inserção, atualização e exclusão por usuários autenticados
    -- Em produção, você pode restringir isso para apenas admins
    CREATE POLICY "status_pedidos_config_all_authenticated" ON status_pedidos_config
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  `;

  console.log('🔧 Aplicando políticas RLS...\n');
  
  const result = await execSQL(rlsSQL);
  
  if (result.success) {
    console.log('✅ Políticas RLS aplicadas com sucesso!');
  } else {
    console.log('❌ Erro ao aplicar políticas:', result.error);
  }
  
  // Verificar se os dados estão acessíveis
  console.log('\n📊 Verificando acesso aos dados...\n');
  
  const response = await fetch(`${SUPABASE_URL}/rest/v1/status_pedidos_config?select=nome&order=ordem`, {
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
    },
  });
  
  if (response.ok) {
    const data = await response.json();
    console.log(`✅ ${data.length} status encontrados:`, data.map(s => s.nome).join(', '));
  } else {
    console.log('❌ Erro ao verificar dados:', await response.text());
  }
  
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('💡 Recarregue a página do aplicativo para ver os pedidos.');
  console.log('════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);

