import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { templateVariacaoSchema } from "@/schemas/variacao.schema";
import { useTemplatesVariacoes } from "@/hooks/useTemplatesVariacoes";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { EstruturaTabLocal } from "./EstruturaTabLocal";
import { OpcoesTabLocalMelhorado } from "./OpcoesTabLocalMelhorado";
import { PreviewTab, PreviewTabRef } from "./PreviewTab";
import { AtributoVariacao } from "@/hooks/useAtributosVariacao";
import { OpcaoVariacao } from "@/hooks/useOpcoesVariacao";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
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

interface ModalGerenciarVariacoesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: any;
  onSuccess?: () => void;
}

export interface LocalAtributo extends Omit<AtributoVariacao, 'id' | 'created_at' | 'updated_at'> {
  id: string;
  filhos?: LocalAtributo[];
}

export interface LocalOpcao extends Omit<OpcaoVariacao, 'id' | 'created_at' | 'updated_at'> {
  id: string;
}

export function ModalGerenciarVariacoes({ open, onOpenChange, template, onSuccess }: ModalGerenciarVariacoesProps) {
  const { createTemplate, updateTemplate, fetchTemplates } = useTemplatesVariacoes();
  const [activeTab, setActiveTab] = useState("dados");
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [localAtributos, setLocalAtributos] = useState<LocalAtributo[]>([]);
  const [localOpcoes, setLocalOpcoes] = useState<Map<string, LocalOpcao[]>>(new Map());
  const [hasChanges, setHasChanges] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const previewTabRef = useRef<PreviewTabRef>(null);

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

  const form = useForm({
    resolver: zodResolver(templateVariacaoSchema),
    defaultValues: {
      nome: "",
      descricao: "",
      ativo: true,
      ordem: 0,
    },
  });

  useEffect(() => {
    if (open) {
      if (template) {
        form.reset(template);
        setTemplateId(template.id);
        loadExistingData(template.id);
      } else {
        form.reset({
          nome: "",
          descricao: "",
          ativo: true,
          ordem: 0,
        });
        setTemplateId(null);
        setLocalAtributos([]);
        setLocalOpcoes(new Map());
        setHasChanges(false);
      }
    }
  }, [template, form, open]);

  const loadExistingData = async (templateId: string) => {
    try {
      // Carregar atributos existentes
      const { data: atributos, error: attrError } = await supabase
        .from("atributos_variacao")
        .select("*")
        .eq("template_id", templateId)
        .order("ordem", { ascending: true });

      if (attrError) throw attrError;

      // Construir hierarquia
      const atributosMap = new Map<string, LocalAtributo>();
      const atributosRaiz: LocalAtributo[] = [];

      atributos?.forEach(attr => {
        atributosMap.set(attr.id, { ...attr, filhos: [] });
      });

      atributos?.forEach(attr => {
        const atributo = atributosMap.get(attr.id)!;
        if (attr.pai_id) {
          const pai = atributosMap.get(attr.pai_id);
          if (pai) {
            pai.filhos = pai.filhos || [];
            pai.filhos.push(atributo);
          }
        } else {
          atributosRaiz.push(atributo);
        }
      });

      setLocalAtributos(atributosRaiz);

      // Carregar opções para cada atributo
      const opcoesMap = new Map<string, LocalOpcao[]>();
      for (const attr of atributos || []) {
        const { data: opcoes, error: opcoesError } = await supabase
          .from("opcoes_variacao")
          .select("*")
          .eq("atributo_id", attr.id)
          .order("ordem", { ascending: true });

        if (opcoesError) throw opcoesError;
        if (opcoes && opcoes.length > 0) {
          opcoesMap.set(attr.id, opcoes);
        }
      }

      setLocalOpcoes(opcoesMap);
      setHasChanges(false);
    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Detectar mudanças no formulário
  useEffect(() => {
    const subscription = form.watch(() => {
      setHasChanges(true);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const handleAtributosChange = (atributos: LocalAtributo[]) => {
    setLocalAtributos(atributos);
    setHasChanges(true);
  };

  const handleOpcoesChange = (atributoId: string, opcoes: LocalOpcao[]) => {
    const newMap = new Map(localOpcoes);
    newMap.set(atributoId, opcoes);
    setLocalOpcoes(newMap);
    setHasChanges(true);
  };

  const saveAllData = async (closeAfterSave: boolean = false) => {
    try {
      setIsSaving(true);

      // Validar dados da variação
      const dadosBasicos = form.getValues();
      const validation = templateVariacaoSchema.safeParse(dadosBasicos);
      
      if (!validation.success) {
        toast({
          title: "Erro de validação",
          description: "Por favor, preencha todos os campos obrigatórios na aba Dados da Variação.",
          variant: "destructive",
        });
        setActiveTab("dados");
        setIsSaving(false);
        return;
      }

      // Validar atributos
      const validateAtributos = (attrs: LocalAtributo[]): boolean => {
        for (const attr of attrs) {
          if (!attr.nome || attr.nome.trim() === "") {
            toast({
              title: "Erro de validação",
              description: "Todos os atributos devem ter um nome.",
              variant: "destructive",
            });
            setActiveTab("estrutura");
            return false;
          }
          if (attr.filhos && attr.filhos.length > 0) {
            if (!validateAtributos(attr.filhos)) {
              return false;
            }
          }
        }
        return true;
      };

      if (!validateAtributos(localAtributos)) {
        setIsSaving(false);
        return;
      }

      // Validar opções
      for (const [atributoId, opcoesArray] of localOpcoes.entries()) {
        for (const opcao of opcoesArray) {
          if (!opcao.nome || opcao.nome.trim() === "") {
            toast({
              title: "Erro de validação",
              description: "Todas as opções devem ter um nome.",
              variant: "destructive",
            });
            setActiveTab("opcoes");
            setIsSaving(false);
            return;
          }
        }
      }

      // 1. Salvar ou atualizar template
      let finalTemplateId = templateId;
      const isTemp = templateId?.startsWith('temp_');
      
      if (isTemp || !templateId) {
        // Verificar novamente se já existe template com o mesmo nome
        const { data: existingTemplates, error: checkError } = await supabase
          .from("templates_variacoes")
          .select("id, nome")
          .eq("nome", dadosBasicos.nome);

        if (checkError) throw checkError;

        if (existingTemplates && existingTemplates.length > 0) {
          toast({
            title: "Nome duplicado",
            description: "Já existe uma variação com este nome. Por favor, escolha outro nome.",
            variant: "destructive",
          });
          setActiveTab("dados");
          setIsSaving(false);
          return;
        }

        const newTemplate = await createTemplate(dadosBasicos);
        finalTemplateId = newTemplate.id;
        setTemplateId(finalTemplateId);
      } else {
        await updateTemplate(templateId, dadosBasicos);
      }

      // 2. Salvar atributos
      const atributoIdMap = new Map<string, string>(); // mapeia IDs temporários para IDs reais
      
      // Função recursiva para salvar atributos
      const saveAtributo = async (atributo: LocalAtributo, paiIdReal?: string): Promise<string> => {
        const isTemp = atributo.id.startsWith('temp_');
        
        const atributoData = {
          template_id: finalTemplateId!,
          nome: atributo.nome,
          pai_id: paiIdReal || atributo.pai_id,
          nivel: atributo.nivel,
          ordem: atributo.ordem,
        };

        if (isTemp) {
          // Criar novo atributo
          const { data, error } = await supabase
            .from("atributos_variacao")
            .insert(atributoData)
            .select()
            .single();

          if (error) throw error;
          atributoIdMap.set(atributo.id, data.id);
          
          // Salvar filhos recursivamente
          if (atributo.filhos && atributo.filhos.length > 0) {
            for (const filho of atributo.filhos) {
              await saveAtributo(filho, data.id);
            }
          }
          
          return data.id;
        } else {
          // Atualizar atributo existente
          const { error } = await supabase
            .from("atributos_variacao")
            .update(atributoData)
            .eq("id", atributo.id);

          if (error) throw error;
          atributoIdMap.set(atributo.id, atributo.id);
          
          // Salvar filhos recursivamente
          if (atributo.filhos && atributo.filhos.length > 0) {
            for (const filho of atributo.filhos) {
              await saveAtributo(filho, atributo.id);
            }
          }
          
          return atributo.id;
        }
      };

      // Salvar todos os atributos raiz
      for (const atributo of localAtributos) {
        await saveAtributo(atributo);
      }

      // 3. Salvar opções
      for (const [atributoIdOriginal, opcoes] of localOpcoes.entries()) {
        const atributoIdReal = atributoIdMap.get(atributoIdOriginal) || atributoIdOriginal;
        
        for (const opcao of opcoes) {
          const isTemp = opcao.id.startsWith('temp_');
          
          const opcaoData = {
            atributo_id: atributoIdReal,
            nome: opcao.nome,
            sku: opcao.sku,
            codigo_barras: opcao.codigo_barras,
            valor_adicional: opcao.valor_adicional,
            estoque: opcao.estoque,
            imagem_url: opcao.imagem_url,
            ativo: opcao.ativo,
            ordem: opcao.ordem,
          };

          if (isTemp) {
            const { error } = await supabase
              .from("opcoes_variacao")
              .insert(opcaoData);

            if (error) throw error;
          } else {
            const { error } = await supabase
              .from("opcoes_variacao")
              .update(opcaoData)
              .eq("id", opcao.id);

            if (error) throw error;
          }
        }
      }

      // 4. Salvar variações ativas (se houver ref do PreviewTab)
      if (previewTabRef.current) {
        await previewTabRef.current.salvarVariacoesAtivas();
      }

      toast({
        title: "Sucesso",
        description: "Template de variação salvo com sucesso!",
      });

      setHasChanges(false);
      await fetchTemplates();

      // Notificar a página principal para recarregar os dados
      if (onSuccess) {
        onSuccess();
      }

      if (closeAfterSave) {
        handleClose();
      } else {
        // Recarregar dados atualizados
        if (finalTemplateId) {
          await loadExistingData(finalTemplateId);
        }
      }
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setTemplateId(null);
    setLocalAtributos([]);
    setLocalOpcoes(new Map());
    setActiveTab("dados");
    setHasChanges(false);
    onOpenChange(false);
  };

  const handleCancelClick = () => {
    if (hasChanges) {
      setShowCancelDialog(true);
    } else {
      handleClose();
    }
  };

  const handleConfirmCancel = () => {
    setShowCancelDialog(false);
    handleClose();
  };

  const onSubmitDadosBasicos = async (data: any) => {
    // Na aba de dados da variação, apenas validar se já existe template com mesmo nome
    try {
      if (!templateId) {
        // Verificar se já existe template com o mesmo nome
        const { data: existingTemplates, error } = await supabase
          .from("templates_variacoes")
          .select("id, nome")
          .eq("nome", data.nome);

        if (error) throw error;

        if (existingTemplates && existingTemplates.length > 0) {
          toast({
            title: "Nome duplicado",
            description: "Já existe uma variação com este nome. Por favor, escolha outro nome.",
            variant: "destructive",
          });
          return;
        }

        // Criar um ID temporário para habilitar outras abas
        setTemplateId(`temp_${Date.now()}`);
        setActiveTab("estrutura");
        setHasChanges(true);
      } else {
        // Marca que houve mudanças e move para a próxima aba
        setHasChanges(true);
        setActiveTab("estrutura");
      }
    } catch (error) {
      console.error("Erro ao validar dados da variação:", error);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) {
          // Ao tentar fechar o diálogo, tratar como cancelar
          handleCancelClick();
        }
      }}>
        <DialogContent className={`${activeTab === "preview" ? "max-w-[95vw]" : "max-w-5xl"} max-h-[85vh] top-[52%] flex flex-col p-0 transition-all duration-300`}>
          <div className="px-6 pt-6 pb-4 border-b">
            <DialogHeader>
              <DialogTitle>
                {template ? "Editar Variação" : "Nova Variação"}
              </DialogTitle>
            </DialogHeader>
          </div>

          <div ref={dialogContentRef} className="flex-1 overflow-y-auto px-6 py-4">
            <Tabs value={activeTab} onValueChange={(value) => {
              setActiveTab(value);
              // Scroll para o topo ao trocar de aba
              if (dialogContentRef.current) {
                dialogContentRef.current.scrollTop = 0;
              }
            }}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="dados">Dados da Variação</TabsTrigger>
              <TabsTrigger value="estrutura" disabled={!templateId}>Atributos</TabsTrigger>
              <TabsTrigger value="opcoes" disabled={!templateId}>Valores</TabsTrigger>
              <TabsTrigger value="preview" disabled={!templateId}>Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="dados" className="space-y-4 mt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitDadosBasicos)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <LabelWithCounter
                            label="Nome da Variação"
                            currentLength={field.value?.length || 0}
                            maxLength={100}
                            required={true}
                          />
                          <span className="text-muted-foreground font-normal text-xs block mt-1">
                            O nome do tipo de produto em que essa variação será aplicada. Ex: Papéis, Camisetas, Sapatos, Perfumes, e etc..
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ex: Papéis, Panfletos, Canetas, Camisetas, etc.." 
                            maxLength={100}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="descricao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <LabelWithCounter
                            label="Descrição"
                            currentLength={field.value?.length || 0}
                            maxLength={500}
                          />
                        </FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Descrição da variação..." 
                            maxLength={500}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ativo"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Variação Ativa:</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Variações inativas não aparecem na seleção de produtos
                          </p>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={handleCancelClick}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {templateId ? "Atualizar" : "Criar e Continuar"}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="estrutura" className="space-y-4 mt-6">
              {templateId && (
                <>
                  <EstruturaTabLocal
                    atributos={localAtributos}
                    onAtributosChange={handleAtributosChange}
                  />
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={handleCancelClick}>
                      Cancelar
                    </Button>
                    <Button onClick={() => saveAllData(false)} disabled={isSaving}>
                      {isSaving ? "Salvando..." : "Salvar"}
                    </Button>
                    <Button onClick={() => saveAllData(true)} disabled={isSaving}>
                      {isSaving ? "Salvando..." : "Salvar e Sair"}
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="opcoes" className="space-y-4 mt-6">
              {templateId && (
                <>
                  <OpcoesTabLocalMelhorado
                    atributos={localAtributos}
                    opcoes={localOpcoes}
                    onOpcoesChange={handleOpcoesChange}
                  />
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={handleCancelClick}>
                      Cancelar
                    </Button>
                    <Button onClick={() => saveAllData(false)} disabled={isSaving}>
                      {isSaving ? "Salvando..." : "Salvar"}
                    </Button>
                    <Button onClick={() => saveAllData(true)} disabled={isSaving}>
                      {isSaving ? "Salvando..." : "Salvar e Sair"}
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="preview" className="space-y-4 mt-6">
              {templateId && (
                <>
                  <PreviewTab ref={previewTabRef} templateId={templateId} />
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={handleCancelClick}>
                      Cancelar
                    </Button>
                    <Button onClick={() => saveAllData(false)} disabled={isSaving}>
                      {isSaving ? "Salvando..." : "Salvar"}
                    </Button>
                    <Button onClick={() => saveAllData(true)} disabled={isSaving}>
                      {isSaving ? "Salvando..." : "Salvar e Sair"}
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="z-[9999]">
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações não salvas. Tem certeza que deseja descartar essas alterações e fechar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar Editando</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCancel}>
              Descartar Alterações
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
