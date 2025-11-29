import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSchemaVersion } from '@/hooks/useSchemaVersion';
import { useSchemaDrift } from '@/hooks/useSchemaDrift';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Database, 
  GitBranch,
  Shield,
  Activity,
  Clock,
  TrendingUp,
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/utils/toastHelper';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';

export function SchemaStatusTab() {
  const { 
    currentVersion, 
    versionStatus, 
    updateAvailable, 
    checking, 
    loading,
    checkVersion, 
    createVersion,
    listVersions 
  } = useSchemaVersion();

  const { 
    driftStatus, 
    detecting, 
    detectDrift,
    loadDriftLogs 
  } = useSchemaDrift();

  const [versions, setVersions] = useState<any[]>([]);
  const [driftLogs, setDriftLogs] = useState<any[]>([]);
  const [showCreateVersion, setShowCreateVersion] = useState(false);
  const [newVersion, setNewVersion] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [versionsList, driftLogsList] = await Promise.all([
      listVersions(),
      loadDriftLogs()
    ]);
    setVersions(versionsList);
    setDriftLogs(driftLogsList);
  };

  const handleCreateVersion = async () => {
    if (!newVersion.trim()) {
      toast.error('Versão é obrigatória');
      return;
    }

    setCreating(true);
    try {
      await createVersion(newVersion.trim(), newDescription.trim());
      setShowCreateVersion(false);
      setNewVersion('');
      setNewDescription('');
      await loadData();
    } catch (error) {
      // Error already handled in hook
    } finally {
      setCreating(false);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([
      checkVersion(),
      detectDrift(),
      loadData()
    ]);
    toast.success('Status atualizado');
  };

  const getHealthStatus = () => {
    if (driftStatus?.hasDrift) {
      return {
        status: 'error',
        icon: XCircle,
        label: 'Schema com Drift',
        color: 'text-destructive'
      };
    }
    if (updateAvailable) {
      return {
        status: 'warning',
        icon: AlertTriangle,
        label: 'Atualização Disponível',
        color: 'text-yellow-600'
      };
    }
    if (currentVersion) {
      return {
        status: 'ok',
        icon: CheckCircle2,
        label: 'Schema Sincronizado',
        color: 'text-green-600'
      };
    }
    return {
      status: 'unknown',
      icon: Info,
      label: 'Sem Versão Registrada',
      color: 'text-muted-foreground'
    };
  };

  const health = getHealthStatus();
  const HealthIcon = health.icon;

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Status do Schema</h2>
          <p className="text-muted-foreground">
            Monitore versões, drift e saúde do banco de dados
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleRefresh} 
            variant="outline"
            disabled={checking || detecting}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${(checking || detecting) ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button onClick={() => setShowCreateVersion(true)}>
            <GitBranch className="h-4 w-4 mr-2" />
            Criar Versão
          </Button>
        </div>
      </div>

      {/* Status Geral */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Status Geral
              </CardTitle>
              <CardDescription>Visão geral da saúde do schema</CardDescription>
            </div>
            <HealthIcon className={`h-8 w-8 ${health.color}`} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <Badge variant={health.status === 'ok' ? 'default' : health.status === 'error' ? 'destructive' : 'secondary'}>
                {health.label}
              </Badge>
            </div>
            
            {currentVersion && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Versão Atual</span>
                  <span className="text-sm font-mono">{currentVersion.version}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Aplicada em</span>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(currentVersion.applied_at), 'dd/MM/yyyy HH:mm')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Checksum</span>
                  <span className="text-xs font-mono text-muted-foreground">
                    {currentVersion.checksum.substring(0, 16)}...
                  </span>
                </div>
              </>
            )}

            {!currentVersion && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Nenhuma versão registrada</AlertTitle>
                <AlertDescription>
                  Crie uma versão baseline para começar a rastrear mudanças no schema.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Drift Detection */}
      {driftStatus && driftStatus.hasDrift && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Schema Drift Detectado!</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-2">
              <p>{driftStatus.message}</p>
              {driftStatus.severity && (
                <Badge variant="outline">
                  Severidade: {driftStatus.severity}
                </Badge>
              )}
              {driftStatus.differences && (
                <div className="mt-3 space-y-1 text-sm">
                  {driftStatus.differences.tables.added.length > 0 && (
                    <div>
                      <strong>Tabelas adicionadas:</strong> {driftStatus.differences.tables.added.join(', ')}
                    </div>
                  )}
                  {driftStatus.differences.tables.removed.length > 0 && (
                    <div>
                      <strong>Tabelas removidas:</strong> {driftStatus.differences.tables.removed.join(', ')}
                    </div>
                  )}
                  {driftStatus.differences.functions.added.length > 0 && (
                    <div>
                      <strong>Funções adicionadas:</strong> {driftStatus.differences.functions.added.join(', ')}
                    </div>
                  )}
                  {driftStatus.differences.functions.removed.length > 0 && (
                    <div>
                      <strong>Funções removidas:</strong> {driftStatus.differences.functions.removed.join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Histórico de Versões */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Histórico de Versões
            </CardTitle>
            <CardDescription>
              {versions.length} versões registradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {versions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma versão registrada</p>
              ) : (
                versions.slice(0, 5).map((version) => (
                  <div 
                    key={version.id}
                    className="flex items-start justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold">{version.version}</span>
                        {version.is_current && (
                          <Badge variant="default" className="text-xs">Atual</Badge>
                        )}
                      </div>
                      {version.description && (
                        <p className="text-sm text-muted-foreground">{version.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {format(new Date(version.applied_at), 'dd/MM/yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Logs de Drift */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Logs de Drift
            </CardTitle>
            <CardDescription>
              {driftLogs.filter(d => !d.resolved).length} pendentes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {driftLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum drift detectado</p>
              ) : (
                driftLogs.slice(0, 5).map((log) => (
                  <div 
                    key={log.id}
                    className="flex items-start justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        {log.resolved ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        )}
                        <span className="text-sm font-medium">
                          {log.resolved ? 'Resolvido' : 'Pendente'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Versão esperada: {log.expected_version}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {format(new Date(log.detected_at), 'dd/MM/yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Health Checks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Health Checks
          </CardTitle>
          <CardDescription>Verificações de integridade do schema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <HealthCheckItem 
              label="Schema Drift" 
              status={driftStatus?.hasDrift ? 'error' : 'ok'}
              description={driftStatus?.message || 'Schema sincronizado'}
            />
            <HealthCheckItem 
              label="Versão Registrada" 
              status={currentVersion ? 'ok' : 'warning'}
              description={currentVersion ? `Versão ${currentVersion.version}` : 'Nenhuma versão registrada'}
            />
            <HealthCheckItem 
              label="Atualizações Pendentes" 
              status={updateAvailable ? 'warning' : 'ok'}
              description={updateAvailable ? 'Schema modificado' : 'Nenhuma atualização pendente'}
            />
          </div>
        </CardContent>
      </Card>

      {/* Dialog Criar Versão */}
      <Dialog open={showCreateVersion} onOpenChange={setShowCreateVersion}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Versão do Schema</DialogTitle>
            <DialogDescription>
              Registre o estado atual do schema como uma nova versão
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="version">Versão *</Label>
              <Input
                id="version"
                placeholder="ex: 1.0.0, 1.1.0"
                value={newVersion}
                onChange={(e) => setNewVersion(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Use versionamento semântico (MAJOR.MINOR.PATCH)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descreva as mudanças incluídas nesta versão..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCreateVersion(false)}
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateVersion} disabled={creating}>
              {creating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <GitBranch className="h-4 w-4 mr-2" />
                  Criar Versão
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface HealthCheckItemProps {
  label: string;
  status: 'ok' | 'warning' | 'error';
  description: string;
}

function HealthCheckItem({ label, status, description }: HealthCheckItemProps) {
  const icons = {
    ok: CheckCircle2,
    warning: AlertTriangle,
    error: XCircle
  };

  const colors = {
    ok: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-destructive'
  };

  const Icon = icons[status];

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
      <Icon className={`h-5 w-5 ${colors[status]} mt-0.5`} />
      <div className="flex-1">
        <p className="font-medium text-sm">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
