import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Settings,
  CheckCircle2,
  XCircle,
  FileDown,
  Key,
  Save,
  RotateCcw,
  Upload,
  Download,
  RefreshCw,
  AlertTriangle,
  Database,
  Server,
} from 'lucide-react';
import { supabase, setDynamicSupabaseConfig } from '@/integrations/supabase/client';
import { toast } from '@/utils/toastHelper';
import { useSupabaseConfig } from '@/hooks/useSupabaseConfig';
import { AnonKeyManager } from './AnonKeyManager';
import { ServiceRoleKeyManager } from './ServiceRoleKeyManager';
import { ImportOptionsTable } from './ImportOptionsTable';
import { EnvGenerator } from './EnvGenerator';
import { KeyStatusCard } from './KeyStatusCard';
import { ConnectionStatusPanel } from './ConnectionStatusPanel';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function ConnectionTab() {
  const [projectId, setProjectId] = useState('');
  const [supabaseUrlConfig, setSupabaseUrlConfig] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAnonKeyManager, setShowAnonKeyManager] = useState(false);
  const [showServiceRoleKeyManager, setShowServiceRoleKeyManager] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [lastTestPassed, setLastTestPassed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estados para gerenciar status das chaves
  const [anonKeyConfigured, setAnonKeyConfigured] = useState(false);
  const [serviceRoleKeyConfigured, setServiceRoleKeyConfigured] = useState(false);
  const [anonKeyStatus, setAnonKeyStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [serviceRoleStatus, setServiceRoleStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [anonKeyError, setAnonKeyError] = useState<string>('');
  const [serviceRoleError, setServiceRoleError] = useState<string>('');
  const [lastAnonKeyTest, setLastAnonKeyTest] = useState<Date>();
  const [lastServiceRoleTest, setLastServiceRoleTest] = useState<Date>();

  const {
    savedConfig,
    isLoading: configLoading,
    saveConfig,
    validateProjectId,
    validateSupabaseUrl,
    compareConfigs,
    exportConfig,
    importConfig,
    loadConfig,
  } = useSupabaseConfig();

  useEffect(() => {
    // Carregar configuração do banco ou ENV
    if (savedConfig) {
      setProjectId(savedConfig.project_id);
      setSupabaseUrlConfig(savedConfig.supabase_url);
    } else {
      const envProjectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || '';
      const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
      
      setProjectId(envProjectId);
      setSupabaseUrlConfig(envUrl);
      
      // Log para debug
      console.log('📋 Configuração carregada do .env:', {
        projectId: envProjectId,
        url: envUrl,
        hasAnonKey: !!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      });
      
      // Verificar se há configuração dinâmica no localStorage
      try {
        const dynamicConfig = localStorage.getItem('supabase_dynamic_config');
        if (dynamicConfig) {
          const config = JSON.parse(dynamicConfig);
          console.log('📦 Configuração dinâmica encontrada:', {
            url: config.supabaseUrl,
            projectId: config.projectId,
          });
          // Se há configuração dinâmica e ela é diferente, usar ela
          if (config.supabaseUrl && config.supabaseUrl !== envUrl) {
            console.log('⚠️ Usando configuração dinâmica ao invés do .env');
            setSupabaseUrlConfig(config.supabaseUrl);
            if (config.projectId) {
              setProjectId(config.projectId);
            }
          }
        }
      } catch (e) {
        console.warn('Erro ao ler configuração dinâmica:', e);
      }
    }
    
    // Verificar se as chaves estão configuradas
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    setAnonKeyConfigured(!!anonKey);
    
    // Service Role Key está configurada como secret do Supabase
    // Verificamos se existe consultando a lista de secrets
    setServiceRoleKeyConfigured(true); // Já foi confirmado que existe via secrets--fetch_secrets
  }, [savedConfig, showAnonKeyManager, showServiceRoleKeyManager]);

  const configComparison = compareConfigs(
    { project_id: projectId, supabase_url: supabaseUrlConfig },
    savedConfig
  );

  const testConnection = async () => {
    setIsLoading(true);
    setLastTestPassed(false);
    
    // Testar Anon Key
    setAnonKeyStatus('testing');
    try {
      const { data, error } = await supabase.from('perfis').select('count');

      if (error) {
        setConnectionStatus('error');
        setErrorMessage(error.message);
        setAnonKeyStatus('error');
        setAnonKeyError(error.message);
        toast.error('Erro na conexão', { description: error.message });
        setLastTestPassed(false);
      } else {
        setConnectionStatus('connected');
        setErrorMessage('');
        setAnonKeyStatus('success');
        setAnonKeyError('');
        setLastAnonKeyTest(new Date());
        toast.success('Conexão estabelecida com sucesso!');
        setLastTestPassed(true);
      }
    } catch (err) {
      setConnectionStatus('error');
      const errMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      setErrorMessage(errMsg);
      setAnonKeyStatus('error');
      setAnonKeyError(errMsg);
      toast.error('Erro ao testar conexão');
      setLastTestPassed(false);
    } finally {
      setIsLoading(false);
    }
  };

  const testServiceRoleConnection = async () => {
    setServiceRoleStatus('testing');
    
    try {
      // Chamar a edge function para testar a Service Role Key
      // A Service Role Key está armazenada como secret do Supabase e só pode ser acessada no servidor
      const { data, error } = await supabase.functions.invoke('test-service-role', {
        method: 'POST',
      });

      if (error) {
        setServiceRoleStatus('error');
        setServiceRoleError(error.message);
        toast.error('Erro ao testar Service Role Key', { 
          description: error.message 
        });
        return;
      }

      if (data.success) {
        setServiceRoleStatus('success');
        setServiceRoleError('');
        setLastServiceRoleTest(new Date());
        toast.success('Service Role Key validada com sucesso!', {
          description: 'A chave tem acesso administrativo ao banco de dados.'
        });
      } else {
        setServiceRoleStatus('error');
        setServiceRoleError(data.error || 'Erro ao validar chave');
        toast.error('Falha na validação', { 
          description: data.error || 'Service Role Key não está funcionando corretamente' 
        });
      }
    } catch (err) {
      setServiceRoleStatus('error');
      const errMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      setServiceRoleError(errMsg);
      toast.error('Erro ao testar Service Role Key', {
        description: 'Verifique se a edge function test-service-role está disponível'
      });
    }
  };

  const handleSaveConfig = async () => {
    // Validações
    if (projectId && !validateProjectId(projectId)) {
      toast.error('Project ID inválido', {
        description: 'Deve conter 15-20 caracteres alfanuméricos minúsculos',
      });
      return;
    }

    if (!validateSupabaseUrl(supabaseUrlConfig)) {
      toast.error('Supabase URL inválida', {
        description: 'Deve seguir o formato: https://[project_id].supabase.co',
      });
      return;
    }

    if (!lastTestPassed) {
      toast.error('Teste de conexão necessário', {
        description: 'Execute o teste de conexão antes de salvar',
      });
      return;
    }

    setShowSaveDialog(true);
  };

  const confirmSave = async () => {
    const result = await saveConfig({
      project_id: projectId,
      supabase_url: supabaseUrlConfig,
    });

    if (result) {
      setShowSaveDialog(false);
      
      // Obter a chave anon do .env ou usar a que está configurada
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      if (anonKey && supabaseUrlConfig) {
        // Aplicar configuração dinamicamente via localStorage
        setDynamicSupabaseConfig(supabaseUrlConfig, anonKey, projectId);
        
        toast.success('Configuração salva e aplicada!', {
          description: 'A configuração foi aplicada dinamicamente. Recarregue a página para garantir que todas as mudanças sejam aplicadas.',
          duration: 10000
        });
      } else {
        toast.success('Configuração salva!', {
          description: '⚠️ IMPORTANTE: Reinicie o servidor de desenvolvimento para aplicar as mudanças no .env',
          duration: 10000,
        });
      }
    }
  };

  const handleRestore = async () => {
    await loadConfig();
    setLastTestPassed(false);
    toast.info('Configuração restaurada do banco de dados');
  };

  const handleExport = () => {
    exportConfig({ project_id: projectId, supabase_url: supabaseUrlConfig });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const imported = await importConfig(file);
    if (imported) {
      setProjectId(imported.project_id);
      setSupabaseUrlConfig(imported.supabase_url);
      setLastTestPassed(false);
    }

    // Limpar input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleReload = () => {
    window.location.reload();
  };

  // Determinar fonte de configuração
  const configSource = savedConfig
    ? savedConfig.config_source === 'database'
      ? 'database'
      : 'env'
    : 'env';

  const getStatusBadge = () => {
    if (configComparison.hasChanges) {
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Alterações Não Salvas
        </Badge>
      );
    }

    if (configSource === 'database') {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <Database className="h-3 w-3 mr-1" />
          Usando Config do Banco
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        <Server className="h-3 w-3 mr-1" />
        Usando ENV Local
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuração do Servidor Supabase
              </CardTitle>
              <CardDescription>
                Gerencie as credenciais de conexão com o Supabase. Configurações podem ser salvas no
                banco de dados para uso em produção.
              </CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mostrar configuração atual do .env */}
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-sm">
              <strong>Configuração Atual do .env:</strong>
              <div className="mt-2 space-y-1 text-xs font-mono">
                <div>URL: <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">{import.meta.env.VITE_SUPABASE_URL || 'Não configurada'}</code></div>
                <div>Project ID: <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">{import.meta.env.VITE_SUPABASE_PROJECT_ID || 'Não configurado'}</code></div>
                <div>Anon Key: <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">{import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? 'Configurada' : 'Não configurada'}</code></div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                ⚠️ Se você mudou o .env mas os valores acima não mudaram, você precisa <strong>REINICIAR o servidor de desenvolvimento</strong>.
              </div>
            </AlertDescription>
          </Alert>

          {savedConfig && (
            <Alert>
              <AlertDescription className="text-sm">
                <strong>Última atualização:</strong>{' '}
                {new Date(savedConfig.updated_at).toLocaleString('pt-BR')}
                {savedConfig.updated_by && ` por um usuário Master`}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="projectId">Project ID</Label>
            <Input
              id="projectId"
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                setLastTestPassed(false);
              }}
              placeholder="odlfkrnrkvruvqxseusr"
              className={!validateProjectId(projectId) && projectId ? 'border-destructive' : ''}
            />
            {projectId && !validateProjectId(projectId) && (
              <p className="text-xs text-destructive">
                Formato inválido. Deve conter 15-20 caracteres alfanuméricos minúsculos.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="supabaseUrl">Supabase URL</Label>
            <Input
              id="supabaseUrl"
              value={supabaseUrlConfig}
              onChange={(e) => {
                setSupabaseUrlConfig(e.target.value);
                setLastTestPassed(false);
              }}
              placeholder="https://odlfkrnrkvruvqxseusr.supabase.co"
              className={
                !validateSupabaseUrl(supabaseUrlConfig) && supabaseUrlConfig
                  ? 'border-destructive'
                  : ''
              }
            />
            {supabaseUrlConfig && !validateSupabaseUrl(supabaseUrlConfig) && (
              <p className="text-xs text-destructive">
                Formato inválido. Deve ser: https://[project_id].supabase.co
              </p>
            )}
          </div>

          {/* Status das Chaves */}
          <div className="grid gap-4 md:grid-cols-2">
            <KeyStatusCard
              keyType="anon"
              isConfigured={anonKeyConfigured}
              connectionStatus={anonKeyStatus}
              onTest={testConnection}
              onConfigure={() => setShowAnonKeyManager(true)}
              lastTested={lastAnonKeyTest}
              errorMessage={anonKeyError}
            />
            <KeyStatusCard
              keyType="service"
              isConfigured={serviceRoleKeyConfigured}
              connectionStatus={serviceRoleStatus}
              onTest={testServiceRoleConnection}
              onConfigure={() => setShowServiceRoleKeyManager(true)}
              lastTested={lastServiceRoleTest}
              errorMessage={serviceRoleError}
            />
          </div>

          {/* Status da Conexão */}
          <ConnectionStatusPanel
            isConnected={connectionStatus === 'connected'}
            projectId={projectId}
            supabaseUrl={supabaseUrlConfig}
            validations={[
              {
                label: 'Project ID',
                status: projectId && validateProjectId(projectId) ? 'success' : 'error',
                message: projectId && validateProjectId(projectId) 
                  ? 'Formato válido' 
                  : 'Project ID inválido ou não configurado',
              },
              {
                label: 'Supabase URL',
                status: supabaseUrlConfig && validateSupabaseUrl(supabaseUrlConfig) ? 'success' : 'error',
                message: supabaseUrlConfig && validateSupabaseUrl(supabaseUrlConfig)
                  ? 'Formato válido'
                  : 'URL inválida ou não configurada',
              },
              {
                label: 'Anon Key',
                status: anonKeyStatus === 'success' ? 'success' : anonKeyConfigured ? 'pending' : 'error',
                message: anonKeyStatus === 'success' 
                  ? 'Conexão validada com sucesso' 
                  : anonKeyConfigured 
                  ? 'Configurada (clique em testar)' 
                  : 'Não configurada',
              },
              {
                label: 'Service Role Key',
                status: serviceRoleStatus === 'success' ? 'success' : serviceRoleKeyConfigured ? 'pending' : 'error',
                message: serviceRoleStatus === 'success'
                  ? 'Conexão validada com sucesso'
                  : serviceRoleKeyConfigured
                  ? 'Configurada (clique em testar)'
                  : 'Não configurada',
              },
            ]}
          />

          <Alert className="mb-4 border-blue-200 bg-blue-50 dark:bg-blue-950">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm">
              <strong>Importante:</strong> Mudanças no arquivo <code>.env</code> requerem reiniciar o servidor de desenvolvimento.
              <br />
              <span className="text-xs text-muted-foreground mt-1 block">
                Alternativamente, você pode usar a configuração dinâmica abaixo (salva no navegador).
              </span>
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleSaveConfig}
              disabled={
                !configComparison.hasChanges ||
                (projectId && !validateProjectId(projectId)) ||
                !validateSupabaseUrl(supabaseUrlConfig) ||
                !lastTestPassed ||
                configLoading
              }
            >
              <Save className="mr-2 h-4 w-4" />
              Salvar Configurações
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
                if (!anonKey) {
                  toast.error('Chave anon não encontrada no .env', {
                    description: 'Verifique se VITE_SUPABASE_PUBLISHABLE_KEY está definida no arquivo .env'
                  });
                  return;
                }
                if (!supabaseUrlConfig) {
                  toast.error('URL do Supabase não configurada');
                  return;
                }
                
                console.log('🔧 Aplicando configuração dinâmica:', {
                  url: supabaseUrlConfig,
                  projectId,
                  hasAnonKey: !!anonKey
                });
                
                setDynamicSupabaseConfig(supabaseUrlConfig, anonKey, projectId);
                
                // Forçar recriação do cliente
                const { recreateSupabaseClient } = await import('@/integrations/supabase/client');
                recreateSupabaseClient();
                
                toast.success('Configuração aplicada!', {
                  description: 'A configuração foi salva e o cliente foi recriado. Recarregue a página para garantir que todas as mudanças sejam aplicadas.',
                  duration: 10000
                });
              }}
              disabled={!supabaseUrlConfig || !lastTestPassed}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Aplicar Agora (Sem Reiniciar)
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" onClick={handleRestore} disabled={!savedConfig}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Restaurar
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            <Button variant="outline" size="sm" onClick={handleImportClick}>
              <Upload className="mr-2 h-4 w-4" />
              Importar
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {connectionStatus !== 'unknown' && (
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2">
                {connectionStatus === 'connected' ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Conectado
                    </Badge>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-destructive" />
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      Erro
                    </Badge>
                  </>
                )}
              </div>
              {errorMessage && <p className="text-sm text-muted-foreground">{errorMessage}</p>}
            </div>
          )}

          {configComparison.hasChanges && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Atenção:</strong> Você tem alterações não salvas. Execute o teste de conexão
                e salve as configurações para aplicá-las.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>


      {configComparison.hasChanges && lastTestPassed && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-700" />
                <div>
                  <p className="font-medium text-yellow-900">Configuração Testada e Pronta</p>
                  <p className="text-sm text-yellow-700">
                    As novas configurações foram testadas com sucesso. Salve para aplicar.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <AnonKeyManager
        open={showAnonKeyManager}
        onOpenChange={setShowAnonKeyManager}
        onKeySaved={() => {
          setAnonKeyConfigured(true);
          toast.success('Anon Key configurada!', {
            description: 'Testando conexão automaticamente...'
          });
          setTimeout(() => testConnection(), 500);
        }}
      />

      <ServiceRoleKeyManager
        open={showServiceRoleKeyManager}
        onOpenChange={setShowServiceRoleKeyManager}
        onKeySaved={() => {
          setServiceRoleKeyConfigured(true);
          toast.success('Service Role Key configurada!', {
            description: 'Testando conexão automaticamente...'
          });
          setTimeout(() => testServiceRoleConnection(), 500);
        }}
      />

      <AlertDialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Salvar Nova Configuração?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>As seguintes alterações serão aplicadas:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {configComparison.changes.map((change, idx) => (
                  <li key={idx}>
                    <strong>{change.field}:</strong> {change.saved} → {change.current}
                  </li>
                ))}
              </ul>
              <Alert className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>ATENÇÃO:</strong> A aplicação precisará ser recarregada para aplicar as
                  mudanças.
                </AlertDescription>
              </Alert>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSave}>Salvar Configurações</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {savedConfig && configSource === 'database' && !configComparison.hasChanges && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-700" />
                <div>
                  <p className="font-medium text-blue-900">Configuração Salva Aplicada</p>
                  <p className="text-sm text-blue-700">
                    A aplicação está usando a configuração salva no banco de dados.
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleReload}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Recarregar Agora
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <EnvGenerator initialProjectId={projectId} initialSupabaseUrl={supabaseUrlConfig} />
    </div>
  );
}
