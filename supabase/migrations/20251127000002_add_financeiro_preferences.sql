-- Adicionar coluna para armazenar preferências de paginação de pedidos (financeiro)
ALTER TABLE public.perfis
ADD COLUMN IF NOT EXISTS preferencias_financeiro_paginacao JSONB DEFAULT NULL;

-- Índice para otimizar queries de preferências
CREATE INDEX IF NOT EXISTS idx_perfis_preferencias_financeiro ON public.perfis USING GIN (preferencias_financeiro_paginacao);

