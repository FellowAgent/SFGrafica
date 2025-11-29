import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase';
import { toast } from '@/utils/toastHelper';

export interface ItemPedido {
  id: string;
  pedido_id: string;
  produto_id?: string;
  variacao_id?: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  desconto: number;
  observacoes?: string;
  unidade_medida?: string;
  created_at: string;
  produtos?: {
    nome: string;
    codigo_barras?: string;
  };
  variacoes_produto?: {
    nome: string;
  };
}

export const useItensPedido = (pedidoId?: string) => {
  const [itens, setItens] = useState<ItemPedido[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchItens = async (id: string) => {
    if (!id) {
      console.warn('⚠️ fetchItens chamado sem ID');
      return;
    }

    try {
      console.log('🔄 Buscando itens para pedido:', id);
      setLoading(true);
      const { data, error } = await supabase
        .from('itens_pedido')
        .select(`
          *,
          produtos (nome, codigo_barras),
          variacoes_produto (nome)
        `)
        .eq('pedido_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      console.log('✅ Itens carregados:', data?.length || 0);
      setItens(data as any || []);
    } catch (error: any) {
      console.error('❌ Erro ao carregar itens:', error);
      toast.error('Erro ao carregar itens do pedido: ' + error.message);
      setItens([]);
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (item: Partial<ItemPedido>) => {
    try {
      const { data, error } = await supabase
        .from('itens_pedido')
        .insert([item as any])
        .select()
        .single();

      if (error) throw error;
      toast.success('Item adicionado com sucesso!');
      if (pedidoId) fetchItens(pedidoId);
      return data;
    } catch (error: any) {
      toast.error('Erro ao adicionar item: ' + error.message);
      throw error;
    }
  };

  const updateItem = async (id: string, item: Partial<ItemPedido>) => {
    try {
      const { error } = await supabase
        .from('itens_pedido')
        .update(item as any)
        .eq('id', id);

      if (error) throw error;
      toast.success('Item atualizado com sucesso!');
      if (pedidoId) fetchItens(pedidoId);
    } catch (error: any) {
      toast.error('Erro ao atualizar item: ' + error.message);
      throw error;
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('itens_pedido')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Item excluído com sucesso!');
      if (pedidoId) fetchItens(pedidoId);
    } catch (error: any) {
      toast.error('Erro ao excluir item: ' + error.message);
      throw error;
    }
  };

  useEffect(() => {
    if (pedidoId) {
      console.log('🔄 useItensPedido: pedidoId mudou para', pedidoId);
      fetchItens(pedidoId);
    }
  }, [pedidoId]);

  return {
    itens,
    loading,
    fetchItens,
    addItem,
    updateItem,
    deleteItem,
  };
};
