import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

type SupabaseConnectionConfig = {
  projectId: string;
  supabaseUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  databaseUrl: string;
};

type DestinationConnectionConfig = {
  projectId: string;
  supabaseUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  databaseUrl: string;
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
  level: 'info' | 'warn' | 'error';
  message: string;
  details?: Record<string, unknown> | string;
};

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
  const [configUrl, setConfigUrl] = useState("");
  const [configAnonKey, setConfigAnonKey] = useState("");
  const [configProjectId, setConfigProjectId] = useState("");
  const [configServiceRoleKey, setConfigServiceRoleKey] = useState("");
  const [configDatabaseUrl, setConfigDatabaseUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [isApplyingEnv, setIsApplyingEnv] = useState(false);
  const [cloneStatus, setCloneStatus] = useState<string | null>(null);
  const [cloneProgress, setCloneProgress] = useState(0);
  const [cloneLogs, setCloneLogs] = useState<CloneLogEntry[]>([]);
  const [isWiping, setIsWiping] = useState(false);
  const [wipeStatus, setWipeStatus] = useState<string | null>(null);
  const [wipeProgress, setWipeProgress] = useState(0);
  const [sourceConfig, setSourceConfig] = useState<SupabaseConnectionConfig>(() => getDefaultSourceConfig());

  const isDirectCloneMode = Boolean(configDatabaseUrl.trim());
  const isCloud = import.meta.env.VITE_SUPABASE_URL?.includes('supabase.co');

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

  const getSanitizedDestinationConfig = (): DestinationConnectionConfig => ({
    projectId: configProjectId.trim(),
    supabaseUrl: configUrl.trim(),
    anonKey: configAnonKey.trim(),
    serviceRoleKey: configServiceRoleKey.trim(),
    databaseUrl: configDatabaseUrl.trim(),
  });

  const loadCachedDestinationConfig = (): DestinationConnectionConfig | null => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(DESTINATION_CONFIG_CACHE_KEY);
      if (stored) {
        return JSON.parse(stored) as DestinationConnectionConfig;
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

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30s
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

  // Carregar configuração atual quando abrir o dialog
  useEffect(() => {
    if (showConfigDialog) {
      // Verificar se há configuração dinâmica
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
          // Usar valores do .env
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
        // Fallback para .env
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
    } else {
      setCloneStatus(null);
      setCloneProgress(0);
      setWipeStatus(null);
      setWipeProgress(0);
    }
  }, [showConfigDialog]);

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

  const handleTestConnection = async () => {
    if (!configUrl || !configAnonKey) {
      toast.error('Preencha URL e Chave Anon');
      return;
    }

    setIsTesting(true);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const testClient = createClient(configUrl.trim(), configAnonKey.trim(), {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { error } = await testClient.from('perfis').select('id', { count: 'exact', head: true });
      
      if (error) {
        toast.error('Erro na conexão', { description: error.message });
      } else {
        toast.success('Conexão testada com sucesso!');
      }
    } catch (err: any) {
      toast.error('Erro ao testar conexão', { description: err.message });
    } finally {
      setIsTesting(false);
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

  const createLocalLog = (message: string, level: CloneLogEntry['level'] = 'info'): CloneLogEntry => ({
    timestamp: new Date().toISOString(),
    level,
    message,
  });

  const applyServerLogs = (logs?: CloneLogEntry[] | null) => {
    if (Array.isArray(logs) && logs.length) {
      setCloneLogs(logs);
    }
  };

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
  };

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
    setCloneProgress(5);
    setCloneStatus('Invocando função de clonagem no servidor de origem...');
    setCloneLogs([createLocalLog('Iniciando processo de clonagem...')]);

    try {
      setCloneProgress(35);
      setCloneStatus('Processando exportação e importação no backend...');

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

      if (!response?.success) {
        throw new Error(response?.error || 'Erro ao executar clonagem');
      }

      applyServerLogs(response?.logs);
      setCloneProgress(100);
      setCloneStatus(
        `Clonagem concluída: ${response.statements?.successful || 0}/${
          response.statements?.total || 0
        } statements aplicados`
      );
      toast.success('Clonagem finalizada', {
        description: `Banco de origem ${sourceConfig.projectId || 'configurado'} replicado no destino.`,
      });
    } catch (err: any) {
      console.error('Erro na clonagem do banco:', err);
      if (err?.response?.logs) {
        applyServerLogs(err.response.logs);
      } else {
        setCloneLogs((prev) => [...prev, createLocalLog(err?.message || 'Erro durante a clonagem', 'error')]);
      }
      setCloneProgress(0);
      setCloneStatus(err?.message || 'Erro durante a clonagem');
      toast.error('Erro na clonagem', {
        description: err?.message || 'Falha desconhecida ao clonar banco.',
      });
    } finally {
      setIsCloning(false);
    }
  };

  const handleWipeDestination = async () => {
    if (!ensureDestinationCredentials()) return;

    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        'Esta ação irá remover TODOS os dados do banco de destino. Deseja continuar?'
      );
      if (!confirmed) return;
    }

    setIsWiping(true);
    setWipeProgress(10);
    setWipeStatus('Iniciando limpeza do banco de destino...');

    try {
      const sourceUrl = sourceConfig.supabaseUrl.trim() || SOURCE_DEFAULTS.supabaseUrl;
      const sourceProject = sourceConfig.projectId.trim() || SOURCE_DEFAULTS.projectId;
      const sourceServiceKey = sourceConfig.serviceRoleKey.trim() || SOURCE_DEFAULTS.serviceRoleKey;
      const sourceAnonKey = sourceConfig.anonKey.trim() || SOURCE_DEFAULTS.anonKey;
      const sourceApiKey = sourceAnonKey || sourceServiceKey;

      setWipeProgress(60);
      setWipeStatus('Executando limpeza via servidor de origem...');
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
      setWipeStatus('Banco de destino esvaziado com sucesso!');
      toast.success('Banco limpo', {
        description: 'Todos os registros foram removidos e os IDs reiniciados.',
      });
    } catch (err: any) {
      console.error('Erro ao esvaziar banco:', err);
      setWipeProgress(0);
      setWipeStatus(err?.message || 'Erro ao esvaziar banco de destino');
      toast.error('Erro ao esvaziar banco', {
        description: err?.message || 'Falha desconhecida ao limpar dados.',
      });
    } finally {
      setIsWiping(false);
    }
  };

  const sourceReady = Boolean(
    sourceConfig.supabaseUrl.trim() &&
      sourceConfig.serviceRoleKey.trim()
  );
  const serviceRoleDestinationReady = Boolean(configUrl.trim() && configServiceRoleKey.trim());
  const cloneDestinationReady = isDirectCloneMode
    ? Boolean(configDatabaseUrl.trim())
    : serviceRoleDestinationReady;

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
          {/* Arrow */}
          <div className="absolute top-full right-4 -mt-1 w-2 h-2 bg-popover border-r border-b border-border rotate-45" />
        </div>
      </div>

      {/* Dialog de Configuração */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="sm:max-w-[960px]">
          <DialogHeader>
            <DialogTitle>Configurar Conexão Supabase</DialogTitle>
            <DialogDescription>
              Altere os dados de conexão do banco de dados. As alterações serão aplicadas imediatamente.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border bg-card/40 p-4 shadow-inner space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Ambiente Atual (Destino)</p>
                    <p className="text-xs text-muted-foreground">
                      Dados usados pelo sistema e que receberão a clonagem.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={handleApplyDestinationEnv}
                    disabled={isApplyingEnv || !configUrl || !configAnonKey}
                  >
                    <FileCode className="h-4 w-4" />
                    {isApplyingEnv ? 'Atualizando...' : 'Atualizar .env'}
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="config-project-id">Project ID</Label>
                    <Input
                      id="config-project-id"
                      placeholder="seu-project-id"
                      value={configProjectId}
                      onChange={(e) => setConfigProjectId(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="config-url">URL do Supabase</Label>
                    <Input
                      id="config-url"
                      placeholder="https://seu-projeto.supabase.co"
                      value={configUrl}
                      onChange={(e) => setConfigUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="config-anon-key">Chave Anon (Publishable Key)</Label>
                    <Input
                      id="config-anon-key"
                      type="password"
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      value={configAnonKey}
                      onChange={(e) => setConfigAnonKey(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="config-service-role">Service Role Key (Destino)</Label>
                    <Input
                      id="config-service-role"
                      type="password"
                      placeholder="Service role key do projeto destino"
                      value={configServiceRoleKey}
                      onChange={(e) => setConfigServiceRoleKey(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label htmlFor="config-db-url">URL de conexão Postgres (opcional)</Label>
                    <Input
                      id="config-db-url"
                      type="text"
                      placeholder="postgresql://postgres:senha@192.168.0.10:5432/postgres"
                      value={configDatabaseUrl}
                      onChange={(e) => setConfigDatabaseUrl(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Usada para clonagem direta via conexão administrativa. Mantida apenas localmente neste navegador.
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  A Service Role do destino é armazenada localmente para operações administrativas.
                  Use o botão acima para aplicar essas credenciais ao ambiente (.env dinâmico).
                </p>
              </div>

              <div className="rounded-2xl border bg-card/40 p-4 shadow-inner space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Banco de Origem (Clonagem)</p>
                    <p className="text-xs text-muted-foreground">
                      Informe o projeto que será copiado integralmente. Os dados ficam apenas neste navegador.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2" onClick={handleSaveSourceConfig}>
                    <Save className="h-4 w-4" />
                    Salvar origem
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="source-project-id">Project ID</Label>
                    <Input
                      id="source-project-id"
                      placeholder="odlfkrnrkvruvqxseusr"
                      value={sourceConfig.projectId}
                      onChange={(e) => updateSourceConfig('projectId', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="source-url">URL</Label>
                    <Input
                      id="source-url"
                      placeholder="https://seu-origem.supabase.co"
                      value={sourceConfig.supabaseUrl}
                      onChange={(e) => updateSourceConfig('supabaseUrl', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="source-anon">Chave Anon (Origem)</Label>
                    <Input
                      id="source-anon"
                      type="password"
                      placeholder="Anon key do projeto de origem"
                      value={sourceConfig.anonKey}
                      onChange={(e) => updateSourceConfig('anonKey', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="source-service">Service Role Key (Origem)</Label>
                    <Input
                      id="source-service"
                      type="password"
                      placeholder="Service role key do projeto de origem"
                      value={sourceConfig.serviceRoleKey}
                      onChange={(e) => updateSourceConfig('serviceRoleKey', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label htmlFor="source-db-url">URL de conexão Postgres (opcional)</Label>
                    <Input
                      id="source-db-url"
                      type="text"
                      placeholder="postgresql://usuario:senha@host:5432/postgres"
                      value={sourceConfig.databaseUrl}
                      onChange={(e) => updateSourceConfig('databaseUrl', e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Mantida localmente para operações diretas no banco de origem.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-card/40 p-4 shadow-inner space-y-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-semibold text-foreground">Clonagem e Limpeza</p>
                  <p className="text-xs text-muted-foreground">
                    Execute operações críticas com feedback em tempo real.
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    A clonagem replica apenas o schema (sem copiar os dados).
                  </p>
                </div>
                {cloneModeBadge}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Button
                  type="button"
                  onClick={handleCloneDatabase}
                  disabled={isCloning || !sourceReady || !cloneDestinationReady}
                  className="gap-2"
                  title={
                    sourceReady && cloneDestinationReady
                      ? undefined
                      : !sourceReady
                      ? 'Informe URL e Service Role do banco de origem.'
                      : isDirectCloneMode
                      ? 'Informe a URL de conexão Postgres do destino.'
                      : 'Informe URL e Service Role do banco de destino.'
                  }
                >
                  {isCloning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {isCloning ? 'Clonando...' : 'Clonar banco (Origem → Destino)'}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleWipeDestination}
                  disabled={isWiping || !serviceRoleDestinationReady}
                  className="gap-2"
                  title={
                    serviceRoleDestinationReady
                      ? undefined
                      : 'Informe URL e Service Role do banco de destino para limpar via API.'
                  }
                >
                  {isWiping ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  {isWiping ? 'Esvaziando...' : 'Esvaziar banco de destino'}
                </Button>
              </div>

              {(cloneStatus || wipeStatus) && (
                <Alert>
                  <AlertTitle>Status das operações</AlertTitle>
                  <AlertDescription className="space-y-2">
                    {cloneStatus && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm font-medium">
                          <p>Clonagem: {cloneStatus}</p>
                          <span className="text-muted-foreground">
                            {Math.round(cloneProgress)}%
                          </span>
                        </div>
                        <Progress value={cloneProgress} />
                      </div>
                    )}
                    {wipeStatus && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm font-medium">
                          <p>Limpeza: {wipeStatus}</p>
                          <span className="text-muted-foreground">
                            {Math.round(wipeProgress)}%
                          </span>
                        </div>
                        <Progress value={wipeProgress} />
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {cloneLogs.length > 0 && (
                <div className="rounded-lg border border-dashed bg-card/60 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">Logs de debug da clonagem</p>
                    <Button variant="ghost" size="sm" onClick={() => setCloneLogs([])}>
                      Limpar
                    </Button>
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-2 pr-2">
                    {cloneLogs.map((log, index) => (
                      <div
                        key={`${log.timestamp}-${index}`}
                        className="rounded-md border bg-background/80 p-2 text-xs font-mono space-y-1"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-muted-foreground">{formatLogTime(log.timestamp)}</span>
                          <Badge variant="outline" className={levelBadgeStyles[log.level]}>
                            {log.level.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-foreground">{log.message}</p>
                        {log.details && (
                          <pre className="whitespace-pre-wrap text-[10px] text-muted-foreground">
                            {typeof log.details === 'string'
                              ? log.details
                              : JSON.stringify(log.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[11px] text-muted-foreground">
                As chaves são usadas apenas para chamar as Edge Functions necessárias e não são enviadas ao backend.
              </p>
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-2 pt-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTesting || !configUrl || !configAnonKey}
            >
              {isTesting ? 'Testando...' : 'Testar Conexão'}
            </Button>
            <Button
              onClick={handleSaveConfig}
              disabled={isSaving || !configUrl || !configAnonKey}
            >
              {isSaving ? 'Salvando...' : 'Salvar Configuração'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
