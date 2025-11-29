-- Adicionar campo template_variacao_id à tabela variacoes_produto
-- Este campo armazena o ID da variação na tabela variacoes_produtos (do template)
-- para permitir rastreamento e evitar duplicatas ao reimportar
ALTER TABLE public.variacoes_produto 
ADD COLUMN IF NOT EXISTS template_variacao_id UUID;

-- Criar índice para melhor performance em buscas
CREATE INDEX IF NOT EXISTS idx_variacoes_produto_template_variacao_id 
ON public.variacoes_produto(template_variacao_id);

-- Comentário explicativo
COMMENT ON COLUMN public.variacoes_produto.template_variacao_id IS 'ID da variação na tabela variacoes_produtos (do template) - usado para rastreamento e evitar duplicatas ao reimportar';

