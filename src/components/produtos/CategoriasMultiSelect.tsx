import { UseFormReturn } from "react-hook-form";
import { Settings, X, Search, ChevronRight, FolderTree } from "lucide-react";
import { FormLabel } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCategorias } from "@/hooks/useCategorias";
import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface CategoriasMultiSelectProps {
  form: UseFormReturn<any>;
  onOpenCategoryManager: () => void;
}

export function CategoriasMultiSelect({ form, onOpenCategoryManager }: CategoriasMultiSelectProps) {
  const { categorias, fetchCategorias } = useCategorias();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Observar mudanças no formulário
  const categoriasIds = form.watch("categorias_ids");

  // Achatar hierarquia de categorias
  const achatarCategorias = (cats: any[], nivel = 0): any[] => {
    let resultado: any[] = [];
    cats.forEach(cat => {
      resultado.push({ ...cat, nivelIndentacao: nivel });
      if (cat.subcategorias && cat.subcategorias.length > 0) {
        resultado = resultado.concat(achatarCategorias(cat.subcategorias, nivel + 1));
      }
    });
    return resultado;
  };

  const categoriasAchatadas = achatarCategorias(categorias);

  // Filtrar categorias pela busca
  const categoriasFiltradas = categoriasAchatadas.filter(cat =>
    cat.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sincronizar com valores do formulário
  useEffect(() => {
    if (categoriasIds && Array.isArray(categoriasIds)) {
      setSelectedIds(categoriasIds);
      
      // Verificar se há IDs selecionados que não existem na lista atual
      const categoriasAtuaisIds = categoriasAchatadas.map(cat => cat.id);
      const hasNewCategories = categoriasIds.some(id => !categoriasAtuaisIds.includes(id));
      
      // Se houver categorias novas, recarregar a lista
      if (hasNewCategories && categoriasIds.length > 0) {
        fetchCategorias();
      }
    }
  }, [categoriasIds, fetchCategorias]);

  const handleToggle = (id: string) => {
    let newSelectedIds: string[];
    
    if (selectedIds.includes(id)) {
      // Se está desmarcando, remover apenas essa categoria
      newSelectedIds = selectedIds.filter(selectedId => selectedId !== id);
    } else {
      // Se está marcando, adicionar a categoria e todas as categorias pai
      const categoriasParaAdicionar = new Set(selectedIds);
      categoriasParaAdicionar.add(id);
      
      // Adicionar todas as categorias pai
      const categoria = categoriasAchatadas.find(cat => cat.id === id);
      if (categoria) {
        let categoriaAtual = categoria;
        while (categoriaAtual.categoria_pai_id) {
          categoriasParaAdicionar.add(categoriaAtual.categoria_pai_id);
          const pai = categoriasAchatadas.find(cat => cat.id === categoriaAtual.categoria_pai_id);
          if (!pai) break;
          categoriaAtual = pai;
        }
      }
      
      newSelectedIds = Array.from(categoriasParaAdicionar);
    }
    
    setSelectedIds(newSelectedIds);
    form.setValue("categorias_ids", newSelectedIds, { shouldValidate: true });
  };

  const handleRemove = (id: string) => {
    const newSelectedIds = selectedIds.filter(selectedId => selectedId !== id);
    setSelectedIds(newSelectedIds);
    form.setValue("categorias_ids", newSelectedIds, { shouldValidate: true });
  };

  const getCategoriaNome = (id: string) => {
    const categoria = categoriasAchatadas.find(cat => cat.id === id);
    if (!categoria) return "";
    
    // Construir hierarquia completa (ex: Panfleto > Branco > Claro)
    const hierarquia: string[] = [categoria.nome];
    let categoriaAtual = categoria;
    
    while (categoriaAtual.categoria_pai_id) {
      const pai = categoriasAchatadas.find(cat => cat.id === categoriaAtual.categoria_pai_id);
      if (!pai) break;
      hierarquia.unshift(pai.nome);
      categoriaAtual = pai;
    }
    
    return hierarquia.join(" > ");
  };

  const handleSave = () => {
    setOpen(false);
    setSearchTerm("");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <FormLabel>* Categoria(s):</FormLabel>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          title="Gerenciar categorias"
          onClick={onOpenCategoryManager}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between text-left font-normal hover:bg-muted/50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <FolderTree className="h-4 w-4 text-muted-foreground" />
              {selectedIds.length > 0 
                ? `${selectedIds.length} categoria(s) selecionada(s)` 
                : "Selecionar categorias"}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              Selecionar Categorias
            </DialogTitle>
            <DialogDescription>
              Selecione as categorias que este produto pertence. Você pode escolher múltiplas categorias.
            </DialogDescription>
          </DialogHeader>

          {/* Campo de busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Lista de categorias */}
          <ScrollArea className="h-[400px] pr-4">
            {categoriasFiltradas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FolderTree className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {searchTerm ? "Nenhuma categoria encontrada" : "Nenhuma categoria cadastrada"}
                </p>
                {!searchTerm && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => {
                      setOpen(false);
                      onOpenCategoryManager();
                    }}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Gerenciar Categorias
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {categoriasFiltradas.map((categoria) => {
                  const isSelected = selectedIds.includes(categoria.id);
                  const isParent = !categoria.categoria_pai_id;
                  
                  return (
                    <div
                      key={categoria.id}
                      className={cn(
                        "flex items-center space-x-3 rounded-md p-2.5 transition-all duration-200",
                        "hover:bg-muted/40 cursor-pointer",
                        isSelected && "bg-muted/60"
                      )}
                      style={{ paddingLeft: `${12 + categoria.nivelIndentacao * 24}px` }}
                      onClick={() => handleToggle(categoria.id)}
                    >
                      <Checkbox
                        id={categoria.id}
                        checked={isSelected}
                        onCheckedChange={() => handleToggle(categoria.id)}
                        className="cursor-pointer"
                      />
                      <label
                        htmlFor={categoria.id}
                        className="text-sm leading-none cursor-pointer flex-1 flex items-center gap-2"
                      >
                        {categoria.nivelIndentacao > 0 && (
                          <span className="text-muted-foreground/60 text-xs">└─</span>
                        )}
                        <span className={cn(
                          isParent && "font-semibold",
                          !isParent && "font-normal"
                        )}>
                          {categoria.nome}
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Footer com ações */}
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {selectedIds.length} categoria(s) selecionada(s)
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedIds([]);
                  form.setValue("categorias_ids", [], { shouldValidate: true });
                }}
                disabled={selectedIds.length === 0}
              >
                Limpar Tudo
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                size="sm"
              >
                Confirmar Seleção
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Badges das categorias selecionadas */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedIds.map((id) => {
            const nomeHierarquia = getCategoriaNome(id);
            return (
              <Badge 
                key={id} 
                variant="secondary" 
                className="gap-1.5 py-1 px-2.5 bg-muted hover:bg-muted/70 transition-colors border border-border/50"
              >
                <span className="text-xs text-foreground/80">{nomeHierarquia}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(id)}
                  className="ml-0.5 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={`Remover ${nomeHierarquia}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
