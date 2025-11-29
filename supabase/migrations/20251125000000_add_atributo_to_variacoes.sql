-- Adicionar campo atributo à tabela variacoes_produto
ALTER TABLE public.variacoes_produto 
ADD COLUMN IF NOT EXISTS atributo TEXT;

-- Criar índice para melhor performance em buscas por atributo
CREATE INDEX IF NOT EXISTS idx_variacoes_atributo ON public.variacoes_produto(atributo);

-- Comentário explicativo
COMMENT ON COLUMN public.variacoes_produto.atributo IS 'Atributo ou característica específica da variação (ex: Cor Azul, Tamanho M)';

