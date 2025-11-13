import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { useVirtualizer } from '@tanstack/react-virtual';
import Sidebar from "@/components/layout/Sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, User, Package, DollarSign, GripVertical, Search, CreditCard, Smartphone, Banknote, FileText, UserCircle, Bot, Check, ChevronDown, ChevronRight, MoreVertical, Copy, Trash2, Archive, X, ArrowLeft, LayoutGrid, LayoutPanelTop, Columns3, Settings2, Pin, RefreshCw, ChevronLeft } from "lucide-react";
import { toast } from "@/utils/toastHelper";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NovoPedidoForm } from "@/components/loja/NovoPedidoForm";
import { usePedidos } from "@/hooks/usePedidos";
import { useClientes } from "@/hooks/useClientes";
import { useUsuarios } from "@/hooks/useUsuarios";
import { useStatusConfig } from "@/hooks/useStatusConfig";
import { useUserAvatar } from "@/hooks/useUserAvatar";
import { useUserProfile } from "@/hooks/useUserProfile";
import { usePedidosCache } from "@/hooks/usePedidosCache";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/utils/inputMasks";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import userIcon from "@/assets/user.svg";
import { useImageCache, useAdjacentCardsPreload } from "@/hooks/useImageCache";


import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Definição de etiquetas disponíveis
export const etiquetasDisponiveis = [
  { nome: "Entregar", cor: "#22c55e" },
  { nome: "Faturar", cor: "#eab308" },
  { nome: "Fazer Com Muita Atenção", cor: "#f97316" },
  { nome: "Gráfica Externa", cor: "#c2410c" },
  { nome: "Atrasado", cor: "#ec4899" },
  { nome: "Bucha", cor: "#f87171" },
  { nome: "Urgente", cor: "#dc2626" },
  { nome: "Fotos Grandes", cor: "#a855f7" },
];

// Opções de visualização - será populado dinamicamente com vendedores
const getOpcoesVisualizacao = (vendedores: Array<{ id: string; username: string; avatar_url?: string }>) => {
  const opcoes = [
    { value: "Todos", label: "Todos", isBold: true },
  ];
  
  // Ordenar vendedores alfabeticamente e adicionar à lista
  const vendedoresOrdenados = [...vendedores].sort((a, b) => 
    a.username.localeCompare(b.username, 'pt-BR')
  );
  
  vendedoresOrdenados.forEach(v => {
    opcoes.push({ value: v.username, label: v.username, isBold: false });
  });
  
  return opcoes;
};

// Estados iniciais das colunas (serão preenchidos dinamicamente com status configurados)
const initialPedidosColumns: any[] = [];

const formasPagamento = [
  { value: "pix", label: "PIX", icon: Smartphone },
  { value: "credito", label: "Crédito", icon: CreditCard },
  { value: "debito", label: "Débito", icon: CreditCard },
  { value: "boleto", label: "Boleto", icon: Banknote },
];

