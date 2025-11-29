-- Adicionar campos de medidas, material, arte final/acabamentos e quantidade à tabela produtos
ALTER TABLE public.produtos 
ADD COLUMN IF NOT EXISTS medidas TEXT,
ADD COLUMN IF NOT EXISTS material TEXT,
ADD COLUMN IF NOT EXISTS arte_final_acabamentos TEXT,
ADD COLUMN IF NOT EXISTS quantidade TEXT;

-- Criar índices para melhorar performance nas buscas
CREATE INDEX IF NOT EXISTS idx_produtos_medidas ON public.produtos USING GIN (to_tsvector('portuguese', COALESCE(medidas, '')));
CREATE INDEX IF NOT EXISTS idx_produtos_material ON public.produtos USING GIN (to_tsvector('portuguese', COALESCE(material, '')));
CREATE INDEX IF NOT EXISTS idx_produtos_arte_final ON public.produtos USING GIN (to_tsvector('portuguese', COALESCE(arte_final_acabamentos, '')));
CREATE INDEX IF NOT EXISTS idx_produtos_quantidade ON public.produtos USING GIN (to_tsvector('portuguese', COALESCE(quantidade, '')));