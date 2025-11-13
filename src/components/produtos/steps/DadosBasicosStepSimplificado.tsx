import { UseFormReturn } from "react-hook-form";
import { useState, useEffect, useRef } from "react";
import { Info, AlertTriangle, X, Plus, Minus } from "lucide-react";
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

interface DadosBasicosStepSimplificadoProps {
  form: UseFormReturn<any>;
}

export function DadosBasicosStepSimplificado({ form }: DadosBasicosStepSimplificadoProps) {
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const tipoDescontoForm = form.watch("tipo_desconto") || "valor";
  const [tipoDesconto, setTipoDesconto] = useState<"valor" | "porcentagem">(tipoDescontoForm);
  
  const precoRaw = form.watch("preco");
  const descontoRaw = form.watch("desconto");
  const custoRaw = form.watch("custo");
  
  // Sincronizar tipoDesconto com o formulário
  useEffect(() => {
    if (tipoDescontoForm !== tipoDesconto) {
      setTipoDesconto(tipoDescontoForm);
    }
  }, [tipoDescontoForm]);
  
  const descontoNormalizado = tipoDesconto === "porcentagem"
    ? parsePercentageToNumber(descontoRaw)
    : parseCurrencyToNumber(descontoRaw);

  // Calcular preço final com desconto e margem de lucro
  useEffect(() => {
    const preco = parseCurrencyToNumber(precoRaw);
    const custo = parseCurrencyToNumber(custoRaw);
    const desconto = descontoNormalizado;

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

    if (custo > 0) {
      const margemCalculada = ((preco - custo) / custo) * 100;
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
          <div>
            <h3 className="text-lg font-semibold mb-1">Dados Básicos</h3>
            <p className="text-sm text-muted-foreground">
              (*) Campos Obrigatórios
            </p>
          </div>
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
        
        <div className="space-y-4">
          {/* Nome do Produto e Categoria */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => {
                const currentLength = field.value?.length || 0;
                return (
                  <FormItem>
                    <FormLabel>
                      * Nome do Produto: <span className="text-muted-foreground text-xs ml-1">({currentLength}/150)</span>
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

          {/* Preço, Custo e Margem */}
          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="preco"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>* Preço de Venda:</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      inputMode="decimal"
                      placeholder="R$ 0,00"
                      value={formatCurrencyWithSymbol(field.value ?? 0)}
                      onChange={(e) => {
                        const formatted = formatCurrencyWithSymbol(e.target.value);
                        field.onChange(formatted);
                      }}
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
                  <FormLabel>Custo do Produto:</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      inputMode="decimal"
                      placeholder="R$ 0,00"
                      value={formatCurrencyWithSymbol(field.value ?? 0)}
                      onChange={(e) => {
                        const formatted = formatCurrencyWithSymbol(e.target.value);
                        field.onChange(formatted);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Valor de custo para calcular margem de lucro
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="margem_lucro"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Margem de Lucro (%):</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={
                        typeof field.value === "number"
                          ? formatPercentage(field.value)
                          : field.value || ""
                      }
                      onChange={(e) => {
                        const formatted = formatPercentage(e.target.value);
                        field.onChange(formatted);

                        const custo = parseCurrencyToNumber(form.watch("custo") || "0");
                        if (custo > 0) {
                          const margem = parsePercentageToNumber(formatted);
                          const novoPreco = custo * (1 + margem / 100);
                          form.setValue("preco", formatCurrencyWithSymbol(novoPreco));
                        }
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Ajuste manualmente ou será calculada: (Preço - Custo) / Custo × 100
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Desconto */}
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.45fr)] lg:grid-cols-[minmax(0,1fr)_260px] items-start">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-4">
                  <Label className="text-base font-medium">Desconto por:</Label>
                  <RadioGroup
                    value={tipoDesconto}
                    onValueChange={(value: "valor" | "porcentagem") => {
                      const precoAtual = parseCurrencyToNumber(form.watch("preco") || "0");
                      const descontoAtual = parseCurrencyToNumber(form.watch("desconto") || "0");
                      
                      // Converter o desconto ao trocar de tipo
                      let novoDesconto = 0;
                      if (value === "porcentagem" && tipoDesconto === "valor") {
                        // Converter de R$ para %
                        if (precoAtual > 0) {
                          novoDesconto = (descontoAtual / precoAtual) * 100;
                        }
                        form.setValue("desconto", formatPercentage(novoDesconto));
                      } else if (value === "valor" && tipoDesconto === "porcentagem") {
                        // Converter de % para R$
                        const descontoPorcentagem = parsePercentageToNumber(form.watch("desconto") || "0");
                        novoDesconto = (precoAtual * descontoPorcentagem) / 100;
                        form.setValue("desconto", formatCurrencyWithSymbol(novoDesconto));
                      }
                      
                      setTipoDesconto(value);
                      form.setValue("tipo_desconto", value);
                    }}
                    className="flex gap-4"
                  >
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="valor" />
                      </FormControl>
                      <FormLabel className="font-medium cursor-pointer">Valor (R$)</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="porcentagem" />
                      </FormControl>
                      <FormLabel className="font-medium cursor-pointer">Porcentagem (%)</FormLabel>
                    </FormItem>
                  </RadioGroup>
                </div>

                <FormField
                  control={form.control}
                  name="desconto"
                  render={({ field }) => (
                    <FormItem className="max-w-[200px]">
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type="text"
                            inputMode="decimal"
                            placeholder={tipoDesconto === 'valor' ? 'R$ 0,00' : '0,00'}
                            value={
                              tipoDesconto === 'valor'
                                ? formatCurrencyWithSymbol(field.value ?? 0)
                                : typeof field.value === "number"
                                  ? formatPercentage(field.value)
                                  : field.value || ""
                            }
                            onChange={(e) => {
                              if (tipoDesconto === 'valor') {
                                const formatted = formatCurrencyWithSymbol(e.target.value);
                                const numValue = parseCurrencyToNumber(formatted);
                                const preco = parseCurrencyToNumber(form.watch("preco") || "0");
                                
                                if (numValue > preco) {
                                  field.onChange(formatCurrencyWithSymbol(preco));
                                } else {
                                  field.onChange(formatted);
                                }
                              } else {
                                const formatted = formatPercentage(e.target.value);
                                const numValue = parsePercentageToNumber(formatted);
                                
                                if (numValue > 100) {
                                  field.onChange(formatPercentage(100));
                                } else {
                                  field.onChange(formatted);
                                }
                              }
                            }}
                            className={`${tipoDesconto === 'porcentagem' ? 'pr-10' : ''} w-full`}
                          />
                          {tipoDesconto === 'porcentagem' && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex flex-col gap-2">
                <p className="text-sm text-muted-foreground font-medium">Preço Final com Desconto:</p>
                <p className="text-xl font-bold text-primary">
                  {formatBRL(form.watch("preco_final") || "0")}
                </p>
                <p className="text-xs text-muted-foreground">
                  Desconto de: {tipoDesconto === 'porcentagem' 
                    ? `${formatPercentage(descontoNormalizado)}% (${formatBRL(parseCurrencyToNumber(form.watch("preco") || "0") * descontoNormalizado / 100)})`
                    : `${formatBRL(descontoNormalizado)} (${formatPercentage((descontoNormalizado / parseCurrencyToNumber(form.watch("preco") || "0")) * 100)}%)`}
                </p>
              </div>
            </div>
          </div>

          {/* Unidade e Código de Barras/SKU */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="unidade_medida"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unidade de Medida:</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || 'un'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="un">Unidade (un)</SelectItem>
                      <SelectItem value="cx">Caixa (cx)</SelectItem>
                      <SelectItem value="kg">Quilograma (kg)</SelectItem>
                      <SelectItem value="g">Grama (g)</SelectItem>
                      <SelectItem value="m">Metro (m)</SelectItem>
                      <SelectItem value="cm">Centímetro (cm)</SelectItem>
                      <SelectItem value="mm">Milímetro (mm)</SelectItem>
                      <SelectItem value="l">Litro (l)</SelectItem>
                      <SelectItem value="ml">Mililitro (ml)</SelectItem>
                      <SelectItem value="m2">Metro Quadrado (m²)</SelectItem>
                      <SelectItem value="m3">Metro Cúbico (m³)</SelectItem>
                    </SelectContent>
                  </Select>
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
                      Código de Barras/SKU: <span className="text-muted-foreground text-xs ml-1">({currentLength}/50)</span>
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

          {/* Estoque e Estoque Mínimo */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="estoque"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estoque Atual:</FormLabel>
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
                  <FormLabel>Estoque Mínimo:</FormLabel>
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
                  <FormDescription>
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
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-destructive">Estoque Crítico!</p>
                <p className="text-sm text-muted-foreground">
                  O estoque atual ({form.watch("estoque") || "0"}) está igual ou abaixo do estoque mínimo ({form.watch("estoque_minimo") || "0"}).
                  Considere reabastecer este produto.
                </p>
              </div>
            </div>
          )}

          {/* Material e Arte Final */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="material"
              render={({ field }) => {
                const currentLength = field.value?.length || 0;
                return (
                  <FormItem>
                    <FormLabel>
                      Material: <span className="text-muted-foreground text-xs ml-1">({currentLength}/100)</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: Papel couché, PVC, etc" 
                        {...field}
                        maxLength={100}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(limitText(e.target.value, 100))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="arte_final_acabamentos"
              render={({ field }) => {
                const currentLength = field.value?.length || 0;
                return (
                  <FormItem>
                    <FormLabel>
                      Arte Final/Acabamentos: <span className="text-muted-foreground text-xs ml-1">({currentLength}/200)</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: Laminação fosca, verniz localizado, etc" 
                        {...field}
                        maxLength={200}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(limitText(e.target.value, 200))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          </div>
        </div>
      </Form>

      <CategoriasManagerModal
        open={showCategoryManager}
        onOpenChange={setShowCategoryManager}
        onSelectCategory={handleSelectCategory}
      />
    </div>
  );
}
