import { MetricCard } from "../MetricCard";
import { ChartContainer } from "../ChartContainer";
import { ExportButton } from "../ExportButton";
import { DraggableCard } from "../DraggableCard";
import { DraggableContainer } from "../DraggableContainer";
import { CardDefinition } from "@/hooks/useReportLayout";
import { DollarSign, TrendingUp, TrendingDown, Receipt, Tag } from "lucide-react";
import { useRelatorioData } from "@/hooks/useRelatorioData";
import { DateRange } from "react-day-picker";
import { useMemo } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { chartColors, formatDate } from "@/utils/chartHelpers";
import { exportarVendas } from "@/utils/exportRelatorios";
import { toast } from "@/utils/toastHelper";

interface VendasTabProps {
  dateRange: DateRange | undefined;
  compareEnabled: boolean;
}

export function VendasTab({ dateRange, compareEnabled }: VendasTabProps) {
  const { pedidos, loading } = useRelatorioData({ dateRange });

  const metrics = useMemo(() => {
    const receitaTotal = pedidos.reduce((sum, p) => sum + (Number(p.valor_final) || 0), 0);
    const numeroPedidos = pedidos.length;
    const receitaMediaPorDia = numeroPedidos > 0 ? receitaTotal / Math.max(1, new Set(pedidos.map(p => new Date(p.created_at).toDateString())).size) : 0;
    const maiorVenda = Math.max(...pedidos.map(p => Number(p.valor_final) || 0), 0);
    const menorVenda = pedidos.length > 0 ? Math.min(...pedidos.map(p => Number(p.valor_final) || 0).filter(v => v > 0)) : 0;
    const totalDescontos = pedidos.reduce((sum, p) => sum + (Number(p.desconto_total) || 0), 0);

    return {
      receitaTotal,
      receitaMediaPorDia,
      maiorVenda,
      menorVenda,
      totalDescontos,
    };
  }, [pedidos]);

  // Vendas por vendedor
  const vendasPorVendedor = useMemo(() => {
    const vendedorStats = pedidos.reduce((acc, pedido) => {
      const vendedor = (pedido.vendedor as any)?.nome || 'Sem Vendedor';
      if (!acc[vendedor]) {
        acc[vendedor] = { total: 0, quantidade: 0 };
      }
      acc[vendedor].total += Number(pedido.valor_final) || 0;
      acc[vendedor].quantidade += 1;
      return acc;
    }, {} as Record<string, { total: number; quantidade: number }>);

    return Object.entries(vendedorStats).map(([vendedor, stats]) => ({
      vendedor,
      total: stats.total,
      quantidade: stats.quantidade,
    }));
  }, [pedidos]);

  // Performance por dia da semana
  const vendasPorDiaSemana = useMemo(() => {
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const vendas = Array(7).fill(0);

    pedidos.forEach(pedido => {
      const dia = new Date(pedido.created_at).getDay();
      vendas[dia] += Number(pedido.valor_final) || 0;
    });

    return diasSemana.map((dia, index) => ({
      dia,
      valor: vendas[index],
    }));
  }, [pedidos]);

  // Vendas por hora do dia
  const vendasPorHora = useMemo(() => {
    const horas = Array(24).fill(0);

    pedidos.forEach(pedido => {
      const hora = new Date(pedido.created_at).getHours();
      horas[hora] += Number(pedido.valor_final) || 0;
    });

    return horas.map((valor, hora) => ({
      hora: `${hora}h`,
      valor,
    })).filter(h => h.valor > 0);
  }, [pedidos]);


  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    const periodo = dateRange?.from && dateRange?.to 
      ? `${formatDate(dateRange.from)} até ${formatDate(dateRange.to)}`
      : 'Todos os períodos';
    
    exportarVendas(format, pedidos, periodo);
    toast.success(`Relatório de Vendas exportado em ${format.toUpperCase()}!`);
  };

  const cardIds = [
    'vendas-kpis',
    'vendas-por-vendedor',
    'vendas-dia-semana',
    'vendas-por-hora',
  ];

  const cardDefinitions: CardDefinition[] = [
    { id: 'vendas-kpis', label: 'Métricas de Vendas', description: 'KPIs principais de receita' },
    { id: 'vendas-por-vendedor', label: 'Vendas por Vendedor', description: 'Performance de cada vendedor' },
    { id: 'vendas-dia-semana', label: 'Vendas por Dia da Semana', description: 'Análise semanal' },
    { id: 'vendas-por-hora', label: 'Vendas por Hora', description: 'Horários de pico' },
  ];

  return (
    <div className="space-y-6">
      {/* Cabeçalho com botão de exportação */}
      <div className="flex justify-end">
        <ExportButton onExport={handleExport} disabled={loading} />
      </div>

      <DraggableContainer tabName="vendas" cardIds={cardIds} cardDefinitions={cardDefinitions}>
        {/* KPIs */}
        <DraggableCard id="vendas-kpis">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              title="Receita Total"
              value={metrics.receitaTotal}
              icon={DollarSign}
              type="currency"
              loading={loading}
              delay={0}
            />
            <MetricCard
              title="Receita Média por Dia"
              value={metrics.receitaMediaPorDia}
              icon={TrendingUp}
              type="currency"
              loading={loading}
              delay={0.05}
            />
            <MetricCard
              title="Maior Venda"
              value={metrics.maiorVenda}
              icon={Receipt}
              type="currency"
              loading={loading}
              delay={0.1}
            />
            <MetricCard
              title="Menor Venda"
              value={metrics.menorVenda}
              icon={TrendingDown}
              type="currency"
              loading={loading}
              delay={0.15}
            />
            <MetricCard
              title="Total de Descontos"
              value={metrics.totalDescontos}
              icon={Tag}
              type="currency"
              loading={loading}
              delay={0.2}
            />
          </div>
        </DraggableCard>

        {/* Vendas por Vendedor */}
        <DraggableCard id="vendas-por-vendedor">
          <ChartContainer
            title="Vendas por Vendedor"
            description="Performance de cada vendedor"
            loading={loading}
            empty={vendasPorVendedor.length === 0}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={vendasPorVendedor} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="vendedor" stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="total" fill={chartColors.chart1} name="Total Vendas" />
                <Bar dataKey="quantidade" fill={chartColors.chart2} name="Qtd Pedidos" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </DraggableCard>

        {/* Performance por Dia da Semana */}
        <DraggableCard id="vendas-dia-semana">
          <ChartContainer
            title="Performance por Dia da Semana"
            description="Identificar melhores dias"
            loading={loading}
            empty={vendasPorDiaSemana.length === 0}
          >
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={vendasPorDiaSemana}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="dia" stroke="hsl(var(--muted-foreground))" />
                <PolarRadiusAxis stroke="hsl(var(--muted-foreground))" />
                <Radar name="Vendas" dataKey="valor" stroke={chartColors.chart3} fill={chartColors.chart3} fillOpacity={0.6} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
              </RadarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </DraggableCard>

        {/* Vendas por Hora */}
        <DraggableCard id="vendas-por-hora">
          <ChartContainer
            title="Vendas por Hora do Dia"
            description="Identificar horários de pico"
            loading={loading}
            empty={vendasPorHora.length === 0}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={vendasPorHora}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="hora" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="valor" fill={chartColors.chart4} name="Valor" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </DraggableCard>
      </DraggableContainer>
    </div>
  );
}
