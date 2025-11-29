-- Remover a foreign key incorreta que aponta para auth.users
ALTER TABLE public.comentarios_pedido
DROP CONSTRAINT IF EXISTS comentarios_pedido_usuario_id_fkey;

-- Criar a foreign key correta apontando para perfis
ALTER TABLE public.comentarios_pedido
ADD CONSTRAINT comentarios_pedido_usuario_id_fkey
FOREIGN KEY (usuario_id)
REFERENCES public.perfis(id)
ON DELETE SET NULL;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_comentarios_pedido_usuario_id 
ON public.comentarios_pedido(usuario_id);

CREATE INDEX IF NOT EXISTS idx_comentarios_pedido_pedido_id 
ON public.comentarios_pedido(pedido_id);