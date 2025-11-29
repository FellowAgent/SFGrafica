-- Adicionar política para permitir leitura de perfis sem autenticação
-- Isso é necessário para a tela de login verificar se existem usuários

DROP POLICY IF EXISTS "Permitir contagem pública de perfis" ON public.perfis;

CREATE POLICY "Permitir contagem pública de perfis"
    ON public.perfis
    FOR SELECT
    TO anon
    USING (true);