import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Plus, Search, Grid3x3, List, Download, X } from "lucide-react";
import { toast } from "@/utils/toastHelper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Sidebar from "@/components/layout/Sidebar";
import { useProdutos } from "@/hooks/useProdutos";
import { useCategorias } from "@/hooks/useCategorias";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { TableSkeleton, ProductCardSkeleton } from "@/components/ui/skeleton-loaders";
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
import { Switch } from "@/components/ui/switch";
import { CircularCheckbox } from "@/components/ui/circular-checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProductImageDisplay } from "@/components/produtos/ProductImageDisplay";
import { ModalEditarProduto } from "@/components/produtos/ModalEditarProduto";
import { useUserProfile } from "@/hooks/useUserProfile";

const Produtos = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { produtos, loading, fetchProdutos, toggleStatus, deleteProduto } = useProdutos();
  const { categorias } = useCategorias();
  const { userProfile, updateProfile } = useUserProfile();
  const [view, setView] = useState<"list" | "grid" | "variations">("list");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 300);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const modalFromUrl = searchParams.get("modal");
  const produtoIdFromUrl = searchParams.get("produtoId");
  const [showForm, setShowForm] = useState(modalFromUrl === "novo" || modalFromUrl === "editar");
  const [editandoProduto, setEditandoProduto] = useState<any | null>(null);
  const [filtroStatus, setFiltroStatus] = useState("all");
  const [filtroCategoria, setFiltroCategoria] = useState("all");
  const [ordenacao, setOrdenacao] = useState("name-asc");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Carregar preferências do perfil
  useEffect(() => {
    if (userProfile) {
      // Carregar preferência de paginação
      if (userProfile.preferencias_produtos_paginacao) {
        const paginacao = userProfile.preferencias_produtos_paginacao as any;
        if (paginacao?.pageSize) {
          setPageSize(paginacao.pageSize);
        }
      }
    }
  }, [userProfile]);

  // Sincronizar com URL params
  useEffect(() => {
    if (modalFromUrl === "novo" || modalFromUrl === "editar") {
      setShowForm(true);
      if (modalFromUrl === "editar" && produtoIdFromUrl) {
        const produto = produtos.find(p => p.id === produtoIdFromUrl);
        if (produto) setEditandoProduto(produto);
      }
    } else {
      setShowForm(false);
      setEditandoProduto(null);
    }
  }, [modalFromUrl, produtoIdFromUrl, produtos]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(produtos.map((p) => p.id));
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

  const handleEditarProduto = (produto: any) => {
    navigate(`/produtos?modal=editar&produtoId=${produto.id}`);
  };

  const handleAbrirNovoProduto = () => {
    // Limpar quaisquer imagens residuais do localStorage para novo produto
    localStorage.removeItem('produto-form-images-novo');
    localStorage.removeItem('produto-form-autosave-novo');
    localStorage.removeItem('produto-form-variacoes-autosave');
    console.log('🧹 localStorage limpo para novo produto');
    navigate("/produtos?modal=novo");
  };

  const handleFecharModal = () => {
    navigate("/produtos", { replace: true });
    setShowForm(false);
    setEditandoProduto(null);
    fetchProdutos();
  };

  const handleToggleStatus = async (id: string, novoStatus: boolean) => {
    await toggleStatus(id, novoStatus);
  };

  const handleDeletarSelecionados = async () => {
    if (selectedItems.length === 0) return;
    setShowDeleteDialog(true);
  };

  const confirmarExclusao = async () => {
    for (const id of selectedItems) {
      await deleteProduto(id);
    }
    setSelectedItems([]);
    setShowDeleteDialog(false);
  };

  const handleEditarSelecionado = () => {
    if (selectedItems.length !== 1) {
      toast.error("Selecione apenas um produto para editar");
      return;
    }
    
    const produto = produtos.find(p => p.id === selectedItems[0]);
    if (produto) {
      handleEditarProduto(produto);
    }
  };

  const handleExportar = () => {
    if (selectedItems.length === 0) {
      toast.error("Selecione produtos para exportar");
      return;
    }

    const produtosSelecionados = produtos.filter(p => selectedItems.includes(p.id));
    
    // Criar CSV
    const headers = ["Nome", "Código", "Categoria", "Preço", "Estoque", "Status"];
    const rows = produtosSelecionados.map(p => [
      p.nome,
      p.codigo_barras || "",
      p.produtos_categorias?.[0]?.categorias?.nome || "",
      p.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      p.estoque,
      p.ativo ? "Ativo" : "Inativo"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    // Download do arquivo
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `produtos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`${selectedItems.length} produto(s) exportado(s)`);
  };

  // Função para achatar todas as categorias (incluindo subcategorias) em uma lista plana
  const acharTodasCategorias = (cats: any[]): any[] => {
    let resultado: any[] = [];
    
    cats.forEach(cat => {
      resultado.push(cat);
      if (cat.subcategorias && cat.subcategorias.length > 0) {
        resultado = [...resultado, ...acharTodasCategorias(cat.subcategorias)];
      }
    });
    
    return resultado;
  };

  // Função para obter todas as subcategorias de uma categoria (recursivamente)
  const obterTodasSubcategorias = (categoriaId: string): string[] => {
    const todasCategorias = acharTodasCategorias(categorias);
    const categoria = todasCategorias.find(c => c.id === categoriaId);
    
    if (!categoria) return [categoriaId];
    
    let subcategorias = [categoriaId];
    
    if (categoria.subcategorias && categoria.subcategorias.length > 0) {
      categoria.subcategorias.forEach((sub: any) => {
        subcategorias = [...subcategorias, ...obterTodasSubcategorias(sub.id)];
      });
    }
    
    return subcategorias;
  };

  // Função auxiliar para verificar se produto pertence a uma categoria ou suas subcategorias
  const produtoPertenceCategoria = (produto: any, categoriaId: string): boolean => {
    // Obter todas as subcategorias da categoria selecionada
    const categoriasPermitidas = obterTodasSubcategorias(categoriaId);
    
    // Verifica se o produto tem a categoria principal
    if (produto.categoria_id && categoriasPermitidas.includes(produto.categoria_id)) {
      return true;
    }
    
    // Verifica em produtos_categorias
    if (produto.produtos_categorias && produto.produtos_categorias.length > 0) {
      return produto.produtos_categorias.some((pc: any) => {
        // A estrutura é produtos_categorias -> categorias (objeto) -> id
        const catId = pc.categorias?.id || pc.categoria_id;
        return categoriasPermitidas.includes(catId);
      });
    }
    
    return false;
  };

  // Filtrar e ordenar produtos
  const produtosFiltrados = produtos
    .filter((produto) => {
      // Filtro de busca
      const matchSearch = produto.nome.toLowerCase().includes(search.toLowerCase()) ||
        produto.codigo_barras?.toLowerCase().includes(search.toLowerCase());
      
      // Filtro de status
      const matchStatus = filtroStatus === "all" || 
        (filtroStatus === "ativo" && produto.ativo) ||
        (filtroStatus === "inativo" && !produto.ativo);
      
      // Filtro de categoria
      const matchCategoria = filtroCategoria === "all" || 
        produtoPertenceCategoria(produto, filtroCategoria);
      
      return matchSearch && matchStatus && matchCategoria;
    })
    .sort((a, b) => {
      if (ordenacao === "name-asc") {
        return a.nome.localeCompare(b.nome);
      } else if (ordenacao === "name-desc") {
        return b.nome.localeCompare(a.nome);
      }
      return 0;
    });

  // Calcular paginação
  const totalCount = produtosFiltrados.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const produtosPaginados = produtosFiltrados.slice(startIndex, endIndex);

  // Resetar para página 1 quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filtroStatus, filtroCategoria]);

  return (
    <>
      <Sidebar type="loja" />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex-shrink-0 px-8 pt-8 pb-4 bg-background">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Produtos</h1>
              </div>
              <Button onClick={handleAbrirNovoProduto} variant="add" className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Produto
              </Button>
            </div>

            {/* Search and Filters */}
            <div className="bg-card rounded-2xl border border-border shadow-fellow-md p-4">
              <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar produtos..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            
            <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
              <SelectTrigger 
                className="w-[220px]"
                showClear={filtroCategoria !== "all"}
                onClear={() => setFiltroCategoria("all")}
              >
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent className="bg-popover max-h-[300px]">
                <SelectItem value="all">Todas as Categorias</SelectItem>
                {categorias.map((categoria) => {
                  const renderCategoria = (cat: any, nivel: number = 0): JSX.Element => {
                    const prefixo = "  ".repeat(nivel) + (nivel > 0 ? "└─ " : "");
                    
                    return (
                      <React.Fragment key={cat.id}>
                        <SelectItem value={cat.id} className={nivel > 0 ? `pl-${4 + nivel * 4}` : ""}>
                          {prefixo}{cat.nome}
                        </SelectItem>
                        {cat.subcategorias && cat.subcategorias.length > 0 && 
                          cat.subcategorias.map((sub: any) => renderCategoria(sub, nivel + 1))
                        }
                      </React.Fragment>
                    );
                  };
                  
                  return renderCategoria(categoria);
                })}
              </SelectContent>
            </Select>

            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger 
                className="w-[180px]"
                showClear={filtroStatus !== "all"}
                onClear={() => setFiltroStatus("all")}
              >
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="inativo">Inativos</SelectItem>
              </SelectContent>
            </Select>

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

            <div className="flex gap-2 ml-auto">
              <Button
                variant={view === "list" ? "viewActive" : "viewInactive"}
                size="icon"
                onClick={() => setView("list")}
                title="Visualização em Lista"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={view === "grid" ? "viewActive" : "viewInactive"}
                size="icon"
                onClick={() => setView("grid")}
                title="Visualização em Grid"
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
            </div>
              </div>
            </div>

            {/* Actions Bar */}
            {selectedItems.length > 0 && (
              <div className="flex flex-wrap gap-2 p-4 bg-card rounded-lg border border-border mt-4">
                <Button variant="outline" size="sm" className="gap-2" onClick={handleEditarSelecionado}>
                  Editar
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={handleDeletarSelecionados}>
                  Deletar
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={handleExportar}>
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
            {loading ? (
              view === "list" ? (
                <TableSkeleton rows={10} columns={7} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </div>
              )
            ) : (
              <>
                {/* Table View */}
                {view === "list" && (
                <div className="rounded-lg border bg-card shadow-fellow-md animate-fade-in">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <CircularCheckbox
                            checked={selectedItems.length === produtosFiltrados.length && produtosFiltrados.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead className="w-16">Foto</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead>Preço</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {produtosPaginados.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 animate-fade-in">
                            Nenhum produto encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        produtosPaginados.map((produto, index) => (
                        <TableRow
                          key={produto.id}
                          className={`${index % 2 === 0 ? "bg-muted/20" : ""} animate-fade-in`}
                          style={{ animationDelay: `${Math.min(index * 0.03, 0.5)}s` }}
                        >
                          <TableCell>
                            <CircularCheckbox
                              checked={selectedItems.includes(produto.id)}
                              onCheckedChange={(checked) =>
                                handleSelectItem(produto.id, checked as boolean)
                              }
                            />
                          </TableCell>
                          <TableCell className="py-2">
                            <ProductImageDisplay 
                              produto={produto} 
                              size="sm"
                              showImageCount={true}
                            />
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => handleEditarProduto(produto)}
                              className="font-bold hover:text-primary transition-colors text-left"
                            >
                              {produto.nome}
                            </button>
                          </TableCell>
                          <TableCell>
                            {produto.produtos_categorias && produto.produtos_categorias.length > 0 ? (
                              <div className="relative group">
                                {/* Primeira categoria com hierarquia completa */}
                                <div className="flex items-center gap-1">
                                  {(() => {
                                    const cat = produto.produtos_categorias[0].categorias;
                                    const hierarquia: string[] = [cat.nome];
                                    let categoriaAtual = cat;
                                    
                                    // Percorrer toda a hierarquia
                                    while (categoriaAtual?.categorias) {
                                      hierarquia.unshift(categoriaAtual.categorias.nome);
                                      categoriaAtual = categoriaAtual.categorias;
                                    }
                                    
                                    return (
                                      <span className="text-xs">
                                        {hierarquia.join(" > ")}
                                      </span>
                                    );
                                  })()}
                                  {produto.produtos_categorias.length > 1 && (
                                    <span className="text-xs text-muted-foreground ml-1">
                                      +{produto.produtos_categorias.length - 1}
                                    </span>
                                  )}
                                </div>
                                
                                {/* Tooltip com todas as outras categorias ao passar o mouse */}
                                {produto.produtos_categorias.length > 1 && (
                                  <div className="absolute left-0 top-full mt-1 z-50 hidden group-hover:block bg-popover border border-border rounded-md shadow-md p-2 min-w-[200px] max-w-[300px]">
                                    {produto.produtos_categorias.slice(1).map((pc: any, idx: number) => {
                                      const cat = pc.categorias;
                                      const hierarquia: string[] = [cat.nome];
                                      let categoriaAtual = cat;
                                      
                                      // Percorrer toda a hierarquia
                                      while (categoriaAtual?.categorias) {
                                        hierarquia.unshift(categoriaAtual.categorias.nome);
                                        categoriaAtual = categoriaAtual.categorias;
                                      }
                                      
                                      return (
                                        <div key={idx} className="py-1 text-xs border-b border-border last:border-0">
                                          {hierarquia.join(" > ")}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{produto.codigo_barras || '-'}</TableCell>
                          <TableCell className="font-semibold">
                            {produto.preco.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <Switch 
                                checked={produto.ativo}
                                onCheckedChange={(checked) => handleToggleStatus(produto.id, checked)}
                              />
                              <span className="text-sm text-muted-foreground">
                                {produto.ativo ? "Ativo" : "Inativo"}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

          {/* Grid View */}
          {view === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {produtosPaginados.length === 0 ? (
                <div className="col-span-full text-center py-8 animate-fade-in">
                  Nenhum produto encontrado
                </div>
              ) : (
                produtosPaginados.map((produto, index) => (
                <div
                  key={produto.id}
                  className="rounded-lg border bg-card shadow-fellow-md hover:shadow-fellow-lg transition-all card-hover overflow-hidden animate-fade-in"
                  style={{ animationDelay: `${Math.min(index * 0.05, 0.8)}s` }}
                >
                  <div className="aspect-square bg-accent/20 overflow-hidden relative">
                    <ProductImageDisplay 
                      produto={produto} 
                      size="full"
                      showImageCount={true}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold line-clamp-2">{produto.nome}</h3>
                      </div>
                      <CircularCheckbox
                        checked={selectedItems.includes(produto.id)}
                        onCheckedChange={(checked) =>
                          handleSelectItem(produto.id, checked as boolean)
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{produto.codigo_barras || '-'}</p>
                        <p className="font-bold">
                          {produto.preco.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </p>
                      </div>
                      <Switch 
                        checked={produto.ativo}
                        onCheckedChange={(checked) => handleToggleStatus(produto.id, checked)}
                      />
                    </div>
                  </div>
                </div>
                ))
              )}
            </div>
          )}

          {/* Rodapé de Paginação */}
          {!loading && produtosFiltrados.length > 0 && (
            <div className="mt-6 px-4 py-3 bg-card rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Mostrando {startIndex + 1} até {Math.min(endIndex, totalCount)} de {totalCount} produtos
                </div>
                
                <div className="flex items-center gap-3">
                  <Select value={pageSize.toString()} onValueChange={async (v) => {
                    const newPageSize = Number(v);
                    setPageSize(newPageSize);
                    setCurrentPage(1);
                    
                    // Salvar preferência de paginação
                    try {
                      await updateProfile({
                        preferencias_produtos_paginacao: {
                          pageSize: newPageSize
                        }
                      });
                    } catch (error) {
                      console.error('Erro ao salvar preferência de paginação:', error);
                    }
                  }}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 por página</SelectItem>
                      <SelectItem value="25">25 por página</SelectItem>
                      <SelectItem value="50">50 por página</SelectItem>
                      <SelectItem value="100">100 por página</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      Primeira
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    
                    <div className="px-3 py-1 text-sm">
                      Página {currentPage} de {totalPages}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Próxima
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      Última
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
              </>
            )}
          </div>
        </div>
      </main>

      <ModalEditarProduto 
        open={showForm}
        onOpenChange={(open) => {
          if (!open) handleFecharModal();
        }}
        editandoProduto={editandoProduto}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedItems.length} produto(s)?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarExclusao}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Produtos;
