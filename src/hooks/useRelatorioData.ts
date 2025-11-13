import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase";
import { DateRange } from "react-day-picker";

interface RelatorioFilters {
  dateRange?: DateRange;
  status?: string;
  vendedor?: string;
  cliente?: string;
}

export function useRelatorioData(filters: RelatorioFilters = {}) {
  const { dateRange, status, vendedor, cliente } = filters;

  // Pedidos com cache otimizado e filtros avançados
  const { data: pedidos, isLoading: loadingPedidos } = useQuery({
    queryKey: ['relatorio-pedidos', dateRange, status, vendedor, cliente],
    queryFn: async () => {
      let query = supabase
        .from('pedidos')
        .select(`
          *,
          cliente:clientes(nome, cpf_cnpj),
          vendedor:perfis!vendedor_id(nome),
          itens:itens_pedido(*, produto:produtos(nome, preco, custo))
        `)
        .order('created_at', { ascending: false });

      if (dateRange?.from) {
        query = query.gte('created_at', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        const endDate = new Date(dateRange.to);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endDate.toISOString());
      }

      // Filtro por status
      if (status && status !== 'todos') {
        query = query.eq('status', status);
      }

      // Filtro por vendedor
      if (vendedor && vendedor !== 'todos') {
        query = query.eq('vendedor_id', vendedor);
      }

      // Filtro por cliente
      if (cliente && cliente !== 'todos') {
        query = query.eq('cliente_id', cliente);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 10, // 10 minutos - aumentado
    gcTime: 1000 * 60 * 30, // 30 minutos - aumentado
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Produtos com cache
  const { data: produtos, isLoading: loadingProdutos } = useQuery({
    queryKey: ['relatorio-produtos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 15, // 15 minutos
    gcTime: 1000 * 60 * 30, // 30 minutos
    refetchOnWindowFocus: false,
  });

  // Clientes com cache
  const { data: clientes, isLoading: loadingClientes } = useQuery({
    queryKey: ['relatorio-clientes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 15, // 15 minutos
    gcTime: 1000 * 60 * 30, // 30 minutos
    refetchOnWindowFocus: false,
  });

  // Itens de pedidos otimizado (filtrado no servidor com join direto)
  const { data: itensPedido, isLoading: loadingItens } = useQuery({
    queryKey: ['relatorio-itens', dateRange],
    queryFn: async () => {
      let query = supabase
        .from('itens_pedido')
        .select(`
          *,
          pedido:pedidos!inner(created_at, status),
          produto:produtos(nome, categoria_id)
        `);
      
      // Filtrar diretamente no join usando !inner
      if (dateRange?.from) {
        query = query.gte('pedido.created_at', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        const endDate = new Date(dateRange.to);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte('pedido.created_at', endDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    },
    staleTime: 1000 * 60 * 10, // 10 minutos
    gcTime: 1000 * 60 * 20, // 20 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  return {
    pedidos: pedidos || [],
    produtos: produtos || [],
    clientes: clientes || [],
    itensPedido: itensPedido || [],
    loading: loadingPedidos || loadingProdutos || loadingClientes || loadingItens,
  };
}
