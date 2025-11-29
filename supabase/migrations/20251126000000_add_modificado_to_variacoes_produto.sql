-- Adicionar campo modificado à tabela variacoes_produto
-- Este campo indica que a variação foi alterada manualmente e não deve ser sobrescrita em importações
ALTER TABLE public.variacoes_produto 
ADD COLUMN IF NOT EXISTS modificado BOOLEAN DEFAULT false;

-- Comentário explicativo
COMMENT ON COLUMN public.variacoes_produto.modificado IS 'Indica que a variação foi modificada manualmente e não deve ser sobrescrita em novas importações';

