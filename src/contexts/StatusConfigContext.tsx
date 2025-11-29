import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/utils/toastHelper';

export interface StatusConfig {
  id: string;
  nome: string;
  cor: string;
  text_color: string;
  ordem: number;
  ativo: boolean;
}

interface StatusConfigContextType {
  status: StatusConfig[];
  loading: boolean;
  fetchStatus: () => Promise<void>;
  createStatus: (statusData: Omit<StatusConfig, 'id' | 'ativo'>) => Promise<any>;
  updateStatus: (id: string, statusData: Partial<StatusConfig>) => Promise<void>;
  deleteStatus: (id: string) => Promise<void>;
}

const StatusConfigContext = createContext<StatusConfigContextType | undefined>(undefined);

export const StatusConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<StatusConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('status_pedidos_config')
        .select('*')
        .order('ordem', { ascending: true });

      if (error) throw error;
      setStatus(data || []);
    } catch (error: any) {
      const isMissingTable =
        error?.code === '42P01' ||
        error?.message?.toLowerCase().includes('status_pedidos_config');

      if (isMissingTable) {
        console.warn(
          'Tabela status_pedidos_config não encontrada. Ignorando até que a migração seja aplicada.'
        );
      } else {
        toast.error('Erro ao carregar status: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

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
    let isMounted = true;

    const initialize = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (session?.user) {
          await fetchStatus();
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Erro ao verificar sessão antes de carregar status:', error);
        setLoading(false);
      }
    };

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      if (session?.user) {
        fetchStatus();
      } else {
        setStatus([]);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchStatus]);

  return (
    <StatusConfigContext.Provider
      value={{
        status,
        loading,
        fetchStatus,
        createStatus,
        updateStatus,
        deleteStatus,
      }}
    >
      {children}
    </StatusConfigContext.Provider>
  );
};

export const useStatusConfigContext = () => {
  const context = useContext(StatusConfigContext);
  if (context === undefined) {
    throw new Error('useStatusConfigContext must be used within a StatusConfigProvider');
  }
  return context;
};
