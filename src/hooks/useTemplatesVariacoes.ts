import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface TemplateVariacao {
  id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export function useTemplatesVariacoes() {
  const [templates, setTemplates] = useState<TemplateVariacao[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("templates_variacoes")
        .select("*")
        .order("ordem", { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar templates:", error);
      toast({
        title: "Erro ao carregar templates",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async (template: Omit<TemplateVariacao, "id" | "created_at" | "updated_at">) => {
    try {
      const { data, error } = await supabase
        .from("templates_variacoes")
        .insert(template)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Template criado",
        description: "Template de variação criado com sucesso.",
      });

      await fetchTemplates();
      return data;
    } catch (error: any) {
      console.error("Erro ao criar template:", error);
      toast({
        title: "Erro ao criar template",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateTemplate = async (id: string, updates: Partial<TemplateVariacao>) => {
    try {
      const { error } = await supabase
        .from("templates_variacoes")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Template atualizado",
        description: "Template de variação atualizado com sucesso.",
      });

      await fetchTemplates();
    } catch (error: any) {
      console.error("Erro ao atualizar template:", error);
      toast({
        title: "Erro ao atualizar template",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      // Primeiro, buscar todos os atributos deste template
      const { data: atributos, error: atributosError } = await supabase
        .from("atributos_variacao")
        .select("id")
        .eq("template_id", id);

      if (atributosError) throw atributosError;

      // Se houver atributos, excluir as opções de cada um
      if (atributos && atributos.length > 0) {
        const atributoIds = atributos.map(attr => attr.id);
        
        const { error: opcoesError } = await supabase
          .from("opcoes_variacao")
          .delete()
          .in("atributo_id", atributoIds);

        if (opcoesError) throw opcoesError;
      }

      // Excluir os atributos do template
      const { error: deleteAtributosError } = await supabase
        .from("atributos_variacao")
        .delete()
        .eq("template_id", id);

      if (deleteAtributosError) throw deleteAtributosError;

      // Por fim, excluir o template
      const { error } = await supabase
        .from("templates_variacoes")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Template excluído",
        description: "Template de variação excluído com sucesso.",
      });

      await fetchTemplates();
    } catch (error: any) {
      console.error("Erro ao excluir template:", error);
      toast({
        title: "Erro ao excluir template",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  return {
    templates,
    loading,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}
