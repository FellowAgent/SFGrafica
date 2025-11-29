import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase';
import { toast } from '@/utils/toastHelper';

export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE';

export interface AuditLog {
  id: string;
  tabela: string;
  acao: AuditAction;
  registro_id: string;
  usuario_id: string | null;
  usuario_nome: string | null;
  dados_anteriores: any;
  dados_novos: any;
  campos_alterados: string[] | null;
  timestamp: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditLogFilters {
  tabela?: string;
  acao?: AuditAction;
  usuario_id?: string;
  dataInicio?: string;
  dataFim?: string;
  registro_id?: string;
}

export function useAuditLogs(filters?: AuditLogFilters) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchLogs = async (page = 0, pageSize = 50) => {
    try {
      setLoading(true);

      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('timestamp', { ascending: false });

      // Aplicar filtros
      if (filters?.tabela) {
        query = query.eq('tabela', filters.tabela);
      }
      if (filters?.acao) {
        query = query.eq('acao', filters.acao);
      }
      if (filters?.usuario_id) {
        query = query.eq('usuario_id', filters.usuario_id);
      }
      if (filters?.registro_id) {
        query = query.eq('registro_id', filters.registro_id);
      }
      if (filters?.dataInicio) {
        query = query.gte('timestamp', filters.dataInicio);
      }
      if (filters?.dataFim) {
        query = query.lte('timestamp', filters.dataFim);
      }

      // Paginação
      const from = page * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setLogs(data || []);
      setTotalCount(count || 0);
    } catch (error: any) {
      console.error('Erro ao carregar logs de auditoria:', error);
      toast.error('Erro ao carregar logs de auditoria');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  return {
    logs,
    loading,
    totalCount,
    fetchLogs,
  };
}
