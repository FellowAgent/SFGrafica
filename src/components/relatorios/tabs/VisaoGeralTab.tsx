import { MetricCard } from "../MetricCard";
import { ChartContainer } from "../ChartContainer";
import { ExportButton } from "../ExportButton";
import { DraggableContainer } from "../DraggableContainer";
import { DraggableCard } from "../DraggableCard";
import { CardDefinition } from "@/hooks/useReportLayout";
import { DollarSign, ShoppingCart, TrendingUp, Users, Target, Percent } from "lucide-react";
import { useRelatorioData } from "@/hooks/useRelatorioData";
import { usePeriodComparison } from "@/hooks/usePeriodComparison";
import { DateRange } from "react-day-picker";
import { useMemo } from "react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { chartColors, formatDate } from "@/utils/chartHelpers";
import { calcularTicketMedio, calcularTaxaConversao } from "@/utils/metricsCalculations";
import { exportarVisaoGeral } from "@/utils/exportRelatorios";
import { toast } from "@/utils/toastHelper";
import { ReportPageSkeleton } from "@/components/ui/skeleton-loaders";

interface VisaoGeralTabProps {
  dateRange: DateRange | undefined;
  compareEnabled: boolean;
}

export function VisaoGeralTab({ dateRange, compareEnabled }: VisaoGeralTabProps) {
  const { pedidos, itensPedido, loading } = useRelatorioData({ dateRange });
  const { compareMetrics } = usePeriodComparison(dateRange, compareEnabled);

  // Cálculos de métricas
  const metrics = useMemo(() => {
    const totalVendas = pedidos.reduce((sum, p) => sum + (Number(p.valor_final) || 0), 0);
    const numeroPedidos = pedidos.length;
    const produtosVendidos = itensPedido.reduce((sum, item) => sum + (item.quantidade || 0), 0);
    const ticketMedio = calcularTicketMedio(totalVendas, numeroPedidos);
    const pedidosFinalizados = pedidos.filter(p => p.status?.toLowerCase().includes('finalizado')).length;
    const taxaConversao = calcularTaxaConversao(pedidosFinalizados, numeroPedidos);
    
    const clientesNovos = new Set(pedidos.map(p => p.cliente_id)).size;
    
    return {
      totalVendas,
      numeroPedidos,
      ticketMedio,
      produtosVendidos,
      taxaConversao,
      clientesNovos,
    };
  }, [pedidos, itensPedido]);

  // Dados para gráfico de evolução de vendas
  const vendasPorDia = useMemo(() => {
    const groupedByDate = pedidos.reduce((acc, pedido) => {
      const date = new Date(pedido.created_at).toLocaleDateString('pt-BR');
      if (!acc[date]) {
        acc[date] = { date, total: 0, quantidade: 0 };
      }
      acc[date].total += Number(pedido.valor_final) || 0;
      acc[date].quantidade += 1;
      return acc;
    }, {} as Record<string, { date: string; total: number; quantidade: number }>);

    return Object.values(groupedByDate).sort((a, b) => {
      const [diaA, mesA, anoA] = a.date.split('/');
      const [diaB, mesB, anoB] = b.date.split('/');
      return new Date(`${anoA}-${mesA}-${diaA}`).getTime() - new Date(`${anoB}-${mesB}-${diaB}`).getTime();
    });
  }, [pedidos]);

  // Dados para gráfico de status
  const pedidosPorStatus = useMemo(() => {
    const statusCount = pedidos.reduce((acc, pedido) => {
      const status = pedido.status || 'Sem Status';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusCount).map(([name, value]) => ({ name, value }));
  }, [pedidos]);

  // Dados para meios de pagamento
  const meioPagamento = useMemo(() => {
    const meioCount = pedidos.reduce((acc, pedido) => {
      const meio = pedido.meio_pagamento || 'Não informado';
      acc[meio] = (acc[meio] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(meioCount).map(([name, value]) => ({ name, value }));
  }, [pedidos]);

  // Top 5 produtos
  const topProdutos = useMemo(() => {
    const produtoStats = itensPedido.reduce((acc, item) => {
      const produtoNome = item.produto?.nome || 'Produto sem nome';
      if (!acc[produtoNome]) {
        acc[produtoNome] = { quantidade: 0, valor: 0 };
      }
      acc[produtoNome].quantidade += item.quantidade || 0;
      acc[produtoNome].valor += Number(item.subtotal) || 0;
      return acc;
    }, {} as Record<string, { quantidade: number; valor: number }>);

    return Object.entries(produtoStats)
      .map(([nome, stats]) => ({ nome, ...stats }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);
  }, [itensPedido]);

  const COLORS = [chartColors.chart1, chartColors.chart2, chartColors.chart3, chartColors.chart4, chartColors.chart5];

  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    const periodo = dateRange?.from && dateRange?.to 
      ? `${formatDate(dateRange.from)} até ${formatDate(dateRange.to)}`
      : 'Todos os períodos';
    
    exportarVisaoGeral(format, {
      totalVendas: metrics.totalVendas,
      numeroPedidos: metrics.numeroPedidos,
      ticketMedio: metrics.ticketMedio,
      clientesAtivos: metrics.clientesNovos,
      produtosVendidos: metrics.produtosVendidos,
      taxaConversao: metrics.taxaConversao,
    }, periodo);
    
    toast.success(`Relatório de Visão Geral exportado em ${format.toUpperCase()}!`);
  };

  // IDs dos cards para drag and drop
  const cardIds = [
    'kpis',
    'evolucao-vendas',
    'pedidos-status',
    'meios-pagamento',
    'pedidos-tempo',
    'top-produtos',
  ];

  const cardDefinitions: CardDefinition[] = [
    { id: 'kpis', label: 'Métricas Gerais', description: 'KPIs principais do negócio' },
    { id: 'evolucao-vendas', label: 'Evolução de Vendas', description: 'Gráfico temporal' },
    { id: 'pedidos-status', label: 'Pedidos por Status', description: 'Distribuição de status' },
    { id: 'meios-pagamento', label: 'Meios de Pagamento', description: 'Formas de pagamento' },
    { id: 'pedidos-tempo', label: 'Pedidos ao Longo do Tempo', description: 'Linha do tempo' },
    { id: 'top-produtos', label: 'Top 10 Produtos', description: 'Produtos mais vendidos' },
  ];

  if (loading) {
    return <ReportPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho com botão de exportação */}
      <div className="flex justify-end">
        <ExportButton onExport={handleExport} disabled={loading} />
      </div>

      <DraggableContainer tabName="visao-geral" cardIds={cardIds} cardDefinitions={cardDefinitions}>
        {/* KPIs */}
        <DraggableCard id="kpis">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              title="Total de Vendas"
              value={metrics.totalVendas}
              icon={DollarSign}
              type="currency"
              loading={loading}
            />
            <MetricCard
              title="Número de Pedidos"
              value={metrics.numeroPedidos}
              icon={ShoppingCart}
              type="number"
              loading={loading}
            />
            <MetricCard
              title="Ticket Médio"
              value={metrics.ticketMedio}
              icon={TrendingUp}
              type="currency"
              loading={loading}
            />
            <MetricCard
              title="Produtos Vendidos"
              value={metrics.produtosVendidos}
              icon={Target}
              type="number"
              loading={loading}
            />
            <MetricCard
              title="Taxa de Conversão"
              value={metrics.taxaConversao}
              icon={Percent}
              type="percent"
              loading={loading}
            />
            <MetricCard
              title="Clientes Únicos"
              value={metrics.clientesNovos}
              icon={Users}
              type="number"
              loading={loading}
            />
          </div>
        </DraggableCard>

        {/* Evolução de Vendas */}
        <DraggableCard id="evolucao-vendas">
          <ChartContainer
            title="Evolução de Vendas"
            description="Vendas ao longo do período"
            loading={loading}
            empty={vendasPorDia.length === 0}
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={vendasPorDia}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Legend />
                <Line type="monotone" dataKey="total" stroke={chartColors.primary} name="Valor Total" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </DraggableCard>

        {/* Pedidos por Status */}
        <DraggableCard id="pedidos-status">
          <ChartContainer
            title="Pedidos por Status"
            description="Distribuição de pedidos"
            loading={loading}
            empty={pedidosPorStatus.length === 0}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={pedidosPorStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="value" fill={chartColors.chart1} name="Quantidade" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </DraggableCard>

        {/* Meios de Pagamento */}
        <DraggableCard id="meios-pagamento">
          <ChartContainer
            title="Meios de Pagamento"
            description="Distribuição de pagamentos"
            loading={loading}
            empty={meioPagamento.length === 0}
          >
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={meioPagamento}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => entry.name}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {meioPagamento.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </DraggableCard>

        {/* Pedidos ao Longo do Tempo */}
        <DraggableCard id="pedidos-tempo">
          <ChartContainer
            title="Número de Pedidos ao Longo do Tempo"
            description="Volume de pedidos"
            loading={loading}
            empty={vendasPorDia.length === 0}
          >
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={vendasPorDia}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Area type="monotone" dataKey="quantidade" stroke={chartColors.chart2} fill={chartColors.chart2} fillOpacity={0.6} name="Pedidos" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </DraggableCard>

        {/* Top 5 Produtos */}
        <DraggableCard id="top-produtos">
          <ChartContainer
            title="Top 5 Produtos Mais Vendidos"
            description="Produtos com maior faturamento"
            loading={loading}
            empty={topProdutos.length === 0}
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 font-semibold text-foreground">Produto</th>
                    <th className="text-right p-3 font-semibold text-foreground">Quantidade</th>
                    <th className="text-right p-3 font-semibold text-foreground">Valor Total</th>
                  </tr>
                </thead>
                <tbody>
                  {topProdutos.map((produto, index) => (
                    <tr key={index} className="border-b border-border hover:bg-muted/50">
                      <td className="p-3 text-foreground">{produto.nome}</td>
                      <td className="p-3 text-right text-foreground">{produto.quantidade}</td>
                      <td className="p-3 text-right text-foreground">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartContainer>
        </DraggableCard>
      </DraggableContainer>
    </div>
  );
}
