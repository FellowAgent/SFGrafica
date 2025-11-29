import { useMemo } from "react";
import { DateRange } from "react-day-picker";
import { MetricCard } from "../MetricCard";
import { ChartContainer } from "../ChartContainer";
import { ExportButton } from "../ExportButton";
import { DraggableCard } from "../DraggableCard";
import { DraggableContainer } from "../DraggableContainer";
import { CardDefinition } from "@/hooks/useReportLayout";
import { DollarSign, TrendingUp, TrendingDown, Percent, CreditCard } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";
import { chartColors, formatCurrency, formatDate } from "@/utils/chartHelpers";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exportarFinanceiro } from "@/utils/exportRelatorios";
import { toast } from "@/utils/toastHelper";

interface FinanceiroTabProps {
  dateRange: DateRange | undefined;
  compareEnabled: boolean;
  pedidos: any[];
}

export function FinanceiroTab({ dateRange, pedidos }: FinanceiroTabProps) {
  // Receita total
  const receitaTotal = useMemo(() => {
    return pedidos.reduce((sum, p) => sum + (p.valor_final || 0), 0);
  }, [pedidos]);

  // Custo total (baseado nos itens)
  const custoTotal = useMemo(() => {
    return pedidos.reduce((sum, pedido) => {
      const custoPedido = (pedido.itens || []).reduce((itemSum: number, item: any) => {
        const custo = item.produto?.custo || 0;
        return itemSum + (custo * item.quantidade);
      }, 0);
      return sum + custoPedido;
    }, 0);
  }, [pedidos]);

  // Lucro bruto
  const lucroBruto = receitaTotal - custoTotal;

  // Margem de lucro
  const margemLucro = useMemo(() => {
    if (receitaTotal === 0) return 0;
    return ((lucroBruto / receitaTotal) * 100);
  }, [lucroBruto, receitaTotal]);

  // Pedidos pagos vs não pagos
  const pedidosPagos = useMemo(() => {
    return pedidos.filter(p => p.pago).length;
  }, [pedidos]);

  const receitaPaga = useMemo(() => {
    return pedidos.filter(p => p.pago).reduce((sum, p) => sum + (p.valor_final || 0), 0);
  }, [pedidos]);

  const receitaPendente = receitaTotal - receitaPaga;

  // Descontos concedidos
  const descontosTotal = useMemo(() => {
    return pedidos.reduce((sum, p) => sum + (p.desconto_total || 0), 0);
  }, [pedidos]);

  // Receita por dia
  const receitaPorDia = useMemo(() => {
    const porDia = pedidos.reduce((acc, pedido) => {
      const data = formatDate(pedido.created_at);
      acc[data] = (acc[data] || 0) + (pedido.valor_final || 0);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(porDia)
      .map(([data, receita]): { data: string; receita: number } => ({ data, receita: Number(receita) }))
      .sort((a, b) => new Date(a.data.split('/').reverse().join('-')).getTime() - new Date(b.data.split('/').reverse().join('-')).getTime());
  }, [pedidos]);

  // Distribuição por meio de pagamento
  const porMeioPagamento = useMemo(() => {
    const meios = pedidos.reduce((acc, p) => {
      const meio = p.meio_pagamento || 'Não informado';
      acc[meio] = (acc[meio] || 0) + (p.valor_final || 0);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(meios).map(([name, value]) => ({
      name,
      value,
    }));
  }, [pedidos]);

  // Status de pagamento
  const statusPagamento = useMemo(() => {
    return [
      { name: 'Pago', value: receitaPaga, count: pedidosPagos },
      { name: 'Pendente', value: receitaPendente, count: pedidos.length - pedidosPagos },
    ];
  }, [receitaPaga, receitaPendente, pedidosPagos, pedidos]);

  // Top 5 dias com maior receita
  const topDiasReceita = useMemo(() => {
    return [...receitaPorDia]
      .sort((a, b) => b.receita - a.receita)
      .slice(0, 5);
  }, [receitaPorDia]);

  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    const periodo = dateRange?.from && dateRange?.to 
      ? `${formatDate(dateRange.from)} até ${formatDate(dateRange.to)}`
      : 'Todos os períodos';
    
    exportarFinanceiro(format, pedidos, {
      receitaTotal,
      custoTotal,
      lucroBruto,
      margemLucro,
      receitaPaga,
      receitaPendente,
      descontosTotal,
    }, periodo);
    
    toast.success(`Relatório Financeiro exportado em ${format.toUpperCase()}!`);
  };

  const cardIds = [
    'financeiro-kpis-principais',
    'financeiro-kpis-secundarias',
    'financeiro-graficos',
    'financeiro-top-dias',
  ];

  const cardDefinitions: CardDefinition[] = [
    { id: 'financeiro-kpis-principais', label: 'Métricas Financeiras', description: 'Receita, custo e lucro' },
    { id: 'financeiro-kpis-secundarias', label: 'Pagamentos e Descontos', description: 'Status financeiro' },
    { id: 'financeiro-graficos', label: 'Análise Financeira', description: 'Gráficos detalhados' },
    { id: 'financeiro-top-dias', label: 'Top 5 Dias', description: 'Melhores dias de receita' },
  ];

  return (
    <div className="space-y-6">
      {/* Cabeçalho com botão de exportação */}
      <div className="flex justify-end">
        <ExportButton onExport={handleExport} />
      </div>

      <DraggableContainer tabName="financeiro" cardIds={cardIds} cardDefinitions={cardDefinitions}>
        {/* Métricas principais */}
        <DraggableCard id="financeiro-kpis-principais">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Receita Total"
              value={receitaTotal}
              icon={DollarSign}
              type="currency"
            />
            <MetricCard
              title="Custo Total"
              value={custoTotal}
              icon={TrendingDown}
              type="currency"
            />
            <MetricCard
              title="Lucro Bruto"
              value={lucroBruto}
              icon={TrendingUp}
              type="currency"
            />
            <MetricCard
              title="Margem de Lucro"
              value={margemLucro}
              icon={Percent}
              type="percent"
            />
          </div>
        </DraggableCard>

        {/* Segunda linha de métricas */}
        <DraggableCard id="financeiro-kpis-secundarias">
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              title="Receita Paga"
              value={receitaPaga}
              type="currency"
            />
            <MetricCard
              title="Receita Pendente"
              value={receitaPendente}
              type="currency"
            />
            <MetricCard
              title="Descontos Concedidos"
              value={descontosTotal}
              type="currency"
            />
          </div>
        </DraggableCard>

        {/* Gráficos */}
        <DraggableCard id="financeiro-graficos">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Receita ao longo do tempo */}
            <ChartContainer title="Receita por Dia">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={receitaPorDia}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Line type="monotone" dataKey="receita" stroke={chartColors.primary} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>

            {/* Status de pagamento */}
            <ChartContainer title="Status de Pagamento">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusPagamento}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: { name: string; percent: number }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill={chartColors.success} />
                    <Cell fill={chartColors.warning} />
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>

            {/* Meios de pagamento */}
            <ChartContainer title="Receita por Meio de Pagamento">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={porMeioPagamento}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="value" fill={chartColors.accent} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>

            {/* Análise de margem */}
            <ChartContainer title="Análise Financeira">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    { name: 'Receita', valor: receitaTotal },
                    { name: 'Custo', valor: custoTotal },
                    { name: 'Lucro', valor: lucroBruto },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="valor" fill={chartColors.primary} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </DraggableCard>

        {/* Tabela de top dias */}
        <DraggableCard id="financeiro-top-dias">
          <ChartContainer title="Top 5 Dias com Maior Receita">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Posição</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topDiasReceita.map((dia, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{index + 1}º</TableCell>
                    <TableCell>{dia.data}</TableCell>
                    <TableCell className="text-right">{formatCurrency(dia.receita)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ChartContainer>
        </DraggableCard>
      </DraggableContainer>
    </div>
  );
}
