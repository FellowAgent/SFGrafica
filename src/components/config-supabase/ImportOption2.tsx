import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Zap, CheckCircle } from 'lucide-react';
import { toast } from '@/utils/toastHelper';
import { createClient } from '@supabase/supabase-js';
import { sqlAnalyzer, type ValidationResult } from '@/utils/sqlAnalyzer';
import { Progress } from '@/components/ui/progress';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ImportOption2() {
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [sqlContent, setSqlContent] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [migrationName, setMigrationName] = useState('');
  const [progress, setProgress] = useState(0);
  
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [serviceRoleKey, setServiceRoleKey] = useState('');
  const [urlStatus, setUrlStatus] = useState<'default' | 'success' | 'error'>('default');
  const [keyStatus, setKeyStatus] = useState<'default' | 'success' | 'error'>('default');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionValid, setConnectionValid] = useState(false);

  // Validar formato da URL
  const validateUrlFormat = (url: string): boolean => {
    console.log('Validando URL:', url);
    if (!url) {
      console.log('URL vazia');
      return false;
    }
    try {
      const urlObj = new URL(url);
      // Aceita qualquer URL HTTPS válida (não só supabase.co)
      const isValid = urlObj.protocol === 'https:' && urlObj.hostname.length > 0;
      console.log('URL válida:', isValid);
      return isValid;
    } catch (e) {
      console.log('Erro ao validar URL:', e);
      return false;
    }
  };

  // Validar formato da Service Role Key
  const validateKeyFormat = (key: string): boolean => {
    console.log('Validando Key (primeiros 20 chars):', key.substring(0, 20));
    if (!key) {
      console.log('Key vazia');
      return false;
    }
    const isValid = key.startsWith('eyJ') && key.length > 100;
    console.log('Key válida:', isValid, 'Tamanho:', key.length);
    return isValid;
  };

  // Testar conexão automaticamente quando ambos os campos forem preenchidos
  useEffect(() => {
    console.log('useEffect executado - URL:', supabaseUrl, 'Key presente:', !!serviceRoleKey);
    
    const testConnection = async () => {
      const urlValid = validateUrlFormat(supabaseUrl);
      const keyValid = validateKeyFormat(serviceRoleKey);
      
      console.log('Validações - URL:', urlValid, 'Key:', keyValid);
      
      if (!urlValid || !keyValid) {
        console.log('Validações falharam, não vai testar conexão');
        setConnectionValid(false);
        return;
      }

      console.log('Iniciando teste de conexão...');
      setIsTestingConnection(true);
      
      try {
        // Criar cliente com Service Role Key
        const testClient = createClient(supabaseUrl, serviceRoleKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
          global: {
            headers: {
              apikey: serviceRoleKey,
            },
          },
        });

        // Testar conexão com uma query simples - usando .head() que é mais leve
        const { error } = await testClient.from('perfis').select('id', { count: 'exact', head: true });

        console.log('Teste de conexão - erro:', error);

        if (error) {
          console.error('Erro detalhado:', error);
          setUrlStatus('error');
          setKeyStatus('error');
          setConnectionValid(false);
          toast.error('Erro na conexão', {
            description: error.message,
          });
        } else {
          setUrlStatus('success');
          setKeyStatus('success');
          setConnectionValid(true);
          toast.success('Conexão validada com sucesso!');
        }
      } catch (err) {
        console.error('Exceção ao testar conexão:', err);
        setUrlStatus('error');
        setKeyStatus('error');
        setConnectionValid(false);
        toast.error('Erro ao testar conexão', {
          description: err instanceof Error ? err.message : 'Erro desconhecido',
        });
      } finally {
        setIsTestingConnection(false);
      }
    };

    // Debounce de 1 segundo
    const timer = setTimeout(() => {
      if (supabaseUrl && serviceRoleKey) {
        testConnection();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [supabaseUrl, serviceRoleKey]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.sql')) {
      toast.error('Selecione um arquivo .sql válido');
      return;
    }

    setFile(selectedFile);
    setIsValidating(true);
    setMigrationName(selectedFile.name.replace('.sql', ''));

    try {
      const content = await selectedFile.text();
      setSqlContent(content);

      const parsed = sqlAnalyzer.parseSQL(content);
      const validationResult = sqlAnalyzer.validateSQL(parsed);
      
      setValidation(validationResult);

      if (validationResult.isValid) {
        toast.success('SQL validado com sucesso!', {
          description: `${validationResult.summary.totalOperations} operações detectadas`,
        });
      } else {
        toast.error('Erros encontrados no SQL', {
          description: `${validationResult.errors.length} erros críticos`,
        });
      }
    } catch (err) {
      console.error('Erro ao validar SQL:', err);
      toast.error('Erro ao ler arquivo');
    } finally {
      setIsValidating(false);
    }
  };

  const handleExecute = async () => {
    if (!validation || !file || confirmText !== 'EXECUTAR') return;
    
    if (!supabaseUrl || !serviceRoleKey) {
      toast.error('Preencha os dados de conexão', {
        description: 'Supabase URL e Service Role Key são obrigatórios',
      });
      return;
    }

    setIsExecuting(true);
    setShowConfirmDialog(false);
    setProgress(0);

    try {
      // Criar cliente com as credenciais fornecidas
      const testClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
          },
        },
      });

      // Invocar edge function com corpo completo
      const { data, error } = await testClient.functions.invoke('execute-sql-migration', {
        body: {
          sql: sqlContent,
          fileName: file.name,
          migrationName: migrationName || file.name,
          statements: validation.operations.safe.concat(
            validation.operations.warnings,
            validation.operations.creates,
            validation.operations.alters
          ).map(stmt => ({
            type: stmt.type,
            content: stmt.content,
            tableName: stmt.tableName,
            schemaName: stmt.schemaName,
            lineNumber: stmt.lineNumber,
            dangerLevel: stmt.dangerLevel,
          })),
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Migração executada com sucesso!', {
          description: `${data.operationsSuccessful} operações executadas em ${data.duration}ms`,
        });
        setFile(null);
        setValidation(null);
        setSqlContent('');
        setConfirmText('');
        setMigrationName('');
      } else {
        toast.error('Migração falhou', {
          description: data.errors ? data.errors[0] : 'Erro desconhecido',
        });
      }
    } catch (err) {
      console.error('Erro ao executar migração:', err);
      toast.error('Erro ao executar migração', {
        description: err instanceof Error ? err.message : 'Erro desconhecido',
      });
    } finally {
      setIsExecuting(false);
      setProgress(0);
    }
  };

  return (
    <>
      <Card className="border-yellow-200 dark:border-yellow-900">
        <CardHeader className="bg-yellow-50 dark:bg-yellow-950/20">
          <CardTitle className="flex items-center gap-2">
            ⚡ Opção 2: Execução Automática
            <span className="text-xs font-normal px-2 py-1 rounded-full bg-yellow-600 text-white">
              Avançado
            </span>
          </CardTitle>
          <CardDescription>
            Executa SQL automaticamente via Edge Function (usa Service Role Key)
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="p-4 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
            <p className="text-sm font-medium mb-2 text-yellow-900 dark:text-yellow-100">
              ⚠️ ATENÇÃO:
            </p>
            <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1 list-disc list-inside">
              <li>Usa permissões elevadas (Service Role Key)</li>
              <li>Executa SQL automaticamente no banco</li>
              <li>Todas as operações são registradas no histórico</li>
              <li>Recomendado apenas para desenvolvedores experientes</li>
            </ul>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="supabase-url">Supabase URL *</Label>
              <Input
                id="supabase-url"
                type="url"
                placeholder="https://seu-projeto.supabase.co"
                value={supabaseUrl}
                onChange={(e) => {
                  setSupabaseUrl(e.target.value);
                  setUrlStatus('default');
                  setConnectionValid(false);
                }}
                disabled={isExecuting || isTestingConnection}
                state={urlStatus}
                showStateIcon={urlStatus !== 'default'}
              />
              {isTestingConnection && supabaseUrl && (
                <p className="text-xs text-muted-foreground">
                  Testando conexão...
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="service-role-key">Service Role Key *</Label>
              <Input
                id="service-role-key"
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={serviceRoleKey}
                onChange={(e) => {
                  setServiceRoleKey(e.target.value);
                  setKeyStatus('default');
                  setConnectionValid(false);
                }}
                disabled={isExecuting || isTestingConnection}
                state={keyStatus}
                showStateIcon={keyStatus !== 'default'}
              />
              <p className="text-xs text-muted-foreground">
                Encontre em: Settings {'>'} API {'>'} Project API keys {'>'} service_role
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="option2-file">
              <Button 
                disabled={isValidating || isExecuting || !connectionValid || isTestingConnection}
                className="w-full"
                onClick={() => document.getElementById('option2-file')?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                {isValidating ? 'Validando...' : file ? file.name : connectionValid ? 'Selecionar Arquivo .sql' : 'Valide a conexão primeiro'}
              </Button>
            </label>
            <input
              id="option2-file"
              type="file"
              accept=".sql"
              onChange={handleFileSelect}
              className="hidden"
            />
            {!connectionValid && supabaseUrl && serviceRoleKey && !isTestingConnection && (
              <p className="text-xs text-destructive text-center">
                Conexão inválida. Verifique as credenciais.
              </p>
            )}
          </div>

          {validation && !isExecuting && (
            <div className="space-y-3">
              <div className="p-4 rounded-lg border bg-card">
                <p className="text-sm font-medium mb-2">Resumo da validação:</p>
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div className="text-center p-2 rounded bg-green-50 dark:bg-green-950/20">
                    <div className="font-semibold text-green-700 dark:text-green-300">
                      {validation.summary.totalOperations}
                    </div>
                    <div className="text-xs text-muted-foreground">Operações</div>
                  </div>
                  <div className="text-center p-2 rounded bg-yellow-50 dark:bg-yellow-950/20">
                    <div className="font-semibold text-yellow-700 dark:text-yellow-300">
                      {validation.dangerLevel === 'safe' ? 'Seguro' : validation.dangerLevel === 'medium' ? 'Médio' : 'Alto'}
                    </div>
                    <div className="text-xs text-muted-foreground">Nível de Risco</div>
                  </div>
                </div>

                {!validation.isValid && (
                  <div className="p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 mb-3">
                    <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">
                      Erros detectados:
                    </p>
                    <ul className="text-xs text-red-700 dark:text-red-300 space-y-1">
                      {validation.errors.slice(0, 3).map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <Button 
                onClick={() => setShowConfirmDialog(true)}
                disabled={!validation.isValid}
                className="w-full"
              >
                <Zap className="mr-2 h-4 w-4" />
                Executar Migração Automática
              </Button>
            </div>
          )}

          {isExecuting && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Executando migração automática...</p>
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground text-center">
                Aguarde enquanto o SQL é executado no servidor
              </p>
            </div>
          )}

          {connectionValid && (
            <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950">
              <p className="text-sm font-medium mb-2 text-blue-900 dark:text-blue-100">
                ✓ Conexão Validada
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                A Edge Function executará as operações com permissões administrativas.
                Todas as ações serão registradas no histórico de migrações.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-yellow-600 dark:text-yellow-400">
              ⚠️ CONFIRMAR EXECUÇÃO AUTOMÁTICA
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Você está prestes a executar automaticamente: <strong>{file?.name}</strong>
              </p>
              <p>Esta ação irá:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Executar {validation?.summary.totalOperations} operações SQL</li>
                <li>Modificar o banco de dados diretamente</li>
                <li>Registrar no histórico de migrações</li>
              </ul>
              <p className="font-semibold text-yellow-600 dark:text-yellow-400">
                Certifique-se de ter feito backup antes de continuar!
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Digite <strong>EXECUTAR</strong> para confirmar:
                </label>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="EXECUTAR"
                  className="font-mono"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmText('')}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExecute}
              disabled={confirmText !== 'EXECUTAR'}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              <Zap className="mr-2 h-4 w-4" />
              Executar Migração
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
