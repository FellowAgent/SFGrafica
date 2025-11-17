import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Plus, Edit, Trash2, CheckCircle2, AlertTriangle, Clock, Users } from 'lucide-react';
import { useAlertConfigs, type AlertConfig } from '@/hooks/useAlertConfigs';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function AlertConfigTab() {
  const { configs, history, loading, createConfig, updateConfig, deleteConfig, resolveAlert } = useAlertConfigs();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<AlertConfig | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveNotes, setResolveNotes] = useState('');

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    tipo_alerta: 'exclusoes_multiplas',
    tabela: null as string | null,
    acao: 'DELETE' as string | null,
    threshold_count: 5,
    threshold_minutes: 10,
    severidade: 'medium',
    ativo: true,
    usuarios_monitorados: null as string[] | null,
    notificar_usuarios: null as string[] | null,
  });

  const handleCreateOrUpdate = async () => {
    try {
      if (selectedConfig) {
        await updateConfig(selectedConfig.id, formData);
      } else {
        await createConfig(formData);
      }
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      tipo_alerta: 'exclusoes_multiplas',
      tabela: null,
      acao: 'DELETE',
      threshold_count: 5,
      threshold_minutes: 10,
      severidade: 'medium',
      ativo: true,
      usuarios_monitorados: null,
      notificar_usuarios: null,
    });
    setSelectedConfig(null);
  };

  const handleEdit = (config: AlertConfig) => {
    setSelectedConfig(config);
    setFormData(config);
    setShowCreateModal(true);
  };

  const handleResolve = async () => {
    if (!selectedAlert) return;
    await resolveAlert(selectedAlert.id, resolveNotes);
    setShowResolveModal(false);
    setSelectedAlert(null);
    setResolveNotes('');
  };

  const getSeveridadeBadge = (severidade: string) => {
    const configs = {
      low: { variant: 'secondary' as const, label: 'Baixa', icon: Bell },
      medium: { variant: 'default' as const, label: 'Média', icon: AlertTriangle },
      high: { variant: 'destructive' as const, label: 'Alta', icon: AlertTriangle },
      critical: { variant: 'destructive' as const, label: 'Crítica', icon: AlertTriangle },
    };
    const config = configs[severidade as keyof typeof configs] || configs.medium;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getNomeTabela = (tabela: string | null) => {
    if (!tabela) return 'Todas';
    const nomes: Record<string, string> = {
      'perfis': 'Usuários',
      'clientes': 'Clientes',
      'pedidos': 'Pedidos',
      'user_roles': 'Permissões',
      'produtos': 'Produtos',
    };
    return nomes[tabela] || tabela;
  };

  if (loading) {
    return <div className="p-8 text-center">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="configs" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="configs">
            <Bell className="h-4 w-4 mr-2" />
            Configurações
          </TabsTrigger>
          <TabsTrigger value="history">
            <Clock className="h-4 w-4 mr-2" />
            Histórico
          </TabsTrigger>
        </TabsList>

        {/* Configurações de Alertas */}
        <TabsContent value="configs" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Configurações de Alertas</CardTitle>
                  <CardDescription>
                    Configure alertas automáticos para monitorar atividades críticas
                  </CardDescription>
                </div>
                <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                  <DialogTrigger asChild>
                    <Button onClick={resetForm}>
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Alerta
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {selectedConfig ? 'Editar Alerta' : 'Novo Alerta'}
                      </DialogTitle>
                      <DialogDescription>
                        Configure as condições para disparar o alerta
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <Label htmlFor="nome">Nome do Alerta *</Label>
                          <Input
                            id="nome"
                            value={formData.nome}
                            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                            placeholder="Ex: Múltiplas exclusões detectadas"
                          />
                        </div>

                        <div className="col-span-2">
                          <Label htmlFor="descricao">Descrição</Label>
                          <Textarea
                            id="descricao"
                            value={formData.descricao || ''}
                            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                            placeholder="Descrição do alerta"
                          />
                        </div>

                        <div>
                          <Label htmlFor="tipo">Tipo de Alerta</Label>
                          <Select
                            value={formData.tipo_alerta}
                            onValueChange={(v) => setFormData({ ...formData, tipo_alerta: v })}
                          >
                            <SelectTrigger id="tipo">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="exclusoes_multiplas">Exclusões Múltiplas</SelectItem>
                              <SelectItem value="mudancas_permissoes">Mudanças de Permissões</SelectItem>
                              <SelectItem value="atividade_suspeita">Atividade Suspeita</SelectItem>
                              <SelectItem value="customizado">Customizado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="severidade">Severidade</Label>
                          <Select
                            value={formData.severidade}
                            onValueChange={(v) => setFormData({ ...formData, severidade: v })}
                          >
                            <SelectTrigger id="severidade">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Baixa</SelectItem>
                              <SelectItem value="medium">Média</SelectItem>
                              <SelectItem value="high">Alta</SelectItem>
                              <SelectItem value="critical">Crítica</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="tabela">Tabela</Label>
                          <Select
                            value={formData.tabela || 'todas'}
                            onValueChange={(v) => setFormData({ ...formData, tabela: v === 'todas' ? null : v })}
                          >
                            <SelectTrigger id="tabela">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todas">Todas</SelectItem>
                              <SelectItem value="pedidos">Pedidos</SelectItem>
                              <SelectItem value="clientes">Clientes</SelectItem>
                              <SelectItem value="perfis">Usuários</SelectItem>
                              <SelectItem value="user_roles">Permissões</SelectItem>
                              <SelectItem value="produtos">Produtos</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="acao">Ação</Label>
                          <Select
                            value={formData.acao || 'todas'}
                            onValueChange={(v) => setFormData({ ...formData, acao: v === 'todas' ? null : v })}
                          >
                            <SelectTrigger id="acao">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todas">Todas</SelectItem>
                              <SelectItem value="INSERT">Criação</SelectItem>
                              <SelectItem value="UPDATE">Atualização</SelectItem>
                              <SelectItem value="DELETE">Exclusão</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="threshold_count">Número de Ações</Label>
                          <Input
                            id="threshold_count"
                            type="number"
                            min="1"
                            value={formData.threshold_count || ''}
                            onChange={(e) => setFormData({ ...formData, threshold_count: parseInt(e.target.value) })}
                          />
                        </div>

                        <div>
                          <Label htmlFor="threshold_minutes">Período (minutos)</Label>
                          <Input
                            id="threshold_minutes"
                            type="number"
                            min="1"
                            value={formData.threshold_minutes || ''}
                            onChange={(e) => setFormData({ ...formData, threshold_minutes: parseInt(e.target.value) })}
                          />
                        </div>

                        <div className="col-span-2 flex items-center gap-2">
                          <Switch
                            id="ativo"
                            checked={formData.ativo}
                            onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                          />
                          <Label htmlFor="ativo">Alerta ativo</Label>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleCreateOrUpdate}>
                          {selectedConfig ? 'Atualizar' : 'Criar'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {configs.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground">
                      Nenhuma configuração de alerta cadastrada
                    </div>
                  ) : (
                    configs.map((config) => (
                      <Card key={config.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{config.nome}</h4>
                              {getSeveridadeBadge(config.severidade)}
                              {config.ativo ? (
                                <Badge variant="outline" className="text-green-600">Ativo</Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground">Inativo</Badge>
                              )}
                            </div>
                            {config.descricao && (
                              <p className="text-sm text-muted-foreground mb-2">{config.descricao}</p>
                            )}
                            <div className="flex flex-wrap gap-2 text-sm">
                              <Badge variant="secondary">{getNomeTabela(config.tabela)}</Badge>
                              <Badge variant="secondary">
                                {config.acao || 'Todas ações'}
                              </Badge>
                              <span className="text-muted-foreground">
                                {config.threshold_count} ações em {config.threshold_minutes} min
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(config)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteConfig(config.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Histórico de Alertas */}
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Alertas Disparados</CardTitle>
              <CardDescription>
                Registro de todos os alertas que foram acionados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {history.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground">
                      Nenhum alerta foi disparado ainda
                    </div>
                  ) : (
                    history.map((alert) => (
                      <Card
                        key={alert.id}
                        className={`p-4 ${alert.resolvido ? 'opacity-60' : 'border-l-4 border-l-destructive'}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">
                                {alert.detalhes?.nome_alerta || 'Alerta'}
                              </h4>
                              {getSeveridadeBadge(alert.detalhes?.severidade || 'medium')}
                              {alert.resolvido && (
                                <Badge variant="outline" className="text-green-600 gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Resolvido
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              <strong>{alert.contagem_acoes}</strong> ações detectadas em{' '}
                              <strong>{alert.periodo_minutos}</strong> minutos
                            </p>
                            <p className="text-xs text-muted-foreground">
                              <Clock className="h-3 w-3 inline mr-1" />
                              {formatDistanceToNow(new Date(alert.disparado_em), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </p>
                            {alert.usuarios_envolvidos && (
                              <div className="mt-2 flex items-center gap-1 text-xs">
                                <Users className="h-3 w-3" />
                                <span className="text-muted-foreground">
                                  Usuários envolvidos: {JSON.parse(JSON.stringify(alert.usuarios_envolvidos)).length}
                                </span>
                              </div>
                            )}
                          </div>
                          {!alert.resolvido && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedAlert(alert);
                                setShowResolveModal(true);
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Resolver
                            </Button>
                          )}
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Resolver Alerta */}
      <Dialog open={showResolveModal} onOpenChange={setShowResolveModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolver Alerta</DialogTitle>
            <DialogDescription>
              Marque este alerta como resolvido e adicione observações
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="notas">Observações (opcional)</Label>
              <Textarea
                id="notas"
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                placeholder="Descreva como o problema foi resolvido..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowResolveModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleResolve}>
                Marcar como Resolvido
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
