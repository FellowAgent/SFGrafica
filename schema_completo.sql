-- =============================================
-- SCHEMA COMPLETO DO APLICATIVO
-- Execute este script no SQL Editor do Supabase
-- URL: https://supabase.myfellow.cloud/project/_/sql
-- =============================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. TABELA DE PERFIS (profiles)
-- =============================================
CREATE TABLE IF NOT EXISTS public.perfis (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT,
  email TEXT,
  avatar_url TEXT,
  telefone TEXT,
  cargo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver próprio perfil" ON public.perfis
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar próprio perfil" ON public.perfis
  FOR UPDATE USING (auth.uid() = id);

-- =============================================
-- 2. TABELA DE CLIENTES
-- =============================================
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  cpf_cnpj TEXT NOT NULL,
  email TEXT,
  celular TEXT NOT NULL,
  telefone TEXT,
  endereco TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  tipo TEXT CHECK (tipo IN ('Pessoa Física', 'Pessoa Jurídica')) DEFAULT 'Pessoa Física',
  ativo BOOLEAN DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver clientes" ON public.clientes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem inserir clientes" ON public.clientes
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar clientes" ON public.clientes
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem deletar clientes" ON public.clientes
  FOR DELETE TO authenticated USING (true);

-- =============================================
-- 3. TABELA DE CATEGORIAS
-- =============================================
CREATE TABLE IF NOT EXISTS public.categorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver categorias" ON public.categorias
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem inserir categorias" ON public.categorias
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar categorias" ON public.categorias
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem deletar categorias" ON public.categorias
  FOR DELETE TO authenticated USING (true);

-- =============================================
-- 4. TABELA DE PRODUTOS
-- =============================================
CREATE TABLE IF NOT EXISTS public.produtos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  codigo TEXT UNIQUE,
  categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  tipo TEXT CHECK (tipo IN ('Produto', 'Serviço')) DEFAULT 'Produto',
  preco DECIMAL(10,2) NOT NULL DEFAULT 0,
  desconto DECIMAL(10,2) DEFAULT 0,
  modalidade TEXT,
  quantidade DECIMAL(10,2) DEFAULT 0,
  medida TEXT,
  unidade TEXT,
  material TEXT,
  acabamento TEXT,
  formato TEXT,
  condicao TEXT,
  descricao_curta TEXT,
  descricao_complementar TEXT,
  observacoes TEXT,
  tags TEXT[],
  imagens TEXT[],
  ativo BOOLEAN DEFAULT true,
  estoque DECIMAL(10,2) DEFAULT 0,
  estoque_minimo DECIMAL(10,2) DEFAULT 0,
  ncm TEXT,
  cest TEXT,
  icms DECIMAL(5,2),
  ipi DECIMAL(5,2),
  codigo_servico TEXT,
  iss DECIMAL(5,2),
  pis DECIMAL(5,2),
  cofins DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver produtos" ON public.produtos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem inserir produtos" ON public.produtos
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar produtos" ON public.produtos
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem deletar produtos" ON public.produtos
  FOR DELETE TO authenticated USING (true);

-- =============================================
-- 5. TABELA DE VARIAÇÕES DE PRODUTO
-- =============================================
CREATE TABLE IF NOT EXISTS public.variacoes_produto (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  produto_id UUID REFERENCES public.produtos(id) ON DELETE CASCADE NOT NULL,
  combinacao JSONB NOT NULL,
  codigo TEXT,
  preco DECIMAL(10,2),
  estoque DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.variacoes_produto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver variações" ON public.variacoes_produto
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem inserir variações" ON public.variacoes_produto
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar variações" ON public.variacoes_produto
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem deletar variações" ON public.variacoes_produto
  FOR DELETE TO authenticated USING (true);

-- =============================================
-- 6. TABELA DE PEDIDOS
-- =============================================
CREATE TABLE IF NOT EXISTS public.pedidos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero_pedido TEXT UNIQUE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  vendedor_id UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('Em Produção', 'Pronto', 'Entregue', 'Cancelado', 'Aguardando')) DEFAULT 'Aguardando',
  tipo_retirada TEXT CHECK (tipo_retirada IN ('balcao', 'entrega')) DEFAULT 'balcao',
  prazo_entrega TEXT,
  unidade_prazo TEXT CHECK (unidade_prazo IN ('imediatamente', 'minutos', 'horas', 'dias', 'semanas')),
  codigo_retirada TEXT,
  observacoes TEXT,
  total DECIMAL(10,2) DEFAULT 0,
  desconto_total DECIMAL(10,2) DEFAULT 0,
  valor_final DECIMAL(10,2) DEFAULT 0,
  meio_pagamento TEXT,
  gerar_nf BOOLEAN DEFAULT false,
  data_entrega TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver pedidos" ON public.pedidos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem inserir pedidos" ON public.pedidos
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar pedidos" ON public.pedidos
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem deletar pedidos" ON public.pedidos
  FOR DELETE TO authenticated USING (true);

-- =============================================
-- 7. TABELA DE ITENS DO PEDIDO
-- =============================================
CREATE TABLE IF NOT EXISTS public.itens_pedido (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id UUID REFERENCES public.pedidos(id) ON DELETE CASCADE NOT NULL,
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  variacao_id UUID REFERENCES public.variacoes_produto(id) ON DELETE SET NULL,
  quantidade DECIMAL(10,2) NOT NULL DEFAULT 1,
  medida TEXT,
  material TEXT,
  acabamento TEXT,
  preco_unitario DECIMAL(10,2) NOT NULL,
  desconto DECIMAL(10,2) DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.itens_pedido ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver itens" ON public.itens_pedido
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem inserir itens" ON public.itens_pedido
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar itens" ON public.itens_pedido
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem deletar itens" ON public.itens_pedido
  FOR DELETE TO authenticated USING (true);

-- =============================================
-- 8. TABELA DE ETIQUETAS
-- =============================================
CREATE TABLE IF NOT EXISTS public.etiquetas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL UNIQUE,
  cor TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.etiquetas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver etiquetas" ON public.etiquetas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem inserir etiquetas" ON public.etiquetas
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar etiquetas" ON public.etiquetas
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem deletar etiquetas" ON public.etiquetas
  FOR DELETE TO authenticated USING (true);

-- =============================================
-- 9. TABELA DE RELAÇÃO PEDIDOS-ETIQUETAS
-- =============================================
CREATE TABLE IF NOT EXISTS public.pedidos_etiquetas (
  pedido_id UUID REFERENCES public.pedidos(id) ON DELETE CASCADE,
  etiqueta_id UUID REFERENCES public.etiquetas(id) ON DELETE CASCADE,
  PRIMARY KEY (pedido_id, etiqueta_id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pedidos_etiquetas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver pedidos_etiquetas" ON public.pedidos_etiquetas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem inserir pedidos_etiquetas" ON public.pedidos_etiquetas
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem deletar pedidos_etiquetas" ON public.pedidos_etiquetas
  FOR DELETE TO authenticated USING (true);

-- =============================================
-- 10. TABELA DE COMENTÁRIOS DO PEDIDO
-- =============================================
CREATE TABLE IF NOT EXISTS public.comentarios_pedido (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id UUID REFERENCES public.pedidos(id) ON DELETE CASCADE NOT NULL,
  usuario_id UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
  comentario TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.comentarios_pedido ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver comentários" ON public.comentarios_pedido
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem inserir comentários" ON public.comentarios_pedido
  FOR INSERT TO authenticated WITH CHECK (true);

-- =============================================
-- 11. TABELA DE CONFIGURAÇÕES
-- =============================================
CREATE TABLE IF NOT EXISTS public.configuracoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chave TEXT NOT NULL UNIQUE,
  valor JSONB,
  descricao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver configurações" ON public.configuracoes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem atualizar configurações" ON public.configuracoes
  FOR UPDATE TO authenticated USING (true);

-- =============================================
-- FUNÇÕES E TRIGGERS
-- =============================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_perfis_updated_at BEFORE UPDATE ON public.perfis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categorias_updated_at BEFORE UPDATE ON public.categorias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_variacoes_produto_updated_at BEFORE UPDATE ON public.variacoes_produto
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pedidos_updated_at BEFORE UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_itens_pedido_updated_at BEFORE UPDATE ON public.itens_pedido
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_configuracoes_updated_at BEFORE UPDATE ON public.configuracoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para gerar número de pedido
CREATE OR REPLACE FUNCTION gerar_numero_pedido()
RETURNS TRIGGER AS $$
DECLARE
  proximo_numero INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_pedido FROM '[0-9]+') AS INTEGER)), 0) + 1
  INTO proximo_numero
  FROM public.pedidos
  WHERE numero_pedido ~ '^[0-9]+$';
  
  NEW.numero_pedido = LPAD(proximo_numero::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_gerar_numero_pedido
  BEFORE INSERT ON public.pedidos
  FOR EACH ROW
  WHEN (NEW.numero_pedido IS NULL)
  EXECUTE FUNCTION gerar_numero_pedido();

-- Função para calcular total do pedido
CREATE OR REPLACE FUNCTION calcular_total_pedido()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.pedidos
  SET total = (
    SELECT COALESCE(SUM(subtotal), 0)
    FROM public.itens_pedido
    WHERE pedido_id = COALESCE(NEW.pedido_id, OLD.pedido_id)
  ),
  valor_final = (
    SELECT COALESCE(SUM(subtotal), 0)
    FROM public.itens_pedido
    WHERE pedido_id = COALESCE(NEW.pedido_id, OLD.pedido_id)
  ) - COALESCE(desconto_total, 0)
  WHERE id = COALESCE(NEW.pedido_id, OLD.pedido_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calcular_total_pedido
  AFTER INSERT OR UPDATE OR DELETE ON public.itens_pedido
  FOR EACH ROW
  EXECUTE FUNCTION calcular_total_pedido();

-- Função para criar perfil ao registrar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfis (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_clientes_cpf_cnpj ON public.clientes(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON public.clientes(nome);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON public.produtos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_produtos_codigo ON public.produtos(codigo);
CREATE INDEX IF NOT EXISTS idx_variacoes_produto_id ON public.variacoes_produto(produto_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON public.pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_vendedor ON public.pedidos(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON public.pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_numero ON public.pedidos(numero_pedido);
CREATE INDEX IF NOT EXISTS idx_itens_pedido_pedido ON public.itens_pedido(pedido_id);
CREATE INDEX IF NOT EXISTS idx_itens_pedido_produto ON public.itens_pedido(produto_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_pedido ON public.comentarios_pedido(pedido_id);

-- =============================================
-- DADOS INICIAIS
-- =============================================

-- Inserir etiquetas padrão
INSERT INTO public.etiquetas (nome, cor) VALUES
('Urgente', '#ef4444'),
('Prioridade', '#f59e0b'),
('Normal', '#10b981'),
('Concluído', '#6366f1')
ON CONFLICT (nome) DO NOTHING;
