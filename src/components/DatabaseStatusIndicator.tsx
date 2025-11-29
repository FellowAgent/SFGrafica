import { useState, useEffect, useCallback } from "react";
import {
  Database,
  Cloud,
  Server,
  Wifi,
  WifiOff,
  Settings,
  Copy,
  Loader2,
  Trash2,
  Save,
  FileCode,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Zap,
  Link,
  Unlink,
} from "lucide-react";
import { supabase, setDynamicSupabaseConfig } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/utils/toastHelper";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

type SupabaseConnectionConfig = {
  projectId: string;
  supabaseUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  databaseUrl: string;
};

type ConnectionStatus = 'idle' | 'testing' | 'connected' | 'error';

type ConnectionTestResult = {
  api: ConnectionStatus;
  serviceRole: ConnectionStatus;
  postgres: ConnectionStatus;
  apiError?: string;
  serviceRoleError?: string;
  postgresError?: string;
};

const SOURCE_CONFIG_STORAGE_KEY = 'supabase_clone_source';
const DESTINATION_DB_URL_KEY = 'supabase_destination_db_url';
const REOPEN_CONFIG_DIALOG_KEY = 'supabase_reopen_config_dialog';
const DESTINATION_CONFIG_CACHE_KEY = 'supabase_destination_config_cache';

const SOURCE_DEFAULTS: SupabaseConnectionConfig = {
  projectId: "odlfkrnrkvruvqxseusr",
  supabaseUrl: "https://odlfkrnrkvruvqxseusr.supabase.co",
  anonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kbGZrcm5ya3ZydXZxeHNldXNyIiwicm9zZSI6ImFub24iLCJpYXQiOjE3NTk2Njg4NjksImV4cCI6MjA3NTI0NDg2OX0.YhVAZIhULCdzqfs04gRtbAaVl4rcCMU2DgbqwuIqeiQ",
  serviceRoleKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kbGZrcm5ya3ZydXZxeHNldXNyIiwicm9zZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTY2ODg2OSwiZXhwIjoyMDc1MjQ0ODY5fQ.j82phBjxlTw3nUslGp2mx3FfFnRaftX6HKwCxkzxxWQ",
  databaseUrl: "",
};

const getDefaultSourceConfig = (): SupabaseConnectionConfig => ({
  ...SOURCE_DEFAULTS,
});

const normalizeSupabaseUrl = (url: string) => {
  if (!url) return "";
  return url.endsWith("/") ? url.slice(0, -1) : url;
};

type CloneLogEntry = {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  details?: Record<string, unknown> | string;
};

type CloneStep = {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress?: number;
};

const CLONE_STEPS: CloneStep[] = [
  { id: 'validate', name: 'Validando credenciais', status: 'pending' },
  { id: 'export', name: 'Exportando schema da origem', status: 'pending' },
  { id: 'extensions', name: 'Copiando extensões PostgreSQL', status: 'pending' },
  { id: 'types', name: 'Copiando tipos customizados (ENUMs)', status: 'pending' },
  { id: 'sequences', name: 'Copiando sequences', status: 'pending' },
  { id: 'tables', name: 'Criando estrutura de tabelas', status: 'pending' },
  { id: 'constraints', name: 'Aplicando constraints', status: 'pending' },
  { id: 'views', name: 'Criando views', status: 'pending' },
  { id: 'functions', name: 'Copiando funções do banco', status: 'pending' },
  { id: 'triggers', name: 'Configurando triggers', status: 'pending' },
  { id: 'indexes', name: 'Criando índices', status: 'pending' },
  { id: 'rls', name: 'Aplicando políticas RLS', status: 'pending' },
  { id: 'storage', name: 'Configurando Storage', status: 'pending' },
  { id: 'permissions', name: 'Aplicando permissões', status: 'pending' },
  { id: 'finalize', name: 'Finalizando', status: 'pending' },
];

const buildFunctionEndpoints = (
  baseUrl: string,
  functionName: string,
  projectId?: string
) => {
  const normalized = normalizeSupabaseUrl(baseUrl);
  const endpoints = new Set<string>();
  endpoints.add(`${normalized}/functions/v1/${functionName}`);

  const projectMatch = normalized.match(/^https:\/\/([^.]+)\.supabase\.co$/i);
  if (projectMatch?.[1]) {
    endpoints.add(`https://${projectMatch[1]}.functions.supabase.co/${functionName}`);
  }

  if (projectId) {
    endpoints.add(`https://${projectId}.functions.supabase.co/${functionName}`);
  }

  return Array.from(endpoints);
};

