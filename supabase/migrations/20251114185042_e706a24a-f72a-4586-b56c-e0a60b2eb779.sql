-- Adicionar coluna para salvar preferências da aba de pedidos
ALTER TABLE public.perfis 
ADD COLUMN IF NOT EXISTS preferencias_pedidos_tab JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.perfis.preferencias_pedidos_tab IS 'Armazena preferências do usuário para a aba de configuração de pedidos (switches de ocultar inativos, etc)';