import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatCurrency, formatDate, formatPercent } from './chartHelpers';

// Exportação para Visão Geral
export const exportarVisaoGeral = (
  format: 'pdf' | 'excel' | 'csv',
  metricas: any,
  periodo: string
) => {
  const dados = [
    { Métrica: 'Total de Vendas', Valor: formatCurrency(metricas.totalVendas || 0) },
    { Métrica: 'Número de Pedidos', Valor: String(metricas.numeroPedidos || 0) },
    { Métrica: 'Ticket Médio', Valor: formatCurrency(metricas.ticketMedio || 0) },
    { Métrica: 'Clientes Ativos', Valor: String(metricas.clientesAtivos || 0) },
    { Métrica: 'Produtos Vendidos', Valor: String(metricas.produtosVendidos || 0) },
    { Métrica: 'Taxa de Conversão', Valor: formatPercent(metricas.taxaConversao || 0) },
  ];

  if (format === 'pdf') {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Relatório - Visão Geral', 14, 20);
    doc.setFontSize(10);
    doc.text(`Período: ${periodo}`, 14, 30);

    autoTable(doc, {
      head: [['Métrica', 'Valor']],
      body: dados.map(d => [d.Métrica, d.Valor]),
      startY: 35,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [66, 139, 202] },
    });

    doc.save(`visao-geral-${Date.now()}.pdf`);
  } else if (format === 'excel') {
    const worksheet = XLSX.utils.json_to_sheet(dados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Visão Geral');
    XLSX.writeFile(workbook, `visao-geral-${Date.now()}.xlsx`);
  } else {
    const csv = 'Métrica,Valor\n' + dados.map(d => `${d.Métrica},${d.Valor}`).join('\n');
    downloadCSV(csv, `visao-geral-${Date.now()}.csv`);
  }
};

// Exportação para Vendas
export const exportarVendas = (
  format: 'pdf' | 'excel' | 'csv',
  pedidos: any[],
  periodo: string
) => {
  const dados = pedidos.map(p => ({
    'Nº Pedido': p.numero_pedido || '-',
    'Cliente': p.cliente?.nome || '-',
    'Vendedor': p.vendedor?.nome || '-',
    'Status': p.status || '-',
    'Valor Total': p.valor_final || 0,
    'Desconto': p.desconto_total || 0,
    'Data': formatDate(p.created_at),
    'Pago': p.pago ? 'Sim' : 'Não',
  }));

  if (format === 'pdf') {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Relatório de Vendas', 14, 20);
    doc.setFontSize(10);
    doc.text(`Período: ${periodo}`, 14, 30);

    autoTable(doc, {
      head: [['Nº Pedido', 'Cliente', 'Vendedor', 'Valor', 'Data', 'Pago']],
      body: pedidos.map(p => [
        p.numero_pedido || '-',
        p.cliente?.nome || '-',
        p.vendedor?.nome || '-',
        formatCurrency(p.valor_final || 0),
        formatDate(p.created_at),
        p.pago ? 'Sim' : 'Não',
      ]),
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] },
    });

    doc.save(`vendas-${Date.now()}.pdf`);
  } else if (format === 'excel') {
    const worksheet = XLSX.utils.json_to_sheet(dados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Vendas');
    XLSX.writeFile(workbook, `vendas-${Date.now()}.xlsx`);
  } else {
    const headers = Object.keys(dados[0] || {});
    const csv = headers.join(',') + '\n' + 
      dados.map(d => Object.values(d).join(',')).join('\n');
    downloadCSV(csv, `vendas-${Date.now()}.csv`);
  }
};

