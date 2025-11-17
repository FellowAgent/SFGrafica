import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase';
import { useSupabaseAuth } from './useSupabaseAuth';

export function useUserProfile() {
  const { user } = useSupabaseAuth();
  const [nome, setNome] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserProfile() {
      if (!user) {
        setNome(null);
        setUserProfile(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('perfis')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Erro ao buscar nome do usuário:', error);
          setNome(user.email?.split('@')[0] || 'Usuário');
          setUserProfile({ id: user.id, nome: user.email?.split('@')[0] || 'Usuário' });
        } else {
          setNome(data?.nome || user.email?.split('@')[0] || 'Usuário');
          setUserProfile(data);
        }
      } catch (err) {
        console.error('Erro ao buscar perfil:', err);
        setNome(user.email?.split('@')[0] || 'Usuário');
        setUserProfile({ id: user.id, nome: user.email?.split('@')[0] || 'Usuário' });
      } finally {
        setLoading(false);
      }
    }

    fetchUserProfile();
  }, [user]);

  const updateProfile = async (updates: Partial<any>) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('perfis')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      // Atualizar o estado local
      setUserProfile((prev: any) => ({ ...prev, ...updates }));
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      throw error;
    }
  };

  return {
    nome,
    userProfile,
    loading,
    updateProfile,
  };
}
