import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/utils/toastHelper";

interface DiagnosticResult {
  test: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

const Diagnostico = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [serverInfo, setServerInfo] = useState<{
    url: string;
    type: 'cloud' | 'self-hosted';
    projectId?: string;
  } | null>(null);

  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const isCloud = supabaseUrl.includes('supabase.co');
    const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    
    setServerInfo({
      url: supabaseUrl,
      type: isCloud ? 'cloud' : 'self-hosted',
      projectId: projectId,
    });
  }, []);

  const runDiagnostics = async () => {
    setLoading(true);
    const diagnosticResults: DiagnosticResult[] = [];

    try {
      // Test 1: Conexão com Supabase
      try {
        const { error } = await supabase.from('perfis').select('id', { count: 'exact', head: true });
        if (error) throw error;
        diagnosticResults.push({
          test: 'Conexão com Supabase',
          status: 'success',
          message: 'Conectado com sucesso',
        });
      } catch (error: any) {
        diagnosticResults.push({
          test: 'Conexão com Supabase',
          status: 'error',
          message: 'Falha na conexão',
          details: error.message,
        });
      }

      // Test 2: Autenticação
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          diagnosticResults.push({
            test: 'Autenticação',
            status: 'success',
            message: `Usuário autenticado: ${session.user.email}`,
          });
        } else {
          diagnosticResults.push({
            test: 'Autenticação',
            status: 'warning',
            message: 'Nenhum usuário autenticado',
          });
        }
      } catch (error: any) {
        diagnosticResults.push({
          test: 'Autenticação',
          status: 'error',
          message: 'Erro ao verificar autenticação',
          details: error.message,
        });
      }

      // Test 3: RLS Policies - Perfis
      try {
        const { data, error } = await supabase
          .from('perfis')
          .select('id')
          .limit(1);
        
        if (error) throw error;
        diagnosticResults.push({
          test: 'RLS - Tabela perfis',
          status: 'success',
          message: 'Acesso permitido',
        });
      } catch (error: any) {
        diagnosticResults.push({
          test: 'RLS - Tabela perfis',
          status: 'error',
          message: 'Acesso negado ou erro',
          details: error.message,
        });
      }

      // Test 4: RLS Policies - Status
      try {
        const { data, error } = await supabase
          .from('status_pedidos_config')
          .select('id')
          .limit(1);
        
        if (error) throw error;
        diagnosticResults.push({
          test: 'RLS - Tabela status_pedidos_config',
          status: 'success',
          message: 'Acesso permitido',
        });
      } catch (error: any) {
        diagnosticResults.push({
          test: 'RLS - Tabela status_pedidos_config',
          status: error.message.includes('permission denied') ? 'warning' : 'error',
          message: error.message.includes('permission denied') 
            ? 'Necessita autenticação' 
            : 'Erro ao acessar',
          details: error.message,
        });
      }

      // Test 5: RLS Policies - Clientes
      try {
        const { data, error } = await supabase
          .from('clientes')
          .select('id')
          .limit(1);
        
        if (error) throw error;
        diagnosticResults.push({
          test: 'RLS - Tabela clientes',
          status: 'success',
          message: 'Acesso permitido',
        });
      } catch (error: any) {
        diagnosticResults.push({
          test: 'RLS - Tabela clientes',
          status: error.message.includes('permission denied') ? 'warning' : 'error',
          message: error.message.includes('permission denied') 
            ? 'Necessita autenticação' 
            : 'Erro ao acessar',
          details: error.message,
        });
      }

      // Test 6: RLS Policies - Produtos
      try {
        const { data, error } = await supabase
          .from('produtos')
          .select('id')
          .limit(1);
        
        if (error) throw error;
        diagnosticResults.push({
          test: 'RLS - Tabela produtos',
          status: 'success',
          message: 'Acesso permitido',
        });
      } catch (error: any) {
        diagnosticResults.push({
          test: 'RLS - Tabela produtos',
          status: error.message.includes('permission denied') ? 'warning' : 'error',
          message: error.message.includes('permission denied') 
            ? 'Necessita autenticação' 
            : 'Erro ao acessar',
          details: error.message,
        });
      }

      // Test 7: RLS Policies - Pedidos
      try {
        const { data, error } = await supabase
          .from('pedidos')
          .select('id')
          .limit(1);
        
        if (error) throw error;
        diagnosticResults.push({
          test: 'RLS - Tabela pedidos',
          status: 'success',
          message: 'Acesso permitido',
        });
      } catch (error: any) {
        diagnosticResults.push({
          test: 'RLS - Tabela pedidos',
          status: error.message.includes('permission denied') ? 'warning' : 'error',
          message: error.message.includes('permission denied') 
            ? 'Necessita autenticação' 
            : 'Erro ao acessar',
          details: error.message,
        });
      }

      // Test 8: Edge Functions (check-users)
      try {
        const { data, error } = await supabase.functions.invoke('check-users');
        if (!error && data) {
          diagnosticResults.push({
            test: 'Edge Function - check-users',
            status: 'success',
            message: 'Função disponível e respondendo',
          });
        } else {
          throw error || new Error('Sem resposta da função');
        }
      } catch (error: any) {
        diagnosticResults.push({
          test: 'Edge Function - check-users',
          status: 'warning',
          message: 'Função indisponível ou com erro',
          details: error.message,
        });
      }

      setResults(diagnosticResults);
      toast.success('Diagnóstico concluído');
    } catch (error: any) {
      toast.error('Erro ao executar diagnóstico: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">OK</Badge>;
      case 'error':
        return <Badge variant="destructive">ERRO</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">AVISO</Badge>;
      default:
        return null;
    }
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const warningCount = results.filter(r => r.status === 'warning').length;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-3xl font-bold">Diagnóstico do Sistema</h1>
            <p className="text-muted-foreground">
              Validação de conexão, autenticação e permissões
            </p>
          </div>
          <Button onClick={runDiagnostics} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Executando...' : 'Executar Diagnóstico'}
          </Button>
        </div>

        {/* Server Info */}
        {serverInfo && (
          <Card>
            <CardHeader>
              <CardTitle>Informações do Servidor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tipo de Servidor:</span>
                <Badge variant={serverInfo.type === 'cloud' ? 'default' : 'secondary'}>
                  {serverInfo.type === 'cloud' ? 'Supabase Cloud' : 'Self-Hosted'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">URL:</span>
                <code className="text-xs bg-muted px-2 py-1 rounded">{serverInfo.url}</code>
              </div>
              {serverInfo.projectId && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Project ID:</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{serverInfo.projectId}</code>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Results Summary */}
        {results.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{successCount}</div>
                  <div className="text-sm text-muted-foreground">Sucessos</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600">{warningCount}</div>
                  <div className="text-sm text-muted-foreground">Avisos</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-destructive">{errorCount}</div>
                  <div className="text-sm text-muted-foreground">Erros</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Diagnostic Results */}
        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Resultados dos Testes</CardTitle>
              <CardDescription>
                Detalhes de cada verificação executada
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="mt-0.5">{getStatusIcon(result.status)}</div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{result.test}</h3>
                        {getStatusBadge(result.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">{result.message}</p>
                      {result.details && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            Ver detalhes técnicos
                          </summary>
                          <code className="block mt-2 p-2 bg-muted rounded text-xs">
                            {result.details}
                          </code>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Initial State */}
        {results.length === 0 && !loading && (
          <Card>
            <CardContent className="pt-12 pb-12">
              <div className="text-center text-muted-foreground">
                <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Clique em "Executar Diagnóstico" para iniciar a validação do sistema</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Diagnostico;
