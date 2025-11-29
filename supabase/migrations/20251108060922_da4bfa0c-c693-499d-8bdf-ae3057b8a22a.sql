-- Adicionar coluna para armazenar layout personalizado de relatórios
ALTER TABLE public.perfis
ADD COLUMN IF NOT EXISTS relatorios_layout JSONB DEFAULT NULL;

-- Índice para otimizar queries de layout
CREATE INDEX IF NOT EXISTS idx_perfis_relatorios_layout ON public.perfis USING GIN (relatorios_layout);