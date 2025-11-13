-- Criar tabela de relacionamento muitos-para-muitos entre produtos e categorias
CREATE TABLE IF NOT EXISTS public.produtos_categorias (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  categoria_id uuid NOT NULL REFERENCES public.categorias(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(produto_id, categoria_id)
);

-- Habilitar RLS
ALTER TABLE public.produtos_categorias ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Usuários autenticados podem ver relacionamentos produto-categoria"
ON public.produtos_categorias
FOR SELECT
USING (true);

CREATE POLICY "Usuários autenticados podem gerenciar relacionamentos produto-categoria"
ON public.produtos_categorias
FOR ALL
USING (true)
WITH CHECK (true);

-- Migrar dados existentes da coluna categoria_id para a nova tabela
INSERT INTO public.produtos_categorias (produto_id, categoria_id)
SELECT id, categoria_id
FROM public.produtos
WHERE categoria_id IS NOT NULL
ON CONFLICT (produto_id, categoria_id) DO NOTHING;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_produtos_categorias_produto_id ON public.produtos_categorias(produto_id);
CREATE INDEX IF NOT EXISTS idx_produtos_categorias_categoria_id ON public.produtos_categorias(categoria_id);