// Exportação para Produtos
export const exportarProdutosRelatorio = (
  format: 'pdf' | 'excel' | 'csv',
  produtos: any[],
  itensPedido: any[],
  periodo: string
) => {
  // Calcular estatísticas por produto
  const produtosComStats = produtos.map(produto => {
    const itensVendidos = itensPedido.filter(item => item.produto_id === produto.id);
    const quantidadeVendida = itensVendidos.reduce((sum, item) => sum + (item.quantidade || 0), 0);
    const receitaGerada = itensVendidos.reduce((sum, item) => sum + (item.subtotal || 0), 0);

    return {
      'Produto': produto.nome || '-',
      'Código': produto.codigo_barras || '-',
      'Categoria': produto.categoria?.nome || '-',
      'Preço': produto.preco || 0,
      'Custo': produto.custo || 0,
      'Margem (%)': produto.preco && produto.custo 
        ? ((produto.preco - produto.custo) / produto.preco * 100).toFixed(2)
        : '0',
      'Estoque Atual': produto.estoque || 0,
      'Qtd Vendida': quantidadeVendida,
      'Receita Gerada': receitaGerada,
    };
  });

  if (format === 'pdf') {
    const doc = new jsPDF('landscape');
    doc.setFontSize(18);
    doc.text('Relatório de Produtos', 14, 20);
    doc.setFontSize(10);
    doc.text(`Período: ${periodo}`, 14, 30);

    autoTable(doc, {
      head: [['Produto', 'Código', 'Preço', 'Custo', 'Margem', 'Estoque', 'Vendido', 'Receita']],
      body: produtosComStats.map(p => [
        p.Produto,
        p.Código,
        formatCurrency(Number(p.Preço)),
        formatCurrency(Number(p.Custo)),
        p['Margem (%)'] + '%',
        p['Estoque Atual'],
        p['Qtd Vendida'],
        formatCurrency(Number(p['Receita Gerada'])),
      ]),
      startY: 35,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [66, 139, 202] },
    });

    doc.save(`produtos-${Date.now()}.pdf`);
  } else if (format === 'excel') {
    const worksheet = XLSX.utils.json_to_sheet(produtosComStats);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Produtos');
    XLSX.writeFile(workbook, `produtos-${Date.now()}.xlsx`);
  } else {
    const headers = Object.keys(produtosComStats[0] || {});
    const csv = headers.join(',') + '\n' + 
      produtosComStats.map(d => Object.values(d).join(',')).join('\n');
    downloadCSV(csv, `produtos-${Date.now()}.csv`);
  }
};

// Exportação para Clientes
export const exportarClientesRelatorio = (
  format: 'pdf' | 'excel' | 'csv',
  clientes: any[],
  pedidos: any[],
  periodo: string
) => {
  // Calcular estatísticas por cliente
  const clientesComStats = clientes.map(cliente => {
    const pedidosCliente = pedidos.filter(p => p.cliente_id === cliente.id);
    const totalGasto = pedidosCliente.reduce((sum, p) => sum + (p.valor_final || 0), 0);

    return {
      'Cliente': cliente.nome || '-',
      'CPF/CNPJ': cliente.cpf_cnpj || '-',
      'Celular': cliente.celular || '-',
      'Email': cliente.email || '-',
      'Cidade': cliente.cidade || '-',
      'Tipo': cliente.tipo || '-',
      'Pedidos': pedidosCliente.length,
      'Total Gasto': totalGasto,
      'Ticket Médio': pedidosCliente.length > 0 ? totalGasto / pedidosCliente.length : 0,
    };
  });

  if (format === 'pdf') {
    const doc = new jsPDF('landscape');
    doc.setFontSize(18);
    doc.text('Relatório de Clientes', 14, 20);
    doc.setFontSize(10);
    doc.text(`Período: ${periodo}`, 14, 30);

    autoTable(doc, {
      head: [['Cliente', 'CPF/CNPJ', 'Celular', 'Cidade', 'Pedidos', 'Total Gasto', 'Ticket Médio']],
      body: clientesComStats.map(c => [
        c.Cliente,
        c['CPF/CNPJ'],
        c.Celular,
        c.Cidade,
        c.Pedidos,
        formatCurrency(Number(c['Total Gasto'])),
        formatCurrency(Number(c['Ticket Médio'])),
      ]),
      startY: 35,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [66, 139, 202] },
    });

    doc.save(`clientes-${Date.now()}.pdf`);
  } else if (format === 'excel') {
    const worksheet = XLSX.utils.json_to_sheet(clientesComStats);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');
    XLSX.writeFile(workbook, `clientes-${Date.now()}.xlsx`);
  } else {
    const headers = Object.keys(clientesComStats[0] || {});
    const csv = headers.join(',') + '\n' + 
      clientesComStats.map(d => Object.values(d).join(',')).join('\n');
    downloadCSV(csv, `clientes-${Date.now()}.csv`);
  }
};

