-- Remover políticas antigas
DROP POLICY IF EXISTS "Usuários podem atualizar próprio perfil" ON public.perfis;
DROP POLICY IF EXISTS "Masters podem atualizar qualquer perfil" ON public.perfis;
DROP POLICY IF EXISTS "Permitir inserção de perfis" ON public.perfis;

-- Criar política para permitir usuários atualizarem seu próprio perfil
CREATE POLICY "Usuários podem atualizar próprio perfil" ON public.perfis
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Criar política para permitir masters atualizarem qualquer perfil
CREATE POLICY "Masters podem atualizar qualquer perfil" ON public.perfis
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'master'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'master'::app_role)
  );