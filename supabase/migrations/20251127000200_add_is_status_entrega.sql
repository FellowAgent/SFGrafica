-- Adicionar coluna para marcar status como status de entrega
ALTER TABLE public.status_pedidos_config
ADD COLUMN IF NOT EXISTS is_status_entrega BOOLEAN DEFAULT false;

-- Criar índice para otimizar queries
CREATE INDEX IF NOT EXISTS idx_status_entrega ON public.status_pedidos_config(is_status_entrega) WHERE is_status_entrega = true;

-- Comentário
COMMENT ON COLUMN public.status_pedidos_config.is_status_entrega IS 'Indica se este é o status que gera código de entrega. Apenas um status pode ter este flag ativo.';

-- Criar trigger para garantir que apenas um status seja marcado como status de entrega
CREATE OR REPLACE FUNCTION public.enforce_single_status_entrega()
RETURNS TRIGGER AS $$
BEGIN
  -- Se estamos marcando como status de entrega
  IF NEW.is_status_entrega = true THEN
    -- Desmarcar todos os outros
    UPDATE public.status_pedidos_config
    SET is_status_entrega = false
    WHERE id != NEW.id AND is_status_entrega = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_enforce_single_status_entrega ON public.status_pedidos_config;
CREATE TRIGGER trigger_enforce_single_status_entrega
  BEFORE INSERT OR UPDATE ON public.status_pedidos_config
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_single_status_entrega();

