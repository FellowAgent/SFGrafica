-- ==============================================================
-- SISTEMA DE GESTÃO - ESTRUTURA COMPLETA DO BANCO DE DADOS
-- Execute este script completo no SQL Editor do Supabase:
-- https://supabase.myfellow.cloud/project/_/sql
-- ==============================================================

-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUM PARA ROLES
-- ==============================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('master', 'financeiro', 'vendedor');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. TABELA DE PERFIS (conectada ao auth.users)
-- ==============================================================
CREATE TABLE IF NOT EXISTS public.perfis (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  usuario TEXT UNIQUE NOT NULL,
  ativo BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todas operações perfis" ON public.perfis;
CREATE POLICY "Permitir todas operações perfis"
  ON public.perfis
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3. TABELA DE ROLES DOS USUÁRIOS (SEGURANÇA)
-- ==============================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todas operações roles" ON public.user_roles;
CREATE POLICY "Permitir todas operações roles"
  ON public.user_roles
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. FUNÇÃO DE SEGURANÇA PARA VERIFICAR ROLES
-- ==============================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 5. TABELA DE CLIENTES
-- ==============================================================
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

DROP POLICY IF EXISTS "Permitir todas operações clientes" ON public.clientes;
CREATE POLICY "Permitir todas operações clientes"
  ON public.clientes
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6. TABELA DE CATEGORIAS
-- ==============================================================
CREATE TABLE IF NOT EXISTS public.categorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todas operações categorias" ON public.categorias;
CREATE POLICY "Permitir todas operações categorias"
  ON public.categorias
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 7. TABELA DE PRODUTOS
-- ==============================================================
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

DROP POLICY IF EXISTS "Permitir todas operações produtos" ON public.produtos;
CREATE POLICY "Permitir todas operações produtos"
  ON public.produtos
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 8. TABELA DE VARIAÇÕES DE PRODUTO
-- ==============================================================
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

DROP POLICY IF EXISTS "Permitir todas operações variacoes" ON public.variacoes_produto;
CREATE POLICY "Permitir todas operações variacoes"
  ON public.variacoes_produto
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 9. TABELA DE PEDIDOS
-- ==============================================================
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

DROP POLICY IF EXISTS "Permitir todas operações pedidos" ON public.pedidos;
CREATE POLICY "Permitir todas operações pedidos"
  ON public.pedidos
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 10. TABELA DE ITENS DO PEDIDO
-- ==============================================================
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

DROP POLICY IF EXISTS "Permitir todas operações itens" ON public.itens_pedido;
CREATE POLICY "Permitir todas operações itens"
  ON public.itens_pedido
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 11. TABELA DE ETIQUETAS
-- ==============================================================
CREATE TABLE IF NOT EXISTS public.etiquetas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL UNIQUE,
  cor TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.etiquetas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todas operações etiquetas" ON public.etiquetas;
CREATE POLICY "Permitir todas operações etiquetas"
  ON public.etiquetas
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 12. TABELA DE RELAÇÃO PEDIDOS-ETIQUETAS
-- ==============================================================
CREATE TABLE IF NOT EXISTS public.pedidos_etiquetas (
  pedido_id UUID REFERENCES public.pedidos(id) ON DELETE CASCADE,
  etiqueta_id UUID REFERENCES public.etiquetas(id) ON DELETE CASCADE,
  PRIMARY KEY (pedido_id, etiqueta_id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pedidos_etiquetas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todas operações pedidos_etiquetas" ON public.pedidos_etiquetas;
CREATE POLICY "Permitir todas operações pedidos_etiquetas"
  ON public.pedidos_etiquetas
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 13. TABELA DE COMENTÁRIOS DO PEDIDO
-- ==============================================================
CREATE TABLE IF NOT EXISTS public.comentarios_pedido (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id UUID REFERENCES public.pedidos(id) ON DELETE CASCADE NOT NULL,
  usuario_id UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
  comentario TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.comentarios_pedido ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todas operações comentarios" ON public.comentarios_pedido;
CREATE POLICY "Permitir todas operações comentarios"
  ON public.comentarios_pedido
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 14. TABELA DE CONFIGURAÇÕES
-- ==============================================================
CREATE TABLE IF NOT EXISTS public.configuracoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chave TEXT NOT NULL UNIQUE,
  valor JSONB,
  descricao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todas operações config" ON public.configuracoes;
CREATE POLICY "Permitir todas operações config"
  ON public.configuracoes
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ==============================================================
-- FUNÇÕES E TRIGGERS
-- ==============================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers de updated_at
DROP TRIGGER IF EXISTS update_perfis_updated_at ON public.perfis;
CREATE TRIGGER update_perfis_updated_at BEFORE UPDATE ON public.perfis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clientes_updated_at ON public.clientes;
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_categorias_updated_at ON public.categorias;
CREATE TRIGGER update_categorias_updated_at BEFORE UPDATE ON public.categorias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_produtos_updated_at ON public.produtos;
CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pedidos_updated_at ON public.pedidos;
CREATE TRIGGER update_pedidos_updated_at BEFORE UPDATE ON public.pedidos
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

DROP TRIGGER IF EXISTS trigger_gerar_numero_pedido ON public.pedidos;
CREATE TRIGGER trigger_gerar_numero_pedido
  BEFORE INSERT ON public.pedidos
  FOR EACH ROW
  WHEN (NEW.numero_pedido IS NULL)
  EXECUTE FUNCTION gerar_numero_pedido();

-- Função para criar perfil ao registrar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfis (id, nome, usuario)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'usuario', SPLIT_PART(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================
-- ÍNDICES PARA PERFORMANCE
-- ==============================================================
CREATE INDEX IF NOT EXISTS idx_clientes_cpf_cnpj ON public.clientes(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON public.clientes(nome);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON public.produtos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_produtos_codigo ON public.produtos(codigo);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON public.pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_numero ON public.pedidos(numero_pedido);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- ==============================================================
-- DADOS INICIAIS
-- ==============================================================
INSERT INTO public.etiquetas (nome, cor) VALUES
('Urgente', '#ef4444'),
('Prioridade', '#f59e0b'),
('Normal', '#10b981'),
('Concluído', '#6366f1')
ON CONFLICT (nome) DO NOTHING;

-- ==============================================================
-- VERIFICAÇÃO FINAL
-- ==============================================================
SELECT 
  tablename,
  CASE 
    WHEN tablename IN ('perfis', 'user_roles', 'clientes', 'categorias', 'produtos', 
                       'variacoes_produto', 'pedidos', 'itens_pedido', 'etiquetas', 
                       'pedidos_etiquetas', 'comentarios_pedido', 'configuracoes')
    THEN '✓ Criada com sucesso'
    ELSE '⚠ Inesperada'
  END as status
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
