// Cliente Supabase Admin com Service Role Key
// Usado para operações que requerem permissões elevadas (bypass RLS)
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Chave para armazenar configuração dinâmica no localStorage
const DYNAMIC_CONFIG_KEY = 'supabase_dynamic_config';

// Interface para configuração dinâmica
interface DynamicConfig {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseServiceRoleKey?: string;
  projectId?: string;
  destinationDatabaseUrl?: string;
  timestamp?: number;
}

// Função para obter configuração do localStorage
function getDynamicConfig(): DynamicConfig | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(DYNAMIC_CONFIG_KEY);
    if (stored) {
      const config = JSON.parse(stored) as DynamicConfig;
      // Configuração válida por 24 horas
      if (config.timestamp && Date.now() - config.timestamp < 24 * 60 * 60 * 1000) {
        return config;
      }
    }
  } catch (e) {
    console.warn('Erro ao ler configuração dinâmica:', e);
  }
  
  return null;
}

// Função para obter Service Role Key
function getServiceRoleKey(): string | null {
  // Primeiro, tentar usar configuração dinâmica do localStorage
  const dynamicConfig = getDynamicConfig();
  if (dynamicConfig?.supabaseServiceRoleKey) {
    console.log('📦 Usando Service Role Key da configuração dinâmica');
    return dynamicConfig.supabaseServiceRoleKey;
  }
  
  // Fallback para variável de ambiente
  const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string | undefined;
  if (serviceRoleKey) {
    return serviceRoleKey.trim();
  }
  
  return null;
}

// Função para obter Supabase URL
function getSupabaseUrl(): string | null {
  // Primeiro, tentar usar configuração dinâmica
  const dynamicConfig = getDynamicConfig();
  if (dynamicConfig?.supabaseUrl) {
    return dynamicConfig.supabaseUrl;
  }
  
  // Fallback para variáveis de ambiente
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;
  const configuredUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supabaseUrl = configuredUrl?.trim() || (projectId ? `https://${projectId}.supabase.co` : undefined);
  
  return supabaseUrl || null;
}

// Instância do cliente admin (cache)
let adminClientInstance: SupabaseClient<Database> | null = null;
let lastServiceRoleKey: string | null = null;

/**
 * Obtém ou cria cliente Supabase Admin com Service Role Key
 * Retorna null se Service Role Key não estiver disponível
 */
export function getSupabaseAdminClient(): SupabaseClient<Database> | null {
  const serviceRoleKey = getServiceRoleKey();
  const supabaseUrl = getSupabaseUrl();

  if (!serviceRoleKey) {
    console.warn('⚠️ Service Role Key não disponível. Cliente admin não pode ser criado.');
    return null;
  }

  if (!supabaseUrl) {
    console.warn('⚠️ Supabase URL não disponível. Cliente admin não pode ser criado.');
    return null;
  }

  // Se a chave mudou, recriar o cliente
  if (!adminClientInstance || lastServiceRoleKey !== serviceRoleKey) {
    console.log('🔐 Criando cliente Supabase Admin com Service Role Key...');
    
    try {
      adminClientInstance = createClient<Database>(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false, // Admin client não precisa de sessão
          autoRefreshToken: false,
        },
      } as any);
      
      lastServiceRoleKey = serviceRoleKey;
      console.log('✅ Cliente Supabase Admin criado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao criar cliente Supabase Admin:', error);
      return null;
    }
  }

  return adminClientInstance;
}

/**
 * Força recriação do cliente admin
 */
export function recreateAdminClient(): SupabaseClient<Database> | null {
  console.log('🔄 Forçando recriação do cliente Supabase Admin...');
  adminClientInstance = null;
  lastServiceRoleKey = null;
  return getSupabaseAdminClient();
}

/**
 * Verifica se o cliente admin está disponível
 */
export function isAdminClientAvailable(): boolean {
  return getSupabaseAdminClient() !== null;
}

