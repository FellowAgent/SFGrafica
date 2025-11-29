-- Adicionar coluna para armazenar preferências de paginação de clientes
ALTER TABLE public.perfis
ADD COLUMN IF NOT EXISTS preferencias_clientes_paginacao JSONB DEFAULT NULL;

-- Índice para otimizar queries de preferências
CREATE INDEX IF NOT EXISTS idx_perfis_preferencias_clientes ON public.perfis USING GIN (preferencias_clientes_paginacao);

