import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase';
import { toast } from '@/utils/toastHelper';

export interface AuditAnalytics {
  totalLogs: number;
  logsPorAcao: {
    INSERT: number;
    UPDATE: number;
    DELETE: number;
  };
  logsPorTabela: Array<{
    tabela: string;
    count: number;
  }>;
  logsPorUsuario: Array<{
    usuario_id: string;
    usuario_nome: string;
    count: number;
  }>;
  timelineData: Array<{
    date: string;
    INSERT: number;
    UPDATE: number;
    DELETE: number;
  }>;
  tabelasMaisAlteradas: Array<{
    tabela: string;
    count: number;
  }>;
  usuariosMaisAtivos: Array<{
    usuario_nome: string;
    count: number;
  }>;
}

export function useAuditAnalytics(days: number = 30) {
  const [analytics, setAnalytics] = useState<AuditAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Data de início
      const dataInicio = new Date();
      dataInicio.setDate(dataInicio.getDate() - days);

      // Buscar todos os logs do período
      const { data: logs, error } = await supabase
        .from('audit_logs')
        .select('*')
        .gte('timestamp', dataInicio.toISOString())
        .order('timestamp', { ascending: false });

      if (error) throw error;

      if (!logs || logs.length === 0) {
        setAnalytics({
          totalLogs: 0,
          logsPorAcao: { INSERT: 0, UPDATE: 0, DELETE: 0 },
          logsPorTabela: [],
          logsPorUsuario: [],
          timelineData: [],
          tabelasMaisAlteradas: [],
          usuariosMaisAtivos: [],
        });
        return;
      }

      // Total de logs
      const totalLogs = logs.length;

      // Logs por ação
      const logsPorAcao = {
        INSERT: logs.filter(l => l.acao === 'INSERT').length,
        UPDATE: logs.filter(l => l.acao === 'UPDATE').length,
        DELETE: logs.filter(l => l.acao === 'DELETE').length,
      };

      // Logs por tabela
      const tabelasMap = new Map<string, number>();
      logs.forEach(log => {
        tabelasMap.set(log.tabela, (tabelasMap.get(log.tabela) || 0) + 1);
      });
      const logsPorTabela = Array.from(tabelasMap.entries())
        .map(([tabela, count]) => ({ tabela, count }))
        .sort((a, b) => b.count - a.count);

      // Logs por usuário
      const usuariosMap = new Map<string, { usuario_id: string; usuario_nome: string; count: number }>();
      logs.forEach(log => {
        const key = log.usuario_id || 'sistema';
        const existing = usuariosMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          usuariosMap.set(key, {
            usuario_id: log.usuario_id || 'sistema',
            usuario_nome: log.usuario_nome || 'Sistema',
            count: 1,
          });
        }
      });
      const logsPorUsuario = Array.from(usuariosMap.values())
        .sort((a, b) => b.count - a.count);

      // Timeline (últimos 30 dias)
      const timelineMap = new Map<string, { INSERT: number; UPDATE: number; DELETE: number }>();
      logs.forEach(log => {
        const date = new Date(log.timestamp).toISOString().split('T')[0];
        const existing = timelineMap.get(date) || { INSERT: 0, UPDATE: 0, DELETE: 0 };
        existing[log.acao as 'INSERT' | 'UPDATE' | 'DELETE']++;
        timelineMap.set(date, existing);
      });
      
      const timelineData = Array.from(timelineMap.entries())
        .map(([date, actions]) => ({ date, ...actions }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30); // Últimos 30 dias

      // Top 5 tabelas mais alteradas
      const tabelasMaisAlteradas = logsPorTabela.slice(0, 5);

      // Top 5 usuários mais ativos
      const usuariosMaisAtivos = logsPorUsuario
        .map(u => ({ usuario_nome: u.usuario_nome, count: u.count }))
        .slice(0, 5);

      setAnalytics({
        totalLogs,
        logsPorAcao,
        logsPorTabela,
        logsPorUsuario,
        timelineData,
        tabelasMaisAlteradas,
        usuariosMaisAtivos,
      });
    } catch (error: any) {
      console.error('Erro ao carregar analytics de auditoria:', error);
      toast.error('Erro ao carregar analytics de auditoria');
    } finally {
      setLoading(false);
    }
  };

  return {
    analytics,
    loading,
    refreshAnalytics: fetchAnalytics,
  };
}
