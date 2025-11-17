-- ====================================
-- CORREÇÃO: Políticas RLS para user_roles
-- ====================================

-- Remove as políticas existentes
DROP POLICY IF EXISTS "Masters podem gerenciar roles" ON public.user_roles;
DROP POLICY IF EXISTS "Usuários autenticados podem ver roles" ON public.user_roles;

-- Política 1: Todos podem ver suas próprias roles
CREATE POLICY "Usuários podem ver suas roles"
    ON public.user_roles
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'master'));

-- Política 2: Permitir inserção da primeira role master
-- (quando ainda não existe nenhum master no sistema)
CREATE POLICY "Permitir criação do primeiro master"
    ON public.user_roles
    FOR INSERT
    TO authenticated
    WITH CHECK (
        role = 'master' AND 
        NOT EXISTS (
            SELECT 1 FROM public.user_roles WHERE role = 'master'
        )
    );

-- Política 3: Masters podem gerenciar todas as roles
CREATE POLICY "Masters podem gerenciar roles"
    ON public.user_roles
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'master'))
    WITH CHECK (public.has_role(auth.uid(), 'master'));