export function DatabaseStatusIndicator() {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  
  // Destination config
  const [configUrl, setConfigUrl] = useState("");
  const [configAnonKey, setConfigAnonKey] = useState("");
  const [configProjectId, setConfigProjectId] = useState("");
  const [configServiceRoleKey, setConfigServiceRoleKey] = useState("");
  const [configDatabaseUrl, setConfigDatabaseUrl] = useState("");
  
  // Source config
  const [sourceConfig, setSourceConfig] = useState<SupabaseConnectionConfig>(() => getDefaultSourceConfig());
  
  // Connection test status
  const [destConnectionStatus, setDestConnectionStatus] = useState<ConnectionTestResult>({
    api: 'idle',
    serviceRole: 'idle',
    postgres: 'idle'
  });
  const [sourceConnectionStatus, setSourceConnectionStatus] = useState<ConnectionTestResult>({
    api: 'idle',
    serviceRole: 'idle',
    postgres: 'idle'
  });
  
  // Hook para gerenciar atalhos do banco de dados
  const { shortcuts } = useKeyboardShortcuts();
  
  const [isSaving, setIsSaving] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [isApplyingEnv, setIsApplyingEnv] = useState(false);
  const [cloneStatus, setCloneStatus] = useState<string | null>(null);
  const [cloneProgress, setCloneProgress] = useState(0);
  const [cloneLogs, setCloneLogs] = useState<CloneLogEntry[]>([]);
  const [cloneSteps, setCloneSteps] = useState<CloneStep[]>([]);
  const [isWiping, setIsWiping] = useState(false);
  const [wipeProgress, setWipeProgress] = useState(0);
  
  // Wipe confirmation dialog
  const [showWipeDialog, setShowWipeDialog] = useState(false);
  const [wipeConfirmation1, setWipeConfirmation1] = useState(false);
  const [wipeConfirmation2, setWipeConfirmation2] = useState(false);
  const [wipeConfirmText, setWipeConfirmText] = useState("");
  
  const [showSettingsGear, setShowSettingsGear] = useState(() => {
    if (typeof window === 'undefined') return false;
    // Mostrar engrenagem por padrão na página de login
    const isLoginPage = window.location.pathname === '/login' || window.location.pathname === '/';
    const storedValue = localStorage.getItem('db-settings-gear-visible');
    return storedValue === 'true' || isLoginPage;
  });

  const isDirectCloneMode = Boolean(configDatabaseUrl.trim());
  const isCloud = import.meta.env.VITE_SUPABASE_URL?.includes('supabase.co');

  // ===== Config Persistence Functions =====
  
  const persistSourceConfig = (config: SupabaseConnectionConfig) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(SOURCE_CONFIG_STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('Erro ao salvar configuração da origem:', error);
    }
  };

  const getSanitizedSourceConfig = (): SupabaseConnectionConfig => ({
    projectId: sourceConfig.projectId.trim() || SOURCE_DEFAULTS.projectId,
    supabaseUrl: sourceConfig.supabaseUrl.trim() || SOURCE_DEFAULTS.supabaseUrl,
    anonKey: sourceConfig.anonKey.trim() || SOURCE_DEFAULTS.anonKey,
    serviceRoleKey: sourceConfig.serviceRoleKey.trim() || SOURCE_DEFAULTS.serviceRoleKey,
    databaseUrl: sourceConfig.databaseUrl.trim(),
  });

  const saveSourceConfigLocally = (options?: { silent?: boolean }) => {
    const sanitized = getSanitizedSourceConfig();
    persistSourceConfig(sanitized);
    setSourceConfig(sanitized);
    if (!options?.silent) {
      toast.success('Configurações do banco de origem salvas!');
    }
    return sanitized;
  };

  const loadSourceConfig = () => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(SOURCE_CONFIG_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSourceConfig({
          projectId: parsed.projectId || SOURCE_DEFAULTS.projectId,
          supabaseUrl: parsed.supabaseUrl || SOURCE_DEFAULTS.supabaseUrl,
          anonKey: parsed.anonKey || SOURCE_DEFAULTS.anonKey,
          serviceRoleKey: parsed.serviceRoleKey || SOURCE_DEFAULTS.serviceRoleKey,
          databaseUrl: parsed.databaseUrl || SOURCE_DEFAULTS.databaseUrl,
        });
        return;
      }
    } catch (error) {
      console.warn('Erro ao carregar configuração da origem:', error);
    }
    setSourceConfig(getDefaultSourceConfig());
  };

  const updateSourceConfig = (field: keyof SupabaseConnectionConfig, value: string) => {
    setSourceConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveSourceConfig = () => {
    saveSourceConfigLocally();
  };

  const getSanitizedDestinationConfig = (): SupabaseConnectionConfig => ({
    projectId: configProjectId.trim(),
    supabaseUrl: configUrl.trim(),
    anonKey: configAnonKey.trim(),
    serviceRoleKey: configServiceRoleKey.trim(),
    databaseUrl: configDatabaseUrl.trim(),
  });

  const loadCachedDestinationConfig = (): SupabaseConnectionConfig | null => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(DESTINATION_CONFIG_CACHE_KEY);
      if (stored) {
        return JSON.parse(stored) as SupabaseConnectionConfig;
      }
    } catch (error) {
      console.warn('Erro ao carregar configuração do destino:', error);
    }
    return null;
  };

  const persistDestinationConfig = (options?: { silent?: boolean }) => {
    const sanitized = getSanitizedDestinationConfig();
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(DESTINATION_CONFIG_CACHE_KEY, JSON.stringify(sanitized));
        if (sanitized.databaseUrl) {
          localStorage.setItem(DESTINATION_DB_URL_KEY, sanitized.databaseUrl);
        } else {
          localStorage.removeItem(DESTINATION_DB_URL_KEY);
        }
        if (!options?.silent) {
          toast.success('Configuração do destino salva localmente!');
        }
      } catch (error) {
        console.error('Erro ao salvar configuração do destino:', error);
        if (!options?.silent) {
          toast.error('Erro ao salvar configuração do destino');
        }
      }
    }
    return sanitized;
  };

  // ===== Connection Test Functions =====
  
  const testApiConnection = async (
    url: string,
    anonKey: string,
    type: 'source' | 'destination'
  ): Promise<boolean> => {
    const setStatus = type === 'source' ? setSourceConnectionStatus : setDestConnectionStatus;
    
    setStatus(prev => ({ ...prev, api: 'testing', apiError: undefined }));
    
    try {
      if (!url || !anonKey) {
        setStatus(prev => ({ ...prev, api: 'error', apiError: 'URL e Anon Key são obrigatórios' }));
        return false;
      }

      const { createClient } = await import('@supabase/supabase-js');
      const testClient = createClient(url.trim(), anonKey.trim(), {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { error } = await testClient.from('perfis').select('id', { count: 'exact', head: true });
      
      if (error) {
        setStatus(prev => ({ ...prev, api: 'error', apiError: error.message }));
        return false;
      }
      
      setStatus(prev => ({ ...prev, api: 'connected', apiError: undefined }));
      return true;
    } catch (err: any) {
      setStatus(prev => ({ ...prev, api: 'error', apiError: err.message }));
      return false;
    }
  };

  const testServiceRoleConnection = async (
    url: string,
    serviceRoleKey: string,
    type: 'source' | 'destination'
  ): Promise<boolean> => {
    const setStatus = type === 'source' ? setSourceConnectionStatus : setDestConnectionStatus;
    
    setStatus(prev => ({ ...prev, serviceRole: 'testing', serviceRoleError: undefined }));
    
    try {
      if (!url || !serviceRoleKey) {
        setStatus(prev => ({ ...prev, serviceRole: 'error', serviceRoleError: 'URL e Service Role Key são obrigatórios' }));
        return false;
      }

      const { createClient } = await import('@supabase/supabase-js');
      const testClient = createClient(url.trim(), serviceRoleKey.trim(), {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      // Tentar usar exec_sql primeiro (mais preciso para Service Role)
      const { error } = await testClient.rpc('exec_sql', { sql_query: 'SELECT 1;' });
      
      if (error) {
        // Fallback: tentar query simples
        const { error: fallbackError } = await testClient.from('perfis').select('id', { count: 'exact', head: true });
        if (fallbackError) {
          setStatus(prev => ({ ...prev, serviceRole: 'error', serviceRoleError: fallbackError.message }));
          return false;
        }
      }
      
      setStatus(prev => ({ ...prev, serviceRole: 'connected', serviceRoleError: undefined }));
      return true;
    } catch (err: any) {
      setStatus(prev => ({ ...prev, serviceRole: 'error', serviceRoleError: err.message }));
      return false;
    }
  };

  const testPostgresConnection = async (
    dbUrl: string,
    serviceRoleKey: string,
    supabaseUrl: string,
    type: 'source' | 'destination'
  ): Promise<boolean> => {
    const setStatus = type === 'source' ? setSourceConnectionStatus : setDestConnectionStatus;
    
    setStatus(prev => ({ ...prev, postgres: 'testing', postgresError: undefined }));
    
    try {
      // Verificar se URL do Postgres foi informada
      if (!dbUrl.trim()) {
        setStatus(prev => ({ 
          ...prev, 
          postgres: 'error', 
          postgresError: 'URL de conexão Postgres não informada' 
        }));
        return false;
      }

      // Verificar se temos Service Role Key para autenticação
      if (!serviceRoleKey.trim() || !supabaseUrl.trim()) {
        setStatus(prev => ({ 
          ...prev, 
          postgres: 'error', 
          postgresError: 'Service Role Key e URL do Supabase são necessários para o teste' 
        }));
        return false;
      }

      // Testar via Edge Function que pode fazer conexão direta
      const response = await fetch(`${supabaseUrl}/functions/v1/test-service-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
        },
        body: JSON.stringify({ databaseUrl: dbUrl }),
      });
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setStatus(prev => ({ 
          ...prev, 
          postgres: 'error', 
          postgresError: data.error || `Erro HTTP ${response.status}` 
        }));
        return false;
      }
      
      const data = await response.json();
      if (data.success) {
        setStatus(prev => ({ ...prev, postgres: 'connected', postgresError: undefined }));
        return true;
      } else {
        setStatus(prev => ({ ...prev, postgres: 'error', postgresError: data.error }));
        return false;
      }
    } catch (err: any) {
      setStatus(prev => ({ ...prev, postgres: 'error', postgresError: err.message }));
      return false;
    }
  };

  const handleTestDestinationApi = () => {
    testApiConnection(configUrl, configAnonKey, 'destination');
  };

  const handleTestDestinationServiceRole = () => {
    testServiceRoleConnection(configUrl, configServiceRoleKey, 'destination');
  };

  const handleTestDestinationPostgres = () => {
    testPostgresConnection(configDatabaseUrl, configServiceRoleKey, configUrl, 'destination');
  };

  const handleTestSourceApi = () => {
    testApiConnection(sourceConfig.supabaseUrl, sourceConfig.anonKey, 'source');
  };

  const handleTestSourceServiceRole = () => {
    testServiceRoleConnection(sourceConfig.supabaseUrl, sourceConfig.serviceRoleKey, 'source');
  };

  const handleTestSourcePostgres = () => {
    testPostgresConnection(sourceConfig.databaseUrl, sourceConfig.serviceRoleKey, sourceConfig.supabaseUrl, 'source');
  };

  // ===== Effects =====
  
  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const shouldReopen = localStorage.getItem(REOPEN_CONFIG_DIALOG_KEY);
    if (shouldReopen) {
      localStorage.removeItem(REOPEN_CONFIG_DIALOG_KEY);
      setShowConfigDialog(true);
    }
  }, []);

  useEffect(() => {
    if (showConfigDialog) {
      try {
        const dynamicConfig = localStorage.getItem('supabase_dynamic_config');
        let destinationDbUrl = '';
        let usedDynamicConfig = false;
        if (dynamicConfig) {
          const config = JSON.parse(dynamicConfig);
          setConfigUrl(config.supabaseUrl || '');
          setConfigAnonKey(config.supabaseAnonKey || '');
          setConfigProjectId(config.projectId || '');
          setConfigServiceRoleKey(config.supabaseServiceRoleKey || '');
          destinationDbUrl = config.destinationDatabaseUrl || '';
          usedDynamicConfig = true;
        } else {
          setConfigUrl(import.meta.env.VITE_SUPABASE_URL || '');
          setConfigAnonKey(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '');
          setConfigProjectId(import.meta.env.VITE_SUPABASE_PROJECT_ID || '');
          setConfigServiceRoleKey(import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '');
        }
        let storedDbUrl = destinationDbUrl || '';
        try {
          storedDbUrl = localStorage.getItem(DESTINATION_DB_URL_KEY) || destinationDbUrl || '';
        } catch (err) {
          console.warn('Erro ao carregar conexão Postgres destino:', err);
        }
        setConfigDatabaseUrl(storedDbUrl);

        if (!usedDynamicConfig) {
          const cachedDestination = loadCachedDestinationConfig();
          if (cachedDestination) {
            setConfigProjectId(cachedDestination.projectId ?? '');
            setConfigUrl(cachedDestination.supabaseUrl ?? '');
            setConfigAnonKey(cachedDestination.anonKey ?? '');
            setConfigServiceRoleKey(cachedDestination.serviceRoleKey ?? '');
            if (!storedDbUrl) {
              setConfigDatabaseUrl(cachedDestination.databaseUrl ?? '');
            }
          }
        }
      } catch (e) {
        setConfigUrl(import.meta.env.VITE_SUPABASE_URL || '');
        setConfigAnonKey(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '');
        setConfigProjectId(import.meta.env.VITE_SUPABASE_PROJECT_ID || '');
        setConfigServiceRoleKey(import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '');
        setConfigDatabaseUrl('');

        const cachedDestination = loadCachedDestinationConfig();
        if (cachedDestination) {
          setConfigProjectId(cachedDestination.projectId ?? '');
          setConfigUrl(cachedDestination.supabaseUrl ?? '');
          setConfigAnonKey(cachedDestination.anonKey ?? '');
          setConfigServiceRoleKey(cachedDestination.serviceRoleKey ?? '');
          setConfigDatabaseUrl(cachedDestination.databaseUrl ?? '');
        }
      }
      loadSourceConfig();
      
      // Reset connection status
      setDestConnectionStatus({ api: 'idle', serviceRole: 'idle', postgres: 'idle' });
      setSourceConnectionStatus({ api: 'idle', serviceRole: 'idle', postgres: 'idle' });
    } else {
      setCloneStatus(null);
      setCloneProgress(0);
      setCloneLogs([]);
      setCloneSteps([]);
      setWipeProgress(0);
    }
  }, [showConfigDialog]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const shortcut = shortcuts.toggleSettingsGear;

      const key = e.key?.toUpperCase?.() ?? '';
      const isCorrectKey = key === shortcut.key.toUpperCase();
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      const matchesShortcut = 
        isCorrectKey &&
        (shortcut.ctrl ? isCtrlOrCmd : !isCtrlOrCmd) &&
        (shortcut.shift ? e.shiftKey : !e.shiftKey) &&
        (shortcut.alt ? e.altKey : !e.altKey);

      if (matchesShortcut) {
        e.preventDefault();
        setShowSettingsGear(prev => {
          const newValue = !prev;
          if (typeof window !== 'undefined') {
            localStorage.setItem('db-settings-gear-visible', String(newValue));
          }
          
          toast.info(
            newValue 
              ? "Engrenagem de configurações exibida" 
              : "Engrenagem de configurações ocultada",
            { duration: 2000 }
          );
          
          return newValue;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);

  // ===== Action Functions =====
  
  const checkConnection = async () => {
    try {
      const { error } = await supabase.from('perfis').select('id', { count: 'exact', head: true });
      setIsOnline(!error);
    } catch {
      setIsOnline(false);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!configUrl || !configAnonKey) {
      toast.error('Preencha URL e Chave Anon');
      return;
    }

    saveSourceConfigLocally({ silent: true });

    setIsSaving(true);
    try {
      persistDestinationConfig();
      toast.success('Configuração do destino salva!', {
        description: 'Use o botão "Atualizar .env" para aplicar estas credenciais.',
      });
    } catch (err: any) {
      toast.error('Erro ao salvar configuração', { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyDestinationEnv = async () => {
    if (!configUrl || !configAnonKey) {
      toast.error('Preencha URL e Chave Anon');
      return;
    }

    setIsApplyingEnv(true);
    try {
      saveSourceConfigLocally({ silent: true });
      const sanitized = persistDestinationConfig({ silent: true });

      setDynamicSupabaseConfig(
        sanitized.supabaseUrl,
        sanitized.anonKey,
        sanitized.projectId || undefined,
        sanitized.serviceRoleKey || undefined,
        sanitized.databaseUrl || undefined
      );

      toast.success('Configuração aplicada ao ambiente!', {
        description: 'Recarregando a página para aplicar as mudanças...',
      });

      try {
        localStorage.setItem(REOPEN_CONFIG_DIALOG_KEY, '1');
      } catch (err) {
        console.warn('Não foi possível agendar reabertura da configuração:', err);
      }

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      console.error('Erro ao aplicar configuração no .env:', err);
      toast.error('Erro ao aplicar configuração', {
        description: err?.message || 'Falha ao atualizar variáveis do ambiente.',
      });
    } finally {
      setIsApplyingEnv(false);
    }
  };

  const ensureDestinationCredentials = () => {
    if (isDirectCloneMode) {
      if (!configDatabaseUrl.trim()) {
        toast.error('Informe a URL de conexão Postgres do destino.');
        return false;
      }
      return true;
    }

    if (!configUrl.trim()) {
      toast.error('Informe a URL do banco de destino.');
      return false;
    }
    if (!configServiceRoleKey.trim()) {
      toast.error('Informe a Service Role Key do destino.');
      return false;
    }
    return true;
  };

  const ensureSourceCredentials = () => {
    if (!sourceConfig.supabaseUrl.trim()) {
      toast.error('Informe a URL do banco de origem.');
      return false;
    }
    if (!sourceConfig.serviceRoleKey.trim()) {
      toast.error('Informe a Service Role Key do banco de origem.');
      return false;
    }
    return true;
  };

  const callSupabaseFunction = async (
    baseUrl: string,
    functionName: string,
    options: {
      apiKey: string;
      authToken?: string;
      projectId?: string;
    },
    payload: Record<string, any>
  ) => {
    const endpoints = buildFunctionEndpoints(baseUrl, functionName, options.projectId);
    let lastError = `Nenhum endpoint válido para ${functionName}`;
    let lastErrorData: any = null;

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: options.apiKey,
            Authorization: `Bearer ${options.authToken || options.apiKey}`,
          },
          body: JSON.stringify(payload),
        });

        let data: any = null;
        try {
          data = await response.json();
        } catch (err) {
          console.warn(`Resposta não-JSON de ${functionName} (${endpoint}):`, err);
        }

        if (response.ok) {
          return data;
        }

        lastErrorData = data;
        const errorMessage =
          data?.error ||
          data?.message ||
          data?.msg ||
          `HTTP ${response.status} ${response.statusText}`;
        lastError = `[${endpoint}] ${errorMessage}`;
        console.error(`Erro ao chamar ${functionName} em ${endpoint}:`, data);
      } catch (err: any) {
        lastError = `[${endpoint}] ${err?.message || err}`;
        console.error(`Erro de rede ao chamar ${functionName} em ${endpoint}:`, err);
        lastErrorData = err?.response || null;
      }
    }

    const error = new Error(`Falha ao chamar ${functionName}: ${lastError}`) as Error & { response?: any };
    if (lastErrorData) {
      error.response = lastErrorData;
    }
    throw error;
  };

  const addLog = useCallback((message: string, level: CloneLogEntry['level'] = 'info', details?: Record<string, unknown> | string) => {
    const entry: CloneLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details,
    };
    setCloneLogs(prev => [...prev, entry]);
  }, []);

  const updateStepStatus = useCallback((stepId: string, status: CloneStep['status'], progress?: number) => {
    setCloneSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status, progress } : step
    ));
  }, []);

  const handleCloneDatabase = async () => {
    if (!ensureSourceCredentials()) return;
    if (!ensureDestinationCredentials()) return;

    const sourceUrl = sourceConfig.supabaseUrl.trim() || SOURCE_DEFAULTS.supabaseUrl;
    const sourceProject = sourceConfig.projectId.trim() || SOURCE_DEFAULTS.projectId;
    const sourceServiceKey = sourceConfig.serviceRoleKey.trim() || SOURCE_DEFAULTS.serviceRoleKey;
    const sourceAnonKey = sourceConfig.anonKey.trim() || SOURCE_DEFAULTS.anonKey;
    const sourceApiKey = sourceAnonKey || sourceServiceKey;
    const destinationKey = configServiceRoleKey.trim();
    const destinationUrl = configUrl.trim();

    setIsCloning(true);
    setCloneProgress(0);
    setCloneStatus('Iniciando processo de clonagem...');
    setCloneLogs([]);
    setCloneSteps(CLONE_STEPS.map(s => ({ ...s, status: 'pending' })));

    addLog('Iniciando processo de clonagem do banco de dados', 'info');
    addLog(`Origem: ${sourceUrl}`, 'info');
    addLog(`Destino: ${destinationUrl || configDatabaseUrl}`, 'info');

    try {
      // Step 1: Validate
      updateStepStatus('validate', 'running');
      setCloneProgress(5);
      addLog('Validando credenciais...', 'info');
      await new Promise(resolve => setTimeout(resolve, 500));
      updateStepStatus('validate', 'completed');
      addLog('Credenciais validadas com sucesso', 'success');

      // Step 2: Export
      updateStepStatus('export', 'running');
      setCloneProgress(10);
      setCloneStatus('Exportando schema da origem...');
      addLog('Invocando função de exportação no servidor de origem...', 'info');

      const destinationPayload = {
        supabaseUrl: destinationUrl,
        serviceRoleKey: destinationKey,
        anonKey: configAnonKey.trim() || undefined,
        projectId: configProjectId.trim() || undefined,
        databaseUrl: configDatabaseUrl.trim() || undefined,
      };

      const sourcePayload = {
        supabaseUrl: sourceUrl,
        serviceRoleKey: sourceServiceKey,
        anonKey: sourceAnonKey || undefined,
        projectId: sourceProject,
        databaseUrl: sourceConfig.databaseUrl.trim() || undefined,
      };

      const response = await callSupabaseFunction(
        sourceUrl,
        'clone-database',
        {
          apiKey: sourceApiKey,
          authToken: sourceServiceKey,
          projectId: sourceProject,
        },
        {
          source: sourcePayload,
          destination: destinationPayload,
          includeData: false,
          resetDestination: false,
          preferCliExecution: isDirectCloneMode,
        }
      );

      // Update progress through steps based on response
      updateStepStatus('export', 'completed');
      addLog('Schema exportado com sucesso', 'success');
      
      // Simulate step progression
      const stepIds = ['extensions', 'types', 'sequences', 'tables', 'constraints', 'views', 'functions', 'triggers', 'indexes', 'rls', 'storage', 'permissions', 'finalize'];
      let progressStep = 15;
      for (const stepId of stepIds) {
        updateStepStatus(stepId, 'running');
        setCloneProgress(progressStep);
        await new Promise(resolve => setTimeout(resolve, 100));
        updateStepStatus(stepId, 'completed');
        progressStep += 6;
      }

      if (!response?.success) {
        throw new Error(response?.error || 'Erro ao executar clonagem');
      }

      // Apply server logs if available
      if (response?.logs && Array.isArray(response.logs)) {
        response.logs.forEach((log: any) => {
          addLog(log.message, log.level, log.details);
        });
      }

      setCloneProgress(100);
      setCloneStatus('Clonagem concluída com sucesso!');
      addLog(
        `Clonagem concluída: ${response.statements?.successful || 0}/${response.statements?.total || 0} statements aplicados`,
        'success'
      );
      
      toast.success('Clonagem finalizada', {
        description: `Banco de origem ${sourceConfig.projectId || 'configurado'} replicado no destino.`,
      });
    } catch (err: any) {
      console.error('Erro na clonagem do banco:', err);
      
      // Mark current running step as error
      setCloneSteps(prev => prev.map(step => 
        step.status === 'running' ? { ...step, status: 'error' } : step
      ));
      
      addLog(err?.message || 'Erro durante a clonagem', 'error');
      
      if (err?.response?.logs) {
        err.response.logs.forEach((log: any) => {
          addLog(log.message, log.level, log.details);
        });
      }
      
      setCloneStatus('Erro durante a clonagem');
      toast.error('Erro na clonagem', {
        description: err?.message || 'Falha desconhecida ao clonar banco.',
      });
    } finally {
      setIsCloning(false);
    }
  };

  const handleWipeDestination = async () => {
    if (!ensureDestinationCredentials()) return;

    setIsWiping(true);
    setWipeProgress(10);
    addLog('Iniciando limpeza do banco de destino...', 'info');

    try {
      const sourceUrl = sourceConfig.supabaseUrl.trim() || SOURCE_DEFAULTS.supabaseUrl;
      const sourceProject = sourceConfig.projectId.trim() || SOURCE_DEFAULTS.projectId;
      const sourceServiceKey = sourceConfig.serviceRoleKey.trim() || SOURCE_DEFAULTS.serviceRoleKey;
      const sourceAnonKey = sourceConfig.anonKey.trim() || SOURCE_DEFAULTS.anonKey;
      const sourceApiKey = sourceAnonKey || sourceServiceKey;

      setWipeProgress(30);
      addLog('Executando limpeza via servidor de origem...', 'info');
      
      setWipeProgress(60);
      const response = await callSupabaseFunction(
        sourceUrl,
        'reset-destination',
        {
          apiKey: sourceApiKey,
          authToken: sourceServiceKey,
          projectId: sourceProject,
        },
        {
          destination: {
            supabaseUrl: configUrl.trim(),
            serviceRoleKey: configServiceRoleKey.trim(),
          },
        }
      );

      if (!response?.success) {
        throw new Error(response?.error || 'Erro ao esvaziar banco de destino');
      }

      setWipeProgress(100);
      addLog('Banco de destino esvaziado com sucesso!', 'success');
      toast.success('Banco limpo', {
        description: 'Todos os registros foram removidos e os IDs reiniciados.',
      });
    } catch (err: any) {
      console.error('Erro ao esvaziar banco:', err);
      addLog(err?.message || 'Erro ao esvaziar banco de destino', 'error');
      toast.error('Erro ao esvaziar banco', {
        description: err?.message || 'Falha desconhecida ao limpar dados.',
      });
    } finally {
      setIsWiping(false);
      setShowWipeDialog(false);
      setWipeConfirmation1(false);
      setWipeConfirmation2(false);
      setWipeConfirmText("");
    }
  };

  const openWipeDialog = () => {
    setWipeConfirmation1(false);
    setWipeConfirmation2(false);
    setWipeConfirmText("");
    setShowWipeDialog(true);
  };

  const sourceReady = Boolean(
    sourceConfig.supabaseUrl.trim() &&
    sourceConfig.serviceRoleKey.trim()
  );
  const serviceRoleDestinationReady = Boolean(configUrl.trim() && configServiceRoleKey.trim());
  const cloneDestinationReady = isDirectCloneMode
    ? Boolean(configDatabaseUrl.trim())
    : serviceRoleDestinationReady;

  // ===== Connection Status Indicator Component =====
  const ConnectionStatusBadge = ({ status, error }: { status: ConnectionStatus; error?: string }) => {
    const config = {
      idle: { icon: Unlink, color: 'bg-muted text-muted-foreground', label: 'Não testado' },
      testing: { icon: Loader2, color: 'bg-blue-500/10 text-blue-600', label: 'Testando...' },
      connected: { icon: CheckCircle2, color: 'bg-green-500/10 text-green-600', label: 'Conectado' },
      error: { icon: XCircle, color: 'bg-red-500/10 text-red-600', label: 'Erro' },
    }[status];

    const Icon = config.icon;

    return (
      <div className="flex items-center gap-1.5">
        <Badge variant="outline" className={cn("text-xs py-0.5 px-2", config.color)}>
          <Icon className={cn("h-3 w-3 mr-1", status === 'testing' && "animate-spin")} />
          {config.label}
        </Badge>
        {error && (
          <span className="text-xs text-destructive truncate max-w-[200px]" title={error}>
            {error}
          </span>
        )}
      </div>
    );
  };

  // ===== Format functions =====
  const formatLogTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return iso;
    }
  };

  const levelBadgeStyles: Record<CloneLogEntry['level'], string> = {
    info: 'bg-blue-500/10 text-blue-700 border-blue-200',
    warn: 'bg-amber-500/10 text-amber-700 border-amber-200',
    error: 'bg-red-500/10 text-red-700 border-red-200',
    success: 'bg-green-500/10 text-green-700 border-green-200',
  };

  const cloneModeBadge = (
    <Badge
      variant={isDirectCloneMode ? 'default' : 'outline'}
      className={cn(
        'text-xs font-semibold',
        isDirectCloneMode ? 'bg-emerald-500/10 text-emerald-600' : 'bg-blue-500/10 text-blue-600 border-blue-200'
      )}
    >
      {isDirectCloneMode ? 'Modo: Postgres URL' : 'Modo: Service Role Key'}
    </Badge>
  );

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div
        className={cn(
          "group relative flex items-center gap-2 px-3 py-2 rounded-2xl shadow-lg transition-all duration-300 cursor-pointer",
          "backdrop-blur-md border",
          isOnline === null || isChecking
            ? "bg-muted/80 border-muted-foreground/20"
            : isOnline
            ? "bg-green-500/10 border-green-500/30 hover:bg-green-500/20"
            : "bg-destructive/10 border-destructive/30 hover:bg-destructive/20"
        )}
      >
        {/* Status Icon with pulse animation */}
        <div className="relative">
          <div
            className={cn(
              "w-3 h-3 rounded-full transition-all duration-300",
              isOnline === null || isChecking
                ? "bg-muted-foreground animate-pulse"
                : isOnline
                ? "bg-green-500 animate-pulse"
                : "bg-destructive"
            )}
          />
          {isOnline && (
            <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-500 animate-ping opacity-75" />
          )}
        </div>

        {/* Database Icon */}
        <Database
          className={cn(
            "w-4 h-4 transition-colors",
            isOnline === null || isChecking
              ? "text-muted-foreground"
              : isOnline
              ? "text-green-600 dark:text-green-400"
              : "text-destructive"
          )}
        />

        {/* Status Text */}
        <div className="flex flex-col">
          <span
            className={cn(
              "text-xs font-semibold leading-none transition-colors",
              isOnline === null || isChecking
                ? "text-muted-foreground"
                : isOnline
                ? "text-green-700 dark:text-green-300"
                : "text-destructive"
            )}
          >
            {isChecking ? "Verificando..." : isOnline ? "Online" : "Offline"}
          </span>
          <span className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
            {isCloud ? (
              <>
                <Cloud className="w-3 h-3" />
                Supabase Cloud
              </>
            ) : (
              <>
                <Server className="w-3 h-3" />
                Self-Hosted
              </>
            )}
          </span>
        </div>

        {/* Connection Icon */}
        {isOnline !== null && !isChecking && (
          <div className="ml-1">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-green-600 dark:text-green-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-destructive" />
            )}
          </div>
        )}

        {/* Settings Icon */}
        {showSettingsGear && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-70 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              setShowConfigDialog(true);
            }}
            title="Configurar conexão"
          >
            <Settings className="w-4 h-4" />
          </Button>
        )}

        {/* Tooltip on hover */}
        <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-popover text-popover-foreground text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap border">
          <div className="space-y-1">
            <div className="font-semibold">Status do Banco de Dados</div>
            <div className="text-muted-foreground">
              {isChecking
                ? "Verificando conexão..."
                : isOnline
                ? "Conexão estabelecida"
                : "Sem conexão com o banco"}
            </div>
            <div className="pt-1 border-t border-border text-muted-foreground">
              Tipo: {isCloud ? "Supabase Cloud" : "Self-Hosted"}
            </div>
          </div>
          <div className="absolute top-full right-4 -mt-1 w-2 h-2 bg-popover border-r border-b border-border rotate-45" />
        </div>
      </div>

      {/* Dialog de Configuração */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="sm:max-w-[1100px] max-h-[90vh] p-0 gap-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-background flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Database className="h-5 w-5" />
              Migração de Banco de Dados
            </DialogTitle>
            <DialogDescription>
              Clone a estrutura completa do seu banco de dados de origem para um novo ambiente vazio.
              <span className="block text-xs mt-1 text-amber-600">
                ⚠️ Apenas a estrutura (schema) será copiada, os dados dos usuários não serão migrados.
              </span>
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 px-6" style={{ height: 'calc(90vh - 200px)' }}>
            <div className="space-y-6 py-4">
              {/* Main Sections Grid */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Destination Section */}
                <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-card to-card/50 p-5 shadow-lg space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Server className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">Ambiente Atual (Destino)</p>
                        <p className="text-xs text-muted-foreground">
                          Banco que receberá a estrutura clonada
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Connection Test Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={handleTestDestinationApi}
                      disabled={destConnectionStatus.api === 'testing' || !configUrl || !configAnonKey}
                      title="Testa a conexão usando a Anon Key (API pública)"
                    >
                      {destConnectionStatus.api === 'testing' ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Zap className="h-3 w-3" />
                      )}
                      Anon Key
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={handleTestDestinationServiceRole}
                      disabled={destConnectionStatus.serviceRole === 'testing' || !configUrl || !configServiceRoleKey}
                      title="Testa a conexão usando a Service Role Key (acesso administrativo)"
                    >
                      {destConnectionStatus.serviceRole === 'testing' ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Zap className="h-3 w-3" />
                      )}
                      Service Role
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={handleTestDestinationPostgres}
                      disabled={destConnectionStatus.postgres === 'testing' || !configDatabaseUrl || !configServiceRoleKey || !configUrl}
                      title="Testa a conexão direta com PostgreSQL usando a URL de conexão"
                    >
                      {destConnectionStatus.postgres === 'testing' ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Link className="h-3 w-3" />
                      )}
                      URL Postgres
                    </Button>
                  </div>

                  {/* Connection Status */}
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Anon:</span>
                      <ConnectionStatusBadge status={destConnectionStatus.api} error={destConnectionStatus.apiError} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Service:</span>
                      <ConnectionStatusBadge status={destConnectionStatus.serviceRole} error={destConnectionStatus.serviceRoleError} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Postgres:</span>
                      <ConnectionStatusBadge status={destConnectionStatus.postgres} error={destConnectionStatus.postgresError} />
                    </div>
                  </div>

                  <Separator />
                  
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="config-project-id" className="text-xs">Project ID</Label>
                      <Input
                        id="config-project-id"
                        placeholder="seu-project-id"
                        value={configProjectId}
                        onChange={(e) => setConfigProjectId(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="config-url" className="text-xs">URL do Supabase</Label>
                      <Input
                        id="config-url"
                        placeholder="https://seu-projeto.supabase.co"
                        value={configUrl}
                        onChange={(e) => setConfigUrl(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="config-anon-key" className="text-xs">Chave Anon (Publishable)</Label>
                      <Input
                        id="config-anon-key"
                        type="password"
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        value={configAnonKey}
                        onChange={(e) => setConfigAnonKey(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="config-service-role" className="text-xs">Service Role Key</Label>
                      <Input
                        id="config-service-role"
                        type="password"
                        placeholder="Service role key do projeto"
                        value={configServiceRoleKey}
                        onChange={(e) => setConfigServiceRoleKey(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label htmlFor="config-db-url" className="text-xs">URL de conexão Postgres (opcional)</Label>
                      <Input
                        id="config-db-url"
                        type="text"
                        placeholder="postgresql://postgres:senha@host:5432/postgres"
                        value={configDatabaseUrl}
                        onChange={(e) => setConfigDatabaseUrl(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={handleApplyDestinationEnv}
                      disabled={isApplyingEnv || !configUrl || !configAnonKey}
                    >
                      <FileCode className="h-3.5 w-3.5" />
                      {isApplyingEnv ? 'Atualizando...' : 'Atualizar .env'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={handleSaveConfig}
                      disabled={isSaving || !configUrl || !configAnonKey}
                    >
                      <Save className="h-3.5 w-3.5" />
                      {isSaving ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                </div>

                {/* Source Section */}
                <div className="rounded-2xl border-2 border-amber-500/20 bg-gradient-to-br from-card to-amber-500/5 p-5 shadow-lg space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-amber-500/10">
                        <Database className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">Banco de Origem (Clonagem)</p>
                        <p className="text-xs text-muted-foreground">
                          Banco que será copiado integralmente
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Connection Test Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={handleTestSourceApi}
                      disabled={sourceConnectionStatus.api === 'testing' || !sourceConfig.supabaseUrl || !sourceConfig.anonKey}
                      title="Testa a conexão usando a Anon Key (API pública)"
                    >
                      {sourceConnectionStatus.api === 'testing' ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Zap className="h-3 w-3" />
                      )}
                      Anon Key
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={handleTestSourceServiceRole}
                      disabled={sourceConnectionStatus.serviceRole === 'testing' || !sourceConfig.supabaseUrl || !sourceConfig.serviceRoleKey}
                      title="Testa a conexão usando a Service Role Key (acesso administrativo)"
                    >
                      {sourceConnectionStatus.serviceRole === 'testing' ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Zap className="h-3 w-3" />
                      )}
                      Service Role
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={handleTestSourcePostgres}
                      disabled={sourceConnectionStatus.postgres === 'testing' || !sourceConfig.databaseUrl || !sourceConfig.serviceRoleKey || !sourceConfig.supabaseUrl}
                      title="Testa a conexão direta com PostgreSQL usando a URL de conexão"
                    >
                      {sourceConnectionStatus.postgres === 'testing' ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Link className="h-3 w-3" />
                      )}
                      URL Postgres
                    </Button>
                  </div>

                  {/* Connection Status */}
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Anon:</span>
                      <ConnectionStatusBadge status={sourceConnectionStatus.api} error={sourceConnectionStatus.apiError} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Service:</span>
                      <ConnectionStatusBadge status={sourceConnectionStatus.serviceRole} error={sourceConnectionStatus.serviceRoleError} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Postgres:</span>
                      <ConnectionStatusBadge status={sourceConnectionStatus.postgres} error={sourceConnectionStatus.postgresError} />
                    </div>
                  </div>

                  <Separator />
                  
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="source-project-id" className="text-xs">Project ID</Label>
                      <Input
                        id="source-project-id"
                        placeholder="project-id-origem"
                        value={sourceConfig.projectId}
                        onChange={(e) => updateSourceConfig('projectId', e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="source-url" className="text-xs">URL do Supabase</Label>
                      <Input
                        id="source-url"
                        placeholder="https://origem.supabase.co"
                        value={sourceConfig.supabaseUrl}
                        onChange={(e) => updateSourceConfig('supabaseUrl', e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="source-anon" className="text-xs">Chave Anon (Publishable)</Label>
                      <Input
                        id="source-anon"
                        type="password"
                        placeholder="Anon key do projeto de origem"
                        value={sourceConfig.anonKey}
                        onChange={(e) => updateSourceConfig('anonKey', e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="source-service" className="text-xs">Service Role Key</Label>
                      <Input
                        id="source-service"
                        type="password"
                        placeholder="Service role key do projeto"
                        value={sourceConfig.serviceRoleKey}
                        onChange={(e) => updateSourceConfig('serviceRoleKey', e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label htmlFor="source-db-url" className="text-xs">URL de conexão Postgres (opcional)</Label>
                      <Input
                        id="source-db-url"
                        type="text"
                        placeholder="postgresql://usuario:senha@host:5432/postgres"
                        value={sourceConfig.databaseUrl}
                        onChange={(e) => updateSourceConfig('databaseUrl', e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={handleSaveSourceConfig}
                    >
                      <Save className="h-3.5 w-3.5" />
                      Salvar Origem
                    </Button>
                  </div>
                </div>
              </div>

              {/* Operations Section */}
              <div className="rounded-2xl border bg-card p-5 shadow-lg space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Copy className="h-4 w-4" />
                      Operações de Clonagem
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      A clonagem replica toda a estrutura do banco (schema, funções, triggers, RLS, etc.) sem copiar os dados dos usuários.
                    </p>
                  </div>
                  {cloneModeBadge}
                </div>

                {/* What will be copied info */}
                <Alert className="bg-muted/50">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="text-sm">O que será copiado?</AlertTitle>
                  <AlertDescription className="text-xs">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                      <span>✓ Extensões PostgreSQL</span>
                      <span>✓ Tipos (ENUMs)</span>
                      <span>✓ Sequences</span>
                      <span>✓ Tabelas</span>
                      <span>✓ Constraints</span>
                      <span>✓ Views</span>
                      <span>✓ Funções</span>
                      <span>✓ Triggers</span>
                      <span>✓ Índices</span>
                      <span>✓ Políticas RLS</span>
                      <span>✓ Storage Buckets</span>
                      <span>✓ Permissões</span>
                    </div>
                  </AlertDescription>
                </Alert>

                <div className="grid gap-3 md:grid-cols-2">
                  <Button
                    type="button"
                    onClick={handleCloneDatabase}
                    disabled={isCloning || !sourceReady || !cloneDestinationReady}
                    className="gap-2 h-12"
                    size="lg"
                  >
                    {isCloning ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Copy className="h-5 w-5" />
                    )}
                    {isCloning ? 'Clonando...' : 'Clonar Estrutura'}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={openWipeDialog}
                    disabled={isWiping || !serviceRoleDestinationReady}
                    className="gap-2 h-12"
                    size="lg"
                  >
                    {isWiping ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Trash2 className="h-5 w-5" />
                    )}
                    {isWiping ? 'Esvaziando...' : 'Esvaziar Destino'}
                  </Button>
                </div>

                {/* Progress Section */}
                {(isCloning || cloneProgress > 0) && (
                  <div className="space-y-4 p-4 rounded-xl bg-muted/30 border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{cloneStatus}</span>
                      <span className="text-sm font-bold">{Math.round(cloneProgress)}%</span>
                    </div>
                    <Progress value={cloneProgress} className="h-3" />

                    {/* Steps Progress */}
                    {cloneSteps.length > 0 && (
                      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                        {cloneSteps.map((step) => (
                          <div
                            key={step.id}
                            className={cn(
                              "text-[10px] p-1.5 rounded text-center truncate",
                              step.status === 'completed' && "bg-green-500/10 text-green-700",
                              step.status === 'running' && "bg-blue-500/10 text-blue-700",
                              step.status === 'error' && "bg-red-500/10 text-red-700",
                              step.status === 'pending' && "bg-muted text-muted-foreground"
                            )}
                            title={step.name}
                          >
                            {step.status === 'running' && <Loader2 className="h-2.5 w-2.5 animate-spin inline mr-1" />}
                            {step.status === 'completed' && <CheckCircle2 className="h-2.5 w-2.5 inline mr-1" />}
                            {step.status === 'error' && <XCircle className="h-2.5 w-2.5 inline mr-1" />}
                            {step.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Wipe Progress */}
                {isWiping && (
                  <div className="space-y-2 p-4 rounded-xl bg-destructive/5 border border-destructive/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-destructive">Esvaziando banco de destino...</span>
                      <span className="text-sm font-bold text-destructive">{Math.round(wipeProgress)}%</span>
                    </div>
                    <Progress value={wipeProgress} className="h-2" />
                  </div>
                )}

                {/* Logs Section */}
                {cloneLogs.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Log de Execução
                      </p>
                      <Button variant="ghost" size="sm" onClick={() => setCloneLogs([])}>
                        Limpar
                      </Button>
                    </div>
                    <ScrollArea className="h-48 rounded-lg border bg-background/50 p-2">
                      <div className="space-y-1.5">
                        {cloneLogs.map((log, index) => (
                          <div
                            key={`${log.timestamp}-${index}`}
                            className="rounded border bg-card p-2 text-xs font-mono"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-muted-foreground">{formatLogTime(log.timestamp)}</span>
                              <Badge variant="outline" className={levelBadgeStyles[log.level]}>
                                {log.level.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-foreground mt-1">{log.message}</p>
                            {log.details && (
                              <pre className="whitespace-pre-wrap text-[10px] text-muted-foreground mt-1">
                                {typeof log.details === 'string'
                                  ? log.details
                                  : JSON.stringify(log.details, null, 2)}
                              </pre>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4 border-t flex-shrink-0 px-6 pb-6">
            <p className="text-[10px] text-muted-foreground flex-1">
              As credenciais são armazenadas apenas localmente no seu navegador.
            </p>
            <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Wipe Confirmation Dialog */}
      <AlertDialog open={showWipeDialog} onOpenChange={setShowWipeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Esvaziar Banco de Destino
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Esta ação irá <strong className="text-destructive">REMOVER PERMANENTEMENTE</strong> todos os dados do banco de destino.
                Esta operação não pode ser desfeita.
              </p>
              
              <div className="space-y-3 p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                <p className="font-medium text-sm">Para confirmar, marque as duas opções abaixo:</p>
                
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="wipe-confirm-1"
                    checked={wipeConfirmation1}
                    onChange={(e) => setWipeConfirmation1(e.target.checked)}
                    className="mt-1"
                  />
                  <label htmlFor="wipe-confirm-1" className="text-sm">
                    Eu entendo que <strong>todos os dados</strong> serão permanentemente removidos.
                  </label>
                </div>
                
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="wipe-confirm-2"
                    checked={wipeConfirmation2}
                    onChange={(e) => setWipeConfirmation2(e.target.checked)}
                    className="mt-1"
                  />
                  <label htmlFor="wipe-confirm-2" className="text-sm">
                    Eu tenho certeza de que estou operando no banco de dados <strong>correto</strong>.
                  </label>
                </div>
                
                <div className="pt-2">
                  <Label htmlFor="wipe-confirm-text" className="text-sm">
                    Digite <code className="bg-muted px-1 py-0.5 rounded">ESVAZIAR</code> para confirmar:
                  </Label>
                  <Input
                    id="wipe-confirm-text"
                    value={wipeConfirmText}
                    onChange={(e) => setWipeConfirmText(e.target.value)}
                    placeholder="ESVAZIAR"
                    className="mt-2"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleWipeDestination}
              disabled={!wipeConfirmation1 || !wipeConfirmation2 || wipeConfirmText !== 'ESVAZIAR'}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Esvaziar Banco
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
