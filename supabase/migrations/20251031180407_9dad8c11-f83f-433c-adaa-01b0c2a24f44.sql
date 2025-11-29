-- Adicionar políticas RLS para a tabela user_roles
-- Isso permitirá que usuários leiam suas próprias roles

-- Política para permitir que usuários vejam suas próprias roles
CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Política para permitir que masters vejam todas as roles
CREATE POLICY "Masters can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'master'));

-- Política para permitir que masters insiram roles
CREATE POLICY "Masters can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'master'));

-- Política para permitir que masters atualizem roles
CREATE POLICY "Masters can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'master'));

-- Política para permitir que masters deletem roles
CREATE POLICY "Masters can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'master'));