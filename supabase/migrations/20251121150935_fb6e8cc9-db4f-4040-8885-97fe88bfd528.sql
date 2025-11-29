-- Criar tabela de templates de variações
CREATE TABLE IF NOT EXISTS public.templates_variacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de atributos de variação (hierárquica)
CREATE TABLE IF NOT EXISTS public.atributos_variacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.templates_variacoes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  pai_id UUID REFERENCES public.atributos_variacao(id) ON DELETE CASCADE,
  nivel INTEGER DEFAULT 0,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de opções de variação
CREATE TABLE IF NOT EXISTS public.opcoes_variacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atributo_id UUID NOT NULL REFERENCES public.atributos_variacao(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  sku TEXT,
  codigo_barras TEXT,
  valor_adicional NUMERIC DEFAULT 0,
  estoque INTEGER DEFAULT 0,
  imagem_url TEXT,
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Adicionar campos à tabela variacoes_produto existente
ALTER TABLE public.variacoes_produto 
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.templates_variacoes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS opcao_variacao_id UUID REFERENCES public.opcoes_variacao(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS sku TEXT,
ADD COLUMN IF NOT EXISTS codigo_barras TEXT,
ADD COLUMN IF NOT EXISTS imagem_url TEXT;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_atributos_template ON public.atributos_variacao(template_id);
CREATE INDEX IF NOT EXISTS idx_atributos_pai ON public.atributos_variacao(pai_id);
CREATE INDEX IF NOT EXISTS idx_opcoes_atributo ON public.opcoes_variacao(atributo_id);
CREATE INDEX IF NOT EXISTS idx_variacoes_template ON public.variacoes_produto(template_id);
CREATE INDEX IF NOT EXISTS idx_variacoes_opcao ON public.variacoes_produto(opcao_variacao_id);

-- Trigger para updated_at
CREATE TRIGGER update_templates_variacoes_updated_at
  BEFORE UPDATE ON public.templates_variacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_atributos_variacao_updated_at
  BEFORE UPDATE ON public.atributos_variacao
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_opcoes_variacao_updated_at
  BEFORE UPDATE ON public.opcoes_variacao
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies para templates_variacoes
ALTER TABLE public.templates_variacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver templates"
  ON public.templates_variacoes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem criar templates"
  ON public.templates_variacoes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar templates"
  ON public.templates_variacoes FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Masters podem excluir templates"
  ON public.templates_variacoes FOR DELETE
  USING (has_role(auth.uid(), 'master'::app_role));

-- RLS Policies para atributos_variacao
ALTER TABLE public.atributos_variacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver atributos"
  ON public.atributos_variacao FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem criar atributos"
  ON public.atributos_variacao FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar atributos"
  ON public.atributos_variacao FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem excluir atributos"
  ON public.atributos_variacao FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- RLS Policies para opcoes_variacao
ALTER TABLE public.opcoes_variacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver opções"
  ON public.opcoes_variacao FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem criar opções"
  ON public.opcoes_variacao FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar opções"
  ON public.opcoes_variacao FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem excluir opções"
  ON public.opcoes_variacao FOR DELETE
  USING (auth.uid() IS NOT NULL);