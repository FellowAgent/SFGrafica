import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase";
import { toast } from "@/hooks/use-toast";
import { produtoSchema, produtoUpdateSchema } from "@/schemas/produto.schema";

export interface CategoriaPai {
  id: string;
  nome: string;
}

export interface Categoria {
  id: string;
  nome: string;
  categoria_pai_id?: string;
  categorias?: CategoriaPai;
}

export interface Produto {
  id: string;
  nome: string;
  codigo_barras?: string;
  categoria_id?: string;
  categorias?: Categoria;
  produtos_categorias?: Array<{ categorias: Categoria }>;
  descricao?: string;
  preco: number;
  custo: number;
  desconto?: number;
  tipo_desconto?: "valor" | "porcentagem";
  unidade_medida: string;
  ativo: boolean;
  estoque: number;
  estoque_minimo: number;
  imagem_url?: string;
  created_at: string;
  updated_at: string;
  descricao_curta?: string;
  descricao_complementar?: string;
  observacoes?: string;
  tags?: string[];
  ncm?: string;
  cest?: string;
  origem?: string;
  cfop?: string;
  icms_cst?: string;
  icms_aliquota?: number;
  pis_cst?: string;
  pis_aliquota?: number;
  cofins_cst?: string;
  cofins_aliquota?: number;
  codigo_servico?: string;
  iss_aliquota?: number;
}

export const useProdutos = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProdutos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('produtos')
        .select(`
          *,
          categorias:categoria_id (
            id,
            nome,
            categoria_pai_id,
            categorias:categoria_pai_id (
              id,
              nome,
              categoria_pai_id,
              categorias:categoria_pai_id (
                id,
                nome
              )
            )
          ),
          produtos_categorias (
            categorias:categoria_id (
              id,
              nome,
              categoria_pai_id,
              categorias:categoria_pai_id (
                id,
                nome,
                categoria_pai_id,
                categorias:categoria_pai_id (
                  id,
                  nome
                )
              )
            )
          )
        `)
        .order('nome', { ascending: true });

      if (error) throw error;
      setProdutos(data as any || []);
    } catch (error: any) {
      // Não mostrar erro se for problema de autenticação
      if (!error.message?.includes('JWT') && !error.message?.includes('permission denied')) {
        toast({ title: "Erro", description: 'Erro ao carregar produtos: ' + error.message, variant: "destructive" });
      }
      console.warn('Produtos fetch error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const createProduto = async (input: unknown) => {
    try {
      // Validate input
      const validated = produtoSchema.parse(input);
      const { categorias_ids, ...produtoData } = validated as any;
      
      const { data, error } = await supabase
        .from('produtos')
        .insert([produtoData])
        .select()
        .single();

      if (error) throw error;

      // Criar relacionamentos com categorias
      if (categorias_ids && categorias_ids.length > 0) {
        const relacionamentos = categorias_ids.map((categoria_id: string) => ({
          produto_id: data.id,
          categoria_id,
        }));

        const { error: relError } = await supabase
          .from('produtos_categorias')
          .insert(relacionamentos);

        if (relError) throw relError;
      }

      toast({ title: "Sucesso", description: 'Produto criado com sucesso!', variant: "success" });
      fetchProdutos();
      return data;
    } catch (error: any) {
      toast({ title: "Erro", description: 'Erro ao criar produto: ' + error.message, variant: "destructive" });
      throw error;
    }
  };

  const updateProduto = async (id: string, input: unknown) => {
    try {
      // Validate input
      const validated = produtoUpdateSchema.parse(input);
      const { categorias_ids, ...produtoData } = validated as any;
      
      // @ts-ignore
      const { error } = await supabase
        .from('produtos')
        .update(produtoData)
        .eq('id', id);

      if (error) throw error;

      // Atualizar relacionamentos com categorias
      if (categorias_ids !== undefined) {
        // Remover relacionamentos existentes
        await supabase
          .from('produtos_categorias')
          .delete()
          .eq('produto_id', id);

        // Criar novos relacionamentos
        if (categorias_ids.length > 0) {
          const relacionamentos = categorias_ids.map((categoria_id: string) => ({
            produto_id: id,
            categoria_id,
          }));

          const { error: relError } = await supabase
            .from('produtos_categorias')
            .insert(relacionamentos);

          if (relError) throw relError;
        }
      }

      toast({ title: "Sucesso", description: 'Produto atualizado com sucesso!', variant: "success" });
      fetchProdutos();
    } catch (error: any) {
      toast({ title: "Erro", description: 'Erro ao atualizar produto: ' + error.message, variant: "destructive" });
      throw error;
    }
  };

  const deleteProduto = async (id: string) => {
    try {
      // @ts-ignore
      const { error } = await supabase
        .from('produtos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Sucesso", description: 'Produto excluído com sucesso!', variant: "success" });
      fetchProdutos();
    } catch (error: any) {
      toast({ title: "Erro", description: 'Erro ao excluir produto: ' + error.message, variant: "destructive" });
      throw error;
    }
  };

  const toggleStatus = async (id: string, ativo: boolean) => {
    try {
      // @ts-ignore
      const { error } = await supabase
        .from('produtos')
        .update({ ativo } as any)
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Sucesso", description: `Produto ${ativo ? 'ativado' : 'desativado'} com sucesso!`, variant: "success" });
      fetchProdutos();
    } catch (error: any) {
      toast({ title: "Erro", description: 'Erro ao atualizar status: ' + error.message, variant: "destructive" });
      throw error;
    }
  };

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        fetchProdutos();
      }
    };
    
    checkAuthAndFetch();
    
    // Listener para carregar quando usuário logar
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        fetchProdutos();
      }
    });
    
    return () => subscription.unsubscribe();
  }, []);

  return {
    produtos,
    loading,
    fetchProdutos,
    createProduto,
    updateProduto,
    deleteProduto,
    toggleStatus,
  };
};
