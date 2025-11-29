import { UseFormReturn } from "react-hook-form";
import { useState, useEffect, useRef } from "react";
import { Info, AlertTriangle, X, Plus, Minus, Settings } from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CategoriasMultiSelect } from "../CategoriasMultiSelect";
import { CategoriasManagerModal } from "../CategoriasManagerModal";
import { formatCurrencyWithSymbol, formatNumeric, limitText, parseCurrencyToNumber, formatPercentage, parsePercentageToNumber, formatBRL } from "@/utils/inputMasks";
import { useUnidadesMedida } from "@/hooks/useUnidadesMedida";
import { ModalGerenciarUnidades } from "../ModalGerenciarUnidades";
import { UnidadeMedidaCombobox } from "../UnidadeMedidaCombobox";

interface DadosBasicosStepSimplificadoProps {
  form: UseFormReturn<any>;
}

export function DadosBasicosStepSimplificado({ form }: DadosBasicosStepSimplificadoProps) {
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const { unidades, loading: loadingUnidades, fetchUnidades } = useUnidadesMedida();
  const [modalUnidadesOpen, setModalUnidadesOpen] = useState(false);
  const tipoDescontoForm = form.watch("tipo_desconto") || "porcentagem";
  const [tipoDesconto, setTipoDesconto] = useState<"valor" | "porcentagem">(tipoDescontoForm);
  
  // Debug: Verificar estado do campo unidade_medida
  useEffect(() => {
    const unidadeAtual = form.watch("unidade_medida");
    console.log('🔧 Unidade de medida atual no form:', unidadeAtual);
    console.log('🔧 Unidades disponíveis:', unidades.map(u => ({ sigla: u.sigla, nome: u.nome })));
    console.log('🔧 Loading unidades:', loadingUnidades);
  }, [form.watch("unidade_medida"), unidades, loadingUnidades]);
  
  const precoRaw = form.watch("preco");
  const descontoRaw = form.watch("desconto");
  const custoRaw = form.watch("custo");
  const margemLucro = form.watch("margem_lucro");

  // Recarregar unidades quando o modal for fechado
  const prevModalOpenRef = useRef(modalUnidadesOpen);
  useEffect(() => {
    // Só recarrega se o modal estava aberto e agora fechou
    if (prevModalOpenRef.current && !modalUnidadesOpen) {
      console.log('🔄 Modal de unidades fechado, recarregando lista...');
      fetchUnidades();
    }
    prevModalOpenRef.current = modalUnidadesOpen;
  }, [modalUnidadesOpen, fetchUnidades]);
  
  // Sincronizar tipoDesconto com o formulário
  useEffect(() => {
    if (tipoDescontoForm !== tipoDesconto) {
      setTipoDesconto(tipoDescontoForm);
    }
  }, [tipoDescontoForm, tipoDesconto]);
  
  const descontoNormalizado = tipoDesconto === "porcentagem"
    ? parsePercentageToNumber(descontoRaw || 0)
    : parseCurrencyToNumber(descontoRaw || 0);

  // Calcular desconto convertido para exibição
  const preco = parseCurrencyToNumber(precoRaw || 0);
  const descontoConvertido = tipoDesconto === "porcentagem"
    ? (preco * descontoNormalizado / 100) // De % para R$
    : preco > 0 ? (descontoNormalizado / preco * 100) : 0; // De R$ para %
  
  // Verificar se margem é negativa
  const margemNegativa = parsePercentageToNumber(margemLucro || "0") < 0;

  // Calcular preço final com desconto e margem de lucro
  useEffect(() => {
    const preco = parseCurrencyToNumber(precoRaw || 0);
    const custo = parseCurrencyToNumber(custoRaw || 0);
    const desconto = descontoNormalizado || 0;

    let precoFinal = preco;

    if (desconto > 0) {
      precoFinal = tipoDesconto === "porcentagem"
        ? preco - (preco * desconto / 100)
        : preco - desconto;
    }

    const precoFinalNormalizado = Math.max(0, Number(precoFinal.toFixed(2)));
    if (form.getValues("preco_final") !== precoFinalNormalizado) {
      form.setValue("preco_final", precoFinalNormalizado);
    }

    if (preco > 0) {
      const margemCalculada = ((preco - custo) / preco) * 100;
      const margemFormatada = formatPercentage(margemCalculada);
      if (form.getValues("margem_lucro") !== margemFormatada) {
        form.setValue("margem_lucro", margemFormatada);
      }
    }
  }, [precoRaw, descontoNormalizado, custoRaw, tipoDesconto, form]);

  const handleCloseCategoryManager = () => {
    setShowCategoryManager(false);
  };

  const handleSelectCategory = (categoriaId: string) => {
    const currentCategories = form.getValues("categorias_ids") || [];
    if (!currentCategories.includes(categoriaId)) {
      form.setValue("categorias_ids", [...currentCategories, categoriaId]);
    }
    setShowCategoryManager(false);
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Dados Básicos</h3>
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              (*) Campos Obrigatórios
            </p>
            <FormField
              control={form.control}
              name="ativo"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="!mt-0">Produto ativo</FormLabel>
                </FormItem>
              )}
            />
          </div>
        </div>
        
        <div className="space-y-6">
          {/* Grupo: Produto */}
          <div className="border border-border rounded-lg p-4 bg-card">
            <h3 className="text-sm font-semibold text-foreground mb-4">Produto</h3>
            
            <div className="space-y-2">
              {/* Linha 1: Nome do Produto | Categoria */}
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => {
                    const currentLength = field.value?.length || 0;
                    return (
                      <FormItem>
                        <FormLabel>
                          * Nome do Produto <span className="text-muted-foreground text-xs ml-1">({currentLength}/150)</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Digite o nome do produto" 
                            {...field}
                            maxLength={150}
                            value={field.value || ''}
                            onChange={(e) => field.onChange(limitText(e.target.value, 150))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <div>
                  <CategoriasMultiSelect
                    form={form}
                    onOpenCategoryManager={() => setShowCategoryManager(true)}
                  />
                </div>
              </div>

              {/* Linha 2: Unidade de Medida | Código de Barras/SKU */}
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="unidade_medida"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <FormLabel>* Unidade de Medida:</FormLabel>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          title="Gerenciar unidades de medida"
                          onClick={() => setModalUnidadesOpen(true)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                      <UnidadeMedidaCombobox
                        unidades={unidades}
                        loading={loadingUnidades}
                        value={field.value}
                        onValueChange={field.onChange}
                        onOpenSettings={() => setModalUnidadesOpen(true)}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="codigo_barras"
                  render={({ field }) => {
                    const currentLength = field.value?.length || 0;
                    return (
                      <FormItem>
                        <FormLabel>
                          Código de Barras/SKU <span className="text-muted-foreground text-xs ml-1">({currentLength}/50)</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Digite o código de barras ou SKU" 
                            {...field}
                            maxLength={50}
                            value={field.value || ''}
                            onChange={(e) => field.onChange(limitText(e.target.value, 50))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>
            </div>
          </div>


          {/* Grupo: Preços e Descontos */}
          <div className="border border-border rounded-lg p-4 bg-card">
            <h3 className="text-sm font-semibold text-foreground mb-4">Preços e Descontos</h3>
            
            <div className="grid grid-cols-3 gap-3">
              {/* Coluna esquerda: Campos de preço, desconto e margem */}
              <div className="col-span-2 space-y-2">
                {/* Linha 1: Preço de Venda | Custo do Produto */}
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name="preco"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço de Venda</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ? formatBRL(field.value) : "R$ 0,00"}
                            onChange={(e) => {
                              const numericValue = parseCurrencyToNumber(e.target.value);
                              field.onChange(numericValue);
                            }}
                            placeholder="R$ 0,00"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="custo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custo do Produto</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ? formatBRL(field.value) : "R$ 0,00"}
                            onChange={(e) => {
                              const numericValue = parseCurrencyToNumber(e.target.value);
                              field.onChange(numericValue);
                            }}
                            placeholder="R$ 0,00"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Linha 2: Campo de Desconto | Margem de Lucro */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <FormField
                      control={form.control}
                      name="tipo_desconto"
                      render={({ field }) => (
                        <FormItem className="space-y-0 mb-1">
                          <FormLabel>Desconto por:</FormLabel>
                          <FormControl>
                            <RadioGroup
                              value={field.value || "porcentagem"}
                              onValueChange={(value) => {
                                const novoTipo = value as "porcentagem" | "valor";
                                const descontoAtual = form.getValues("desconto");
                                const preco = parseCurrencyToNumber(precoRaw || 0);
                                
                                // Converter o desconto atual para o novo tipo
                                if (descontoAtual && preco > 0) {
                                  if (novoTipo === "porcentagem" && tipoDesconto === "valor") {
                                    // Converter de valor para porcentagem
                                    const valorDesconto = parseCurrencyToNumber(descontoAtual);
                                    const porcentagem = (valorDesconto / preco) * 100;
                                    form.setValue("desconto", formatPercentage(porcentagem));
                                  } else if (novoTipo === "valor" && tipoDesconto === "porcentagem") {
                                    // Converter de porcentagem para valor
                                    const porcentagemDesconto = parsePercentageToNumber(descontoAtual);
                                    const valor = (preco * porcentagemDesconto) / 100;
                                    form.setValue("desconto", valor);
                                  }
                                }
                                
                                field.onChange(value);
                                setTipoDesconto(novoTipo);
                              }}
                              className="flex gap-6"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="valor" id="tipo-valor-radio" />
                                <Label htmlFor="tipo-valor-radio" className="cursor-pointer font-normal">
                                  Valor (R$)
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="porcentagem" id="tipo-porcentagem-radio" />
                                <Label htmlFor="tipo-porcentagem-radio" className="cursor-pointer font-normal">
                                  Porcentagem (%)
                                </Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="desconto"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              {...field}
                              value={
                                tipoDesconto === "porcentagem"
                                  ? (field.value != null ? formatPercentage(parsePercentageToNumber(field.value)) : "0,00 %")
                                  : (field.value != null ? formatBRL(parseCurrencyToNumber(field.value)) : "R$ 0,00")
                              }
                              onChange={(e) => {
                                if (tipoDesconto === "porcentagem") {
                                  // Remove o % e espaços se o usuário digitou
                                  const cleanValue = e.target.value.replace('%', '').trim();
                                  const numericValue = parsePercentageToNumber(cleanValue || "0");
                                  field.onChange(formatPercentage(numericValue));
                                } else {
                                  const numericValue = parseCurrencyToNumber(e.target.value || "0");
                                  field.onChange(numericValue);
                                }
                              }}
                              placeholder={tipoDesconto === "porcentagem" ? "0,00 %" : "R$ 0,00"}
                            />
                          </FormControl>
                          {descontoNormalizado > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {tipoDesconto === "porcentagem" 
                                ? `= ${formatBRL(descontoConvertido)}`
                                : `= ${formatPercentage(descontoConvertido)}`
                              }
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="margem_lucro"
                    render={({ field }) => (
                      <FormItem className="flex flex-col justify-end">
                        <FormLabel className={margemNegativa ? "text-destructive" : ""}>
                          Margem de Lucro (%)
                          {margemNegativa && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertTriangle className="inline-block ml-1 h-4 w-4 text-destructive" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Margem negativa: custo maior que preço de venda</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input
                            value={field.value || "0%"}
                            disabled
                            className={`bg-muted ${margemNegativa ? "text-destructive font-semibold" : ""}`}
                          />
                        </FormControl>
                        {margemNegativa && (
                          <p className="text-xs text-destructive mt-1">
                            ⚠️ Custo maior que o preço de venda
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Coluna direita: Preço Final com Desconto */}
              <div className="col-span-1 flex items-stretch">
                <FormField
                  control={form.control}
                  name="preco_final"
                  render={({ field }) => {
                    const precoFinal = Number(field.value) || 0;
                    const desconto = tipoDesconto === "porcentagem"
                      ? parsePercentageToNumber(descontoRaw || 0)
                      : parseCurrencyToNumber(descontoRaw || 0);
                    const descontoTexto = tipoDesconto === "porcentagem"
                      ? `${formatPercentage(desconto || 0)}%`
                      : formatBRL(desconto || 0);
                    
                    return (
                      <FormItem className="flex-1">
                        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 p-4 border border-emerald-200 dark:border-emerald-900 h-full flex flex-col justify-center">
                          <p className="text-xs text-muted-foreground mb-1">Preço Final com Desconto:</p>
                          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-500 mb-1">{formatBRL(precoFinal)}</p>
                          <p className="text-xs text-muted-foreground">
                            Desconto de: {descontoTexto}
                          </p>
                        </div>
                      </FormItem>
                    );
                  }}
                />
              </div>
            </div>
          </div>

          {/* Grupo: Controle de Estoque */}
          <div className="border border-border rounded-lg p-4 space-y-2 bg-card mt-6">
            <h3 className="text-sm font-semibold text-foreground mb-2">Controle de Estoque</h3>
            
            <div className="grid grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name="estoque"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estoque Atual</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            const currentValue = parseInt(field.value || "0");
                            field.onChange((currentValue - 1).toString());
                          }}
                          disabled={parseInt(field.value || "0") <= 0}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          className="text-center"
                          value={field.value || "0"}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            const currentValue = parseInt(field.value || "0");
                            field.onChange((currentValue + 1).toString());
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estoque_minimo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estoque Mínimo</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            const currentValue = parseInt(field.value || "0");
                            field.onChange((currentValue - 1).toString());
                          }}
                          disabled={parseInt(field.value || "0") <= 0}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          className="text-center"
                          value={field.value || "0"}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            const currentValue = parseInt(field.value || "0");
                            field.onChange((currentValue + 1).toString());
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription className="text-xs">
                      Alerta quando estoque atingir este valor
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Alerta de Estoque Baixo */}
            {parseInt(form.watch("estoque") || "0") <= parseInt(form.watch("estoque_minimo") || "0") &&
              parseInt(form.watch("estoque_minimo") || "0") > 0 && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive">Estoque Crítico!</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      O estoque atual ({form.watch("estoque") || "0"}) está igual ou abaixo do estoque mínimo ({form.watch("estoque_minimo") || "0"}). Considere reabastecer este produto.
                    </p>
                  </div>
                </div>
              )}
          </div>
        </div>
      </Form>

      <CategoriasManagerModal
        open={showCategoryManager}
        onOpenChange={setShowCategoryManager}
        onSelectCategory={handleSelectCategory}
        showSelectButton={true}
      />

      <ModalGerenciarUnidades
        open={modalUnidadesOpen}
        onOpenChange={setModalUnidadesOpen}
      />
    </div>
  );
}
