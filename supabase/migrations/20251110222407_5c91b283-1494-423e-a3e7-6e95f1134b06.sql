-- Tabela para configurações globais do Supabase
CREATE TABLE IF NOT EXISTS public.supabase_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  supabase_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  config_source TEXT DEFAULT 'database',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Garantir apenas 1 registro de configuração ativa
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_config 
  ON public.supabase_config (is_active) 
  WHERE is_active = true;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_supabase_config_updated_at ON public.supabase_config;
CREATE TRIGGER update_supabase_config_updated_at
  BEFORE UPDATE ON public.supabase_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: Apenas Masters podem gerenciar
ALTER TABLE public.supabase_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Masters podem ver configurações" ON public.supabase_config;
CREATE POLICY "Masters podem ver configurações"
  ON public.supabase_config FOR SELECT
  USING (public.has_role(auth.uid(), 'master'::app_role));

DROP POLICY IF EXISTS "Masters podem gerenciar configurações" ON public.supabase_config;
CREATE POLICY "Masters podem gerenciar configurações"
  ON public.supabase_config FOR ALL
  USING (public.has_role(auth.uid(), 'master'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'master'::app_role));

-- Trigger de auditoria para supabase_config
DROP TRIGGER IF EXISTS audit_supabase_config_changes ON public.supabase_config;
CREATE TRIGGER audit_supabase_config_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.supabase_config
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_log_trigger();