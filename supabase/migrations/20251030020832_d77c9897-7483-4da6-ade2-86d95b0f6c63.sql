-- Remover políticas antigas que restringem apenas para masters
DROP POLICY IF EXISTS "Masters podem criar clientes" ON public.clientes;
DROP POLICY IF EXISTS "Masters podem atualizar clientes" ON public.clientes;
DROP POLICY IF EXISTS "Masters podem excluir clientes" ON public.clientes;
DROP POLICY IF EXISTS "Masters podem ver todos os clientes" ON public.clientes;

-- Criar novas políticas permitindo todos os usuários autenticados
CREATE POLICY "Usuários autenticados podem ver clientes"
ON public.clientes
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem criar clientes"
ON public.clientes
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar clientes"
ON public.clientes
FOR UPDATE
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Masters podem excluir clientes"
ON public.clientes
FOR DELETE
USING (has_role(auth.uid(), 'master'::app_role));