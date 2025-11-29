import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase';
import { useSupabaseAuth } from './useSupabaseAuth';
import { toast } from '@/utils/toastHelper';

export interface CardLayout {
  id: string;
  order: number;
  visible?: boolean;
}

export interface TabLayout {
  [tabName: string]: CardLayout[];
}

export interface CardDefinition {
  id: string;
  label: string;
  description?: string;
}

export function useReportLayout() {
  const { user } = useSupabaseAuth();
  const [layouts, setLayouts] = useState<TabLayout>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadLayout();
    }
  }, [user]);

  const loadLayout = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('perfis')
        .select('relatorios_layout')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data?.relatorios_layout) {
        setLayouts(data.relatorios_layout as unknown as TabLayout);
      }
    } catch (error) {
      console.error('Erro ao carregar layout:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveLayout = async (tabName: string, cards: CardLayout[]) => {
    if (!user) return;

    const newLayouts = {
      ...layouts,
      [tabName]: cards,
    };

    try {
      const { error } = await supabase
        .from('perfis')
        .update({ relatorios_layout: newLayouts as any })
        .eq('id', user.id);

      if (error) throw error;

      setLayouts(newLayouts);
      toast.success('Layout personalizado salvo!');
    } catch (error) {
      console.error('Erro ao salvar layout:', error);
      toast.error('Erro ao salvar layout personalizado');
    }
  };

  const getCardOrder = (tabName: string): string[] => {
    if (!layouts[tabName]) return [];
    return layouts[tabName]
      .filter(card => card.visible !== false)
      .sort((a, b) => a.order - b.order)
      .map(card => card.id);
  };

  const toggleCardVisibility = async (tabName: string, cardId: string) => {
    if (!user) return;

    const currentLayout = layouts[tabName] || [];
    const cardIndex = currentLayout.findIndex(c => c.id === cardId);
    
    let newLayout: CardLayout[];
    if (cardIndex >= 0) {
      newLayout = currentLayout.map(c => 
        c.id === cardId ? { ...c, visible: !(c.visible ?? true) } : c
      );
    } else {
      newLayout = [...currentLayout, { id: cardId, order: currentLayout.length, visible: false }];
    }

    const newLayouts = {
      ...layouts,
      [tabName]: newLayout,
    };

    try {
      const { error } = await supabase
        .from('perfis')
        .update({ relatorios_layout: newLayouts as any })
        .eq('id', user.id);

      if (error) throw error;

      setLayouts(newLayouts);
    } catch (error) {
      console.error('Erro ao alternar visibilidade:', error);
      toast.error('Erro ao salvar preferência de visibilidade');
    }
  };

  const getCardVisibility = (tabName: string, cardId: string): boolean => {
    const layout = layouts[tabName];
    if (!layout) return true;
    const card = layout.find(c => c.id === cardId);
    return card?.visible ?? true;
  };

  const getVisibleCardsCount = (tabName: string, totalCards: number): number => {
    const layout = layouts[tabName];
    if (!layout) return totalCards;
    const visibleCount = layout.filter(c => c.visible !== false).length;
    return Math.min(visibleCount || totalCards, totalCards);
  };

  const resetLayout = async (tabName: string) => {
    if (!user) return;

    const newLayouts = { ...layouts };
    delete newLayouts[tabName];

    try {
      const { error } = await supabase
        .from('perfis')
        .update({ relatorios_layout: newLayouts as any })
        .eq('id', user.id);

      if (error) throw error;

      setLayouts(newLayouts);
      toast.success('Layout restaurado ao padrão!');
    } catch (error) {
      console.error('Erro ao resetar layout:', error);
      toast.error('Erro ao resetar layout');
    }
  };

  return {
    loading,
    getCardOrder,
    saveLayout,
    resetLayout,
    toggleCardVisibility,
    getCardVisibility,
    getVisibleCardsCount,
    hasCustomLayout: (tabName: string) => !!layouts[tabName],
  };
}
