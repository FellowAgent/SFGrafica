-- Adicionar coluna tema na tabela perfis
ALTER TABLE public.perfis
ADD COLUMN tema text DEFAULT 'light' CHECK (tema IN ('light', 'dark'));

COMMENT ON COLUMN public.perfis.tema IS 'Preferência de tema do usuário (light ou dark)';