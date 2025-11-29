import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowLeft, Edit, Trash2, Plus, Loader2, AlertCircle, User, Printer, ChevronDown, ChevronUp, Copy, Save } from "lucide-react";
import boardIcon from "@/assets/board.svg";
import gridIcon from "@/assets/grid.svg";
import { toast } from "@/utils/toastHelper";
import { cn, isValidPedidoIdentifier, gerarCodigoEntrega } from "@/lib/utils";
import { usePedidos } from "@/hooks/usePedidos";
import { useItensPedido } from "@/hooks/useItensPedido";
import { useStatusConfig } from "@/hooks/useStatusConfig";
import { useProdutos } from "@/hooks/useProdutos";
import { useClientes } from "@/hooks/useClientes";
import { useUsuarios } from "@/hooks/useUsuarios";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatBRL, parseCurrencyToNumber } from "@/utils/inputMasks";
import { ClienteForm } from "@/components/clientes/ClienteForm";
import ComentariosObservacoes from "@/components/loja/ComentariosObservacoes";
import { FormaPagamentoSelector } from "@/components/loja/FormaPagamentoSelector";
import { ModalProdutoCheckout } from "@/components/loja/ModalProdutoCheckout";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ProdutoEdit {
  id: string;
  produto_id: string;
  variacao_id?: string;
  quantidade: number;
  preco_unitario: number;
  desconto: number;
  observacoes?: string;
  produtos?: {
    nome: string;
    codigo_barras?: string;
  };
  variacoes_produto?: {
    nome: string;
  };
}

