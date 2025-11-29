-- Adicionar campo pago na tabela pedidos
ALTER TABLE public.pedidos 
ADD COLUMN pago boolean DEFAULT false;

-- Comentário explicativo
COMMENT ON COLUMN public.pedidos.pago IS 'Indica se o pedido foi pago ou não';