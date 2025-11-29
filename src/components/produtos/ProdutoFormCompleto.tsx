import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Save, X, LogOut, CheckCircle, AlertTriangle, CloudOff } from "lucide-react";
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
import { DadosBasicosStepSimplificado } from "./steps/DadosBasicosStepSimplificado";
import { CaracteristicasStep } from "./steps/CaracteristicasStep";
import { ImagensStep } from "./steps/ImagensStep";
import { TributacaoStep } from "./steps/TributacaoStep";
import { VariacoesStep } from "./steps/VariacoesStep";
import { toast } from "@/hooks/use-toast";
import { useProdutos } from "@/hooks/useProdutos";
import { useAutoSaveProdutoForm, getSavedFormData, getSavedImagesData } from "@/hooks/useAutoSaveProdutoForm";
import { formatCurrencyWithSymbol, parseCurrencyToNumber } from "@/utils/inputMasks";
import { SimpleImageData } from "@/hooks/useSimpleImageUpload";
import { supabase } from "@/integrations/supabase/client";
import { isUploadAvailable } from "@/utils/guaranteedUpload";

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
  imagens: z.array(z.string()).optional(),
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
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [shouldCloseAfterSave, setShouldCloseAfterSave] = useState(false);
  const [uploadAvailable, setUploadAvailable] = useState<boolean | null>(null);
  const initialImagesCount = useRef(0);
  const { createProduto, updateProduto } = useProdutos();
  
  // Obter o ID do produto da URL se estamos editando (mais confiável que editandoProduto?.id)
  const urlParams = new URLSearchParams(window.location.search);
  const produtoIdFromUrl = urlParams.get('produtoId');
  const isEditMode = urlParams.get('modal') === 'editar' && produtoIdFromUrl;
  
  // Usar o ID da URL se estamos em modo de edição, senão usar editandoProduto?.id ou 'novo'
  const formId = isEditMode ? produtoIdFromUrl : (editandoProduto?.id || 'novo');
  
  console.log('🔑 ProdutoFormCompleto: formId =', formId, '| isEditMode =', isEditMode, '| editandoProduto?.id =', editandoProduto?.id);
  
  // Verificar se há dados salvos no localStorage ANTES de criar o form
  const savedFormData = getSavedFormData(formId);
  const savedImagesData = getSavedImagesData(formId);
  const hasSavedData = !!savedFormData;
  
  // Inicializar imagens com dados salvos ou vazios
  const [images, setImages] = useState<SimpleImageData[]>(() => {
    // Se for um novo produto, NÃO carregar imagens do localStorage
    // (elas podem ser de outro produto criado anteriormente)
    if (formId === 'novo') {
      console.log('🆕 Novo produto: iniciando sem imagens (localStorage ignorado)');
      // Não limpar aqui, será limpo pelo handleAbrirNovoProduto
      return [];
    }
    
    // Se for edição, usar imagens salvas normalmente
    if (savedImagesData && savedImagesData.length > 0) {
      console.log('📸 Inicializando imagens do localStorage (edição):', savedImagesData.length);
      return savedImagesData;
    }
    
    return [];
  });
  
  // Verificar disponibilidade do upload ao montar
  useEffect(() => {
    const available = isUploadAvailable();
    setUploadAvailable(available);
  }, []);

  const [formData, setFormData] = useState<any>({});
  const hasLoadedFromDB = useRef(false);
  const imagesStorageKey = `produto-form-images-${formId}`;

  // Carregar imagens e variações do banco (apenas se não há dados salvos no localStorage)
  useEffect(() => {
    const carregarDados = async () => {
      // Se já tem imagens (do localStorage), não carregar do banco
      if (images.length > 0 || hasLoadedFromDB.current) {
        hasLoadedFromDB.current = true;
        return;
      }

      if (editandoProduto) {
        console.log('📝 ProdutoFormCompleto: Carregando dados do banco');
        console.log('   ID:', editandoProduto.id);
        console.log('   Nome:', editandoProduto.nome);
        
        // Carregar imagens do produto diretamente no estado
        const imagensArray = editandoProduto.imagens || [];
        const imagemUrl = editandoProduto.imagem_url;
        
        // Filtrar apenas URLs válidas do Supabase Storage
        const validUrls = imagensArray.filter((url: string) => 
          url && !url.startsWith('blob:') && url.includes('produtos-imagens')
        );
        
        if (validUrls.length > 0) {
          console.log(`📸 Carregando ${validUrls.length} imagens do banco`);
          const loadedImages: SimpleImageData[] = validUrls.map((url: string, index: number) => ({
            id: `loaded-${index}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            url,
            preview: url,
            isPrincipal: index === 0,
            order: index + 1,
          }));
          setImages(loadedImages);
        } else if (imagemUrl && !imagemUrl.startsWith('blob:') && imagemUrl.includes('produtos-imagens')) {
          console.log('📸 Carregando imagem_url (formato antigo)');
          setImages([{
            id: `loaded-0-${Date.now()}`,
            url: imagemUrl,
            preview: imagemUrl,
            isPrincipal: true,
            order: 1,
          }]);
        }

        // Carregar variações do produto do banco
        try {
          const { data: variacoesExistentes, error } = await supabase
            .from('variacoes_produto')
            .select('*')
            .eq('produto_id', editandoProduto.id);

          if (!error && variacoesExistentes && variacoesExistentes.length > 0) {
            console.log(`🎨 Carregadas ${variacoesExistentes.length} variações do banco`);
            
            // Converter variações do banco para o formato usado no formulário
            const variacoesFormatadas = variacoesExistentes.map((v, index) => {
              let combinacao = v.nome;
              if (v.atributo) {
                combinacao = `${v.nome} - ${v.atributo}`;
              }
              
              const valorAdicional = v.valor_adicional || 0;
              const precoFormatado = valorAdicional < 0 
                ? `-${Math.abs(valorAdicional).toFixed(2).replace('.', ',')}`
                : valorAdicional.toFixed(2).replace('.', ',');
              
              const templateVariacaoId = (v as any).template_variacao_id || undefined;
              
              return {
                id: `var-db-${v.id}`,
                combinacao: combinacao,
                codigo: v.sku || v.codigo_barras || "",
                preco: precoFormatado,
                estoque: (v.estoque || 0).toString(),
                modificado: v.modificado || false,
                variacaoProdutoId: templateVariacaoId,
                origemTemplate: !!templateVariacaoId,
              };
            });

            localStorage.setItem('produto-form-variacoes-autosave', JSON.stringify({
              atributos: [],
              variacoes: variacoesFormatadas
            }));
          }
        } catch (error) {
          console.error('Erro ao carregar variações:', error);
        }
        
        hasLoadedFromDB.current = true;
      }
    };

    carregarDados();
  }, [editandoProduto?.id, images.length]); // Executar quando ID mudar

  // Criar defaultValues mesclando dados do banco com dados salvos no localStorage
  const getDefaultValues = () => {
    // Valores padrão vazios
    const emptyValues = {
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
      imagens: [],
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
    };

    // Se há dados salvos no localStorage, usar eles (prioridade)
    if (savedFormData) {
      console.log('📦 Usando dados salvos do localStorage como defaultValues');
      return {
        ...emptyValues,
        ...savedFormData,
      };
    }

    // Se está editando um produto, usar dados do banco
    if (editandoProduto) {
      return {
        nome: editandoProduto.nome || "",
        descricao: editandoProduto.descricao || "",
        codigo_barras: editandoProduto.codigo_barras || "",
        preco: editandoProduto.preco ?? 0,
        custo: editandoProduto.custo ?? 0,
        estoque: editandoProduto.estoque || 0,
        estoque_minimo: editandoProduto.estoque_minimo || 0,
        unidade_medida: editandoProduto.unidade_medida || "un",
        categoria_id: editandoProduto.categoria_id || null,
        categorias_ids: editandoProduto.produtos_categorias?.map((pc: any) => pc.categorias.id) || [],
        imagem_url: editandoProduto.imagem_url || "",
        imagens: editandoProduto.imagens || [],
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
      };
    }

    // Novo produto sem dados salvos
    return emptyValues;
  };

  const form = useForm<ProdutoFormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: getDefaultValues(),
  });

  // Ref para controlar se já restauramos os dados
  const hasRestoredDataRef = useRef(false);
  
  // Forçar reset do formulário quando há dados salvos (após a primeira renderização)
  // Este useEffect é crucial para restaurar dados após F5
  useEffect(() => {
    // Evitar restaurar múltiplas vezes
    if (hasRestoredDataRef.current) {
      console.log('🔄 [RestoreEffect] Já restaurado anteriormente, ignorando');
      return;
    }
    
    // Validar formId
    if (!formId || formId === 'undefined' || formId === 'null') {
      console.log('⚠️ [RestoreEffect] formId inválido:', formId);
      return;
    }
    
    console.log('🔄 [RestoreEffect] Tentando restaurar dados para formId:', formId);
    
    // Buscar dados diretamente do localStorage
    const storageKey = `produto-form-autosave-${formId}`;
    const savedRaw = localStorage.getItem(storageKey);
    
    console.log('🔄 [RestoreEffect] Chave:', storageKey);
    console.log('🔄 [RestoreEffect] Dados encontrados:', savedRaw ? 'SIM' : 'NÃO');
    
    if (savedRaw) {
      try {
        const parsed = JSON.parse(savedRaw);
        const formData = parsed.formData || parsed;
        const timestamp = parsed.timestamp || 0;
        const age = Date.now() - timestamp;
        const maxAge = 24 * 60 * 60 * 1000; // 24 horas
        
        console.log('🔄 [RestoreEffect] Idade dos dados:', age, 'ms');
        console.log('🔄 [RestoreEffect] Nome nos dados:', formData?.nome);
        
        if (age < maxAge && formData) {
          console.log('✅ [RestoreEffect] Restaurando dados do localStorage');
          
          // Mesclar com valores padrão vazios para garantir que todos os campos existam
          const mergedData = {
            ...getDefaultValues(),
            ...formData,
          };
          
          console.log('✅ [RestoreEffect] Nome após merge:', mergedData.nome);
          
          // Fazer reset do formulário
          form.reset(mergedData);
          hasRestoredDataRef.current = true;
          
          // Mostrar toast
          toast({
            title: "Dados recuperados",
            description: "Suas alterações não salvas foram restauradas automaticamente.",
            duration: 4000,
          });
        } else {
          console.log('⚠️ [RestoreEffect] Dados muito antigos ou inválidos');
        }
      } catch (error) {
        console.error('❌ [RestoreEffect] Erro ao parsear dados:', error);
      }
    } else {
      console.log('❌ [RestoreEffect] Nenhum dado encontrado no localStorage');
      // Listar chaves existentes para debug
      const allKeys = Object.keys(localStorage).filter(k => k.includes('produto-form'));
      console.log('🔍 [RestoreEffect] Chaves existentes:', allKeys);
    }
  }, [formId]); // Executar quando formId mudar

  // Auto-save do formulário
  const { clearSavedData, saveImages, getSavedImages } = useAutoSaveProdutoForm({
    watch: form.watch,
    setValue: form.setValue,
    formId,
    enabled: true,
    // Toast agora é mostrado no useEffect de restauração acima
  });

  // Salvar dados do formulário quando houver mudanças
  const saveFormData = () => {
    const currentValues = form.getValues();
    setFormData(currentValues);
  };

  // Salvar imagens no localStorage quando mudarem
  useEffect(() => {
    if (images.length > 0) {
      saveImages(images);
    }
  }, [images, saveImages]);

  const onSubmit = async (values: any, closeAfterSave: boolean = true) => {
    console.log('🚀 onSubmit INICIADO');
    console.log('📝 Values recebidos:', values);
    console.log('📸 Images no estado:', images.length);
    console.log('🚪 Fechar após salvar:', closeAfterSave);
    
    setIsLoading(true);
    
    try {
      // As imagens do produto são obtidas do estado "images" controlado por este componente

      // Obter variações do localStorage
      const variacoesData = localStorage.getItem('produto-form-variacoes-autosave');
      let variacoes: any[] = [];
      
      console.log('🔍 Buscando variações no localStorage...');
      console.log('📦 Dados brutos do localStorage:', variacoesData);
      
      if (variacoesData) {
        try {
          const parsed = JSON.parse(variacoesData);
          variacoes = parsed.variacoes || [];
          console.log(`🎨 Variações encontradas no localStorage: ${variacoes.length}`);
          console.log('📋 Variações:', variacoes);
        } catch (error) {
          console.error('Erro ao parsear variações do localStorage:', error);
        }
      } else {
        console.log('⚠️ Nenhum dado de variações encontrado no localStorage');
      }

      // Mapear campos do formulário (camelCase) para o banco (snake_case)
      const produtoData: any = {
        nome: values.nome,
        descricao: values.descricao,
        codigo_barras: values.codigo_barras,
        preco: typeof values.preco === 'number' ? values.preco : parseCurrencyToNumber(values.preco || 0),
        custo: typeof values.custo === 'number' ? (values.custo ?? 0) : parseCurrencyToNumber(values.custo || 0),
        estoque: typeof values.estoque === 'number' ? values.estoque : Number(values.estoque ?? 0),
        estoque_minimo: typeof values.estoque_minimo === 'number' ? values.estoque_minimo : Number(values.estoque_minimo ?? 0),
        unidade_medida: values.unidade_medida,
        categoria_id: values.categoria_id,
        categorias_ids: values.categorias_ids,
        imagem_url: values.imagem_url,
        ativo: values.ativo,
        desconto: typeof values.desconto === 'number' ? values.desconto : parseCurrencyToNumber(values.desconto ?? 0),
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

      console.log(`📸 ProdutoFormCompleto: Salvando produto com ${images.length} imagens e ${variacoes.length} variações`);

      if (editandoProduto?.id) {
        await updateProduto(editandoProduto.id, produtoData, images, variacoes);
      } else {
        await createProduto(produtoData, images, variacoes);
      }
      
      // Toast já é exibido pelo hook useProdutos
      if (onSave) onSave(produtoData);
      
      // Resetar o estado de "dirty" do formulário após salvar
      form.reset(values);
      initialImagesCount.current = images.length;
      
      // Se é um produto novo, SEMPRE limpar localStorage após salvar
      const isNewProduct = formId === 'novo';
      if (isNewProduct) {
        clearSavedData();
        localStorage.removeItem(imagesStorageKey);
        localStorage.removeItem('produto-form-variacoes-autosave');
      }
      
      // Fechar apenas se solicitado
      if (closeAfterSave) {
        // Limpar dados salvos ao sair (se ainda não foi limpo)
        if (!isNewProduct) {
          clearSavedData();
          localStorage.removeItem(imagesStorageKey);
          localStorage.removeItem('produto-form-variacoes-autosave');
        }
        hasLoadedFromDB.current = false;
        onComplete();
      } else {
        // Ao salvar sem sair, manter o localStorage para continuar editando (apenas produtos existentes)
        // Para produtos novos, os dados já foram limpos acima
        toast({
          title: "Produto salvo com sucesso",
          description: "As alterações foram salvas.",
        });
      }
    } catch (error) {
      console.error('❌ ERRO CAPTURADO no onSubmit:', error);
      console.error('   Stack:', error instanceof Error ? error.stack : 'N/A');
      
      toast({
        title: "Erro ao salvar produto",
        description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido",
        variant: "destructive",
      });
    } finally {
      console.log('🏁 onSubmit FINALIZADO');
      setIsLoading(false);
      setShouldCloseAfterSave(false);
    }
  };

  // Função para verificar se há alterações pendentes
  const hasUnsavedChanges = () => {
    const isDirty = form.formState.isDirty;
    const hasImageChanges = images.length !== initialImagesCount.current;
    const hasVariacoesChanges = localStorage.getItem('produto-form-variacoes-autosave') !== null;
    return isDirty || hasImageChanges || hasVariacoesChanges;
  };

  // Função para cancelar
  const handleCancel = () => {
    if (hasUnsavedChanges()) {
      setShowCancelDialog(true);
    } else {
      clearSavedData();
      localStorage.removeItem(imagesStorageKey);
      localStorage.removeItem('produto-form-variacoes-autosave');
      hasLoadedFromDB.current = false;
      onComplete();
    }
  };

  // Função para confirmar cancelamento
  const confirmCancel = () => {
    setShowCancelDialog(false);
    clearSavedData();
    localStorage.removeItem(imagesStorageKey);
    localStorage.removeItem('produto-form-variacoes-autosave');
    hasLoadedFromDB.current = false;
    onComplete();
  };

  // Função para salvar (sem fechar)
  const handleSave = async () => {
    console.log('🖱️ Botão "Salvar" clicado');
    console.log('📋 Valores atuais do formulário:', form.getValues());
    console.log('📸 Imagens a enviar:', images.length);
    
    setShouldCloseAfterSave(false);
    
    const errors = form.formState.errors;
    if (Object.keys(errors).length > 0) {
      console.error('❌ Erros de validação encontrados:', errors);
      toast({
        title: "Erro de validação",
        description: "Por favor, corrija os erros no formulário antes de salvar",
        variant: "destructive",
      });
      return;
    }
    
    console.log('✅ Validação OK, chamando handleSubmit...');
    
    try {
      await form.handleSubmit(
        async (data) => {
          console.log('✅ Validação passou, executando onSubmit (sem fechar)...');
          await onSubmit(data, false);
        },
        (errors) => {
          console.error('❌ Erros de validação:', errors);
          toast({
            title: "Erro de validação",
            description: Object.values(errors).map((e: any) => e.message).join(', '),
            variant: "destructive",
          });
        }
      )();
    } catch (error) {
      console.error('❌ Erro ao processar formulário:', error);
    }
  };

  // Função para salvar e sair
  const handleSaveAndExit = async () => {
    console.log('🖱️ Botão "Salvar e Sair" clicado');
    console.log('📋 Valores atuais do formulário:', form.getValues());
    console.log('📸 Imagens a enviar:', images.length);
    
    setShouldCloseAfterSave(true);
    
    const errors = form.formState.errors;
    if (Object.keys(errors).length > 0) {
      console.error('❌ Erros de validação encontrados:', errors);
      toast({
        title: "Erro de validação",
        description: "Por favor, corrija os erros no formulário antes de salvar",
        variant: "destructive",
      });
      return;
    }
    
    console.log('✅ Validação OK, chamando handleSubmit...');
    
    try {
      await form.handleSubmit(
        async (data) => {
          console.log('✅ Validação passou, executando onSubmit (com fechar)...');
          await onSubmit(data, true);
        },
        (errors) => {
          console.error('❌ Erros de validação:', errors);
          toast({
            title: "Erro de validação",
            description: Object.values(errors).map((e: any) => e.message).join(', '),
            variant: "destructive",
          });
        }
      )();
    } catch (error) {
      console.error('❌ Erro ao processar formulário:', error);
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
                <ImagensStep 
                  form={form} 
                  images={images} 
                  onImagesChange={setImages} 
                  produtoId={editandoProduto?.id}
                />
              </TabsContent>

              <TabsContent value="tributacao">
                <TributacaoStep form={form} />
              </TabsContent>

              <TabsContent value="variacoes">
                <VariacoesStep produtoId={editandoProduto?.id} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </ScrollArea>

      <div className="border-t bg-background px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Indicador de Upload - Lado Esquerdo */}
          <div className="flex items-center gap-1.5 text-xs">
            {uploadAvailable === null ? (
              <>
                <CloudOff className="h-3.5 w-3.5 text-muted-foreground animate-pulse" />
                <span className="text-muted-foreground">Verificando...</span>
              </>
            ) : uploadAvailable ? (
              <>
                <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                <span className="text-green-600">Upload ativo</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-amber-500">Upload indisponível</span>
              </>
            )}
          </div>

          {/* Botões - Lado Direito */}
          <div className="flex gap-3">
            <Button 
              type="button"
              variant="outline" 
              onClick={handleCancel}
              disabled={isLoading}
            >
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button 
              type="button"
              variant="secondary"
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading && !shouldCloseAfterSave ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {images.length > 0 ? 'Enviando imagens...' : 'Salvando...'}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar
                </>
              )}
            </Button>
            <Button 
              type="button"
              onClick={handleSaveAndExit}
              disabled={isLoading}
            >
              {isLoading && shouldCloseAfterSave ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {images.length > 0 ? 'Enviando imagens...' : 'Salvando...'}
                </>
              ) : (
                <>
                  <LogOut className="mr-2 h-4 w-4" />
                  Salvar e Sair
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Dialog de confirmação de cancelamento */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
            <AlertDialogDescription>
              Existem alterações não salvas neste formulário. 
              Se você sair agora, todas as alterações serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Descartar alterações
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
