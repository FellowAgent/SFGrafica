import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Key, Shield, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface KeyStatusCardProps {
  keyType: 'anon' | 'service';
  isConfigured: boolean;
  isValid?: boolean;
  connectionStatus?: 'idle' | 'testing' | 'success' | 'error';
  onTest?: () => void;
  onConfigure?: () => void;
  lastTested?: Date;
  errorMessage?: string;
}

export function KeyStatusCard({
  keyType,
  isConfigured,
  isValid,
  connectionStatus = 'idle',
  onTest,
  onConfigure,
  lastTested,
  errorMessage,
}: KeyStatusCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const keyInfo = {
    anon: {
      title: 'Anon Key',
      description: 'Chave pública para acesso do cliente',
      icon: Key,
      color: 'text-blue-500',
    },
    service: {
      title: 'Service Role Key',
      description: 'Chave administrativa para operações privilegiadas',
      icon: Shield,
      color: 'text-purple-500',
    },
  };

  const info = keyInfo[keyType];
  const Icon = info.icon;

  const getStatusBadge = () => {
    if (!isConfigured) {
      return (
        <Badge variant="outline" className="gap-1">
          <XCircle className="h-3 w-3" />
          Não configurada
        </Badge>
      );
    }

    if (connectionStatus === 'testing') {
      return (
        <Badge variant="outline" className="gap-1 animate-pulse">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Testando...
        </Badge>
      );
    }

    if (connectionStatus === 'success') {
      return (
        <Badge variant="outline" className="gap-1 border-green-500 text-green-500">
          <CheckCircle2 className="h-3 w-3" />
          Validada
        </Badge>
      );
    }

    if (connectionStatus === 'error') {
      return (
        <Badge variant="outline" className="gap-1 border-destructive text-destructive">
          <XCircle className="h-3 w-3" />
          Erro
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="gap-1 border-green-500 text-green-500">
        <CheckCircle2 className="h-3 w-3" />
        Configurada
      </Badge>
    );
  };

  return (
    <Card className={cn(
      "transition-all duration-300 hover:shadow-md",
      connectionStatus === 'success' && "border-green-500/50",
      connectionStatus === 'error' && "border-destructive/50"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg bg-muted",
              connectionStatus === 'success' && "bg-green-500/10",
              connectionStatus === 'error' && "bg-destructive/10"
            )}>
              <Icon className={cn("h-5 w-5", info.color)} />
            </div>
            <div>
              <CardTitle className="text-base">{info.title}</CardTitle>
              <CardDescription className="text-xs">{info.description}</CardDescription>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {isConfigured && (
          <div className="space-y-2">
            {/* Status Details */}
            {connectionStatus === 'success' && lastTested && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-green-500/5 p-2 rounded-md">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                <span>Última validação: {lastTested.toLocaleString('pt-BR')}</span>
              </div>
            )}

            {connectionStatus === 'error' && errorMessage && (
              <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/5 p-2 rounded-md">
                <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span className="flex-1">{errorMessage}</span>
              </div>
            )}

            {isValid !== undefined && (
              <div className="flex items-center gap-2 text-xs">
                {isValid ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    <span className="text-muted-foreground">Formato JWT válido</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3 text-destructive" />
                    <span className="text-destructive">Formato JWT inválido</span>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          {isConfigured && onTest && (
            <Button
              variant="outline"
              size="sm"
              onClick={onTest}
              disabled={connectionStatus === 'testing'}
              className="w-full"
            >
              <RefreshCw className={cn(
                "h-3 w-3 mr-2",
                connectionStatus === 'testing' && "animate-spin"
              )} />
              {connectionStatus === 'testing' ? 'Testando...' : 'Testar'}
            </Button>
          )}
          
          {onConfigure && (
            <Button
              variant="outline"
              size="sm"
              onClick={onConfigure}
              className="w-full"
            >
              <Key className="h-3 w-3 mr-2" />
              {isConfigured ? 'Atualizar' : 'Configurar'}
            </Button>
          )}
        </div>

        {/* Toggle Details */}
        {isConfigured && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="w-full text-xs"
          >
            {showDetails ? (
              <>
                <EyeOff className="h-3 w-3 mr-2" />
                Ocultar detalhes
              </>
            ) : (
              <>
                <Eye className="h-3 w-3 mr-2" />
                Ver detalhes
              </>
            )}
          </Button>
        )}

        {showDetails && isConfigured && (
          <div className="space-y-2 pt-2 border-t">
            <div className="text-xs space-y-1">
              <p className="font-medium text-muted-foreground">Informações:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 pl-2">
                <li>Chave armazenada de forma segura</li>
                {keyType === 'anon' && (
                  <>
                    <li>Usada para operações do cliente</li>
                    <li>Segura para uso público</li>
                  </>
                )}
                {keyType === 'service' && (
                  <>
                    <li>Acesso administrativo completo</li>
                    <li className="text-destructive font-medium">Nunca compartilhe esta chave!</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
