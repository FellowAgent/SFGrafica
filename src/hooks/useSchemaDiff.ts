import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/utils/toastHelper';

interface DiffSummary {
  totalChanges: number;
  byCategory: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface SchemaDiffResult {
  differences: any;
  migrationSQL: string;
  summary: DiffSummary;
}

export function useSchemaDiff() {
  const [comparing, setComparing] = useState(false);
  const [diffResult, setDiffResult] = useState<SchemaDiffResult | null>(null);

  const compareVersions = async (version1: string, version2: string) => {
    setComparing(true);
    try {
      const { data, error } = await supabase.functions.invoke('schema-diff', {
        body: {
          version1,
          version2
        }
      });

      if (error) throw error;

      setDiffResult(data);
      
      toast.success('Comparação concluída', {
        description: `${data.summary.totalChanges} mudança(s) detectada(s)`
      });

      return data;
    } catch (error: any) {
      console.error('Error comparing schemas:', error);
      toast.error('Erro ao comparar schemas', {
        description: error.message
      });
      return null;
    } finally {
      setComparing(false);
    }
  };

  const compareSnapshots = async (snapshot1: any, snapshot2: any) => {
    setComparing(true);
    try {
      const { data, error } = await supabase.functions.invoke('schema-diff', {
        body: {
          schemaSnapshot1: snapshot1,
          schemaSnapshot2: snapshot2
        }
      });

      if (error) throw error;

      setDiffResult(data);
      
      toast.success('Comparação concluída', {
        description: `${data.summary.totalChanges} mudança(s) detectada(s)`
      });

      return data;
    } catch (error: any) {
      console.error('Error comparing snapshots:', error);
      toast.error('Erro ao comparar snapshots', {
        description: error.message
      });
      return null;
    } finally {
      setComparing(false);
    }
  };

  const clearDiff = () => {
    setDiffResult(null);
  };

  return {
    comparing,
    diffResult,
    compareVersions,
    compareSnapshots,
    clearDiff
  };
}
