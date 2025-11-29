import { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAtributosVariacao, AtributoVariacao } from "@/hooks/useAtributosVariacao";
import { useOpcoesVariacao, OpcaoVariacao } from "@/hooks/useOpcoesVariacao";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckSquare, Square, Trash2, Wand2, Hand, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, parseCurrencyToNumber } from "@/utils/inputMasks";

interface PreviewTabProps {
  templateId: string;
}

interface Combinacao {
  id: string;
  path: string[];
  atributos: string[];
  opcoes: OpcaoVariacao[];
  ativo: boolean;
  nome: string;
  sku: string;
  codigoBarras: string;
  valorAdicional: number;
  estoque: number;
  observacoes: string;
  isComposta: boolean;
  tipo: "automatica" | "customizada";
  persistida: boolean; // true = salva no banco, não atualiza automaticamente
  dbId?: string; // ID do registro em variacoes_produtos
}

// Interface para os dados salvos no banco
interface VariacaoProdutoDB {
  id: string;
  template_id: string;
  nome: string;
  sku: string | null;
  codigo_barras: string | null;
  combinacao: any;
  ativo: boolean | null;
  preco_venda: number | null;
  estoque_atual: number | null;
  imagem_url: string | null;
}

export interface PreviewTabRef {
  salvarVariacoesAtivas: () => Promise<void>;
}

