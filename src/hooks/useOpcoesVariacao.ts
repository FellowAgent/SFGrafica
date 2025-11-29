import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface OpcaoVariacao {
  id: string;
  atributo_id: string;
  nome: string;
  sku?: string;
  codigo_barras?: string;
  valor_adicional: number;
  estoque: number;
  imagem_url?: string;
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export function useOpcoesVariacao() {
  const [opcoes, setOpcoes] = useState<OpcaoVariacao[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOpcoes = async (atributoId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("opcoes_variacao")
        .select("*")
        .eq("atributo_id", atributoId)
        .order("ordem", { ascending: true });

      if (error) throw error;
      setOpcoes(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar opções:", error);
      toast({
        title: "Erro ao carregar opções",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createOpcao = async (opcao: Omit<OpcaoVariacao, "id" | "created_at" | "updated_at">) => {
    try {
      const { data, error } = await supabase
        .from("opcoes_variacao")
        .insert(opcao)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Opção criada",
        description: "Opção de variação criada com sucesso.",
      });

      await fetchOpcoes(opcao.atributo_id);
      return data;
    } catch (error: any) {
      console.error("Erro ao criar opção:", error);
      toast({
        title: "Erro ao criar opção",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateOpcao = async (id: string, atributoId: string, updates: Partial<OpcaoVariacao>) => {
    try {
      const { error } = await supabase
        .from("opcoes_variacao")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Opção atualizada",
        description: "Opção de variação atualizada com sucesso.",
      });

      await fetchOpcoes(atributoId);
    } catch (error: any) {
      console.error("Erro ao atualizar opção:", error);
      toast({
        title: "Erro ao atualizar opção",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteOpcao = async (id: string, atributoId: string) => {
    try {
      const { error } = await supabase
        .from("opcoes_variacao")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Opção excluída",
        description: "Opção de variação excluída com sucesso.",
      });

      await fetchOpcoes(atributoId);
    } catch (error: any) {
      console.error("Erro ao excluir opção:", error);
      toast({
        title: "Erro ao excluir opção",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const reordenarOpcoes = async (opcoesReordenadas: OpcaoVariacao[], atributoId: string) => {
    try {
      // Atualiza todas as opções em paralelo sem mostrar toast individual
      const updates = opcoesReordenadas.map((opcao, index) =>
        supabase
          .from("opcoes_variacao")
          .update({ ordem: index })
          .eq("id", opcao.id)
      );

      const results = await Promise.all(updates);
      
      // Verifica se alguma atualização falhou
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw new Error("Erro ao reordenar algumas opções");
      }

      // Mostra apenas um toast de sucesso
      toast({
        title: "Ordem atualizada",
        description: "Opções reordenadas com sucesso.",
      });

      await fetchOpcoes(atributoId);
    } catch (error: any) {
      console.error("Erro ao reordenar opções:", error);
      toast({
        title: "Erro ao reordenar",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    opcoes,
    loading,
    fetchOpcoes,
    createOpcao,
    updateOpcao,
    deleteOpcao,
    reordenarOpcoes,
  };
}