export default function Checkout() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Validar se o ID é válido (UUID ou número de pedido) antes de prosseguir
  const isValidIdentifier = id && isValidPedidoIdentifier(id);
  
  const { fetchPedidoById, updatePedido } = usePedidos();
  const { status: statusConfig } = useStatusConfig();
  const { produtos: produtosDB } = useProdutos();
  const { usuarios } = useUsuarios();

  const [pedido, setPedido] = useState<any>(null);
  const [pedidoUUID, setPedidoUUID] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [produtosEdit, setProdutosEdit] = useState<ProdutoEdit[]>([]);
  const [editandoProduto, setEditandoProduto] = useState<string | null>(null);
  const [novoProduto, setNovoProduto] = useState({
    produto_id: "",
    quantidade: 1,
    preco_unitario: 0,
    desconto: 0,
  });
  const [layoutView, setLayoutView] = useState<'grid' | 'list'>(() => {
    const saved = localStorage.getItem('checkout-layout-view');
    return (saved as 'grid' | 'list') || 'grid';
  });
  const [meioPagamento, setMeioPagamento] = useState<string | null>(null);
  const [gerarNotaFiscal, setGerarNotaFiscal] = useState(false);
  const [modalProdutoOpen, setModalProdutoOpen] = useState(false);
  const [produtoModalData, setProdutoModalData] = useState<ProdutoEdit | null>(null);

  // Inicializar hooks APÓS ter o UUID
  const { itens, addItem, updateItem, deleteItem, fetchItens } = useItensPedido(pedidoUUID || undefined);

  useEffect(() => {
    const loadPedido = async () => {
      console.log('🔍 [CHECKOUT] Iniciando loadPedido com id:', id);
      console.log('🔍 [CHECKOUT] isValidIdentifier:', isValidIdentifier);
      
      if (!id || !isValidIdentifier) {
        console.error('❌ [CHECKOUT] ID inválido ou não fornecido');
        setError(id ? "ID ou número do pedido inválido" : "ID do pedido não fornecido");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log('🔄 [CHECKOUT] Chamando fetchPedidoById com:', id);
        const data = await fetchPedidoById(id);
        console.log('📦 [CHECKOUT] Dados recebidos:', data);

        if (!data) {
          console.error('❌ [CHECKOUT] Pedido não encontrado');
          setError("Pedido não encontrado");
          setLoading(false);
          return;
        }

        console.log('✅ [CHECKOUT] Pedido carregado com sucesso. UUID:', data.id);
        setPedido(data);
        setPedidoUUID(data.id); // Setar o UUID para o hook carregar os itens
        setStatus(data.status || "");
        setMeioPagamento(data.meio_pagamento || null);
        setGerarNotaFiscal(data.gerar_nf || false);
        setLoading(false);
      } catch (err: any) {
        console.error('❌ [CHECKOUT] Erro ao carregar pedido:', err);
        setError(err.message || "Erro ao carregar pedido");
        setLoading(false);
      }
    };

    loadPedido();
  }, [id, isValidIdentifier]);

  useEffect(() => {
    setProdutosEdit(itens.map(item => ({
      id: item.id,
      produto_id: item.produto_id || "",
      variacao_id: item.variacao_id,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      desconto: item.desconto || 0,
      observacoes: item.observacoes,
      produtos: item.produtos,
      variacoes_produto: item.variacoes_produto,
    })));
  }, [itens]);

  const handleClienteSuccess = async () => {
    toast.success("Cliente atualizado com sucesso!");
    setSearchParams({});
    
    // Recarregar pedido
    if (id) {
      const data = await fetchPedidoById(id);
      if (data) {
        setPedido(data);
        setPedidoUUID(data.id);
      }
    }
  };

  const handleEditarProduto = (produtoId: string) => {
    const produto = produtosEdit.find(p => p.id === produtoId);
    if (produto) {
      setProdutoModalData(produto);
      setModalProdutoOpen(true);
    }
  };

  const handleSalvarProduto = async (produtoData: any) => {
    if (!pedidoUUID) return;
    
    try {
      const subtotal = (produtoData.quantidade * produtoData.preco_unitario) - produtoData.desconto;
      
      // Montar observações com campos extras
      let observacoes = produtoData.observacoes || "";
      const camposExtras = [];
      if (produtoData.medida) camposExtras.push(`Medida: ${produtoData.medida}`);
      if (produtoData.material) camposExtras.push(`Material: ${produtoData.material}`);
      if (produtoData.acabamento) camposExtras.push(`Acabamento: ${produtoData.acabamento}`);
      
      if (camposExtras.length > 0) {
        observacoes = camposExtras.join(" | ") + (observacoes ? ` | ${observacoes}` : "");
      }
      
      if (produtoData.id) {
        // Editar produto existente
        await updateItem(produtoData.id, {
          quantidade: produtoData.quantidade,
          preco_unitario: produtoData.preco_unitario,
          desconto: produtoData.desconto,
          subtotal,
          observacoes,
        });
        toast.success("Produto atualizado com sucesso!");
      } else {
        // Adicionar novo produto
        await addItem({
          pedido_id: pedidoUUID,
          produto_id: produtoData.produto_id,
          quantidade: produtoData.quantidade,
          preco_unitario: produtoData.preco_unitario,
          desconto: produtoData.desconto,
          subtotal,
          observacoes,
        });
        toast.success("Produto adicionado com sucesso!");
      }
      
      // Recarregar os itens
      if (pedidoUUID) {
        await fetchItens(pedidoUUID);
      }
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
      toast.error("Erro ao salvar produto");
    }
  };

  const handleAbrirModalAdicionar = () => {
    setProdutoModalData(null);
    setModalProdutoOpen(true);
  };

  const handleRemoverProduto = async (produtoId: string) => {
    if (!pedidoUUID) return;
    
    try {
      await deleteItem(produtoId);
      toast.success("Produto removido com sucesso!");
      fetchItens(pedidoUUID);
    } catch (error: any) {
      // Erro já tratado no hook
    }
  };

  const handleAdicionarProduto = async () => {
    if (!novoProduto.produto_id || !pedidoUUID) return;

    try {
      const subtotal = (novoProduto.quantidade * novoProduto.preco_unitario) - novoProduto.desconto;
      
      await addItem({
        pedido_id: pedidoUUID,
        produto_id: novoProduto.produto_id,
        quantidade: novoProduto.quantidade,
        preco_unitario: novoProduto.preco_unitario,
        desconto: novoProduto.desconto,
        subtotal: subtotal,
      });
      
      setNovoProduto({
        produto_id: "",
        quantidade: 1,
        preco_unitario: 0,
        desconto: 0,
      });
      
      toast.success("Produto adicionado com sucesso!");
      if (pedidoUUID) fetchItens(pedidoUUID);
    } catch (error: any) {
      // Erro já tratado no hook
    }
  };

  const handleImprimirPedido = () => {
    if (!pedido) return;

    const doc = new jsPDF();
    
    // Cabeçalho
    doc.setFontSize(20);
    doc.text('Pedido de Compra', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Pedido Nº ${parseInt(pedido.numero_pedido, 10).toString()}`, 105, 30, { align: 'center' });
    
    // Informações do Cliente
    let y = 45;
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Cliente', 14, y);
    
    y += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    if (pedido.clientes) {
      doc.text(`Nome: ${pedido.clientes.nome}`, 14, y);
      y += 5;
      
      if (pedido.clientes.celular) {
        doc.text(`Celular: ${pedido.clientes.celular}`, 14, y);
        y += 5;
      }
      
      if (pedido.clientes.email) {
        doc.text(`Email: ${pedido.clientes.email}`, 14, y);
        y += 5;
      }
      
      if (pedido.clientes.cpf_cnpj) {
        doc.text(`CPF/CNPJ: ${pedido.clientes.cpf_cnpj}`, 14, y);
        y += 5;
      }
    }
    
    // Status e Data
    y += 5;
    doc.setFont(undefined, 'bold');
    doc.text('Informações do Pedido', 14, y);
    
    y += 7;
    doc.setFont(undefined, 'normal');
    doc.text(`Status: ${pedido.status}`, 14, y);
    y += 5;
    doc.text(`Tipo de Retirada: ${pedido.tipo_retirada === 'balcao' ? 'Balcão' : 'Entrega'}`, 14, y);
    y += 5;
    doc.text(`Data: ${new Date(pedido.created_at).toLocaleDateString('pt-BR')}`, 14, y);
    
    // Tabela de Produtos
    y += 10;
    
    const produtosData = produtosEdit.map((produto) => [
      produto.produtos?.nome + (produto.variacoes_produto?.nome ? ` - ${produto.variacoes_produto.nome}` : ''),
      produto.quantidade.toString(),
      formatBRL(produto.preco_unitario),
      produto.desconto > 0 ? formatBRL(produto.desconto) : '-',
      formatBRL((produto.quantidade * produto.preco_unitario) - produto.desconto)
    ]);
    
    autoTable(doc, {
      startY: y,
      head: [['Produto', 'Qtd', 'Preço Unit.', 'Desconto', 'Subtotal']],
      body: produtosData,
      theme: 'striped',
      headStyles: { fillColor: [66, 66, 66] },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' }
      }
    });
    
    // Totais
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Total: ${formatBRL(totalPedido)}`, 195, finalY, { align: 'right' });
    
    // Observações
    if (pedido.observacoes) {
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text('Observações:', 14, finalY + 10);
      doc.setFont(undefined, 'normal');
      const observacoesLines = doc.splitTextToSize(pedido.observacoes, 180);
      doc.text(observacoesLines, 14, finalY + 15);
    }
    
    // Salvar PDF
    doc.save(`pedido-${parseInt(pedido.numero_pedido, 10).toString()}.pdf`);
    toast.success('PDF gerado com sucesso!');
  };

  const handleSalvar = async () => {
    if (!id || !pedido) return;

    try {
      // Recalcular totais
      const total = produtosEdit.reduce((acc, p) => {
        return acc + ((p.quantidade * p.preco_unitario) - p.desconto);
      }, 0);

      // Gerar código de entrega se status for "Entrega" e tiver vendedor
      let codigoEntrega = pedido.codigo_retirada;
      if (status === 'Entrega' && pedido.vendedor_id) {
        const vendedor = usuarios.find(u => u.id === pedido.vendedor_id);
        if (vendedor) {
          codigoEntrega = gerarCodigoEntrega(vendedor.nome, pedido.numero_pedido);
        }
      } else if (status !== 'Entrega') {
        // Limpar código de entrega se status não for mais "Entrega"
        codigoEntrega = null;
      }

      await updatePedido(id, {
        status: status,
        total: total,
        valor_final: total,
        meio_pagamento: meioPagamento,
        gerar_nf: gerarNotaFiscal,
        codigo_retirada: codigoEntrega,
      });
      
      toast.success("Pedido atualizado com sucesso!");
      setTimeout(() => {
        navigate("/inicio");
      }, 500);
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  console.log('🎨 [CHECKOUT] Renderizando componente. Estado:', {
    loading,
    error,
    pedido: pedido?.id,
    produtosEdit: produtosEdit.length
  });

  if (loading) {
    console.log('⏳ [CHECKOUT] Mostrando tela de loading');
    return (
      <div className="min-h-screen bg-background">
        <Sidebar type="loja" />
        <main className="p-4 md:p-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !pedido) {
    console.log('❌ [CHECKOUT] Mostrando tela de erro:', { error, pedido: !!pedido });
    return (
      <div className="min-h-screen bg-background">
        <Sidebar type="loja" />
        <main className="p-4 md:p-8">
          <div className="max-w-[1600px] mx-auto">
            <Button variant="ghost" size="icon" onClick={() => navigate("/inicio")} className="mb-4">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error || "Pedido não encontrado"}</AlertDescription>
            </Alert>
          </div>
        </main>
      </div>
    );
  }

  const totalPedido = produtosEdit.reduce((acc, p) => {
    return acc + ((p.quantidade * p.preco_unitario) - p.desconto);
  }, 0);

  console.log('✅ [CHECKOUT] Renderizando tela principal com dados:', {
    pedidoId: pedido.id,
    numeroPedido: pedido.numero_pedido,
    totalProdutos: produtosEdit.length,
    totalPedido
  });

  return (
    <div className="min-h-screen bg-background">
      <Sidebar type="loja" />
      <main className="p-4 md:p-8">
        <div className="max-w-[1600px] mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/inicio")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <span className="text-xl font-semibold text-foreground">Checkout - Pedido</span>
                
                {/* Badge com número do pedido */}
                <Badge
                  onClick={() => {
                    navigator.clipboard.writeText(pedido.numero_pedido);
                    toast.success("Número do pedido copiado!");
                  }}
                  className="px-4 py-2 text-base font-bold cursor-pointer hover:opacity-90 transition-opacity flex items-center gap-2 border-0 rounded-lg"
                  style={{
                    backgroundColor: '#212121',
                    color: '#ffffff'
                  }}
                >
                  #{parseInt(pedido.numero_pedido, 10).toString()}
                  <Copy className="h-4 w-4" />
                </Badge>
                
                {/* Código de Entrega - Aparece apenas quando status for "Entrega" */}
                {status === 'Entrega' && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          onClick={() => {
                            // Usar código salvo no banco ou gerar se não existir
                            const codigoSalvo = pedido?.codigo_retirada;
                            if (codigoSalvo) {
                              navigator.clipboard.writeText(codigoSalvo);
                              toast.success('Código de entrega copiado!');
                              return;
                            }
                            
                            const vendedor = usuarios.find(u => u.id === pedido.vendedor_id);
                            if (!vendedor) return;
                            
                            const codigoEntrega = gerarCodigoEntrega(vendedor.nome, pedido.numero_pedido);
                            
                            navigator.clipboard.writeText(codigoEntrega);
                            toast.success('Código de entrega copiado!');
                          }}
                          className="px-4 py-2 text-base font-bold cursor-pointer hover:opacity-90 transition-opacity flex items-center gap-2 rounded-lg border-2"
                          style={{
                            backgroundColor: '#ffffff',
                            color: '#000000',
                            borderColor: '#000000'
                          }}
                        >
                          {(() => {
                            // Usar código salvo no banco ou gerar se não existir
                            const codigoSalvo = pedido?.codigo_retirada;
                            if (codigoSalvo) return codigoSalvo;
                            
                            const vendedor = usuarios.find(u => u.id === pedido.vendedor_id);
                            if (!vendedor) return 'N/A';
                            
                            return gerarCodigoEntrega(vendedor.nome, pedido.numero_pedido);
                          })()}
                          <Copy className="h-4 w-4" />
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Código de Entrega</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                
                {/* Status selector */}
                <div className="w-48">
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Selecione um status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusConfig
                        .filter((s) => s.ativo)
                        .map((statusItem) => (
                          <SelectItem key={statusItem.id} value={statusItem.nome}>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded" style={{ backgroundColor: statusItem.cor }} />
                              {statusItem.nome}
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex border rounded-lg bg-background shadow-sm">
                <Button
                  variant={layoutView === 'grid' ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => {
                    setLayoutView('grid');
                    localStorage.setItem('checkout-layout-view', 'grid');
                  }}
                  className="rounded-r-none h-9 w-9"
                >
                  <img src={boardIcon} alt="Board view" className="h-4 w-4" />
                </Button>
                <Button
                  variant={layoutView === 'list' ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => {
                    setLayoutView('list');
                    localStorage.setItem('checkout-layout-view', 'list');
                  }}
                  className="rounded-l-none h-9 w-9"
                >
                  <img src={gridIcon} alt="List view" className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" size="icon" onClick={handleImprimirPedido} className="h-9 w-9">
                <Printer className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Layout Grid - 3 colunas lado a lado como tabela */}
          {layoutView === 'grid' && (
            <div className="space-y-6">
              {/* Grid: Dados do Cliente, Produtos e Pagamento lado a lado */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Coluna 1: Dados do Cliente */}
                <div className="flex flex-col h-full">
                  <Card className="flex-1 shadow-lg border-border/40">
                    <CardHeader>
                      <CardTitle className="text-xl font-semibold">Dados do Cliente</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {pedido.clientes ? (
                        <>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Nome</p>
                            <p className="font-medium">{pedido.clientes.nome}</p>
                          </div>
                          {pedido.clientes.celular && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Celular</p>
                              <p className="font-medium">{pedido.clientes.celular}</p>
                            </div>
                          )}
                          {pedido.clientes.email && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">E-mail</p>
                              <p className="font-medium break-all">{pedido.clientes.email}</p>
                            </div>
                          )}
                          {pedido.clientes.tipo && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Tipo de Pessoa</p>
                              <p className="font-medium">{pedido.clientes.tipo}</p>
                            </div>
                          )}
                          {pedido.clientes.cpf_cnpj && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">CPF</p>
                              <p className="font-medium">{pedido.clientes.cpf_cnpj}</p>
                            </div>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSearchParams({ clienteModal: 'editar' })}
                            className="w-full mt-2"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar Cliente
                          </Button>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">Cliente não identificado</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Coluna 2: Produtos */}
                <div className="flex flex-col h-full">
                  <Card className="flex-1 shadow-lg border-border/40">
                    <CardHeader>
                      <CardTitle className="text-xl font-semibold">Produtos</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <ScrollArea className="max-h-[400px]">
                        <div className="space-y-3 pr-4">
                          {produtosEdit.map((produto) => (
                            <div key={produto.id} className="border-b pb-3 last:border-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm line-clamp-2">
                                    {produto.produtos?.nome}
                                    {produto.variacoes_produto?.nome && ` - ${produto.variacoes_produto.nome}`}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Qtd: {produto.quantidade} x {formatBRL(produto.preco_unitario)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <p className="font-bold text-primary text-sm whitespace-nowrap">
                                    {formatBRL((produto.quantidade * produto.preco_unitario) - produto.desconto)}
                                  </p>
                                  <button
                                    onClick={() => {
                                      if (editandoProduto === produto.id) {
                                        setEditandoProduto(null);
                                      } else {
                                        setEditandoProduto(produto.id);
                                      }
                                    }}
                                    className="text-muted-foreground hover:text-foreground"
                                  >
                                    {editandoProduto === produto.id ? (
                                      <ChevronUp className="h-4 w-4" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                  </button>
                                </div>
                              </div>
                              
                              {editandoProduto === produto.id && (
                                <div className="mt-3 space-y-3 bg-muted/30 p-3 rounded-lg">
                                  <div className="grid grid-cols-3 gap-2">
                                    <div>
                                      <label className="text-xs font-medium">Qtd</label>
                                      <Input
                                        type="number"
                                        min="1"
                                        className="h-8 text-xs"
                                        value={produto.quantidade}
                                        onChange={(e) => {
                                          const newProdutos = produtosEdit.map((p) =>
                                            p.id === produto.id ? { ...p, quantidade: parseInt(e.target.value) || 1 } : p
                                          );
                                          setProdutosEdit(newProdutos);
                                        }}
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs font-medium">Preço</label>
                                      <Input
                                        type="number"
                                        className="h-8 text-xs"
                                        value={produto.preco_unitario}
                                        onChange={(e) => {
                                          const newProdutos = produtosEdit.map((p) =>
                                            p.id === produto.id ? { ...p, preco_unitario: parseFloat(e.target.value) || 0 } : p
                                          );
                                          setProdutosEdit(newProdutos);
                                        }}
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs font-medium">Desc.</label>
                                      <Input
                                        type="number"
                                        className="h-8 text-xs"
                                        value={produto.desconto}
                                        onChange={(e) => {
                                          const newProdutos = produtosEdit.map((p) =>
                                            p.id === produto.id ? { ...p, desconto: parseFloat(e.target.value) || 0 } : p
                                          );
                                          setProdutosEdit(newProdutos);
                                        }}
                                      />
                                    </div>
                                  </div>
                                  <div className="flex justify-between items-center gap-2">
                                    <Button 
                                      variant="outline"
                                      size="sm" 
                                      className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => handleRemoverProduto(produto.id)}
                                    >
                                      <Trash2 className="h-3 w-3 mr-1" />
                                      Excluir
                                    </Button>
                                    <div className="flex gap-2">
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-7 text-xs"
                                        onClick={() => {
                                          setProdutoModalData({
                                            id: produto.id,
                                            produto_id: produto.produto_id,
                                            variacao_id: produto.variacao_id,
                                            quantidade: produto.quantidade,
                                            preco_unitario: produto.preco_unitario,
                                            desconto: produto.desconto,
                                            observacoes: produto.observacoes,
                                          });
                                          setModalProdutoOpen(true);
                                        }}
                                      >
                                        <Edit className="h-3 w-3 mr-1" />
                                        Editar
                                      </Button>
                                      <Button 
                                        variant="outline"
                                        size="sm" 
                                        className="h-7 text-xs"
                                        onClick={() => handleSalvarProduto(produto)}
                                      >
                                        <Save className="h-3 w-3 mr-1" />
                                        Salvar
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>

                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-2"
                        onClick={handleAbrirModalAdicionar}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Produto
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Coluna 3: Pagamento */}
                <div className="flex flex-col h-full">
                  <Card className="flex-1 shadow-lg border-border/40">
                    <CardHeader>
                      <CardTitle className="text-xl font-semibold">Pagamento</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Preço Total do Pedido</p>
                        <p className="text-3xl font-bold text-primary">
                          {formatBRL(totalPedido)}
                        </p>
                      </div>

                      <FormaPagamentoSelector
                        meioPagamento={meioPagamento}
                        onMeioPagamentoChange={setMeioPagamento}
                        gerarNotaFiscal={gerarNotaFiscal}
                        onGerarNotaFiscalChange={setGerarNotaFiscal}
                      />

                      <Button 
                        className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90"
                        onClick={handleSalvar}
                      >
                        FINALIZAR PEDIDO
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Comentários/Observações (Histórico do Pedido) na linha de baixo */}
              <div>
                {pedidoUUID && <ComentariosObservacoes pedidoId={pedidoUUID} />}
              </div>
            </div>
          )}

          {/* Layout List - tudo empilhado */}
          {layoutView === 'list' && (
            <div className="space-y-6">
              {/* Cliente */}
              <Card className="shadow-lg border-border/40">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-xl font-semibold">Cliente</CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSearchParams({ clienteModal: 'editar' })}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {pedido.clientes ? (
                    <>
                      <div>
                        <p className="text-sm text-muted-foreground">Nome:</p>
                        <p className="font-semibold flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {pedido.clientes.nome}
                        </p>
                      </div>
                      {pedido.clientes.celular && (
                        <div>
                          <p className="text-sm text-muted-foreground">Celular:</p>
                          <p>{pedido.clientes.celular}</p>
                        </div>
                      )}
                      {pedido.clientes.email && (
                        <div>
                          <p className="text-sm text-muted-foreground">Email:</p>
                          <p>{pedido.clientes.email}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Cliente não identificado</p>
                  )}
                </CardContent>
              </Card>

              {/* Produtos */}
              <Card className="shadow-lg border-border/40">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-xl font-semibold">Produtos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {produtosEdit.map((produto) => (
                    <div key={produto.id} className="border rounded-lg p-4">
                      {editandoProduto === produto.id ? (
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">Produto</label>
                            <p className="text-sm text-muted-foreground mt-1">
                              {produto.produtos?.nome}
                              {produto.variacoes_produto?.nome && ` - ${produto.variacoes_produto.nome}`}
                            </p>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label className="text-sm font-medium">Quantidade</label>
                              <Input
                                type="number"
                                min="1"
                                value={produto.quantidade}
                                onChange={(e) => {
                                  const newProdutos = produtosEdit.map((p) =>
                                    p.id === produto.id ? { ...p, quantidade: parseInt(e.target.value) || 1 } : p
                                  );
                                  setProdutosEdit(newProdutos);
                                }}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Preço Unit.</label>
                              <Input
                                value={produto.preco_unitario}
                                onChange={(e) => {
                                  const newProdutos = produtosEdit.map((p) =>
                                    p.id === produto.id ? { ...p, preco_unitario: parseFloat(e.target.value) || 0 } : p
                                  );
                                  setProdutosEdit(newProdutos);
                                }}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Desconto</label>
                              <Input
                                value={produto.desconto}
                                onChange={(e) => {
                                  const newProdutos = produtosEdit.map((p) =>
                                    p.id === produto.id ? { ...p, desconto: parseFloat(e.target.value) || 0 } : p
                                  );
                                  setProdutosEdit(newProdutos);
                                }}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Observações</label>
                            <Textarea
                              value={produto.observacoes || ""}
                              onChange={(e) => {
                                const newProdutos = produtosEdit.map((p) =>
                                  p.id === produto.id ? { ...p, observacoes: e.target.value } : p
                                );
                                setProdutosEdit(newProdutos);
                              }}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setEditandoProduto(null)}>
                              Cancelar
                            </Button>
                            <Button size="sm" onClick={() => handleSalvarProduto(produto)}>
                              Salvar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium">
                              {produto.produtos?.nome}
                              {produto.variacoes_produto?.nome && ` - ${produto.variacoes_produto.nome}`}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Qtd: {produto.quantidade} x {formatBRL(produto.preco_unitario)}
                              {produto.desconto > 0 && ` (-${formatBRL(produto.desconto)})`}
                            </p>
                            {produto.observacoes && (
                              <p className="text-sm text-muted-foreground mt-1">{produto.observacoes}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{formatBRL((produto.quantidade * produto.preco_unitario) - produto.desconto)}</span>
                            <Button variant="ghost" size="sm" onClick={() => handleEditarProduto(produto.id)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleRemoverProduto(produto.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Botão Adicionar novo produto */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={handleAbrirModalAdicionar}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Produto
                  </Button>
                </CardContent>
              </Card>

              {/* Pagamento */}
              <Card className="shadow-lg border-border/40">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold">Pagamento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Preço Total do Pedido</p>
                    <p className="text-2xl font-bold text-primary">{formatBRL(totalPedido)}</p>
                  </div>
                  <FormaPagamentoSelector
                    meioPagamento={meioPagamento}
                    onMeioPagamentoChange={setMeioPagamento}
                    gerarNotaFiscal={gerarNotaFiscal}
                    onGerarNotaFiscalChange={setGerarNotaFiscal}
                  />
                </CardContent>
              </Card>

              {/* Comentários */}
              {pedidoUUID && <ComentariosObservacoes pedidoId={pedidoUUID} />}
            </div>
          )}

          {/* Botões Rodapé - removidos pois agora o botão está no card de Pagamento */}
        </div>
      </main>

      {/* Modal de Editar Cliente controlado por query params */}
      <Dialog open={searchParams.get("clienteModal") === "editar"} onOpenChange={(open) => {
        if (!open) setSearchParams({});
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          {pedido?.clientes && (
            <ClienteForm
              cliente={pedido.clientes}
              onSuccess={handleClienteSuccess}
              onClose={() => setSearchParams({})}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Produto Completo */}
      <ModalProdutoCheckout
        open={modalProdutoOpen}
        onOpenChange={setModalProdutoOpen}
        onSave={handleSalvarProduto}
        produtoInicial={produtoModalData}
        titulo={produtoModalData ? "Editar Produto" : "Adicionar Produto"}
      />
    </div>
  );
}
