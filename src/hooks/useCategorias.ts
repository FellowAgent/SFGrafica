import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase';
import { categoriaSchema, categoriaUpdateSchema, type CategoriaInput, type CategoriaUpdateInput } from '@/schemas/categoria.schema';

export interface Categoria {
  id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  categoria_pai_id?: string | null;
  nivel?: number;
  created_at: string;
  updated_at: string;
  subcategorias?: Categoria[];
}

export const useCategorias = () => {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategorias = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .order('nivel', { ascending: true })
        .order('nome', { ascending: true });

      if (error) throw error;
      
      // Organizar categorias em hierarquia
      const categoriasComHierarquia = organizarHierarquia(data || []);
      setCategorias(categoriasComHierarquia);
    } catch (error: any) {
      console.error('Erro ao carregar categorias:', error);
    } finally {
      setLoading(false);
    }
  };

  const organizarHierarquia = (categorias: any[]): Categoria[] => {
    const mapa = new Map<string, Categoria>();
    const raizes: Categoria[] = [];

    // Criar mapa de todas as categorias
    categorias.forEach(cat => {
      mapa.set(cat.id, { ...cat, subcategorias: [] });
    });

    // Organizar hierarquia
    categorias.forEach(cat => {
      const categoria = mapa.get(cat.id)!;
      if (cat.categoria_pai_id && mapa.has(cat.categoria_pai_id)) {
        const pai = mapa.get(cat.categoria_pai_id)!;
        pai.subcategorias = pai.subcategorias || [];
        pai.subcategorias.push(categoria);
      } else {
        raizes.push(categoria);
      }
    });

    return raizes;
  };

  const createCategoria = async (input: unknown) => {
    // Validate input
    const validated = categoriaSchema.parse(input);
    
    const { data, error } = await supabase
      .from('categorias')
      .insert([validated as any])
      .select()
      .single();

    if (error) throw error;
    fetchCategorias();
    return data;
  };

  const updateCategoria = async (id: string, input: unknown) => {
    // Validate input
    const validated = categoriaUpdateSchema.parse(input);
    
    // @ts-expect-error - RPC function exists but not in types
    const { error } = await supabase
      .from('categorias')
      .update(validated as any)
      .eq('id', id);

    if (error) throw error;
    fetchCategorias();
  };

  const reordenarCategoria = async (categoriaId: string, novoPaiId: string | null) => {
    // Buscar a categoria atual
    const { data: categoria, error: fetchError } = await supabase
      .from('categorias')
      .select('*')
      .eq('id', categoriaId)
      .single();

    if (fetchError) throw fetchError;

    // Calcular novo nível
    let novoNivel = 0;
    if (novoPaiId) {
      const { data: pai, error: paiError } = await supabase
        .from('categorias')
        .select('nivel')
        .eq('id', novoPaiId)
        .single();

      if (paiError) throw paiError;
      novoNivel = (pai.nivel || 0) + 1;
    }

    // Atualizar categoria
    const { error } = await supabase
      .from('categorias')
      .update({
        categoria_pai_id: novoPaiId,
        nivel: novoNivel,
      })
      .eq('id', categoriaId);

    if (error) throw error;

    fetchCategorias();
  };

  const deleteCategoria = async (id: string) => {
    // @ts-expect-error - RPC function exists but not in types
    const { error } = await supabase
      .from('categorias')
      .delete()
      .eq('id', id);

    if (error) throw error;
    fetchCategorias();
  };

  useEffect(() => {
    fetchCategorias();
  }, []);

  return {
    categorias,
    loading,
    fetchCategorias,
    createCategoria,
    updateCategoria,
    deleteCategoria,
    reordenarCategoria,
  };
};
