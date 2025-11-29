import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowLeft, Copy, Search, Loader2, AlertCircle, ChevronDown, ChevronUp, UserCog, Tag, X, Pencil, RotateCcw, ThumbsUp, ThumbsDown } from "lucide-react";
import { ModalEditarCliente } from "@/components/clientes/ModalEditarCliente";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "@/utils/toastHelper";
import { cn, isValidPedidoIdentifier, gerarCodigoEntrega } from "@/lib/utils";
import { usePedidos } from "@/hooks/usePedidos";
import { useItensPedido } from "@/hooks/useItensPedido";
import { useStatusConfig } from "@/hooks/useStatusConfig";
import { useUsuarios } from "@/hooks/useUsuarios";
import { useClientes } from "@/hooks/useClientes";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/utils/inputMasks";
import { Label } from "@/components/ui/label";
import ComentariosObservacoes from "@/components/loja/ComentariosObservacoes";
import { GerenciadorItensPedido } from "@/components/loja/GerenciadorItensPedido";

const UNASSIGNED_VENDOR_VALUE = "__UNASSIGNED_VENDOR__";

export default function DetalhesPedido() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const isValidIdentifier = id && isValidPedidoIdentifier(id);
  
  const { fetchPedidoById, updatePedido } = usePedidos();
  
  const [pedido, setPedido] = useState<any>(null);
  const [pedidoUUID, setPedidoUUID] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [vendedorId, setVendedorId] = useState('');
  const [buscaEtiqueta, setBuscaEtiqueta] = useState("");
  const [historicoCompras, setHistoricoCompras] = useState<any[]>([]);
  const [novoClienteId, setNovoClienteId] = useState("");
  const [etiquetasDB, setEtiquetasDB] = useState<Array<{ id: string; nome: string; cor: string }>>([]);
  const [etiquetasSelecionadas, setEtiquetasSelecionadas] = useState<Array<{ id: string; nome: string; cor: string }>>([]);
  const [mostrarSugestoesEtiqueta, setMostrarSugestoesEtiqueta] = useState(false);
  const [pedidoExpandido, setPedidoExpandido] = useState<string | null>(null);
  const [produtoExpandido, setProdutoExpandido] = useState<string | null>(null);
  const [pago, setPago] = useState(false);
  const [modalEditarCliente, setModalEditarCliente] = useState(false);
  const [itensEditados, setItensEditados] = useState<any[]>([]);
  const [itensParaDeletar, setItensParaDeletar] = useState<string[]>([]);
  const dropdownEtiquetaRef = useRef<HTMLDivElement>(null);

  const { itens, loading: loadingItens } = useItensPedido(pedidoUUID || undefined);
  const { status: statusConfig, loading: loadingStatus } = useStatusConfig();
  const { usuarios, loading: loadingUsuarios } = useUsuarios();
  const { clientes, loading: loadingClientes } = useClientes();

  // Carregar etiquetas do banco
  useEffect(() => {
    const fetchEtiquetas = async () => {
      const { data, error } = await supabase
        .from("etiquetas")
        .select("*")
        .order("nome");
      
      if (error) {
        console.error("Erro ao carregar etiquetas:", error);
        return;
      }
      
      setEtiquetasDB(data || []);
    };
    
    fetchEtiquetas();
  }, []);

  // Carregar pedido principal
  useEffect(() => {
    const loadPedido = async () => {
      if (!id || !isValidIdentifier) {
        setError(id ? 'ID ou número do pedido inválido' : 'ID do pedido não fornecido');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const data = await fetchPedidoById(id);
        
        if (!data) {
          setError('Pedido não encontrado');
          setLoading(false);
          return;
        }
        
        setPedido(data);
        setPedidoUUID(data.id);
        setStatus(data.status || '');
        setVendedorId(data.vendedor_id || '');
        setPago(data.pago || false);
        
        // Carregar etiquetas do pedido
        const { data: etiquetasPedido } = await supabase
          .from('pedidos_etiquetas')
          .select(`
            etiquetas (id, nome, cor)
          `)
          .eq('pedido_id', data.id);
        
        if (etiquetasPedido) {
          const etiquetas = etiquetasPedido
            .map(ep => ep.etiquetas)
            .filter((e): e is { id: string; nome: string; cor: string } => e !== null);
          setEtiquetasSelecionadas(etiquetas);
        }
        
        setLoading(false);
      } catch (err: any) {
        console.error('Erro ao carregar pedido:', err);
        setError(err.message || 'Erro ao carregar pedido');
        setLoading(false);
      }
    };

    loadPedido();
  }, [id, isValidIdentifier]);

  // Carregar histórico quando pedido e cliente estiverem disponíveis
  useEffect(() => {
    const loadHistorico = async () => {
      if (!pedido?.cliente_id || !pedido?.id) return;

      try {
        const { data: historico, error } = await supabase
          .from('pedidos')
          .select(`
            *,
            itens_pedido (
              id,
              quantidade,
              produtos (
                nome
              )
            )
          `)
          .eq('cliente_id', pedido.cliente_id)
          .neq('id', pedido.id)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (error) throw error;
        
        // Buscar informações dos vendedores
        const vendedorIds = [...new Set((historico || []).map(p => p.vendedor_id).filter(Boolean))];
        const { data: vendedoresData } = await supabase
          .from("perfis")
          .select("id, nome, username")
          .in("id", vendedorIds);
        
        const vendedoresMap = new Map(
          (vendedoresData || []).map(v => [v.id, v])
        );
        
        const pedidosFormatados = (historico || []).map(pedido => {
          const vendedor = vendedoresMap.get(pedido.vendedor_id);
          // Remove zeros à esquerda do número do pedido
          const numeroPedidoLimpo = String(pedido.numero_pedido).replace(/^0+/, '') || '0';
          return {
            ...pedido,
            numero: numeroPedidoLimpo,
            dataHora: new Date(pedido.created_at).toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }),
            valorTotal: pedido.valor_final || pedido.total || 0,
            vendedor: vendedor?.nome || vendedor?.username || 'N/A',
            produtos: (pedido.itens_pedido || [])
              .map((item: any) => item.produtos?.nome || 'Produto')
              .filter((nome: string, index: number, self: string[]) => self.indexOf(nome) === index),
          };
        });
        
        setHistoricoCompras(pedidosFormatados);
      } catch (err: any) {
        console.error('Erro ao carregar histórico:', err);
      }
    };

    loadHistorico();
  }, [pedido?.cliente_id, pedido?.id]);

  // Fechar dropdown de etiquetas ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownEtiquetaRef.current && !dropdownEtiquetaRef.current.contains(target)) {
        setMostrarSugestoesEtiqueta(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCopiarPedido = () => {
    if (pedido?.numero_pedido) {
      navigator.clipboard.writeText(pedido.numero_pedido);
      toast.success('Número do pedido copiado!');
    }
  };

  const handleCopiarCodigoEntrega = () => {
    // Usar código salvo no banco ou gerar se não existir
    const codigoSalvo = pedido?.codigo_retirada;
    if (codigoSalvo) {
      navigator.clipboard.writeText(codigoSalvo);
      toast.success('Código de entrega copiado!');
      return;
    }
    
    const vendedor = usuarios.find(u => u.id === vendedorId);
    if (!vendedor) return;
    
    const codigoEntrega = gerarCodigoEntrega(vendedor.nome, pedido.numero_pedido);
    
    navigator.clipboard.writeText(codigoEntrega);
    toast.success('Código de entrega copiado!');
  };

  const handleSalvar = async () => {
    if (!id || !pedido) return;

    try {
      // Deletar itens marcados para exclusão
      if (itensParaDeletar.length > 0) {
        for (const itemId of itensParaDeletar) {
          const { error } = await supabase
            .from('itens_pedido')
            .delete()
            .eq('id', itemId);
          
          if (error) throw error;
        }
      }

      // Salvar alterações dos itens do pedido
      if (itensEditados.length > 0) {
        for (const item of itensEditados) {
          if (item.isNew) {
            // Adicionar novo item
            const { error } = await supabase
              .from('itens_pedido')
              .insert({
                pedido_id: pedidoUUID,
                produto_id: item.produto_id,
                variacao_id: item.variacao_id || null,
                quantidade: item.quantidade,
                preco_unitario: item.preco_unitario,
                desconto: item.desconto || 0,
                subtotal: (item.quantidade * item.preco_unitario) - (item.desconto || 0),
                unidade_medida: item.unidade_medida || null,
                observacoes: item.observacoes || '',
              });
            
            if (error) throw error;
          } else {
            // Atualizar item existente
            const { error } = await supabase
              .from('itens_pedido')
              .update({
                produto_id: item.produto_id,
                variacao_id: item.variacao_id || null,
                quantidade: item.quantidade,
                preco_unitario: item.preco_unitario,
                desconto: item.desconto || 0,
                subtotal: (item.quantidade * item.preco_unitario) - (item.desconto || 0),
                unidade_medida: item.unidade_medida || null,
                observacoes: item.observacoes || '',
              })
              .eq('id', item.id);
            
            if (error) throw error;
          }
        }
      }

      // Recalcular totais do pedido
      const { data: itensAtualizados } = await supabase
        .from('itens_pedido')
        .select('subtotal')
        .eq('pedido_id', pedidoUUID);

      if (itensAtualizados) {
        const total = itensAtualizados.reduce((sum, item) => sum + Number(item.subtotal), 0);
        await supabase
          .from('pedidos')
          .update({ total, valor_final: total })
          .eq('id', pedidoUUID);
      }

      // Gerar código de entrega se status for "Entrega" e tiver vendedor
      let codigoEntrega = pedido.codigo_retirada;
      if (status === 'Entrega' && vendedorId) {
        const vendedor = usuarios.find(u => u.id === vendedorId);
        if (vendedor) {
          codigoEntrega = gerarCodigoEntrega(vendedor.nome, pedido.numero_pedido);
        }
      } else if (status !== 'Entrega') {
        // Limpar código de entrega se status não for mais "Entrega"
        codigoEntrega = null;
      }

      // Validar que temos um UUID válido
      if (!pedidoUUID) {
        throw new Error('UUID do pedido não encontrado');
      }

      console.log('💾 Salvando pedido:', {
        uuid: pedidoUUID,
        status: status,
        vendedor: vendedorId,
        codigo: codigoEntrega
      });

      // Salvar alterações do pedido (status, vendedor e código de entrega)
      await updatePedido(pedidoUUID, {
        status: status,
        vendedor_id: vendedorId || null,
        codigo_retirada: codigoEntrega,
      });

      toast.success('Pedido atualizado com sucesso!');
      
      // Limpar cache para forçar reload na página Inicio
      localStorage.removeItem('pedidos_cache');
      
      setTimeout(() => {
        navigate('/inicio');
      }, 500);
    } catch (error: any) {
      toast.error('Erro ao salvar alterações: ' + error.message);
    }
  };

  const handleTrocarCliente = async () => {
    if (!novoClienteId || !pedidoUUID) return;

    try {
      const { error } = await supabase
        .from('pedidos')
        .update({ cliente_id: novoClienteId })
        .eq('id', pedidoUUID);

      if (error) throw error;

      toast.success("Cliente trocado com sucesso!");
      setSearchParams({});
      setNovoClienteId("");
      
      if (id) {
        const data = await fetchPedidoById(id);
        if (data) {
          setPedido(data);
          setPedidoUUID(data.id);
        }
      }
    } catch (error: any) {
      toast.error("Erro ao trocar cliente: " + error.message);
    }
  };

  const togglePedidoExpandido = (pedidoId: string) => {
    setPedidoExpandido(pedidoExpandido === pedidoId ? null : pedidoId);
  };

  const toggleProdutoExpandido = (produtoId: string) => {
    setProdutoExpandido(produtoExpandido === produtoId ? null : produtoId);
  };

  const getSugestoesEtiquetas = (busca: string) => {
    if (!busca.trim()) return etiquetasDB;
    const termo = busca.toLowerCase();
    return etiquetasDB.filter(etiqueta => 
      etiqueta.nome.toLowerCase().includes(termo)
    );
  };
  
  const handleSelecionarEtiqueta = async (etiqueta: any) => {
    if (!pedidoUUID) return;
    
    if (etiquetasSelecionadas.find(e => e.id === etiqueta.id)) {
      toast.error("Etiqueta já adicionada");
      return;
    }

    try {
      await supabase
        .from("pedidos_etiquetas")
        .insert({
          pedido_id: pedidoUUID,
          etiqueta_id: etiqueta.id,
        });

      setEtiquetasSelecionadas([...etiquetasSelecionadas, etiqueta]);
      toast.success(`Etiqueta "${etiqueta.nome}" adicionada`);
      setBuscaEtiqueta("");
      setMostrarSugestoesEtiqueta(false);
    } catch (error: any) {
      toast.error("Erro ao adicionar etiqueta");
    }
  };
  
  const handleRemoverEtiqueta = async (etiquetaId: string) => {
    if (!pedidoUUID) return;

    try {
      await supabase
        .from("pedidos_etiquetas")
        .delete()
        .eq('pedido_id', pedidoUUID)
        .eq('etiqueta_id', etiquetaId);

      const etiquetaRemovida = etiquetasSelecionadas.find(e => e.id === etiquetaId);
      setEtiquetasSelecionadas(etiquetasSelecionadas.filter(e => e.id !== etiquetaId));
      toast.success(`Etiqueta "${etiquetaRemovida?.nome}" removida`);
    } catch (error: any) {
      toast.error("Erro ao remover etiqueta");
    }
  };

  if (loading) {
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
    return (
      <div className="min-h-screen bg-background">
        <Sidebar type="loja" />
        <main className="p-4 md:p-8">
          <div className="max-w-[1600px] mx-auto">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate("/inicio")}
              className="mb-4"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error || 'Pedido não encontrado'}
              </AlertDescription>
            </Alert>
          </div>
        </main>
      </div>
    );
  }

  const totalPedido = itens.reduce((acc, item) => acc + item.subtotal, 0);

  return (
    <div className="min-h-screen bg-background pb-28 md:pb-40">{/* Espaço para não ficar atrás da barra fixa */}
      <Sidebar type="loja" />
      <main className="p-4 md:p-8">
        <div className="max-w-[1600px] mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate("/inicio")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <span className="text-3xl font-bold text-foreground">Pedido:</span>
              <Badge
                onClick={handleCopiarPedido}
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
                        onClick={handleCopiarCodigoEntrega}
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
                            
                            const vendedor = usuarios.find(u => u.id === vendedorId);
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
            </div>
            <div className="flex items-center gap-2">
              {/* Etiquetas Selecionadas */}
              {etiquetasSelecionadas.map((etiqueta) => (
                <Badge
                  key={etiqueta.id}
                  style={{ 
                    backgroundColor: etiqueta.cor,
                    color: ['#fbbf24'].includes(etiqueta.cor) ? '#000' : '#fff'
                  }}
                  className="px-3 py-1.5 text-sm font-medium flex items-center gap-2 border-0 hover:opacity-90"
                >
                  {etiqueta.nome.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                  <X
                    className="h-3 w-3 cursor-pointer hover:opacity-70"
                    onClick={() => handleRemoverEtiqueta(etiqueta.id)}
                  />
                </Badge>
              ))}
              
              <Tag className="h-5 w-5 text-muted-foreground" />
              <div className="relative" ref={dropdownEtiquetaRef}>
                <Input 
                  placeholder="Adicionar etiqueta..."
                  value={buscaEtiqueta}
                  onChange={(e) => {
                    setBuscaEtiqueta(e.target.value);
                    setMostrarSugestoesEtiqueta(true);
                  }}
                  onFocus={() => setMostrarSugestoesEtiqueta(true)}
                  className="w-64"
                />
                
                {mostrarSugestoesEtiqueta && (
                  <div className="absolute z-50 w-full mt-1 border rounded-md shadow-lg max-h-80 overflow-auto">
                    {getSugestoesEtiquetas(buscaEtiqueta).map((etiqueta) => (
                      <button
                        key={etiqueta.id}
                        type="button"
                        onClick={() => handleSelecionarEtiqueta(etiqueta)}
                        disabled={etiquetasSelecionadas.some(e => e.id === etiqueta.id)}
                        style={{
                          backgroundColor: etiqueta.cor,
                          color: ['#fbbf24'].includes(etiqueta.cor) ? '#000' : '#fff'
                        }}
                        className="w-full text-left px-4 py-3 font-semibold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                      >
                        {etiqueta.nome.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>

          {/* Layout 2 Colunas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna Esquerda (70%) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Resumo */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Resumo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-4">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-2">Status:</p>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="text-foreground">
                          <SelectValue placeholder="Selecione um status" />
                        </SelectTrigger>
                        <SelectContent>
                          {loadingStatus ? (
                            <div className="flex justify-center p-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                          ) : statusConfig.length > 0 ? (
                            statusConfig.filter(s => s.ativo).map((statusItem) => (
                              <SelectItem key={statusItem.id} value={statusItem.nome}>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded" 
                                    style={{ backgroundColor: statusItem.cor }}
                                  />
                                  {statusItem.nome}
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            <div className="p-2 text-sm text-muted-foreground">
                              Nenhum status configurado
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-2">Funcionário:</p>
                      <Select 
                        value={vendedorId || UNASSIGNED_VENDOR_VALUE} 
                        onValueChange={(value) => {
                          setVendedorId(value === UNASSIGNED_VENDOR_VALUE ? '' : value);
                        }}
                      >
                        <SelectTrigger className="text-foreground">
                          <SelectValue placeholder="Selecione um funcionário">
                            {(() => {
                              if (!vendedorId || vendedorId === UNASSIGNED_VENDOR_VALUE) return "Não atribuído";
                              const vendedor = usuarios.find(u => u.id === vendedorId);
                              if (!vendedor) return "Funcionário não encontrado";
                              const nomeExibir = vendedor.nome_exibicao_pedidos || vendedor.username || "Sem nome de exibição";
                              return vendedor.ativo !== false ? nomeExibir : "O.S.";
                            })()}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border z-50">
                          <SelectItem value={UNASSIGNED_VENDOR_VALUE}>Não atribuído</SelectItem>
                          {loadingUsuarios ? (
                            <div className="flex justify-center p-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                          ) : (
                            usuarios.filter(u => u.ativo).map((usuario) => (
                              <SelectItem key={usuario.id} value={usuario.id}>
                                {usuario.nome_exibicao_pedidos || usuario.username || "Sem nome de exibição"}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Botão Pago */}
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Pagamento:</p>
                      <Button
                        onClick={async () => {
                          const novoPago = !pago;
                          setPago(novoPago);
                          
                          if (pedidoUUID) {
                            try {
                              const { error } = await supabase
                                .from('pedidos')
                                .update({ pago: novoPago })
                                .eq('id', pedidoUUID);
                              
                              if (error) throw error;
                              
                              toast.success(`Status atualizado: ${novoPago ? 'Pago' : 'Não Pago'}`);
                            } catch (error: any) {
                              toast.error('Erro ao atualizar status de pagamento');
                              setPago(!novoPago); // Reverter em caso de erro
                            }
                          }
                        }}
                        className={cn(
                          "h-10 px-4 font-semibold transition-all duration-300 ease-in-out flex items-center gap-2",
                          pago 
                            ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-700" 
                            : "bg-red-100 hover:bg-red-200 text-red-700"
                        )}
                      >
                        {pago ? (
                          <>
                            <ThumbsUp className="h-4 w-4" strokeWidth={2} />
                            <span className="text-sm font-bold">Pago</span>
                          </>
                        ) : (
                          <>
                            <ThumbsDown className="h-4 w-4" strokeWidth={2} />
                            <span className="text-sm font-bold">Não Pago</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cliente */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Cliente</CardTitle>
                </CardHeader>
                <CardContent>
                  {pedido.clientes ? (
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-sm text-muted-foreground min-w-[100px]">Nome:</span>
                        <button
                          onClick={() => setModalEditarCliente(true)}
                          className="text-sm font-medium text-foreground underline hover:no-underline cursor-pointer"
                        >
                          {pedido.clientes.nome}
                        </button>
                      </div>
                      {pedido.clientes.celular && (
                        <div className="flex items-start gap-2">
                          <span className="text-sm text-muted-foreground min-w-[100px]">WhatsApp:</span>
                          <a 
                            href={`https://wa.me/55${pedido.clientes.celular.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-foreground hover:underline"
                          >
                            {pedido.clientes.celular}
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum cliente vinculado</p>
                  )}
                </CardContent>
              </Card>

              {/* Modal Editar Cliente */}
              {pedido.clientes && (
                <ModalEditarCliente
                  open={modalEditarCliente}
                  onOpenChange={setModalEditarCliente}
                  cliente={pedido.clientes}
                  onSalvar={(clienteAtualizado) => {
                    // Atualizar os dados do cliente no pedido
                    setPedido({
                      ...pedido,
                      clientes: clienteAtualizado
                    });
                  }}
                />
              )}

              {/* Produtos */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Produtos</CardTitle>
                </CardHeader>
                <CardContent>
                  {pedidoUUID && (
                    <GerenciadorItensPedido 
                      pedidoId={pedidoUUID} 
                      onItemsChange={(itens, paraExcluir) => {
                        setItensEditados(itens);
                        setItensParaDeletar(paraExcluir);
                      }}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Informações Adicionais */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Informações Adicionais</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Tipo de Retirada</Label>
                    <p className="text-sm font-medium mt-1">
                      {pedido.tipo_retirada === 'balcao' ? 'Retirada (loja)' : 
                       pedido.tipo_retirada === 'entrega' ? 'Entrega' : 
                       pedido.tipo_retirada}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Prazo de Entrega</Label>
                    <p className="text-sm font-medium mt-1">
                      {pedido.unidade_prazo === null || pedido.unidade_prazo === 'imediatamente' 
                        ? 'Imediatamente'
                        : `${pedido.prazo_entrega} ${pedido.unidade_prazo}`}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Observações</Label>
                    <p className="text-sm font-medium mt-1">
                      {pedido.observacoes || 'Cliente solicitou urgência'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Pagamento */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Pagamento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
                    <div>
                      <Label className="text-sm text-muted-foreground">Status do Pagamento:</Label>
                      <p className="font-medium text-foreground mt-1">
                        {pedido.meio_pagamento || 'Cartão de Crédito'}
                      </p>
                    </div>
                    <Badge 
                      className="px-3 py-1.5 text-xs font-medium border-0"
                      style={{
                        backgroundColor: pago ? '#dcfce7' : '#fee2e2',
                        color: pago ? '#16a34a' : '#dc2626',
                        borderRadius: '6px'
                      }}
                    >
                      {pago ? "Pago" : "Não Pago"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <span className="text-base font-semibold text-foreground">Valor Total Pago</span>
                    <span className="text-2xl font-bold text-foreground">{formatBRL(totalPedido)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Coluna Direita (30%) */}
            <div className="space-y-6">
              {/* Histórico de Compra */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Histórico de Compra</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    {historicoCompras.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Nenhum pedido anterior
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {historicoCompras.map((pedidoHistorico) => (
                          <div 
                            key={pedidoHistorico.id} 
                            className="bg-card border border-border rounded-lg overflow-hidden"
                          >
                            <div 
                              className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                              onClick={() => togglePedidoExpandido(pedidoHistorico.id)}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">Pedido</span>
                                    <span className="text-sm font-semibold text-foreground">
                                      #{pedidoHistorico.numero}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {pedidoHistorico.dataHora}
                                  </p>
                                </div>
                                {pedidoExpandido === pedidoHistorico.id ? (
                                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                              <div>
                                <span className="text-xs text-muted-foreground block mb-1">Valor</span>
                                <span className="text-sm font-bold text-emerald-600">
                                  {formatBRL(pedidoHistorico.valorTotal)}
                                </span>
                              </div>
                            </div>
                            
                            {pedidoExpandido === pedidoHistorico.id && (
                              <div className="border-t border-border p-4 bg-card space-y-3">
                                <div>
                                  <span className="text-xs text-muted-foreground block mb-1">Produto(s)</span>
                                  <span className="text-sm text-foreground">
                                    {pedidoHistorico.produtos.join(', ')}
                                  </span>
                                </div>
                                
                                {pedidoHistorico.vendedor && (
                                  <div>
                                    <span className="text-xs text-muted-foreground block mb-1">Nome do Vendedor</span>
                                    <span className="text-sm text-foreground">
                                      {pedidoHistorico.vendedor}
                                    </span>
                                  </div>
                                )}
                                
                                {pedidoHistorico.meioPagamento && (
                                  <div>
                                    <span className="text-xs text-muted-foreground block mb-1">Forma de Pagamento</span>
                                    <span className="text-sm text-foreground">
                                      {pedidoHistorico.meioPagamento}
                                    </span>
                                  </div>
                                )}
                                
                                {pedidoHistorico.status && (
                                  <div>
                                    <span className="text-xs text-muted-foreground block mb-1">Status do pedido</span>
                                    <StatusBadge status={pedidoHistorico.status} />
                                  </div>
                                )}
                                
                                <div className="pt-2 flex justify-center">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="text-muted-foreground hover:text-foreground"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Implementar funcionalidade de repetir pedido
                                      toast.info('Funcionalidade em desenvolvimento');
                                    }}
                                  >
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Repetir Pedido
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Comentários/Observações */}
              {pedidoUUID && <ComentariosObservacoes pedidoId={pedidoUUID} />}
            </div>
          </div>

        </div>
      </main>

      {/* Modal Trocar Cliente */}
      <Dialog open={searchParams.get('clienteModal') === 'trocar'} onOpenChange={(open) => !open && setSearchParams({})}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trocar Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Cliente Atual</Label>
              <Input value={pedido.clientes?.nome || ''} disabled />
            </div>
            <div>
              <Label>Novo Cliente</Label>
              <Select 
                value={novoClienteId} 
                onValueChange={setNovoClienteId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {loadingClientes ? (
                    <div className="flex justify-center p-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    clientes.filter(c => c.ativo).map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nome}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => setSearchParams({})}>
                Cancelar
              </Button>
              <Button 
                onClick={handleTrocarCliente}
                disabled={!novoClienteId || novoClienteId === pedido.cliente_id}
              >
                Confirmar Troca
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rodapé Fixo com Botões */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border py-3 md:py-6 px-4 md:px-6 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
          <Button
            variant="outline"
            onClick={() => navigate('/inicio')}
            className="px-6 md:px-8 w-full sm:w-auto"
          >
            CANCELAR
          </Button>
          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
            <Button
              onClick={() => navigate(`/checkout/${id}`)}
              className="px-6 md:px-8 flex-1 sm:flex-none"
            >
              CHECKOUT
            </Button>
            <Button 
              onClick={handleSalvar} 
              className="px-6 md:px-8 flex-1 sm:flex-none"
            >
              SALVAR ALTERAÇÕES
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
