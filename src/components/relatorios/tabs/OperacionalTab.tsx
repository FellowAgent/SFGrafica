import { useMemo } from "react";
import { DateRange } from "react-day-picker";
import { MetricCard } from "../MetricCard";
import { ChartContainer } from "../ChartContainer";
import { ExportButton } from "../ExportButton";
import { DraggableCard } from "../DraggableCard";
import { DraggableContainer } from "../DraggableContainer";
import { CardDefinition } from "@/hooks/useReportLayout";
import { Package, Clock, CheckCircle, XCircle, TrendingUp, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { chartColors, formatDate } from "@/utils/chartHelpers";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exportarOperacional } from "@/utils/exportRelatorios";
import { toast } from "@/utils/toastHelper";

interface OperacionalTabProps {
  dateRange: DateRange | undefined;
  compareEnabled: boolean;
  pedidos: any[];
  produtos: any[];
}

export function OperacionalTab({ dateRange, pedidos, produtos }: OperacionalTabProps) {
  // Total de pedidos
  const totalPedidos = pedidos.length;

  // Pedidos por status
  const pedidosPorStatus = useMemo(() => {
    const porStatus = pedidos.reduce((acc, p) => {
      const status = p.status || 'Sem status';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(porStatus).map(([name, value]) => ({
      name,
      value,
    }));
  }, [pedidos]);

  // Pedidos finalizados
  const pedidosFinalizados = useMemo(() => {
    return pedidos.filter(p => 
      p.status?.toLowerCase().includes('finalizado') || 
      p.status?.toLowerCase().includes('entregue') ||
      p.status?.toLowerCase().includes('concluído')
    ).length;
  }, [pedidos]);

  // Pedidos cancelados
  const pedidosCancelados = useMemo(() => {
    return pedidos.filter(p => 
      p.status?.toLowerCase().includes('cancelado')
    ).length;
  }, [pedidos]);

  // Taxa de conversão (finalizados / total)
  const taxaConversao = useMemo(() => {
    if (totalPedidos === 0) return 0;
    return (pedidosFinalizados / totalPedidos) * 100;
  }, [pedidosFinalizados, totalPedidos]);

  // Pedidos por tipo de retirada
  const pedidosPorTipoRetirada = useMemo(() => {
    const porTipo = pedidos.reduce((acc, p) => {
      const tipo = p.tipo_retirada === 'balcao' ? 'Balcão' : 'Entrega';
      acc[tipo] = (acc[tipo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(porTipo).map(([name, value]) => ({
      name,
      value,
    }));
  }, [pedidos]);

  // Produtos com estoque baixo
  const produtosEstoqueBaixo = useMemo(() => {
    return produtos.filter(p => p.estoque <= p.estoque_minimo && p.ativo).length;
  }, [produtos]);

  // Pedidos por dia
  const pedidosPorDia = useMemo(() => {
    const porDia = pedidos.reduce((acc, pedido) => {
      const data = formatDate(pedido.created_at);
      acc[data] = (acc[data] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(porDia)
      .map(([data, total]) => ({ data, total }))
      .sort((a, b) => new Date(a.data.split('/').reverse().join('-')).getTime() - new Date(b.data.split('/').reverse().join('-')).getTime());
  }, [pedidos]);

  // Tempo médio de entrega (simplificado - baseado em prazo)
  const tempoMedioEntrega = useMemo(() => {
    const pedidosComPrazo = pedidos.filter(p => p.prazo_entrega && p.unidade_prazo);
    if (pedidosComPrazo.length === 0) return 'N/A';
    
    const media = pedidosComPrazo.reduce((sum, p) => {
      const prazo = parseInt(p.prazo_entrega) || 0;
      return sum + prazo;
    }, 0) / pedidosComPrazo.length;

    return `${media.toFixed(0)} ${pedidosComPrazo[0]?.unidade_prazo || 'dias'}`;
  }, [pedidos]);

  // Top produtos mais vendidos
  const topProdutos = useMemo(() => {
    const produtosMap = new Map();
    
    pedidos.forEach(pedido => {
      (pedido.itens || []).forEach((item: any) => {
        const produtoNome = item.produto?.nome || 'Produto sem nome';
        const quantidade = item.quantidade || 0;
        
        if (produtosMap.has(produtoNome)) {
          produtosMap.set(produtoNome, produtosMap.get(produtoNome) + quantidade);
        } else {
          produtosMap.set(produtoNome, quantidade);
        }
      });
    });

    return Array.from(produtosMap.entries())
      .map(([nome, quantidade]) => ({ nome, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 10);
  }, [pedidos]);

  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    const periodo = dateRange?.from && dateRange?.to 
      ? `${formatDate(dateRange.from)} até ${formatDate(dateRange.to)}`
      : 'Todos os períodos';
    
    exportarOperacional(format, {
      totalPedidos,
      pedidosFinalizados,
      pedidosCancelados,
      taxaConversao,
      produtosEstoqueBaixo,
      tempoMedioEntrega,
    }, periodo);
    
    toast.success(`Relatório Operacional exportado em ${format.toUpperCase()}!`);
  };

  const cardIds = [
    'operacional-kpis-principais',
    'operacional-kpis-secundarias',
    'operacional-graficos',
  ];

  const cardDefinitions: CardDefinition[] = [
    { id: 'operacional-kpis-principais', label: 'Métricas Operacionais', description: 'KPIs de pedidos' },
    { id: 'operacional-kpis-secundarias', label: 'Estoque e Prazos', description: 'Indicadores operacionais' },
    { id: 'operacional-graficos', label: 'Análise Operacional', description: 'Gráficos detalhados' },
  ];

  return (
    <div className="space-y-6">
      {/* Cabeçalho com botão de exportação */}
      <div className="flex justify-end">
        <ExportButton onExport={handleExport} />
      </div>

      <DraggableContainer tabName="operacional" cardIds={cardIds} cardDefinitions={cardDefinitions}>
        {/* Métricas principais */}
        <DraggableCard id="operacional-kpis-principais">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total de Pedidos"
              value={totalPedidos}
              icon={Package}
              type="number"
            />
            <MetricCard
              title="Pedidos Finalizados"
              value={pedidosFinalizados}
              icon={CheckCircle}
              type="number"
            />
            <MetricCard
              title="Pedidos Cancelados"
              value={pedidosCancelados}
              icon={XCircle}
              type="number"
            />
            <MetricCard
              title="Taxa de Conversão"
              value={taxaConversao}
              icon={TrendingUp}
              type="percent"
            />
          </div>
        </DraggableCard>

        {/* Segunda linha de métricas */}
        <DraggableCard id="operacional-kpis-secundarias">
          <div className="grid gap-4 md:grid-cols-2">
            <MetricCard
              title="Produtos com Estoque Baixo"
              value={produtosEstoqueBaixo}
              icon={AlertCircle}
              type="number"
            />
            <div className="rounded-lg border bg-card p-6">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium text-muted-foreground">Tempo Médio de Entrega</h3>
              </div>
              <p className="text-2xl font-bold">{tempoMedioEntrega}</p>
            </div>
          </div>
        </DraggableCard>

        {/* Gráficos */}
        <DraggableCard id="operacional-graficos">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Pedidos por status */}
            <ChartContainer title="Pedidos por Status">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pedidosPorStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pedidosPorStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={Object.values(chartColors)[index + 6]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>

            {/* Tipo de retirada */}
            <ChartContainer title="Tipo de Retirada">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pedidosPorTipoRetirada}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pedidosPorTipoRetirada.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? chartColors.primary : chartColors.accent} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>

            {/* Pedidos por dia */}
            <ChartContainer title="Pedidos por Dia">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={pedidosPorDia}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="total" stroke={chartColors.primary} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>

            {/* Top produtos */}
            <ChartContainer title="Top 10 Produtos Mais Vendidos">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topProdutos} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="nome" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="quantidade" fill={chartColors.accent} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </DraggableCard>
      </DraggableContainer>
    </div>
  );
}
