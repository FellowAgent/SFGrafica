import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase';
import { useSupabaseAuth } from './useSupabaseAuth';

// Cache global para o avatar que nunca é limpo durante transições
let cachedAvatarUrl: string | null = null;
let cachedUserId: string | null = null;

export function useUserAvatar() {
  const { user } = useSupabaseAuth();
  // Sempre inicia com o cache, nunca com string vazia
  const [avatarUrl, setAvatarUrl] = useState<string>(cachedAvatarUrl || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadUserAvatar = async () => {
      if (!user?.id) {
        // Não limpa o cache durante transições
        setLoading(false);
        return;
      }

      // Se o cache é do mesmo usuário, usa imediatamente
      if (cachedAvatarUrl && cachedUserId === user.id) {
        setAvatarUrl(cachedAvatarUrl);
        setLoading(false);
        return;
      }

      // Só busca se for usuário diferente ou sem cache
      if (cachedUserId !== user.id) {
        setLoading(true);
        try {
          const { data: perfil } = await supabase
            .from('perfis')
            .select('avatar_url')
            .eq('id', user.id)
            .single();

          if (perfil?.avatar_url) {
            const url = perfil.avatar_url;
            cachedAvatarUrl = url;
            cachedUserId = user.id;
            setAvatarUrl(url);
          }
        } catch (error) {
          console.error('Erro ao carregar avatar:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadUserAvatar();
  }, [user?.id]);

  // Função para atualizar o cache manualmente (com cache buster)
  const refreshAvatar = async () => {
    if (!user?.id) return;

    try {
      const { data: perfil } = await supabase
        .from('perfis')
        .select('avatar_url')
        .eq('id', user.id)
        .single();

      if (perfil?.avatar_url) {
        const url = `${perfil.avatar_url}?t=${Date.now()}`;
        cachedAvatarUrl = url;
        cachedUserId = user.id;
        setAvatarUrl(url);
      }
    } catch (error) {
      console.error('Erro ao atualizar avatar:', error);
    }
  };

  return {
    avatarUrl,
    loading,
    refreshAvatar,
  };
}
