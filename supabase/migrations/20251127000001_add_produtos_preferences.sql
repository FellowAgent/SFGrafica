-- Adicionar coluna para armazenar preferências de paginação de produtos
ALTER TABLE public.perfis
ADD COLUMN IF NOT EXISTS preferencias_produtos_paginacao JSONB DEFAULT NULL;

-- Índice para otimizar queries de preferências
CREATE INDEX IF NOT EXISTS idx_perfis_preferencias_produtos ON public.perfis USING GIN (preferencias_produtos_paginacao);

