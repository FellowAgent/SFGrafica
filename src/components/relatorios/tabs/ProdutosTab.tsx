import { MetricCard } from "../MetricCard";
import { ChartContainer } from "../ChartContainer";
import { ExportButton } from "../ExportButton";
import { DraggableCard } from "../DraggableCard";
import { DraggableContainer } from "../DraggableContainer";
import { CardDefinition } from "@/hooks/useReportLayout";
import { Package, TrendingUp, AlertTriangle, DollarSign } from "lucide-react";
import { useRelatorioData } from "@/hooks/useRelatorioData";
import { DateRange } from "react-day-picker";
import { useMemo } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from "recharts";
import { chartColors, formatDate } from "@/utils/chartHelpers";
import { exportarProdutosRelatorio } from "@/utils/exportRelatorios";
import { toast } from "@/utils/toastHelper";

interface ProdutosTabProps {
  dateRange: DateRange | undefined;
  compareEnabled: boolean;
}

export function ProdutosTab({ dateRange, compareEnabled }: ProdutosTabProps) {
  const { produtos, itensPedido, loading } = useRelatorioData({ dateRange });

  const metrics = useMemo(() => {
    const totalProdutos = produtos.length;
    const produtosAtivos = produtos.filter(p => p.ativo).length;
    const produtosEstoqueBaixo = produtos.filter(p => p.estoque < p.estoque_minimo).length;
    const valorTotalEstoque = produtos.reduce((sum, p) => sum + (Number(p.custo) * p.estoque), 0);

    const produtoMaisVendido = itensPedido.reduce((acc, item) => {
      const nomeProduto = item.produto?.nome || 'Sem nome';
      acc[nomeProduto] = (acc[nomeProduto] || 0) + (item.quantidade || 0);
      return acc;
    }, {} as Record<string, number>);

    const topProduto = Object.entries(produtoMaisVendido).sort(([, a], [, b]) => b - a)[0];

    return {
      totalProdutos,
      produtosAtivos,
      produtosEstoqueBaixo,
      valorTotalEstoque,
      produtoMaisVendido: topProduto?.[0] || 'N/A',
    };
  }, [produtos, itensPedido]);

  // Top produtos mais vendidos
  const topProdutosVendidos = useMemo(() => {
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
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 20);
  }, [itensPedido]);

  // Produtos menos vendidos (últimos 10)
  const produtosMenosVendidos = useMemo(() => {
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
      .sort((a, b) => a.quantidade - b.quantidade)
      .slice(0, 10);
  }, [itensPedido]);

  // Análise preço vs quantidade
  const precoVsQuantidade = useMemo(() => {
    const produtoStats = itensPedido.reduce((acc, item) => {
      const produtoNome = item.produto?.nome || 'Produto sem nome';
      if (!acc[produtoNome]) {
        acc[produtoNome] = { preco: Number(item.preco_unitario) || 0, quantidade: 0 };
      }
      acc[produtoNome].quantidade += item.quantidade || 0;
      return acc;
    }, {} as Record<string, { preco: number; quantidade: number }>);

    return Object.entries(produtoStats).map(([nome, stats]) => ({
      nome,
      preco: stats.preco,
      quantidade: stats.quantidade,
    }));
  }, [itensPedido]);

  const COLORS = [chartColors.chart1, chartColors.chart2, chartColors.chart3, chartColors.chart4, chartColors.chart5];

  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    const periodo = dateRange?.from && dateRange?.to 
      ? `${formatDate(dateRange.from)} até ${formatDate(dateRange.to)}`
      : 'Todos os períodos';
    
    exportarProdutosRelatorio(format, produtos, itensPedido, periodo);
    toast.success(`Relatório de Produtos exportado em ${format.toUpperCase()}!`);
  };

  const cardIds = [
    'produtos-kpis',
    'produtos-mais-vendidos',
    'produtos-menos-vendidos',
    'produtos-preco-quantidade',
  ];

  const cardDefinitions: CardDefinition[] = [
    { id: 'produtos-kpis', label: 'Métricas de Produtos', description: 'KPIs de estoque e vendas' },
    { id: 'produtos-mais-vendidos', label: 'Top 20 Mais Vendidos', description: 'Produtos com maior saída' },
    { id: 'produtos-menos-vendidos', label: 'Produtos Menos Vendidos', description: 'Produtos parados' },
    { id: 'produtos-preco-quantidade', label: 'Preço vs Quantidade', description: 'Análise de elasticidade' },
  ];

  return (
    <div className="space-y-6">
      {/* Cabeçalho com botão de exportação */}
      <div className="flex justify-end">
        <ExportButton onExport={handleExport} disabled={loading} />
      </div>

      <DraggableContainer tabName="produtos" cardIds={cardIds} cardDefinitions={cardDefinitions}>
        {/* KPIs */}
        <DraggableCard id="produtos-kpis">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              title="Total de Produtos"
              value={metrics.totalProdutos}
              icon={Package}
              type="number"
              loading={loading}
            />
            <MetricCard
              title="Produtos Ativos"
              value={metrics.produtosAtivos}
              icon={TrendingUp}
              type="number"
              loading={loading}
            />
            <MetricCard
              title="Produtos com Estoque Baixo"
              value={metrics.produtosEstoqueBaixo}
              icon={AlertTriangle}
              type="number"
              loading={loading}
            />
            <MetricCard
              title="Valor Total em Estoque"
              value={metrics.valorTotalEstoque}
              icon={DollarSign}
              type="currency"
              loading={loading}
            />
          </div>
        </DraggableCard>

        {/* Top 20 Produtos Mais Vendidos */}
        <DraggableCard id="produtos-mais-vendidos">
          <ChartContainer
            title="Top 20 Produtos Mais Vendidos"
            description="Por quantidade"
            loading={loading}
            empty={topProdutosVendidos.length === 0}
          >
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={topProdutosVendidos} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="nome" stroke="hsl(var(--muted-foreground))" width={150} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="quantidade" fill={chartColors.chart1} name="Quantidade" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </DraggableCard>

        {/* Produtos Menos Vendidos */}
        <DraggableCard id="produtos-menos-vendidos">
          <ChartContainer
            title="Produtos Menos Vendidos"
            description="Produtos parados"
            loading={loading}
            empty={produtosMenosVendidos.length === 0}
          >
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={produtosMenosVendidos} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="nome" stroke="hsl(var(--muted-foreground))" width={150} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="quantidade" fill={chartColors.danger} name="Quantidade" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </DraggableCard>

        {/* Análise Preço vs Quantidade */}
        <DraggableCard id="produtos-preco-quantidade">
          <ChartContainer
            title="Análise Preço vs Quantidade"
            description="Elasticidade de demanda"
            loading={loading}
            empty={precoVsQuantidade.length === 0}
          >
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="preco" name="Preço" stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="quantidade" name="Quantidade" stroke="hsl(var(--muted-foreground))" />
                <ZAxis range={[60, 400]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Scatter name="Produtos" data={precoVsQuantidade} fill={chartColors.chart3} />
              </ScatterChart>
            </ResponsiveContainer>
          </ChartContainer>
        </DraggableCard>
      </DraggableContainer>
    </div>
  );
}
