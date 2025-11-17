import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { SQLStatement } from '@/utils/sqlAnalyzer';

export interface SafetyConfig {
  id: string;
  require_backup: boolean;
  require_dry_run: boolean;
  allow_destructive_ops: boolean;
  require_double_confirmation: boolean;
  max_affected_rows: number;
  backup_retention_days: number;
  auto_rollback_on_error: boolean;
}

export interface DryRunResult {
  success: boolean;
  passed: boolean;
  statementsExecuted: number;
  statementsFailed: number;
  errors: Array<{
    statementNumber: number;
    error: string;
    statement: string;
  }>;
  warnings: string[];
  duration: number;
}

export function useSafeMigration() {
  const [loading, setLoading] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);
  const [safetyConfig, setSafetyConfig] = useState<SafetyConfig | null>(null);

  const loadSafetyConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('migration_safety_config')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      setSafetyConfig(data);
      return data;
    } catch (error) {
      console.error('Error loading safety config:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as configurações de segurança',
        variant: 'destructive',
      });
      return null;
    }
  };

  const runDryRun = async (statements: SQLStatement[], migrationName: string) => {
    setLoading(true);
    setDryRunResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('dry-run-migration', {
        body: {
          statements,
          migrationName,
        },
      });

      if (error) throw error;

      setDryRunResult(data);

      if (data.passed) {
        toast({
          title: 'Dry-Run Bem-Sucedido',
          description: `${data.statementsExecuted} operações testadas com sucesso`,
        });
      } else {
        toast({
          title: 'Dry-Run Falhou',
          description: `${data.statementsFailed} operações falharam no teste`,
          variant: 'destructive',
        });
      }

      return data;
    } catch (error) {
      console.error('Error running dry-run:', error);
      toast({
        title: 'Erro no Dry-Run',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateSafetyConfig = async (config: Partial<SafetyConfig>) => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('migration_safety_config')
        .update(config)
        .eq('id', safetyConfig?.id || '')
        .select()
        .single();

      if (error) throw error;

      setSafetyConfig(data);
      toast({
        title: 'Configurações Atualizadas',
        description: 'Configurações de segurança atualizadas com sucesso',
      });

      return data;
    } catch (error) {
      console.error('Error updating safety config:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar as configurações',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    safetyConfig,
    dryRunResult,
    loadSafetyConfig,
    runDryRun,
    updateSafetyConfig,
    clearDryRunResult: () => setDryRunResult(null),
  };
}
