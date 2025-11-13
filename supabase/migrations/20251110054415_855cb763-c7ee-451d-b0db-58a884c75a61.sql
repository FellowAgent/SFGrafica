-- Adiciona coluna desconto na tabela produtos
ALTER TABLE produtos 
ADD COLUMN desconto NUMERIC DEFAULT 0 CHECK (desconto >= 0);

COMMENT ON COLUMN produtos.desconto IS 'Valor do desconto em reais aplicado ao produto';