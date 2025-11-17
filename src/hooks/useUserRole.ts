import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase';
import { useSupabaseAuth } from './useSupabaseAuth';
import type { UsuarioRole } from './useUsuarios';

export function useUserRole() {
  const { user, loading: authLoading } = useSupabaseAuth();
  const [role, setRole] = useState<UsuarioRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserRole() {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Erro ao buscar role do usuário:', error);
          setRole(null);
        } else {
          setRole(data?.role as UsuarioRole || null);
        }
      } catch (err) {
        console.error('Erro ao buscar role:', err);
        setRole(null);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      fetchUserRole();
    }
  }, [user, authLoading]);

  return {
    role,
    loading: authLoading || loading,
    isMaster: role === 'master',
    isFinanceiro: role === 'financeiro',
    isVendedor: role === 'vendedor',
  };
}
