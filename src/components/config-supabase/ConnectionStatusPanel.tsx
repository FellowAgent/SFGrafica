import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Wifi, WifiOff, Database, Server, Shield, Key } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValidationItem {
  label: string;
  status: 'success' | 'error' | 'pending';
  message?: string;
}

interface ConnectionStatusPanelProps {
  isConnected: boolean;
  validations?: ValidationItem[];
  projectId?: string;
  supabaseUrl?: string;
}

export function ConnectionStatusPanel({
  isConnected,
  validations = [],
  projectId,
  supabaseUrl,
}: ConnectionStatusPanelProps) {
  const getStatusIcon = () => {
    if (isConnected) {
      return <Wifi className="h-5 w-5 text-green-500" />;
    }
    return <WifiOff className="h-5 w-5 text-muted-foreground" />;
  };

  const getStatusBadge = () => {
    if (isConnected) {
      return (
        <Badge className="gap-1 bg-green-500 hover:bg-green-600">
          <CheckCircle2 className="h-3 w-3" />
          Conectado
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1">
        <XCircle className="h-3 w-3" />
        Desconectado
      </Badge>
    );
  };

  return (
    <Card className={cn(
      "transition-all duration-500",
      isConnected && "border-green-500/50 shadow-lg shadow-green-500/10"
    )}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg transition-colors",
              isConnected ? "bg-green-500/10" : "bg-muted"
            )}>
              {getStatusIcon()}
            </div>
            <CardTitle className="text-lg">Status da Conexão</CardTitle>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Connection Info */}
        {(projectId || supabaseUrl) && (
          <div className="space-y-2 p-3 rounded-lg bg-muted/50">
            {projectId && (
              <div className="flex items-center gap-2 text-sm">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Project ID:</span>
                <code className="px-2 py-0.5 rounded bg-background text-xs font-mono">
                  {projectId}
                </code>
              </div>
            )}
            {supabaseUrl && (
              <div className="flex items-center gap-2 text-sm">
                <Server className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">URL:</span>
                <code className="px-2 py-0.5 rounded bg-background text-xs font-mono truncate">
                  {supabaseUrl}
                </code>
              </div>
            )}
          </div>
        )}

        {/* Validations */}
        {validations.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Validações:</p>
            <div className="space-y-2">
              {validations.map((validation, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-start gap-2 p-2 rounded-md text-sm transition-colors",
                    validation.status === 'success' && "bg-green-500/5",
                    validation.status === 'error' && "bg-destructive/5",
                    validation.status === 'pending' && "bg-muted/50"
                  )}
                >
                  {validation.status === 'success' && (
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  )}
                  {validation.status === 'error' && (
                    <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  )}
                  {validation.status === 'pending' && (
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-medium",
                      validation.status === 'success' && "text-green-500",
                      validation.status === 'error' && "text-destructive",
                      validation.status === 'pending' && "text-muted-foreground"
                    )}>
                      {validation.label}
                    </p>
                    {validation.message && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {validation.message}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Success Message */}
        {isConnected && validations.every(v => v.status === 'success') && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-500">
                Todas as validações foram bem-sucedidas!
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sua conexão com o Supabase está configurada corretamente.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
