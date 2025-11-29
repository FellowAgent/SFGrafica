-- Adicionar campo para controlar exibição de status na tela Inicio
ALTER TABLE public.status_pedidos_config
ADD COLUMN IF NOT EXISTS exibir_no_inicio BOOLEAN DEFAULT TRUE;

-- Comentário explicativo
COMMENT ON COLUMN public.status_pedidos_config.exibir_no_inicio IS 'Define se o status deve ser exibido na tela Inicio/Fluxo (Kanban). Configuração global para todos os usuários.';

