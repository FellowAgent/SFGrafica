-- Criar tabela para histórico de migrações
CREATE TABLE IF NOT EXISTS public.migration_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_name TEXT NOT NULL,
  file_name TEXT,
  sql_content TEXT NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT now(),
  executed_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'rolled_back', 'executing')),
  method TEXT NOT NULL CHECK (method IN ('option1', 'option2', 'option3')),
  operations_total INTEGER DEFAULT 0,
  operations_successful INTEGER DEFAULT 0,
  operations_failed INTEGER DEFAULT 0,
  duration_ms INTEGER,
  error_message TEXT,
  can_rollback BOOLEAN DEFAULT false,
  rollback_sql TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.migration_history ENABLE ROW LEVEL SECURITY;

-- Masters podem ver todo histórico
CREATE POLICY "Masters podem ver histórico de migrações"
  ON public.migration_history
  FOR SELECT
  USING (has_role(auth.uid(), 'master'::app_role));

-- Masters podem gerenciar migrações
CREATE POLICY "Masters podem gerenciar migrações"
  ON public.migration_history
  FOR ALL
  USING (has_role(auth.uid(), 'master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'master'::app_role));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_migration_history_updated_at
  BEFORE UPDATE ON public.migration_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_migration_history_executed_at ON public.migration_history(executed_at DESC);
CREATE INDEX idx_migration_history_status ON public.migration_history(status);
CREATE INDEX idx_migration_history_executed_by ON public.migration_history(executed_by);