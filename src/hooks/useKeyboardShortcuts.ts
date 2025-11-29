import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ShortcutConfig {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  key: string;
}

export interface KeyboardShortcuts {
  toggleSettingsGear: ShortcutConfig;
}

const DEFAULT_SHORTCUTS: KeyboardShortcuts = {
  toggleSettingsGear: {
    ctrl: true,
    shift: true,
    alt: false,
    key: "Z"
  }
};

export const useKeyboardShortcuts = () => {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcuts>(DEFAULT_SHORTCUTS);
  const [loading, setLoading] = useState(true);
  const [isPersonalized, setIsPersonalized] = useState(false);

  // Carregar atalhos (primeiro do usuário, depois global, depois padrão)
  const loadShortcuts = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Verificar se o usuário tem atalhos personalizados
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: perfil, error: perfilError } = await supabase
          .from('perfis')
          .select('atalhos_teclado')
          .eq('id', user.id)
          .single();

        if (!perfilError && perfil?.atalhos_teclado) {
          console.log('✅ Atalhos personalizados carregados do usuário');
          setShortcuts(perfil.atalhos_teclado);
          setIsPersonalized(true);
          setLoading(false);
          return;
        }
      }

      // 2. Carregar configurações globais
      const { data: globalConfig, error: globalError } = await supabase
        .from('configuracoes_globais')
        .select('valor')
        .eq('chave', 'keyboard_shortcuts')
        .single();

      if (!globalError && globalConfig?.valor) {
        console.log('✅ Atalhos globais carregados');
        setShortcuts(globalConfig.valor as KeyboardShortcuts);
        setIsPersonalized(false);
        setLoading(false);
        return;
      }

      // 3. Usar padrões do código se não houver configuração
      console.log('ℹ️ Usando atalhos padrão do código');
      setShortcuts(DEFAULT_SHORTCUTS);
      setIsPersonalized(false);
    } catch (error) {
      console.error('Erro ao carregar atalhos:', error);
      setShortcuts(DEFAULT_SHORTCUTS);
      setIsPersonalized(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Salvar atalhos globais (apenas MASTER)
  const saveGlobalShortcuts = useCallback(async (newShortcuts: KeyboardShortcuts) => {
    try {
      const { error } = await supabase
        .from('configuracoes_globais')
        .upsert({
          chave: 'keyboard_shortcuts',
          valor: newShortcuts,
          descricao: 'Atalhos de teclado globais do sistema'
        }, {
          onConflict: 'chave'
        });

      if (error) throw error;

      console.log('✅ Atalhos globais salvos com sucesso');
      await loadShortcuts();
      return { success: true };
    } catch (error) {
      console.error('Erro ao salvar atalhos globais:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  }, [loadShortcuts]);

  // Salvar atalhos personalizados do usuário
  const saveUserShortcuts = useCallback(async (newShortcuts: KeyboardShortcuts | null) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('perfis')
        .update({ atalhos_teclado: newShortcuts })
        .eq('id', user.id);

      if (error) throw error;

      console.log('✅ Atalhos personalizados salvos com sucesso');
      await loadShortcuts();
      return { success: true };
    } catch (error) {
      console.error('Erro ao salvar atalhos personalizados:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  }, [loadShortcuts]);

  // Resetar para atalhos globais (remover personalização)
  const resetToGlobal = useCallback(async () => {
    return await saveUserShortcuts(null);
  }, [saveUserShortcuts]);

  // Carregar ao montar
  useEffect(() => {
    loadShortcuts();
  }, [loadShortcuts]);

  return {
    shortcuts,
    loading,
    isPersonalized,
    saveGlobalShortcuts,
    saveUserShortcuts,
    resetToGlobal,
    loadShortcuts
  };
};

