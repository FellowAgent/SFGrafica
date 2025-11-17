import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Package, Tag, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProdutoSugestao {
  id: string;
  nome: string;
  codigo_barras?: string;
  preco: number;
  estoque?: number;
  categoria_nome?: string;
  imagem_url?: string;
}

interface ModalBuscaProdutosProps {
  open: boolean;
  onClose: () => void;
  onSelectProduto: (produto: ProdutoSugestao) => void;
  produtoAtualId?: string;
  produtos: ProdutoSugestao[];
}

export function ModalBuscaProdutos({
  open,
  onClose,
  onSelectProduto,
  produtoAtualId,
  produtos,
}: ModalBuscaProdutosProps) {
  const [busca, setBusca] = useState("");
  const [produtosFiltrados, setProdutosFiltrados] = useState<ProdutoSugestao[]>([]);

  useEffect(() => {
    if (open) {
      setBusca("");
      setProdutosFiltrados(produtos);
    }
  }, [open, produtos]);

  useEffect(() => {
    if (!busca.trim()) {
      setProdutosFiltrados(produtos);
      return;
    }

    const termo = busca.toLowerCase();
    
    // Separa produtos que começam com o termo vs que contêm o termo
    const comecamCom: ProdutoSugestao[] = [];
    const contem: ProdutoSugestao[] = [];
    
    produtos.forEach((p) => {
      const nomeMatch = p.nome.toLowerCase().startsWith(termo);
      const codigoMatch = p.codigo_barras?.toLowerCase().startsWith(termo);
      const categoriaMatch = p.categoria_nome?.toLowerCase().startsWith(termo);
      
      if (nomeMatch || codigoMatch || categoriaMatch) {
        comecamCom.push(p);
      } else if (
        p.nome.toLowerCase().includes(termo) ||
        p.codigo_barras?.toLowerCase().includes(termo) ||
        p.categoria_nome?.toLowerCase().includes(termo)
      ) {
        contem.push(p);
      }
    });
    
    // Primeiro os que começam com o termo, depois os que contêm
    setProdutosFiltrados([...comecamCom, ...contem]);
  }, [busca, produtos]);

  const formatBRL = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl">Buscar Produto</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 border-b bg-muted/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Digite o nome, código de barras ou categoria..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10 pr-10"
              autoFocus
            />
            {busca && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setBusca("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {produtosFiltrados.length} produto(s) encontrado(s)
          </p>
        </div>

        <ScrollArea className="flex-1 px-6 py-4" style={{ maxHeight: "calc(80vh - 200px)" }}>
          {produtosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                {busca ? "Nenhum produto encontrado" : "Nenhum produto disponível"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {produtosFiltrados.map((produto) => (
                <Card
                  key={produto.id}
                  className={cn(
                    "cursor-pointer transition-all hover:border-primary hover:shadow-md",
                    produtoAtualId === produto.id && "border-primary bg-primary/5"
                  )}
                  onClick={() => onSelectProduto(produto)}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      {produto.imagem_url ? (
                        <img
                          src={produto.imagem_url}
                          alt={produto.nome}
                          className="w-16 h-16 rounded-lg object-cover bg-muted"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm mb-1 truncate">
                          {produto.nome}
                        </h4>

                        <div className="space-y-1">
                          {produto.codigo_barras && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Tag className="h-3 w-3" />
                              <span className="truncate">{produto.codigo_barras}</span>
                            </div>
                          )}

                          {produto.categoria_nome && (
                            <Badge variant="secondary" className="text-xs">
                              {produto.categoria_nome}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <span className="text-lg font-bold text-primary">
                            {formatBRL(produto.preco)}
                          </span>

                          {produto.estoque !== undefined && (
                            <span className="text-xs text-muted-foreground">
                              Est: {produto.estoque}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="px-6 py-4 border-t bg-muted/50 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
