-- Criar tabela para configuração do fluxo de vendedores
CREATE TABLE IF NOT EXISTS public.vendedores_fluxo (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Habilitar RLS
ALTER TABLE public.vendedores_fluxo ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Masters podem gerenciar fluxo de vendedores"
  ON public.vendedores_fluxo
  FOR ALL
  USING (has_role(auth.uid(), 'master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'master'::app_role));

CREATE POLICY "Usuários autenticados podem ver fluxo de vendedores"
  ON public.vendedores_fluxo
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_vendedores_fluxo_updated_at
  BEFORE UPDATE ON public.vendedores_fluxo
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();