import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { TableRow, TableCell } from "@/components/ui/table";
import { CircularCheckbox } from "@/components/ui/circular-checkbox";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface SortableCategoriaRowProps {
  id: string;
  categoria: any;
  nivel: number;
  index: number;
  selectedItems: string[];
  expandedCategories: Set<string>;
  activeId?: string | null;
  onSelectItem: (id: string, checked: boolean) => void;
  onToggleExpansion: (id: string) => void;
  onEdit: (categoria: any) => void;
  onToggleStatus: (id: string, checked: boolean) => void;
  onAddSubcategory?: (categoriaPaiId: string) => void;
}

export function SortableCategoriaRow({
  id,
  categoria,
  nivel,
  index,
  selectedItems,
  expandedCategories,
  activeId,
  onSelectItem,
  onToggleExpansion,
  onEdit,
  onToggleStatus,
  onAddSubcategory,
}: SortableCategoriaRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const temSubcategorias = categoria.subcategorias && categoria.subcategorias.length > 0;
  const estaExpandido = expandedCategories.has(categoria.id);
  const paddingLeft = nivel * 32; // 32px por nível

  // Detectar se a categoria sobre a qual está passando é de nível diferente
  const isBeingDragged = activeId === categoria.id;

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative transition-all duration-200",
        index % 2 === 0 ? "bg-muted/20" : "",
        isDragging && "opacity-50 scale-[0.98] ring-2 ring-primary/50 shadow-lg",
        isOver && "bg-yellow-500/20 ring-2 ring-yellow-500/50",
        isBeingDragged && "bg-primary/5"
      )}
    >
      {/* Indicador visual de drop zone quando isOver */}
      {isOver && (
        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="absolute left-0 top-0 w-1 h-full bg-yellow-500 animate-pulse" />
          <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <span className="bg-yellow-500/90 text-yellow-950 px-3 py-1.5 rounded-md text-xs font-semibold shadow-lg">
              ⚠️ Tornar subcategoria? (Confirmar necessário)
            </span>
          </div>
        </div>
      )}
      
      {/* Ícone GripVertical - célula drag handle */}
      <TableCell className="w-10 px-2">
        <div
          className={cn(
            "flex items-center justify-center w-6 h-6 rounded",
            "opacity-0 group-hover:opacity-100 transition-all duration-200 ease-out",
            "cursor-grab active:cursor-grabbing",
            "bg-muted hover:bg-primary/10 hover:scale-110",
            "border border-transparent hover:border-primary/20",
            "shadow-sm hover:shadow-md"
          )}
          {...attributes}
          {...listeners}
        >
          <GripVertical className={cn(
            "h-4 w-4 text-muted-foreground transition-colors duration-200",
            "group-hover:text-primary"
          )} />
        </div>
      </TableCell>

      <TableCell className="w-12">
        <CircularCheckbox
          checked={selectedItems.includes(categoria.id)}
          onCheckedChange={(checked) => onSelectItem(categoria.id, checked as boolean)}
        />
      </TableCell>
      
      <TableCell>
        <div 
          className="flex items-center gap-2" 
          style={{ paddingLeft: `${paddingLeft}px` }}
        >
          {temSubcategorias ? (
            <button
              onClick={() => onToggleExpansion(categoria.id)}
              className="p-1 hover:bg-accent rounded transition-colors"
            >
              {estaExpandido ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          ) : (
            <div className="w-6" /> // Espaçador para alinhar com categorias que têm filhos
          )}
          <button
            onClick={() => onEdit(categoria)}
            className="font-bold hover:text-primary transition-colors text-left"
          >
            {categoria.nome}
          </button>
          {temSubcategorias && (
            <span className="text-xs text-muted-foreground">
              ({categoria.subcategorias.length})
            </span>
          )}
          
          {/* Botão para adicionar subcategoria */}
          {onAddSubcategory && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200",
                      "hover:bg-primary/10 hover:text-primary hover:scale-110"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddSubcategory(categoria.id);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  <p>Adicionar subcategoria de "{categoria.nome}"</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </TableCell>
      
      <TableCell>
        <div className="flex items-center justify-center gap-2">
          <Switch 
            checked={categoria.ativo}
            onCheckedChange={(checked) => onToggleStatus(categoria.id, checked)}
          />
          <span className={categoria.ativo ? "text-foreground" : "text-muted-foreground"}>
            {categoria.ativo ? "Ativo" : "Inativo"}
          </span>
        </div>
      </TableCell>
    </TableRow>
  );
}
