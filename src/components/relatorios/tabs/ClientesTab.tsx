import { useMemo } from "react";
import { DateRange } from "react-day-picker";
import { MetricCard } from "../MetricCard";
import { ChartContainer } from "../ChartContainer";
import { ExportButton } from "../ExportButton";
import { DraggableCard } from "../DraggableCard";
import { DraggableContainer } from "../DraggableContainer";
import { CardDefinition } from "@/hooks/useReportLayout";
import { Users, TrendingUp, ShoppingBag, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { chartColors, formatCurrency, formatDate } from "@/utils/chartHelpers";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exportarClientesRelatorio } from "@/utils/exportRelatorios";
import { toast } from "@/utils/toastHelper";

interface ClientesTabProps {
  dateRange: DateRange | undefined;
  compareEnabled: boolean;
  pedidos: any[];
  clientes: any[];
}

export function ClientesTab({ dateRange, pedidos, clientes }: ClientesTabProps) {
  // Total de clientes
  const totalClientes = clientes.length;

  // Novos clientes no período
  const novosClientes = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return 0;
    return clientes.filter(c => {
      const createdAt = new Date(c.created_at);
      return createdAt >= dateRange.from! && createdAt <= dateRange.to!;
    }).length;
  }, [clientes, dateRange]);

  // Clientes ativos (que fizeram pelo menos 1 pedido no período)
  const clientesAtivos = useMemo(() => {
    const clienteIds = new Set(pedidos.map(p => p.cliente_id));
    return clienteIds.size;
  }, [pedidos]);

  // Ticket médio por cliente
  const ticketMedioPorCliente = useMemo(() => {
    if (clientesAtivos === 0) return 0;
    const totalVendas = pedidos.reduce((sum, p) => sum + (p.valor_final || 0), 0);
    return totalVendas / clientesAtivos;
  }, [pedidos, clientesAtivos]);

  // Top 10 clientes por valor
  const topClientesPorValor = useMemo(() => {
    const clientesMap = new Map();
    
    pedidos.forEach(pedido => {
      const clienteId = pedido.cliente_id;
      const clienteNome = pedido.cliente?.nome || 'Sem nome';
      const valor = pedido.valor_final || 0;
      
      if (clientesMap.has(clienteId)) {
        const existing = clientesMap.get(clienteId);
        clientesMap.set(clienteId, {
          ...existing,
          total: existing.total + valor,
          pedidos: existing.pedidos + 1,
        });
      } else {
        clientesMap.set(clienteId, {
          nome: clienteNome,
          total: valor,
          pedidos: 1,
        });
      }
    });

    return Array.from(clientesMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [pedidos]);

  // Distribuição por tipo de cliente
  const distribuicaoPorTipo = useMemo(() => {
    const tipos = clientes.reduce((acc, c) => {
      const tipo = c.tipo || 'Pessoa Física';
      acc[tipo] = (acc[tipo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(tipos).map(([tipo, count]) => ({
      name: tipo,
      value: count,
    }));
  }, [clientes]);

  // Clientes por cidade (top 5)
  const clientesPorCidade = useMemo(() => {
    const cidades = clientes.reduce((acc, c) => {
      const cidade = c.cidade || 'Não informado';
      acc[cidade] = (acc[cidade] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(cidades)
      .map(([cidade, count]): { cidade: string; total: number } => ({ cidade, total: Number(count) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [clientes]);

  // Taxa de retenção (clientes com mais de 1 pedido)
  const clientesRecorrentes = useMemo(() => {
    const clientesPedidos = pedidos.reduce((acc, p) => {
      acc[p.cliente_id] = (acc[p.cliente_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.values(clientesPedidos).filter((count: number) => count > 1).length;
  }, [pedidos]);

  const taxaRetencao = useMemo(() => {
    if (clientesAtivos === 0) return 0;
    return (clientesRecorrentes / clientesAtivos) * 100;
  }, [clientesRecorrentes, clientesAtivos]);

  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    const periodo = dateRange?.from && dateRange?.to 
      ? `${formatDate(dateRange.from)} até ${formatDate(dateRange.to)}`
      : 'Todos os períodos';
    
    exportarClientesRelatorio(format, clientes, pedidos, periodo);
    toast.success(`Relatório de Clientes exportado em ${format.toUpperCase()}!`);
  };

  const cardIds = [
    'clientes-kpis-principais',
    'clientes-kpis-secundarias',
    'clientes-graficos',
    'clientes-top10',
  ];

  const cardDefinitions: CardDefinition[] = [
    { id: 'clientes-kpis-principais', label: 'Métricas de Clientes', description: 'KPIs principais' },
    { id: 'clientes-kpis-secundarias', label: 'Retenção e Recorrência', description: 'Métricas de fidelização' },
    { id: 'clientes-graficos', label: 'Distribuição de Clientes', description: 'Gráficos de análise' },
    { id: 'clientes-top10', label: 'Top 10 Clientes', description: 'Maiores compradores' },
  ];

  return (
    <div className="space-y-6">
      {/* Cabeçalho com botão de exportação */}
      <div className="flex justify-end">
        <ExportButton onExport={handleExport} />
      </div>

      <DraggableContainer tabName="clientes" cardIds={cardIds} cardDefinitions={cardDefinitions}>
        {/* Métricas principais */}
        <DraggableCard id="clientes-kpis-principais">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total de Clientes"
              value={totalClientes}
              icon={Users}
              type="number"
            />
            <MetricCard
              title="Novos Clientes"
              value={novosClientes}
              icon={TrendingUp}
              type="number"
            />
            <MetricCard
              title="Clientes Ativos"
              value={clientesAtivos}
              icon={ShoppingBag}
              type="number"
            />
            <MetricCard
              title="Ticket Médio/Cliente"
              value={ticketMedioPorCliente}
              icon={DollarSign}
              type="currency"
            />
          </div>
        </DraggableCard>

        {/* Segunda linha de métricas */}
        <DraggableCard id="clientes-kpis-secundarias">
          <div className="grid gap-4 md:grid-cols-2">
            <MetricCard
              title="Taxa de Retenção"
              value={taxaRetencao}
              type="percent"
            />
            <MetricCard
              title="Clientes Recorrentes"
              value={clientesRecorrentes}
              type="number"
            />
          </div>
        </DraggableCard>

        {/* Gráficos */}
        <DraggableCard id="clientes-graficos">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Distribuição por tipo */}
            <ChartContainer title="Distribuição por Tipo">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={distribuicaoPorTipo}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: { name: string; percent: number }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {distribuicaoPorTipo.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={Object.values(chartColors)[index + 6]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>

            {/* Clientes por cidade */}
            <ChartContainer title="Top 5 Cidades">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={clientesPorCidade}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="cidade" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill={chartColors.primary} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </DraggableCard>

        {/* Tabela de top clientes */}
        <DraggableCard id="clientes-top10">
          <ChartContainer title="Top 10 Clientes por Valor">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Posição</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Pedidos</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead className="text-right">Ticket Médio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topClientesPorValor.map((cliente, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{index + 1}º</TableCell>
                    <TableCell>{cliente.nome}</TableCell>
                    <TableCell className="text-right">{cliente.pedidos}</TableCell>
                    <TableCell className="text-right">{formatCurrency(cliente.total)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(cliente.total / cliente.pedidos)}</TableCell>
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
