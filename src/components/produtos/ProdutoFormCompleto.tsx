import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { DadosBasicosStepSimplificado } from "./steps/DadosBasicosStepSimplificado";
import { CaracteristicasStep } from "./steps/CaracteristicasStep";
import { ImagensStep } from "./steps/ImagensStep";
import { TributacaoStep } from "./steps/TributacaoStep";
import { VariacoesStep } from "./steps/VariacoesStep";
import { toast } from "@/hooks/use-toast";
import { useProdutos } from "@/hooks/useProdutos";
import { useAutoSaveProdutoForm } from "@/hooks/useAutoSaveProdutoForm";
import { formatCurrencyWithSymbol, parseCurrencyToNumber } from "@/utils/inputMasks";

const preprocessInteger = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isNaN(value) ? 0 : Math.max(0, Math.floor(value));
  }

  if (typeof value === "string") {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
  }

  return 0;
};

const formSchema = z.object({
  // Dados Básicos
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
  codigo_barras: z.string().optional(),
  preco: z.preprocess((val) => parseCurrencyToNumber(val as string | number | null | undefined), z.number().min(0, "Preço deve ser maior ou igual a zero")),
  custo: z.preprocess((val) => parseCurrencyToNumber(val as string | number | null | undefined), z.number().min(0, "Custo deve ser maior ou igual a zero")).optional(),
  estoque: z.preprocess(preprocessInteger, z.number().int("Estoque deve ser um número inteiro").min(0, "Estoque não pode ser negativo")),
  estoque_minimo: z.preprocess(preprocessInteger, z.number().int("Estoque mínimo deve ser um número inteiro").min(0, "Estoque mínimo não pode ser negativo")),
  unidade_medida: z.string().default("un"),
  categoria_id: z.string().uuid("Categoria inválida").optional().nullable(),
  categorias_ids: z.array(z.string().uuid("Categoria inválida")).optional(),
  imagem_url: z.string().optional(),
  ativo: z.boolean().default(true),
  desconto: z.preprocess((val) => {
    if (val === null || val === undefined || val === "") return 0;
    if (typeof val === "string") {
      const numValue = parseCurrencyToNumber(val);
      return numValue;
    }
    return typeof val === "number" ? val : 0;
  }, z.number().min(0, "Desconto não pode ser negativo")).optional(),
  tipo_desconto: z.enum(["valor", "porcentagem"]).default("valor").optional(),
  
  // Características
  descricaoCurta: z.string().optional(),
  descricaoComplementar: z.string().optional(),
  observacoes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  
  // Tributação
  ncm: z.string().optional(),
  cest: z.string().optional(),
  origem: z.string().optional(),
  cfop: z.string().optional(),
  icms_cst: z.string().optional(),
  icms_aliquota: z.number().optional(),
  pis_cst: z.string().optional(),
  pis_aliquota: z.number().optional(),
  cofins_cst: z.string().optional(),
  cofins_aliquota: z.number().optional(),
  codigo_servico: z.string().optional(),
  iss_aliquota: z.number().optional(),
});

type ProdutoFormValues = z.input<typeof formSchema>;

interface ProdutoFormCompletoProps {
  onComplete: () => void;
  editandoProduto?: any;
  onSave?: (produto: any) => void;
}

