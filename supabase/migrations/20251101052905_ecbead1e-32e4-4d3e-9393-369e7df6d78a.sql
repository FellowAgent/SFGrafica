-- Habilitar RLS na tabela user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Política para permitir usuários verem seu próprio role
CREATE POLICY "Usuários podem ver próprio role" ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política para permitir masters verem todos os roles
CREATE POLICY "Masters podem ver todos roles" ON public.user_roles
  FOR SELECT
  USING (has_role(auth.uid(), 'master'::app_role));

-- Política para permitir masters gerenciarem roles
CREATE POLICY "Masters podem gerenciar roles" ON public.user_roles
  FOR ALL
  USING (has_role(auth.uid(), 'master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'master'::app_role));