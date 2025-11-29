import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, X, Package, Edit2, Check, Copy, DollarSign, BarChart3, Loader2, RefreshCw, RotateCcw, Download, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChipInput } from "@/components/ui/chip-input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { formatCurrencyWithSymbol, limitText, parseCurrencyToNumber, formatCurrency } from "@/utils/inputMasks";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTemplatesVariacoes } from "@/hooks/useTemplatesVariacoes";
import { useAtributosVariacao } from "@/hooks/useAtributosVariacao";
import { useOpcoesVariacao } from "@/hooks/useOpcoesVariacao";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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
  modificado?: boolean; // Indica se foi editado localmente (não sobrescrever em atualizações)
  origemTemplate?: boolean; // Indica se veio de um template
  variacaoProdutoId?: string; // ID da variação no banco (variacoes_produtos) - usado para evitar duplicatas
}

interface AtributoComOpcoes {
  atributoId: string;
  atributoNome: string;
  atributoNivel: number;
  paiId: string | null;
  caminhoCompleto: string; // Caminho hierárquico completo (ex: "Cor / Tamanho")
  opcoes: any[];
}

// Interface para variações importadas do cadastro de variações
interface VariacaoImportada {
  id: string;
  variacaoProdutoId: string; // ID na tabela variacoes_produtos
  templateId: string;
  nome: string;
  sku: string;
  codigoBarras: string;
  preco: number;
  estoque: number;
  atributos: string[];
  valores: string[];
  isComposta: boolean;
  // Dados originais para restauração
  dadosOriginais: {
    nome: string;
    sku: string;
    codigoBarras: string;
    preco: number;
    estoque: number;
  };
  modificado: boolean; // true se foi editado localmente
}

interface VariacoesStepProps {
  produtoId?: string; // ID do produto quando estiver editando
}

