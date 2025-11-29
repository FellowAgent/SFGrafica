import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/utils/toastHelper';
import { useNavigate } from 'react-router-dom';

interface SchemaVersion {
  id: string;
  version: string;
  description: string;
  applied_at: string;
  checksum: string;
  is_current: boolean;
}

interface SchemaVersionStatus {
  currentVersion: string | null;
  currentChecksum: string | null;
  realChecksum: string | null;
  updateAvailable: boolean;
  message: string;
}

export function useSchemaVersion() {
  const [currentVersion, setCurrentVersion] = useState<SchemaVersion | null>(null);
  const [versionStatus, setVersionStatus] = useState<SchemaVersionStatus | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [checking, setChecking] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadCurrentVersion = async () => {
    try {
      // Verificar se há sessão ativa antes de fazer requisição
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('schema_versions')
        .select('*')
        .eq('is_current', true)
        .single();

      // PGRST116 = nenhum resultado encontrado (normal)
      // PGRST301 = sem permissão RLS - normal para usuários sem role master
      if (error && error.code !== 'PGRST116' && error.code !== 'PGRST301') {
        throw error;
      }

      setCurrentVersion(data || null);
    } catch (error: any) {
      // Ignorar erros de permissão (406) e erros de autenticação
      if (error?.status === 406 || error?.code === 'PGRST301') {
        // Usuário não tem permissão ou não está autenticado - isso é esperado
        // Não logar como erro para não poluir o console
      } else {
        console.error('Error loading current version:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const checkVersion = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('schema-version-manager', {
        body: { action: 'check_update' }
      });

      if (error) throw error;

      setVersionStatus(data);
      setUpdateAvailable(data.updateAvailable);

      if (data.updateAvailable) {
        toast.warning('Atualização de Schema Detectada', {
          description: 'O schema do banco de dados foi modificado. Considere criar uma nova versão.',
          duration: 10000
        });
      }
    } catch (error) {
      console.error('Error checking version:', error);
      toast.error('Erro ao verificar versão do schema');
    } finally {
      setChecking(false);
    }
  };

  const createVersion = async (version: string, description: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('schema-version-manager', {
        body: {
          action: 'create_version',
          version,
          description
        }
      });

      if (error) throw error;

      toast.success('Versão criada com sucesso', {
        description: `Versão ${version} foi registrada`
      });

      await loadCurrentVersion();
      await checkVersion();

      return data;
    } catch (error: any) {
      console.error('Error creating version:', error);
      toast.error('Erro ao criar versão', {
        description: error.message
      });
      throw error;
    }
  };

  const listVersions = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('schema-version-manager', {
        body: { action: 'list_versions' }
      });

      if (error) throw error;

      return data.data || [];
    } catch (error) {
      console.error('Error listing versions:', error);
      return [];
    }
  };

  useEffect(() => {
    // Verificar autenticação antes de carregar
    const checkAuthAndLoad = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        loadCurrentVersion();
      } else {
        setLoading(false);
      }
    };
    
    checkAuthAndLoad();

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        loadCurrentVersion();
      } else if (event === 'SIGNED_OUT') {
        setCurrentVersion(null);
        setVersionStatus(null);
        setUpdateAvailable(false);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    currentVersion,
    versionStatus,
    updateAvailable,
    checking,
    loading,
    checkVersion,
    createVersion,
    listVersions,
    refresh: loadCurrentVersion
  };
}
