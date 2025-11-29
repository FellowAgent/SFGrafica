import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase';
import { toast } from '@/utils/toastHelper';

export interface AlertConfig {
  id: string;
  nome: string;
  descricao: string | null;
  tipo_alerta: string;
  tabela: string | null;
  acao: string | null;
  threshold_count: number | null;
  threshold_minutes: number | null;
  usuarios_monitorados: string[] | null;
  ativo: boolean;
  severidade: string;
  notificar_usuarios: string[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AlertHistory {
  id: string;
  alert_config_id: string;
  disparado_em: string;
  detalhes: any;
  contagem_acoes: number;
  periodo_minutos: number;
  usuarios_envolvidos: any;
  resolvido: boolean;
  resolvido_por: string | null;
  resolvido_em: string | null;
  notas: string | null;
}

export function useAlertConfigs() {
  const [configs, setConfigs] = useState<AlertConfig[]>([]);
  const [history, setHistory] = useState<AlertHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfigs();
    fetchHistory();
    subscribeToAlerts();
  }, []);

  const fetchConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('alert_configs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConfigs(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar configurações de alertas:', error);
      toast.error('Erro ao carregar configurações de alertas');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('alert_history')
        .select('*')
        .order('disparado_em', { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistory(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar histórico de alertas:', error);
    }
  };

  const subscribeToAlerts = () => {
    const channel = supabase
      .channel('alert-history-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alert_history'
        },
        (payload) => {
          const newAlert = payload.new as AlertHistory;
          setHistory(prev => [newAlert, ...prev]);
          
          // Mostrar notificação
          toast.error(
            `🚨 Alerta: ${newAlert.detalhes?.nome_alerta || 'Ação detectada'}`,
            {
              description: `${newAlert.contagem_acoes} ações em ${newAlert.periodo_minutos} minutos`,
              duration: 10000,
            }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const createConfig = async (config: Omit<AlertConfig, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
    try {
      const { data, error } = await supabase
        .from('alert_configs')
        .insert([config])
        .select()
        .single();

      if (error) throw error;
      
      setConfigs(prev => [data, ...prev]);
      toast.success('Configuração de alerta criada com sucesso!');
      return data;
    } catch (error: any) {
      console.error('Erro ao criar configuração:', error);
      toast.error('Erro ao criar configuração de alerta');
      throw error;
    }
  };

  const updateConfig = async (id: string, updates: Partial<AlertConfig>) => {
    try {
      const { data, error } = await supabase
        .from('alert_configs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setConfigs(prev => prev.map(c => c.id === id ? data : c));
      toast.success('Configuração atualizada com sucesso!');
      return data;
    } catch (error: any) {
      console.error('Erro ao atualizar configuração:', error);
      toast.error('Erro ao atualizar configuração');
      throw error;
    }
  };

  const deleteConfig = async (id: string) => {
    try {
      const { error } = await supabase
        .from('alert_configs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setConfigs(prev => prev.filter(c => c.id !== id));
      toast.success('Configuração removida com sucesso!');
    } catch (error: any) {
      console.error('Erro ao remover configuração:', error);
      toast.error('Erro ao remover configuração');
      throw error;
    }
  };

  const resolveAlert = async (id: string, notas?: string) => {
    try {
      const { data, error } = await supabase
        .from('alert_history')
        .update({
          resolvido: true,
          resolvido_em: new Date().toISOString(),
          notas: notas || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setHistory(prev => prev.map(h => h.id === id ? data : h));
      toast.success('Alerta marcado como resolvido!');
      return data;
    } catch (error: any) {
      console.error('Erro ao resolver alerta:', error);
      toast.error('Erro ao resolver alerta');
      throw error;
    }
  };

  return {
    configs,
    history,
    loading,
    createConfig,
    updateConfig,
    deleteConfig,
    resolveAlert,
    refreshConfigs: fetchConfigs,
    refreshHistory: fetchHistory,
  };
}
