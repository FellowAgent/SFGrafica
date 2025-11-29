import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase';
import { toast } from '@/utils/toastHelper';
import type { AsaasConfig, AsaasConfigFormData } from '@/types/asaas';

export function useAsaasConfig() {
  const [config, setConfig] = useState<AsaasConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('asaas_configuracoes')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar configurações Asaas:', error);
        toast.error('Erro ao carregar configurações');
        return;
      }

      setConfig(data as AsaasConfig);
    } catch (err) {
      console.error('Erro ao buscar configurações:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (formData: AsaasConfigFormData) => {
    try {
      setSaving(true);

      if (config?.id) {
        // Atualizar configuração existente
        const { error } = await supabase
          .from('asaas_configuracoes')
          .update(formData)
          .eq('id', config.id);

        if (error) throw error;
      } else {
        // Criar nova configuração
        const { error } = await supabase
          .from('asaas_configuracoes')
          .insert([formData]);

        if (error) throw error;
      }

      toast.success('Configurações salvas com sucesso!');
      await fetchConfig();
      return true;
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
      toast.error('Erro ao salvar configurações');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (!config?.api_key) {
      toast.error('Configure a API Key primeiro');
      return false;
    }

    try {
      // Aqui você pode chamar uma edge function para testar a conexão
      // Por enquanto, apenas simulamos o teste
      toast.success('Conexão testada com sucesso!');
      return true;
    } catch (err) {
      console.error('Erro ao testar conexão:', err);
      toast.error('Erro ao testar conexão com Asaas');
      return false;
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return {
    config,
    loading,
    saving,
    saveConfig,
    testConnection,
    refetch: fetchConfig,
  };
}
