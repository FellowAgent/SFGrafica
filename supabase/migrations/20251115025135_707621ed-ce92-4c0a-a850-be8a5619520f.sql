-- ============================================
-- FASE 1: Sistema de Versionamento de Schema
-- ============================================

-- Criar tabela schema_versions para controle de versão do schema
CREATE TABLE IF NOT EXISTS public.schema_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  description TEXT,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  applied_by UUID,
  checksum TEXT NOT NULL,
  schema_snapshot JSONB,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para buscar versão atual rapidamente
CREATE INDEX IF NOT EXISTS idx_schema_versions_current ON public.schema_versions(is_current) WHERE is_current = true;

-- Índice para buscar por versão
CREATE INDEX IF NOT EXISTS idx_schema_versions_version ON public.schema_versions(version);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_schema_versions_updated_at
  BEFORE UPDATE ON public.schema_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Atualizar tabela migration_history com campos de versão
ALTER TABLE public.migration_history 
ADD COLUMN IF NOT EXISTS schema_version_before TEXT,
ADD COLUMN IF NOT EXISTS schema_version_after TEXT,
ADD COLUMN IF NOT EXISTS checksum_before TEXT,
ADD COLUMN IF NOT EXISTS checksum_after TEXT;

-- Criar tabela deployment_targets para sincronização multi-ambiente
CREATE TABLE IF NOT EXISTS public.deployment_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  supabase_url TEXT NOT NULL,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  current_version TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_deployment_targets_updated_at
  BEFORE UPDATE ON public.deployment_targets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Criar tabela schema_drift_logs para histórico de detecção de drift
CREATE TABLE IF NOT EXISTS public.schema_drift_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expected_version TEXT,
  expected_checksum TEXT,
  actual_checksum TEXT,
  differences JSONB,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  notes TEXT
);

-- Índice para buscar drifts não resolvidos
CREATE INDEX IF NOT EXISTS idx_schema_drift_logs_resolved ON public.schema_drift_logs(resolved) WHERE resolved = false;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE public.schema_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployment_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schema_drift_logs ENABLE ROW LEVEL SECURITY;

-- Policies para schema_versions (somente master pode ler/escrever)
CREATE POLICY "Master users can view schema versions"
  ON public.schema_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'master'
    )
  );

CREATE POLICY "Master users can insert schema versions"
  ON public.schema_versions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'master'
    )
  );

CREATE POLICY "Master users can update schema versions"
  ON public.schema_versions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'master'
    )
  );

-- Policies para deployment_targets
CREATE POLICY "Master users can view deployment targets"
  ON public.deployment_targets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'master'
    )
  );

CREATE POLICY "Master users can manage deployment targets"
  ON public.deployment_targets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'master'
    )
  );

-- Policies para schema_drift_logs
CREATE POLICY "Master users can view drift logs"
  ON public.schema_drift_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'master'
    )
  );

CREATE POLICY "System can insert drift logs"
  ON public.schema_drift_logs
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Master users can update drift logs"
  ON public.schema_drift_logs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'master'
    )
  );