export const PreviewTab = forwardRef<PreviewTabRef, PreviewTabProps>(({ templateId }, ref) => {
  const { atributos, fetchAtributos } = useAtributosVariacao();
  const [combinacoes, setCombinacoes] = useState<Combinacao[]>([]);
  const [combinacoesCustomizadas, setCombinacoesCustomizadas] = useState<Combinacao[]>([]);
  const [variacoesPersistidas, setVariacoesPersistidas] = useState<Combinacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipoVisualizacao, setTipoVisualizacao] = useState<"todas" | "simples" | "compostas" | "ativas">("ativas");
  const [modoCriacao, setModoCriacao] = useState<"automatico" | "manual">("automatico");
  const [atributosSelecionados, setAtributosSelecionados] = useState<Set<string>>(new Set());
  const [opcoesMap, setOpcoesMap] = useState<Map<string, OpcaoVariacao[]>>(new Map());
  const [atributosFolha, setAtributosFolha] = useState<AtributoVariacao[]>([]);

  // Função para carregar variações persistidas do banco
  const fetchVariacoesPersistidas = useCallback(async () => {
    if (!templateId || templateId.startsWith('temp_')) return;

    try {
      const { data, error } = await supabase
        .from("variacoes_produtos")
        .select("*")
        .eq("template_id", templateId);

      if (error) throw error;

      if (data && data.length > 0) {
        const persistidas: Combinacao[] = data.map((item: VariacaoProdutoDB) => {
          const combinacaoData = item.combinacao as any;
          return {
            id: `persisted-${item.id}`,
            dbId: item.id,
            path: combinacaoData.path || [],
            atributos: combinacaoData.atributos || [],
            opcoes: combinacaoData.opcoes || [],
            ativo: item.ativo ?? true,
            nome: item.nome,
            sku: item.sku || "",
            codigoBarras: item.codigo_barras || "",
            valorAdicional: item.preco_venda || 0,
            estoque: item.estoque_atual || 0,
            observacoes: combinacaoData.observacoes || "",
            isComposta: combinacaoData.isComposta ?? false,
            tipo: combinacaoData.tipo || "automatica",
            persistida: true
          };
        });
        setVariacoesPersistidas(persistidas);
      }
    } catch (error) {
      console.error("Erro ao buscar variações persistidas:", error);
    }
  }, [templateId]);

  // Função para salvar variações ativas no banco
  const salvarVariacoesAtivas = useCallback(async () => {
    if (!templateId || templateId.startsWith('temp_')) {
      toast({
        title: "Erro",
        description: "Salve o template primeiro antes de salvar as variações",
        variant: "destructive"
      });
      return;
    }

    const todasVariacoes = [...combinacoes, ...combinacoesCustomizadas];
    const variacoesAtivas = todasVariacoes.filter(v => v.ativo);
    const variacoesInativas = todasVariacoes.filter(v => !v.ativo);

    try {
      // 1. Remover variações que foram desativadas (se estavam no banco)
      const idsParaRemover = variacoesInativas
        .filter(v => v.persistida && v.dbId)
        .map(v => v.dbId!);

      if (idsParaRemover.length > 0) {
        const { error: deleteError } = await supabase
          .from("variacoes_produtos")
          .delete()
          .in("id", idsParaRemover);

        if (deleteError) throw deleteError;
      }

      // 2. Inserir/atualizar variações ativas
      for (const variacao of variacoesAtivas) {
        const combinacaoJson = {
          path: variacao.path,
          atributos: variacao.atributos,
          opcoes: variacao.opcoes,
          isComposta: variacao.isComposta,
          tipo: variacao.tipo,
          observacoes: variacao.observacoes
        };

        if (variacao.persistida && variacao.dbId) {
          // Atualizar existente
          const { error } = await supabase
            .from("variacoes_produtos")
            .update({
              nome: variacao.nome,
              sku: variacao.sku || null,
              codigo_barras: variacao.codigoBarras || null,
              combinacao: combinacaoJson,
              ativo: variacao.ativo,
              preco_venda: variacao.valorAdicional,
              estoque_atual: variacao.estoque,
              updated_at: new Date().toISOString()
            })
            .eq("id", variacao.dbId);

          if (error) throw error;
        } else {
          // Inserir nova
          const { error } = await supabase
            .from("variacoes_produtos")
            .insert({
              template_id: templateId,
              nome: variacao.nome,
              sku: variacao.sku || null,
              codigo_barras: variacao.codigoBarras || null,
              combinacao: combinacaoJson,
              ativo: variacao.ativo,
              preco_venda: variacao.valorAdicional,
              estoque_atual: variacao.estoque
            });

          if (error) throw error;
        }
      }

      toast({
        title: "Variações salvas",
        description: `${variacoesAtivas.length} variações ativas foram salvas`
      });

      // Recarregar variações persistidas
      await fetchVariacoesPersistidas();
    } catch (error) {
      console.error("Erro ao salvar variações:", error);
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar as variações",
        variant: "destructive"
      });
    }
  }, [templateId, combinacoes, combinacoesCustomizadas, fetchVariacoesPersistidas]);

  // Expor função de salvar via ref
  useImperativeHandle(ref, () => ({
    salvarVariacoesAtivas
  }));

  useEffect(() => {
    // Não buscar atributos se o template ID for temporário
    if (templateId && !templateId.startsWith('temp_')) {
      setLoading(true);
      fetchAtributos(templateId);
      fetchVariacoesPersistidas();
    } else {
      // Se for template temporário, não há dados no banco ainda
      setLoading(false);
      setCombinacoes([]);
    }
  }, [templateId, fetchVariacoesPersistidas]);

  useEffect(() => {
    if (atributos.length > 0) {
      generateCombinacoes();
    } else if (!templateId?.startsWith('temp_')) {
      // Se não for template temporário e não houver atributos, parar o loading
      setLoading(false);
      setCombinacoes([]);
    }
  }, [atributos, variacoesPersistidas]);

  // Funções auxiliares
  const getAtributosFolha = (attrs: AtributoVariacao[]): AtributoVariacao[] => {
    const folhas: AtributoVariacao[] = [];
    
    const buscar = (attr: AtributoVariacao) => {
      if (!attr.filhos || attr.filhos.length === 0) {
        folhas.push(attr);
      } else {
        attr.filhos.forEach(buscar);
      }
    };

    attrs.forEach(buscar);
    return folhas;
  };

  const findAtributoById = (attrs: AtributoVariacao[], id: string): AtributoVariacao | null => {
    for (const attr of attrs) {
      if (attr.id === id) return attr;
      if (attr.filhos && attr.filhos.length > 0) {
        const found = findAtributoById(attr.filhos, id);
        if (found) return found;
      }
    }
    return null;
  };

  const getAtributoRaiz = (attr: AtributoVariacao): AtributoVariacao => {
    let current = attr;
    while (current.pai_id) {
      const pai = findAtributoById(atributos, current.pai_id);
      if (pai) {
        current = pai;
      } else {
        break;
      }
    }
    return current;
  };

  const getAtributoPath = (attr: AtributoVariacao): string => {
    const path: string[] = [attr.nome];
    let current = attr;
    
    // Buscar o pai recursivamente
    while (current.pai_id) {
      const pai = findAtributoById(atributos, current.pai_id);
      if (pai) {
        path.unshift(pai.nome);
        current = pai;
      } else {
        break;
      }
    }
    
    return path.join(" > ");
  };

  const generateCombinacoes = async () => {
    setLoading(true);
    try {
      // Obter todos os atributos folha (sem filhos)
      const folhas = getAtributosFolha(atributos);
      setAtributosFolha(folhas);
      
      // Buscar opções para cada atributo folha
      const newOpcoesMap = new Map<string, OpcaoVariacao[]>();
      const atributosNomeMap = new Map<string, string>();
      
      for (const attr of folhas) {
        const { data } = await supabase
          .from("opcoes_variacao")
          .select("*")
          .eq("atributo_id", attr.id)
          .eq("ativo", true);
        
        if (data) {
          newOpcoesMap.set(attr.id, data);
        }
        atributosNomeMap.set(attr.id, getAtributoPath(attr));
      }
      
      setOpcoesMap(newOpcoesMap);

      // Calcular quantos atributos raiz únicos existem
      const atributosRaizUnicos = new Set<string>();
      folhas.forEach(folha => {
        const raiz = getAtributoRaiz(folha);
        atributosRaizUnicos.add(raiz.id);
      });
      const numAtributosRaiz = atributosRaizUnicos.size;

      // Função auxiliar para verificar se uma combinação já existe nas persistidas
      const encontrarPersistida = (path: string[], atributos: string[]): Combinacao | undefined => {
        return variacoesPersistidas.find(p => 
          JSON.stringify(p.path.sort()) === JSON.stringify(path.sort()) &&
          JSON.stringify(p.atributos.sort()) === JSON.stringify(atributos.sort())
        );
      };

      // Gerar combinações automáticas
      const todasCombinacoes: Combinacao[] = [];
      
      // PRIMEIRO: Gerar variações SIMPLES (cada valor individualmente)
      if (numAtributosRaiz > 1) {
        folhas.forEach(folha => {
          const opcoes = newOpcoesMap.get(folha.id) || [];
          const atributoNome = atributosNomeMap.get(folha.id) || folha.nome;
          
          opcoes.forEach(opcao => {
            // Verificar se existe versão persistida
            const persistida = encontrarPersistida([opcao.nome], [atributoNome]);
            
            if (persistida) {
              // Usar a versão persistida (não atualiza automaticamente)
              todasCombinacoes.push(persistida);
            } else {
              // Formato: [Atributo] - [Valor]
              const nome = `${atributoNome} - ${opcao.nome}`;
              
              todasCombinacoes.push({
                id: `auto-simple-${todasCombinacoes.length}`,
                path: [opcao.nome],
                atributos: [atributoNome],
                opcoes: [opcao],
                ativo: false, // Inativa por padrão
                nome,
                sku: "",
                codigoBarras: "",
                valorAdicional: opcao.valor_adicional,
                estoque: opcao.estoque,
                observacoes: "",
                isComposta: false, // É SIMPLES
                tipo: "automatica",
                persistida: false
              });
            }
          });
        });
      }
      
      // SEGUNDO: Gerar variações COMPOSTAS
      if (numAtributosRaiz >= 2) {
        // Agrupar folhas por atributo raiz
        const folhasPorRaiz = new Map<string, AtributoVariacao[]>();
        folhas.forEach(folha => {
          const raiz = getAtributoRaiz(folha);
          if (!folhasPorRaiz.has(raiz.id)) {
            folhasPorRaiz.set(raiz.id, []);
          }
          folhasPorRaiz.get(raiz.id)!.push(folha);
        });

        const raizesArray = Array.from(folhasPorRaiz.keys());
        
        // Gerar todas as combinações de 2 ou mais atributos raiz
        const gerarCombinacoesDeTamanho = (tamanho: number) => {
          const combinacoesDeRaizes: string[][] = [];
          
          const combinar = (start: number, atual: string[]) => {
            if (atual.length === tamanho) {
              combinacoesDeRaizes.push([...atual]);
              return;
            }
            
            for (let i = start; i < raizesArray.length; i++) {
              combinar(i + 1, [...atual, raizesArray[i]]);
            }
          };
          
          combinar(0, []);
          return combinacoesDeRaizes;
        };

        // Para cada tamanho de combinação (2, 3, 4, ...)
        for (let tamanho = 2; tamanho <= raizesArray.length; tamanho++) {
          const combinacoesDeRaizes = gerarCombinacoesDeTamanho(tamanho);
          
          // Para cada combinação de raízes
          combinacoesDeRaizes.forEach(raizes => {
            // Pegar todas as folhas dessa combinação
            const folhasDessaCombinacao = raizes.map(raizId => folhasPorRaiz.get(raizId)!).flat();
            
            // Gerar produto cartesiano dos valores
            const gerarProdutoCartesiano = (
              index: number,
              path: string[],
              atributosPath: string[],
              opcoesSelecionadas: OpcaoVariacao[]
            ) => {
              if (index === folhasDessaCombinacao.length) {
                // Verificar se existe versão persistida
                const persistida = encontrarPersistida(path, atributosPath);
                
                if (persistida) {
                  // Usar a versão persistida (não atualiza automaticamente)
                  todasCombinacoes.push(persistida);
                } else {
                  const valorTotal = opcoesSelecionadas.reduce((sum, op) => sum + (Number(op.valor_adicional) || 0), 0);
                  const estoqueMinimo = opcoesSelecionadas.length > 0 ? Math.min(...opcoesSelecionadas.map(op => Number(op.estoque) || 0)) : 0;
                  
                  // Formato: [Atributo] - [Valor] \ [Atributo] - [Valor]
                  const nomeParts = atributosPath.map((atributo, idx) => `${atributo} - ${path[idx]}`);
                  const nome = nomeParts.join(" \\ ");
                  
                  todasCombinacoes.push({
                    id: `auto-comp-${todasCombinacoes.length}`,
                    path,
                    atributos: atributosPath,
                    opcoes: opcoesSelecionadas,
                    ativo: false, // Inativa por padrão
                    nome,
                    sku: "",
                    codigoBarras: "",
                    valorAdicional: valorTotal,
                    estoque: estoqueMinimo,
                    observacoes: "",
                    isComposta: true,
                    tipo: "automatica",
                    persistida: false
                  });
                }
                return;
              }

              const folha = folhasDessaCombinacao[index];
              const opcoes = newOpcoesMap.get(folha.id) || [];
              const atributoNome = atributosNomeMap.get(folha.id) || folha.nome;

              if (opcoes.length === 0) {
                gerarProdutoCartesiano(index + 1, [...path, "N/A"], [...atributosPath, atributoNome], opcoesSelecionadas);
              } else {
                opcoes.forEach(opcao => {
                  gerarProdutoCartesiano(
                    index + 1,
                    [...path, opcao.nome],
                    [...atributosPath, atributoNome],
                    [...opcoesSelecionadas, opcao]
                  );
                });
              }
            };

            gerarProdutoCartesiano(0, [], [], []);
          });
        }
      } else if (numAtributosRaiz === 1) {
        // Se tiver apenas 1 atributo raiz, gerar as variações simples normalmente
        folhas.forEach(folha => {
          const opcoes = newOpcoesMap.get(folha.id) || [];
          const atributoNome = atributosNomeMap.get(folha.id) || folha.nome;
          
          opcoes.forEach(opcao => {
            // Verificar se existe versão persistida
            const persistida = encontrarPersistida([opcao.nome], [atributoNome]);
            
            if (persistida) {
              // Usar a versão persistida (não atualiza automaticamente)
              todasCombinacoes.push(persistida);
            } else {
              const nome = `${atributoNome} - ${opcao.nome}`;
              
              todasCombinacoes.push({
                id: `auto-${todasCombinacoes.length}`,
                path: [opcao.nome],
                atributos: [atributoNome],
                opcoes: [opcao],
                ativo: false, // Inativa por padrão
                nome,
                sku: "",
                codigoBarras: "",
                valorAdicional: opcao.valor_adicional,
                estoque: opcao.estoque,
                observacoes: "",
                isComposta: false,
                tipo: "automatica",
                persistida: false
              });
            }
          });
        });
      }
      
      setCombinacoes(todasCombinacoes);
    } catch (error) {
      console.error("Erro ao gerar combinações:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCriarVariacaoCustomizada = () => {
    if (atributosSelecionados.size === 0) {
      toast({
        title: "Nenhum valor selecionado",
        description: "Selecione pelo menos um valor de atributo para criar a variação",
        variant: "destructive"
      });
      return;
    }

    // Buscar as opções selecionadas
    const opcoesSelecionadas: OpcaoVariacao[] = [];
    const path: string[] = [];
    const atributosPath: string[] = [];
    
    atributosSelecionados.forEach(opcaoId => {
      for (const [attrId, opcoes] of opcoesMap.entries()) {
        const opcao = opcoes.find(o => o.id === opcaoId);
        if (opcao) {
          opcoesSelecionadas.push(opcao);
          path.push(opcao.nome);
          const attr = atributosFolha.find(a => a.id === attrId);
          if (attr) {
            atributosPath.push(getAtributoPath(attr));
          }
          break;
        }
      }
    });

    const valorTotal = opcoesSelecionadas.reduce((sum, op) => sum + (Number(op.valor_adicional) || 0), 0);
    const estoqueMinimo = opcoesSelecionadas.length > 0 
      ? Math.min(...opcoesSelecionadas.map(op => Number(op.estoque) || 0)) 
      : 0;
    
    // Formato: [Atributo] - [Valor] \ [Atributo] - [Valor]
    const nomeParts = atributosPath.map((atributo, idx) => `${atributo} - ${path[idx]}`);
    const nome = nomeParts.join(" \\ ");
    
    // Calcular quantos atributos raiz únicos foram selecionados
    const atributosRaizSelecionados = new Set<string>();
    atributosSelecionados.forEach(opcaoId => {
      for (const [attrId, opcoes] of opcoesMap.entries()) {
        const opcao = opcoes.find(o => o.id === opcaoId);
        if (opcao) {
          const attr = atributosFolha.find(a => a.id === attrId);
          if (attr) {
            const raiz = getAtributoRaiz(attr);
            atributosRaizSelecionados.add(raiz.id);
          }
          break;
        }
      }
    });
    
    // Variação é COMPOSTA se tiver 2 ou mais atributos raiz diferentes
    const isComposta = atributosRaizSelecionados.size > 1;

    // Verificar duplicata
    const variacaoExistente = [...combinacoes, ...combinacoesCustomizadas].find(
      v => v.path.sort().join() === path.sort().join()
    );
    
    if (variacaoExistente) {
      toast({
        title: "Variação duplicada",
        description: "Esta combinação de valores já existe",
        variant: "destructive"
      });
      return;
    }

    const novaVariacao: Combinacao = {
      id: `custom-${Date.now()}-${Math.random()}`,
      path,
      atributos: atributosPath,
      opcoes: opcoesSelecionadas,
      ativo: true,
      nome,
      sku: "",
      codigoBarras: "",
      valorAdicional: valorTotal,
      estoque: estoqueMinimo,
      observacoes: "",
      isComposta,
      tipo: "customizada",
      persistida: false
    };

    setCombinacoesCustomizadas(prev => [...prev, novaVariacao]);
    setAtributosSelecionados(new Set()); // Limpar seleção
    
    toast({
      title: "Variação customizada criada",
      description: `Variação "${nome}" adicionada com sucesso`
    });
  };

  const handleRemoverCustomizada = (id: string) => {
    setCombinacoesCustomizadas(prev => prev.filter(c => c.id !== id));
    toast({
      title: "Variação removida",
      description: "Variação customizada removida com sucesso"
    });
  };

  const handleToggleAtivo = (id: string) => {
    setCombinacoes(prev =>
      prev.map(comb => comb.id === id ? { ...comb, ativo: !comb.ativo } : comb)
    );
    setCombinacoesCustomizadas(prev =>
      prev.map(comb => comb.id === id ? { ...comb, ativo: !comb.ativo } : comb)
    );
  };

  const handleToggleTodas = (ativo: boolean) => {
    setCombinacoes(prev => prev.map(comb => ({ ...comb, ativo })));
    setCombinacoesCustomizadas(prev => prev.map(comb => ({ ...comb, ativo })));
  };

  const handleUpdateCombinacao = (id: string, field: keyof Combinacao, value: any) => {
    setCombinacoes(prev =>
      prev.map(comb => comb.id === id ? { ...comb, [field]: value } : comb)
    );
    setCombinacoesCustomizadas(prev =>
      prev.map(comb => comb.id === id ? { ...comb, [field]: value } : comb)
    );
  };

  // Função para atualizar/resetar variações inativas
  const handleAtualizar = () => {
    // Regenerar apenas as variações inativas (não persistidas)
    setCombinacoes(prev => prev.map(comb => {
      // Se está ativa ou persistida, não atualiza
      if (comb.ativo || comb.persistida) return comb;
      
      // Para as inativas não persistidas, recalcular valores dos atributos
      const valorTotal = comb.opcoes.reduce((sum, op) => sum + (Number(op.valor_adicional) || 0), 0);
      const estoqueMinimo = comb.opcoes.length > 0 ? Math.min(...comb.opcoes.map(op => Number(op.estoque) || 0)) : 0;
      
      return {
        ...comb,
        valorAdicional: valorTotal,
        estoque: estoqueMinimo,
        sku: "",
        codigoBarras: "",
        observacoes: ""
      };
    }));

    setCombinacoesCustomizadas(prev => prev.map(comb => {
      if (comb.ativo || comb.persistida) return comb;
      
      const valorTotal = comb.opcoes.reduce((sum, op) => sum + (Number(op.valor_adicional) || 0), 0);
      const estoqueMinimo = comb.opcoes.length > 0 ? Math.min(...comb.opcoes.map(op => Number(op.estoque) || 0)) : 0;
      
      return {
        ...comb,
        valorAdicional: valorTotal,
        estoque: estoqueMinimo,
        sku: "",
        codigoBarras: "",
        observacoes: ""
      };
    }));

    toast({
      title: "Variações atualizadas",
      description: "As variações inativas foram resetadas para os valores padrão"
    });
  };

  // Mesclar combinações automáticas e customizadas
  const todasCombinacoes = modoCriacao === "automatico" 
    ? combinacoes 
    : [...combinacoes, ...combinacoesCustomizadas];

  const combinacoesFiltradas = todasCombinacoes.filter(comb => {
    if (tipoVisualizacao === "simples") return !comb.isComposta;
    if (tipoVisualizacao === "compostas") return comb.isComposta;
    if (tipoVisualizacao === "ativas") return comb.ativo;
    return true;
  });

  const combinacoesAtivas = todasCombinacoes.filter(c => c.ativo).length;

  return (
    <div className="space-y-4">
      {/* Header com estatísticas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Preview de Combinações</CardTitle>
              <CardDescription className="mt-2">
                Edite rapidamente as variações e ative/desative as que deseja usar
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-base px-4 py-2">
                {combinacoesFiltradas.length} variações
              </Badge>
              <Badge variant="default" className="text-base px-4 py-2">
                {combinacoesAtivas} ativas
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">Gerando preview...</p>
          </CardContent>
        </Card>
      ) : combinacoes.length === 0 && combinacoesCustomizadas.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <p className="text-muted-foreground text-lg mb-2">
                Ainda não existem dados para exibir o preview
              </p>
              <p className="text-muted-foreground text-sm">
                Por favor, preencha os dados nas abas "Dados da Variação", "Atributos" e "Valores" para visualizar o preview das combinações.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Card de Seleção de Modo */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Modo de Criação</CardTitle>
                  <CardDescription className="mt-1">
                    Escolha como deseja gerenciar as variações
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant={modoCriacao === "automatico" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setModoCriacao("automatico")}
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    Automático
                  </Button>
                  <Button 
                    variant={modoCriacao === "manual" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setModoCriacao("manual")}
                  >
                    <Hand className="h-4 w-4 mr-2" />
                    Manual
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Interface de Seleção Manual */}
          {modoCriacao === "manual" && atributosFolha.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Selecionar Valores dos Atributos</CardTitle>
                <CardDescription>
                  Marque os valores dos atributos que deseja combinar nesta variação customizada
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {atributosFolha.map(attr => {
                    const opcoes = opcoesMap.get(attr.id) || [];
                    if (opcoes.length === 0) return null;
                    
                    return (
                      <Card key={attr.id} className="border-2">
                        <CardHeader className="pb-3">
                          <div className="text-sm font-semibold">{getAtributoPath(attr)}</div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {opcoes.map(opcao => (
                            <div key={opcao.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={opcao.id}
                                checked={atributosSelecionados.has(opcao.id)}
                                onCheckedChange={(checked) => {
                                  const newSet = new Set(atributosSelecionados);
                                  if (checked) {
                                    newSet.add(opcao.id);
                                  } else {
                                    newSet.delete(opcao.id);
                                  }
                                  setAtributosSelecionados(newSet);
                                }}
                              />
                              <label 
                                htmlFor={opcao.id}
                                className="text-sm cursor-pointer flex-1"
                              >
                                {opcao.nome}
                                {opcao.valor_adicional > 0 && (
                                  <span className="text-xs text-muted-foreground ml-1">
                                    (+R${opcao.valor_adicional.toFixed(2)})
                                  </span>
                                )}
                              </label>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    {atributosSelecionados.size} {atributosSelecionados.size === 1 ? 'valor selecionado' : 'valores selecionados'}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setAtributosSelecionados(new Set())}
                      disabled={atributosSelecionados.size === 0}
                    >
                      Limpar Seleção
                    </Button>
                    <Button 
                      onClick={handleCriarVariacaoCustomizada}
                      disabled={atributosSelecionados.size === 0}
                    >
                      Adicionar Variação Customizada
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista de Variações Customizadas */}
          {modoCriacao === "manual" && combinacoesCustomizadas.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Variações Customizadas Criadas</CardTitle>
                <CardDescription>
                  {combinacoesCustomizadas.length} {combinacoesCustomizadas.length === 1 ? 'variação customizada' : 'variações customizadas'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {combinacoesCustomizadas.map((comb, index) => (
                    <div 
                      key={comb.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-muted/20"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-xs">
                            #{index + 1}
                          </Badge>
                          <span className="font-medium">{comb.nome}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {comb.path.map((valor, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {valor}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoverCustomizada(comb.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabs para filtrar por tipo */}
          <Tabs value={tipoVisualizacao} onValueChange={(v) => setTipoVisualizacao(v as any)}>
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="todas">Todas</TabsTrigger>
                <TabsTrigger value="simples">Simples</TabsTrigger>
                <TabsTrigger value="compostas">Compostas</TabsTrigger>
                <TabsTrigger value="ativas">
                  Ativas
                  {combinacoesAtivas > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {combinacoesAtivas}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleAtualizar}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleToggleTodas(true)}>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Ativar Todas
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleToggleTodas(false)}>
                  <Square className="h-4 w-4 mr-2" />
                  Desativar Todas
                </Button>
              </div>
            </div>

            <TabsContent value="todas" className="mt-4">
              <TabelaCombinacoes 
                combinacoes={combinacoesFiltradas}
                onToggleAtivo={handleToggleAtivo}
                onUpdate={handleUpdateCombinacao}
                onRemover={modoCriacao === "manual" ? handleRemoverCustomizada : undefined}
              />
            </TabsContent>
            <TabsContent value="simples" className="mt-4">
              <TabelaCombinacoes 
                combinacoes={combinacoesFiltradas}
                onToggleAtivo={handleToggleAtivo}
                onUpdate={handleUpdateCombinacao}
                onRemover={modoCriacao === "manual" ? handleRemoverCustomizada : undefined}
              />
            </TabsContent>
            <TabsContent value="compostas" className="mt-4">
              <TabelaCombinacoes 
                combinacoes={combinacoesFiltradas}
                onToggleAtivo={handleToggleAtivo}
                onUpdate={handleUpdateCombinacao}
                onRemover={modoCriacao === "manual" ? handleRemoverCustomizada : undefined}
              />
            </TabsContent>
            <TabsContent value="ativas" className="mt-4">
              <TabelaCombinacoes 
                combinacoes={combinacoesFiltradas}
                onToggleAtivo={handleToggleAtivo}
                onUpdate={handleUpdateCombinacao}
                onRemover={modoCriacao === "manual" ? handleRemoverCustomizada : undefined}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
});

PreviewTab.displayName = "PreviewTab";

// Componente de tabela editável
function TabelaCombinacoes({ 
  combinacoes, 
  onToggleAtivo, 
  onUpdate,
  onRemover
}: { 
  combinacoes: Combinacao[];
  onToggleAtivo: (id: string) => void;
  onUpdate: (id: string, field: keyof Combinacao, value: any) => void;
  onRemover?: (id: string) => void;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[50px] text-center">
                  <Checkbox disabled />
                </TableHead>
                <TableHead className="w-[60px] text-center">#</TableHead>
                <TableHead className="w-[100px] text-center">Tipo</TableHead>
                <TableHead className="min-w-[200px] text-center">Atributos</TableHead>
                <TableHead className="min-w-[200px] text-center">Valores</TableHead>
                <TableHead className="min-w-[250px] text-center">Nome da Variação</TableHead>
                <TableHead className="min-w-[150px] text-center">SKU</TableHead>
                <TableHead className="min-w-[150px] text-center">Código de Barras</TableHead>
                <TableHead className="w-[120px] text-center">Preço Adicional</TableHead>
                <TableHead className="w-[100px] text-center">Estoque</TableHead>
                <TableHead className="min-w-[200px] text-center">Observações</TableHead>
                {onRemover && <TableHead className="w-[80px] text-center">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {combinacoes.map((comb, index) => (
                <TableRow 
                  key={comb.id}
                  className={!comb.ativo ? "opacity-50 bg-muted/20" : ""}
                >
                  <TableCell className="text-center">
                    <Checkbox
                      checked={comb.ativo}
                      onCheckedChange={() => onToggleAtivo(comb.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>
                    {comb.tipo === "customizada" ? (
                      <Badge variant="default" className="text-xs">
                        <Hand className="h-3 w-3 mr-1" />
                        Manual
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        <Wand2 className="h-3 w-3 mr-1" />
                        Auto
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {comb.atributos.map((attr, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {attr}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {comb.path.map((valor, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {valor}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={comb.nome}
                      onChange={(e) => onUpdate(comb.id, "nome", e.target.value)}
                      className="min-w-[250px]"
                      disabled={!comb.ativo}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={comb.sku}
                      onChange={(e) => onUpdate(comb.id, "sku", e.target.value)}
                      placeholder="SKU123"
                      className="text-center"
                      disabled={!comb.ativo}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={comb.codigoBarras}
                      onChange={(e) => onUpdate(comb.id, "codigoBarras", e.target.value)}
                      placeholder="7891234567890"
                      className="text-center"
                      disabled={!comb.ativo}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="relative w-[120px]">
                      <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-xs ${comb.valorAdicional < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                        {comb.valorAdicional < 0 ? '-R$' : 'R$'}
                      </span>
                      <input
                        className={`flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-2 py-1 text-sm text-center ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${comb.valorAdicional < 0 ? 'text-red-600' : ''}`}
                        placeholder="0,00"
                        type="text"
                        inputMode="decimal"
                        value={formatCurrency(String(Math.abs(comb.valorAdicional) * 100))}
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          if (inputValue.includes('-')) {
                            onUpdate(comb.id, "valorAdicional", -comb.valorAdicional);
                            return;
                          }
                          const numericValue = parseCurrencyToNumber(inputValue);
                          const isCurrentlyNegative = comb.valorAdicional < 0;
                          onUpdate(comb.id, "valorAdicional", isCurrentlyNegative ? -numericValue : numericValue);
                        }}
                        disabled={!comb.ativo}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={comb.estoque}
                      onChange={(e) => onUpdate(comb.id, "estoque", parseInt(e.target.value) || 0)}
                      className="w-[100px] text-center"
                      disabled={!comb.ativo}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={comb.observacoes}
                      onChange={(e) => onUpdate(comb.id, "observacoes", e.target.value)}
                      placeholder="Observações..."
                      disabled={!comb.ativo}
                    />
                  </TableCell>
                  {onRemover && (
                    <TableCell>
                      {comb.tipo === "customizada" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemover(comb.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {combinacoes.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Nenhuma variação encontrada para este filtro
          </div>
        )}
      </CardContent>
    </Card>
  );
}