export function ProdutoFormCompleto({ onComplete, editandoProduto, onSave }: ProdutoFormCompletoProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { createProduto, updateProduto } = useProdutos();
  const formId = editandoProduto?.id || 'novo';

  const [formData, setFormData] = useState<any>({});

  const form = useForm<ProdutoFormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: editandoProduto ? {
      nome: editandoProduto.nome || "",
      descricao: editandoProduto.descricao || "",
      codigo_barras: editandoProduto.codigo_barras || "",
      preco: formatCurrencyWithSymbol(editandoProduto.preco ?? 0),
      custo: formatCurrencyWithSymbol(editandoProduto.custo ?? 0),
      estoque: editandoProduto.estoque || 0,
      estoque_minimo: editandoProduto.estoque_minimo || 0,
      unidade_medida: editandoProduto.unidade_medida || "un",
      categoria_id: editandoProduto.categoria_id || null,
      categorias_ids: editandoProduto.produtos_categorias?.map((pc: any) => pc.categorias.id) || [],
      imagem_url: editandoProduto.imagem_url || "",
      ativo: editandoProduto.ativo ?? true,
      desconto: formatCurrencyWithSymbol(editandoProduto.desconto ?? 0),
      tipo_desconto: editandoProduto.tipo_desconto || "valor",
      descricaoCurta: editandoProduto.descricao_curta || "",
      descricaoComplementar: editandoProduto.descricao_complementar || "",
      observacoes: editandoProduto.observacoes || "",
      tags: editandoProduto.tags || [],
      ncm: editandoProduto.ncm || "",
      cest: editandoProduto.cest || "",
      origem: editandoProduto.origem || "",
      cfop: editandoProduto.cfop || "",
      icms_cst: editandoProduto.icms_cst || "",
      icms_aliquota: editandoProduto.icms_aliquota || 0,
      pis_cst: editandoProduto.pis_cst || "",
      pis_aliquota: editandoProduto.pis_aliquota || 0,
      cofins_cst: editandoProduto.cofins_cst || "",
      cofins_aliquota: editandoProduto.cofins_aliquota || 0,
      codigo_servico: editandoProduto.codigo_servico || "",
      iss_aliquota: editandoProduto.iss_aliquota || 0,
    } : {
      nome: "",
      descricao: "",
      codigo_barras: "",
      preco: formatCurrencyWithSymbol(0),
      custo: formatCurrencyWithSymbol(0),
      estoque: 0,
      estoque_minimo: 0,
      unidade_medida: "un",
      categoria_id: null,
      categorias_ids: [],
      imagem_url: "",
      ativo: true,
      desconto: formatCurrencyWithSymbol(0),
      tipo_desconto: "valor",
      descricaoCurta: "",
      descricaoComplementar: "",
      observacoes: "",
      tags: [],
      ncm: "",
      cest: "",
      origem: "",
      cfop: "",
      icms_cst: "",
      icms_aliquota: 0,
      pis_cst: "",
      pis_aliquota: 0,
      cofins_cst: "",
      cofins_aliquota: 0,
      codigo_servico: "",
      iss_aliquota: 0,
    },
  });

  // Auto-save do formulário
  const { clearSavedData } = useAutoSaveProdutoForm({
    watch: form.watch,
    setValue: form.setValue,
    formId,
    enabled: true,
  });

  // Salvar dados do formulário quando houver mudanças
  const saveFormData = () => {
    const currentValues = form.getValues();
    setFormData(currentValues);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    
    try {
      // Mapear campos do formulário (camelCase) para o banco (snake_case)
      const produtoData = {
        nome: values.nome,
        descricao: values.descricao,
        codigo_barras: values.codigo_barras,
        preco: values.preco,
        custo: values.custo ?? 0,
        estoque: values.estoque ?? 0,
        estoque_minimo: values.estoque_minimo ?? 0,
        unidade_medida: values.unidade_medida,
        categoria_id: values.categoria_id,
        categorias_ids: values.categorias_ids,
        imagem_url: values.imagem_url,
        ativo: values.ativo,
        desconto: values.desconto ?? 0,
        tipo_desconto: values.tipo_desconto || "valor",
        // Características
        descricao_curta: values.descricaoCurta,
        descricao_complementar: values.descricaoComplementar,
        observacoes: values.observacoes,
        tags: values.tags,
        // Tributação
        ncm: values.ncm,
        cest: values.cest,
        origem: values.origem,
        cfop: values.cfop,
        icms_cst: values.icms_cst,
        icms_aliquota: values.icms_aliquota,
        pis_cst: values.pis_cst,
        pis_aliquota: values.pis_aliquota,
        cofins_cst: values.cofins_cst,
        cofins_aliquota: values.cofins_aliquota,
        codigo_servico: values.codigo_servico,
        iss_aliquota: values.iss_aliquota,
      };

      if (editandoProduto?.id) {
        await updateProduto(editandoProduto.id, produtoData);
      } else {
        await createProduto(produtoData);
      }
      
      if (onSave) onSave(produtoData);
      
      // Limpar dados salvos após sucesso
      clearSavedData();
      localStorage.removeItem('produto-form-images-autosave');
      localStorage.removeItem('produto-form-variacoes-autosave');
      
      onComplete();
    } catch (error) {
      toast({
        title: "Erro ao salvar produto",
        description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[85vh] flex flex-col">
      <ScrollArea className="flex-1">
        <div className="p-6">
          <Tabs defaultValue="dados-basicos" className="w-full" onValueChange={saveFormData}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="dados-basicos">Dados Básicos</TabsTrigger>
              <TabsTrigger value="caracteristicas">Características</TabsTrigger>
              <TabsTrigger value="imagens">Imagens</TabsTrigger>
              <TabsTrigger value="tributacao">Tributação</TabsTrigger>
              <TabsTrigger value="variacoes">Variações</TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="dados-basicos">
                <DadosBasicosStepSimplificado form={form} />
              </TabsContent>

              <TabsContent value="caracteristicas">
                <CaracteristicasStep form={form} />
              </TabsContent>

              <TabsContent value="imagens">
                <ImagensStep form={form} />
              </TabsContent>

              <TabsContent value="tributacao">
                <TributacaoStep form={form} />
              </TabsContent>

              <TabsContent value="variacoes">
                <VariacoesStep />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </ScrollArea>

      <div className="border-t bg-background px-6 py-4">
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => { onComplete(); window.location.href = '/loja/produtos'; }}>
            Cancelar
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Produto"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
