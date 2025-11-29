import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatCurrency, formatDate } from './chartHelpers';

// Tipos para os dados de exportação
export interface PedidoExport {
  numero_pedido: string;
  cliente: string;
  vendedor: string;
  status: string;
  valor_final: number;
  created_at: string;
  pago: boolean;
}

export interface ProdutoExport {
  nome: string;
  codigo_barras: string;
  categoria: string;
  preco: number;
  custo: number;
  estoque: number;
  estoque_minimo: number;
}

export interface ClienteExport {
  nome: string;
  cpf_cnpj: string;
  celular: string;
  email: string;
  cidade: string;
  tipo: string;
}

// Exportar para PDF
export const exportarPDF = (
  tipo: 'pedidos' | 'produtos' | 'clientes' | 'geral',
  dados: any[],
  titulo: string,
  filtros?: { periodo?: string; status?: string; vendedor?: string; cliente?: string }
) => {
  const doc = new jsPDF();
  
  // Configurar título
  doc.setFontSize(18);
  doc.text(titulo, 14, 20);
  
  // Adicionar informações de filtros
  let yPosition = 30;
  doc.setFontSize(10);
  
  if (filtros) {
    if (filtros.periodo) {
      doc.text(`Período: ${filtros.periodo}`, 14, yPosition);
      yPosition += 6;
    }
    if (filtros.status && filtros.status !== 'todos') {
      doc.text(`Status: ${filtros.status}`, 14, yPosition);
      yPosition += 6;
    }
    if (filtros.vendedor && filtros.vendedor !== 'todos') {
      doc.text(`Vendedor: ${filtros.vendedor}`, 14, yPosition);
      yPosition += 6;
    }
    if (filtros.cliente && filtros.cliente !== 'todos') {
      doc.text(`Cliente: ${filtros.cliente}`, 14, yPosition);
      yPosition += 6;
    }
  }
  
  yPosition += 4;
  
  // Configurar colunas e dados baseado no tipo
  let columns: string[] = [];
  let rows: any[][] = [];
  
  switch (tipo) {
    case 'pedidos':
      columns = ['Nº Pedido', 'Cliente', 'Vendedor', 'Status', 'Valor', 'Data', 'Pago'];
      rows = dados.map(p => [
        p.numero_pedido || '-',
        p.cliente?.nome || '-',
        p.vendedor?.nome || '-',
        p.status || '-',
        formatCurrency(p.valor_final || 0),
        formatDate(p.created_at),
        p.pago ? 'Sim' : 'Não',
      ]);
      break;
      
    case 'produtos':
      columns = ['Produto', 'Código', 'Categoria', 'Preço', 'Custo', 'Estoque', 'Est. Mín.'];
      rows = dados.map(p => [
        p.nome || '-',
        p.codigo_barras || '-',
        p.categoria?.nome || '-',
        formatCurrency(p.preco || 0),
        formatCurrency(p.custo || 0),
        p.estoque || 0,
        p.estoque_minimo || 0,
      ]);
      break;
      
    case 'clientes':
      columns = ['Nome', 'CPF/CNPJ', 'Celular', 'Email', 'Cidade', 'Tipo'];
      rows = dados.map(c => [
        c.nome || '-',
        c.cpf_cnpj || '-',
        c.celular || '-',
        c.email || '-',
        c.cidade || '-',
        c.tipo || '-',
      ]);
      break;
      
    case 'geral':
      // Para relatório geral, usar dados customizados
      columns = dados.length > 0 ? Object.keys(dados[0]) : [];
      rows = dados.map(item => Object.values(item));
      break;
  }
  
  // Adicionar tabela
  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: yPosition,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [66, 139, 202] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { top: 10, bottom: 10 },
  });
  
  // Adicionar rodapé com data de geração
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Gerado em ${formatDate(new Date())} - Página ${i} de ${pageCount}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }
  
  // Salvar arquivo
  const nomeArquivo = `relatorio-${tipo}-${Date.now()}.pdf`;
  doc.save(nomeArquivo);
};

