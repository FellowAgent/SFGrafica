-- Adicionar coluna tipo_desconto na tabela produtos
ALTER TABLE public.produtos 
ADD COLUMN tipo_desconto TEXT DEFAULT 'valor' CHECK (tipo_desconto IN ('valor', 'porcentagem'));