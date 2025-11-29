-- Criar tabela para unidades de medida customizáveis
CREATE TABLE public.unidades_medida (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sigla TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.unidades_medida ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Usuários autenticados podem ver unidades de medida"
ON public.unidades_medida
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem criar unidades de medida"
ON public.unidades_medida
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar unidades de medida"
ON public.unidades_medida
FOR UPDATE
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Masters podem excluir unidades de medida"
ON public.unidades_medida
FOR DELETE
USING (has_role(auth.uid(), 'master'::app_role));

-- Inserir unidades padrão
INSERT INTO public.unidades_medida (sigla, nome, ordem) VALUES
  ('un', 'Unidade', 1),
  ('cx', 'Caixa', 2),
  ('pç', 'Peça', 3),
  ('m', 'Metro', 4),
  ('m²', 'Metro Quadrado', 5),
  ('m³', 'Metro Cúbico', 6),
  ('kg', 'Quilograma', 7),
  ('l', 'Litro', 8);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_unidades_medida_updated_at
BEFORE UPDATE ON public.unidades_medida
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();