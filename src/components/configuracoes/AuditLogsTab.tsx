import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, Eye, Download, Calendar, BarChart3 } from 'lucide-react';
import { useAuditLogs, type AuditLogFilters, type AuditLog } from '@/hooks/useAuditLogs';
import { useUsuarios } from '@/hooks/useUsuarios';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/utils/toastHelper';
import { AuditDashboard } from './AuditDashboard';

export function AuditLogsTab() {
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { logs, loading, totalCount } = useAuditLogs(filters);
  const { usuariosAtivos: usuarios } = useUsuarios();

  const handleFilterChange = (key: keyof AuditLogFilters, value: string) => {
    if (value === 'todos' || value === '') {
      const newFilters = { ...filters };
      delete newFilters[key];
      setFilters(newFilters);
    } else {
      setFilters({ ...filters, [key]: value });
    }
  };

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setShowDetailsModal(true);
  };

  const handleExportLogs = () => {
    try {
      const csvContent = [
        ['Data/Hora', 'Usuário', 'Ação', 'Tabela', 'Registro ID', 'Campos Alterados'].join(','),
        ...logs.map(log => [
          new Date(log.timestamp).toLocaleString('pt-BR'),
          log.usuario_nome || 'Sistema',
          log.acao,
          getNomeTabela(log.tabela),
          log.registro_id,
          log.campos_alterados?.join('; ') || 'N/A'
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `logs-auditoria-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      toast.success('Logs exportados com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar logs');
    }
  };

  const getNomeTabela = (tabela: string) => {
    const nomes: Record<string, string> = {
      'perfis': 'Usuários',
      'clientes': 'Clientes',
      'pedidos': 'Pedidos',
      'user_roles': 'Permissões',
      'produtos': 'Produtos',
      'categorias': 'Categorias',
    };
    return nomes[tabela] || tabela;
  };

  const getAcaoBadge = (acao: string) => {
    const configs = {
      'INSERT': { variant: 'default' as const, label: 'Criação', color: 'bg-green-500' },
      'UPDATE': { variant: 'secondary' as const, label: 'Atualização', color: 'bg-blue-500' },
      'DELETE': { variant: 'destructive' as const, label: 'Exclusão', color: 'bg-red-500' },
    };
    const config = configs[acao as keyof typeof configs] || configs.UPDATE;
    return (
      <Badge variant={config.variant} className="font-medium">
        {config.label}
      </Badge>
    );
  };

  const renderCampoAlterado = (campo: string, valorAntigo: any, valorNovo: any) => {
    // Campos sensíveis que não devem ser exibidos
    const camposSensiveis = ['senha', 'password', 'token', 'api_key'];
    if (camposSensiveis.includes(campo.toLowerCase())) {
      return <span className="text-muted-foreground italic">***********</span>;
    }

    const formatarValor = (valor: any) => {
      if (valor === null || valor === undefined) return 'vazio';
      if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não';
      if (typeof valor === 'object') return JSON.stringify(valor, null, 2);
      return String(valor);
    };

    return (
      <div className="space-y-1">
        <div className="flex gap-2 items-start">
          <span className="text-muted-foreground min-w-24">Anterior:</span>
          <span className="text-red-600 line-through">{formatarValor(valorAntigo)}</span>
        </div>
        <div className="flex gap-2 items-start">
          <span className="text-muted-foreground min-w-24">Novo:</span>
          <span className="text-green-600 font-medium">{formatarValor(valorNovo)}</span>
        </div>
      </div>
    );
  };

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.usuario_nome?.toLowerCase().includes(term) ||
      log.tabela.toLowerCase().includes(term) ||
      log.registro_id.toLowerCase().includes(term) ||
      getNomeTabela(log.tabela).toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="dashboard">
            <BarChart3 className="h-4 w-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="logs">
            <Calendar className="h-4 w-4 mr-2" />
            Logs Detalhados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <AuditDashboard />
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Logs de Auditoria</CardTitle>
              <CardDescription>
                Histórico completo de todas as alterações realizadas no sistema
              </CardDescription>
            </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">
                <Search className="h-4 w-4 inline mr-2" />
                Pesquisar
              </Label>
              <Input
                id="search"
                placeholder="Buscar por usuário, tabela..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tabela">
                <Filter className="h-4 w-4 inline mr-2" />
                Tabela
              </Label>
              <Select
                value={filters.tabela || 'todos'}
                onValueChange={(value) => handleFilterChange('tabela', value)}
              >
                <SelectTrigger id="tabela">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="perfis">Usuários</SelectItem>
                  <SelectItem value="clientes">Clientes</SelectItem>
                  <SelectItem value="pedidos">Pedidos</SelectItem>
                  <SelectItem value="user_roles">Permissões</SelectItem>
                  <SelectItem value="produtos">Produtos</SelectItem>
                  <SelectItem value="categorias">Categorias</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="acao">Ação</Label>
              <Select
                value={filters.acao || 'todos'}
                onValueChange={(value) => handleFilterChange('acao', value)}
              >
                <SelectTrigger id="acao">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="INSERT">Criação</SelectItem>
                  <SelectItem value="UPDATE">Atualização</SelectItem>
                  <SelectItem value="DELETE">Exclusão</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="usuario">Usuário</Label>
              <Select
                value={filters.usuario_id || 'todos'}
                onValueChange={(value) => handleFilterChange('usuario_id', value)}
              >
                <SelectTrigger id="usuario">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {usuarios.map((usuario) => (
                    <SelectItem key={usuario.id} value={usuario.id}>
                      {usuario.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {totalCount} registro{totalCount !== 1 ? 's' : ''} encontrado{totalCount !== 1 ? 's' : ''}
            </p>
            <Button onClick={handleExportLogs} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>

          {/* Lista de Logs */}
          <ScrollArea className="h-[600px] rounded-md border">
            <div className="divide-y">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">
                  Carregando logs...
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhum log encontrado com os filtros aplicados
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => handleViewDetails(log)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getAcaoBadge(log.acao)}
                          <Badge variant="outline">{getNomeTabela(log.tabela)}</Badge>
                          <span className="text-sm text-muted-foreground">
                            por {log.usuario_nome || 'Sistema'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3 inline mr-1" />
                          {formatDistanceToNow(new Date(log.timestamp), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                          {' • '}
                          {new Date(log.timestamp).toLocaleString('pt-BR')}
                        </p>
                        {log.campos_alterados && log.campos_alterados.length > 0 && (
                          <p className="text-sm">
                            <span className="text-muted-foreground">Campos alterados:</span>{' '}
                            <span className="font-medium">
                              {log.campos_alterados.join(', ')}
                            </span>
                          </p>
                        )}
                      </div>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Log de Auditoria</DialogTitle>
            <DialogDescription>
              Informações completas sobre a alteração realizada
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Ação</Label>
                  <div className="mt-1">{getAcaoBadge(selectedLog.acao)}</div>
                </div>
                <div>
                  <Label>Tabela</Label>
                  <p className="mt-1">{getNomeTabela(selectedLog.tabela)}</p>
                </div>
                <div>
                  <Label>Usuário</Label>
                  <p className="mt-1">{selectedLog.usuario_nome || 'Sistema'}</p>
                </div>
                <div>
                  <Label>Data/Hora</Label>
                  <p className="mt-1">{new Date(selectedLog.timestamp).toLocaleString('pt-BR')}</p>
                </div>
                <div className="col-span-2">
                  <Label>ID do Registro</Label>
                  <p className="mt-1 font-mono text-sm">{selectedLog.registro_id}</p>
                </div>
              </div>

              {selectedLog.acao === 'UPDATE' && selectedLog.campos_alterados && (
                <div className="space-y-3">
                  <Label className="text-lg">Alterações Realizadas</Label>
                  <div className="space-y-4 border rounded-lg p-4">
                    {selectedLog.campos_alterados.map((campo) => (
                      <div key={campo} className="border-b pb-3 last:border-0">
                        <Label className="text-base mb-2 block">{campo}</Label>
                        {renderCampoAlterado(
                          campo,
                          selectedLog.dados_anteriores?.[campo],
                          selectedLog.dados_novos?.[campo]
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedLog.acao === 'INSERT' && selectedLog.dados_novos && (
                <div className="space-y-3">
                  <Label className="text-lg">Dados Criados</Label>
                  <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                    {JSON.stringify(selectedLog.dados_novos, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.acao === 'DELETE' && selectedLog.dados_anteriores && (
                <div className="space-y-3">
                  <Label className="text-lg">Dados Excluídos</Label>
                  <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                    {JSON.stringify(selectedLog.dados_anteriores, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
