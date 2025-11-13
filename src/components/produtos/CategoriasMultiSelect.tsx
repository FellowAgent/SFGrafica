import { UseFormReturn } from "react-hook-form";
import { Settings, X } from "lucide-react";
import { FormLabel } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCategorias } from "@/hooks/useCategorias";
import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface CategoriasMultiSelectProps {
  form: UseFormReturn<any>;
  onOpenCategoryManager: () => void;
}

export function CategoriasMultiSelect({ form, onOpenCategoryManager }: CategoriasMultiSelectProps) {
  const { categorias, fetchCategorias } = useCategorias();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
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

      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start text-left font-normal"
          >
            {selectedIds.length > 0 
              ? `${selectedIds.length} categoria(s) selecionada(s)` 
              : "Selecionar"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="max-h-80 overflow-y-auto p-4 space-y-2">
            {categoriasAchatadas.map((categoria) => (
              <div
                key={categoria.id}
                className="flex items-center space-x-2"
                style={{ paddingLeft: `${categoria.nivelIndentacao * 16}px` }}
              >
                <Checkbox
                  id={categoria.id}
                  checked={selectedIds.includes(categoria.id)}
                  onCheckedChange={() => handleToggle(categoria.id)}
                />
                <label
                  htmlFor={categoria.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                >
                  {categoria.nome}
                </label>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedIds.map((id) => (
            <Badge key={id} variant="secondary" className="gap-1">
              {getCategoriaNome(id)}
              <button
                type="button"
                onClick={() => handleRemove(id)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
