-- Adicionar coluna preferencia_visualizacao_clientes na tabela perfis
ALTER TABLE public.perfis
ADD COLUMN preferencia_visualizacao_clientes text DEFAULT 'lista' CHECK (preferencia_visualizacao_clientes IN ('lista', 'grid'));

COMMENT ON COLUMN public.perfis.preferencia_visualizacao_clientes IS 'Preferência de visualização do usuário na tela de clientes (lista ou grid)';