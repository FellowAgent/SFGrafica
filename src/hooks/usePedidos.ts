import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase';
import { toast } from '@/utils/toastHelper';

export interface Pedido {
  id: string;
  numero_pedido: string;
  cliente_id?: string;
  vendedor_id?: string;
  status: string;
  tipo_retirada: 'balcao' | 'entrega';
  prazo_entrega?: string;
  unidade_prazo?: 'imediatamente' | 'minutos' | 'horas' | 'dias' | 'semanas';
  codigo_retirada?: string;
  observacoes?: string;
  total: number;
  desconto_total: number;
  valor_final: number;
  meio_pagamento?: string;
  gerar_nf: boolean;
  data_entrega?: string;
  created_at: string;
  updated_at: string;
}

export const usePedidos = () => {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPedidos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          *,
          clientes (
            id,
            nome,
            celular,
            cpf_cnpj
          )
        `)
        .order('created_at', { ascending: false })
        .limit(1000); // Aumentar limite para 1000

      if (error) throw error;
      setPedidos(data as any || []);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      // Não mostrar erro se for problema de autenticação
      const errorMessage = error instanceof Error ? error.message : '';
      if (!errorMessage.includes('JWT') && !errorMessage.includes('permission denied')) {
        toast.error('Erro ao carregar pedidos do banco');
      }
      console.warn('Pedidos fetch error:', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchPedidoById = async (identificador: string) => {
    try {
      // Detectar se é UUID (formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identificador);
      
      let query = supabase
        .from('pedidos')
        .select(`
          *,
          clientes (
            id,
            nome,
            celular,
            email,
            cpf_cnpj,
            telefone,
            endereco,
            numero,
            complemento,
            bairro,
            cidade,
            estado,
            cep
          )
        `);
      
      // Buscar por ID ou numero_pedido
      if (isUUID) {
        query = query.eq('id', identificador);
      } else {
        // Buscar pelo número do pedido sem normalização
        query = query.eq('numero_pedido', identificador.toString());
      }
      
      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao buscar pedido:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao carregar pedido: ' + errorMessage);
      throw error;
    }
  };

  const createPedido = async (pedido: Partial<Pedido>) => {
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .insert([pedido as any])
        .select()
        .single();

      if (error) throw error;
      toast.success('Pedido criado com sucesso!');
      fetchPedidos();
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao criar pedido: ' + errorMessage);
      throw error;
    }
  };

  const updatePedido = async (id: string, pedido: Partial<Pedido>) => {
    try {
      console.log('📝 Atualizando pedido:', { id, pedido });
      
      const { data, error } = await supabase
        .from('pedidos')
        .update(pedido)
        .eq('id', id)
        .select();

      if (error) {
        console.error('❌ Erro ao atualizar pedido:', error);
        throw error;
      }
      
      console.log('✅ Pedido atualizado:', data);
      
      fetchPedidos();
      return data?.[0] || data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao atualizar pedido: ' + errorMessage);
      throw error;
    }
  };

  const deletePedido = async (id: string) => {
    try {
      // @ts-expect-error - RPC function exists but not in types
      const { error } = await supabase
        .from('pedidos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Pedido excluído com sucesso!');
      fetchPedidos();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao excluir pedido: ' + errorMessage);
      throw error;
    }
  };

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        fetchPedidos();
      }
    };
    
    checkAuthAndFetch();
    
    // Listener para carregar quando usuário logar
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        fetchPedidos();
      }
    });
    
    return () => subscription.unsubscribe();
  }, []);

  return {
    pedidos,
    loading,
    fetchPedidos,
    fetchPedidoById,
    createPedido,
    updatePedido,
    deletePedido,
  };
};
