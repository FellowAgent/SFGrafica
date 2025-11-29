-- Criar tabela para status de pedidos customizáveis
CREATE TABLE IF NOT EXISTS public.status_pedidos_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  cor TEXT NOT NULL,
  text_color TEXT DEFAULT '#000000',
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.status_pedidos_config ENABLE ROW LEVEL SECURITY;

-- Policy para Masters poderem gerenciar
CREATE POLICY "Masters podem gerenciar status"
  ON public.status_pedidos_config
  FOR ALL
  USING (has_role(auth.uid(), 'master'))
  WITH CHECK (has_role(auth.uid(), 'master'));

-- Policy para todos usuários autenticados poderem visualizar
CREATE POLICY "Usuários autenticados podem ver status"
  ON public.status_pedidos_config
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_status_pedidos_config_updated_at
  BEFORE UPDATE ON public.status_pedidos_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir status padrão
INSERT INTO public.status_pedidos_config (nome, cor, text_color, ordem) VALUES
  ('finalizado', '#CBE8D0', '#000000', 1),
  ('em produção', '#FFF6A7', '#000000', 2),
  ('novo pedido', '#CAD7F0', '#000000', 3),
  ('cancelado', '#F2C7C6', '#000000', 4),
  ('encaminhar', '#D8C8AC', '#000000', 5),
  ('entrega', '#FFD9A1', '#000000', 6)
ON CONFLICT (nome) DO NOTHING;