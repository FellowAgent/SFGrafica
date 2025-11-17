-- Phase 1: Create migration_backups table
CREATE TABLE IF NOT EXISTS public.migration_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  migration_id UUID REFERENCES public.migration_history(id) ON DELETE SET NULL,
  backup_location TEXT NOT NULL,
  schema_checksum TEXT,
  data_checksum TEXT,
  size_bytes BIGINT,
  can_restore BOOLEAN DEFAULT true,
  backup_type TEXT DEFAULT 'pre_migration',
  notes TEXT,
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.migration_backups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for migration_backups
CREATE POLICY "Masters podem ver backups de migração"
  ON public.migration_backups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'master'
    )
  );

CREATE POLICY "Masters podem criar backups de migração"
  ON public.migration_backups
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'master'
    )
  );

CREATE POLICY "Masters podem atualizar backups de migração"
  ON public.migration_backups
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'master'
    )
  );

-- Phase 6: Create migration_safety_config table
CREATE TABLE IF NOT EXISTS public.migration_safety_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  require_backup BOOLEAN DEFAULT true,
  require_dry_run BOOLEAN DEFAULT true,
  allow_destructive_ops BOOLEAN DEFAULT false,
  require_double_confirmation BOOLEAN DEFAULT true,
  max_affected_rows INTEGER DEFAULT 10000,
  backup_retention_days INTEGER DEFAULT 30,
  auto_rollback_on_error BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.migration_safety_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for migration_safety_config
CREATE POLICY "Masters podem ver configurações de segurança"
  ON public.migration_safety_config
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'master'
    )
  );

CREATE POLICY "Masters podem gerenciar configurações de segurança"
  ON public.migration_safety_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'master'
    )
  );

-- Insert default safety config
INSERT INTO public.migration_safety_config (
  require_backup,
  require_dry_run,
  allow_destructive_ops,
  require_double_confirmation,
  max_affected_rows,
  backup_retention_days,
  auto_rollback_on_error
) VALUES (
  true,
  true,
  false,
  true,
  10000,
  30,
  true
);

-- Add backup_id column to migration_history
ALTER TABLE public.migration_history 
ADD COLUMN IF NOT EXISTS backup_id UUID REFERENCES public.migration_backups(id);

-- Add dry_run_passed column to migration_history
ALTER TABLE public.migration_history 
ADD COLUMN IF NOT EXISTS dry_run_passed BOOLEAN DEFAULT false;

-- Add rollback_executed column to migration_history
ALTER TABLE public.migration_history 
ADD COLUMN IF NOT EXISTS rollback_executed BOOLEAN DEFAULT false;

-- Add rollback_at column to migration_history
ALTER TABLE public.migration_history 
ADD COLUMN IF NOT EXISTS rollback_at TIMESTAMP WITH TIME ZONE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_migration_backups_migration_id 
  ON public.migration_backups(migration_id);

CREATE INDEX IF NOT EXISTS idx_migration_backups_created_at 
  ON public.migration_backups(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_migration_safety_config_updated_at
  BEFORE UPDATE ON public.migration_safety_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();