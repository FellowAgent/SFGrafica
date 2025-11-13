import { useState, useEffect } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChipInput } from "@/components/ui/chip-input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrencyWithSymbol, limitText } from "@/utils/inputMasks";

interface Atributo {
  id: string;
  nome: string;
  opcoes: string[];
}

interface Variacao {
  id: string;
  combinacao: string;
  codigo: string;
  preco: string;
  estoque: string;
}

export function VariacoesStep() {
  // Função para restaurar dados salvos
  const getRestoredData = () => {
    const savedData = localStorage.getItem('produto-form-variacoes-autosave');
    if (savedData) {
      try {
        return JSON.parse(savedData);
      } catch (error) {
        console.error('Erro ao restaurar variações:', error);
        return { atributos: [], variacoes: [] };
      }
    }
    return { atributos: [], variacoes: [] };
  };

  const restored = getRestoredData();
  
  const [atributos, setAtributos] = useState<Atributo[]>(restored.atributos || []);
  const [nomeAtributo, setNomeAtributo] = useState("");
  const [opcoesAtributo, setOpcoesAtributo] = useState<string[]>([]);
  const [variacoes, setVariacoes] = useState<Variacao[]>(restored.variacoes || []);

  // Auto-save ao alterar atributos ou variações
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (atributos.length > 0 || variacoes.length > 0) {
        localStorage.setItem('produto-form-variacoes-autosave', JSON.stringify({ atributos, variacoes }));
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [atributos, variacoes]);

  const adicionarAtributo = () => {
    if (!nomeAtributo || opcoesAtributo.length === 0) return;

    const novoAtributo: Atributo = {
      id: Date.now().toString(),
      nome: nomeAtributo,
      opcoes: opcoesAtributo,
    };

    setAtributos([...atributos, novoAtributo]);
    gerarVariacoes([...atributos, novoAtributo]);
    setNomeAtributo("");
    setOpcoesAtributo([]);
  };

  const gerarVariacoes = (attrs: Atributo[]) => {
    if (attrs.length === 0) {
      setVariacoes([]);
      return;
    }

    const combinar = (arrays: string[][]): string[][] => {
      if (arrays.length === 0) return [[]];
      const [first, ...rest] = arrays;
      const restCombinations = combinar(rest);
      return first.flatMap((item) =>
        restCombinations.map((combo) => [item, ...combo])
      );
    };

    const opcoesPorAtributo = attrs.map((attr) => attr.opcoes);
    const combinacoes = combinar(opcoesPorAtributo);

    const novasVariacoes: Variacao[] = combinacoes.map((combo, index) => ({
      id: `var-${index}`,
      combinacao: combo.join(" / "),
      codigo: "",
      preco: "",
      estoque: "",
    }));

    setVariacoes(novasVariacoes);
  };

  const removerAtributo = (id: string) => {
    const novosAtributos = atributos.filter((attr) => attr.id !== id);
    setAtributos(novosAtributos);
    gerarVariacoes(novosAtributos);
  };

  const removerVariacao = (id: string) => {
    setVariacoes(variacoes.filter((v) => v.id !== id));
  };

  const atualizarVariacao = (id: string, campo: keyof Variacao, valor: string) => {
    setVariacoes(
      variacoes.map((v) => (v.id === id ? { ...v, [campo]: valor } : v))
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Variações</h3>
        <p className="text-sm text-muted-foreground">
          Configure as variações do produto (cor, tamanho, etc.)
        </p>
      </div>

      <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <label className="text-sm font-medium mb-2 block cursor-help">
                    Nome do atributo <span className="text-muted-foreground text-xs ml-1">({nomeAtributo.length}/50)</span>
                  </label>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">Digite o nome do atributo da variação (Ex: Cor, Tamanho - máximo 50 caracteres)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Input
              placeholder="Ex: Cor, Tamanho, Material..."
              value={nomeAtributo}
              maxLength={50}
              onChange={(e) => setNomeAtributo(limitText(e.target.value, 50))}
            />
          </div>
          <div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <label className="text-sm font-medium mb-2 block cursor-help">Opções</label>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">Digite as opções do atributo (Ex: Vermelho, Azul - máximo 50 caracteres cada)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <ChipInput
              value={opcoesAtributo}
              onChange={setOpcoesAtributo}
              placeholder="Ex: Vermelho, Azul, Verde..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Separe as diferentes opções pressionando Tab ou Enter
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={adicionarAtributo}
          className="w-full gap-2"
          disabled={!nomeAtributo || opcoesAtributo.length === 0}
        >
          <Plus className="h-4 w-4" />
          Adicionar Variação
        </Button>
      </div>

      {atributos.length > 0 && (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Atributos configurados:</h4>
            <div className="space-y-2">
              {atributos.map((attr) => (
                <div
                  key={attr.id}
                  className="flex items-center justify-between p-3 bg-accent/20 rounded-lg"
                >
                  <div>
                    <span className="font-medium">{attr.nome}:</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      {attr.opcoes.join(", ")}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removerAtributo(attr.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">
              Variações geradas ({variacoes.length}):
            </h4>
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variação</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Código (SKU)</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variacoes.map((variacao, index) => (
                    <TableRow key={variacao.id} className={index % 2 === 0 ? "bg-muted/20" : ""}>
                      <TableCell className="font-medium">
                        {variacao.combinacao}
                      </TableCell>
                  <TableCell>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={formatCurrencyWithSymbol(variacao.preco)}
                          onChange={(e) => {
                            const formatted = formatCurrencyWithSymbol(e.target.value);
                            atualizarVariacao(variacao.id, "preco", formatted);
                          }}
                          placeholder="R$ 0,00"
                        />
                  </TableCell>
                      <TableCell>
                        <Input
                          value={variacao.codigo}
                          onChange={(e) =>
                            atualizarVariacao(variacao.id, "codigo", e.target.value)
                          }
                          placeholder="SKU"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removerVariacao(variacao.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
