import { useState, useEffect } from "react";
import { Plus, Search, ChevronDown, ChevronRight, Pencil, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useCategorias } from "@/hooks/useCategorias";
import { ModalEditarCategoria } from "./ModalEditarCategoria";

interface CategoriasManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectCategory?: (categoriaId: string) => void;
  showSelectButton?: boolean;
}

export function CategoriasManagerModal({ 
  open, 
  onOpenChange, 
  onSelectCategory,
  showSelectButton = false 
}: CategoriasManagerModalProps) {
  const { categorias, fetchCategorias } = useCategorias();
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editandoCategoria, setEditandoCategoria] = useState<any>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Recarregar categorias quando o modal é aberto
  useEffect(() => {
    if (open) {
      fetchCategorias();
    }
  }, [open, fetchCategorias]);

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const handleAddCategory = () => {
    setEditandoCategoria(null);
    setShowForm(true);
  };

  const handleEditCategory = (categoria: any) => {
    setEditandoCategoria(categoria);
    setShowForm(true);
  };

  const handleFormSuccess = async () => {
    setShowForm(false);
    setEditandoCategoria(null);
    // Recarregar categorias após criar/editar
    await fetchCategorias();
  };

  const handleSelectCategory = () => {
    if (selectedCategoryId && onSelectCategory) {
      onSelectCategory(selectedCategoryId);
      onOpenChange(false);
    }
  };

  const renderCategoriaRow = (categoria: any, nivel: number = 0) => {
    const hasSubcategorias = categoria.subcategorias && categoria.subcategorias.length > 0;
    const isExpanded = expandedIds.has(categoria.id);
    const matchesSearch = categoria.nome.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch && search) return null;

    return (
      <>
        <TableRow 
          key={categoria.id} 
          className={`hover:bg-muted/50 ${showSelectButton && selectedCategoryId === categoria.id ? 'bg-primary/10' : ''}`}
        >
          <TableCell className="w-12">
            {hasSubcategorias && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => toggleExpanded(categoria.id)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            )}
          </TableCell>
          <TableCell 
            style={{ paddingLeft: `${nivel * 24 + 16}px` }}
            className={showSelectButton ? "cursor-pointer" : ""}
            onClick={() => showSelectButton && setSelectedCategoryId(categoria.id)}
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">{categoria.nome}</span>
              {!categoria.ativo && (
                <Badge variant="secondary" className="text-xs">
                  Inativa
                </Badge>
              )}
            </div>
          </TableCell>
          <TableCell className="text-muted-foreground">
            {categoria.descricao || "—"}
          </TableCell>
          <TableCell className="w-24">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleEditCategory(categoria)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </TableCell>
        </TableRow>
        {hasSubcategorias && isExpanded &&
          categoria.subcategorias.map((sub: any) => renderCategoriaRow(sub, nivel + 1))}
      </>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Gerenciar Categorias</DialogTitle>
            <DialogDescription>
              Adicione ou edite categorias de produtos
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-4 py-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar categoria..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
              {search && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearch("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Button onClick={handleAddCategory}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>
          </div>

          <div className="flex-1 overflow-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>
                    {showSelectButton ? "Nome (Clique para selecionar)" : "Nome"}
                  </TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categorias.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Nenhuma categoria cadastrada
                    </TableCell>
                  </TableRow>
                ) : (
                  categorias.map((categoria) => renderCategoriaRow(categoria))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            {showSelectButton && (
              <Button 
                onClick={handleSelectCategory}
                disabled={!selectedCategoryId}
              >
                Selecionar Categoria
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ModalEditarCategoria
        open={showForm}
        onOpenChange={setShowForm}
        onSuccess={handleFormSuccess}
        editandoCategoria={editandoCategoria}
      />
    </>
  );
}
