import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, TrendingUp, Users, FileText, AlertCircle } from 'lucide-react';
import { useAuditAnalytics } from '@/hooks/useAuditAnalytics';
import { useState } from 'react';

const COLORS = {
  INSERT: '#10b981',
  UPDATE: '#3b82f6',
  DELETE: '#ef4444',
};

const TABLE_COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#14b8a6'];

export function AuditDashboard() {
  const [periodo, setPeriodo] = useState<number>(30);
  const { analytics, loading } = useAuditAnalytics(periodo);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <Activity className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Carregando analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Erro ao carregar dados analíticos</p>
        </div>
      </div>
    );
  }

  const getNomeTabela = (tabela: string) => {
    const nomes: Record<string, string> = {
      'perfis': 'Usuários',
      'clientes': 'Clientes',
      'pedidos': 'Pedidos',
      'user_roles': 'Permissões',
      'user_permissions': 'Permissões',
      'produtos': 'Produtos',
      'categorias': 'Categorias',
    };
    return nomes[tabela] || tabela;
  };

  // Dados para gráfico de pizza de ações
  const acoesPieData = [
    { name: 'Criações', value: analytics.logsPorAcao.INSERT, color: COLORS.INSERT },
    { name: 'Atualizações', value: analytics.logsPorAcao.UPDATE, color: COLORS.UPDATE },
    { name: 'Exclusões', value: analytics.logsPorAcao.DELETE, color: COLORS.DELETE },
  ];

  // Dados para gráfico de barras de tabelas
  const tabelasBarData = analytics.tabelasMaisAlteradas.map(t => ({
    name: getNomeTabela(t.tabela),
    total: t.count,
  }));

  // Dados para gráfico de barras de usuários
  const usuariosBarData = analytics.usuariosMaisAtivos.map(u => ({
    name: u.usuario_nome,
    total: u.count,
  }));

  // Dados para timeline
  const timelineData = analytics.timelineData.map(t => ({
    data: new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    Criações: t.INSERT,
    Atualizações: t.UPDATE,
    Exclusões: t.DELETE,
  }));

  return (
    <div className="space-y-6">
      {/* Filtro de Período */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Dashboard de Auditoria</h3>
          <p className="text-sm text-muted-foreground">
            Análise de atividades e alterações do sistema
          </p>
        </div>
        <Select value={String(periodo)} onValueChange={(v) => setPeriodo(Number(v))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="365">Último ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Logs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalLogs.toLocaleString('pt-BR')}</div>
            <p className="text-xs text-muted-foreground">
              Registros de atividade
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Criações</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {analytics.logsPorAcao.INSERT.toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-muted-foreground">
              Novos registros criados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atualizações</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {analytics.logsPorAcao.UPDATE.toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-muted-foreground">
              Registros modificados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exclusões</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {analytics.logsPorAcao.DELETE.toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-muted-foreground">
              Registros excluídos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição de Ações */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Tipo de Ação</CardTitle>
            <CardDescription>Proporção de criações, atualizações e exclusões</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={acoesPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {acoesPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Timeline de Atividades */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline de Atividades</CardTitle>
            <CardDescription>Evolução das ações ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="data" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="Criações" stroke={COLORS.INSERT} strokeWidth={2} />
                <Line type="monotone" dataKey="Atualizações" stroke={COLORS.UPDATE} strokeWidth={2} />
                <Line type="monotone" dataKey="Exclusões" stroke={COLORS.DELETE} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tabelas Mais Alteradas */}
        <Card>
          <CardHeader>
            <CardTitle>Tabelas Mais Alteradas</CardTitle>
            <CardDescription>Top 5 tabelas com mais modificações</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tabelasBarData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="name" type="category" width={100} className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="total" radius={[0, 8, 8, 0]}>
                  {tabelasBarData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={TABLE_COLORS[index % TABLE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Usuários Mais Ativos */}
        <Card>
          <CardHeader>
            <CardTitle>Usuários Mais Ativos</CardTitle>
            <CardDescription>Top 5 usuários com mais ações realizadas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={usuariosBarData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" angle={-45} textAnchor="end" height={80} />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
