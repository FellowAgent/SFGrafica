import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CacheData {
  pedidos: any[];
  itens: any[];
  perfis: any[];
  etiquetas: any[];
  timestamp: number;
}

const CACHE_KEY = 'pedidos_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos em millisegundos

export const usePedidosCache = () => {
  const [cacheData, setCacheData] = useState<CacheData | null>(null);
  const [loading, setLoading] = useState(true);

  // Verificar se o cache é válido
  const isCacheValid = useCallback((cache: CacheData | null): boolean => {
    if (!cache || !cache.timestamp) return false;
    const now = Date.now();
    return (now - cache.timestamp) < CACHE_TTL;
  }, []);

  // Carregar cache do localStorage
  const loadFromCache = useCallback((): CacheData | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      
      const data = JSON.parse(cached) as CacheData;
      return isCacheValid(data) ? data : null;
    } catch (error) {
      console.error('Erro ao carregar cache:', error);
      return null;
    }
  }, [isCacheValid]);

  // Salvar cache no localStorage
  const saveToCache = useCallback((pedidos: any[], itens: any[], perfis: any[], etiquetas: any[]) => {
    try {
      const data: CacheData = {
        pedidos,
        itens,
        perfis,
        etiquetas,
        timestamp: Date.now()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      setCacheData(data);
    } catch (error) {
      console.error('Erro ao salvar cache:', error);
    }
  }, []);

  // Limpar cache
  const clearCache = useCallback(() => {
    try {
      localStorage.removeItem(CACHE_KEY);
      setCacheData(null);
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
    }
  }, []);

  // Buscar pedidos do banco
  const fetchPedidosFromDB = useCallback(async () => {
    try {
      // Buscar pedidos com clientes (incluindo codigo_retirada explicitamente)
      const { data: pedidosDB, error } = await supabase
        .from('pedidos')
        .select(`
          id,
          numero_pedido,
          cliente_id,
          vendedor_id,
          status,
          tipo_retirada,
          prazo_entrega,
          unidade_prazo,
          codigo_retirada,
          observacoes,
          total,
          desconto_total,
          valor_final,
          meio_pagamento,
          gerar_nf,
          data_entrega,
          created_at,
          updated_at,
          clientes (
            id,
            nome,
            celular,
            email,
            cpf_cnpj
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!pedidosDB || pedidosDB.length === 0) {
        return { pedidos: [], itens: [], perfis: [], etiquetas: [] };
      }

      // Buscar itens de pedidos em lotes
      const batchSize = 100;
      const allItens: any[] = [];
      
      for (let i = 0; i < pedidosDB.length; i += batchSize) {
        const batch = pedidosDB.slice(i, i + batchSize);
        const { data: itens, error: itensError } = await supabase
          .from('itens_pedido')
          .select(`
            *,
            produtos (
              id,
              nome
            )
          `)
          .in('pedido_id', batch.map(p => p.id));

        if (itensError) throw itensError;
        if (itens) allItens.push(...itens);
      }

      // Buscar perfis dos vendedores
      const vendedorIds = [...new Set(pedidosDB.map(p => p.vendedor_id).filter(Boolean))];
      const { data: perfis } = await supabase
        .from('perfis')
        .select('id, nome, username, avatar_url')
        .in('id', vendedorIds);

      // Buscar etiquetas dos pedidos EM LOTES para evitar URL muito longa
      const pedidosIds = pedidosDB.map(p => p.id);
      const batchSizeEtiquetas = 100; // Processar 100 pedidos por vez
      const allEtiquetas: any[] = [];
      
      for (let i = 0; i < pedidosIds.length; i += batchSizeEtiquetas) {
        const batch = pedidosIds.slice(i, i + batchSizeEtiquetas);
        const { data: etiquetasBatch, error: etiquetasError } = await supabase
          .from('pedidos_etiquetas')
          .select(`
            pedido_id,
            etiquetas (
              id,
              nome,
              cor
            )
          `)
          .in('pedido_id', batch);

        if (etiquetasError) {
          console.error('Erro ao buscar etiquetas:', etiquetasError);
        } else if (etiquetasBatch) {
          allEtiquetas.push(...etiquetasBatch);
        }
      }

      console.log(`🏷️ Total de etiquetas carregadas: ${allEtiquetas.length}`);

      return {
        pedidos: pedidosDB,
        itens: allItens,
        perfis: perfis || [],
        etiquetas: allEtiquetas
      };
    } catch (error) {
      console.error('Erro ao buscar pedidos do banco:', error);
      throw error;
    }
  }, []);

  // Carregar pedidos (cache ou banco)
  const loadPedidos = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    
    try {
      // Tentar carregar do cache primeiro
      if (!forceRefresh) {
        const cached = loadFromCache();
        if (cached) {
          console.log('📦 Pedidos carregados do cache');
          setCacheData(cached);
          setLoading(false);
          return cached;
        }
      }

      // Se não há cache válido, buscar do banco
      console.log('🔄 Buscando pedidos do banco...');
      const data = await fetchPedidosFromDB();
      
      // Salvar no cache
      saveToCache(data.pedidos, data.itens, data.perfis, data.etiquetas);
      setLoading(false);
      return data;
    } catch (error: any) {
      console.error('Erro ao carregar pedidos:', error);
      setLoading(false);
      // Retornar dados vazios ao invés de lançar erro
      return { pedidos: [], itens: [], perfis: [], etiquetas: [] };
    }
  }, [loadFromCache, fetchPedidosFromDB, saveToCache]);

  // Carregar dados iniciais
  useEffect(() => {
    loadPedidos().catch(err => {
      console.error('Erro ao carregar pedidos iniciais:', err);
    });
  }, [loadPedidos]);

  return {
    cacheData,
    loading,
    loadPedidos,
    clearCache,
    isCacheValid: cacheData ? isCacheValid(cacheData) : false
  };
};
