import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Plus, Search, ChevronDown, ChevronRight, X, Download, ChevronsDown, ChevronsUp, Trash2, GripVertical } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
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
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Sidebar from "@/components/layout/Sidebar";
import { useCategorias } from "@/hooks/useCategorias";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CircularCheckbox } from "@/components/ui/circular-checkbox";
import { ModalEditarCategoria } from "@/components/produtos/ModalEditarCategoria";
import { FiltrosAvancadosCategorias, FiltrosCategoria } from "@/components/produtos/FiltrosAvancadosCategorias";
import { VisualizacaoArvoreCategorias } from "@/components/produtos/VisualizacaoArvoreCategorias";
import { SortableCategoriaRow } from "@/components/produtos/SortableCategoriaRow";

const Categorias = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { categorias, loading, fetchCategorias, deleteCategoria, updateCategoria, reordenarCategoria } = useCategorias();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const modalFromUrl = searchParams.get("modal");
  const categoriaIdFromUrl = searchParams.get("categoriaId");
  const categoriaPaiIdFromUrl = searchParams.get("categoriaPaiId");
  const [showForm, setShowForm] = useState(modalFromUrl === "novo" || modalFromUrl === "editar");
  const [ordenacao, setOrdenacao] = useState("name-asc");
  const [editandoCategoria, setEditandoCategoria] = useState<any | undefined>();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragConfirmDialog, setDragConfirmDialog] = useState<{
    open: boolean;
    activeCategoria: any;
    overCategoria: any;
  }>({
    open: false,
    activeCategoria: null,
    overCategoria: null,
  });

  // Estado para filtros avançados
  const [filtrosAvancados, setFiltrosAvancados] = useState<FiltrosCategoria>({
    search: "",
    status: "all",
    nivel: "all",
    dataInicio: "",
    dataFim: "",
  });

  // Sensores para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 12,
        delay: 100,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Função auxiliar para achar categoria em qualquer nível da hierarquia
  const acharCategoria = (cats: any[], id: string): any | null => {
    for (const cat of cats) {
      if (cat.id === id) return cat;
      if (cat.subcategorias && cat.subcategorias.length > 0) {
        const encontrada = acharCategoria(cat.subcategorias, id);
        if (encontrada) return encontrada;
      }
    }
    return null;
  };

  // Sincronizar com URL params
  useEffect(() => {
    if (modalFromUrl === "novo" || modalFromUrl === "editar") {
      setShowForm(true);
      if (modalFromUrl === "editar" && categoriaIdFromUrl) {
        const categoria = acharCategoria(categorias, categoriaIdFromUrl);
        if (categoria) setEditandoCategoria(categoria);
      } else if (modalFromUrl === "novo" && categoriaPaiIdFromUrl) {
        // Criar nova subcategoria com categoria pai pré-selecionada
        setEditandoCategoria({
          id: undefined,
          nome: "",
          ativo: true,
          descricao: "",
          categoria_pai_id: categoriaPaiIdFromUrl,
          subcategorias: [],
        });
      } else {
        setEditandoCategoria(undefined);
      }
    } else {
      setShowForm(false);
      setEditandoCategoria(undefined);
    }
  }, [modalFromUrl, categoriaIdFromUrl, categoriaPaiIdFromUrl, categorias]);

  const handleEditarCategoria = (categoria: any) => {
    navigate(`/produtos/categorias?modal=editar&categoriaId=${categoria.id}`);
  };

  const handleAbrirNovaCategoria = () => {
    navigate("/produtos/categorias?modal=novo");
  };

  const handleAbrirNovaSubcategoria = (categoriaPaiId: string) => {
    const categoria = acharCategoria(categorias, categoriaPaiId);
    if (categoria) {
      // Navegar com o ID da categoria pai na URL para preservar a informação
      navigate(`/produtos/categorias?modal=novo&categoriaPaiId=${categoriaPaiId}`);
    }
  };

  const handleFecharModal = () => {
    navigate("/produtos/categorias", { replace: true });
    setShowForm(false);
    setEditandoCategoria(undefined);
    fetchCategorias();
  };

  const handleEditarSelecionadas = () => {
    if (selectedItems.length === 1) {
      const categoria = categoriasAchatadas.find(c => c.id === selectedItems[0]);
      if (categoria) {
        handleEditarCategoria(categoria);
      }
    } else {
      toast({
        title: "Selecione apenas uma categoria",
        description: "Para editar, selecione somente uma categoria por vez.",
        variant: "destructive",
      });
    }
  };

  const handleDeletarSelecionadas = () => {
    if (selectedItems.length === 0) return;
    setShowDeleteDialog(true);
  };

  const confirmarDelecao = async () => {
    try {
      for (const id of selectedItems) {
        await deleteCategoria(id);
      }
      setSelectedItems([]);
      setShowDeleteDialog(false);
      toast({
        title: "Categorias excluídas!",
        description: `${selectedItems.length} categoria(s) foram excluídas com sucesso.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao excluir categorias",
        description: "Algumas categorias não puderam ser excluídas.",
        variant: "destructive",
      });
    }
  };

  const handleExportarSelecionadas = () => {
    if (selectedItems.length === 0) {
      toast({
        title: "Nenhuma categoria selecionada",
        description: "Selecione pelo menos uma categoria para exportar.",
        variant: "destructive",
      });
      return;
    }

    const categoriasParaExportar = categoriasAchatadas.filter(c => 
      selectedItems.includes(c.id)
    );

    const dadosExportacao = categoriasParaExportar.map(cat => ({
      Nome: cat.nome,
      Descrição: cat.descricao || '',
      Status: cat.ativo ? 'Ativo' : 'Inativo',
      'Criado em': new Date(cat.created_at).toLocaleDateString('pt-BR'),
    }));

    // Converter para CSV
    const headers = Object.keys(dadosExportacao[0]).join(',');
    const rows = dadosExportacao.map(obj => 
      Object.values(obj).map(val => `"${val}"`).join(',')
    );
    const csv = [headers, ...rows].join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `categorias_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Exportação concluída!",
      description: `${selectedItems.length} categoria(s) foram exportadas.`,
    });
  };

  const handleToggleStatus = async (id: string, ativo: boolean) => {
    await updateCategoria(id, { ativo });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(categoriasAchatadas.map((c) => c.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, id]);
    } else {
      setSelectedItems(selectedItems.filter((item) => item !== id));
    }
  };

  const toggleCategoryExpansion = (id: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleAllCategories = () => {
    if (allExpanded) {
      setExpandedCategories(new Set());
      setAllExpanded(false);
    } else {
      const todasIds = new Set<string>();
      const coletarIds = (cats: any[]) => {
        cats.forEach(cat => {
          todasIds.add(cat.id);
          if (cat.subcategorias && cat.subcategorias.length > 0) {
            coletarIds(cat.subcategorias);
          }
        });
      };
      coletarIds(categorias);
      setExpandedCategories(todasIds);
      setAllExpanded(true);
    }
  };

  // Achatar hierarquia para filtrar e ordenar
  const achatarCategorias = (cats: any[]): any[] => {
    let resultado: any[] = [];
    cats.forEach(cat => {
      resultado.push(cat);
      if (cat.subcategorias && cat.subcategorias.length > 0) {
        resultado = resultado.concat(achatarCategorias(cat.subcategorias));
      }
    });
    return resultado;
  };

  // Ordenar categorias recursivamente mantendo a hierarquia
  const ordenarCategoriasRecursivo = (cats: any[]): any[] => {
    const ordenadas = [...cats].sort((a, b) => {
      if (ordenacao === "name-asc") {
        return a.nome.localeCompare(b.nome);
      } else if (ordenacao === "name-desc") {
        return b.nome.localeCompare(a.nome);
      }
      return 0;
    });

    return ordenadas.map(cat => ({
      ...cat,
      subcategorias: cat.subcategorias && cat.subcategorias.length > 0
        ? ordenarCategoriasRecursivo(cat.subcategorias)
        : cat.subcategorias
    }));
  };

  // Processar categorias: aplicar ordenação
  const categoriasProcessadas = useMemo(() => {
    return ordenarCategoriasRecursivo(categorias);
  }, [categorias, ordenacao]);

  const categoriasAchatadas = achatarCategorias(categoriasProcessadas);

  // Handlers de Drag and Drop
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    // NOVO: Verificar se foi solta na zona raiz
    if (over.id === "drop-zone-root") {
      const activeCategoria = acharCategoria(categorias, active.id as string);
      
      if (!activeCategoria) return;
      
      // Se já é categoria raiz, apenas reordenar
      if (!activeCategoria.categoria_pai_id) {
        toast({
          title: "Já é categoria raiz ℹ️",
          description: `"${activeCategoria.nome}" já está no nível raiz.`,
          duration: 2000,
        });
        return;
      }
      
      // Confirmar antes de tornar categoria raiz
      setDragConfirmDialog({
        open: true,
        activeCategoria,
        overCategoria: null, // null = tornar raiz
      });
      return;
    }

    if (active.id === over.id) return;

    // Encontrar as categorias sendo arrastadas
    const activeCategoria = acharCategoria(categorias, active.id as string);
    const overCategoria = acharCategoria(categorias, over.id as string);

    if (!activeCategoria || !overCategoria) return;

    // Verificar se está tentando mover para dentro de si mesmo ou de uma subcategoria
    const isMovingToChild = (cat: any, targetId: string): boolean => {
      if (cat.id === targetId) return true;
      if (cat.subcategorias) {
        return cat.subcategorias.some((sub: any) => isMovingToChild(sub, targetId));
      }
      return false;
    };

    if (isMovingToChild(activeCategoria, overCategoria.id)) {
      toast({
        title: "Movimento inválido ⚠️",
        description: "Não é possível mover uma categoria para dentro de si mesma ou de suas subcategorias.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    // NOVA LÓGICA: Verificar se mesma categoria pai (reordenar) ou diferente (mover)
    const mesmoNivel = activeCategoria.categoria_pai_id === overCategoria.categoria_pai_id;
    
    if (mesmoNivel) {
      // Reordenar no mesmo nível - apenas trocar posições (sem mudar hierarquia)
      toast({
        title: "Reordenação realizada! ✓",
        description: `"${activeCategoria.nome}" foi reordenada.`,
        duration: 2000,
      });
      // Apenas recarregar - backend manterá mesma hierarquia
      await fetchCategorias();
    } else {
      // Níveis diferentes - confirmar se quer tornar subcategoria
      setDragConfirmDialog({
        open: true,
        activeCategoria,
        overCategoria,
      });
    }
  };

  const confirmarMovimentoCategoria = async () => {
    const { activeCategoria, overCategoria } = dragConfirmDialog;
    
    if (!activeCategoria) return;

    // NOVO: Se overCategoria é null, tornar categoria raiz
    if (!overCategoria) {
      await reordenarCategoria(activeCategoria.id, null);
      
      toast({
        title: "Categoria movida para raiz! ✓",
        description: `"${activeCategoria.nome}" agora é uma categoria raiz (sem categoria pai)`,
        duration: 2500,
      });
    } else {
      // Lógica existente: tornar subcategoria
      await reordenarCategoria(activeCategoria.id, overCategoria.id);
      
      toast({
        title: "Hierarquia atualizada! ✓",
        description: `"${activeCategoria.nome}" agora é subcategoria de "${overCategoria.nome}"`,
        duration: 2500,
      });
    }

    setDragConfirmDialog({ open: false, activeCategoria: null, overCategoria: null });
  };
  // Componente para zona de drop raiz
  const DroppableRootZone = ({ activeId }: { activeId: string | null }) => {
    const { setNodeRef, isOver } = useSortable({ id: "drop-zone-root" });
    
    return (
      <tr 
        ref={setNodeRef}
        className={cn(
          "transition-all duration-200",
          activeId ? "h-12" : "h-0",
          isOver && "bg-blue-500/20 ring-2 ring-blue-500 ring-inset"
        )}
      >
        <td colSpan={4} className="text-center">
          {activeId && (
            <div className="flex items-center justify-center gap-2 py-2">
              <ChevronsUp className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-blue-500 font-medium">
                Solte aqui para tornar categoria raiz
              </span>
            </div>
          )}
        </td>
      </tr>
    );
  };

  const renderCategoriaRow = (categoria: any, nivel: number = 0, index: number = 0) => {
    return (
      <SortableCategoriaRow
        key={categoria.id}
        id={categoria.id}
        categoria={categoria}
        nivel={nivel}
        index={index}
        selectedItems={selectedItems}
        expandedCategories={expandedCategories}
        activeId={activeId}
        onSelectItem={handleSelectItem}
        onToggleExpansion={toggleCategoryExpansion}
        onEdit={handleEditarCategoria}
        onToggleStatus={handleToggleStatus}
        onAddSubcategory={handleAbrirNovaSubcategoria}
      />
    );
  };

  // Renderizar categoria e suas subcategorias recursivamente
  const renderCategoriasComHierarquia = (cats: any[], nivel: number = 0): JSX.Element[] => {
    let elementos: JSX.Element[] = [];
    cats.forEach((cat, idx) => {
      // Verificar se a categoria deve ser exibida (filtros)
      const matchSearch = cat.nome.toLowerCase().includes(filtrosAvancados.search.toLowerCase());
      const matchStatus = 
        filtrosAvancados.status === "all" ? true :
        filtrosAvancados.status === "active" ? cat.ativo :
        !cat.ativo;
      const matchNivel = 
        filtrosAvancados.nivel === "all" ? true :
        cat.nivel?.toString() === filtrosAvancados.nivel;
      
      // Filtro por data
      let matchData = true;
      if (filtrosAvancados.dataInicio || filtrosAvancados.dataFim) {
        const catDate = new Date(cat.created_at);
        if (filtrosAvancados.dataInicio) {
          const startDate = new Date(filtrosAvancados.dataInicio);
          matchData = matchData && catDate >= startDate;
        }
        if (filtrosAvancados.dataFim) {
          const endDate = new Date(filtrosAvancados.dataFim);
          endDate.setHours(23, 59, 59, 999); // Incluir o dia inteiro
          matchData = matchData && catDate <= endDate;
        }
      }

      if (matchSearch && matchStatus && matchNivel && matchData) {
        elementos.push(renderCategoriaRow(cat, nivel, elementos.length));
      }

      // Renderizar subcategorias apenas se a categoria pai está expandida
      const estaExpandido = expandedCategories.has(cat.id);
      if (estaExpandido && cat.subcategorias && cat.subcategorias.length > 0) {
        elementos = elementos.concat(renderCategoriasComHierarquia(cat.subcategorias, nivel + 1));
      }
    });
    return elementos;
  };

  // Calcular nível máximo para filtros
  const calcularNivelMaximo = (cats: any[]): number => {
    let max = 0;
    cats.forEach(cat => {
      if (cat.nivel && cat.nivel > max) max = cat.nivel;
      if (cat.subcategorias && cat.subcategorias.length > 0) {
        const subMax = calcularNivelMaximo(cat.subcategorias);
        if (subMax > max) max = subMax;
      }
    });
    return max;
  };

  const nivelMaximo = calcularNivelMaximo(categoriasProcessadas);

  return (
    <>
      <Sidebar type="loja" />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex-shrink-0 px-8 pt-8 pb-4 bg-background">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Categorias</h1>
              </div>
              <Button onClick={handleAbrirNovaCategoria} variant="add" className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Categoria
              </Button>
            </div>

            {/* Search and Filters */}
            <div className="bg-card rounded-2xl border border-border shadow-fellow-md p-4">
              <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar categorias..."
                value={filtrosAvancados.search}
                onChange={(e) => setFiltrosAvancados({ ...filtrosAvancados, search: e.target.value })}
                className="pl-10 pr-10"
              />
              {filtrosAvancados.search && (
                <button
                  onClick={() => setFiltrosAvancados({ ...filtrosAvancados, search: "" })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <Select value={ordenacao} onValueChange={setOrdenacao}>
              <SelectTrigger 
                className="w-[180px]"
                showClear={ordenacao !== "name-asc"}
                onClear={() => setOrdenacao("name-asc")}
              >
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">A&gt;Z - Crescente</SelectItem>
                <SelectItem value="name-desc">Z&gt;A - Decrescente</SelectItem>
              </SelectContent>
            </Select>

                <div className="flex gap-2">
                  <FiltrosAvancadosCategorias
                    filtros={filtrosAvancados}
                    onFiltrosChange={setFiltrosAvancados}
                    nivelMaximo={nivelMaximo}
                  />
                  <VisualizacaoArvoreCategorias categorias={categoriasProcessadas} />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleAllCategories}
                    title={allExpanded ? "Recolher Todas" : "Expandir Todas"}
                  >
                    {allExpanded ? <ChevronsUp className="h-4 w-4" /> : <ChevronsDown className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            {selectedItems.length > 0 && (
              <div className="flex flex-wrap gap-2 p-4 bg-card rounded-lg border border-border mt-4">
                <span className="text-sm text-muted-foreground self-center mr-2">
                  {selectedItems.length} selecionada(s)
                </span>
                <Button variant="outline" size="sm" className="gap-2" onClick={handleEditarSelecionadas}>
                  Editar
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={handleDeletarSelecionadas}>
                  Deletar
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={handleExportarSelecionadas}>
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-auto px-8 pb-8">
          <div className="max-w-7xl mx-auto">
            {/* Category List */}
            <div className="rounded-2xl border bg-card shadow-fellow-md">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 px-2"></TableHead>
                      <TableHead className="w-12">
                        <CircularCheckbox
                          checked={selectedItems.length === categoriasAchatadas.length && categoriasAchatadas.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <SortableContext
                    items={["drop-zone-root", ...categoriasAchatadas.map(c => c.id)]}
                    strategy={verticalListSortingStrategy}
                  >
                    <TableBody>
                      <DroppableRootZone activeId={activeId} />
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8">
                            Carregando categorias...
                          </TableCell>
                        </TableRow>
                      ) : categorias.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8">
                            Nenhuma categoria encontrada
                          </TableCell>
                        </TableRow>
                      ) : (
                        renderCategoriasComHierarquia(categoriasProcessadas)
                      )}
                    </TableBody>
                  </SortableContext>
                </Table>
                <DragOverlay>
                  {activeId ? (
                    <div className="bg-card border-2 border-primary rounded-lg shadow-2xl max-w-xs">
                      <div className="flex items-center gap-2 px-3 py-2">
                        <GripVertical className="h-4 w-4 text-primary flex-shrink-0" />
                        <div className="font-semibold text-foreground text-sm truncate">
                          {acharCategoria(categorias, activeId)?.nome}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          </div>
        </div>
      </main>

      <ModalEditarCategoria
        open={showForm}
        onOpenChange={(open) => {
          if (!open) handleFecharModal();
        }}
        onSuccess={handleFecharModal}
        editandoCategoria={editandoCategoria}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-2">
              Você está prestes a excluir <strong>{selectedItems.length}</strong> {selectedItems.length === 1 ? 'categoria' : 'categorias'}.
              <br />
              <br />
              Esta ação é <strong>irreversível</strong> e todos os dados relacionados serão perdidos permanentemente.
              <br />
              <br />
              Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarDelecao}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir {selectedItems.length === 1 ? 'Categoria' : 'Categorias'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmação para mudança de hierarquia */}
      <AlertDialog 
        open={dragConfirmDialog.open} 
        onOpenChange={(open) => {
          if (!open) {
            setDragConfirmDialog({ open: false, activeCategoria: null, overCategoria: null });
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <GripVertical className="h-5 w-5 text-yellow-500" />
              Confirmar mudança de hierarquia
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              <div className="bg-muted/50 p-3 rounded-lg">
                {dragConfirmDialog.overCategoria ? (
                  <p className="text-sm">
                    Você está movendo <strong className="text-foreground">"{dragConfirmDialog.activeCategoria?.nome}"</strong> para dentro de <strong className="text-foreground">"{dragConfirmDialog.overCategoria?.nome}"</strong>.
                  </p>
                ) : (
                  <p className="text-sm">
                    Você está movendo <strong className="text-foreground">"{dragConfirmDialog.activeCategoria?.nome}"</strong> para o <strong className="text-foreground">nível raiz</strong> (sem categoria pai).
                  </p>
                )}
              </div>
              
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <div className="mt-0.5">ℹ️</div>
                <div>
                  {dragConfirmDialog.overCategoria ? (
                    <>Esta ação irá tornar "{dragConfirmDialog.activeCategoria?.nome}" uma <strong>subcategoria</strong> de "{dragConfirmDialog.overCategoria?.nome}".</>
                  ) : (
                    <>Esta ação irá tornar "{dragConfirmDialog.activeCategoria?.nome}" uma <strong>categoria raiz</strong> (nível 0).</>
                  )}
                </div>
              </div>

              <p className="text-sm font-medium">Deseja continuar?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmarMovimentoCategoria}
              className="bg-primary hover:bg-primary/90"
            >
              Confirmar movimento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Categorias;