// Droppable Column Component com Virtualização e Cache
const DroppableColumn = ({ 
  column, 
  children, 
  isOver,
  onTitleChange,
  columnRules,
  itemCount,
  items
}: { 
  column: any; 
  children: React.ReactNode; 
  isOver: boolean;
  onTitleChange: (id: string, newTitle: string) => void;
  columnRules: Map<string, { hideCardsAfter: number; timeUnit: string }>;
  itemCount: number;
  items: any[];
}) => {
  const { setNodeRef } = useDroppable({
    id: column.id,
  });

  const parentRef = useRef<HTMLDivElement>(null);
  const { preloadImages } = useImageCache();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(column.title);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [ruleEnabled, setRuleEnabled] = useState(false);
  const [hideAfterValue, setHideAfterValue] = useState("");
  const [timeUnit, setTimeUnit] = useState("Horas");
  
  const hasRule = columnRules.has(column.id);

  // Calcular overscan dinâmico baseado em performance e quantidade de cards
  const calculateDynamicOverscan = useCallback(() => {
    // Detectar capacidade do dispositivo
    const cores = navigator.hardwareConcurrency || 4;
    const memory = (navigator as any).deviceMemory || 4; // GB de RAM (quando disponível)
    
    // Score de performance (0-1)
    const performanceScore = Math.min(
      (cores / 8) * 0.5 + (memory / 8) * 0.5,
      1
    );
    
    // Ajustar overscan baseado no número de cards
    let baseOverscan = 15; // overscan padrão
    
    if (items.length <= 10) {
      // Poucos cards: pode usar overscan maior
      baseOverscan = 30;
    } else if (items.length <= 30) {
      // Quantidade média: overscan padrão
      baseOverscan = 20;
    } else if (items.length <= 100) {
      // Muitos cards: reduzir overscan
      baseOverscan = 12;
    } else {
      // Quantidade muito grande: overscan mínimo
      baseOverscan = 8;
    }
    
    // Ajustar baseado na performance do dispositivo
    const finalOverscan = Math.round(baseOverscan * (0.5 + performanceScore * 0.5));
    
    // Garantir mínimo de 5 e máximo de 30
    return Math.max(5, Math.min(30, finalOverscan));
  }, [items.length]);

  const dynamicOverscan = useMemo(() => calculateDynamicOverscan(), [calculateDynamicOverscan]);

  // Virtualização com configuração otimizada e overscan dinâmico
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // Altura estimada mais generosa
    overscan: dynamicOverscan, // Overscan dinâmico baseado em performance
    measureElement: (element) => element.getBoundingClientRect().height, // Medir altura real
  });

  // Pré-carregar imagens quando os itens virtuais mudarem
  useEffect(() => {
    const virtualItems = rowVirtualizer.getVirtualItems();
    const imagesToPreload: string[] = [];
    
    virtualItems.forEach(virtualItem => {
      const item = items[virtualItem.index];
      
      // Avatar
      if (item?.avatarUrl) {
        imagesToPreload.push(item.avatarUrl);
      }
      
      // Produtos
      if (item?.produtos && Array.isArray(item.produtos)) {
        item.produtos.forEach((produto: any) => {
          if (produto?.produtos?.imagem_url) {
            imagesToPreload.push(produto.produtos.imagem_url);
          }
        });
      }
    });
    
    if (imagesToPreload.length > 0) {
      preloadImages(imagesToPreload).catch(err => {
        console.warn('Erro ao pré-carregar imagens da coluna:', err);
      });
    }
  }, [rowVirtualizer.getVirtualItems(), items, preloadImages]);

  const handleTitleClick = () => {
    setIsEditingTitle(true);
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    onTitleChange(column.id, titleValue);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditingTitle(false);
      onTitleChange(column.id, titleValue);
    }
  };

  const handleAddRule = () => {
    if (ruleEnabled && hideAfterValue) {
      const numericValue = parseInt(hideAfterValue);
      if (!isNaN(numericValue)) {
        columnRules.set(column.id, {
          hideCardsAfter: numericValue,
          timeUnit: timeUnit
        });
        toast.success(`Cartões serão ocultados após ${numericValue} ${timeUnit.toLowerCase()}`);
        setIsRulesModalOpen(false);
      }
    } else {
      toast.error("Preencha todos os campos para criar a regra");
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-shrink-0 w-[300px] rounded-2xl transition-all flex flex-col",
        isOver 
          ? "bg-accent border-2 border-foreground" 
          : "bg-muted/50 border border-transparent"
      )}
      style={{ height: 'calc(100vh - 240px)' }}
    >
      <div className="flex items-center justify-between p-4 pb-3">
        <div className="flex items-center gap-2">
          {isEditingTitle ? (
            <Input
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              autoFocus
              className="font-bold text-foreground h-8 px-2"
            />
          ) : (
            <h3 
              className="font-bold text-foreground cursor-pointer hover:text-primary transition-colors"
              onClick={handleTitleClick}
            >
              {column.title}
            </h3>
          )}
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-background border border-border text-foreground text-sm font-medium">
            {itemCount}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-background">
            <DropdownMenuItem 
              onClick={() => setIsRulesModalOpen(true)}
              className="hover:bg-accent focus:bg-accent hover:border hover:border-foreground rounded-sm border border-transparent"
            >
              <Settings2 className="mr-2 h-4 w-4" />
              Criar Regras
              {hasRule && (
                <span className="ml-2 text-primary">
                  <Pin className="h-3 w-3 inline" />
                </span>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Modal de Regras */}
      <Dialog open={isRulesModalOpen} onOpenChange={setIsRulesModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Regras</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id={`rule-${column.id}`}
                checked={ruleEnabled}
                onCheckedChange={(checked) => setRuleEnabled(checked as boolean)}
              />
              <label 
                htmlFor={`rule-${column.id}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
              >
                Ocultar Cartões da Lista a cada
                <Input
                  type="number"
                  value={hideAfterValue}
                  onChange={(e) => setHideAfterValue(e.target.value)}
                  className="w-20 h-8"
                  disabled={!ruleEnabled}
                />
                <Select value={timeUnit} onValueChange={setTimeUnit} disabled={!ruleEnabled}>
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Horas">Horas</SelectItem>
                    <SelectItem value="Dias">Dias</SelectItem>
                    <SelectItem value="Semanas">Semanas</SelectItem>
                  </SelectContent>
                </Select>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsRulesModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleAddRule}
              disabled={!ruleEnabled || !hideAfterValue}
            >
              Adicionar Regra
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* ScrollArea com virtualização */}
      <div ref={parentRef} className="flex-1 overflow-auto px-4">
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualItem) => (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={(el) => rowVirtualizer.measureElement(el)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <div className="pb-3">
                {children && React.Children.toArray(children)[virtualItem.index]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Componente de Etiqueta Expansível
const EtiquetaExpansivel = ({ nome, cor }: { nome: string; cor: string }) => {
  const [expandida, setExpandida] = useState(true);

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        setExpandida(!expandida);
      }}
      className="cursor-pointer inline-flex items-center rounded px-2 py-1 text-xs font-semibold text-white transition-all"
      style={{ 
        backgroundColor: cor,
        minWidth: expandida ? 'auto' : '32px',
        justifyContent: expandida ? 'flex-start' : 'center'
      }}
    >
      {expandida ? nome : ''}
      {!expandida && <div className="w-4 h-2"></div>}
    </div>
  );
};

// Draggable Card Component
const DraggableCard = ({ item, onClick }: { item: any; onClick: () => void }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
    active,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? "none" : transition,
  };

  const handleClick = (e: React.MouseEvent) => {
    // Só executar onClick se NÃO estiver arrastando
    if (!isDragging) {
      e.stopPropagation();
      console.log('🖱️ Card clicado:', item.id, item.numero);
      console.log('✅ Navegando para:', `/loja/pedido/${item.id}`);
      onClick();
    } else {
      console.log('⏸️ Click bloqueado - card está sendo arrastado');
    }
  };

  // Mostrar indicador de posição quando um card está sendo arrastado sobre este
  const showDropIndicator = isOver && active && active.id !== item.id;

  // Preview de produtos
  const produtosPreview = item.produtos || [];
  const temMaisDeUmProduto = produtosPreview.length > 1;

  return (
    <>
      {showDropIndicator && (
        <div className="h-1 bg-foreground rounded-full my-2 animate-pulse" />
      )}
      <HoverCard openDelay={300} closeDelay={100}>
        <HoverCardTrigger asChild>
          <Card
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={handleClick}
            className={cn(
              "bg-card rounded-2xl border-0 select-none",
              isDragging 
                ? "shadow-lg opacity-80 rotate-6 scale-105 cursor-grabbing" 
                : "cursor-pointer shadow-sm hover:shadow-md transition-all"
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex flex-col gap-2 flex-1">
                  {/* Etiquetas acima do número do pedido */}
                  {item.etiquetas && item.etiquetas.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.etiquetas.map((etiq: any, idx: number) => (
                        <Badge
                          key={idx}
                          style={{ 
                            backgroundColor: etiq.cor,
                            color: ['#fbbf24'].includes(etiq.cor) ? '#000' : '#fff'
                          }}
                          className="px-2 py-0.5 text-xs font-medium border-0"
                        >
                          {etiq.nome}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Pedido:</span>
                    <Badge className="bg-foreground text-background hover:bg-foreground/90 font-bold rounded-md px-3 py-1 text-sm">
                      {parseInt(item.numeroFormatado || item.numero || '0', 10) || 'N/A'}
                    </Badge>
                  </div>
                </div>
                <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </div>
              <div className="space-y-2 mb-3">
                <div>
                  <Label className="text-xs text-muted-foreground uppercase">Cliente:</Label>
                  <span className="ml-2 text-sm text-foreground">{item.cliente}</span>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase">Produto:</Label>
                  <span className="ml-2 text-sm text-foreground">
                    {item.produto}
                    {temMaisDeUmProduto && (
                      <span className="text-muted-foreground"> (+{produtosPreview.length - 1})</span>
                    )}
                  </span>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase">Total:</Label>
                  <span className="ml-2 text-sm font-semibold text-foreground">{formatBRL(item.valor)}</span>
                </div>
                <div className="flex items-center justify-between gap-2 pt-2">
                  <StatusBadge status={item.status} />
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={item.avatarUrl || userIcon} alt={item.vendedor} />
                      <AvatarFallback className="text-xs">{item.vendedor?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium text-foreground">{item.vendedor}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </HoverCardTrigger>
        
        {temMaisDeUmProduto && createPortal(
          <HoverCardContent 
            side="right" 
            align="start" 
            className="w-80 bg-popover border-border z-[10000]"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <Package className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold text-foreground">
                  Produtos do Pedido ({produtosPreview.length})
                </h4>
              </div>
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-2">
                  {produtosPreview.map((produto: any, idx: number) => (
                    <div 
                      key={idx} 
                      className="flex items-start gap-3 p-2 rounded-lg bg-background/50 border border-border/50"
                    >
                      <div className="flex-shrink-0 w-12 h-12 bg-muted rounded-md flex items-center justify-center overflow-hidden">
                        {produto.produtos?.imagem_url ? (
                          <img 
                            src={produto.produtos.imagem_url} 
                            alt={produto.produtos?.nome || 'Produto'}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <Package className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {produto.produtos?.nome || 'Produto sem nome'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            Qtd: {produto.quantidade}
                          </span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs font-semibold text-foreground">
                            {formatBRL(produto.subtotal || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </HoverCardContent>,
          document.body
        )}
      </HoverCard>
    </>
  );
};

const Inicio = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [vendedorSelecionado, setVendedorSelecionado] = useState("Todos");
  const [activeTab, setActiveTab] = useState("pedidos");
  const [loadingPedidos, setLoadingPedidos] = useState(true);
  const [modoVisualizacao, setModoVisualizacao] = useState<"status" | "funcionario">("status");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [loadingItens, setLoadingItens] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cacheUpdating, setCacheUpdating] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const { usuarios } = useUsuarios();
  const { status: statusConfig, loading: loadingStatus } = useStatusConfig();
  const { cacheData, loading: loadingCache, loadPedidos: recarregarCache, clearCache, isCacheValid } = usePedidosCache();

  // Resetar para aba FLUXO quando a rota mudar para /loja/inicio
  useEffect(() => {
    if (location.pathname === "/loja/inicio") {
      setActiveTab("pedidos");
    }
  }, [location]);
  
  // Carregar configurações do Kanban
  const [kanbanConfig, setKanbanConfig] = useState(() => {
    const saved = localStorage.getItem('kanbanConfig');
    return saved ? JSON.parse(saved) : { corFundo: "#f5f5f5", imagemFundo: null };
  });
  
  // Frente de Caixa states
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [pedidoCaixa, setPedidoCaixa] = useState<any>(null);
  const [formaPagamento, setFormaPagamento] = useState("");
  const [gerarNota, setGerarNota] = useState(false);
  const [emailNota, setEmailNota] = useState("");
  const [layoutModeCaixa, setLayoutModeCaixa] = useState<"three-columns" | "two-one" | "stacked">("three-columns");
  const [historicoTextCaixa, setHistoricoTextCaixa] = useState("");
  const [historicosCaixa, setHistoricosCaixa] = useState<Array<{ id: string; texto: string; data: string }>>([]);
  const [columnRules] = useState(new Map<string, { hideCardsAfter: number; timeUnit: string }>());
  const [statusFiltro, setStatusFiltro] = useState<string>("Todos");
  const [scrollProgress, setScrollProgress] = useState(0);
  
  
  // Colunas inicializadas vazias - serão preenchidas pelo banco de dados
  const [pedidosColumns, setPedidosColumns] = useState(initialPedidosColumns);
  
  useEffect(() => {
    // Não executar se os status ainda estiverem carregando
    if (loadingStatus) return;
    
    // Não executar se não houver status configurados
    if (statusConfig.length === 0) return;

    const processarPedidosDoCache = async () => {
      setLoadingPedidos(true);
      
      try {
        // Usar dados do cache se disponíveis
        if (!cacheData || !cacheData.pedidos || cacheData.pedidos.length === 0) {
          // Se não há dados no cache, criar colunas vazias
          const statusConfigOrdenados = [...statusConfig].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
          const colunasVazias = statusConfigOrdenados
            .filter(s => s.ativo)
            .map(s => ({
              id: s.nome.toLowerCase().replace(/\s+/g, '_'),
              title: s.nome,
              items: []
            }));
          setPedidosColumns(colunasVazias);
          setLoadingPedidos(false);
          return;
        }

        const { pedidos: pedidosDB, itens: allItens, perfis, etiquetas } = cacheData;

        if (pedidosDB && pedidosDB.length > 0) {
          const perfisMap = new Map(perfis?.map(p => [p.id, p]) || []);

          // Agrupar itens por pedido_id
          const itensPorPedido = new Map();
          allItens?.forEach((item: any) => {
            if (!itensPorPedido.has(item.pedido_id)) {
              itensPorPedido.set(item.pedido_id, []);
            }
            itensPorPedido.get(item.pedido_id).push(item);
          });

          // Mapear etiquetas por pedido_id
          const etiquetasPorPedido = new Map();
          etiquetas?.forEach((ep: any) => {
            if (!etiquetasPorPedido.has(ep.pedido_id)) {
              etiquetasPorPedido.set(ep.pedido_id, []);
            }
            if (ep.etiquetas) {
              etiquetasPorPedido.get(ep.pedido_id).push(ep.etiquetas);
            }
          });

          console.log('🏷️ Mapa de etiquetas por pedido:', etiquetasPorPedido);

          // Criar colunas dinâmicas baseadas nos status configurados
          const statusConfigOrdenados = [...statusConfig].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
          const colunasStatus = statusConfigOrdenados
            .filter(s => s.ativo)
            .map(s => ({
              id: s.nome.toLowerCase().replace(/\s+/g, '_'),
              title: s.nome,
              items: [] as any[]
            }));

          // Agrupar pedidos por status
          const pedidosPorStatus: Record<string, any[]> = {};
          colunasStatus.forEach(col => {
            pedidosPorStatus[col.title] = [];
          });

          pedidosDB.forEach((pedido: any) => {
            // Usar o status real do pedido ou o primeiro status configurado
            const statusOriginal = pedido.status || (statusConfigOrdenados[0]?.nome || '');
            
            const vendedor = pedido.vendedor_id ? perfisMap.get(pedido.vendedor_id) : null;
            const itensDoPedido = itensPorPedido.get(pedido.id) || [];
            const primeiroProduto = itensDoPedido[0]?.produtos?.nome || 'Sem produtos';
            const etiquetasDoPedido = etiquetasPorPedido.get(pedido.id) || [];
            
            console.log(`🏷️ Pedido ${pedido.numero_pedido} tem ${etiquetasDoPedido.length} etiquetas:`, etiquetasDoPedido);
            
            // Adicionar pedido à coluna do seu status
            if (pedidosPorStatus[statusOriginal]) {
              pedidosPorStatus[statusOriginal].push({
                id: pedido.id,
                numeroFormatado: parseInt(pedido.numero_pedido, 10).toString(),
                numero: parseInt(pedido.numero_pedido, 10).toString(),
                cliente: pedido.clientes?.nome || 'Cliente não informado',
                produto: primeiroProduto,
                valor: pedido.valor_final || 0,
                vendedor: vendedor?.username || 'Sem vendedor',
                avatarUrl: vendedor?.avatar_url || null,
                quantidadeProdutos: itensDoPedido.length,
                status: statusOriginal,
                isPago: false,
                produtos: itensDoPedido,
                historicoCompras: [],
                etiquetas: etiquetasDoPedido,
                _dbData: pedido
              });
            }
          });

          // Criar colunas com pedidos do banco
          const colunasComPedidos = colunasStatus.map(col => ({
            ...col,
            items: pedidosPorStatus[col.title] || []
          }));

          setPedidosColumns(colunasComPedidos);
        } else {
          distribuirPedidosEntreVendedores();
        }
      } catch (error: any) {
        console.error('Erro ao processar pedidos do cache:', error);
      } finally {
        setLoadingPedidos(false);
      }
    };

    processarPedidosDoCache();
  }, [cacheData, statusConfig, loadingStatus]);

  // Supabase Realtime - Escutar mudanças e atualizar cache
  useEffect(() => {
    const channel = supabase
      .channel('pedidos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pedidos'
        },
        async (payload) => {
          console.log('🔔 Mudança detectada em pedidos:', payload);
          
          // Ativar animação no badge
          setCacheUpdating(true);
          
          // Mostrar notificação de atualização automática
          toast.info('Atualizando pedidos...', {
            description: 'Mudanças detectadas no sistema. Sincronizando dados.',
            duration: 2000,
          });
          
          // Recarregar do banco e atualizar cache
          await recarregarCache(true);
          
          // Confirmar atualização
          toast.success('Pedidos atualizados', {
            description: 'Cache sincronizado com sucesso.',
            duration: 2000,
          });
          
          // Desativar animação após 2 segundos
          setTimeout(() => {
            setCacheUpdating(false);
          }, 2000);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pedidos_etiquetas'
        },
        async (payload) => {
          console.log('🏷️ Mudança detectada em etiquetas:', payload);
          
          // Ativar animação no badge
          setCacheUpdating(true);
          
          // Mostrar notificação de atualização automática
          toast.info('Atualizando etiquetas...', {
            description: 'Etiquetas modificadas. Sincronizando dados.',
            duration: 2000,
          });
          
          // Recarregar do banco e atualizar cache
          await recarregarCache(true);
          
          // Confirmar atualização
          toast.success('Etiquetas atualizadas', {
            description: 'Cache sincronizado com sucesso.',
            duration: 2000,
          });
          
          // Desativar animação após 2 segundos
          setTimeout(() => {
            setCacheUpdating(false);
          }, 2000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [recarregarCache]);

  const distribuirPedidosEntreVendedores = () => {
    if (usuarios.length === 0) return;
    
    const usuariosAtivos = usuarios.filter(u => u.ativo);
    if (usuariosAtivos.length === 0) return;

    // Pegar todos os pedidos do banco
    const todosPedidos = pedidosColumns.flatMap(col => col.items);
    
    // Distribuir pedidos entre vendedores de forma circular
    const pedidosAtualizados = todosPedidos.map((pedido, index) => {
      const vendedor = usuariosAtivos[index % usuariosAtivos.length];
      return {
        ...pedido,
        vendedor: vendedor.username
      };
    });

    // Reagrupar por status
    const statusConfigOrdenados = [...statusConfig].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    const colunasStatus = statusConfigOrdenados
      .filter(s => s.ativo)
      .map(s => ({
        id: s.nome.toLowerCase().replace(/\s+/g, '_'),
        title: s.nome,
        items: [] as any[]
      }));
    
    const colunasAtualizadas = colunasStatus.map(col => ({
      ...col,
      items: pedidosAtualizados.filter(p => p.status === col.title)
    }));

    setPedidosColumns(colunasAtualizadas);
  };
  
  // Carregar apenas vendedores ativos do banco de dados
  const [fluxoVendedores, setFluxoVendedores] = useState<Array<{ user_id: string; ativo: boolean; ordem: number }>>([]);
  const [vendedores, setVendedores] = useState<Array<{ id: string; username: string; avatar_url?: string }>>([]);

  useEffect(() => {
    const carregarFluxoVendedores = async () => {
      // Buscar vendedores ativos
      const { data, error } = await supabase
        .from('vendedores_fluxo')
        .select('user_id, ativo, ordem')
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (error) {
        console.error("Erro ao carregar fluxo de vendedores:", error);
        return;
      }

      setFluxoVendedores(data || []);

      // Buscar perfis dos vendedores
      if (data && data.length > 0) {
        const { data: perfis, error: perfisError } = await supabase
          .from('perfis')
          .select('id, username, avatar_url')
          .in('id', data.map(v => v.user_id));

        if (!perfisError && perfis) {
          setVendedores(perfis);
        }
      }
    };
  
    carregarFluxoVendedores();
  }, []);

  // Função para forçar refresh manual
  const handleRefreshManual = async () => {
    setRefreshing(true);
    try {
      await clearCache();
      await recarregarCache(true);
      toast.success('Pedidos atualizados com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar pedidos:', error);
      toast.error('Erro ao atualizar pedidos');
    } finally {
      setRefreshing(false);
    }
  };

  // Filtrar pedidos por vendedor E status
  const pedidosFiltrados = useMemo(() => {
    let colunas: any[] = [];

    if (modoVisualizacao === "funcionario") {
      // Visualização por funcionário
      const allPedidos = pedidosColumns.flatMap(col => col.items);
      
      // Adicionar colunas apenas dos vendedores ATIVOS na ordem configurada
      fluxoVendedores.forEach((fluxo) => {
        const vendedor = vendedores.find(v => v.id === fluxo.user_id);
        if (!vendedor) return;

        // Filtrar pedidos que pertencem a este vendedor
        let pedidosVendedor = allPedidos.filter(item => 
          item.vendedor === vendedor.username
        );

        // Aplicar filtro de status se necessário
        if (statusFiltro !== "Todos") {
          pedidosVendedor = pedidosVendedor.filter(item => item.status === statusFiltro);
        }

        // Aplicar filtro de vendedor se selecionado
        if (vendedorSelecionado !== "Todos") {
          if (vendedor.username !== vendedorSelecionado) {
            return; // Pular este vendedor se não for o selecionado
          }
        }
        
        colunas.push({
          id: `vendedor-${vendedor.username}`,
          title: vendedor.username.toUpperCase(),
          username: vendedor.username,
          nomeExibicao: vendedor.username,
          items: pedidosVendedor
        });
      });
    } else {
      // Visualização por status (comportamento padrão)
      if (vendedorSelecionado === "Todos") {
        colunas = pedidosColumns;
      } else {
        // Filtrar por vendedor específico
        colunas = pedidosColumns.map(col => ({
          ...col,
          items: col.items.filter(item => item.vendedor === vendedorSelecionado)
        }));
      }

      // Aplicar filtro de status nas colunas
      if (statusFiltro !== "Todos") {
        colunas = colunas.map(col => ({
          ...col,
          items: col.items.filter(item => item.status === statusFiltro)
        }));
      }
    }

    return colunas;
  }, [modoVisualizacao, vendedorSelecionado, pedidosColumns, fluxoVendedores, vendedores, statusFiltro]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10, // Só ativa arrasto após mover 10px
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setOverId(over?.id as string | null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);

    if (!over) return;

    // Find source and destination columns in filtered view
    let sourceCol = pedidosFiltrados.find((col) =>
      col.items.some((item) => item.id === active.id)
    );
    let destCol = pedidosFiltrados.find((col) => col.id === over.id);

    if (!destCol) {
      destCol = pedidosFiltrados.find((col) =>
        col.items.some((item) => item.id === over.id)
      );
    }

    if (sourceCol && destCol) {
      // Se estiver no modo "Todos (por Vendedor)", atualizar o vendedor do item
      if (vendedorSelecionado === "Todos (por Vendedor)" && sourceCol.id !== destCol.id) {
        // Extrair o username do ID da coluna de destino ou usar o campo username da coluna
        let novoVendedor = "";
        
        if (destCol.id === "vendedor-sem-dono") {
          // Se movido para PEDIDOS SEM DONO, limpar o vendedor
          novoVendedor = "";
        } else {
          // Usar o campo username da coluna ou extrair do ID
          novoVendedor = (destCol as any).username || destCol.id.replace("vendedor-", "");
        }
        
        // Atualizar no estado local
        setPedidosColumns(prevColumns => {
          const newColumns = prevColumns.map(col => ({
            ...col,
            items: col.items.map(item => 
              item.id === active.id 
                ? { ...item, vendedor: novoVendedor }
                : item
            )
          }));
          return newColumns;
        });

        // Encontrar o usuário correspondente ao vendedor
        const vendedorUsuario = usuarios.find(u => u.username === novoVendedor);
        
        // Persistir no banco de dados
        try {
          const { error } = await supabase
            .from('pedidos')
            .update({ 
              vendedor_id: vendedorUsuario?.id || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', active.id as string);
  
          if (error) throw error;
          toast.success('Pedido atualizado com sucesso!');
        } catch (error: any) {
          toast.error('Erro ao atualizar pedido: ' + error.message);
          // Reverter mudança em caso de erro
          setPedidosColumns(prevColumns => {
            const item = prevColumns.flatMap(col => col.items).find(i => i.id === active.id);
            if (item) {
              return prevColumns.map(col => ({
                ...col,
                items: col.items.map(i => 
                  i.id === active.id 
                    ? { ...i, vendedor: item.vendedor }
                    : i
                )
              }));
            }
            return prevColumns;
          });
        }
      } else {
        // Lógica normal de movimentação entre colunas de status
        const newColumns = [...pedidosColumns];
        const sourceIndex = newColumns.findIndex((c) => c.id === sourceCol!.id);
        const destIndex = newColumns.findIndex((c) => c.id === destCol!.id);

        const sourceItems = [...sourceCol.items];
        const destItems = sourceCol.id === destCol.id ? sourceItems : [...destCol.items];

        const itemToMove = sourceItems.find((item) => item.id === active.id)!;
        const oldIndex = sourceItems.findIndex((item) => item.id === active.id);
        
        sourceItems.splice(oldIndex, 1);

        if (sourceCol.id === destCol.id) {
          const newIndex = destItems.findIndex((item) => item.id === over.id);
          destItems.splice(newIndex >= 0 ? newIndex : destItems.length, 0, itemToMove);
          newColumns[sourceIndex] = { ...sourceCol, items: destItems };
        } else {
          // Atualizar status do pedido ao mudar de coluna
          const novoStatus = destCol.title;
          itemToMove.status = novoStatus;
          
          newColumns[sourceIndex] = { ...sourceCol, items: sourceItems };
          destItems.push(itemToMove);
          newColumns[destIndex] = { ...destCol, items: destItems };

          // Persistir mudança de status no banco
          try {
            const { error } = await supabase
              .from('pedidos')
              .update({ 
                status: novoStatus as any,
                updated_at: new Date().toISOString()
              })
              .eq('id', active.id as string);

            if (error) throw error;
            toast.success('Status do pedido atualizado!');
          } catch (error: any) {
            toast.error('Erro ao atualizar status: ' + error.message);
            // Reverter mudança em caso de erro
            return;
          }
        }

        setPedidosColumns(newColumns);
      }
    }
  };

  const activeItem = pedidosColumns
    .flatMap((col) => col.items)
    .find((item) => item.id === activeId);

  // Recent clients
  const clientes = [
    { id: "1", nome: "João Silva", email: "joao@email.com", ultimaCompra: "10/03/2024" },
    { id: "2", nome: "Maria Santos", email: "maria@email.com", ultimaCompra: "15/03/2024" },
    { id: "3", nome: "Pedro Costa", email: "pedro@email.com", ultimaCompra: "18/03/2024" },
  ];

  const handleNovoPedido = (pedido: any) => {
    const newColumns = [...pedidosColumns];
    const novoColumn = newColumns.find(col => col.id === "novo");
    if (novoColumn) {
      novoColumn.items.unshift(pedido);
      setPedidosColumns(newColumns);
    }
  };

  const handleAtualizarPedido = (pedidoAtualizado: any) => {
    const newColumns = pedidosColumns.map(col => ({
      ...col,
      items: col.items.map(item => 
        item.id === pedidoAtualizado.id ? pedidoAtualizado : item
      )
    }));
    setPedidosColumns(newColumns);
  };

  const handleSelectPedidoCaixa = async (pedido: any) => {
    try {
      // Buscar dados completos do pedido
      const { data: pedidoCompleto, error: pedidoError } = await supabase
        .from('pedidos')
        .select(`
          *,
          clientes (
            id,
            nome,
            celular,
            email,
            tipo,
            cpf_cnpj,
            endereco,
            cidade,
            estado,
            cep
          )
        `)
        .eq('id', pedido.id)
        .single();

      if (pedidoError) throw pedidoError;

      // Buscar itens do pedido
      const { data: itens, error: itensError } = await supabase
        .from('itens_pedido')
        .select(`
          *,
          produtos (
            id,
            nome,
            codigo_barras,
            descricao
          ),
          variacoes_produto (
            id,
            nome
          )
        `)
        .eq('pedido_id', pedido.id);

      if (itensError) throw itensError;

      // Montar objeto do pedido para exibição
      const pedidoFormatado = {
        ...pedidoCompleto,
        numero: pedidoCompleto.numero_pedido,
        cliente: {
          nome: pedidoCompleto.clientes?.nome || 'Não informado',
          celular: pedidoCompleto.clientes?.celular || 'Não informado',
          email: pedidoCompleto.clientes?.email || 'Não informado',
          tipo: pedidoCompleto.clientes?.tipo || 'Pessoa Física',
          cpf: pedidoCompleto.clientes?.tipo === 'Pessoa Física' ? pedidoCompleto.clientes?.cpf_cnpj : null,
          cnpj: pedidoCompleto.clientes?.tipo === 'Pessoa Jurídica' ? pedidoCompleto.clientes?.cpf_cnpj : null,
        },
        produtos: itens?.map(item => ({
          nome: item.produtos?.nome || 'Produto',
          acabamento: item.variacoes_produto?.nome || 'Padrão',
          papel: item.observacoes || 'Não especificado',
          medidas: 'Não especificado',
          quantidade: item.quantidade,
          precoUnitario: Number(item.preco_unitario),
          precoTotal: Number(item.subtotal)
        })) || []
      };

      setPedidoCaixa(pedidoFormatado);
      setSearchOpen(false);
      setSearchValue(parseInt(pedidoCompleto.numero_pedido, 10).toString() || '');
      setEmailNota(pedidoCompleto.clientes?.email || '');
    } catch (error) {
      console.error('Erro ao carregar pedido:', error);
      toast.error('Erro ao carregar dados do pedido');
    }
  };

  // Função para verificar se pode fazer scroll
  const checkScrollButtons = () => {
    if (!scrollContainerRef.current) return;
    
    // O ScrollArea do Radix tem a viewport dentro, então precisamos buscar ela
    const viewport = scrollContainerRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
    if (!viewport) return;
    
    const hasOverflow = viewport.scrollWidth > viewport.clientWidth;
    setCanScrollLeft(viewport.scrollLeft > 10);
    setCanScrollRight(hasOverflow && viewport.scrollLeft < viewport.scrollWidth - viewport.clientWidth - 10);
    
    // Atualizar progresso do scroll
    if (hasOverflow) {
      const progress = viewport.scrollLeft / (viewport.scrollWidth - viewport.clientWidth);
      setScrollProgress(progress);
    } else {
      setScrollProgress(0);
    }
  };

  // Função para navegar entre colunas
  const scrollToDirection = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    
    const viewport = scrollContainerRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
    if (!viewport) return;
    
    const columnWidth = 320 + 16; // largura da coluna (80 * 4 = 320px) + gap (16px)
    const scrollAmount = direction === 'left' ? -columnWidth : columnWidth;
    
    viewport.scrollBy({
      left: scrollAmount,
      behavior: 'smooth'
    });
    
    // Usar requestAnimationFrame para sincronizar com o scroll
    const checkDuringScroll = () => {
      checkScrollButtons();
      requestAnimationFrame(checkDuringScroll);
    };
    
    const rafId = requestAnimationFrame(checkDuringScroll);
    
    // Parar de verificar após o scroll terminar (estimativa)
    setTimeout(() => {
      cancelAnimationFrame(rafId);
      checkScrollButtons();
    }, 500);
  };

  // Verificar botões de scroll quando os pedidos mudarem
  useEffect(() => {
    const timer = setTimeout(() => {
      checkScrollButtons();
    }, 100);
    return () => clearTimeout(timer);
  }, [pedidosColumns, vendedorSelecionado, loadingPedidos]);

  // Adicionar listener para scroll e atualizar indicador
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    
    const viewport = scrollContainerRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
    if (!viewport) return;

    const handleScroll = () => {
      checkScrollButtons();
    };

    viewport.addEventListener('scroll', handleScroll, { passive: true });
    
    // Verificar após resize
    const resizeObserver = new ResizeObserver(checkScrollButtons);
    resizeObserver.observe(viewport);
    
    return () => {
      viewport.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, [pedidosColumns]);

  // Adicionar atalhos de teclado para navegação
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Só funciona na aba de pedidos (Kanban)
      if (activeTab !== 'pedidos') return;
      
      // Ignorar se o usuário estiver digitando em um input/textarea
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      
      if (event.key === 'ArrowLeft' && canScrollLeft) {
        event.preventDefault();
        scrollToDirection('left');
      } else if (event.key === 'ArrowRight' && canScrollRight) {
        event.preventDefault();
        scrollToDirection('right');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, canScrollLeft, canScrollRight]);




  const handleFinalizarPedido = () => {
    console.log("Finalizar pedido:", {
      pedido: pedidoCaixa,
      formaPagamento,
      gerarNota,
      emailNota: gerarNota ? emailNota : null,
    });
  };

  const handleTitleChange = (columnId: string, newTitle: string) => {
    setPedidosColumns(prev => 
      prev.map(col => col.id === columnId ? { ...col, title: newTitle } : col)
    );
  };

  const handleDuplicateColumn = (columnId: string) => {
    const columnToDuplicate = pedidosColumns.find(col => col.id === columnId);
    if (columnToDuplicate) {
      const newColumn = {
        ...columnToDuplicate,
        id: `${columnToDuplicate.id}-copy-${Date.now()}`,
        title: `${columnToDuplicate.title} (Cópia)`,
        items: columnToDuplicate.items.map(item => ({
          ...item,
          id: `${item.id}-copy-${Date.now()}`
        }))
      };
      setPedidosColumns(prev => [...prev, newColumn]);
    }
  };

  const handleDeleteColumn = (columnId: string) => {
    setPedidosColumns(prev => prev.filter(col => col.id !== columnId));
  };

  const handleArchiveColumn = (columnId: string) => {
    console.log("Arquivar coluna:", columnId);
    // Implementar lógica de arquivamento
  };

  // Filtrar pedidos do banco de dados
  const filteredPedidosCaixa = useMemo(() => {
    if (!pedidosColumns) return [];
    
    // Obter todos os itens de todas as colunas
    const todosPedidos = pedidosColumns.flatMap(col => col.items);
    
    return todosPedidos.filter((p) => {
      // Filtrar por vendedor
      const vendedorMatch = vendedorSelecionado === "Todos" || 
                            vendedorSelecionado === "Todos (por Vendedor)" ||
                            p.vendedor === vendedorSelecionado;
      
      // Filtrar por status
      const statusMatch = statusFiltro === "Todos" || p.status === statusFiltro;
      
      // Filtrar por busca
      if (!searchValue) {
        return vendedorMatch && statusMatch;
      }
      
      // Função auxiliar para normalizar texto (remove acentos)
      const normalizeText = (text: string) => {
        return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      };
      
      const searchLower = searchValue.trim().toLowerCase();
      const searchNormalized = normalizeText(searchValue.trim());
      
      // Busca por número do pedido (apenas dígitos)
      const searchNumeric = searchValue.replace(/\D/g, '');
      const numeroMatch = searchNumeric && (
        p.numero?.replace(/\D/g, '').includes(searchNumeric) ||
        p.numeroFormatado?.replace(/\D/g, '').includes(searchNumeric)
      );
      
      // Busca por celular (apenas dígitos, sem máscara)
      const celular = p._dbData?.clientes?.celular || '';
      const celularNumeric = celular.replace(/\D/g, '');
      const celularMatch = searchNumeric && celularNumeric.includes(searchNumeric);
      
      // Busca por nome do cliente (texto completo, normalizado)
      const nomeCliente = p.cliente || '';
      const nomeMatch = normalizeText(nomeCliente).includes(searchNormalized) || 
                        nomeCliente.toLowerCase().includes(searchLower);
      
      // Busca por e-mail (texto completo)
      const email = p._dbData?.clientes?.email || '';
      const emailMatch = email.toLowerCase().includes(searchLower);
      
      const searchMatch = numeroMatch || celularMatch || nomeMatch || emailMatch;
      
      return vendedorMatch && statusMatch && searchMatch;
    });
  }, [pedidosColumns, vendedorSelecionado, statusFiltro, searchValue]);

  // Reset estado ao trocar de aba (mas mantém o filtro de status)
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Resetar estado específico de cada aba
    if (value === "pedidos") {
      // Nada específico para resetar no kanban por enquanto
    } else if (value === "caixa") {
      // Resetar estado da Frente de Caixa (mas mantém statusFiltro)
      setSearchValue("");
      setPedidoCaixa(null);
      setFormaPagamento("");
      setGerarNota(false);
      setEmailNota("");
      setSearchOpen(false);
    }
  };

  return (
    <div className="flex flex-col w-full h-screen overflow-hidden">
      <Sidebar type="loja" />
      
      <main className="flex-1 bg-background flex flex-col overflow-hidden">
        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Pedidos - Kanban */}
              <TabsContent 
                value="pedidos" 
                className="flex-1 overflow-hidden m-0 p-0 px-8 pt-6 data-[state=inactive]:hidden"
                style={{
                  backgroundColor: kanbanConfig.corFundo,
                  backgroundImage: kanbanConfig.imagemFundo ? `url(${kanbanConfig.imagemFundo})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  backgroundAttachment: 'fixed'
                }}
              >
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCorners}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  modifiers={[]}
                >
                  <div className="relative h-full overflow-hidden">
                    {/* Botão de navegação esquerda */}
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute left-4 top-1/2 !-translate-y-1/2 z-10 h-12 w-12 rounded-full bg-background/95 backdrop-blur-sm shadow-lg border-2 border-accent/40 hover:bg-accent/20 hover:border-accent/60 transition-opacity duration-300 active:!-translate-y-1/2 focus:!-translate-y-1/2 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => scrollToDirection('left')}
                      disabled={!canScrollLeft}
                      style={{
                        opacity: canScrollLeft ? 1 : 0,
                        pointerEvents: canScrollLeft ? 'auto' : 'none'
                      }}
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>

                    {/* Botão de navegação direita */}
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute right-4 top-1/2 !-translate-y-1/2 z-10 h-12 w-12 rounded-full bg-background/95 backdrop-blur-sm shadow-lg border-2 border-accent/40 hover:bg-accent/20 hover:border-accent/60 transition-opacity duration-300 active:!-translate-y-1/2 focus:!-translate-y-1/2 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => scrollToDirection('right')}
                      disabled={!canScrollRight}
                      style={{
                        opacity: canScrollRight ? 1 : 0,
                        pointerEvents: canScrollRight ? 'auto' : 'none'
                      }}
                    >
                      <ChevronRight className="h-6 w-6" />
                    </Button>

                    {/* Scrollbar customizada refinada estilo Trello */}
                    <div className="absolute bottom-6 left-4 right-4 z-10">
                      <div className="relative">
                        {/* Track da scrollbar - UI refinada */}
                        <div 
                          className="h-4 bg-muted/50 backdrop-blur-sm rounded-full shadow-sm border border-border/30 cursor-pointer overflow-hidden group hover:bg-muted/60 transition-colors duration-200"
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const clickX = e.clientX - rect.left;
                            const percentage = clickX / rect.width;
                            
                            const viewport = scrollContainerRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
                            if (viewport) {
                              const targetScroll = percentage * (viewport.scrollWidth - viewport.clientWidth);
                              viewport.scrollTo({
                                left: targetScroll,
                                behavior: 'smooth'
                              });
                            }
                          }}
                        >
                          {/* Thumb da scrollbar (arrastável) - 1/3 da largura da tela */}
                          <div 
                            className="absolute top-1/2 -translate-y-1/2 h-[calc(100%-2px)] bg-primary/80 rounded-full shadow-md cursor-grab active:cursor-grabbing transition-all duration-150 group-hover:bg-primary active:scale-[1.02]"
                            style={{
                              left: `${scrollProgress * 100}%`,
                              width: 'calc(100vw / 3)',
                              transform: 'translate(-50%, -50%)'
                            }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              const startX = e.clientX;
                              const viewport = scrollContainerRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
                              if (!viewport) return;
                              
                              const startScrollLeft = viewport.scrollLeft;
                              const scrollWidth = viewport.scrollWidth - viewport.clientWidth;
                              const trackWidth = e.currentTarget.parentElement!.offsetWidth;
                              
                              const handleMouseMove = (moveEvent: MouseEvent) => {
                                const deltaX = moveEvent.clientX - startX;
                                const scrollDelta = (deltaX / trackWidth) * scrollWidth;
                                const newScrollLeft = Math.max(0, Math.min(scrollWidth, startScrollLeft + scrollDelta));
                                viewport.scrollLeft = newScrollLeft;
                                
                                // Atualizar o progresso durante o arraste
                                const progress = scrollWidth > 0 ? newScrollLeft / scrollWidth : 0;
                                setScrollProgress(progress);
                              };
                              
                              const handleMouseUp = () => {
                                document.removeEventListener('mousemove', handleMouseMove);
                                document.removeEventListener('mouseup', handleMouseUp);
                              };
                              
                              document.addEventListener('mousemove', handleMouseMove);
                              document.addEventListener('mouseup', handleMouseUp);
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <ScrollArea className="absolute inset-0 [&>div]:h-full" ref={scrollContainerRef}>
                      <div 
                        className="h-full overflow-y-hidden pb-20"  
                        style={{ minWidth: 'min-content' }}
                      >
                      {loadingPedidos ? (
                        <div className="flex gap-4 h-full pb-20">
                          {[1, 2, 3, 4].map((colIndex) => (
                            <div key={colIndex} className="flex-shrink-0 w-80 bg-muted/30 rounded-lg p-4">
                              <Skeleton className="h-8 w-32 mb-4" />
                              <div className="space-y-3">
                                {[1, 2, 3].map((cardIndex) => (
                                  <Skeleton key={cardIndex} className="h-44 w-full rounded-lg" />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div 
                          className={cn(
                            "flex gap-4 h-full pb-20 transition-all duration-300",
                            isTransitioning ? "opacity-0 scale-95" : "opacity-100 scale-100"
                          )}
                        >
                          {pedidosFiltrados.map((column, index) => (
                            <div
                              key={column.id}
                              className="animate-fade-in"
                              style={{
                                animationDelay: isTransitioning ? '0ms' : `${index * 50}ms`,
                                animationDuration: '400ms',
                                animationFillMode: 'backwards'
                              }}
                            >
                              <DroppableColumn 
                                column={column}
                                isOver={overId === column.id}
                                onTitleChange={handleTitleChange}
                                columnRules={columnRules}
                                itemCount={column.items.length}
                                items={column.items}
                              >
                                <SortableContext
                                  items={column.items.map((item) => item.id)}
                                  strategy={verticalListSortingStrategy}
                                >
                                  {column.items.map((item) => (
                                     <div key={item.id} className="mb-3">
                                       <DraggableCard 
                                        item={item}
                                        onClick={() => {
                                          navigate(`/loja/pedido/${item.id}`);
                                        }}
                                      />
                                    </div>
                                  ))}
                                </SortableContext>
                              </DroppableColumn>
                            </div>
                          ))}
                        </div>
                      )}
                      </div>
                      {/* ScrollBar nativo oculto - usamos apenas a scrollbar customizada acima */}
                      <ScrollBar 
                        orientation="horizontal" 
                        className="hidden"
                      />
                    </ScrollArea>
                  </div>

                  <DragOverlay dropAnimation={null}>
                    {activeId && activeItem ? (
                      <Card className="bg-card shadow-[0_8px_30px_rgba(0,0,0,0.15)] opacity-95 rotate-6 scale-105 cursor-grabbing animate-wiggle rounded-2xl border border-border">
                        <CardContent className="p-4">
                          {/* Etiquetas */}
                          {activeItem.etiquetas && activeItem.etiquetas.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {activeItem.etiquetas.map((etiq: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="inline-flex items-center rounded px-2 py-1 text-xs font-semibold text-white"
                                  style={{ backgroundColor: etiq.cor }}
                                >
                                  {etiq.nome}
                                </div>
                              ))}
                            </div>
                          )}
                          
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-muted-foreground uppercase">Pedido:</span>
                              <Badge className="bg-foreground text-background hover:bg-foreground/90 font-bold rounded-md px-3 py-1 text-sm">
                                {parseInt(activeItem.numeroFormatado || activeItem.numero || '0', 10) || 'N/A'}
                              </Badge>
                            </div>
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="space-y-2 mb-3">
                            <div>
                              <Label className="text-xs text-muted-foreground uppercase">Cliente:</Label>
                              <span className="ml-2 text-sm text-foreground">{activeItem.cliente}</span>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground uppercase">Produto:</Label>
                              <span className="ml-2 text-sm text-foreground">
                                {activeItem.produto}
                                {activeItem.produtos && activeItem.produtos.length > 1 && (
                                  <span className="text-muted-foreground"> (+{activeItem.produtos.length - 1})</span>
                                )}
                              </span>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground uppercase">Total:</Label>
                              <span className="ml-2 text-sm font-semibold text-foreground">{formatBRL(activeItem.valor)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2 pt-2">
                              <StatusBadge status={activeItem.status} />
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={activeItem.avatarUrl || userIcon} alt={activeItem.vendedor} />
                                  <AvatarFallback className="text-xs">{activeItem.vendedor?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="text-xs font-medium text-foreground">{activeItem.vendedor}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ) : null}
                  </DragOverlay>

                </DndContext>
              </TabsContent>

              {/* Frente de Caixa Tab */}
              <TabsContent 
                value="caixa" 
                className="flex-1 flex flex-col overflow-y-auto m-0 p-0 px-8 pt-6 data-[state=inactive]:hidden"
                style={{
                  backgroundColor: kanbanConfig.corFundo,
                  backgroundImage: kanbanConfig.imagemFundo ? `url(${kanbanConfig.imagemFundo})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  backgroundAttachment: 'fixed'
                }}
              >
              {!pedidoCaixa && (
                <>
                {/* Campo de Pesquisa e Filtro */}
                <div className="flex justify-center gap-4 mb-6">
                  <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                    <PopoverTrigger asChild>
                      <div className="relative w-full max-w-2xl">
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={searchOpen}
                          className="w-full h-14 text-base justify-start bg-card hover:bg-card border-2 border-border hover:border-primary transition-all shadow-fellow-md rounded-xl"
                        >
                          <Search className="mr-3 h-5 w-5 shrink-0 text-muted-foreground" />
                          <span className={cn("text-muted-foreground", searchValue && "text-foreground font-medium")}>
                            {searchValue || "Pesquisar por Número do Pedido, Celular, Nome ou E-mail..."}
                          </span>
                        </Button>
                        {searchValue && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full hover:bg-muted"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSearchValue("");
                              setPedidoCaixa(null);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-[700px] p-0" align="center">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Digite número do pedido, celular, nome ou e-mail..."
                          value={searchValue}
                          onValueChange={setSearchValue}
                        />
                        <CommandList>
                          <CommandEmpty>Nenhum pedido encontrado.</CommandEmpty>
                          <CommandGroup heading="Códigos de Entrega">
                            {filteredPedidosCaixa.map((pedido) => {
                              const numero = pedido.numeroFormatado || pedido.numero || '';
                              const celular = pedido._dbData?.clientes?.celular || '';
                              const email = pedido._dbData?.clientes?.email || '';
                              const nome = pedido.cliente || '';
                              
                              return (
                                <CommandItem
                                  key={pedido.id}
                                  value={`${numero} ${celular} ${email} ${nome}`}
                                  onSelect={() => handleSelectPedidoCaixa(pedido)}
                                  className="cursor-pointer py-3"
                                >
                                  <div className="flex flex-col gap-1 w-full">
                                    <div className="font-semibold text-base">Pedido: {parseInt(numero, 10) || 'N/A'}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {nome} • {celular || 'Sem celular'}
                                    </div>
                                  </div>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                </>
              )}

              {/* Grid de Últimos Pedidos - Mostra quando NÃO há pedido selecionado */}
              {!pedidoCaixa && (
                <div className="flex-1 overflow-y-auto pr-2 pb-24">
                  <div className="grid gap-4 auto-rows-fr justify-center" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 220px))' }}>
                    {(searchValue ? filteredPedidosCaixa : filteredPedidosCaixa.slice(0, 12)).map((pedido, index) => {
                      const getStatusColor = (status: string) => {
                        const statusLower = status.toLowerCase();
                        if (statusLower === 'finalizado') return 'bg-[hsl(var(--status-finalizado))] text-[hsl(var(--status-finalizado-foreground))]';
                        if (statusLower === 'andamento') return 'bg-[hsl(var(--status-andamento))] text-[hsl(var(--status-andamento-foreground))]';
                        if (statusLower === 'produção' || statusLower === 'producao') return 'bg-[hsl(var(--status-producao))] text-[hsl(var(--status-producao-foreground))]';
                        if (statusLower === 'pedido' || statusLower === 'novo') return 'bg-[hsl(var(--status-novo))] text-[hsl(var(--status-novo-foreground))]';
                        if (statusLower === 'cancelado') return 'bg-[hsl(var(--status-cancelado))] text-[hsl(var(--status-cancelado-foreground))]';
                        if (statusLower === 'entrega') return 'bg-[hsl(var(--status-entrega))] text-[hsl(var(--status-entrega-foreground))]';
                        return 'bg-secondary text-secondary-foreground';
                      };
                      
                      return (
                        <Card
                          key={pedido.id}
                          className="cursor-pointer hover:shadow-lg transition-all border-2 border-border hover:border-primary bg-card rounded-xl shadow-sm aspect-square flex flex-col"
                          onClick={() => navigate(`/loja/checkout/${pedido.id}`)}
                        >
                          <CardContent className="p-3 space-y-2 flex flex-col justify-between h-full">
                            {/* Etiquetas acima do número do pedido */}
                            {pedido.etiquetas && pedido.etiquetas.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {pedido.etiquetas.map((etiq: any, idx: number) => (
                                  <Badge
                                    key={idx}
                                    style={{ 
                                      backgroundColor: etiq.cor,
                                      color: '#ffffff'
                                    }}
                                    className="text-xs font-semibold px-2 py-0.5"
                                  >
                                    {etiq.nome}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-semibold text-muted-foreground uppercase">Pedido:</span>
                              <Badge className="bg-foreground text-background hover:bg-foreground/90 font-bold rounded-md px-3 py-1 text-sm">
                                {parseInt(pedido._dbData?.numero_pedido || pedido.numero || String(index + 1).padStart(4, '0'), 10) || (index + 1)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1">
                              <Label className="text-xs text-muted-foreground uppercase">CLIENTE:</Label>
                              <span className="font-medium text-foreground text-sm truncate">
                                {pedido._dbData?.clientes?.nome || pedido.cliente?.nome || 'Cliente não informado'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Label className="text-xs text-muted-foreground uppercase">PRODUTO:</Label>
                              <span className="text-sm text-foreground truncate">
                                {pedido.produto || 'Sem produtos'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Label className="text-xs text-muted-foreground uppercase">TOTAL:</Label>
                              <span className="text-base font-semibold text-foreground">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                  pedido._dbData?.valor_final || pedido.valor || 0
                                )}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 pt-1">
                              <StatusBadge status={pedido.status} />
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={pedido.avatarUrl || userIcon} alt={pedido.vendedor || 'Vendedor'} />
                                  <AvatarFallback className="text-xs">{(pedido.vendedor || 'V')?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="text-xs font-medium text-foreground">{pedido.vendedor || 'Sem vendedor'}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Detalhes do Pedido - Mostra quando há pedido selecionado */}
              {pedidoCaixa && (
                <div className="space-y-6">
                  {/* Header com Voltar, Pedido Info e Visualizações */}
                  <div className="flex items-center justify-between p-6 bg-card border-2 border-border rounded-xl shadow-fellow-md">
                    {/* Botão Voltar */}
                    <Button
                      variant="outline"
                      onClick={() => {
                        setPedidoCaixa(null);
                        setSearchValue("");
                      }}
                      className="gap-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      VOLTAR
                    </Button>

                    {/* Número do Pedido e Status - Lado a Lado */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold">Pedido:</span>
                        <Badge className="bg-foreground text-background hover:bg-foreground/90 font-bold rounded-full px-4 py-1.5 text-base">
                          {pedidoCaixa.numero || pedidoCaixa._dbData?.numero_pedido || 'N/A'}
                        </Badge>
                      </div>
                      <StatusBadge status={pedidoCaixa.status} />
                    </div>

                    {/* Ícones de Visualização */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setLayoutModeCaixa("three-columns")}
                        title="3 colunas lado a lado"
                        className={cn(
                          "text-muted-foreground hover:text-foreground hover:bg-muted",
                          layoutModeCaixa === "three-columns" && "bg-muted text-foreground"
                        )}
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setLayoutModeCaixa("two-one")}
                        title="2 em cima, 1 ao lado"
                        className={cn(
                          "text-muted-foreground hover:text-foreground hover:bg-muted",
                          layoutModeCaixa === "two-one" && "bg-muted text-foreground"
                        )}
                      >
                        <LayoutPanelTop className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setLayoutModeCaixa("stacked")}
                        title="3 empilhados"
                        className={cn(
                          "text-muted-foreground hover:text-foreground hover:bg-muted",
                          layoutModeCaixa === "stacked" && "bg-muted text-foreground"
                        )}
                      >
                        <Columns3 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Cards com Layout Dinâmico */}
                  <div className={cn(
                    layoutModeCaixa === "three-columns" && "grid grid-cols-3 gap-6",
                    layoutModeCaixa === "two-one" && "grid grid-cols-3 gap-6",
                    layoutModeCaixa === "stacked" && "flex flex-col gap-6"
                  )}>
                    {layoutModeCaixa === "two-one" ? (
                      <>
                        <div className="col-span-2 space-y-6">
                          {/* QUADRO 1: DADOS DO CLIENTE */}
                          <Card className="shadow-fellow-lg border-2">
                            <CardHeader className="pb-4 bg-accent/5">
                              <CardTitle className="text-lg font-bold">Dados do Cliente</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 pt-4">
                              <div>
                                <Label className="text-xs text-muted-foreground font-semibold">Nome</Label>
                                <p className="font-semibold text-base mt-1">{pedidoCaixa.cliente.nome}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground font-semibold">Celular</Label>
                                <p className="font-medium mt-1">{pedidoCaixa.cliente.celular}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground font-semibold">E-mail</Label>
                                <p className="font-medium text-sm mt-1 break-all">{pedidoCaixa.cliente.email}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground font-semibold">Tipo de Pessoa</Label>
                                <p className="font-medium mt-1">{pedidoCaixa.cliente.tipo}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground font-semibold">
                                  {pedidoCaixa.cliente.tipo === "Pessoa Física" ? "CPF" : "CNPJ"}
                                </Label>
                                <p className="font-medium mt-1">
                                  {pedidoCaixa.cliente.cpf || pedidoCaixa.cliente.cnpj}
                                </p>
                              </div>
                            </CardContent>
                          </Card>

                          {/* QUADRO 2: PRODUTO */}
                          <Card className="shadow-fellow-lg border-2">
                            <CardHeader className="pb-4 bg-accent/5">
                              <CardTitle className="text-lg font-bold">Produtos</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                              {pedidoCaixa.produtos ? (
                                <Accordion type="single" collapsible className="w-full">
                                  {pedidoCaixa.produtos.map((produto, index) => (
                                    <AccordionItem key={index} value={`produto-${index}`} className="border-b last:border-0">
                                      <AccordionTrigger className="hover:no-underline py-3">
                                        <div className="flex items-center justify-between w-full pr-2">
                                          <span className="font-semibold text-base text-left">{produto.nome}</span>
                                          <span className="font-bold text-lg text-primary">
                                            {formatBRL(produto.precoTotal)}
                                          </span>
                                        </div>
                                      </AccordionTrigger>
                                      <AccordionContent>
                                        <div className="space-y-3 pt-2 pb-3">
                                          <div>
                                            <Label className="text-xs text-muted-foreground font-semibold">Acabamento</Label>
                                            <p className="font-medium mt-1">{produto.acabamento}</p>
                                          </div>
                                          <div>
                                            <Label className="text-xs text-muted-foreground font-semibold">Tipo de Papel</Label>
                                            <p className="font-medium mt-1">{produto.papel}</p>
                                          </div>
                                          <div>
                                            <Label className="text-xs text-muted-foreground font-semibold">Medidas</Label>
                                            <p className="font-medium mt-1">{produto.medidas}</p>
                                          </div>
                                          <div>
                                            <Label className="text-xs text-muted-foreground font-semibold">Quantidade</Label>
                                            <p className="font-medium mt-1">{produto.quantidade} unidades</p>
                                          </div>
                                          <div>
                                            <Label className="text-xs text-muted-foreground font-semibold">Preço Unitário</Label>
                                            <p className="font-medium mt-1">{formatBRL(produto.precoUnitario)}</p>
                                          </div>
                                        </div>
                                      </AccordionContent>
                                    </AccordionItem>
                                  ))}
                                </Accordion>
                              ) : pedidoCaixa.produto ? (
                                <div className="space-y-3">
                                  <div>
                                    <Label className="text-xs text-muted-foreground font-semibold">Nome do Produto</Label>
                                    <p className="font-semibold text-base mt-1">{pedidoCaixa.produto.nome}</p>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-muted-foreground font-semibold">Acabamento</Label>
                                    <p className="font-medium mt-1">{pedidoCaixa.produto.acabamento}</p>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-muted-foreground font-semibold">Tipo de Papel</Label>
                                    <p className="font-medium mt-1">{pedidoCaixa.produto.papel}</p>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-muted-foreground font-semibold">Medidas</Label>
                                    <p className="font-medium mt-1">{pedidoCaixa.produto.medidas}</p>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-muted-foreground font-semibold">Quantidade</Label>
                                    <p className="font-medium mt-1">{pedidoCaixa.produto.quantidade} unidades</p>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-muted-foreground font-semibold">Preço Unitário</Label>
                                    <p className="font-medium mt-1">{formatBRL(pedidoCaixa.produto.precoUnitario)}</p>
                                  </div>
                                </div>
                              ) : null}
                            </CardContent>
                          </Card>
                        </div>

                        {/* QUADRO 3: PAGAMENTO */}
                        <Card className="shadow-fellow-lg border-2">
                          <CardHeader className="pb-4 bg-accent/5">
                            <CardTitle className="text-lg font-bold">Pagamento</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4 pt-4">
                            <div className="pt-3 border-t-2 border-border">
                              <Label className="text-xs text-muted-foreground font-semibold">Preço Total do Pedido</Label>
                              <p className="font-bold text-2xl text-primary mt-1">
                                {formatBRL(pedidoCaixa.produtos 
                                  ? pedidoCaixa.produtos.reduce((sum, p) => sum + p.precoTotal, 0)
                                  : pedidoCaixa.produto?.precoTotal || 0
                                )}
                              </p>
                            </div>

                            <div>
                              <Label className="text-sm font-bold mb-3 block">Meio de Pagamento</Label>
                              <div className="grid grid-cols-1 gap-2">
                                {[
                                  { value: "pix", label: "PIX", icon: Smartphone },
                                  { value: "credito", label: "Crédito", icon: CreditCard },
                                  { value: "debito", label: "Débito", icon: CreditCard },
                                  { value: "boleto", label: "Boleto", icon: FileText },
                                  { value: "dinheiro", label: "Dinheiro", icon: Banknote },
                                ].map((forma) => {
                                  const Icon = forma.icon;
                                  return (
                                    <Button
                                      key={forma.value}
                                      variant={formaPagamento === forma.value ? "default" : "outline"}
                                      className={cn(
                                        "justify-start h-10 text-sm font-medium",
                                        formaPagamento === forma.value && "bg-primary text-primary-foreground shadow-md"
                                      )}
                                      onClick={() => setFormaPagamento(forma.value)}
                                    >
                                      <Icon className="mr-2 h-4 w-4" />
                                      {forma.label}
                                    </Button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="space-y-3 pt-2">
                              <div className="flex items-center justify-between py-3 px-4 bg-accent/10 rounded-lg border border-border">
                                <div className="flex items-center gap-3">
                                  <FileText className="h-5 w-5 text-primary" />
                                  <Label htmlFor="gerar-nota" className="text-sm font-semibold cursor-pointer">
                                    Gerar Nota Fiscal
                                  </Label>
                                </div>
                                <Switch
                                  id="gerar-nota"
                                  checked={gerarNota}
                                  onCheckedChange={setGerarNota}
                                />
                              </div>

                              {gerarNota && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                  <Label htmlFor="email-nota" className="text-sm font-semibold">
                                    E-mail para Recebimento da Nota
                                  </Label>
                                  <Input
                                    id="email-nota"
                                    type="email"
                                    className="h-10"
                                    placeholder="email@exemplo.com"
                                    value={emailNota}
                                    onChange={(e) => setEmailNota(e.target.value)}
                                  />
                                </div>
                              )}
                            </div>

                            <Button
                              size="lg"
                              className="w-full h-14 text-base font-bold shadow-fellow-lg mt-4 bg-primary hover:bg-primary/90"
                              onClick={handleFinalizarPedido}
                              disabled={!formaPagamento}
                            >
                              FINALIZAR PEDIDO
                            </Button>
                          </CardContent>
                        </Card>
                      </>
                    ) : (
                      <>
                        {/* QUADRO 1: DADOS DO CLIENTE */}
                        <Card className="shadow-fellow-lg border-2">
                          <CardHeader className="pb-4 bg-accent/5">
                            <CardTitle className="text-lg font-bold">Dados do Cliente</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3 pt-4">
                            <div>
                              <Label className="text-xs text-muted-foreground font-semibold">Nome</Label>
                              <p className="font-semibold text-base mt-1">{pedidoCaixa.cliente.nome}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground font-semibold">Celular</Label>
                              <p className="font-medium mt-1">{pedidoCaixa.cliente.celular}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground font-semibold">E-mail</Label>
                              <p className="font-medium text-sm mt-1 break-all">{pedidoCaixa.cliente.email}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground font-semibold">Tipo de Pessoa</Label>
                              <p className="font-medium mt-1">{pedidoCaixa.cliente.tipo}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground font-semibold">
                                {pedidoCaixa.cliente.tipo === "Pessoa Física" ? "CPF" : "CNPJ"}
                              </Label>
                              <p className="font-medium mt-1">
                                {pedidoCaixa.cliente.cpf || pedidoCaixa.cliente.cnpj}
                              </p>
                            </div>
                          </CardContent>
                        </Card>

                        {/* QUADRO 2: PRODUTO */}
                        <Card className="shadow-fellow-lg border-2">
                          <CardHeader className="pb-4 bg-accent/5">
                            <CardTitle className="text-lg font-bold">Produtos</CardTitle>
                          </CardHeader>
                          <CardContent className="pt-4">
                            {pedidoCaixa.produtos ? (
                              <Accordion type="single" collapsible className="w-full">
                                {pedidoCaixa.produtos.map((produto, index) => (
                                  <AccordionItem key={index} value={`produto-${index}`} className="border-b last:border-0">
                                    <AccordionTrigger className="hover:no-underline py-3">
                                      <div className="flex items-center justify-between w-full pr-2">
                                        <span className="font-semibold text-base text-left">{produto.nome}</span>
                                        <span className="font-bold text-lg text-primary">
                                          {formatBRL(produto.precoTotal)}
                                        </span>
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      <div className="space-y-3 pt-2 pb-3">
                                        <div>
                                          <Label className="text-xs text-muted-foreground font-semibold">Acabamento</Label>
                                          <p className="font-medium mt-1">{produto.acabamento}</p>
                                        </div>
                                        <div>
                                          <Label className="text-xs text-muted-foreground font-semibold">Tipo de Papel</Label>
                                          <p className="font-medium mt-1">{produto.papel}</p>
                                        </div>
                                        <div>
                                          <Label className="text-xs text-muted-foreground font-semibold">Medidas</Label>
                                          <p className="font-medium mt-1">{produto.medidas}</p>
                                        </div>
                                        <div>
                                          <Label className="text-xs text-muted-foreground font-semibold">Quantidade</Label>
                                          <p className="font-medium mt-1">{produto.quantidade} unidades</p>
                                        </div>
                                        <div>
                                          <Label className="text-xs text-muted-foreground font-semibold">Preço Unitário</Label>
                                          <p className="font-medium mt-1">{formatBRL(produto.precoUnitario)}</p>
                                        </div>
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                ))}
                              </Accordion>
                            ) : pedidoCaixa.produto ? (
                              <div className="space-y-3">
                                <div>
                                  <Label className="text-xs text-muted-foreground font-semibold">Nome do Produto</Label>
                                  <p className="font-semibold text-base mt-1">{pedidoCaixa.produto.nome}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground font-semibold">Acabamento</Label>
                                  <p className="font-medium mt-1">{pedidoCaixa.produto.acabamento}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground font-semibold">Tipo de Papel</Label>
                                  <p className="font-medium mt-1">{pedidoCaixa.produto.papel}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground font-semibold">Medidas</Label>
                                  <p className="font-medium mt-1">{pedidoCaixa.produto.medidas}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground font-semibold">Quantidade</Label>
                                  <p className="font-medium mt-1">{pedidoCaixa.produto.quantidade} unidades</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground font-semibold">Preço Unitário</Label>
                                  <p className="font-medium mt-1">{formatBRL(pedidoCaixa.produto.precoUnitario)}</p>
                                </div>
                              </div>
                            ) : null}
                          </CardContent>
                        </Card>

                        {/* QUADRO 3: PAGAMENTO */}
                        <Card className="shadow-fellow-lg border-2">
                          <CardHeader className="pb-4 bg-accent/5">
                            <CardTitle className="text-lg font-bold">Pagamento</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4 pt-4">
                            <div className="pt-3 border-t-2 border-border">
                              <Label className="text-xs text-muted-foreground font-semibold">Preço Total do Pedido</Label>
                              <p className="font-bold text-2xl text-primary mt-1">
                                {formatBRL(pedidoCaixa.produtos 
                                  ? pedidoCaixa.produtos.reduce((sum, p) => sum + p.precoTotal, 0)
                                  : pedidoCaixa.produto?.precoTotal || 0
                                )}
                              </p>
                            </div>

                            <div>
                              <Label className="text-sm font-bold mb-3 block">Meio de Pagamento</Label>
                              <div className="grid grid-cols-1 gap-2">
                                {[
                                  { value: "pix", label: "PIX", icon: Smartphone },
                                  { value: "credito", label: "Crédito", icon: CreditCard },
                                  { value: "debito", label: "Débito", icon: CreditCard },
                                  { value: "boleto", label: "Boleto", icon: FileText },
                                  { value: "dinheiro", label: "Dinheiro", icon: Banknote },
                                ].map((forma) => {
                                  const Icon = forma.icon;
                                  return (
                                    <Button
                                      key={forma.value}
                                      variant={formaPagamento === forma.value ? "default" : "outline"}
                                      className={cn(
                                        "justify-start h-10 text-sm font-medium",
                                        formaPagamento === forma.value && "bg-primary text-primary-foreground shadow-md"
                                      )}
                                      onClick={() => setFormaPagamento(forma.value)}
                                    >
                                      <Icon className="mr-2 h-4 w-4" />
                                      {forma.label}
                                    </Button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="space-y-3 pt-2">
                              <div className="flex items-center justify-between py-3 px-4 bg-accent/10 rounded-lg border border-border">
                                <div className="flex items-center gap-3">
                                  <FileText className="h-5 w-5 text-primary" />
                                  <Label htmlFor="gerar-nota" className="text-sm font-semibold cursor-pointer">
                                    Gerar Nota Fiscal
                                  </Label>
                                </div>
                                <Switch
                                  id="gerar-nota"
                                  checked={gerarNota}
                                  onCheckedChange={setGerarNota}
                                />
                              </div>

                              {gerarNota && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                  <Label htmlFor="email-nota" className="text-sm font-semibold">
                                    E-mail para Recebimento da Nota
                                  </Label>
                                  <Input
                                    id="email-nota"
                                    type="email"
                                    className="h-10"
                                    placeholder="email@exemplo.com"
                                    value={emailNota}
                                    onChange={(e) => setEmailNota(e.target.value)}
                                  />
                                </div>
                              )}
                            </div>

                            <Button
                              size="lg"
                              className="w-full h-14 text-base font-bold shadow-fellow-lg mt-4 bg-primary hover:bg-primary/90"
                              onClick={handleFinalizarPedido}
                              disabled={!formaPagamento}
                            >
                              FINALIZAR PEDIDO
                            </Button>
                          </CardContent>
                        </Card>
                      </>
                    )}
                  </div>

                  {/* Histórico do Pedido */}
                  <Card className="shadow-fellow-lg border-2">
                    <CardHeader className="pb-4 bg-muted/5">
                      <CardTitle className="text-lg font-bold">Histórico do Pedido</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-4">
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Digite uma observação ou atualização..."
                          value={historicoTextCaixa}
                          onChange={(e) => setHistoricoTextCaixa(e.target.value)}
                          className="flex-1"
                          rows={3}
                        />
                        <Button 
                          onClick={() => {
                            if (!historicoTextCaixa.trim()) {
                              toast.error("Digite algo no histórico antes de salvar.");
                              return;
                            }
                            const novoHistorico = {
                              id: Date.now().toString(),
                              texto: historicoTextCaixa,
                              data: new Date().toLocaleString("pt-BR"),
                            };
                            setHistoricosCaixa([novoHistorico, ...historicosCaixa]);
                            setHistoricoTextCaixa("");
                            toast.success("Interação adicionada com sucesso!");
                          }}
                          className="bg-muted hover:bg-muted/80 text-foreground"
                        >
                          Salvar
                        </Button>
                      </div>

                      {historicosCaixa.length > 0 && (
                        <div className="space-y-1 mt-4">
                          {historicosCaixa.map((hist, index) => (
                            <div
                              key={hist.id}
                              className={`p-3 rounded-lg ${
                                index % 2 === 0 ? "bg-muted/50" : "bg-background"
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <p className="text-sm text-foreground flex-1">{hist.texto}</p>
                                <span className="text-xs text-muted-foreground ml-4">{hist.data}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
      )}
    </TabsContent>
    </div>

    {/* Rodapé Fixo - Tabs, Filtros e Botão */}
    <div className="px-8 pb-2 pt-2 border-t-2 border-border bg-background">
              <div className="grid grid-cols-3 items-center pt-1">
                {/* Esquerda - Filtros */}
                <div className="flex items-center gap-3 justify-start">
                  <div 
                    className={cn(
                      "flex items-center gap-3 bg-card border-2 shadow-fellow-md px-3 py-1.5 rounded-xl cursor-pointer transition-all hover:shadow-lg",
                      modoVisualizacao === "status" ? "border-primary" : "border-border"
                    )}
                    onClick={() => {
                      if (modoVisualizacao !== "status") {
                        setIsTransitioning(true);
                        setTimeout(() => {
                          setModoVisualizacao("status");
                          setTimeout(() => setIsTransitioning(false), 300);
                        }, 150);
                      }
                    }}
                  >
                    <Label className="text-sm font-semibold whitespace-nowrap text-muted-foreground cursor-pointer">Status:</Label>
                    <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                      <SelectTrigger 
                        className={cn(
                          "w-[120px] h-9 bg-background shadow-sm justify-start",
                          statusFiltro !== "Todos" ? "border-primary border-2" : "border-input"
                        )}
                        showClear={statusFiltro !== "Todos"} 
                        onClear={() => setStatusFiltro("Todos")}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent onClick={(e) => e.stopPropagation()}>
                        <SelectItem value="Todos" className="font-bold">Todos</SelectItem>
                        {statusConfig
                          .filter(s => s.ativo)
                          .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
                          .map(status => (
                            <SelectItem key={status.id} value={status.nome}>
                              {status.nome}
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </div>

                  <div 
                    className={cn(
                      "flex items-center gap-3 bg-card border-2 shadow-fellow-md px-3 py-1.5 rounded-xl cursor-pointer transition-all hover:shadow-lg",
                      modoVisualizacao === "funcionario" ? "border-primary" : "border-border"
                    )}
                    onClick={() => {
                      if (modoVisualizacao !== "funcionario") {
                        setIsTransitioning(true);
                        setTimeout(() => {
                          setModoVisualizacao("funcionario");
                          setTimeout(() => setIsTransitioning(false), 300);
                        }, 150);
                      }
                    }}
                  >
                    <Label className="text-sm font-semibold whitespace-nowrap text-muted-foreground cursor-pointer">Funcionário:</Label>
                    <Select 
                      key={vendedorSelecionado}
                      value={vendedorSelecionado} 
                      onValueChange={(value) => {
                        console.log("Vendedor selecionado:", value);
                        setVendedorSelecionado(value);
                      }}
                    >
                      <SelectTrigger 
                        className={cn(
                          "w-[120px] h-9 bg-background shadow-sm justify-start",
                          vendedorSelecionado !== "Todos" ? "border-primary border-2" : "border-input"
                        )}
                        showClear={vendedorSelecionado !== "Todos"}
                        onClear={() => {
                          console.log("Limpando filtro - resetando para Todos");
                          setVendedorSelecionado("Todos");
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent onClick={(e) => e.stopPropagation()}>
                        {getOpcoesVisualizacao(vendedores).map((opcao, index) => (
                          <SelectItem 
                            key={`${opcao.value}-${index}`} 
                            value={opcao.value}
                            className={opcao.isBold ? "font-bold" : ""}
                          >
                            {opcao.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Centro - Tabs */}
                <div className="flex justify-center">
                  <TabsList className="bg-card border-2 border-border shadow-fellow-md h-auto p-1 rounded-xl">
                    <TabsTrigger 
                      value="pedidos"
                      onClick={() => {
                        // Garantir que está na aba Fluxo
                        const tabsElement = document.querySelector('[value="pedidos"]');
                        if (tabsElement) {
                          (tabsElement as HTMLElement).click();
                        }
                      }}
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:text-muted-foreground text-sm font-semibold px-8 py-2 rounded-lg transition-all"
                    >
                      Fluxo
                    </TabsTrigger>
                    <TabsTrigger 
                      value="caixa"
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:text-muted-foreground text-sm font-semibold px-8 py-2 rounded-lg transition-all"
                    >
                      Pedidos
                    </TabsTrigger>
                  </TabsList>
                </div>
                
                {/* Direita - Indicadores + Botão */}
                <div className="flex justify-end items-center gap-3">
                  {/* Badge de Estado do Cache - Formato redondo expansível */}
                  {!loadingPedidos && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "relative flex items-center rounded-full cursor-help",
                            "border shadow-sm overflow-hidden",
                            // Estados de cor baseado no estado atual
                            refreshing || cacheUpdating 
                              ? "bg-yellow-50 border-yellow-300 dark:bg-yellow-950/20 dark:border-yellow-700" 
                              : isCacheValid 
                                ? "bg-green-50 border-green-300 dark:bg-green-950/20 dark:border-green-700" 
                                : "bg-blue-50 border-blue-300 dark:bg-blue-950/20 dark:border-blue-700",
                            // Animação de pulsação quando atualizando
                            (refreshing || cacheUpdating) && "animate-pulse"
                          )}
                          style={{
                            width: refreshing || cacheUpdating ? "auto" : "32px",
                            minWidth: "32px",
                            height: "32px",
                            paddingLeft: refreshing || cacheUpdating ? "10px" : "10px",
                            paddingRight: refreshing || cacheUpdating ? "12px" : "10px",
                            transition: "width 0.3s ease-in-out, padding 0.3s ease-in-out",
                          }}
                        >
                          {/* Bolinha - centralizada via absolute quando badge está fechada */}
                          <div 
                            className={cn(
                              "rounded-full flex-shrink-0 transition-all duration-300",
                              refreshing || cacheUpdating 
                                ? "bg-yellow-500 relative" 
                                : isCacheValid 
                                  ? "bg-green-500" 
                                  : "bg-blue-500",
                              // Quando fechada, centralizar com absolute
                              !(refreshing || cacheUpdating) && "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                            )}
                            style={{
                              width: "12px",
                              height: "12px",
                            }}
                          />
                          
                          {/* Texto - só aparece quando está atualizando com transição */}
                          {(refreshing || cacheUpdating) && (
                            <span 
                              className="text-xs font-medium whitespace-nowrap text-yellow-700 dark:text-yellow-300 ml-2 animate-fade-in"
                            >
                              Atualizando...
                            </span>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <div className="space-y-2">
                          <p className="font-semibold">💾 Indicador de Cache</p>
                          <p className="text-sm">
                            Mostra o estado atual do sistema de cache de pedidos.
                          </p>
                          <div className="text-sm space-y-2 mt-3">
                            <p className="font-medium">Significado das cores:</p>
                            <div className="space-y-1.5">
                              <div className="flex items-start gap-2">
                                <div className="w-3 h-3 rounded-full bg-green-500 shrink-0 mt-0.5" />
                                <span><strong>Verde:</strong> Dados carregados do cache local (carregamento rápido e instantâneo)</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0 mt-0.5" />
                                <span><strong>Azul:</strong> Dados carregados do banco de dados (sincronizando com servidor)</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <div className="w-3 h-3 rounded-full bg-yellow-500 shrink-0 mt-0.5" />
                                <span><strong>Amarelo:</strong> Sistema atualizando dados (manual ou automático)</span>
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mt-3">
                            O sistema atualiza automaticamente quando detecta mudanças nos pedidos. 
                            Use o botão <strong>"Atualizar"</strong> para forçar uma sincronização manual.
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {/* Botão de Refresh Manual */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleRefreshManual}
                        disabled={refreshing}
                        variant="outline"
                        size="sm"
                        className="gap-2 shadow-sm"
                      >
                        <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                        {refreshing ? "Atualizando..." : "Atualizar"}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <div className="space-y-2">
                        <p className="font-semibold">🔄 Atualizar Cache</p>
                        <p className="text-sm">
                          Força uma sincronização manual com o banco de dados, 
                          buscando as informações mais recentes de todos os pedidos.
                        </p>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p className="font-medium">Quando usar:</p>
                          <ul className="list-disc list-inside space-y-0.5 ml-2">
                            <li>Após mudanças feitas por outros usuários</li>
                            <li>Se suspeitar que os dados estão desatualizados</li>
                            <li>Quando precisar garantir informações em tempo real</li>
                          </ul>
                        </div>
                        <p className="text-xs text-muted-foreground italic">
                          Nota: O sistema já atualiza automaticamente quando detecta mudanças.
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>

                  <Button 
                    onClick={() => navigate("/loja/novo-pedido")}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-5 text-sm font-bold shadow-fellow-md rounded-xl"
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    NOVO PEDIDO
                  </Button>
                </div>
              </div>
            </div>
          </Tabs>
        </div>
      </main>

    </div>
  );
};

export default Inicio;
