import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/utils/toastHelper';

interface DriftDifferences {
  tables: {
    added: string[];
    removed: string[];
    modified: string[];
  };
  functions: {
    added: string[];
    removed: string[];
  };
  policies: {
    added: string[];
    removed: string[];
  };
  triggers: {
    added: string[];
    removed: string[];
  };
  indexes: {
    added: string[];
    removed: string[];
  };
}

interface DriftDetectionResult {
  hasDrift: boolean;
  expectedVersion?: string;
  expectedChecksum?: string;
  actualChecksum?: string;
  differences?: DriftDifferences;
  message: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  warning?: string;
}

export function useSchemaDrift() {
  const [driftStatus, setDriftStatus] = useState<DriftDetectionResult | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [autoCheckEnabled, setAutoCheckEnabled] = useState(true);

  const detectDrift = async () => {
    setDetecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('detect-drift');

      if (error) throw error;

      setDriftStatus(data);

      if (data.hasDrift) {
        const severityColors = {
          low: 'info',
          medium: 'warning',
          high: 'warning',
          critical: 'error'
        };

        const toastType = severityColors[data.severity || 'medium'];
        
        if (toastType === 'error') {
          toast.error('Schema Drift Crítico Detectado!', {
            description: data.message,
            duration: 15000
          });
        } else {
          toast.warning('Schema Drift Detectado', {
            description: data.message,
            duration: 10000
          });
        }
      }

      return data;
    } catch (error: any) {
      console.error('Error detecting drift:', error);
      toast.error('Erro ao detectar drift', {
        description: error.message
      });
      return null;
    } finally {
      setDetecting(false);
    }
  };

  const loadDriftLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('schema_drift_logs')
        .select('*')
        .order('detected_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error loading drift logs:', error);
      return [];
    }
  };

  const resolveDrift = async (driftId: string, notes?: string) => {
    try {
      const { error } = await supabase
        .from('schema_drift_logs')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          notes
        })
        .eq('id', driftId);

      if (error) throw error;

      toast.success('Drift marcado como resolvido');
    } catch (error: any) {
      console.error('Error resolving drift:', error);
      toast.error('Erro ao resolver drift', {
        description: error.message
      });
    }
  };

  // Auto-check on mount and periodically (every 30 minutes)
  useEffect(() => {
    if (autoCheckEnabled) {
      detectDrift();

      const interval = setInterval(() => {
        detectDrift();
      }, 30 * 60 * 1000); // 30 minutes

      return () => clearInterval(interval);
    }
  }, [autoCheckEnabled]);

  return {
    driftStatus,
    detecting,
    autoCheckEnabled,
    setAutoCheckEnabled,
    detectDrift,
    loadDriftLogs,
    resolveDrift
  };
}
