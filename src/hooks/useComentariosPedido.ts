import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase';
import { toast } from 'sonner';

export interface ComentarioPedido {
  id: string;
  pedido_id: string;
  usuario_id?: string;
  comentario: string;
  created_at: string;
  perfis?: {
    nome: string;
    username: string;
  };
}

export const useComentariosPedido = (pedidoId?: string) => {
  const [comentarios, setComentarios] = useState<ComentarioPedido[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchComentarios = async (id: string) => {
    if (!id) {
      console.warn('⚠️ fetchComentarios chamado sem ID');
      return;
    }

    try {
      console.log('🔄 Buscando comentários para pedido:', id);
      setLoading(true);
      const { data, error } = await supabase
        .from('comentarios_pedido')
        .select(`
          *,
          perfis (nome, username)
        `)
        .eq('pedido_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('✅ Comentários carregados:', data?.length || 0);
      setComentarios(data as any || []);
    } catch (error: any) {
      console.error('❌ Erro ao carregar comentários:', error);
      toast.error('Erro ao carregar comentários: ' + error.message);
      setComentarios([]);
    } finally {
      setLoading(false);
    }
  };

  const addComentario = async (pedido_id: string, comentario: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Você precisa estar logado para comentar');
        return;
      }

      const { data, error } = await supabase
        .from('comentarios_pedido')
        .insert([{
          pedido_id,
          usuario_id: user.id,
          comentario
        }])
        .select()
        .single();

      if (error) throw error;
      toast.success('Comentário adicionado com sucesso!');
      if (pedidoId) fetchComentarios(pedidoId);
      return data;
    } catch (error: any) {
      toast.error('Erro ao adicionar comentário: ' + error.message);
      throw error;
    }
  };

  useEffect(() => {
    if (pedidoId) {
      console.log('🔄 useComentariosPedido: pedidoId mudou para', pedidoId);
      fetchComentarios(pedidoId);
    }
  }, [pedidoId]);

  return {
    comentarios,
    loading,
    fetchComentarios,
    addComentario,
  };
};
