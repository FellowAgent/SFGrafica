import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { DadosBasicosStep } from "./steps/DadosBasicosStep";
import { CaracteristicasStep } from "./steps/CaracteristicasStep";
import { ImagensStep } from "./steps/ImagensStep";
import { TributacaoStep } from "./steps/TributacaoStep";
import { VariacoesStep } from "./steps/VariacoesStep";
import { toast } from "@/hooks/use-toast";
import { useAutoSaveProdutoForm } from "@/hooks/useAutoSaveProdutoForm";
import { SimpleImageData } from "@/hooks/useSimpleImageUpload";
const formSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  categoria: z.string().min(1, "Categoria é obrigatória"),
  codigo: z.string().optional(),
  preco: z.string().min(1, "Preço é obrigatório"),
  unidade: z.string(),
  formato: z.string(),
  tipo: z.string(),
  condicao: z.string(),
  descricaoCurta: z.string().optional(),
  descricaoComplementar: z.string().optional(),
  observacoes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

interface ProdutoFormEtapasProps {
  onComplete: () => void;
  onModoCompleto: () => void;
}

const steps = [
  { id: 1, name: "Dados Básicos", required: true },
  { id: 2, name: "Características", required: false },
  { id: 3, name: "Imagens", required: false },
  { id: 4, name: "Tributação", required: false },
  { id: 5, name: "Variações", required: false },
];

export function ProdutoFormEtapas({ onComplete, onModoCompleto }: ProdutoFormEtapasProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<SimpleImageData[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      nome: "",
      categoria: "",
      codigo: "",
      preco: "",
      unidade: "Unidade",
      formato: "Simples",
      tipo: "Produto",
      condicao: "Novo",
      tags: [],
    },
  });

  // Auto-save do formulário
  const { clearSavedData } = useAutoSaveProdutoForm({
    watch: form.watch,
    setValue: form.setValue,
    formId: 'etapas',
    enabled: true,
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    toast({
      title: "Produto salvo com sucesso!",
      description: "O produto foi adicionado ao catálogo.",
    });
    
    // Limpar dados salvos após sucesso
    clearSavedData();
    
    setIsLoading(false);
    onComplete();
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      const isValid = await form.trigger(["nome", "categoria", "preco"]);
      if (!isValid) return;
    }
    
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      form.handleSubmit(onSubmit)();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="flex h-[85vh]">
      {/* Sidebar */}
      <div className="w-64 border-r bg-muted/30 p-6">
        <h2 className="text-lg font-bold mb-6">Cadastrar Novo Produto</h2>
        <nav className="space-y-2">
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() => setCurrentStep(step.id)}
              className={cn(
                "w-full text-left px-4 py-3 rounded-lg transition-all",
                currentStep === step.id
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "hover:bg-muted text-muted-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs",
                    currentStep === step.id
                      ? "bg-primary-foreground text-primary"
                      : "bg-muted-foreground/20"
                  )}
                >
                  {step.id}
                </div>
                <div>
                  <div>{step.name}</div>
                  {!step.required && (
                    <div className="text-xs opacity-70">(opcional)</div>
                  )}
                </div>
              </div>
            </button>
          ))}
          <Button
            variant="link"
            className="w-full mt-4"
            onClick={onModoCompleto}
          >
            Pular para Versão Completa
          </Button>
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        <ScrollArea className="flex-1 p-6">
          <div className="max-w-2xl mx-auto">
            {currentStep === 1 && <DadosBasicosStep form={form} />}
            {currentStep === 2 && <CaracteristicasStep form={form} />}
            {currentStep === 3 && <ImagensStep form={form} images={images} onImagesChange={setImages} produtoId={undefined} />}
            {currentStep === 4 && <TributacaoStep form={form} />}
            {currentStep === 5 && <VariacoesStep />}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t p-6 bg-background">
          <div className="flex justify-between max-w-2xl mx-auto">
            {currentStep === 1 ? (
              <Button
                variant="outline"
                onClick={() => { onComplete(); window.location.href = '/produtos'; }}
              >
                Cancelar
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handleBack}
              >
                Voltar
              </Button>
            )}
            <Button onClick={handleNext} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : currentStep === steps.length ? (
                "Salvar"
              ) : (
                "Próximo"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
