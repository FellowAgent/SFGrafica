import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Save, X, Search, Pencil, Package } from "lucide-react";
import { ItemPedido, useItensPedido } from "@/hooks/useItensPedido";
import { formatBRL, formatCurrency, parseCurrencyToNumber, formatNumeric, limitText } from "@/utils/inputMasks";
import { toast } from "@/utils/toastHelper";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { ModalBuscaProdutos } from "@/components/loja/ModalBuscaProdutos";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface GerenciadorItensPedidoProps {
  pedidoId: string;
  onItemsChange?: (itens: ItemEditavel[], itensParaDeletar: string[]) => void;
}

interface ProdutoSugestao {
  id: string;
  nome: string;
  codigo_barras: string;
  preco: number;
}

interface ItemEditavel extends Partial<ItemPedido> {
  id: string;
  isNew?: boolean;
  editMode?: boolean;
  produto_nome?: string;
}

// Sub-componente para campo de produto
interface CampoProdutoProps {
  item: ItemEditavel;
  produtos: ProdutoSugestao[];
  onSelect: (produto: ProdutoSugestao) => void;
  onClear: () => void;
  onOpenModal: () => void;
  hasError?: boolean;
}

function CampoProduto({ item, produtos, onSelect, onClear, onOpenModal, hasError }: CampoProdutoProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const produtosFiltrados = useMemo(() => {
    if (!searchTerm) return produtos.slice(0, 10);
    
    const searchLower = searchTerm.toLowerCase();
    
    // Separa produtos que começam com o termo vs que contêm o termo
    const comecamCom: ProdutoSugestao[] = [];
    const contem: ProdutoSugestao[] = [];
    
    produtos.forEach((p) => {
      const nomeMatch = p.nome.toLowerCase().startsWith(searchLower);
      const codigoMatch = p.codigo_barras?.toLowerCase().startsWith(searchLower);
      
      if (nomeMatch || codigoMatch) {
        comecamCom.push(p);
      } else if (
        p.nome.toLowerCase().includes(searchLower) ||
        p.codigo_barras?.toLowerCase().includes(searchLower)
      ) {
        contem.push(p);
      }
    });
    
    // Primeiro os que começam com o termo, depois os que contêm
    return [...comecamCom, ...contem].slice(0, 10);
  }, [searchTerm, produtos]);

  useEffect(() => {
    if (isOpen && produtosFiltrados.length > 0) {
      setSelectedIndex(0);
    }
  }, [isOpen, produtosFiltrados.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, produtosFiltrados.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (produtosFiltrados[selectedIndex]) {
        onSelect(produtosFiltrados[selectedIndex]);
        setSearchTerm('');
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Produto selecionado - mostrar badge
  if (item.produto_id && item.produto_nome) {
    return (
      <div className={cn(
        "flex items-center gap-2 p-3 bg-primary/5 rounded-lg border transition-colors",
        hasError ? "border-destructive" : "border-primary/10"
      )}>
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <Package className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="font-medium text-sm truncate">{item.produto_nome}</span>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="h-8 w-8 p-0 flex-shrink-0"
                type="button"
              >
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remover produto</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenModal}
                className="h-8 w-8 p-0 flex-shrink-0"
                type="button"
              >
                <Search className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Buscar outro produto</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  // Modo busca - input editável com dropdown
  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setTimeout(() => setIsOpen(false), 200)}
            onKeyDown={handleKeyDown}
            placeholder="Digite para buscar produto..."
            autoFocus
            className={cn("w-full", hasError && "border-destructive")}
            autoComplete="off"
          />
          
          {/* Dropdown de sugestões */}
          {isOpen && (
            <div className="absolute z-[100] w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
              {produtosFiltrados.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {searchTerm ? 'Nenhum produto encontrado' : 'Digite para buscar'}
                </div>
              ) : (
                produtosFiltrados.map((produto, index) => (
                  <button
                    key={produto.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onSelect(produto);
                      setSearchTerm('');
                      setIsOpen(false);
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      "w-full text-left px-3 py-2 transition-colors border-b last:border-b-0",
                      index === selectedIndex ? "bg-accent" : "hover:bg-accent/50"
                    )}
                  >
                    <div className="font-medium text-sm">{produto.nome}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {produto.codigo_barras || 'Sem código'} • {formatBRL(produto.preco)}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={onOpenModal}
                className="flex-shrink-0"
              >
                <Search className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Buscar em lista completa</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

export function GerenciadorItensPedido({ pedidoId, onItemsChange }: GerenciadorItensPedidoProps) {
  const { itens, loading } = useItensPedido(pedidoId);
  const [itensEditaveis, setItensEditaveis] = useState<ItemEditavel[]>([]);
  const [produtos, setProdutos] = useState<ProdutoSugestao[]>([]);
  const [loadingProdutos, setLoadingProdutos] = useState(false);
  const [itensParaDeletar, setItensParaDeletar] = useState<string[]>([]);
  const [modalBuscaAberto, setModalBuscaAberto] = useState(false);
  const [itemEditandoId, setItemEditandoId] = useState<string | null>(null);

  useEffect(() => {
    const fetchProdutos = async () => {
      setLoadingProdutos(true);
      const { data, error } = await supabase
        .from('produtos')
        .select('id, nome, codigo_barras, preco')
        .eq('ativo', true)
        .order('nome');
      
      if (!error && data) {
        setProdutos(data);
      }
      setLoadingProdutos(false);
    };
    
    fetchProdutos();
  }, []);

  useEffect(() => {
    setItensEditaveis(itens.map(item => ({
      ...item,
      produto_nome: item.produtos?.nome || '',
      editMode: false,
    })));
  }, [itens]);

  // Notificar o componente pai sobre alterações
  useEffect(() => {
    if (onItemsChange) {
      onItemsChange(itensEditaveis, itensParaDeletar);
    }
  }, [itensEditaveis, itensParaDeletar]);

  const validarItem = useCallback((item: ItemEditavel) => {
    const erros: string[] = [];
    
    if (!item.produto_id) erros.push('produto');
    if (!item.quantidade || item.quantidade <= 0) erros.push('quantidade');
    if (!item.preco_unitario || item.preco_unitario <= 0) erros.push('preco');
    
    return erros;
  }, []);

  const adicionarNovoItem = useCallback(() => {
    const novoItem: ItemEditavel = {
      id: `new-${Date.now()}`,
      isNew: true,
      editMode: true,
      pedido_id: pedidoId,
      quantidade: 1,
      preco_unitario: 0,
      subtotal: 0,
      desconto: 0,
      observacoes: '',
    };
    setItensEditaveis(prev => [...prev, novoItem]);
  }, [pedidoId]);

  const removerItem = (itemId: string) => {
    const item = itensEditaveis.find(i => i.id === itemId);
    
    if (item?.isNew) {
      setItensEditaveis(itensEditaveis.filter(i => i.id !== itemId));
      return;
    }
    
    if (confirm('Deseja realmente excluir este item?')) {
      // Marcar para deletar quando salvar
      setItensParaDeletar([...itensParaDeletar, itemId]);
      setItensEditaveis(itensEditaveis.filter(i => i.id !== itemId));
    }
  };

  const salvarItem = (itemId: string) => {
    const item = itensEditaveis.find(i => i.id === itemId);
    if (!item) return;

    if (!item.produto_id) {
      toast.error('Selecione um produto');
      return;
    }

    if (!item.quantidade || item.quantidade <= 0) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }

    if (!item.preco_unitario || item.preco_unitario <= 0) {
      toast.error('Preço unitário deve ser maior que zero');
      return;
    }

    const subtotal = (item.quantidade * item.preco_unitario) - (item.desconto || 0);

    // Atualizar o item mantendo sua posição na lista
    setItensEditaveis(prevItens =>
      prevItens.map(i => 
        i.id === itemId ? { ...i, editMode: false, subtotal } : i
      )
    );
  };

  const cancelarEdicao = useCallback((itemId: string) => {
    const item = itensEditaveis.find(i => i.id === itemId);
    
    if (item?.isNew) {
      setItensEditaveis(prev => prev.filter(i => i.id !== itemId));
    } else {
      const itemOriginal = itens.find(i => i.id === itemId);
      setItensEditaveis(prev => prev.map(i => 
        i.id === itemId ? {
          ...itemOriginal,
          produto_nome: itemOriginal?.produtos?.nome || '',
          editMode: false,
        } : i
      ));
    }
  }, [itensEditaveis, itens]);

  const atualizarCampo = useCallback((itemId: string, campo: string, valor: any) => {
    setItensEditaveis(prev => prev.map(item => {
      if (item.id !== itemId) return item;

      const novoItem = { ...item, [campo]: valor };

      if (campo === 'quantidade' || campo === 'preco_unitario' || campo === 'desconto') {
        const quantidade = campo === 'quantidade' ? Number(valor) : Number(item.quantidade || 0);
        const preco = campo === 'preco_unitario' ? Number(valor) : Number(item.preco_unitario || 0);
        const desconto = campo === 'desconto' ? Number(valor) : Number(item.desconto || 0);
        novoItem.subtotal = (quantidade * preco) - desconto;
      }

      return novoItem;
    }));
  }, []);

  const selecionarProduto = useCallback((itemId: string, produto: ProdutoSugestao) => {
    setItensEditaveis(prev => prev.map(item => 
      item.id === itemId ? {
        ...item,
        produto_id: produto.id,
        produto_nome: produto.nome,
        preco_unitario: produto.preco,
        subtotal: (item.quantidade || 1) * produto.preco - (item.desconto || 0),
      } : item
    ));
  }, []);

  const limparProdutoSelecionado = useCallback((itemId: string) => {
    setItensEditaveis(prev => prev.map(item => 
      item.id === itemId ? {
        ...item,
        produto_id: undefined,
        produto_nome: '',
        preco_unitario: 0,
        subtotal: 0,
      } : item
    ));
  }, []);

  const abrirModalBusca = useCallback((itemId: string) => {
    setItemEditandoId(itemId);
    setModalBuscaAberto(true);
  }, []);

  const selecionarProdutoDoModal = useCallback((produto: ProdutoSugestao) => {
    if (itemEditandoId) {
      selecionarProduto(itemEditandoId, produto);
      setModalBuscaAberto(false);
      setItemEditandoId(null);
    }
  }, [itemEditandoId, selecionarProduto]);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {itensEditaveis.map((item) => {
        const erros = validarItem(item);
        const temErro = (campo: string) => erros.includes(campo);

        return (
          <Card key={item.id} className="p-4 bg-card border-border">
            {item.editMode || item.isNew ? (
              // Modo de edição
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Produto */}
                  <div className="md:col-span-4">
                    <Label htmlFor={`produto-${item.id}`} className="mb-2 block text-sm font-medium">
                      <span className="text-destructive">*</span> Produto:
                    </Label>
                    <CampoProduto
                      item={item}
                      produtos={produtos}
                      onSelect={(produto) => selecionarProduto(item.id, produto)}
                      onClear={() => limparProdutoSelecionado(item.id)}
                      onOpenModal={() => abrirModalBusca(item.id)}
                      hasError={temErro('produto')}
                    />
                    {temErro('produto') && (
                      <p className="text-xs text-destructive mt-1">Produto é obrigatório</p>
                    )}
                  </div>

                  {/* Quantidade */}
                  <div>
                    <Label htmlFor={`quantidade-${item.id}`} className="mb-2 block text-sm font-medium">
                      <span className="text-destructive">*</span> Quantidade:
                    </Label>
                    <Input
                      id={`quantidade-${item.id}`}
                      type="text"
                      inputMode="numeric"
                      value={item.quantidade || ""}
                      onChange={(e) => {
                        const formatted = formatNumeric(e.target.value, 6);
                        atualizarCampo(item.id, 'quantidade', parseFloat(formatted) || 0);
                      }}
                      className={cn(temErro('quantidade') && 'border-destructive')}
                      placeholder="0"
                      maxLength={6}
                    />
                    {temErro('quantidade') && (
                      <p className="text-xs text-destructive mt-1">Quantidade inválida</p>
                    )}
                  </div>

                  {/* Preço Unitário */}
                  <div>
                    <Label htmlFor={`preco-${item.id}`} className="mb-2 block text-sm font-medium">
                      * Preço Unitário:
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        R$
                      </span>
                      <Input
                        id={`preco-${item.id}`}
                        type="text"
                        inputMode="decimal"
                        value={formatCurrency(String((item.preco_unitario || 0) * 100))}
                        onChange={(e) => {
                          const numericValue = parseCurrencyToNumber(e.target.value);
                          atualizarCampo(item.id, 'preco_unitario', numericValue);
                        }}
                        className={cn("pl-10", temErro('preco') && 'border-destructive')}
                        placeholder="0,00"
                        maxLength={13}
                      />
                    </div>
                    {temErro('preco') && (
                      <p className="text-xs text-destructive mt-1">Preço inválido</p>
                    )}
                  </div>

                  {/* Desconto */}
                  <div>
                    <Label htmlFor={`desconto-${item.id}`} className="mb-2 block text-sm font-medium">
                      Desconto:
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        R$
                      </span>
                      <Input
                        id={`desconto-${item.id}`}
                        type="text"
                        inputMode="decimal"
                        value={formatCurrency(String((item.desconto || 0) * 100))}
                        onChange={(e) => {
                          const numericValue = parseCurrencyToNumber(e.target.value);
                          atualizarCampo(item.id, 'desconto', numericValue);
                        }}
                        className="pl-10"
                        placeholder="0,00"
                        maxLength={13}
                      />
                    </div>
                  </div>

                  {/* Subtotal */}
                  <div>
                    <Label className="mb-2 block text-sm font-medium">
                      Subtotal:
                    </Label>
                    <div className="h-10 px-3 py-2 bg-muted/50 rounded-md border border-border flex items-center font-semibold text-primary">
                      {formatBRL(item.subtotal || 0)}
                    </div>
                  </div>

                  {/* Observações */}
                  <div className="md:col-span-4">
                    <Label htmlFor={`observacoes-${item.id}`} className="mb-2 block text-sm font-medium">
                      Observações: <span className="text-muted-foreground text-xs ml-1">({(item.observacoes?.length || 0)}/500)</span>
                    </Label>
                    <Textarea
                      id={`observacoes-${item.id}`}
                      value={item.observacoes || ""}
                      onChange={(e) => {
                        const limitedValue = limitText(e.target.value, 500);
                        atualizarCampo(item.id, 'observacoes', limitedValue);
                      }}
                      placeholder="Adicione observações sobre este item..."
                      className="min-h-[80px] resize-none"
                      maxLength={500}
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => cancelarEdicao(item.id)}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => salvarItem(item.id)}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Salvar
                  </Button>
                </div>
              </div>
            ) : (
              // Modo visualização aprimorado
              <div className="flex items-start gap-4">
                {/* Ícone do produto */}
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex-shrink-0 flex items-center justify-center">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                
                {/* Informações do produto */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-base truncate">{item.produto_nome}</h4>
                      {item.unidade_medida && (
                        <p className="text-xs text-primary font-medium mt-0.5">
                          Unidade: {item.unidade_medida}
                        </p>
                      )}
                      {item.observacoes && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.observacoes}</p>
                      )}
                    </div>
                    
                    {/* Botões de ação */}
                    <div className="flex gap-1 flex-shrink-0">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => atualizarCampo(item.id, 'editMode', true)}
                              className="h-8 w-8 p-0"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar item</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removerItem(item.id)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Remover item</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  
                  {/* Grid de informações */}
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground block">Quantidade</span>
                      <span className="font-semibold">{item.quantidade}x</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Preço Unit.</span>
                      <span className="font-semibold">{formatBRL(item.preco_unitario || 0)}</span>
                    </div>
                    {item.desconto && item.desconto > 0 && (
                      <div>
                        <span className="text-xs text-muted-foreground block">Desconto</span>
                        <span className="font-semibold text-green-600">-{formatBRL(item.desconto)}</span>
                      </div>
                    )}
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground block">Subtotal</span>
                      <span className="font-bold text-base">{formatBRL(item.subtotal || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        );
      })}

      <Button
        variant="outline"
        onClick={adicionarNovoItem}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Adicionar Produto
      </Button>

      <ModalBuscaProdutos
        open={modalBuscaAberto}
        onClose={() => setModalBuscaAberto(false)}
        onSelectProduto={selecionarProdutoDoModal}
        produtoAtualId={itemEditandoId ? itensEditaveis.find(i => i.id === itemEditandoId)?.produto_id : undefined}
        produtos={produtos.map(p => ({
          id: p.id,
          nome: p.nome,
          codigo_barras: p.codigo_barras,
          preco: p.preco,
        }))}
      />
    </div>
  );
}
