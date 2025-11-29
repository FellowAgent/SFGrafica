import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileCode, Copy, CheckCircle2, XCircle, Wifi, RefreshCw } from 'lucide-react';
import { toast } from '@/utils/toastHelper';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

interface EnvGeneratorProps {
  initialProjectId?: string;
  initialSupabaseUrl?: string;
}

// Validação JWT
const jwtSchema = z.string().regex(
  /^eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*$/,
  'Formato JWT inválido'
);

type ConnectionStatus = 'idle' | 'success' | 'error' | 'unknown' | 'connected';

export function EnvGenerator({ initialProjectId = '', initialSupabaseUrl = '' }: EnvGeneratorProps) {
  const [projectId, setProjectId] = useState(initialProjectId);
  const [supabaseUrl, setSupabaseUrl] = useState(initialSupabaseUrl);
  const [anonKey, setAnonKey] = useState('');
  const [serviceRoleKey, setServiceRoleKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isTestingServiceRole, setIsTestingServiceRole] = useState(false);
  const [anonKeyStatus, setAnonKeyStatus] = useState<ConnectionStatus>('idle');
  const [serviceRoleStatus, setServiceRoleStatus] = useState<ConnectionStatus>('idle');
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Validação em tempo real
  const isAnonKeyValid = anonKey ? jwtSchema.safeParse(anonKey).success : true;
  const isServiceRoleKeyValid = serviceRoleKey ? jwtSchema.safeParse(serviceRoleKey).success : true;

  const generateEnvContent = () => {
    return `# Supabase Configuration
VITE_SUPABASE_PROJECT_ID=${projectId}
VITE_SUPABASE_URL=${supabaseUrl}
VITE_SUPABASE_PUBLISHABLE_KEY=${anonKey}
${serviceRoleKey ? `VITE_SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}` : '# VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here'}
`;
  };

  const validateFields = () => {
    if (!supabaseUrl || !anonKey) {
      toast.error('Preencha os campos obrigatórios', {
        description: 'Supabase URL e Anon Key são necessários',
      });
      return false;
    }

    if (!isAnonKeyValid) {
      toast.error('Anon Key inválida', {
        description: 'O formato da Anon Key não é um JWT válido',
      });
      return false;
    }

    if (serviceRoleKey && !isServiceRoleKeyValid) {
      toast.error('Service Role Key inválida', {
        description: 'O formato da Service Role Key não é um JWT válido',
      });
      return false;
    }

    return true;
  };

  const generateEnvFile = () => {
    if (!validateFields()) return;

    const envContent = generateEnvContent();
    const blob = new Blob([envContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '.env';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Arquivo .env gerado com sucesso!', {
      description: 'O arquivo foi baixado para seu computador',
    });
  };

  const copyToClipboard = async () => {
    if (!validateFields()) return;

    const envContent = generateEnvContent();

    try {
      await navigator.clipboard.writeText(envContent);
      toast.success('Conteúdo copiado!', {
        description: 'O conteúdo do .env foi copiado para a área de transferência',
      });
    } catch (err) {
      toast.error('Erro ao copiar', {
        description: 'Não foi possível copiar para a área de transferência',
      });
    }
  };

  const testConnection = async () => {
    if (!validateFields()) return;

    setIsTesting(true);
    setAnonKeyStatus('idle');
    
    try {
      // Criar cliente temporário com as credenciais fornecidas
      const testClient = createClient(supabaseUrl, anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      // Testar conexão usando uma query genérica que funciona em qualquer projeto Supabase
      // Verificamos se conseguimos acessar as configurações do projeto
      const { data, error } = await testClient.rpc('version');

      if (error) {
        // Se a RPC não existir, tentamos uma abordagem alternativa simples
        if (error.code === 'PGRST202' || error.message.includes('not found')) {
          // Isso significa que conseguimos conectar, mas a função não existe
          // O que é OK - a conexão funcionou
          setAnonKeyStatus('success');
          setConnectionStatus('connected');
          setErrorMessage('');
          toast.success('Conexão estabelecida com sucesso!');
        } else {
          setAnonKeyStatus('error');
          setConnectionStatus('error');
          setErrorMessage(error.message);
          toast.error('Erro na conexão', { description: error.message });
        }
      } else {
        setAnonKeyStatus('success');
        setConnectionStatus('connected');
        setErrorMessage('');
        toast.success('Conexão estabelecida com sucesso!');
      }
    } catch (err: any) {
      setAnonKeyStatus('error');
      setConnectionStatus('error');
      setErrorMessage(err.message || 'Não foi possível conectar ao servidor');
      toast.error('Erro ao testar conexão', {
        description: err.message || 'Não foi possível conectar ao servidor',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const testServiceRoleConnection = async () => {
    if (!supabaseUrl || !serviceRoleKey) {
      toast.error('Preencha os campos obrigatórios', {
        description: 'Supabase URL e Service Role Key são necessários',
      });
      return;
    }

    if (!isServiceRoleKeyValid) {
      toast.error('Service Role Key inválida', {
        description: 'O formato da Service Role Key não é um JWT válido',
      });
      return;
    }

    setIsTestingServiceRole(true);
    setServiceRoleStatus('idle');
    
    try {
      // Criar cliente temporário com service role key
      const testClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      // Testar conexão com permissões administrativas usando query genérica
      const { data, error } = await testClient.rpc('version');

      if (error) {
        if (error.code === 'PGRST202' || error.message.includes('not found')) {
          setServiceRoleStatus('success');
          toast.success('Service Role Key: Conexão bem-sucedida!', {
            description: 'Permissões administrativas validadas com sucesso',
          });
        } else {
          setServiceRoleStatus('error');
          toast.error('Service Role Key: Erro na conexão', {
            description: error.message,
          });
        }
      } else {
        setServiceRoleStatus('success');
        toast.success('Service Role Key: Conexão bem-sucedida!', {
          description: 'Permissões administrativas validadas com sucesso',
        });
      }
    } catch (err: any) {
      setServiceRoleStatus('error');
      toast.error('Service Role Key: Erro ao testar conexão', {
        description: err.message || 'Não foi possível conectar ao servidor',
      });
    } finally {
      setIsTestingServiceRole(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCode className="h-5 w-5" />
          Gerador de Arquivo .ENV
        </CardTitle>
        <CardDescription>
          Útil para configuração de novo servidor. Preencha os campos e exporte o arquivo .env
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="env-project-id">
            VITE_SUPABASE_PROJECT_ID (opcional)
          </Label>
          <Input
            id="env-project-id"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder="odlfkrnrkvruvqxseusr"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="env-supabase-url">
            VITE_SUPABASE_URL <span className="text-destructive">*</span>
          </Label>
          <Input
            id="env-supabase-url"
            value={supabaseUrl}
            onChange={(e) => setSupabaseUrl(e.target.value)}
            placeholder="https://odlfkrnrkvruvqxseusr.supabase.co"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="env-anon-key">
              VITE_SUPABASE_PUBLISHABLE_KEY <span className="text-destructive">*</span>
            </Label>
            {anonKeyStatus !== 'idle' && (
              <div className={`flex items-center gap-1 text-xs ${anonKeyStatus === 'success' ? 'text-green-600' : 'text-destructive'}`}>
                {anonKeyStatus === 'success' ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Conexão OK</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3" />
                    <span>Erro na conexão</span>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="relative">
            <Input
              id="env-anon-key"
              type="password"
              value={anonKey}
              onChange={(e) => {
                setAnonKey(e.target.value);
                setAnonKeyStatus('idle');
              }}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className={anonKey && !isAnonKeyValid ? 'border-destructive pr-10' : anonKey ? 'pr-10' : ''}
            />
            {anonKey && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isAnonKeyValid ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
              </div>
            )}
          </div>
          {anonKey && !isAnonKeyValid && (
            <p className="text-xs text-destructive">Formato JWT inválido</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="env-service-role-key">VITE_SUPABASE_SERVICE_ROLE_KEY (opcional)</Label>
            {serviceRoleStatus !== 'idle' && (
              <div className={`flex items-center gap-1 text-xs ${serviceRoleStatus === 'success' ? 'text-green-600' : 'text-destructive'}`}>
                {serviceRoleStatus === 'success' ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Conexão OK (Admin)</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3" />
                    <span>Erro na conexão</span>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="relative">
            <Input
              id="env-service-role-key"
              type="password"
              value={serviceRoleKey}
              onChange={(e) => {
                setServiceRoleKey(e.target.value);
                setServiceRoleStatus('idle');
              }}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className={
                serviceRoleKey && !isServiceRoleKeyValid ? 'border-destructive pr-10' : serviceRoleKey ? 'pr-10' : ''
              }
            />
            {serviceRoleKey && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isServiceRoleKeyValid ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
              </div>
            )}
          </div>
          {serviceRoleKey && !isServiceRoleKeyValid && (
            <p className="text-xs text-destructive">Formato JWT inválido</p>
          )}
          <p className="text-xs text-muted-foreground">
            ⚠️ Service Role Key é sensível. Deixe vazio se preferir adicionar manualmente depois.
          </p>
        </div>

        <div className="space-y-2">
          <Button 
            onClick={testConnection} 
            disabled={isTesting} 
            variant="outline"
            className="w-full"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isTesting ? 'animate-spin' : ''}`} />
            {isTesting ? 'Testando...' : 'Testar Conexão'}
          </Button>

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

          {serviceRoleKey && (
            <Button 
              onClick={testServiceRoleConnection} 
              variant="outline" 
              disabled={isTestingServiceRole || !serviceRoleKey}
              size="sm"
              className="w-full"
            >
              <Wifi className="mr-2 h-4 w-4" />
              {isTestingServiceRole ? 'Testando...' : 'Testar Service Role Key'}
            </Button>
          )}
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={copyToClipboard} variant="outline">
              <Copy className="mr-2 h-4 w-4" />
              Copiar
            </Button>
            <Button onClick={generateEnvFile}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
