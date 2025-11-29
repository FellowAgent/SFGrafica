-- Adicionar coluna para atalhos personalizados por usuário
ALTER TABLE public.perfis
ADD COLUMN IF NOT EXISTS atalhos_teclado JSONB DEFAULT NULL;

-- Índice para otimizar queries de atalhos personalizados
CREATE INDEX IF NOT EXISTS idx_perfis_atalhos_teclado ON public.perfis USING GIN (atalhos_teclado);

-- Comentário
COMMENT ON COLUMN public.perfis.atalhos_teclado IS 'Atalhos de teclado personalizados do usuário. Se NULL, usa as configurações globais.';