// Exportação para Financeiro
export const exportarFinanceiro = (
  format: 'pdf' | 'excel' | 'csv',
  pedidos: any[],
  metricas: any,
  periodo: string
) => {
  const resumo = [
    { Métrica: 'Receita Total', Valor: formatCurrency(metricas.receitaTotal || 0) },
    { Métrica: 'Custo Total', Valor: formatCurrency(metricas.custoTotal || 0) },
    { Métrica: 'Lucro Bruto', Valor: formatCurrency(metricas.lucroBruto || 0) },
    { Métrica: 'Margem de Lucro', Valor: formatPercent(metricas.margemLucro || 0) },
    { Métrica: 'Receita Paga', Valor: formatCurrency(metricas.receitaPaga || 0) },
    { Métrica: 'Receita Pendente', Valor: formatCurrency(metricas.receitaPendente || 0) },
    { Métrica: 'Descontos Concedidos', Valor: formatCurrency(metricas.descontosTotal || 0) },
  ];

  if (format === 'pdf') {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Relatório Financeiro', 14, 20);
    doc.setFontSize(10);
    doc.text(`Período: ${periodo}`, 14, 30);

    autoTable(doc, {
      head: [['Métrica', 'Valor']],
      body: resumo.map(r => [r.Métrica, r.Valor]),
      startY: 35,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [66, 139, 202] },
    });

    doc.save(`financeiro-${Date.now()}.pdf`);
  } else if (format === 'excel') {
    const worksheet = XLSX.utils.json_to_sheet(resumo);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Financeiro');
    XLSX.writeFile(workbook, `financeiro-${Date.now()}.xlsx`);
  } else {
    const csv = 'Métrica,Valor\n' + resumo.map(r => `${r.Métrica},${r.Valor}`).join('\n');
    downloadCSV(csv, `financeiro-${Date.now()}.csv`);
  }
};

// Exportação para Operacional
export const exportarOperacional = (
  format: 'pdf' | 'excel' | 'csv',
  metricas: any,
  periodo: string
) => {
  const dados = [
    { Métrica: 'Total de Pedidos', Valor: String(metricas.totalPedidos || 0) },
    { Métrica: 'Pedidos Finalizados', Valor: String(metricas.pedidosFinalizados || 0) },
    { Métrica: 'Pedidos Cancelados', Valor: String(metricas.pedidosCancelados || 0) },
    { Métrica: 'Taxa de Conversão', Valor: formatPercent(metricas.taxaConversao || 0) },
    { Métrica: 'Produtos com Estoque Baixo', Valor: String(metricas.produtosEstoqueBaixo || 0) },
    { Métrica: 'Tempo Médio de Entrega', Valor: metricas.tempoMedioEntrega || 'N/A' },
  ];

  if (format === 'pdf') {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Relatório Operacional', 14, 20);
    doc.setFontSize(10);
    doc.text(`Período: ${periodo}`, 14, 30);

    autoTable(doc, {
      head: [['Métrica', 'Valor']],
      body: dados.map(d => [d.Métrica, d.Valor]),
      startY: 35,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [66, 139, 202] },
    });

    doc.save(`operacional-${Date.now()}.pdf`);
  } else if (format === 'excel') {
    const worksheet = XLSX.utils.json_to_sheet(dados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Operacional');
    XLSX.writeFile(workbook, `operacional-${Date.now()}.xlsx`);
  } else {
    const csv = 'Métrica,Valor\n' + dados.map(d => `${d.Métrica},${d.Valor}`).join('\n');
    downloadCSV(csv, `operacional-${Date.now()}.csv`);
  }
};

// Função auxiliar para download de CSV
function downloadCSV(content: string, filename: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
