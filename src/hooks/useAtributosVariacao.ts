import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface AtributoVariacao {
  id: string;
  template_id: string;
  nome: string;
  pai_id?: string | null;
  nivel: number;
  ordem: number;
  created_at: string;
  updated_at: string;
  filhos?: AtributoVariacao[];
}

export function useAtributosVariacao() {
  const [atributos, setAtributos] = useState<AtributoVariacao[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAtributos = async (templateId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("atributos_variacao")
        .select("*")
        .eq("template_id", templateId)
        .order("ordem", { ascending: true });

      if (error) throw error;

      // Construir hierarquia
      const atributosMap = new Map<string, AtributoVariacao>();
      const atributosRaiz: AtributoVariacao[] = [];

      data?.forEach(attr => {
        atributosMap.set(attr.id, { ...attr, filhos: [] });
      });

      data?.forEach(attr => {
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

      setAtributos(atributosRaiz);
    } catch (error: any) {
      console.error("Erro ao buscar atributos:", error);
      toast({
        title: "Erro ao carregar atributos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createAtributo = async (atributo: Omit<AtributoVariacao, "id" | "created_at" | "updated_at" | "filhos">) => {
    try {
      const { data, error } = await supabase
        .from("atributos_variacao")
        .insert(atributo)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Atributo criado",
        description: "Atributo de variação criado com sucesso.",
      });

      await fetchAtributos(atributo.template_id);
      return data;
    } catch (error: any) {
      console.error("Erro ao criar atributo:", error);
      toast({
        title: "Erro ao criar atributo",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateAtributo = async (id: string, templateId: string, updates: Partial<AtributoVariacao>) => {
    try {
      const { error } = await supabase
        .from("atributos_variacao")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Atributo atualizado",
        description: "Atributo de variação atualizado com sucesso.",
      });

      await fetchAtributos(templateId);
    } catch (error: any) {
      console.error("Erro ao atualizar atributo:", error);
      toast({
        title: "Erro ao atualizar atributo",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteAtributo = async (id: string, templateId: string) => {
    try {
      const { error } = await supabase
        .from("atributos_variacao")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Atributo excluído",
        description: "Atributo de variação excluído com sucesso.",
      });

      await fetchAtributos(templateId);
    } catch (error: any) {
      console.error("Erro ao excluir atributo:", error);
      toast({
        title: "Erro ao excluir atributo",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const reordenarAtributos = async (templateId: string, atributos: { id: string; ordem: number }[]) => {
    try {
      const updates = atributos.map(({ id, ordem }) =>
        supabase
          .from("atributos_variacao")
          .update({ ordem })
          .eq("id", id)
      );

      await Promise.all(updates);
      await fetchAtributos(templateId);
    } catch (error: any) {
      console.error("Erro ao reordenar atributos:", error);
      toast({
        title: "Erro ao reordenar atributos",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    atributos,
    loading,
    fetchAtributos,
    createAtributo,
    updateAtributo,
    deleteAtributo,
    reordenarAtributos,
  };
}
