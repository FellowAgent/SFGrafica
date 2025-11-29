import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/utils/toastHelper';

export interface SupabaseConfig {
  id: string;
  project_id: string;
  supabase_url: string;
  is_active: boolean;
  config_source: 'database' | 'env';
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface ConfigChanges {
  hasChanges: boolean;
  changes: {
    field: string;
    current: string;
    saved: string;
  }[];
}

export function useSupabaseConfig() {
  const [savedConfig, setSavedConfig] = useState<SupabaseConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Carregar configuração salva do banco
  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('supabase_config')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setSavedConfig(data as SupabaseConfig);
      return data;
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
      toast.error('Erro ao carregar configuração salva');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Salvar nova configuração
  const saveConfig = async (config: Partial<SupabaseConfig>) => {
    setIsLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;

      // Desativar configuração anterior
      if (savedConfig) {
        await supabase
          .from('supabase_config')
          .update({ is_active: false })
          .eq('id', savedConfig.id);
      }

      // Inserir nova configuração
      const { data, error } = await supabase
        .from('supabase_config')
        .insert({
          project_id: config.project_id,
          supabase_url: config.supabase_url,
          is_active: true,
          config_source: 'database',
          updated_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      setSavedConfig(data as SupabaseConfig);
      toast.success('Configuração salva com sucesso!');
      return data;
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast.error('Erro ao salvar configuração');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Validar formato de Project ID
  const validateProjectId = (id: string): boolean => {
    return /^[a-z0-9]{15,20}$/.test(id);
  };

  // Validar formato de URL (aceita qualquer URL válida)
  const validateSupabaseUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // Validar formato JWT
  const validateJWT = (token: string): boolean => {
    return /^eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*$/.test(token);
  };

  // Comparar configurações
  const compareConfigs = (
    current: { project_id: string; supabase_url: string },
    saved: SupabaseConfig | null
  ): ConfigChanges => {
    if (!saved) {
      return { hasChanges: false, changes: [] };
    }

    const changes: ConfigChanges['changes'] = [];

    if (current.project_id !== saved.project_id) {
      changes.push({
        field: 'Project ID',
        current: current.project_id,
        saved: saved.project_id,
      });
    }

    if (current.supabase_url !== saved.supabase_url) {
      changes.push({
        field: 'Supabase URL',
        current: current.supabase_url,
        saved: saved.supabase_url,
      });
    }

    return {
      hasChanges: changes.length > 0,
      changes,
    };
  };

  // Exportar configuração
  const exportConfig = (config: { project_id: string; supabase_url: string }) => {
    const exportData = {
      project_id: config.project_id,
      supabase_url: config.supabase_url,
      exported_at: new Date().toISOString(),
      note: 'Backup de configuração Supabase',
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supabase-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Configuração exportada!');
  };

  // Importar configuração
  const importConfig = (file: File): Promise<{ project_id: string; supabase_url: string } | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          if (data.project_id && data.supabase_url) {
            toast.success('Configuração importada!');
            resolve({
              project_id: data.project_id,
              supabase_url: data.supabase_url,
            });
          } else {
            toast.error('Arquivo inválido');
            resolve(null);
          }
        } catch {
          toast.error('Erro ao ler arquivo');
          resolve(null);
        }
      };
      reader.readAsText(file);
    });
  };

  useEffect(() => {
    loadConfig();
  }, []);

  return {
    savedConfig,
    isLoading,
    loadConfig,
    saveConfig,
    validateProjectId,
    validateSupabaseUrl,
    validateJWT,
    compareConfigs,
    exportConfig,
    importConfig,
  };
}
