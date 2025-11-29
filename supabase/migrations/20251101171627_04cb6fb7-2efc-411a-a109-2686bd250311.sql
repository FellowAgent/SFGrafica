-- Remover a constraint CHECK problemática e recriar a coluna corretamente
ALTER TABLE public.perfis 
DROP COLUMN IF EXISTS preferencia_visualizacao_clientes;

-- Adicionar a coluna novamente sem a constraint CHECK
ALTER TABLE public.perfis
ADD COLUMN preferencia_visualizacao_clientes text DEFAULT 'lista';

COMMENT ON COLUMN public.perfis.preferencia_visualizacao_clientes IS 'Preferência de visualização do usuário na tela de clientes (lista ou grid)';