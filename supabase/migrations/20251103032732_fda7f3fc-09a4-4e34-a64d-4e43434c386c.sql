-- Criar tabela de configurações do Asaas
CREATE TABLE public.asaas_configuracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key TEXT,
  environment TEXT DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
  webhook_token TEXT DEFAULT encode(gen_random_bytes(32), 'hex'),
  auto_emit_nf BOOLEAN DEFAULT FALSE,
  nf_enabled BOOLEAN DEFAULT FALSE,
  empresa_cnpj TEXT,
  inscricao_municipal TEXT,
  regime_tributario TEXT,
  natureza_operacao TEXT,
  aliquota_iss NUMERIC(5,2),
  enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de cobranças do Asaas
CREATE TABLE public.asaas_cobrancas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES public.pedidos(id) ON DELETE CASCADE,
  asaas_payment_id TEXT UNIQUE NOT NULL,
  customer_id TEXT NOT NULL,
  billing_type TEXT NOT NULL,
  status TEXT NOT NULL,
  value NUMERIC(10,2) NOT NULL,
  due_date DATE NOT NULL,
  invoice_url TEXT,
  bank_slip_url TEXT,
  pix_qrcode TEXT,
  pix_copy_paste TEXT,
  payment_date TIMESTAMP WITH TIME ZONE,
  confirmed_date TIMESTAMP WITH TIME ZONE,
  external_reference TEXT,
  webhook_events JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de mapeamento de clientes Asaas
CREATE TABLE public.asaas_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  asaas_customer_id TEXT UNIQUE NOT NULL,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de notas fiscais
CREATE TABLE public.asaas_notas_fiscais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES public.pedidos(id) ON DELETE CASCADE,
  asaas_payment_id TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('NFE', 'NFSE')),
  numero TEXT,
  serie TEXT,
  xml_url TEXT,
  pdf_url TEXT,
  status TEXT NOT NULL,
  error_message TEXT,
  emitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de logs de webhook
CREATE TABLE public.asaas_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices
CREATE INDEX idx_asaas_cobrancas_pedido ON public.asaas_cobrancas(pedido_id);
CREATE INDEX idx_asaas_cobrancas_status ON public.asaas_cobrancas(status);
CREATE INDEX idx_asaas_customers_cliente ON public.asaas_customers(cliente_id);
CREATE INDEX idx_asaas_nf_pedido ON public.asaas_notas_fiscais(pedido_id);
CREATE INDEX idx_asaas_webhook_event ON public.asaas_webhook_logs(event_type);
CREATE INDEX idx_asaas_webhook_processed ON public.asaas_webhook_logs(processed);

-- Habilitar RLS
ALTER TABLE public.asaas_configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asaas_cobrancas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asaas_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asaas_notas_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asaas_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para asaas_configuracoes (apenas Masters)
CREATE POLICY "Masters podem gerenciar configurações Asaas"
  ON public.asaas_configuracoes
  FOR ALL
  USING (has_role(auth.uid(), 'master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'master'::app_role));

CREATE POLICY "Usuários autenticados podem ver configurações Asaas"
  ON public.asaas_configuracoes
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Políticas RLS para asaas_cobrancas
CREATE POLICY "Usuários autenticados podem ver cobranças"
  ON public.asaas_cobrancas
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem gerenciar cobranças"
  ON public.asaas_cobrancas
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Políticas RLS para asaas_customers
CREATE POLICY "Usuários autenticados podem ver customers"
  ON public.asaas_customers
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem gerenciar customers"
  ON public.asaas_customers
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Políticas RLS para asaas_notas_fiscais
CREATE POLICY "Usuários autenticados podem ver notas fiscais"
  ON public.asaas_notas_fiscais
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem gerenciar notas fiscais"
  ON public.asaas_notas_fiscais
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Políticas RLS para asaas_webhook_logs
CREATE POLICY "Masters podem ver logs de webhook"
  ON public.asaas_webhook_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'master'::app_role));

-- Triggers para updated_at
CREATE TRIGGER update_asaas_configuracoes_updated_at
  BEFORE UPDATE ON public.asaas_configuracoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_asaas_cobrancas_updated_at
  BEFORE UPDATE ON public.asaas_cobrancas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_asaas_customers_updated_at
  BEFORE UPDATE ON public.asaas_customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_asaas_notas_fiscais_updated_at
  BEFORE UPDATE ON public.asaas_notas_fiscais
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();