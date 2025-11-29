-- Remover política antiga de contagem pública se existir
DROP POLICY IF EXISTS "Permitir contagem pública de perfis" ON public.perfis;

-- Criar nova política específica para permitir contagem de perfis para setup inicial
CREATE POLICY "Permitir contagem de perfis para setup inicial"
ON public.perfis
FOR SELECT
TO anon
USING (true);