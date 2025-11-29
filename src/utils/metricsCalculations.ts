// Metrics calculations utilities

export const calcularTicketMedio = (totalVendas: number, numeroPedidos: number): number => {
  if (numeroPedidos === 0) return 0;
  return totalVendas / numeroPedidos;
};

export const calcularTaxaConversao = (pedidosFinalizados: number, totalPedidos: number): number => {
  if (totalPedidos === 0) return 0;
  return (pedidosFinalizados / totalPedidos) * 100;
};

export const calcularMargemLucro = (receita: number, custos: number): number => {
  if (receita === 0) return 0;
  return ((receita - custos) / receita) * 100;
};

export const calcularTaxaRetencao = (clientesRecorrentes: number, totalClientes: number): number => {
  if (totalClientes === 0) return 0;
  return (clientesRecorrentes / totalClientes) * 100;
};

export const calcularLifetimeValue = (valorTotalGasto: number, numeroClientes: number): number => {
  if (numeroClientes === 0) return 0;
  return valorTotalGasto / numeroClientes;
};

export const calcularVariacaoPercentual = (valorAtual: number, valorAnterior: number): number => {
  if (valorAnterior === 0) return valorAtual > 0 ? 100 : 0;
  return ((valorAtual - valorAnterior) / valorAnterior) * 100;
};

export const calcularDiasEstoque = (estoqueAtual: number, mediaVendasDia: number): number => {
  if (mediaVendasDia === 0) return Infinity;
  return estoqueAtual / mediaVendasDia;
};

export const calcularTaxaCancelamento = (pedidosCancelados: number, totalPedidos: number): number => {
  if (totalPedidos === 0) return 0;
  return (pedidosCancelados / totalPedidos) * 100;
};

export interface PeriodoComparacao {
  dataInicio: Date;
  dataFim: Date;
}

export const calcularPeriodoAnterior = (dataInicio: Date, dataFim: Date): PeriodoComparacao => {
  const diffMs = dataFim.getTime() - dataInicio.getTime();
  const novaDataFim = new Date(dataInicio.getTime() - 1);
  const novaDataInicio = new Date(novaDataFim.getTime() - diffMs);
  
  return {
    dataInicio: novaDataInicio,
    dataFim: novaDataFim,
  };
};
