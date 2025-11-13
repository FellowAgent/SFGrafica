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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSupabaseConfig } from '@/hooks/useSupabaseConfig';
import { SecretsManager } from './SecretsManager';
import { ImportOptionsTable } from './ImportOptionsTable';
import { EnvGenerator } from './EnvGenerator';
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
  const [showSecretsManager, setShowSecretsManager] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [lastTestPassed, setLastTestPassed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setProjectId(import.meta.env.VITE_SUPABASE_PROJECT_ID || '');
      setSupabaseUrlConfig(import.meta.env.VITE_SUPABASE_URL || '');
    }
  }, [savedConfig]);

  const configComparison = compareConfigs(
    { project_id: projectId, supabase_url: supabaseUrlConfig },
    savedConfig
  );

  const testConnection = async () => {
    setIsLoading(true);
    setLastTestPassed(false);
    try {
      const { data, error } = await supabase.from('perfis').select('count');

      if (error) {
        setConnectionStatus('error');
        setErrorMessage(error.message);
        toast.error('Erro na conexão', { description: error.message });
        setLastTestPassed(false);
      } else {
        setConnectionStatus('connected');
        setErrorMessage('');
        toast.success('Conexão estabelecida com sucesso!');
        setLastTestPassed(true);
      }
    } catch (err) {
      setConnectionStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Erro desconhecido');
      toast.error('Erro ao testar conexão');
      setLastTestPassed(false);
    } finally {
      setIsLoading(false);
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
      // Mostrar banner de reload
      toast.success('Configuração salva!', {
        description: 'Clique em "Aplicar Agora" para recarregar a página e aplicar as mudanças.',
        duration: 10000,
      });
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

          <div className="space-y-2">
            <Label>Chaves de Acesso</Label>
            <Button
              variant="outline"
              onClick={() => setShowSecretsManager(true)}
              className="w-full justify-start"
            >
              <Key className="mr-2 h-4 w-4" />
              Gerenciar Anon Key e Service Role Key
            </Button>
            <p className="text-xs text-muted-foreground">
              Gerencie as chaves de acesso de forma segura via Supabase Secrets
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={testConnection} disabled={isLoading} variant="outline">
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Testando...' : 'Testar Conexão'}
            </Button>
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

      <SecretsManager open={showSecretsManager} onOpenChange={setShowSecretsManager} />

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
