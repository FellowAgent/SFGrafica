/**
 * Script para verificar a configuração de status
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

async function main() {
  console.log('\n📋 Verificando configuração de status...\n');
  
  // Buscar status configurados
  const statusResponse = await fetch(`${SUPABASE_URL}/rest/v1/status_pedidos_config?select=*&order=ordem`, {
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
    },
  });
  
  const statusData = await statusResponse.json();
  
  console.log('Status configurados:\n');
  statusData.forEach(s => {
    console.log(`  ${s.ativo ? '✅' : '❌'} "${s.nome}" - ordem: ${s.ordem}, cor: ${s.cor}, exibir_no_inicio: ${s.exibir_no_inicio}`);
  });
  
  // Buscar pedidos e seus status
  console.log('\n\n📦 Verificando status dos pedidos...\n');
  
  const pedidosResponse = await fetch(`${SUPABASE_URL}/rest/v1/pedidos?select=id,numero_pedido,status&order=created_at.desc&limit=20`, {
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
    },
  });
  
  const pedidosData = await pedidosResponse.json();
  
  // Verificar correspondência
  const statusNames = new Set(statusData.map(s => s.nome));
  
  console.log('Últimos pedidos e correspondência de status:\n');
  pedidosData.forEach(p => {
    const match = statusNames.has(p.status);
    console.log(`  ${match ? '✅' : '❌'} #${p.numero_pedido} - Status: "${p.status}" ${match ? '' : '(NÃO ENCONTRADO NA CONFIG)'}`);
  });
  
  // Status únicos dos pedidos que não têm correspondência
  const pedidosStatusSet = new Set(pedidosData.map(p => p.status));
  const missingStatus = [...pedidosStatusSet].filter(s => !statusNames.has(s));
  
  if (missingStatus.length > 0) {
    console.log('\n⚠️  Status nos pedidos que não existem na configuração:');
    missingStatus.forEach(s => console.log(`     - "${s}"`));
  }
}

main().catch(console.error);

