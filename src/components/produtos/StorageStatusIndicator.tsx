/**
 * Componente para exibir status da conexão com Supabase Storage
 * e diagnosticar problemas
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/utils/toastHelper';
import {
  AlertCircle,
  CheckCircle,
  RefreshCw,
  AlertTriangle,
  HardDrive,
  Upload,
  Download,
  Trash2,
  List,
} from 'lucide-react';
import { checkStorageHealth, StorageHealthStatus } from '@/utils/storageHealthCheck';
import { testImageUpload, TestResult } from '@/utils/testImageUpload';
import { recreateBucket, applyStoragePolicies } from '@/utils/setupStorageBucket';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function StorageStatusIndicator() {
  const [status, setStatus] = useState<StorageHealthStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isTestingUpload, setIsTestingUpload] = useState(false);
  const [isRecreatingBucket, setIsRecreatingBucket] = useState(false);
  const [isApplyingPolicies, setIsApplyingPolicies] = useState(false);

  const handleCheck = async () => {
    setIsChecking(true);
    try {
      const result = await checkStorageHealth();
      setStatus(result);
    } catch (error) {
      console.error('Erro ao verificar storage:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleTestUpload = async () => {
    setIsTestingUpload(true);
    try {
      const result = await testImageUpload();
      setTestResult(result);
    } catch (error) {
      console.error('Erro no teste de upload:', error);
      setTestResult({
        success: false,
        error: 'Erro inesperado no teste'
      });
    } finally {
      setIsTestingUpload(false);
    }
  };

  const handleRecreateBucket = async () => {
    setIsRecreatingBucket(true);
    try {
      const result = await recreateBucket();
      if (result.success) {
        toast.success('Bucket recriado com sucesso!');
        // Recarregar status após recriar
        await handleCheck();
      } else {
        // Se falhou por causa de RLS, mostrar instruções manuais
        if (result.errors.some(error => error.toLowerCase().includes('row-level security') ||
                                      error.toLowerCase().includes('policy'))) {
          toast.error('Criação manual necessária - consulte o painel de diagnóstico');
          setStatus({
            healthy: false,
            bucketExists: false,
            canList: false,
            canRead: false,
            canUpload: false,
            canDelete: false,
            errors: result.errors,
            warnings: result.details,
          });
        } else {
          toast.error(`Falha ao recriar bucket: ${result.errors.join(', ')}`);
        }
      }
    } catch (error) {
      console.error('Erro ao recriar bucket:', error);
      toast.error('Erro inesperado ao recriar bucket');
    } finally {
      setIsRecreatingBucket(false);
    }
  };

  const handleApplyPolicies = async () => {
    setIsApplyingPolicies(true);
    try {
      const result = await applyStoragePolicies();
      if (result.success) {
        toast.success('Políticas RLS aplicadas com sucesso!');
        // Recarregar status após aplicar políticas
        await handleCheck();
      } else {
        toast.error(`Falha ao aplicar políticas: ${result.message}`);
      }
    } catch (error) {
      console.error('Erro ao aplicar políticas:', error);
      toast.error('Erro inesperado ao aplicar políticas RLS');
    } finally {
      setIsApplyingPolicies(false);
    }
  };

  const getStatusIcon = (healthy: boolean) => {
    if (healthy) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    return <AlertCircle className="h-5 w-5 text-red-500" />;
  };

  const getPermissionIcon = (granted: boolean) => {
    if (granted) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <AlertCircle className="h-4 w-4 text-red-500" />;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Status do Supabase Storage
            </CardTitle>
            <CardDescription>
              Diagnóstico de conectividade e permissões do bucket de imagens
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleCheck}
              disabled={isChecking}
              variant="outline"
              size="sm"
            >
              {isChecking ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Verificar Status
                </>
              )}
            </Button>

            <Button
              onClick={handleTestUpload}
              disabled={isTestingUpload}
              variant="outline"
              size="sm"
            >
              {isTestingUpload ? (
                <>
                  <Upload className="h-4 w-4 mr-2 animate-spin" />
                  Testando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Testar Upload
                </>
              )}
            </Button>

            <Button
              onClick={handleRecreateBucket}
              disabled={isRecreatingBucket}
              variant="outline"
              size="sm"
              className="ml-2"
            >
              {isRecreatingBucket ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Recriando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Recriar Bucket
                </>
              )}
            </Button>

            {status?.bucketExists && (
              <Button
                onClick={handleApplyPolicies}
                disabled={isApplyingPolicies}
                variant="outline"
                size="sm"
                className="ml-2"
              >
                {isApplyingPolicies ? (
                  <>
                    <Upload className="h-4 w-4 mr-2 animate-spin" />
                    Aplicando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Aplicar Políticas
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Resultado do teste de upload */}
        {testResult && (
          <Alert variant={testResult.success ? "default" : "destructive"}>
            {testResult.success ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertTitle>
              {testResult.success ? "Teste de Upload Bem-Sucedido" : "Falha no Teste de Upload"}
            </AlertTitle>
            <AlertDescription className="space-y-2">
              {testResult.success ? (
                <div>
                  <p className="text-sm">✅ Upload, leitura e limpeza funcionaram corretamente</p>
                  {testResult.url && (
                    <p className="text-xs text-muted-foreground mt-1">
                      URL de exemplo: {testResult.url.substring(0, 60)}...
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm">❌ {testResult.error}</p>
                  {testResult.statusCode && (
                    <p className="text-xs text-muted-foreground">
                      Código de erro: {testResult.statusCode}
                    </p>
                  )}
                  <div className="text-xs text-muted-foreground mt-2">
                    <p><strong>Verificações realizadas:</strong></p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li>Bucket existe: {testResult.bucketExists ? '✅' : '❌'}</li>
                      <li>Pode fazer upload: {testResult.canUpload ? '✅' : '❌'}</li>
                      <li>Pode gerar URL: {testResult.canRead ? '✅' : '❌'}</li>
                    </ul>
                  </div>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {!status && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Diagnóstico não executado</AlertTitle>
            <AlertDescription>
              Clique em "Verificar" para testar a conexão com o Supabase Storage
            </AlertDescription>
          </Alert>
        )}

        {status && (
          <>
            {/* Status Geral */}
            <Alert variant={status.healthy ? 'default' : 'destructive'}>
              <div className="flex items-center gap-2">
                {getStatusIcon(status.healthy)}
                <AlertTitle className="mb-0">
                  {status.healthy
                    ? 'Storage funcionando corretamente'
                    : 'Problemas detectados no storage'}
                </AlertTitle>
              </div>
            </Alert>

            {/* Bucket */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                Bucket 'produtos-imagens'
              </h4>
              <div className="flex items-center gap-2">
                {getPermissionIcon(status.bucketExists)}
                <span className="text-sm">
                  {status.bucketExists ? 'Bucket existe' : 'Bucket não encontrado'}
                </span>
                {status.bucketExists && (
                  <Badge variant="default" className="ml-2 bg-green-500 text-white">
                    OK
                  </Badge>
                )}
              </div>
            </div>

            {/* Permissões */}
            {status.bucketExists && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Permissões</h4>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    {getPermissionIcon(status.canList)}
                    <List className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Listar arquivos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getPermissionIcon(status.canUpload)}
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Fazer upload</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getPermissionIcon(status.canRead)}
                    <Download className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Ler/Download</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getPermissionIcon(status.canDelete)}
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Deletar arquivos</span>
                  </div>
                </div>
              </div>
            )}

            {/* Erros */}
            {status.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erros encontrados</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    {status.errors.map((error, index) => (
                      <li key={index} className="text-sm">
                        {error}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Avisos */}
            {status.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Avisos</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    {status.warnings.map((warning, index) => (
                      <li key={index} className="text-sm">
                        {warning}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Instruções de correção */}
            {!status.healthy && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Como corrigir</AlertTitle>
                <AlertDescription className="space-y-3 mt-2">
                  {!status.bucketExists && (
                    <div>
                      <p className="text-sm font-medium mb-2">📦 Criar Bucket Manualmente:</p>
                      <ol className="list-decimal list-inside space-y-1 text-sm ml-4">
                        <li>
                          Acesse{' '}
                          <a
                            href="https://supabase.com/dashboard"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline text-primary"
                          >
                            supabase.com/dashboard
                          </a>
                        </li>
                        <li>Vá em Storage → New bucket</li>
                        <li>Nome: <code className="bg-muted px-1 rounded">produtos-imagens</code></li>
                        <li>Marque "Public bucket"</li>
                        <li>File size limit: <code className="bg-muted px-1 rounded">5242880</code> (5MB)</li>
                        <li>Allowed MIME types: <code className="bg-muted px-1 rounded">image/jpeg, image/png, image/webp</code></li>
                        <li>Clique "Create bucket"</li>
                      </ol>
                    </div>
                  )}

                  {status.errors.some(error => error.toLowerCase().includes('row-level security')) && (
                    <div>
                      <p className="text-sm font-medium mb-2 text-orange-700 dark:text-orange-300">
                        🔒 Criação Programática Bloqueada:
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Este projeto Supabase tem restrições de segurança que impedem a criação automática de buckets.
                        Você deve criar o bucket manualmente seguindo as instruções acima.
                      </p>
                    </div>
                  )}

                  {(status.bucketExists || !status.bucketExists) && (
                    <div>
                      <p className="text-sm font-medium mb-2">🔑 Configurar Políticas RLS:</p>
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="font-medium">🚀 Opção 1 - Migration Ultra-Simples (Mais Recomendada):</p>
                          <ol className="list-decimal list-inside space-y-1 ml-4">
                            <li>No painel Supabase, vá em "SQL Editor"</li>
                            <li>Execute o arquivo: <code className="bg-muted px-1 rounded">supabase/migrations/20250126200000_simple_storage_policies.sql</code></li>
                            <li>Esta é a versão mais simples e deve funcionar</li>
                          </ol>
                        </div>

                        <div>
                          <p className="font-medium">🔧 Opção 2 - Aplicação Automática:</p>
                          <ol className="list-decimal list-inside space-y-1 ml-4">
                            <li>Clique no botão "Aplicar Políticas" nesta tela</li>
                            <li>Depois teste o upload com "Testar Upload"</li>
                          </ol>
                        </div>

                        <div>
                          <p className="font-medium">📝 Opções 3-4 - Migrations Complexas (se as acima falharem):</p>
                          <ol className="list-decimal list-inside space-y-1 ml-4">
                            <li>Execute: <code className="bg-muted px-1 rounded">supabase/migrations/20251124030913_*.sql</code></li>
                            <li>Ou: <code className="bg-muted px-1 rounded">supabase/migrations/20250126180000_fix_storage_policies.sql</code></li>
                          </ol>
                        </div>

                        <div>
                          <p className="font-medium">Opção 2 - Manual (se as migrations falharem):</p>
                          <ol className="list-decimal list-inside space-y-1 ml-4">
                            <li>No painel Storage, clique em "Policies" do bucket produtos-imagens</li>
                            <li>Adicione política SELECT para acesso público</li>
                            <li>Adicione políticas INSERT/UPDATE/DELETE para usuários autenticados</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* URL de teste */}
            {status.testFileUrl && (
              <div className="text-xs text-muted-foreground">
                <strong>URL de teste:</strong>{' '}
                <a
                  href={status.testFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {status.testFileUrl}
                </a>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