export function VariacoesStep({ produtoId }: VariacoesStepProps = {}) {
  const { templates, loading: loadingTemplates } = useTemplatesVariacoes();
  const [modoVariacao, setModoVariacao] = useState<"manual" | "template">("manual");
  const [templateSelecionado, setTemplateSelecionado] = useState<string>("");
  const [atributosComOpcoes, setAtributosComOpcoes] = useState<AtributoComOpcoes[]>([]);
  const [opcoesSelecionadas, setOpcoesSelecionadas] = useState<Set<string>>(new Set());
  const [loadingOpcoes, setLoadingOpcoes] = useState(false);
  
  // Estados para variações importadas do cadastro de variações
  const [variacoesImportadas, setVariacoesImportadas] = useState<VariacaoImportada[]>([]);
  const [loadingImportacao, setLoadingImportacao] = useState(false);
  const [modoTemplate, setModoTemplate] = useState<"importar" | "gerar">("importar");

  // Função para importar variações ativas do cadastro de variações
  const importarVariacoesAtivas = useCallback(async (templateId: string, apenasNovas: boolean = false) => {
    if (!templateId) {
      setVariacoesImportadas([]);
      return;
    }

    setLoadingImportacao(true);

    try {
      // Buscar variações ativas da tabela variacoes_produtos
      const { data, error } = await supabase
        .from("variacoes_produtos")
        .select("*")
        .eq("template_id", templateId)
        .eq("ativo", true);

      if (error) throw error;

      if (!data || data.length === 0) {
        if (!apenasNovas) {
          setVariacoesImportadas([]);
          toast({
            title: "Nenhuma variação ativa",
            description: "Este template não possui variações ativas. Acesse o cadastro de variações para ativar algumas.",
            variant: "default"
          });
        }
        return;
      }

      // IDs das variações já importadas
      const idsExistentes = new Set(variacoesImportadas.map(v => v.variacaoProdutoId));

      // Converter para o formato de VariacaoImportada
      const novasVariacoes: VariacaoImportada[] = data
        .filter(item => !apenasNovas || !idsExistentes.has(item.id))
        .map(item => {
          const combinacao = item.combinacao as any || {};
          return {
            id: `importada-${item.id}`,
            variacaoProdutoId: item.id,
            templateId: item.template_id,
            nome: item.nome,
            sku: item.sku || "",
            codigoBarras: item.codigo_barras || "",
            preco: item.preco_venda || 0,
            estoque: item.estoque_atual || 0,
            atributos: combinacao.atributos || [],
            valores: combinacao.path || [],
            isComposta: combinacao.isComposta || false,
            dadosOriginais: {
              nome: item.nome,
              sku: item.sku || "",
              codigoBarras: item.codigo_barras || "",
              preco: item.preco_venda || 0,
              estoque: item.estoque_atual || 0,
            },
            modificado: false
          };
        });

      if (apenasNovas) {
        if (novasVariacoes.length === 0) {
          toast({
            title: "Nenhuma nova variação",
            description: "Não há novas variações ativas para importar.",
          });
        } else {
          setVariacoesImportadas(prev => [...prev, ...novasVariacoes]);
          toast({
            title: "Variações atualizadas",
            description: `${novasVariacoes.length} nova(s) variação(ões) importada(s).`,
          });
        }
      } else {
        setVariacoesImportadas(novasVariacoes);
        toast({
          title: "Variações importadas",
          description: `${novasVariacoes.length} variação(ões) ativa(s) importada(s) do template.`,
        });
      }
    } catch (error) {
      console.error("Erro ao importar variações:", error);
      toast({
        title: "Erro",
        description: "Não foi possível importar as variações.",
        variant: "destructive"
      });
    } finally {
      setLoadingImportacao(false);
    }
  }, [variacoesImportadas]);

  // Função para atualizar uma variação importada
  const atualizarVariacaoImportada = (id: string, campo: keyof VariacaoImportada, valor: any) => {
    setVariacoesImportadas(prev => prev.map(v => {
      if (v.id === id) {
        const novaVariacao = { ...v, [campo]: valor };
        // Verificar se foi modificado comparando com dados originais
        const modificado = 
          novaVariacao.nome !== v.dadosOriginais.nome ||
          novaVariacao.sku !== v.dadosOriginais.sku ||
          novaVariacao.codigoBarras !== v.dadosOriginais.codigoBarras ||
          novaVariacao.preco !== v.dadosOriginais.preco ||
          novaVariacao.estoque !== v.dadosOriginais.estoque;
        return { ...novaVariacao, modificado };
      }
      return v;
    }));
  };

  // Função para restaurar uma variação aos valores originais
  const restaurarVariacao = (id: string) => {
    setVariacoesImportadas(prev => prev.map(v => {
      if (v.id === id) {
        return {
          ...v,
          nome: v.dadosOriginais.nome,
          sku: v.dadosOriginais.sku,
          codigoBarras: v.dadosOriginais.codigoBarras,
          preco: v.dadosOriginais.preco,
          estoque: v.dadosOriginais.estoque,
          modificado: false
        };
      }
      return v;
    }));
    toast({
      title: "Variação restaurada",
      description: "Os valores originais foram restaurados.",
    });
  };

  // Função para remover uma variação importada
  const removerVariacaoImportada = (id: string) => {
    setVariacoesImportadas(prev => prev.filter(v => v.id !== id));
  };

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
  const [variacoesCarregadas, setVariacoesCarregadas] = useState(false);

  // Campos para criação manual de variação individual
  const [nomeVariacao, setNomeVariacao] = useState("");
  const [atributoVariacao, setAtributoVariacao] = useState("");
  const [precoAdicional, setPrecoAdicional] = useState("");
  const [codigoSku, setCodigoSku] = useState("");
  const [estoqueVariacao, setEstoqueVariacao] = useState("");
  const [salvandoVariacao, setSalvandoVariacao] = useState(false);

  // Estados para diálogos de ações em massa
  const [showPrecoDialog, setShowPrecoDialog] = useState(false);
  const [showEstoqueDialog, setShowEstoqueDialog] = useState(false);
  const [showRemoverDialog, setShowRemoverDialog] = useState(false);
  const [precoEmMassa, setPrecoEmMassa] = useState("0,00");
  const [estoqueEmMassa, setEstoqueEmMassa] = useState("0");

  // Recarregar variações do localStorage quando produtoId mudar (após carregamento assíncrono do ProdutoFormCompleto)
  useEffect(() => {
    let isMounted = true;
    
    const checkForUpdates = () => {
      if (!isMounted) return;
      
      const savedData = localStorage.getItem('produto-form-variacoes-autosave');
      console.log('🔍 VariacoesStep: Verificando localStorage para produto', produtoId);
      console.log('📦 Dados encontrados:', savedData);
      
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          const savedVariacoes = parsed.variacoes || [];
          console.log(`🎨 VariacoesStep: ${savedVariacoes.length} variações encontradas`);
          
          if (savedVariacoes.length > 0) {
            setVariacoes(savedVariacoes);
            setAtributos(parsed.atributos || []);
          }
        } catch (error) {
          console.error('Erro ao recarregar variações:', error);
        }
      }
    };

    // Verificar imediatamente
    checkForUpdates();
    
    // Verificar novamente após delays para dar tempo do carregamento assíncrono do ProdutoFormCompleto
    const timeout1 = setTimeout(checkForUpdates, 300);
    const timeout2 = setTimeout(checkForUpdates, 800);
    
    return () => {
      isMounted = false;
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, [produtoId]);

  // Auto-save ao alterar atributos ou variações (apenas se houver dados)
  useEffect(() => {
    // Evitar salvar se for apenas o carregamento inicial
    if (atributos.length === 0 && variacoes.length === 0) return;
    
    const timeoutId = setTimeout(() => {
        localStorage.setItem('produto-form-variacoes-autosave', JSON.stringify({ atributos, variacoes }));
      console.log('💾 VariacoesStep: Auto-save', { atributos: atributos.length, variacoes: variacoes.length });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [atributos, variacoes]);

  // Carregar atributos e opções quando template é selecionado
  useEffect(() => {
    const carregarAtributosEOpcoes = async () => {
      if (!templateSelecionado) {
        setAtributosComOpcoes([]);
        setOpcoesSelecionadas(new Set());
        return;
      }

      setLoadingOpcoes(true);

      try {
        // 1. Buscar TODOS os atributos do template (incluindo hierarquia)
        const { data: atributosData, error: attrError } = await supabase
          .from("atributos_variacao")
          .select("*")
          .eq("template_id", templateSelecionado)
          .order("nivel", { ascending: true })
          .order("ordem", { ascending: true });

        if (attrError) throw attrError;

        if (!atributosData || atributosData.length === 0) {
          console.warn('⚠️ Nenhum atributo encontrado para o template:', templateSelecionado);
          setAtributosComOpcoes([]);
          return;
        }

        console.log('📋 Atributos carregados:', atributosData);

        // 2. Construir mapa de atributos para facilitar busca hierárquica
        const atributosMap = new Map<string, any>();
        atributosData.forEach(attr => {
          atributosMap.set(attr.id, attr);
        });

        // 3. Função auxiliar para construir caminho hierárquico completo
        const construirCaminho = (atributo: any): string => {
          const caminho: string[] = [atributo.nome];
          let atual = atributo;
          
          while (atual.pai_id) {
            const pai = atributosMap.get(atual.pai_id);
            if (pai) {
              caminho.unshift(pai.nome);
              atual = pai;
            } else {
              break;
            }
          }
          
          return caminho.join(" / ");
        };

        // 4. Buscar opções para CADA atributo encontrado
        const atributosComOpcoesPromises = atributosData.map(async (attr) => {
          const { data: opcoes, error: opError } = await supabase
            .from("opcoes_variacao")
            .select("*")
            .eq("atributo_id", attr.id)
            .eq("ativo", true)
            .order("ordem", { ascending: true });

          if (opError) {
            console.error('Erro ao carregar opções do atributo:', attr.nome, opError);
            return null;
          }

          // Construir caminho hierárquico completo
          const caminhoCompleto = construirCaminho(attr);

          return {
            atributoId: attr.id,
            atributoNome: attr.nome,
            atributoNivel: attr.nivel || 0,
            paiId: attr.pai_id || null,
            caminhoCompleto,
            opcoes: opcoes || [],
          };
        });

        const resultados = await Promise.all(atributosComOpcoesPromises);
        
        // 5. Filtrar apenas atributos "folha" que têm opções (para geração de combinações)
        // Mas manter todos para exibição
        const atributosValidos = resultados.filter(
          (r): r is AtributoComOpcoes => r !== null && r.opcoes.length > 0
        );

        // Ordenar por nível e depois por ordem
        atributosValidos.sort((a, b) => {
          if (a.atributoNivel !== b.atributoNivel) {
            return a.atributoNivel - b.atributoNivel;
          }
          return 0;
        });

        console.log('✅ Atributos com opções carregados:', atributosValidos);
        setAtributosComOpcoes(atributosValidos);
        
      } catch (error) {
        console.error('❌ Erro ao carregar atributos e opções:', error);
        setAtributosComOpcoes([]);
      } finally {
        setLoadingOpcoes(false);
      }
    };

    carregarAtributosEOpcoes();
  }, [templateSelecionado]);

  const toggleOpcao = (opcaoId: string) => {
    const novasOpcoes = new Set(opcoesSelecionadas);
    if (novasOpcoes.has(opcaoId)) {
      novasOpcoes.delete(opcaoId);
    } else {
      novasOpcoes.add(opcaoId);
    }
    setOpcoesSelecionadas(novasOpcoes);
  };

  const toggleTodasOpcoesAtributo = (atributoId: string) => {
    const atributo = atributosComOpcoes.find(a => a.atributoId === atributoId);
    if (!atributo) return;

    const novasOpcoes = new Set(opcoesSelecionadas);
    const todasSelecionadas = atributo.opcoes.every(op => novasOpcoes.has(op.id));

    if (todasSelecionadas) {
      // Desmarcar todas
      atributo.opcoes.forEach(op => novasOpcoes.delete(op.id));
    } else {
      // Marcar todas
      atributo.opcoes.forEach(op => novasOpcoes.add(op.id));
    }

    setOpcoesSelecionadas(novasOpcoes);
  };

  const aplicarTemplate = () => {
    if (atributosComOpcoes.length === 0 || opcoesSelecionadas.size === 0) return;

    // Filtrar apenas opções selecionadas por atributo
    const opcoesFiltradasPorAtributo = atributosComOpcoes.map(ac => ({
      ...ac,
      opcoes: ac.opcoes.filter((op: any) => opcoesSelecionadas.has(op.id))
    })).filter(ac => ac.opcoes.length > 0);

    if (opcoesFiltradasPorAtributo.length === 0) return;

    // Gerar todas as combinações (produto cartesiano)
    // Cada atributo com opções será uma dimensão na combinação
    const combinar = (arrays: any[][]): any[][] => {
      if (arrays.length === 0) return [[]];
      const [first, ...rest] = arrays;
      const restCombinations = combinar(rest);
      return first.flatMap((item) =>
        restCombinations.map((combo) => [item, ...combo])
      );
    };

    // Preparar opções por atributo, incluindo informações hierárquicas
    const opcoesPorAtributo = opcoesFiltradasPorAtributo.map(ac => 
      ac.opcoes.map((op: any) => ({
        ...op,
        caminhoCompleto: ac.caminhoCompleto,
        atributoNome: ac.atributoNome,
        atributoNivel: ac.atributoNivel
      }))
    );

    const combinacoes = combinar(opcoesPorAtributo);

    const novasVariacoesTemplate: Variacao[] = combinacoes.map((combo, index) => {
      // Construir nome da combinação incluindo caminho hierárquico quando relevante
      const partesCombinacao: string[] = [];
      combo.forEach((op: any) => {
        // Se o caminho completo tem mais de um nível, incluir o caminho completo
        if (op.caminhoCompleto && op.caminhoCompleto.includes(" / ")) {
          partesCombinacao.push(`${op.caminhoCompleto}: ${op.nome}`);
        } else {
          // Para atributos de nível 0, usar apenas o nome da opção
          partesCombinacao.push(op.nome);
        }
      });
      const nomes = partesCombinacao.join(" / ");
      
      const valorTotal = combo.reduce((sum: number, op: any) => sum + (Number(op.valor_adicional) || 0), 0);
      const estoqueMinimo = Math.min(...combo.map((op: any) => Number(op.estoque) || 0));
      const skus = combo.filter((op: any) => op.sku).map((op: any) => op.sku).join("-");
      const codigosBarras = combo.filter((op: any) => op.codigo_barras).map((op: any) => op.codigo_barras).join("-");

      return {
        id: `var-template-${Date.now()}-${index}`,
        combinacao: nomes,
        codigo: skus || codigosBarras || "",
        preco: valorTotal.toFixed(2),
        estoque: estoqueMinimo.toString(),
      };
    });

    // INTELIGENTE: Manter variações manuais e adicionar/substituir as de template
    // Remove apenas variações antigas de template e mantém as manuais
    const variacoesManauais = variacoes.filter(v => !v.id.startsWith('var-template-'));
    const todasVariacoes = [...variacoesManauais, ...novasVariacoesTemplate];
    
    setVariacoes(todasVariacoes);
    
    console.log(`✅ ${novasVariacoesTemplate.length} variações de template geradas`);
    console.log(`📋 Total de variações: ${todasVariacoes.length} (${variacoesManauais.length} manuais + ${novasVariacoesTemplate.length} template)`);
  };

  // Calcular quantas variações serão geradas
  const calcularVariacoesPrevistas = (): number => {
    if (opcoesSelecionadas.size === 0) return 0;

    const opcoesFiltradasPorAtributo = atributosComOpcoes.map(ac => 
      ac.opcoes.filter((op: any) => opcoesSelecionadas.has(op.id))
    ).filter(opcoes => opcoes.length > 0);

    if (opcoesFiltradasPorAtributo.length === 0) return 0;

    return opcoesFiltradasPorAtributo.reduce((total, opcoes) => total * opcoes.length, 1);
  };

  const adicionarAtributo = () => {
    if (!nomeAtributo || opcoesAtributo.length === 0) return;

    const novoAtributo: Atributo = {
      id: `attr-${Date.now()}`,
      nome: nomeAtributo,
      opcoes: opcoesAtributo,
    };

    const novosAtributos = [...atributos, novoAtributo];
    setAtributos(novosAtributos);
    
    // INTELIGENTE: Gerar variações manuais sem perder as de template
    const variacoesTemplate = variacoes.filter(v => v.id.startsWith('var-template-'));
    const variacoesManuaisNovas = gerarVariacoesManuais(novosAtributos);
    setVariacoes([...variacoesTemplate, ...variacoesManuaisNovas]);
    
    setNomeAtributo("");
    setOpcoesAtributo([]);
  };

  // Função auxiliar para gerar variações manuais (retorna o array sem setar o estado)
  const gerarVariacoesManuais = (attrs: Atributo[]): Variacao[] => {
    if (attrs.length === 0) {
      return [];
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

    return combinacoes.map((combo, index) => ({
      id: `var-manual-${Date.now()}-${index}`,
      combinacao: combo.join(" / "),
      codigo: "",
      preco: "",
      estoque: "",
    }));
  };

  const gerarVariacoes = (attrs: Atributo[]) => {
    // INTELIGENTE: Manter variações de template e gerar apenas as manuais
    const variacoesTemplate = variacoes.filter(v => v.id.startsWith('var-template-'));
    const variacoesManuais = gerarVariacoesManuais(attrs);
    const variacoesAtualizadas = [...variacoesTemplate, ...variacoesManuais];
    setVariacoes(variacoesAtualizadas);
    // Salvar imediatamente no localStorage
    localStorage.setItem('produto-form-variacoes-autosave', JSON.stringify({ 
      atributos: attrs, 
      variacoes: variacoesAtualizadas 
    }));
  };

  const removerAtributo = (id: string) => {
    const novosAtributos = atributos.filter((attr) => attr.id !== id);
    setAtributos(novosAtributos);
    
    // INTELIGENTE: Regenerar apenas variações manuais
    const variacoesTemplate = variacoes.filter(v => v.id.startsWith('var-template-'));
    const variacoesManuais = gerarVariacoesManuais(novosAtributos);
    setVariacoes([...variacoesTemplate, ...variacoesManuais]);
  };

  const removerVariacao = (id: string) => {
    const novasVariacoes = variacoes.filter((v) => v.id !== id);
    setVariacoes(novasVariacoes);
    // Atualizar localStorage
    if (novasVariacoes.length === 0) {
      localStorage.removeItem('produto-form-variacoes-autosave');
    } else {
      localStorage.setItem('produto-form-variacoes-autosave', JSON.stringify({ 
        atributos: atributos, 
        variacoes: novasVariacoes 
      }));
    }
  };

  const atualizarVariacao = (id: string, campo: keyof Variacao, valor: string) => {
    const variacoesAtualizadas = variacoes.map((v) => {
      if (v.id === id) {
        const variacaoAtualizada = { ...v, [campo]: valor };
        
        // Se a variação veio de um template (tem variacaoProdutoId e origemTemplate),
        // marcar como modificada quando qualquer campo for editado
        if (variacaoAtualizada.variacaoProdutoId && variacaoAtualizada.origemTemplate) {
          variacaoAtualizada.modificado = true;
        }
        
        return variacaoAtualizada;
      }
      return v;
    });
    
    setVariacoes(variacoesAtualizadas);
    // Salvar imediatamente no localStorage (com debounce menor já que é edição)
    localStorage.setItem('produto-form-variacoes-autosave', JSON.stringify({ 
      atributos, 
      variacoes: variacoesAtualizadas 
    }));
  };

  // Ações em massa
  const aplicarPrecoEmMassa = (valor: string) => {
    const variacoesAtualizadas = variacoes.map(v => ({ ...v, preco: valor }));
    setVariacoes(variacoesAtualizadas);
    localStorage.setItem('produto-form-variacoes-autosave', JSON.stringify({ 
      atributos, 
      variacoes: variacoesAtualizadas 
    }));
  };

  const aplicarEstoqueEmMassa = (valor: string) => {
    const variacoesAtualizadas = variacoes.map(v => ({ ...v, estoque: valor }));
    setVariacoes(variacoesAtualizadas);
    localStorage.setItem('produto-form-variacoes-autosave', JSON.stringify({ 
      atributos, 
      variacoes: variacoesAtualizadas 
    }));
  };

  const duplicarVariacao = (variacao: Variacao) => {
    const novaVariacao: Variacao = {
      ...variacao,
      id: `var-duplicada-${Date.now()}`,
      combinacao: `${variacao.combinacao} (Cópia)`,
    };
    const variacoesAtualizadas = [...variacoes, novaVariacao];
    setVariacoes(variacoesAtualizadas);
    // Salvar imediatamente no localStorage
    localStorage.setItem('produto-form-variacoes-autosave', JSON.stringify({ 
      atributos, 
      variacoes: variacoesAtualizadas 
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Variações do Produto</h3>
        <p className="text-sm text-muted-foreground">
          Configure as variações do produto usando templates ou criando manualmente
        </p>
      </div>

      <Tabs value={modoVariacao} onValueChange={(v) => setModoVariacao(v as any)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">Criação Manual</TabsTrigger>
          <TabsTrigger value="template">Usar Template</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-4">
          {!produtoId && (
            <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-amber-700 dark:text-amber-400 text-base flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Produto não salvo
                </CardTitle>
                <CardDescription className="text-amber-600 dark:text-amber-500">
                  Para adicionar variações manualmente, salve o produto primeiro clicando em "Salvar Produto" no final da página.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle>Adicionar Variação Manualmente</CardTitle>
              <CardDescription>
                Crie uma variação preenchendo os campos abaixo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Nome da Variação <span className="text-destructive">*</span>
                      </label>
                      <Input
                        placeholder="Ex: Camiseta Azul Tamanho M"
                        value={nomeVariacao}
                        onChange={(e) => setNomeVariacao(e.target.value)}
                        maxLength={200}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Nome que identifica esta variação específica
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Atributo da variação:
                      </label>
                      <Input
                        placeholder="Ex: Azul, Tamanho M"
                        value={atributoVariacao}
                        onChange={(e) => setAtributoVariacao(e.target.value)}
                        maxLength={100}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Atributo ou característica específica
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Preço Adicional
                      </label>
                      <Input
                        placeholder="R$ 0,00"
                        value={formatCurrencyWithSymbol(precoAdicional)}
                        onChange={(e) => setPrecoAdicional(formatCurrencyWithSymbol(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Adicional ao preço base
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Código/SKU
                      </label>
                      <Input
                        placeholder="Ex: CAM-AZ-M"
                        value={codigoSku}
                        onChange={(e) => setCodigoSku(e.target.value)}
                        maxLength={100}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Estoque
                      </label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={estoqueVariacao}
                        onChange={(e) => setEstoqueVariacao(e.target.value)}
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={async () => {
                    if (!nomeVariacao.trim()) {
                      toast({
                        title: "Campo obrigatório",
                        description: "Por favor, preencha o nome da variação",
                        variant: "destructive"
                      });
                      return;
                    }

                    if (!produtoId) {
                      toast({
                        title: "Produto não salvo",
                        description: "Salve o produto antes de adicionar variações",
                        variant: "destructive"
                      });
                      return;
                    }

                    setSalvandoVariacao(true);
                    
                    try {
                      const { data, error } = await supabase
                        .from('variacoes_produto')
                        .insert({
                          produto_id: produtoId,
                          nome: nomeVariacao,
                          atributo: atributoVariacao || null,
                          valor_adicional: parseCurrencyToNumber(precoAdicional || "0"),
                          estoque: parseInt(estoqueVariacao) || 0,
                          sku: codigoSku || null,
                          codigo_barras: codigoSku || null,
                          ativo: true,
                        })
                        .select()
                        .single();

                      if (error) throw error;

                      toast({
                        title: "Sucesso",
                        description: "Variação salva com sucesso!",
                        variant: "success"
                      });

                      // Recarregar todas as variações do banco para manter sincronizado
                      const { data: todasVariacoes, error: loadError } = await supabase
                        .from('variacoes_produto')
                        .select('*')
                        .eq('produto_id', produtoId);

                      if (!loadError && todasVariacoes) {
                        const variacoesFormatadas = todasVariacoes.map((v) => {
                          // Construir combinação: Nome - Atributo (se houver atributo)
                          let combinacao = v.nome;
                          if (v.atributo) {
                            combinacao = `${v.nome} - ${v.atributo}`;
                          }
                          
                          return {
                            id: `var-db-${v.id}`,
                            combinacao: combinacao,
                            codigo: v.sku || v.codigo_barras || "",
                            preco: (v.valor_adicional || 0).toFixed(2),
                            estoque: (v.estoque || 0).toString(),
                          };
                        });

                        setVariacoes(variacoesFormatadas);

                        // Atualizar localStorage também
                        localStorage.setItem('produto-form-variacoes-autosave', JSON.stringify({
                          atributos: [],
                          variacoes: variacoesFormatadas
                        }));
                      }

                      // Limpar campos
                      setNomeVariacao("");
                      setAtributoVariacao("");
                      setPrecoAdicional("");
                      setCodigoSku("");
                      setEstoqueVariacao("");
                    } catch (error: any) {
                      console.error('Erro ao salvar variação:', error);
                      toast({
                        title: "Erro",
                        description: error.message || "Erro ao salvar variação",
                        variant: "destructive"
                      });
                    } finally {
                      setSalvandoVariacao(false);
                    }
                  }}
                  className="w-full"
                  disabled={!nomeVariacao.trim() || salvandoVariacao}
                >
                  {salvandoVariacao ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Variação
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="template" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Importar Variações do Template</CardTitle>
              <CardDescription>
                Selecione um template para importar as variações ativas do cadastro de variações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Seleção de Template com botão Atualizar */}
              <div className="flex gap-2">
                <div className="flex-1">
              <Select 
                value={templateSelecionado} 
                    onValueChange={(value) => {
                      setTemplateSelecionado(value);
                      if (value) {
                        importarVariacoesAtivas(value, false);
                      } else {
                        setVariacoesImportadas([]);
                      }
                    }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um template..." />
                </SelectTrigger>
                <SelectContent 
                  position="popper"
                  sideOffset={5}
                  className="bg-popover border"
                >
                  {loadingTemplates ? (
                    <div className="p-4 text-center text-muted-foreground">
                      Carregando templates...
                    </div>
                  ) : templates.filter(t => t.ativo).length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      Nenhum template ativo encontrado.
                      <br />
                      <span className="text-xs">Crie templates na página de Variações</span>
                    </div>
                  ) : (
                    templates
                      .filter(t => t.ativo)
                      .map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            {template.nome}
                          </div>
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
                </div>

              {templateSelecionado && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => importarVariacoesAtivas(templateSelecionado, true)}
                          disabled={loadingImportacao}
                        >
                          {loadingImportacao ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Baixar novas variações ativas</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>

              {/* Estado de Loading */}
              {loadingImportacao && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-sm text-muted-foreground">Importando variações ativas...</p>
                  </div>
                </div>
              )}

              {/* Lista de Variações Importadas */}
              {!loadingImportacao && templateSelecionado && variacoesImportadas.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">Variações Importadas</h4>
                      <Badge variant="secondary">
                        {variacoesImportadas.length} variação{variacoesImportadas.length !== 1 ? 'ões' : ''}
                      </Badge>
                      {variacoesImportadas.some(v => v.modificado) && (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                          {variacoesImportadas.filter(v => v.modificado).length} modificada(s)
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {variacoesImportadas.map((variacao) => (
                      <Card 
                        key={variacao.id} 
                        className={`transition-all ${
                          variacao.modificado 
                            ? 'border-amber-300 bg-amber-50/30 dark:bg-amber-950/10' 
                            : 'border-border'
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="space-y-4">
                            {/* Header da Variação */}
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs text-muted-foreground">Tipo de Variação:</span>
                                  {variacao.isComposta ? (
                                    <Badge variant="default" className="text-xs">Composta</Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-xs">Simples</Badge>
                                  )}
                                  {variacao.modificado && (
                                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                                      Modificado
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {/* Extrair pares atributo-valor do nome que está no formato correto */}
                                  {variacao.nome.split(' \\ ').map((parte, i) => {
                                    // Cada parte está no formato "Atributo - Valor"
                                    const match = parte.match(/^(.+?)\s*-\s*(.+)$/);
                                    if (match) {
                                      return (
                                        <Badge key={i} variant="outline" className="text-xs">
                                          {match[1]}: {match[2]}
                                        </Badge>
                                      );
                                    }
                                    return (
                                      <Badge key={i} variant="outline" className="text-xs">
                                        {parte}
                                      </Badge>
                                    );
                                  })}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {variacao.modificado && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={() => restaurarVariacao(variacao.id)}
                                        >
                                          <RotateCcw className="h-4 w-4 text-amber-600" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Restaurar valores originais</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => removerVariacaoImportada(variacao.id)}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Remover variação</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>

                            {/* Campos Editáveis */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                              <div className="lg:col-span-2">
                                <label className="text-xs text-muted-foreground mb-1 block">Nome</label>
                                <Input
                                  value={variacao.nome}
                                  onChange={(e) => atualizarVariacaoImportada(variacao.id, 'nome', e.target.value)}
                                  className="h-9"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground mb-1 block">SKU</label>
                                <Input
                                  value={variacao.sku}
                                  onChange={(e) => atualizarVariacaoImportada(variacao.id, 'sku', e.target.value)}
                                  placeholder="SKU"
                                  className="h-9 text-center"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Preço Adicional</label>
                                <div className="relative">
                                  <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-xs ${variacao.preco < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                                    {variacao.preco < 0 ? '-R$' : 'R$'}
                                  </span>
                                  <input
                                    className={`flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-2 py-1 text-sm text-center ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${variacao.preco < 0 ? 'text-red-600' : ''}`}
                                    placeholder="0,00"
                                    type="text"
                                    inputMode="decimal"
                                    value={formatCurrency(String(Math.abs(variacao.preco) * 100))}
                                    onChange={(e) => {
                                      const inputValue = e.target.value;
                                      if (inputValue.includes('-')) {
                                        atualizarVariacaoImportada(variacao.id, 'preco', -variacao.preco);
                                        return;
                                      }
                                      const numericValue = parseCurrencyToNumber(inputValue);
                                      const isCurrentlyNegative = variacao.preco < 0;
                                      atualizarVariacaoImportada(variacao.id, 'preco', isCurrentlyNegative ? -numericValue : numericValue);
                                    }}
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Estoque</label>
                                <Input
                                  type="number"
                                  value={variacao.estoque}
                                  onChange={(e) => atualizarVariacaoImportada(variacao.id, 'estoque', parseInt(e.target.value) || 0)}
                                  className="h-9 text-center"
                                />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Ações em Massa */}
                  <div className="flex items-center justify-between p-4 bg-primary/5 border-2 border-primary/20 rounded-lg">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {variacoesImportadas.length} variação{variacoesImportadas.length !== 1 ? 'ões' : ''} pronta{variacoesImportadas.length !== 1 ? 's' : ''} para usar
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {variacoesImportadas.filter(v => v.modificado).length > 0 
                          ? `${variacoesImportadas.filter(v => v.modificado).length} com alterações locais`
                          : 'Todas com valores originais do cadastro'
                        }
                      </p>
                    </div>
                    <Button 
                      onClick={() => {
                        // Converter variações importadas para o formato de variacoes local
                        const novasVariacoes: Variacao[] = variacoesImportadas.map((vi, idx) => ({
                          id: `var-template-${vi.variacaoProdutoId || Date.now()}-${idx}`, // Usar variacaoProdutoId no ID se disponível
                          combinacao: vi.nome,
                          codigo: vi.sku || vi.codigoBarras || "",
                          // O preco deve ser salvo como string formatada em pt-BR (ex: "24,00" ou "-24,00")
                          preco: vi.preco < 0 
                            ? `-${Math.abs(vi.preco).toFixed(2).replace('.', ',')}`
                            : vi.preco.toFixed(2).replace('.', ','),
                          estoque: vi.estoque.toString(),
                          modificado: vi.modificado, // Preservar se foi modificado
                          origemTemplate: true, // Marcar que veio de template
                          variacaoProdutoId: vi.variacaoProdutoId, // Preservar o ID do banco
                        }));
                        
                        // Lógica de merge inteligente para evitar duplicatas
                        console.log('🔄 Iniciando merge de variações...');
                        console.log(`   Variações existentes: ${variacoes.length}`);
                        console.log(`   Novas variações a adicionar: ${novasVariacoes.length}`);
                        
                        const variacoesAtualizadas = [...variacoes];
                        let atualizadas = 0;
                        let adicionadas = 0;
                        let ignoradas = 0;
                        
                        novasVariacoes.forEach(novaVariacao => {
                          if (!novaVariacao.variacaoProdutoId) {
                            // Variação sem ID do banco, adicionar normalmente
                            console.log(`   ➕ Adicionando variação sem ID: ${novaVariacao.combinacao}`);
                            variacoesAtualizadas.push(novaVariacao);
                            adicionadas++;
                            return;
                          }

                          // Buscar variação existente com mesmo variacaoProdutoId
                          const indexExistente = variacoesAtualizadas.findIndex(
                            v => v.variacaoProdutoId === novaVariacao.variacaoProdutoId
                          );

                          if (indexExistente >= 0) {
                            // Variação já existe
                            const existente = variacoesAtualizadas[indexExistente];
                            console.log(`   🔍 Variação já existe: ${novaVariacao.combinacao} (ID: ${novaVariacao.variacaoProdutoId})`);
                            
                            if (existente.modificado) {
                              // Variação foi modificada localmente, manter dados locais
                              console.log(`   ⚠️ Variação modificada, mantendo dados locais`);
                              ignoradas++;
                              return; // Não atualizar
                            } else {
                              // Variação não foi modificada, atualizar com dados do template
                              console.log(`   ✅ Atualizando variação não modificada`);
                              variacoesAtualizadas[indexExistente] = {
                                ...novaVariacao,
                                id: existente.id, // Manter o ID local existente
                                modificado: false,
                              };
                              atualizadas++;
                            }
                          } else {
                            // Nova variação, adicionar
                            console.log(`   ➕ Adicionando nova variação: ${novaVariacao.combinacao} (ID: ${novaVariacao.variacaoProdutoId})`);
                            variacoesAtualizadas.push(novaVariacao);
                            adicionadas++;
                          }
                        });
                        
                        console.log(`   📊 Resultado: ${atualizadas} atualizadas, ${adicionadas} adicionadas, ${ignoradas} ignoradas (modificadas)`);
                        console.log(`   📋 Total final: ${variacoesAtualizadas.length} variações`);
                        
                        setVariacoes(variacoesAtualizadas);
                        
                        // Salvar imediatamente no localStorage
                        localStorage.setItem('produto-form-variacoes-autosave', JSON.stringify({ 
                          atributos, 
                          variacoes: variacoesAtualizadas 
                        }));
                        
                        toast({
                          title: "Variações adicionadas",
                          description: `${novasVariacoes.length} variação(ões) foram adicionadas à lista.`,
                        });
                        
                        // Scroll para as variações
                        setTimeout(() => {
                          const variacoesSection = document.querySelector('[data-variacoes-geradas]');
                          if (variacoesSection) {
                            variacoesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                        }, 100);
                      }} 
                      disabled={variacoesImportadas.length === 0}
                      size="lg"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar às Variações
                    </Button>
                  </div>
                </div>
              )}

              {/* Estado Vazio */}
              {!loadingImportacao && templateSelecionado && variacoesImportadas.length === 0 && (
                <div className="p-8 text-center bg-muted/30 rounded-lg border-2 border-dashed">
                  <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="font-medium text-muted-foreground mb-1">
                    Nenhuma variação ativa
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Este template não possui variações ativas. Acesse o cadastro de variações para ativar algumas.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Alternar para modo de geração manual
                      setModoTemplate("gerar");
                    }}
                  >
                    Gerar variações manualmente
                  </Button>
                </div>
              )}

              {/* Modo de Geração Manual (fallback) - Mantido para compatibilidade */}
              {modoTemplate === "gerar" && templateSelecionado && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Gerar Variações Manualmente</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setModoTemplate("importar")}
                    >
                      Voltar para importação
                    </Button>
                  </div>
                  
                  {loadingOpcoes ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center space-y-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="text-sm text-muted-foreground">Carregando atributos e opções...</p>
                      </div>
                    </div>
                  ) : atributosComOpcoes.length === 0 ? (
                    <div className="p-8 text-center bg-muted/30 rounded-lg border-2 border-dashed">
                      <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                      <p className="font-medium text-muted-foreground mb-1">
                        Nenhuma opção configurada
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Configure atributos e opções para este template na página de Variações
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">
                          Selecione as opções que deseja incluir:
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          {opcoesSelecionadas.size} opção{opcoesSelecionadas.size !== 1 ? 'ões' : ''} selecionada{opcoesSelecionadas.size !== 1 ? 's' : ''}
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        {atributosComOpcoes.map(ac => {
                          const todasSelecionadas = ac.opcoes.every(op => opcoesSelecionadas.has(op.id));

                          return (
                            <Card key={ac.atributoId} className="border-2">
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex flex-col gap-1">
                                    <CardTitle className="text-base flex items-center gap-2">
                                      {ac.caminhoCompleto && ac.caminhoCompleto.includes(" / ") ? (
                                        <span className="flex items-center gap-2">
                                          <span className="text-muted-foreground text-sm font-normal">
                                            {ac.caminhoCompleto.split(" / ").slice(0, -1).join(" / ")} / 
                                          </span>
                                          <span>{ac.atributoNome}</span>
                                        </span>
                                      ) : (
                                        ac.atributoNome
                                      )}
                                      <Badge variant="outline" className="text-xs font-normal">
                                        Nível {ac.atributoNivel}
                                      </Badge>
                                    </CardTitle>
                                    {ac.caminhoCompleto && ac.caminhoCompleto.includes(" / ") && (
                                      <p className="text-xs text-muted-foreground ml-1">
                                        Caminho completo: {ac.caminhoCompleto}
                                      </p>
                                    )}
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleTodasOpcoesAtributo(ac.atributoId)}
                                    className="h-7 text-xs"
                                  >
                                    {todasSelecionadas ? 'Desmarcar Todas' : 'Selecionar Todas'}
                                  </Button>
                                </div>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <div className="space-y-2">
                                  {ac.opcoes.map((op: any) => (
                                    <div 
                                      key={op.id} 
                                      className="flex items-start gap-3 p-3 bg-muted/30 hover:bg-muted/50 rounded-lg transition-all border border-transparent hover:border-border"
                                    >
                                      <Checkbox
                                        id={`opcao-${op.id}`}
                                        checked={opcoesSelecionadas.has(op.id)}
                                        onCheckedChange={() => toggleOpcao(op.id)}
                                        className="mt-1"
                                      />
                                      <label 
                                        htmlFor={`opcao-${op.id}`}
                                        className="flex-1 cursor-pointer space-y-1"
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="font-medium text-sm">{op.nome}</span>
                                        </div>
                                        <div className="flex items-center flex-wrap gap-2 text-xs">
                                          {Number(op.valor_adicional) > 0 && (
                                            <Badge variant="secondary" className="text-xs font-mono">
                                              +R$ {Number(op.valor_adicional).toFixed(2)}
                                            </Badge>
                                          )}
                                          {op.sku && (
                                            <Badge variant="outline" className="text-xs">
                                              SKU: {op.sku}
                                            </Badge>
                                          )}
                                          {op.codigo_barras && (
                                            <Badge variant="outline" className="text-xs">
                                              Código: {op.codigo_barras}
                                            </Badge>
                                          )}
                                          {Number(op.estoque) > 0 && (
                                            <Badge variant="outline" className="text-xs">
                                              Estoque: {op.estoque}
                                            </Badge>
                                          )}
                                        </div>
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between p-4 bg-primary/5 border-2 border-primary/20 rounded-lg">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            {calcularVariacoesPrevistas()} variação{calcularVariacoesPrevistas() !== 1 ? 'ões' : ''} será{calcularVariacoesPrevistas() !== 1 ? 'ão' : ''} gerada{calcularVariacoesPrevistas() !== 1 ? 's' : ''}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Combinando {opcoesSelecionadas.size} opção{opcoesSelecionadas.size !== 1 ? 'ões' : ''} selecionada{opcoesSelecionadas.size !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <Button 
                          onClick={() => {
                            aplicarTemplate();
                            setTimeout(() => {
                              const variacoesSection = document.querySelector('[data-variacoes-geradas]');
                              if (variacoesSection) {
                                variacoesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }
                            }, 100);
                          }} 
                          disabled={opcoesSelecionadas.size === 0}
                          size="lg"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Gerar Variações
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {atributos.length > 0 && modoVariacao === "manual" && (
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
        </div>
      )}

      {variacoes.length > 0 && (
        <Card data-variacoes-geradas>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Variações Geradas
                  <Badge variant="secondary" className="ml-2">
                    {variacoes.length} {variacoes.length === 1 ? 'variação' : 'variações'}
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-1">
                  Revise e edite cada variação individualmente antes de salvar
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPrecoEmMassa("0,00");
                          setShowPrecoDialog(true);
                        }}
                      >
                        <DollarSign className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Aplicar preço em massa</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEstoqueEmMassa("0");
                          setShowEstoqueDialog(true);
                        }}
                      >
                        <Package className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Aplicar estoque em massa</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setShowRemoverDialog(true)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Remover todas as variações</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead className="min-w-[250px]">
                      <div className="flex items-center gap-2">
                        <Edit2 className="h-4 w-4" />
                        Combinação
                      </div>
                    </TableHead>
                    <TableHead className="min-w-[150px]">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Preço Adicional
                      </div>
                    </TableHead>
                    <TableHead className="min-w-[180px]">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Código/SKU
                      </div>
                    </TableHead>
                    <TableHead className="min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Estoque
                      </div>
                    </TableHead>
                    <TableHead className="w-20 text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variacoes.map((variacao, index) => (
                    <TableRow 
                      key={variacao.id} 
                      className={`group hover:bg-muted/30 transition-colors ${
                        index % 2 === 0 ? "bg-muted/10" : "bg-background"
                      }`}
                    >
                      <TableCell className="text-center text-xs text-muted-foreground font-mono">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {variacao.combinacao}
                          </span>
                          {variacao.origemTemplate && (
                            <Badge variant="secondary" className="text-xs">
                              Template
                            </Badge>
                          )}
                          {variacao.id.startsWith('var-manual-') && (
                            <Badge variant="outline" className="text-xs">
                              Manual
                            </Badge>
                          )}
                          {variacao.modificado && (
                            <>
                              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50">
                                Modificado
                              </Badge>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center justify-center h-5 w-5 rounded-full bg-amber-100 dark:bg-amber-900/30">
                                      <Edit2 className="h-3 w-3 text-amber-600" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Modificado localmente (não será sobrescrito)</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="relative">
                          {(() => {
                            // Parsear o preço para número (formato pt-BR: "24,00" ou "-24,00")
                            const isNegativo = variacao.preco.startsWith('-');
                            const precoLimpo = variacao.preco.replace('-', '').replace(/\./g, '').replace(',', '.');
                            const precoNum = parseFloat(precoLimpo) || 0;
                            const precoFinal = isNegativo ? -precoNum : precoNum;
                            return (
                              <>
                                <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-xs z-10 ${isNegativo ? 'text-red-600' : 'text-muted-foreground'}`}>
                                  {isNegativo ? '-R$' : 'R$'}
                                </span>
                                <input
                                  className={`flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-2 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono ${isNegativo ? 'text-red-600' : ''}`}
                                  placeholder="0,00"
                            type="text"
                            inputMode="decimal"
                                  value={formatCurrency(String(Math.abs(precoNum) * 100))}
                            onChange={(e) => {
                                    const inputValue = e.target.value;
                                    if (inputValue.includes('-')) {
                                      // Toggle negativo - mantém formato pt-BR
                                      const newPreco = isNegativo 
                                        ? precoNum.toFixed(2).replace('.', ',')
                                        : `-${precoNum.toFixed(2).replace('.', ',')}`;
                                      atualizarVariacao(variacao.id, "preco", newPreco);
                                      return;
                                    }
                                    const numericValue = parseCurrencyToNumber(inputValue);
                                    // Salvar no formato pt-BR
                                    const newPreco = isNegativo 
                                      ? `-${numericValue.toFixed(2).replace('.', ',')}`
                                      : numericValue.toFixed(2).replace('.', ',');
                                    atualizarVariacao(variacao.id, "preco", newPreco);
                                  }}
                                />
                              </>
                            );
                          })()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={variacao.codigo}
                          onChange={(e) =>
                            atualizarVariacao(variacao.id, "codigo", e.target.value)
                          }
                          placeholder="SKU-001"
                          className="font-mono text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={variacao.estoque}
                          onChange={(e) =>
                            atualizarVariacao(variacao.id, "estoque", e.target.value)
                          }
                          placeholder="0"
                          min="0"
                          className="font-mono text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => duplicarVariacao(variacao)}
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Duplicar variação</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => removerVariacao(variacao.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Remover variação</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Resumo das variações */}
            <div className="p-4 bg-muted/30 border-t">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <BarChart3 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total de Variações</p>
                    <p className="font-semibold">{variacoes.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Variações com Preço</p>
                    <p className="font-semibold">
                      {variacoes.filter(v => Number(v.preco.replace(/[^\d,]/g, '').replace(',', '.')) > 0).length}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Estoque Total</p>
                    <p className="font-semibold">
                      {variacoes.reduce((sum, v) => sum + (Number(v.estoque) || 0), 0)} un.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog - Aplicar Preço em Massa */}
      <Dialog open={showPrecoDialog} onOpenChange={setShowPrecoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              Aplicar Preço em Massa
            </DialogTitle>
            <DialogDescription>
              O valor inserido será aplicado como preço adicional em todas as {variacoes.length} variações.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="preco-massa">Preço Adicional (R$)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  R$
                </span>
                <Input
                  id="preco-massa"
                  className="pl-10 text-lg font-mono"
                  placeholder="0,00"
                  value={precoEmMassa}
                  onChange={(e) => setPrecoEmMassa(formatCurrency(e.target.value))}
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Use valores positivos para acréscimo ou negativos para desconto
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">{variacoes.length}</strong> variações serão atualizadas
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPrecoDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                aplicarPrecoEmMassa(precoEmMassa);
                setShowPrecoDialog(false);
                toast({
                  title: "Preço aplicado",
                  description: `R$ ${precoEmMassa} aplicado em ${variacoes.length} variações.`,
                });
              }}
            >
              <Check className="mr-2 h-4 w-4" />
              Aplicar Preço
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog - Aplicar Estoque em Massa */}
      <Dialog open={showEstoqueDialog} onOpenChange={setShowEstoqueDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                <Package className="h-5 w-5 text-blue-500" />
              </div>
              Aplicar Estoque em Massa
            </DialogTitle>
            <DialogDescription>
              A quantidade inserida será aplicada como estoque em todas as {variacoes.length} variações.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="estoque-massa">Quantidade em Estoque</Label>
              <Input
                id="estoque-massa"
                type="number"
                min="0"
                className="text-lg font-mono"
                placeholder="0"
                value={estoqueEmMassa}
                onChange={(e) => setEstoqueEmMassa(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Informe a quantidade de itens disponíveis em estoque
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">{variacoes.length}</strong> variações serão atualizadas
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEstoqueDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                aplicarEstoqueEmMassa(estoqueEmMassa);
                setShowEstoqueDialog(false);
                toast({
                  title: "Estoque aplicado",
                  description: `Estoque de ${estoqueEmMassa} unidades aplicado em ${variacoes.length} variações.`,
                });
              }}
            >
              <Check className="mr-2 h-4 w-4" />
              Aplicar Estoque
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog - Remover Todas as Variações */}
      <AlertDialog open={showRemoverDialog} onOpenChange={setShowRemoverDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <span>Remover todas as variações?</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Esta ação irá remover permanentemente <strong className="text-foreground">{variacoes.length} variações</strong> deste produto.
              </p>
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                <p className="text-sm text-destructive">
                  <strong>Atenção:</strong> Esta ação não pode ser desfeita. Todas as configurações de preço, estoque e códigos serão perdidas.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setVariacoes([]);
                localStorage.removeItem('produto-form-variacoes-autosave');
                toast({
                  title: "Variações removidas",
                  description: "Todas as variações foram removidas com sucesso.",
                });
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Sim, remover tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
