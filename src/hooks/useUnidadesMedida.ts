import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UnidadeMedida {
  id: string;
  sigla: string;
  nome: string;
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export function useUnidadesMedida() {
  const [unidades, setUnidades] = useState<UnidadeMedida[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUnidades = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('unidades_medida')
        .select('*')
        .eq('ativo', true)
        .order('ordem');

      if (error) throw error;
      
      // Garantir que sempre tenhamos as unidades carregadas
      const unidadesCarregadas = data || [];
      const temUnidade = unidadesCarregadas.some(u => u.sigla === 'un');
      
      if (!temUnidade) {
        console.warn('⚠️ Unidade "un" não encontrada nas unidades ativas');
      }
      
      setUnidades(unidadesCarregadas);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar unidades',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createUnidade = async (sigla: string, nome: string) => {
    try {
      const maxOrdem = Math.max(...unidades.map(u => u.ordem), 0);
      
      const { error } = await supabase
        .from('unidades_medida')
        .insert({
          sigla: sigla.trim(),
          nome: nome.trim(),
          ordem: maxOrdem + 1,
        });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Unidade de medida criada com sucesso',
      });
      
      await fetchUnidades();
    } catch (error: any) {
      toast({
        title: 'Erro ao criar unidade',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateUnidade = async (id: string, sigla: string, nome: string) => {
    try {
      const { error } = await supabase
        .from('unidades_medida')
        .update({
          sigla: sigla.trim(),
          nome: nome.trim(),
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Unidade de medida atualizada com sucesso',
      });
      
      await fetchUnidades();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar unidade',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deleteUnidade = async (id: string) => {
    try {
      const { error } = await supabase
        .from('unidades_medida')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Unidade de medida excluída com sucesso',
      });
      
      await fetchUnidades();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir unidade',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const toggleAtivo = async (id: string, ativo: boolean) => {
    try {
      const { error } = await supabase
        .from('unidades_medida')
        .update({ ativo })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: `Unidade ${ativo ? 'ativada' : 'desativada'} com sucesso`,
      });
      
      await fetchUnidades();
    } catch (error: any) {
      toast({
        title: 'Erro ao alterar status',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchUnidades();
  }, []);

  return {
    unidades,
    loading,
    fetchUnidades,
    createUnidade,
    updateUnidade,
    deleteUnidade,
    toggleAtivo,
  };
}
