import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Tag, Folder, FolderTree } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { useCategorias } from "@/hooks/useCategorias";

const formSchema = z.object({
  nome: z.string().min(1, "Nome da categoria é obrigatório"),
  descricao: z.string().optional(),
  categoria_pai_id: z.string().optional().nullable(),
  ativo: z.boolean().default(true),
});

interface CategoriaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editandoCategoria?: { 
    id: string; 
    nome: string; 
    ativo: boolean; 
    descricao?: string; 
    categoria_pai_id?: string | null;
    subcategorias?: any[];
  };
}

export function ModalEditarCategoria({ open, onOpenChange, onSuccess, editandoCategoria }: CategoriaFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { createCategoria, updateCategoria, categorias } = useCategorias();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: editandoCategoria ? {
      nome: editandoCategoria.nome || "",
      descricao: editandoCategoria.descricao || "",
      categoria_pai_id: editandoCategoria.categoria_pai_id || null,
      ativo: editandoCategoria.ativo ?? true,
    } : {
      nome: "",
      descricao: "",
      categoria_pai_id: null,
      ativo: true,
    },
  });

  // Reset form quando editandoCategoria mudar
  useEffect(() => {
    if (editandoCategoria) {
      form.reset({
        nome: editandoCategoria.nome || "",
        descricao: editandoCategoria.descricao || "",
        categoria_pai_id: editandoCategoria.categoria_pai_id || null,
        ativo: editandoCategoria.ativo ?? true,
      });
    } else {
      form.reset({
        nome: "",
        descricao: "",
        categoria_pai_id: null,
        ativo: true,
      });
    }
  }, [editandoCategoria, form]);

  // Função recursiva para achatar a hierarquia de categorias
  const achatarCategorias = (cats: any[], nivel = 0): any[] => {
    let resultado: any[] = [];
    cats.forEach(cat => {
      resultado.push({ ...cat, nivelIndentacao: nivel });
      if (cat.subcategorias && cat.subcategorias.length > 0) {
        resultado = resultado.concat(achatarCategorias(cat.subcategorias, nivel + 1));
      }
    });
    return resultado;
  };

  const categoriasAchatadas = achatarCategorias(categorias).filter(
    cat => cat.id !== editandoCategoria?.id // Não permitir selecionar a própria categoria como pai
  );

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    
    try {
      // Calcular nível baseado na categoria pai
      let nivel = 0;
      if (values.categoria_pai_id) {
        const categoriaPai = categoriasAchatadas.find(c => c.id === values.categoria_pai_id);
        if (categoriaPai) {
          nivel = (categoriaPai.nivel || 0) + 1;
        }
      }

      const dadosCategoria = {
        ...values,
        nivel,
      };

      if (editandoCategoria?.id) {
        await updateCategoria(editandoCategoria.id, dadosCategoria);
        toast({
          title: "Categoria atualizada!",
          description: `A categoria "${values.nome}" foi atualizada com sucesso.`,
        });
      } else {
        await createCategoria(dadosCategoria);
        toast({
          title: "Categoria criada!",
          description: `A categoria "${values.nome}" foi criada com sucesso.`,
        });
      }
      
      form.reset();
      onSuccess();
    } catch (error) {
      toast({
        title: "Erro ao salvar categoria",
        description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal>
      <DialogContent className="sm:max-w-[550px] bg-card border-border" onInteractOutside={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5 text-primary" />
            {editandoCategoria?.id ? "Editar Categoria" : "Nova Categoria"}
          </DialogTitle>
          <DialogDescription>
            {editandoCategoria?.id
              ? `Edite os dados da categoria "${editandoCategoria.nome}".`
              : editandoCategoria?.categoria_pai_id
              ? "Preencha os dados para criar uma nova subcategoria."
              : "Preencha os dados para criar uma nova categoria de produtos."}
          </DialogDescription>
        </DialogHeader>

        {editandoCategoria && editandoCategoria.subcategorias && editandoCategoria.subcategorias.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border">
            <Folder className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Esta categoria possui {editandoCategoria.subcategorias.length} subcategoria{editandoCategoria.subcategorias.length > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Aviso quando estiver criando subcategoria */}
        {!editandoCategoria?.id && editandoCategoria?.categoria_pai_id && (
          <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <FolderTree className="h-4 w-4 text-primary" />
            <span className="text-sm text-foreground">
              Criando subcategoria de: <strong>{categoriasAchatadas.find(c => c.id === editandoCategoria.categoria_pai_id)?.nome || "..."}</strong>
            </span>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Nome da Categoria */}
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Nome da Categoria *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Eletrônicos, Roupas, Alimentos..." 
                      {...field}
                      className="text-base"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status Ativo/Inativo */}
            <FormField
              control={form.control}
              name="ativo"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/20">
                  <div className="space-y-1">
                    <FormLabel className="text-base font-medium">
                      Status da Categoria
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                      {field.value ? "Categoria ativa e visível no sistema" : "Categoria inativa e oculta"}
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Categoria Pai */}
            <FormField
              control={form.control}
              name="categoria_pai_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <FolderTree className="h-4 w-4" />
                    Categoria Pai
                  </FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value === "null" ? null : value)} 
                    value={field.value || "null"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria pai" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="z-[9999]">
                      <SelectItem value="null">
                        <span className="font-medium">Nenhuma (Categoria Principal)</span>
                      </SelectItem>
                      {categoriasAchatadas.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <span className="flex items-center gap-1">
                            {"  ".repeat(cat.nivelIndentacao)}
                            {cat.nivelIndentacao > 0 && "└─ "}
                            {cat.nome}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {editandoCategoria?.categoria_pai_id 
                      ? "A categoria pai já está pré-selecionada. Você pode alterá-la se necessário ou deixar em branco para criar uma categoria raiz."
                      : "Deixe em branco para criar uma categoria principal ou selecione uma categoria existente para criar uma subcategoria"}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Descrição */}
            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Adicione detalhes sobre esta categoria (opcional)" 
                      {...field}
                      rows={3}
                      className="resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Botões de Ação */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => { onOpenChange(false); window.location.href = '/produtos/categorias'; }}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Salvando..." : editandoCategoria ? "Salvar Alterações" : "Criar Categoria"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
