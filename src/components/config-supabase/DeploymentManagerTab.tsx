import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/utils/toastHelper';
import { 
  Plus, 
  Server, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Trash2,
  RefreshCw,
  Send,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';

interface DeploymentTarget {
  id: string;
  name: string;
  description: string;
  supabase_url: string;
  current_version: string | null;
  last_sync_at: string | null;
  status: string;
  created_at: string;
}

export function DeploymentManagerTab() {
  const [targets, setTargets] = useState<DeploymentTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [migrations, setMigrations] = useState<any[]>([]);
  const [selectedMigration, setSelectedMigration] = useState<string | null>(null);
  const [deploying, setDeploying] = useState(false);

  const [newTarget, setNewTarget] = useState({
    name: '',
    description: '',
    supabase_url: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [targetsRes, migrationsRes] = await Promise.all([
        supabase
          .from('deployment_targets')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('migration_history')
          .select('*')
          .eq('status', 'completed')
          .order('executed_at', { ascending: false })
          .limit(20)
      ]);

      if (targetsRes.data) setTargets(targetsRes.data);
      if (migrationsRes.data) setMigrations(migrationsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTarget = async () => {
    if (!newTarget.name || !newTarget.supabase_url) {
      toast.error('Nome e URL são obrigatórios');
      return;
    }

    try {
      const { error } = await supabase
        .from('deployment_targets')
        .insert([newTarget]);

      if (error) throw error;

      toast.success('Ambiente adicionado com sucesso');
      setShowAddDialog(false);
      setNewTarget({ name: '', description: '', supabase_url: '' });
      await loadData();
    } catch (error: any) {
      console.error('Error adding target:', error);
      toast.error('Erro ao adicionar ambiente', {
        description: error.message
      });
    }
  };

  const handleDeleteTarget = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este ambiente?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('deployment_targets')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Ambiente removido');
      await loadData();
    } catch (error: any) {
      console.error('Error deleting target:', error);
      toast.error('Erro ao remover ambiente', {
        description: error.message
      });
    }
  };

  const handleDeploy = async (dryRun: boolean = false) => {
    if (selectedTargets.length === 0) {
      toast.error('Selecione pelo menos um ambiente');
      return;
    }

    if (!selectedMigration) {
      toast.error('Selecione uma migração');
      return;
    }

    setDeploying(true);

    try {
      const { data, error } = await supabase.functions.invoke('deploy-migration', {
        body: {
          targetIds: selectedTargets,
          migrationId: selectedMigration,
          dryRun
        }
      });

      if (error) throw error;

      const { summary, results } = data;

      if (summary.failed > 0) {
        toast.warning('Deploy concluído com erros', {
          description: `${summary.successful} sucesso, ${summary.failed} falhas`
        });
      } else {
        toast.success(dryRun ? 'Dry run concluído' : 'Deploy realizado com sucesso', {
          description: `${summary.successful} ambiente(s) atualizado(s)`
        });
      }

      console.log('Deploy results:', results);

      if (!dryRun) {
        setShowDeployDialog(false);
        setSelectedTargets([]);
        setSelectedMigration(null);
        await loadData();
      }
    } catch (error: any) {
      console.error('Error deploying:', error);
      toast.error('Erro ao fazer deploy', {
        description: error.message
      });
    } finally {
      setDeploying(false);
    }
  };

  const toggleTargetSelection = (id: string) => {
    setSelectedTargets(prev =>
      prev.includes(id)
        ? prev.filter(t => t !== id)
        : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Deploy Multi-Ambiente</h2>
          <p className="text-muted-foreground">
            Gerencie ambientes e sincronize migrações
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => loadData()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Ambiente
          </Button>
        </div>
      </div>

      {/* Ambientes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Ambientes Configurados
          </CardTitle>
          <CardDescription>
            {targets.length} ambiente(s) registrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : targets.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Nenhum ambiente configurado. Adicione um ambiente para começar.
              </AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Selecionar</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Versão Atual</TableHead>
                  <TableHead>Última Sinc.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {targets.map((target) => (
                  <TableRow key={target.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedTargets.includes(target.id)}
                        onCheckedChange={() => toggleTargetSelection(target.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{target.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {target.supabase_url}
                    </TableCell>
                    <TableCell>
                      {target.current_version ? (
                        <Badge variant="outline">{target.current_version}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Não sincronizado</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {target.last_sync_at ? (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(target.last_sync_at), 'dd/MM/yyyy HH:mm')}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Nunca</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {target.status === 'active' ? (
                        <Badge className="bg-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          {target.status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTarget(target.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {targets.length > 0 && (
            <div className="mt-4 flex justify-end">
              <Button
                onClick={() => setShowDeployDialog(true)}
                disabled={selectedTargets.length === 0}
              >
                <Send className="h-4 w-4 mr-2" />
                Deploy para Selecionados ({selectedTargets.length})
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Adicionar Ambiente */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Ambiente</DialogTitle>
            <DialogDescription>
              Configure um novo ambiente para deploy de migrações
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                placeholder="ex: Produção, Staging, QA"
                value={newTarget.name}
                onChange={(e) => setNewTarget({ ...newTarget, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">Supabase URL *</Label>
              <Input
                id="url"
                placeholder="https://xxxxx.supabase.co"
                value={newTarget.supabase_url}
                onChange={(e) => setNewTarget({ ...newTarget, supabase_url: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descreva este ambiente..."
                value={newTarget.description}
                onChange={(e) => setNewTarget({ ...newTarget, description: e.target.value })}
                rows={3}
              />
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Nota de Segurança:</strong> A Service Role Key do ambiente alvo não é armazenada.
                Para deploys automáticos em produção, implemente autenticação segura.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddTarget}>
              Adicionar Ambiente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Deploy */}
      <Dialog open={showDeployDialog} onOpenChange={setShowDeployDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Deploy de Migração</DialogTitle>
            <DialogDescription>
              Selecione uma migração para aplicar nos ambientes selecionados
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ambientes Selecionados</Label>
              <div className="flex flex-wrap gap-2">
                {selectedTargets.map(id => {
                  const target = targets.find(t => t.id === id);
                  return target ? (
                    <Badge key={id} variant="secondary">
                      {target.name}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Migração</Label>
              <div className="max-h-64 overflow-y-auto border rounded-lg">
                {migrations.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    Nenhuma migração concluída disponível
                  </div>
                ) : (
                  migrations.map((migration) => (
                    <div
                      key={migration.id}
                      className={`p-3 border-b cursor-pointer hover:bg-accent transition-colors ${
                        selectedMigration === migration.id ? 'bg-accent' : ''
                      }`}
                      onClick={() => setSelectedMigration(migration.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{migration.migration_name}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {format(new Date(migration.executed_at), 'dd/MM/yyyy HH:mm')}
                            {migration.schema_version_after && (
                              <> • Versão: {migration.schema_version_after}</>
                            )}
                          </div>
                        </div>
                        {selectedMigration === migration.id && (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDeployDialog(false)}
              disabled={deploying}
            >
              Cancelar
            </Button>
            <Button
              variant="outline"
              onClick={() => handleDeploy(true)}
              disabled={deploying || !selectedMigration}
            >
              Dry Run
            </Button>
            <Button
              onClick={() => handleDeploy(false)}
              disabled={deploying || !selectedMigration}
            >
              {deploying ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Deploy
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
