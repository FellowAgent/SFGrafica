-- Adicionar campo nome_exibicao_pedidos na tabela perfis
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS nome_exibicao_pedidos TEXT;