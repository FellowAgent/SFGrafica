import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const etiquetaSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório").max(50, "Nome muito longo"),
  cor: z.string().regex(/^#[0-9A-F]{6}$/i, "Cor inválida"),
});

type EtiquetaFormData = z.infer<typeof etiquetaSchema>;

export function EtiquetasTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  const form = useForm<EtiquetaFormData>({
    resolver: zodResolver(etiquetaSchema),
    defaultValues: {
      nome: "",
      cor: "#3b82f6",
    },
  });

  const { data: etiquetas, isLoading } = useQuery({
    queryKey: ["etiquetas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("etiquetas")
        .select("*")
        .order("nome");
      
      if (error) throw error;
      return data;
    },
  });

  const criarMutation = useMutation({
    mutationFn: async (data: EtiquetaFormData) => {
      const { error } = await supabase
        .from("etiquetas")
        .insert([{ nome: data.nome, cor: data.cor }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["etiquetas"] });
      form.reset();
      toast({
        title: "Etiqueta criada",
        description: "A etiqueta foi criada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao criar etiqueta",
        description: error.message,
      });
    },
  });

  const atualizarMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EtiquetaFormData }) => {
      const { error } = await supabase
        .from("etiquetas")
        .update({ nome: data.nome, cor: data.cor })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["etiquetas"] });
      setEditandoId(null);
      form.reset();
      toast({
        title: "Etiqueta atualizada",
        description: "A etiqueta foi atualizada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar etiqueta",
        description: error.message,
      });
    },
  });

  const excluirMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("etiquetas")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["etiquetas"] });
      setExcluindoId(null);
      toast({
        title: "Etiqueta excluída",
        description: "A etiqueta foi excluída com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao excluir etiqueta",
        description: error.message,
      });
    },
  });

  const onSubmit = (data: EtiquetaFormData) => {
    if (editandoId) {
      atualizarMutation.mutate({ id: editandoId, data });
    } else {
      criarMutation.mutate(data);
    }
  };

  const handleEditar = (etiqueta: any) => {
    setEditandoId(etiqueta.id);
    form.setValue("nome", etiqueta.nome);
    form.setValue("cor", etiqueta.cor);
  };

  const handleCancelar = () => {
    setEditandoId(null);
    form.reset();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editandoId ? "Editar Etiqueta" : "Nova Etiqueta"}</CardTitle>
          <CardDescription>
            {editandoId ? "Atualize as informações da etiqueta" : "Adicione uma nova etiqueta ao sistema"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Urgente" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input type="color" {...field} className="w-20 h-10" />
                        </FormControl>
                        <FormControl>
                          <Input type="text" {...field} placeholder="#3b82f6" />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={criarMutation.isPending || atualizarMutation.isPending}>
                  {editandoId ? (
                    <>
                      <Pencil className="mr-2 h-4 w-4" />
                      Atualizar
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar
                    </>
                  )}
                </Button>
                {editandoId && (
                  <Button type="button" variant="outline" onClick={handleCancelar}>
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Etiquetas Cadastradas</CardTitle>
          <CardDescription>
            Gerencie as etiquetas disponíveis no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : etiquetas && etiquetas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {etiquetas.map((etiqueta) => (
                <div
                  key={etiqueta.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <Badge
                    style={{ 
                      backgroundColor: etiqueta.cor,
                      color: ['#fbbf24'].includes(etiqueta.cor) ? '#000' : '#fff'
                    }}
                    className="px-3 py-1.5 text-sm font-medium border-0"
                  >
                    {etiqueta.nome}
                  </Badge>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditar(etiqueta)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setExcluindoId(etiqueta.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma etiqueta cadastrada.</p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!excluindoId} onOpenChange={(open) => !open && setExcluindoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta etiqueta? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => excluindoId && excluirMutation.mutate(excluindoId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
