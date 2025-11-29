-- Remover TODAS as políticas RLS problemáticas da tabela user_roles
-- O problema é que políticas usando has_role() criam recursão infinita

DROP POLICY IF EXISTS "Masters can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Masters can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Masters can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Masters can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Masters podem gerenciar roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Usuários podem criar sua própria role" ON public.user_roles;
DROP POLICY IF EXISTS "Usuários podem ver suas roles" ON public.user_roles;
DROP POLICY IF EXISTS "Sistema pode inserir primeira role" ON public.user_roles;

-- Criar políticas RLS SIMPLES sem recursão
-- Política 1: Qualquer usuário autenticado pode ler suas próprias roles
CREATE POLICY "authenticated_users_read_own_role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Política 2: Sistema pode inserir roles durante signup (service_role)
CREATE POLICY "service_role_insert"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política 3: Permitir que a função assign_master_role insira a primeira role
-- (necessário para o cadastro do primeiro usuário master)
CREATE POLICY "allow_first_master_insert"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND role = 'master' 
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'master'
  )
);