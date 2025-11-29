-- Fix RLS policies for clientes table to restrict access based on roles
-- Only masters can see all clients, other users cannot access client data unless explicitly granted

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Usuários autenticados podem gerenciar clientes" ON public.clientes;
DROP POLICY IF EXISTS "Usuários autenticados podem ver clientes" ON public.clientes;

-- Masters can view all clients
CREATE POLICY "Masters podem ver todos os clientes"
ON public.clientes
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'master'));

-- Masters can insert clients
CREATE POLICY "Masters podem criar clientes"
ON public.clientes
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'master'));

-- Masters can update clients
CREATE POLICY "Masters podem atualizar clientes"
ON public.clientes
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'master'))
WITH CHECK (public.has_role(auth.uid(), 'master'));

-- Masters can delete clients
CREATE POLICY "Masters podem excluir clientes"
ON public.clientes
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'master'));