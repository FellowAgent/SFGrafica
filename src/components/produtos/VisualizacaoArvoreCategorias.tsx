import { useState, useRef } from "react";
import { ChevronDown, ChevronRight, Download, Folder, FolderOpen, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { toPng } from "html-to-image";
import type { Categoria } from "@/hooks/useCategorias";

interface VisualizacaoArvoreCategorias extends Categoria {
  subcategorias?: VisualizacaoArvoreCategorias[];
}

interface VisualizacaoArvoreCategoriasProps {
  categorias: VisualizacaoArvoreCategorias[];
}

export function VisualizacaoArvoreCategorias({
  categorias,
}: VisualizacaoArvoreCategoriasProps) {
  const [open, setOpen] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const treeRef = useRef<HTMLDivElement>(null);

  const toggleNode = (id: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const collectIds = (cats: VisualizacaoArvoreCategorias[]) => {
      cats.forEach((cat) => {
        if (cat.subcategorias && cat.subcategorias.length > 0) {
          allIds.add(cat.id);
          collectIds(cat.subcategorias);
        }
      });
    };
    collectIds(categorias);
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const exportarImagem = async () => {
    if (!treeRef.current) return;

    try {
      const dataUrl = await toPng(treeRef.current, {
        cacheBust: true,
        backgroundColor: "#ffffff",
        pixelRatio: 2,
      });

      const link = document.createElement("a");
      link.download = `categorias-arvore-${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();

      toast({
        title: "Exportado com sucesso!",
        description: "A árvore de categorias foi exportada como imagem.",
      });
    } catch (error) {
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível exportar a árvore como imagem.",
        variant: "destructive",
      });
    }
  };

  const renderNode = (
    categoria: VisualizacaoArvoreCategorias,
    nivel: number = 0
  ) => {
    const temFilhos = categoria.subcategorias && categoria.subcategorias.length > 0;
    const estaExpandido = expandedNodes.has(categoria.id);

    return (
      <div key={categoria.id} className="select-none">
        <div
          className="flex items-center gap-2 py-2 px-3 rounded hover:bg-accent/50 transition-colors cursor-pointer"
          style={{ paddingLeft: `${nivel * 24 + 12}px` }}
          onClick={() => temFilhos && toggleNode(categoria.id)}
        >
          {temFilhos ? (
            <>
              {estaExpandido ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              {estaExpandido ? (
                <FolderOpen className="h-4 w-4 text-primary flex-shrink-0" />
              ) : (
                <Folder className="h-4 w-4 text-primary flex-shrink-0" />
              )}
            </>
          ) : (
            <>
              <div className="w-4" />
              <Folder className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </>
          )}
          <span
            className={`text-sm font-medium ${
              !categoria.ativo ? "text-muted-foreground line-through" : ""
            }`}
          >
            {categoria.nome}
          </span>
          {temFilhos && (
            <span className="text-xs text-muted-foreground">
              ({categoria.subcategorias!.length})
            </span>
          )}
          {!categoria.ativo && (
            <span className="text-xs text-muted-foreground ml-auto">(Inativa)</span>
          )}
        </div>
        {temFilhos && estaExpandido && (
          <div>
            {categoria.subcategorias!.map((sub) => renderNode(sub, nivel + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Network className="h-4 w-4" />
          Visualizar Árvore
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Árvore de Categorias
          </DialogTitle>
          <DialogDescription>
            Visualização hierárquica de todas as categorias e subcategorias
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 pb-4 border-b">
          <Button variant="outline" size="sm" onClick={expandAll}>
            Expandir Tudo
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            Recolher Tudo
          </Button>
          <Button variant="outline" size="sm" onClick={exportarImagem} className="ml-auto gap-2">
            <Download className="h-4 w-4" />
            Exportar como Imagem
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto border rounded-lg p-4 bg-muted/20">
          <div ref={treeRef} className="bg-background p-6 rounded-lg">
            {categorias.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Nenhuma categoria encontrada
              </div>
            ) : (
              categorias.map((cat) => renderNode(cat, 0))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
