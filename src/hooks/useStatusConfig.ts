import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface StatusConfig {
  id: string;
  nome: string;
  cor: string;
  text_color: string;
  ordem: number;
  ativo: boolean;
}

export const useStatusConfig = () => {
  const [status, setStatus] = useState<StatusConfig[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('status_pedidos_config')
        .select('*')
        .order('ordem', { ascending: true });

      if (error) throw error;
      setStatus(data || []);
    } catch (error: any) {
      // Não mostrar erro se for problema de autenticação (usuário não logado)
      if (!error.message?.includes('JWT') && !error.message?.includes('permission denied')) {
        toast.error('Erro ao carregar status: ' + error.message);
      }
      console.warn('Status config fetch error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const createStatus = async (statusData: Omit<StatusConfig, 'id' | 'ativo'>) => {
    try {
      const { data, error } = await supabase
        .from('status_pedidos_config')
        .insert([statusData])
        .select()
        .single();

      if (error) throw error;
      toast.success('Status adicionado com sucesso!');
      await fetchStatus();
      return data;
    } catch (error: any) {
      toast.error('Erro ao criar status: ' + error.message);
      throw error;
    }
  };

  const updateStatus = async (id: string, statusData: Partial<StatusConfig>) => {
    try {
      const { error } = await supabase
        .from('status_pedidos_config')
        .update(statusData)
        .eq('id', id);

      if (error) throw error;
      toast.success('Status atualizado com sucesso!');
      await fetchStatus();
    } catch (error: any) {
      toast.error('Erro ao atualizar status: ' + error.message);
      throw error;
    }
  };

  const deleteStatus = async (id: string) => {
    try {
      const { error } = await supabase
        .from('status_pedidos_config')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Status removido com sucesso!');
      await fetchStatus();
    } catch (error: any) {
      toast.error('Erro ao excluir status: ' + error.message);
      throw error;
    }
  };

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        fetchStatus();
      }
    };
    
    checkAuthAndFetch();
    
    // Listener para carregar quando usuário logar
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        fetchStatus();
      }
    });
    
    return () => subscription.unsubscribe();
  }, []);

  return {
    status,
    loading,
    fetchStatus,
    createStatus,
    updateStatus,
    deleteStatus,
  };
};
