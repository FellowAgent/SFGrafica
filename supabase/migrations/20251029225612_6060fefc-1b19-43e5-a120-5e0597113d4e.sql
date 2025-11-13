-- ====================================
-- CORREÇÃO: Políticas RLS para user_roles (Login Fix)
-- ====================================

-- Remove todas as políticas existentes
DROP POLICY IF EXISTS "Usuários podem ver suas roles" ON public.user_roles;
DROP POLICY IF EXISTS "Permitir criação do primeiro master" ON public.user_roles;
DROP POLICY IF EXISTS "Masters podem gerenciar roles" ON public.user_roles;

-- Política 1: Todos podem ver suas próprias roles
CREATE POLICY "Usuários podem ver suas roles"
    ON public.user_roles
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'master'));

-- Política 2: Permitir que usuário crie sua própria role
-- (se ainda não tiver nenhuma role OU se for o primeiro master)
CREATE POLICY "Usuários podem criar sua própria role"
    ON public.user_roles
    FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid() AND
        (
            -- Permite criar primeira role master se não existir nenhum
            (role = 'master' AND NOT EXISTS (
                SELECT 1 FROM public.user_roles WHERE role = 'master'
            ))
            OR
            -- Permite criar role se o usuário ainda não tem nenhuma
            NOT EXISTS (
                SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()
            )
        )
    );

-- Política 3: Masters podem gerenciar todas as roles
CREATE POLICY "Masters podem gerenciar roles"
    ON public.user_roles
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'master'))
    WITH CHECK (public.has_role(auth.uid(), 'master'));