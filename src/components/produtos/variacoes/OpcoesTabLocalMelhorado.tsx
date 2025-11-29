import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Pencil, Check, X, Info, Grid, List } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LocalAtributo, LocalOpcao } from "./ModalGerenciarVariacoes";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, parseCurrencyToNumber } from "@/utils/inputMasks";
import { cn } from "@/lib/utils";

interface OpcoesTabLocalProps {
  atributos: LocalAtributo[];
  opcoes: Map<string, LocalOpcao[]>;
  onOpcoesChange: (atributoId: string, opcoes: LocalOpcao[]) => void;
}

export function OpcoesTabLocalMelhorado({ atributos, opcoes, onOpcoesChange }: OpcoesTabLocalProps) {
  const [modoVisualizacao, setModoVisualizacao] = useState<"simples" | "composto">("simples");
  const [mostrarApenasNiveisFinais, setMostrarApenasNiveisFinais] = useState(false);
  const [atributoSelecionado, setAtributoSelecionado] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingOpcao, setEditingOpcao] = useState<Partial<LocalOpcao>>({});
  const [editingImageFile, setEditingImageFile] = useState<File | null>(null);
  const [editingImagePreview, setEditingImagePreview] = useState<string | null>(null);
  const [novaOpcao, setNovaOpcao] = useState({
    nome: "",
    sku: "",
    codigo_barras: "",
    valor_adicional: 0,
    estoque: 0,
    imagem_url: "",
  });
  const [nomeError, setNomeError] = useState(false);
  const nomeInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);

  // Estado para controlar se o valor é negativo
  const [isNegativo, setIsNegativo] = useState<boolean>(false);
  
  // Funções auxiliares para formatação de moeda com suporte a valores negativos
  // Usa o mesmo método da tela de cadastro de produtos (vírgula fixa, números da direita para esquerda)
  const formatCurrencyWithNegative = (value: number): string => {
    const isNeg = value < 0;
    const absoluteValue = Math.abs(value);
    // Multiplica por 100 para usar a função do sistema
    const formatted = formatCurrency(String(absoluteValue * 100));
    return isNeg ? `-${formatted}` : formatted;
  };

  const handleValorAdicionalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Verifica se o usuário está tentando tornar negativo (digitou "-")
    if (inputValue.includes('-')) {
      setIsNegativo(!isNegativo);
      return;
    }
    
    // Usa a função do sistema para formatar (mesmo comportamento do cadastro de produtos)
    const numericValue = parseCurrencyToNumber(inputValue);
    
    // Aplica o sinal negativo se necessário
    const finalValue = isNegativo ? -numericValue : numericValue;
    setNovaOpcao({ ...novaOpcao, valor_adicional: finalValue });
  };
  
  // Atualiza o estado de negativo quando o valor muda externamente
  useEffect(() => {
    if (novaOpcao.valor_adicional < 0 && !isNegativo) {
      setIsNegativo(true);
    } else if (novaOpcao.valor_adicional >= 0 && isNegativo && novaOpcao.valor_adicional !== 0) {
      // Mantém isNegativo se o valor for 0 (usuário pode estar começando a digitar)
    }
  }, [novaOpcao.valor_adicional]);

  // Componente auxiliar para label com contador
  const LabelWithCounter = ({ 
    label, 
    currentLength, 
    maxLength,
    required = false
  }: { 
    label: string; 
    currentLength: number; 
    maxLength: number;
    required?: boolean;
  }) => (
    <div className="flex items-center gap-2">
      <span>
        {required && <span className="text-red-500">* </span>}
        {label}:
      </span>
      <span className="text-xs text-muted-foreground">
        ({currentLength}/{maxLength})
      </span>
    </div>
  );

  // Obter todos os atributos em lista plana (incluindo filhos)
  const getAllAtributos = (attrs: LocalAtributo[]): LocalAtributo[] => {
    const result: LocalAtributo[] = [];
    attrs.forEach(attr => {
      result.push(attr);
      if (attr.filhos && attr.filhos.length > 0) {
        result.push(...getAllAtributos(attr.filhos));
      }
    });
    return result;
  };

  const atributosList = getAllAtributos(atributos);
  const opcoesAtributo = opcoes.get(atributoSelecionado) || [];

  // Função para obter apenas os níveis finais (folhas da árvore)
  const getNiveisFinais = (attrs: LocalAtributo[]): LocalAtributo[] => {
    const folhas: LocalAtributo[] = [];
    
    const buscarFolhas = (attr: LocalAtributo) => {
      if (!attr.filhos || attr.filhos.length === 0) {
        folhas.push(attr);
      } else {
        attr.filhos.forEach(buscarFolhas);
      }
    };

    attrs.forEach(buscarFolhas);
    return folhas;
  };

  // Função para obter o caminho completo de um atributo
  const getCaminhoCompleto = (attrId: string): string => {
    const encontrarCaminho = (attrs: LocalAtributo[], path: string[] = []): string[] | null => {
      for (const attr of attrs) {
        const currentPath = [...path, attr.nome];
        
        if (attr.id === attrId) {
          return currentPath;
        }
        
        if (attr.filhos && attr.filhos.length > 0) {
          const resultado = encontrarCaminho(attr.filhos, currentPath);
          if (resultado) return resultado;
        }
      }
      return null;
    };

    const caminho = encontrarCaminho(atributos);
    return caminho ? caminho.join(' > ') : '';
  };

  // Decidir quais atributos mostrar baseado no switch
  const atributosParaMostrar = mostrarApenasNiveisFinais 
    ? getNiveisFinais(atributos)
    : atributosList;

  // Cleanup de URLs de preview ao desmontar componente
  useEffect(() => {
    return () => {
      if (pendingImagePreview) {
        URL.revokeObjectURL(pendingImagePreview);
      }
      if (editingImagePreview) {
        URL.revokeObjectURL(editingImagePreview);
      }
    };
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione uma imagem nos formatos JPG, PNG, GIF ou WEBP.",
        variant: "destructive",
      });
      e.target.value = '';
      return;
    }

    // Validar tamanho do arquivo (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo permitido é 5MB.",
        variant: "destructive",
      });
      e.target.value = '';
      return;
    }

    // Criar preview temporário
    const previewUrl = URL.createObjectURL(file);

    if (pendingImagePreview) {
      URL.revokeObjectURL(pendingImagePreview);
    }
    setPendingImageFile(file);
    setPendingImagePreview(previewUrl);

    e.target.value = '';
  };

  // Função para selecionar imagem na edição
  const handleEditingImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione uma imagem nos formatos JPG, PNG, GIF ou WEBP.",
        variant: "destructive",
      });
      e.target.value = '';
      return;
    }

    // Validar tamanho do arquivo (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo permitido é 5MB.",
        variant: "destructive",
      });
      e.target.value = '';
      return;
    }

    // Criar preview temporário
    const previewUrl = URL.createObjectURL(file);

    if (editingImagePreview) {
      URL.revokeObjectURL(editingImagePreview);
    }
    setEditingImageFile(file);
    setEditingImagePreview(previewUrl);

    e.target.value = '';
  };

  // Função para remover imagem na edição
  const handleRemoveEditingImage = () => {
    if (editingImagePreview) {
      URL.revokeObjectURL(editingImagePreview);
    }
    setEditingImageFile(null);
    setEditingImagePreview(null);
    setEditingOpcao({ ...editingOpcao, imagem_url: '' });
  };

  const uploadImageToStorage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `variacoes/${fileName}`;

    const { data, error } = await supabase.storage
      .from('produtos-imagens')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('produtos-imagens')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleAddOpcao = async () => {
    if (!atributoSelecionado) {
      toast({
        title: "Selecione um atributo",
        description: "Por favor, selecione um atributo antes de adicionar uma opção.",
        variant: "destructive",
      });
      return;
    }

    if (!novaOpcao.nome.trim()) {
      setNomeError(true);
      nomeInputRef.current?.focus();
      toast({
        title: "Campo obrigatório",
        description: "O nome da opção é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    setNomeError(false);

    try {
      setUploadingImage(true);

      let imagemUrl = novaOpcao.imagem_url;
      if (pendingImageFile) {
        imagemUrl = await uploadImageToStorage(pendingImageFile);
        if (pendingImagePreview) {
          URL.revokeObjectURL(pendingImagePreview);
        }
      }

      const novaOpcaoObj: LocalOpcao = {
        id: `temp_${Date.now()}`,
        atributo_id: atributoSelecionado,
        nome: novaOpcao.nome,
        sku: novaOpcao.sku,
        codigo_barras: novaOpcao.codigo_barras,
        valor_adicional: novaOpcao.valor_adicional,
        estoque: novaOpcao.estoque,
        imagem_url: imagemUrl,
        ativo: true,
        ordem: opcoesAtributo.length,
      };

      onOpcoesChange(atributoSelecionado, [...opcoesAtributo, novaOpcaoObj]);

      setNovaOpcao({
        nome: "",
        sku: "",
        codigo_barras: "",
        valor_adicional: 0,
        estoque: 0,
        imagem_url: "",
      });
      setPendingImageFile(null);
      setPendingImagePreview(null);

      if (pendingImageFile) {
        toast({
          title: "Sucesso",
          description: "Valor adicionado com imagem!",
        });
      }
    } catch (error: any) {
      console.error("Erro ao adicionar opção:", error);
      toast({
        title: "Erro ao fazer upload da imagem",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDelete = (id: string) => {
    const updatedOpcoes = opcoesAtributo.filter(op => op.id !== id);
    onOpcoesChange(atributoSelecionado, updatedOpcoes);
  };

  // Calcular combinações possíveis (sempre usa níveis finais)
  const calcularCombinacoes = () => {
    const niveisFinais = getNiveisFinais(atributos);
    
    // Contar atributos raiz únicos
    const atributosRaizUnicos = new Set<string>();
    niveisFinais.forEach(attr => {
      let current = attr;
      while (current.pai_id) {
        const pai = findAtributoRecursivo(atributos, current.pai_id);
        if (pai) {
          current = pai;
        } else {
          break;
        }
      }
      atributosRaizUnicos.add(current.id);
    });
    
    const numAtributosRaiz = atributosRaizUnicos.size;
    
    // Se tiver apenas 1 atributo raiz, retornar o total de valores ativos
    if (numAtributosRaiz <= 1) {
      let total = 0;
      niveisFinais.forEach(attr => {
        const attrOpcoes = opcoes.get(attr.id) || [];
        total += attrOpcoes.filter(o => o.ativo).length;
      });
      return total;
    }
    
    // Se tiver 2 ou mais atributos raiz, calcular todas as combinações possíveis
    // Agrupar folhas por atributo raiz e contar valores ativos
    const valoresPorRaiz = new Map<string, number>();
    niveisFinais.forEach(attr => {
      let raiz = attr;
      while (raiz.pai_id) {
        const pai = findAtributoRecursivo(atributos, raiz.pai_id);
        if (pai) {
          raiz = pai;
        } else {
          break;
        }
      }
      
      const attrOpcoes = opcoes.get(attr.id) || [];
      const ativos = attrOpcoes.filter(o => o.ativo).length;
      
      if (ativos > 0) {
        const currentCount = valoresPorRaiz.get(raiz.id) || 0;
        valoresPorRaiz.set(raiz.id, currentCount + ativos);
      }
    });
    
    const valoresArray = Array.from(valoresPorRaiz.values());
    let totalCombinacoes = 0;
    
    // Somar variações simples
    valoresArray.forEach(valor => {
      totalCombinacoes += valor;
    });
    
    // Calcular e somar todas as combinações de 2, 3, 4, ... atributos
    const calcularProdutosDeCombinacoes = (indices: number[]): number => {
      return indices.reduce((produto, idx) => produto * valoresArray[idx], 1);
    };
    
    const gerarCombinacoes = (tamanho: number): number => {
      let soma = 0;
      const combinar = (start: number, atual: number[]) => {
        if (atual.length === tamanho) {
          soma += calcularProdutosDeCombinacoes(atual);
          return;
        }
        for (let i = start; i < valoresArray.length; i++) {
          combinar(i + 1, [...atual, i]);
        }
      };
      combinar(0, []);
      return soma;
    };
    
    // Para cada tamanho de combinação (2, 3, 4, ...)
    for (let tamanho = 2; tamanho <= valoresArray.length; tamanho++) {
      totalCombinacoes += gerarCombinacoes(tamanho);
    }
    
    return totalCombinacoes;
  };
  
  // Função auxiliar para encontrar atributo recursivamente
  const findAtributoRecursivo = (attrs: LocalAtributo[], id: string): LocalAtributo | null => {
    for (const attr of attrs) {
      if (attr.id === id) return attr;
      if (attr.filhos && attr.filhos.length > 0) {
        const found = findAtributoRecursivo(attr.filhos, id);
        if (found) return found;
      }
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header com alternância de modo */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle>Valores dos Atributos</CardTitle>
              <CardDescription className="mt-2">
                {modoVisualizacao === "simples" 
                  ? "Adicione valores para cada atributo individualmente"
                  : "Visualize todos os atributos e suas variações compostas"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              {modoVisualizacao === "composto" && (
                <div className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-muted/30">
                  <Label className="text-sm font-normal cursor-pointer whitespace-nowrap" htmlFor="niveis-finais">
                    Apenas níveis finais
                  </Label>
                  <Switch
                    id="niveis-finais"
                    checked={mostrarApenasNiveisFinais}
                    onCheckedChange={setMostrarApenasNiveisFinais}
                  />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button
                  variant={modoVisualizacao === "simples" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setModoVisualizacao("simples")}
                >
                  <List className="h-4 w-4 mr-2" />
                  Valores simples
                </Button>
                <Button
                  variant={modoVisualizacao === "composto" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setModoVisualizacao("composto")}
                >
                  <Grid className="h-4 w-4 mr-2" />
                  Valores Compostos
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {modoVisualizacao === "simples" ? (
        /* MODO SIMPLES - Interface original melhorada */
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Selecionar Atributo para Adicionar/Editar Valores</CardTitle>
              <span className="text-muted-foreground text-xs block mt-2">
                Escolha o Atributo para adicionar ou editar Valores. Ex: [Atributo]: Tamanho. E [Valores]: P, M, G e GG.
                <br />
                É recomendado sempre escolher o nível final (com maior numeração) para definir os Valores dos Atributos.
              </span>
            </CardHeader>
            <CardContent>
              <select
                value={atributoSelecionado}
                onChange={(e) => setAtributoSelecionado(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="" className="bg-background text-muted-foreground">Selecione um atributo...</option>
                {atributosList.map(attr => {
                  const espacos = '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0'.repeat(attr.nivel);
                  const simbolo = attr.nivel === 0 ? '●' : attr.nivel === 1 ? '○' : '▪';
                  return (
                    <option 
                      key={attr.id} 
                      value={attr.id}
                      className="bg-background text-foreground py-2"
                      style={{
                        paddingLeft: `${attr.nivel * 80 + 8}px`,
                        fontWeight: attr.nivel === 0 ? '600' : attr.nivel === 1 ? '500' : '400'
                      }}
                    >
                      {espacos}{simbolo} {attr.nome} (Nível {attr.nivel})
                    </option>
                  );
                })}
              </select>
            </CardContent>
          </Card>

          {/* Seção de Valores Cadastrados - Exibição Automática */}
          {atributosList.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Valores Cadastrados</CardTitle>
                <span className="text-muted-foreground text-xs block mt-2">
                  Visualização de todos os valores cadastrados, organizados por atributo.
                </span>
              </CardHeader>
              <CardContent className="space-y-6">
                {atributosList.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum atributo cadastrado ainda.
                  </p>
                ) : (
                  atributosList.map(atributo => {
                    const opcoesDoAtributo = opcoes.get(atributo.id) || [];
                    return (
                      <div key={atributo.id} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-sm flex items-center gap-2">
                            <span className="text-muted-foreground">{"─".repeat(atributo.nivel)}</span>
                            {atributo.nome} 
                            <span className="text-muted-foreground font-normal">(Nível {atributo.nivel})</span>
                          </h3>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAtributoSelecionado(atributo.id)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Adicionar Valor
                          </Button>
                        </div>
                        
                        {opcoesDoAtributo.length === 0 ? (
                          <p className="text-sm text-muted-foreground italic pl-4">
                            Nenhum valor cadastrado
                          </p>
                        ) : (
                          <div className="border rounded-lg overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Nome</TableHead>
                                  <TableHead>SKU</TableHead>
                                  <TableHead>Cód. Barras</TableHead>
                                  <TableHead>Valor</TableHead>
                                  <TableHead>Estoque</TableHead>
                                  <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {opcoesDoAtributo.map(opcao => (
                                  <TableRow key={opcao.id}>
                                    <TableCell className="font-medium">{opcao.nome}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">{opcao.sku || "-"}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">{opcao.codigo_barras || "-"}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                      {opcao.valor_adicional !== 0 ? `${opcao.valor_adicional > 0 ? '+' : ''}R$ ${opcao.valor_adicional.toFixed(2)}` : "-"}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">{opcao.estoque || 0}</TableCell>
                                    <TableCell className="text-right">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setAtributoSelecionado(atributo.id);
                                        }}
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          )}

          {atributoSelecionado && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Adicionar Novo Valor</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Linha 1: Valor do Atributo e SKU */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>
                        <LabelWithCounter
                          label="Valor do Atributo"
                          currentLength={novaOpcao.nome.length}
                          maxLength={100}
                          required={true}
                        />
                      </Label>
                      <Input
                        ref={nomeInputRef}
                        placeholder="Ex: Couché brilho"
                        value={novaOpcao.nome}
                        maxLength={100}
                        onChange={(e) => {
                          setNovaOpcao({ ...novaOpcao, nome: e.target.value });
                          if (nomeError && e.target.value.trim()) {
                            setNomeError(false);
                          }
                        }}
                        className={nomeError ? "border-red-500 focus-visible:ring-red-500" : ""}
                      />
                      {nomeError && (
                        <p className="text-sm text-red-500">Este campo é obrigatório</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>
                        <LabelWithCounter
                          label="SKU"
                          currentLength={novaOpcao.sku.length}
                          maxLength={50}
                        />
                      </Label>
                      <Input
                        placeholder="Ex: CB-90G"
                        value={novaOpcao.sku}
                        maxLength={50}
                        onChange={(e) => setNovaOpcao({ ...novaOpcao, sku: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Linha 2: Código de Barras, Valor Adicional e Estoque */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="space-y-2">
                      <Label>
                        <LabelWithCounter
                          label="Código de Barras"
                          currentLength={novaOpcao.codigo_barras.length}
                          maxLength={50}
                        />
                      </Label>
                      <Input
                        placeholder="Ex: 7891234567890"
                        value={novaOpcao.codigo_barras}
                        maxLength={50}
                        onChange={(e) => setNovaOpcao({ ...novaOpcao, codigo_barras: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Valor Adicional:</Label>
                      <div className="flex items-center gap-2 h-10">
                        <div className="relative flex-1 h-full">
                          <span className={`absolute left-3 top-1/2 -translate-y-1/2 z-10 text-sm ${isNegativo ? 'text-red-600' : 'text-muted-foreground'}`}>
                            {isNegativo ? '-R$' : 'R$'}
                          </span>
                          <input
                            className={`flex h-full w-full rounded-md border border-input bg-background pl-11 pr-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm ${isNegativo ? 'text-red-600' : ''}`}
                            placeholder="0,00"
                            type="text"
                            inputMode="decimal"
                            value={formatCurrency(String(Math.abs(novaOpcao.valor_adicional) * 100))}
                            onChange={handleValorAdicionalChange}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsNegativo(!isNegativo);
                            setNovaOpcao({ 
                              ...novaOpcao, 
                              valor_adicional: -novaOpcao.valor_adicional 
                            });
                          }}
                          className={`h-full w-10 rounded-md border text-lg font-medium transition-colors flex items-center justify-center flex-shrink-0 ${
                            isNegativo 
                              ? 'bg-red-100 border-red-300 text-red-700 hover:bg-red-200' 
                              : 'bg-muted border-input text-muted-foreground hover:bg-accent'
                          }`}
                          title={isNegativo ? "Tornar positivo" : "Tornar negativo (desconto)"}
                        >
                          {isNegativo ? '−' : '+'}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Estoque:</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={novaOpcao.estoque}
                        onChange={(e) => setNovaOpcao({ ...novaOpcao, estoque: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  {/* Linha 3: Upload de Imagem - Modernizado */}
                  <div className="space-y-2">
                    <Label>Imagem alternativa (opcional)</Label>
                    <div 
                      className={`relative border-2 border-dashed rounded-lg transition-all ${
                        pendingImagePreview 
                          ? 'border-primary bg-primary/5' 
                          : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      {pendingImagePreview ? (
                        <div className="flex items-center gap-4 p-4">
                          <div className="relative w-20 h-20 rounded-lg overflow-hidden border bg-muted flex-shrink-0">
                            <img 
                              src={pendingImagePreview} 
                              alt="Preview" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {pendingImageFile?.name || 'Imagem selecionada'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {pendingImageFile ? `${(pendingImageFile.size / 1024).toFixed(1)} KB` : ''}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              if (pendingImagePreview) {
                                URL.revokeObjectURL(pendingImagePreview);
                              }
                              setPendingImageFile(null);
                              setPendingImagePreview(null);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center py-6 cursor-pointer">
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                            <Plus className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <p className="text-sm font-medium text-foreground">
                            Clique para selecionar uma imagem
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            JPG, PNG, GIF ou WEBP • Máximo 5MB
                          </p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageSelect}
                            className="hidden"
                            disabled={uploadingImage}
                          />
                        </label>
                      )}
                      {uploadingImage && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                          <p className="text-sm text-primary animate-pulse">Enviando imagem...</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Botão Adicionar */}
                  <Button onClick={handleAddOpcao} className="w-full" size="lg">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Valor
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Valores Cadastrados</CardTitle>
                </CardHeader>
                <CardContent>
                  {opcoesAtributo.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum valor cadastrado para este atributo.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {opcoesAtributo.map((opcao) => (
                        <div key={opcao.id} className="border rounded-lg overflow-hidden">
                          {editingId === opcao.id ? (
                            /* Modo de Edição */
                            <div className="p-4 bg-muted/30 space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label className="text-sm">Valor do Atributo *</Label>
                                  <Input
                                    value={editingOpcao.nome || ''}
                                    onChange={(e) => setEditingOpcao({ ...editingOpcao, nome: e.target.value })}
                                    placeholder="Nome do valor"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-sm">SKU</Label>
                                  <Input
                                    value={editingOpcao.sku || ''}
                                    onChange={(e) => setEditingOpcao({ ...editingOpcao, sku: e.target.value })}
                                    placeholder="SKU"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                <div className="space-y-2">
                                  <Label className="text-sm">Código de Barras</Label>
                                  <Input
                                    value={editingOpcao.codigo_barras || ''}
                                    onChange={(e) => setEditingOpcao({ ...editingOpcao, codigo_barras: e.target.value })}
                                    placeholder="Código de barras"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-sm">Valor Adicional</Label>
                                  <div className="flex items-center gap-2 h-10">
                                    <div className="relative flex-1 h-full">
                                      <span className={`absolute left-3 top-1/2 -translate-y-1/2 z-10 text-sm ${(editingOpcao.valor_adicional || 0) < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                                        {(editingOpcao.valor_adicional || 0) < 0 ? '-R$' : 'R$'}
                                      </span>
                                      <input
                                        className={`flex h-full w-full rounded-md border border-input bg-background pl-11 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${(editingOpcao.valor_adicional || 0) < 0 ? 'text-red-600' : ''}`}
                                        placeholder="0,00"
                                        type="text"
                                        inputMode="decimal"
                                        value={formatCurrency(String(Math.abs(editingOpcao.valor_adicional || 0) * 100))}
                                        onChange={(e) => {
                                          const inputValue = e.target.value;
                                          if (inputValue.includes('-')) {
                                            setEditingOpcao({ ...editingOpcao, valor_adicional: -(editingOpcao.valor_adicional || 0) });
                                            return;
                                          }
                                          const numericValue = parseCurrencyToNumber(inputValue);
                                          const isCurrentlyNegative = (editingOpcao.valor_adicional || 0) < 0;
                                          setEditingOpcao({ ...editingOpcao, valor_adicional: isCurrentlyNegative ? -numericValue : numericValue });
                                        }}
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setEditingOpcao({ ...editingOpcao, valor_adicional: -(editingOpcao.valor_adicional || 0) })}
                                      className={`h-full w-10 rounded-md border text-lg font-medium transition-colors flex items-center justify-center flex-shrink-0 ${
                                        (editingOpcao.valor_adicional || 0) < 0
                                          ? 'bg-red-100 border-red-300 text-red-700 hover:bg-red-200' 
                                          : 'bg-muted border-input text-muted-foreground hover:bg-accent'
                                      }`}
                                      title={(editingOpcao.valor_adicional || 0) < 0 ? "Tornar positivo" : "Tornar negativo"}
                                    >
                                      {(editingOpcao.valor_adicional || 0) < 0 ? '−' : '+'}
                                    </button>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-sm">Estoque</Label>
                                  <Input
                                    type="number"
                                    value={editingOpcao.estoque || 0}
                                    onChange={(e) => setEditingOpcao({ ...editingOpcao, estoque: parseInt(e.target.value) || 0 })}
                                    placeholder="0"
                                  />
                                </div>
                              </div>

                              {/* Campo de Imagem */}
                              <div className="space-y-2">
                                <Label className="text-sm">Imagem alternativa</Label>
                                <div
                                  className={cn(
                                    "flex items-center gap-4 p-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                                    "hover:border-primary/50",
                                    (editingImagePreview || editingOpcao.imagem_url) ? "border-primary/50" : "border-muted-foreground/30"
                                  )}
                                  onClick={() => document.getElementById(`edit-file-upload-${opcao.id}`)?.click()}
                                >
                                  <input
                                    id={`edit-file-upload-${opcao.id}`}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleEditingImageSelect}
                                    className="hidden"
                                  />
                                  
                                  {editingImagePreview ? (
                                    <>
                                      <div className="relative w-16 h-16 flex-shrink-0 border rounded-md overflow-hidden">
                                        <img src={editingImagePreview} alt="Preview" className="w-full h-full object-cover" />
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-sm font-medium truncate">{editingImageFile?.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {editingImageFile ? (editingImageFile.size / 1024).toFixed(1) + ' KB' : ''}
                                        </p>
                                        <p className="text-xs text-amber-600 mt-1">Nova imagem (será enviada ao salvar)</p>
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => { e.stopPropagation(); handleRemoveEditingImage(); }}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </>
                                  ) : editingOpcao.imagem_url ? (
                                    <>
                                      <div className="relative w-16 h-16 flex-shrink-0 border rounded-md overflow-hidden">
                                        <img src={editingOpcao.imagem_url} alt="Imagem atual" className="w-full h-full object-cover" />
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-sm text-muted-foreground">Imagem atual</p>
                                        <p className="text-xs text-muted-foreground">Clique para substituir</p>
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => { e.stopPropagation(); handleRemoveEditingImage(); }}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                        <Plus className="h-5 w-5" />
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-sm">Clique para selecionar uma imagem</p>
                                        <p className="text-xs text-muted-foreground">JPG, PNG, GIF, WEBP (Máx. 5MB)</p>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="flex justify-end gap-2 pt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingId(null);
                                    setEditingOpcao({});
                                    if (editingImagePreview) {
                                      URL.revokeObjectURL(editingImagePreview);
                                    }
                                    setEditingImageFile(null);
                                    setEditingImagePreview(null);
                                  }}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Cancelar
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    if (!editingOpcao.nome?.trim()) {
                                      toast({
                                        title: "Campo obrigatório",
                                        description: "O nome do valor é obrigatório",
                                        variant: "destructive"
                                      });
                                      return;
                                    }
                                    
                                    // Preparar a opção atualizada
                                    const updatedOpcaoData = { ...editingOpcao };
                                    
                                    // Se há uma nova imagem selecionada, guardar referência
                                    // A imagem será enviada ao Supabase apenas ao clicar em Salvar/Salvar e Sair
                                    if (editingImageFile) {
                                      (updatedOpcaoData as any).pendingImageFile = editingImageFile;
                                      updatedOpcaoData.imagem_url = editingImagePreview || '';
                                    }
                                    
                                    const updatedOpcoes = opcoesAtributo.map(op => 
                                      op.id === editingId 
                                        ? { ...op, ...updatedOpcaoData } as LocalOpcao
                                        : op
                                    );
                                    onOpcoesChange(atributoSelecionado, updatedOpcoes);
                                    setEditingId(null);
                                    setEditingOpcao({});
                                    setEditingImageFile(null);
                                    setEditingImagePreview(null);
                                    toast({
                                      title: "Valor atualizado",
                                      description: "As alterações foram salvas localmente"
                                    });
                                  }}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Salvar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            /* Modo de Visualização */
                            <div className="flex items-center justify-between p-3">
                              {/* Miniatura da imagem se existir */}
                              {(opcao.imagem_url || (opcao as any).pendingImageFile) && (
                                <div className="w-12 h-12 flex-shrink-0 border rounded-md overflow-hidden mr-3">
                                  <img 
                                    src={opcao.imagem_url} 
                                    alt={opcao.nome} 
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                              <div className="flex-1">
                                <p className="font-medium">{opcao.nome}</p>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                                  {opcao.sku && <span>SKU: {opcao.sku}</span>}
                                  {opcao.codigo_barras && <span>Cód: {opcao.codigo_barras}</span>}
                                  {opcao.valor_adicional !== 0 && (
                                    <span className={opcao.valor_adicional > 0 ? "text-green-600" : "text-red-600"}>
                                      {opcao.valor_adicional > 0 ? '+' : '-'}R$ {formatCurrencyWithNegative(Math.abs(opcao.valor_adicional))}
                                    </span>
                                  )}
                                  <span>Estoque: {opcao.estoque}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    // Limpar estados de imagem anteriores
                                    if (editingImagePreview) {
                                      URL.revokeObjectURL(editingImagePreview);
                                    }
                                    setEditingImageFile(null);
                                    setEditingImagePreview(null);
                                    
                                    setEditingId(opcao.id);
                                    setEditingOpcao({
                                      nome: opcao.nome,
                                      sku: opcao.sku,
                                      codigo_barras: opcao.codigo_barras,
                                      valor_adicional: opcao.valor_adicional,
                                      estoque: opcao.estoque,
                                      imagem_url: opcao.imagem_url
                                    });
                                  }}
                                  title="Editar valor"
                                >
                                  <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(opcao.id)}
                                  title="Excluir valor"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      ) : (
        /* MODO COMPOSTO - Visualização de variações compostas */
        <div className="space-y-6">
          {/* Resumo de Combinações */}
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Variações Compostas</CardTitle>
                  <CardDescription className="mt-2">
                    Visualize como os atributos se combinam para criar variações
                  </CardDescription>
                </div>
                <Badge variant="default" className="text-lg px-4 py-2">
                  {calcularCombinacoes()} combinações possíveis
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Grid de Atributos */}
          {atributosParaMostrar.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Info className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground font-medium">
                  {mostrarApenasNiveisFinais 
                    ? "Nenhum nível final encontrado" 
                    : "Nenhum atributo cadastrado"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {mostrarApenasNiveisFinais
                    ? "Todos os atributos têm subatributos. Adicione valores nos níveis finais."
                    : "Vá para a aba 'Atributos' para adicionar atributos"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {atributosParaMostrar.map(attr => {
                const attrOpcoes = opcoes.get(attr.id) || [];
                const ativos = attrOpcoes.filter(o => o.ativo).length;
                const caminhoCompleto = mostrarApenasNiveisFinais ? (getCaminhoCompleto(attr.id) || attr.nome) : attr.nome;
                
                return (
                  <Card key={attr.id} className="border-2">
                    <CardHeader className="pb-3">
                      <div className="flex-1">
                        {mostrarApenasNiveisFinais ? (
                          <>
                            <CardDescription className="text-xs mb-1">
                              {caminhoCompleto}
                            </CardDescription>
                            <CardTitle className="text-lg">{attr.nome}</CardTitle>
                          </>
                        ) : (
                          <>
                            <CardTitle className="text-lg">{attr.nome}</CardTitle>
                            {attr.nivel > 0 && (
                              <CardDescription>Nível {attr.nivel}</CardDescription>
                            )}
                          </>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {attrOpcoes.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">
                          Sem valores cadastrados
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {attrOpcoes.map(opcao => (
                            <Badge
                              key={opcao.id}
                              variant={opcao.ativo ? "default" : "secondary"}
                              className="px-3 py-1"
                            >
                              {opcao.nome}
                              {opcao.valor_adicional !== 0 && (
                                <span className={`ml-1 text-xs ${opcao.valor_adicional < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  {opcao.valor_adicional > 0 ? '+' : '-'}R$ {formatCurrencyWithNegative(Math.abs(opcao.valor_adicional))}
                                </span>
                              )}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-3"
                        onClick={() => {
                          setAtributoSelecionado(attr.id);
                          setModoVisualizacao("simples");
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Gerenciar Valores
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Exemplo de Combinações */}
          {atributosParaMostrar.length > 1 && calcularCombinacoes() > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Como Funciona?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <p className="text-muted-foreground">
                    O sistema gera todas as combinações possíveis de atributos:
                  </p>
                  <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                    {(() => {
                      // Agrupar atributos por raiz e contar valores
                      const valoresPorAtributo: { nome: string; valores: number }[] = [];
                      const atributosRaizVistos = new Set<string>();
                      
                      atributosParaMostrar.forEach(attr => {
                        let raiz = attr;
                        while (raiz.pai_id) {
                          const pai = findAtributoRecursivo(atributos, raiz.pai_id);
                          if (pai) raiz = pai;
                          else break;
                        }
                        
                        if (!atributosRaizVistos.has(raiz.id)) {
                          atributosRaizVistos.add(raiz.id);
                          const attrOpcoes = opcoes.get(attr.id) || [];
                          const ativos = attrOpcoes.filter(o => o.ativo).length;
                          const nome = mostrarApenasNiveisFinais ? (getCaminhoCompleto(attr.id) || attr.nome) : attr.nome;
                          valoresPorAtributo.push({ nome, valores: ativos });
                        }
                      });
                      
                      const totalSimples = valoresPorAtributo.reduce((sum, v) => sum + v.valores, 0);
                      
                      return (
                        <>
                          <div className="text-xs">
                            <strong>Simples:</strong> {valoresPorAtributo.map(v => `${v.valores}`).join(' + ')} = {totalSimples}
                          </div>
                          {valoresPorAtributo.length >= 2 && (
                            <div className="text-xs">
                              <strong>Combinadas:</strong> {(() => {
                                const exemplos: string[] = [];
                                if (valoresPorAtributo.length === 2) {
                                  const [a, b] = valoresPorAtributo;
                                  exemplos.push(`${a.valores}×${b.valores} = ${a.valores * b.valores}`);
                                } else if (valoresPorAtributo.length === 3) {
                                  const [a, b, c] = valoresPorAtributo;
                                  exemplos.push(`${a.valores}×${b.valores} + ${a.valores}×${c.valores} + ${b.valores}×${c.valores} + ${a.valores}×${b.valores}×${c.valores}`);
                                } else {
                                  exemplos.push('múltiplas combinações');
                                }
                                return exemplos.join(' + ');
                              })()}
                            </div>
                          )}
                          <div className="text-xs font-semibold pt-2 border-t border-muted-foreground/20">
                            <strong>TOTAL:</strong> {calcularCombinacoes()} variações
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  {mostrarApenasNiveisFinais && (
                    <p className="text-xs text-muted-foreground italic">
                      💡 Mostrando apenas os níveis finais da árvore de atributos
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

