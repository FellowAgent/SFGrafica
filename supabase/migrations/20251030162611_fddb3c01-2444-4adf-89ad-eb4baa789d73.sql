-- Adicionar suporte a hierarquia de categorias
ALTER TABLE public.categorias
ADD COLUMN IF NOT EXISTS categoria_pai_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS nivel INTEGER DEFAULT 0;

-- Criar índice para melhorar performance de consultas hierárquicas
CREATE INDEX IF NOT EXISTS idx_categorias_pai ON public.categorias(categoria_pai_id);