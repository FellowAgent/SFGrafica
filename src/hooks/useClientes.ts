import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase";
import { toast } from "@/hooks/use-toast";
import { clienteSchema, clienteUpdateSchema } from "@/schemas/cliente.schema";

export interface Cliente {
  id: string;
  nome: string;
  cpf_cnpj: string;
  email?: string;
  celular: string;
  telefone?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  tipo: "Pessoa Física" | "Pessoa Jurídica";
  ativo: boolean;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export const useClientes = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [globalStats, setGlobalStats] = useState({
    total: 0,
    ativos: 0,
    inativos: 0,
    pf: 0,
    pj: 0,
  });

  const fetchGlobalStats = async () => {
    try {
      const { data, error } = await supabase
        .from("clientes")
        .select("ativo, tipo");

      if (error) throw error;
      
      const stats = {
        total: data?.length || 0,
        ativos: data?.filter(c => c.ativo).length || 0,
        inativos: data?.filter(c => !c.ativo).length || 0,
        pf: data?.filter(c => c.tipo === 'Pessoa Física').length || 0,
        pj: data?.filter(c => c.tipo === 'Pessoa Jurídica').length || 0,
      };
      
      setGlobalStats(stats);
    } catch (error) {
      // Não mostrar erro se for problema de autenticação
      const errorMessage = error instanceof Error ? error.message : '';
      if (!errorMessage.includes('JWT') && !errorMessage.includes('permission denied')) {
        console.error("Erro ao carregar estatísticas:", error);
      }
    }
  };

  const fetchClientes = async (
    page = 1,
    pageSize = 25,
    searchTerm = "",
    filterStatus = "todos",
    filterTipo = "todos"
  ) => {
    try {
      setLoading(true);
      
      const start = (page - 1) * pageSize;
      const end = start + pageSize - 1;

      let query = supabase
        .from("clientes")
        .select("*", { count: 'exact' })
        .order("nome", { ascending: true });

      // Filtro de busca (só aplica se tiver 2+ caracteres)
      if (searchTerm.length >= 2) {
        query = query.or(`nome.ilike.%${searchTerm}%,cpf_cnpj.ilike.%${searchTerm}%`);
      }

      // Filtro de status
      if (filterStatus === "ativos") {
        query = query.eq("ativo", true);
      } else if (filterStatus === "inativos") {
        query = query.eq("ativo", false);
      }

      // Filtro de tipo
      if (filterTipo !== "todos") {
        query = query.eq("tipo", filterTipo as "Pessoa Física" | "Pessoa Jurídica");
      }

      // Paginação
      query = query.range(start, end);

      const { data, error, count } = await query;

      if (error) throw error;
      
      setClientes((data as any) || []);
      setTotalCount(count || 0);
      
      // Atualiza estatísticas globais
      await fetchGlobalStats();
    } catch (error) {
      // Não mostrar erro se for problema de autenticação
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      if (!errorMessage.includes('JWT') && !errorMessage.includes('permission denied')) {
        toast({ title: "Erro", description: "Erro ao carregar clientes: " + errorMessage, variant: "destructive" });
      }
      console.warn('Clientes fetch error:', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const createCliente = async (input: unknown) => {
    try {
      // Validate input
      const validated = clienteSchema.parse(input);

      const { data, error } = await supabase
        .from("clientes")
        .insert([validated as any])
        .select()
        .single();

      if (error) throw error;
      toast({ title: "Sucesso", description: "Cliente cadastrado com sucesso!", variant: "success" });
      fetchClientes();
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({ title: "Erro", description: "Erro ao cadastrar cliente: " + errorMessage, variant: "destructive" });
      throw error;
    }
  };

  const updateCliente = async (id: string, input: unknown) => {
    try {
      // Validate input
      const validated = clienteUpdateSchema.parse(input);

      // @ts-expect-error - RPC function exists but not in types
      const { error } = await supabase
        .from("clientes")
        .update(validated as any)
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Sucesso", description: "Cliente atualizado com sucesso!", variant: "success" });
      fetchClientes();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({ title: "Erro", description: "Erro ao atualizar cliente: " + errorMessage, variant: "destructive" });
      throw error;
    }
  };

  const deleteCliente = async (id: string) => {
    try {
      // @ts-expect-error - RPC function exists but not in types
      const { error } = await supabase.from("clientes").delete().eq("id", id);

      if (error) throw error;
      toast({ title: "Sucesso", description: "Cliente excluído com sucesso!", variant: "success" });
      fetchClientes();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({ title: "Erro", description: "Erro ao excluir cliente: " + errorMessage, variant: "destructive" });
      throw error;
    }
  };

  const toggleStatus = async (id: string, ativo: boolean) => {
    try {
      // @ts-expect-error - RPC function exists but not in types
      const { error } = await supabase
        .from("clientes")
        .update({ ativo } as any)
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Sucesso", description: `Cliente ${ativo ? "ativado" : "desativado"} com sucesso!`, variant: "success" });
      fetchClientes();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({ title: "Erro", description: "Erro ao atualizar status: " + errorMessage, variant: "destructive" });
      throw error;
    }
  };

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        fetchClientes();
        fetchGlobalStats();
      }
    };
    
    checkAuthAndFetch();
    
    // Listener para carregar quando usuário logar
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        fetchClientes();
        fetchGlobalStats();
      }
    });
    
    return () => subscription.unsubscribe();
  }, []);

  return {
    clientes,
    loading,
    totalCount,
    globalStats,
    fetchClientes,
    createCliente,
    updateCliente,
    deleteCliente,
    toggleStatus,
  };
};
