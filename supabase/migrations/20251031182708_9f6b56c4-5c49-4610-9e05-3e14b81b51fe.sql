-- Desabilitar Row Level Security na tabela user_roles
-- Isso permite que usuários autenticados possam ler suas roles sem problemas

ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- Remover todas as políticas existentes
DROP POLICY IF EXISTS "authenticated_users_read_own_role" ON public.user_roles;
DROP POLICY IF EXISTS "service_role_insert" ON public.user_roles;
DROP POLICY IF EXISTS "allow_first_master_insert" ON public.user_roles;