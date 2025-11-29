import { useState, useEffect } from "react";
import { Filter, Save, Star, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

export interface FiltrosCategoria {
  search: string;
  status: string;
  nivel: string;
  dataInicio: string;
  dataFim: string;
}

interface FiltroSalvo {
  id: string;
  nome: string;
  filtros: FiltrosCategoria;
}

interface FiltrosAvancadosCategoriasProps {
  filtros: FiltrosCategoria;
  onFiltrosChange: (filtros: FiltrosCategoria) => void;
  nivelMaximo: number;
}

const STORAGE_KEY = "filtros-categorias-favoritos";

export function FiltrosAvancadosCategorias({
  filtros,
  onFiltrosChange,
  nivelMaximo,
}: FiltrosAvancadosCategoriasProps) {
  const [open, setOpen] = useState(false);
  const [filtrosSalvos, setFiltrosSalvos] = useState<FiltroSalvo[]>([]);
  const [nomeFiltro, setNomeFiltro] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setFiltrosSalvos(JSON.parse(saved));
    }
  }, []);

  const salvarFiltros = () => {
    if (!nomeFiltro.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Digite um nome para salvar este filtro.",
        variant: "destructive",
      });
      return;
    }

    const novoFiltro: FiltroSalvo = {
      id: Date.now().toString(),
      nome: nomeFiltro,
      filtros: { ...filtros },
    };

    const novosItens = [...filtrosSalvos, novoFiltro];
    setFiltrosSalvos(novosItens);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(novosItens));

    toast({
      title: "Filtro salvo!",
      description: `O filtro "${nomeFiltro}" foi salvo com sucesso.`,
    });

    setNomeFiltro("");
  };

  const aplicarFiltroSalvo = (filtro: FiltroSalvo) => {
    onFiltrosChange(filtro.filtros);
    toast({
      title: "Filtro aplicado",
      description: `Filtro "${filtro.nome}" foi aplicado.`,
    });
  };

  const excluirFiltroSalvo = (id: string) => {
    const novosItens = filtrosSalvos.filter((f) => f.id !== id);
    setFiltrosSalvos(novosItens);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(novosItens));

    toast({
      title: "Filtro excluído",
      description: "O filtro foi removido dos favoritos.",
    });
  };

  const limparFiltros = () => {
    onFiltrosChange({
      search: "",
      status: "all",
      nivel: "all",
      dataInicio: "",
      dataFim: "",
    });
  };

  const temFiltrosAtivos = 
    filtros.search !== "" ||
    filtros.status !== "all" ||
    filtros.nivel !== "all" ||
    filtros.dataInicio !== "" ||
    filtros.dataFim !== "";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filtros Avançados
          {temFiltrosAtivos && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center">
              !
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filtros Avançados</SheetTitle>
          <SheetDescription>
            Configure filtros personalizados para encontrar categorias
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Busca por nome */}
          <div className="space-y-2">
            <Label htmlFor="search">Buscar por nome</Label>
            <Input
              id="search"
              placeholder="Digite o nome da categoria..."
              value={filtros.search}
              onChange={(e) =>
                onFiltrosChange({ ...filtros, search: e.target.value })
              }
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={filtros.status}
              onValueChange={(value) =>
                onFiltrosChange({ ...filtros, status: value })
              }
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Somente Ativos</SelectItem>
                <SelectItem value="inactive">Somente Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Nível Hierárquico */}
          <div className="space-y-2">
            <Label htmlFor="nivel">Nível Hierárquico</Label>
            <Select
              value={filtros.nivel}
              onValueChange={(value) =>
                onFiltrosChange({ ...filtros, nivel: value })
              }
            >
              <SelectTrigger id="nivel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os níveis</SelectItem>
                <SelectItem value="0">Nível 0 (Principal)</SelectItem>
                {Array.from({ length: nivelMaximo }, (_, i) => i + 1).map((n) => (
                  <SelectItem key={n} value={n.toString()}>
                    Nível {n} (Subcategoria)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data de Criação */}
          <div className="space-y-2">
            <Label>Data de Criação</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="dataInicio" className="text-xs text-muted-foreground">
                  De
                </Label>
                <Input
                  id="dataInicio"
                  type="date"
                  value={filtros.dataInicio}
                  onChange={(e) =>
                    onFiltrosChange({ ...filtros, dataInicio: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="dataFim" className="text-xs text-muted-foreground">
                  Até
                </Label>
                <Input
                  id="dataFim"
                  type="date"
                  value={filtros.dataFim}
                  onChange={(e) =>
                    onFiltrosChange({ ...filtros, dataFim: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          {/* Salvar Filtro */}
          <div className="space-y-2 pt-4 border-t">
            <Label htmlFor="nomeFiltro">Salvar este filtro</Label>
            <div className="flex gap-2">
              <Input
                id="nomeFiltro"
                placeholder="Nome do filtro..."
                value={nomeFiltro}
                onChange={(e) => setNomeFiltro(e.target.value)}
              />
              <Button onClick={salvarFiltros} size="icon" variant="outline">
                <Save className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Filtros Salvos */}
          {filtrosSalvos.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                Filtros Favoritos
              </Label>
              <div className="space-y-2">
                {filtrosSalvos.map((filtro) => (
                  <div
                    key={filtro.id}
                    className="flex items-center justify-between p-2 border rounded-md bg-muted/50"
                  >
                    <button
                      onClick={() => aplicarFiltroSalvo(filtro)}
                      className="flex-1 text-left text-sm font-medium hover:text-primary transition-colors"
                    >
                      {filtro.nome}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => excluirFiltroSalvo(filtro.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={limparFiltros}
              disabled={!temFiltrosAtivos}
            >
              <X className="h-4 w-4 mr-2" />
              Limpar Filtros
            </Button>
            <Button
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Aplicar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
