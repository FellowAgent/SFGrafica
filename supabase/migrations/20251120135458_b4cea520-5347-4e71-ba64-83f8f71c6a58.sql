-- Adicionar coluna unidade_medida na tabela itens_pedido
ALTER TABLE public.itens_pedido 
ADD COLUMN unidade_medida TEXT;

COMMENT ON COLUMN public.itens_pedido.unidade_medida IS 'Unidade de medida do item do pedido (ex: un, m, kg, etc.)';