// Exportar para Excel
export const exportarExcel = (
  tipo: 'pedidos' | 'produtos' | 'clientes' | 'geral',
  dados: any[],
  nomeArquivo: string
) => {
  let worksheetData: any[] = [];
  
  switch (tipo) {
    case 'pedidos':
      worksheetData = dados.map(p => ({
        'Nº Pedido': p.numero_pedido || '-',
        'Cliente': p.cliente?.nome || '-',
        'Vendedor': p.vendedor?.nome || '-',
        'Status': p.status || '-',
        'Valor Total': p.valor_final || 0,
        'Data': formatDate(p.created_at),
        'Pago': p.pago ? 'Sim' : 'Não',
        'Tipo Retirada': p.tipo_retirada === 'balcao' ? 'Balcão' : 'Entrega',
        'Desconto': p.desconto_total || 0,
      }));
      break;
      
    case 'produtos':
      worksheetData = dados.map(p => ({
        'Produto': p.nome || '-',
        'Código de Barras': p.codigo_barras || '-',
        'Categoria': p.categoria?.nome || '-',
        'Preço de Venda': p.preco || 0,
        'Custo': p.custo || 0,
        'Margem (%)': p.preco && p.custo ? ((p.preco - p.custo) / p.preco * 100).toFixed(2) : 0,
        'Estoque': p.estoque || 0,
        'Estoque Mínimo': p.estoque_minimo || 0,
        'Ativo': p.ativo ? 'Sim' : 'Não',
      }));
      break;
      
    case 'clientes':
      worksheetData = dados.map(c => ({
        'Nome': c.nome || '-',
        'CPF/CNPJ': c.cpf_cnpj || '-',
        'Celular': c.celular || '-',
        'Telefone': c.telefone || '-',
        'Email': c.email || '-',
        'Endereço': c.endereco || '-',
        'Cidade': c.cidade || '-',
        'Estado': c.estado || '-',
        'CEP': c.cep || '-',
        'Tipo': c.tipo || '-',
      }));
      break;
      
    case 'geral':
      worksheetData = dados;
      break;
  }
  
  // Criar worksheet e workbook
  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório');
  
  // Ajustar largura das colunas
  const maxWidth = 50;
  const colWidths = Object.keys(worksheetData[0] || {}).map(key => ({
    wch: Math.min(
      maxWidth,
      Math.max(
        key.length,
        ...worksheetData.map(row => String(row[key] || '').length)
      )
    ),
  }));
  worksheet['!cols'] = colWidths;
  
  // Salvar arquivo
  XLSX.writeFile(workbook, `${nomeArquivo}.xlsx`);
};

// Exportar para CSV
export const exportarCSV = (
  tipo: 'pedidos' | 'produtos' | 'clientes' | 'geral',
  dados: any[],
  nomeArquivo: string
) => {
  let csvContent = '';
  let headers: string[] = [];
  let rows: string[][] = [];
  
  switch (tipo) {
    case 'pedidos':
      headers = ['Nº Pedido', 'Cliente', 'Vendedor', 'Status', 'Valor', 'Data', 'Pago'];
      rows = dados.map(p => [
        p.numero_pedido || '-',
        p.cliente?.nome || '-',
        p.vendedor?.nome || '-',
        p.status || '-',
        String(p.valor_final || 0),
        formatDate(p.created_at),
        p.pago ? 'Sim' : 'Não',
      ]);
      break;
      
    case 'produtos':
      headers = ['Produto', 'Código', 'Categoria', 'Preço', 'Custo', 'Estoque', 'Est. Mín.'];
      rows = dados.map(p => [
        p.nome || '-',
        p.codigo_barras || '-',
        p.categoria?.nome || '-',
        String(p.preco || 0),
        String(p.custo || 0),
        String(p.estoque || 0),
        String(p.estoque_minimo || 0),
      ]);
      break;
      
    case 'clientes':
      headers = ['Nome', 'CPF/CNPJ', 'Celular', 'Email', 'Cidade', 'Tipo'];
      rows = dados.map(c => [
        c.nome || '-',
        c.cpf_cnpj || '-',
        c.celular || '-',
        c.email || '-',
        c.cidade || '-',
        c.tipo || '-',
      ]);
      break;
      
    case 'geral':
      if (dados.length > 0) {
        headers = Object.keys(dados[0]);
        rows = dados.map(item => Object.values(item).map(v => String(v || '-')));
      }
      break;
  }
  
  // Criar conteúdo CSV
  const escapeCsvValue = (value: string) => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };
  
  csvContent = headers.map(escapeCsvValue).join(',') + '\n';
  csvContent += rows.map(row => row.map(escapeCsvValue).join(',')).join('\n');
  
  // Criar e baixar arquivo
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${nomeArquivo}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
