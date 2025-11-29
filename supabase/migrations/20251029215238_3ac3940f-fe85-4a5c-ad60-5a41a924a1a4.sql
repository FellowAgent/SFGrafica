-- Criar enum para tipo de cliente (se não existir)
DO $$ BEGIN
  CREATE TYPE public.tipo_cliente AS ENUM ('Pessoa Física', 'Pessoa Jurídica');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Criar enum para status de pedido (se não existir)
DO $$ BEGIN
  CREATE TYPE public.status_pedido AS ENUM ('Em Produção', 'Pronto', 'Entregue', 'Cancelado', 'Aguardando');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Criar enum para tipo de retirada (se não existir)
DO $$ BEGIN
  CREATE TYPE public.tipo_retirada AS ENUM ('balcao', 'entrega');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Criar enum para unidade de prazo (se não existir)
DO $$ BEGIN
  CREATE TYPE public.unidade_prazo AS ENUM ('imediatamente', 'minutos', 'horas', 'dias', 'semanas');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tabela de perfis de usuários
CREATE TABLE IF NOT EXISTS public.perfis (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- Tabela de roles de usuários
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função para verificar se usuário tem determinada role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
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

-- Tabela de categorias
CREATE TABLE IF NOT EXISTS public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

-- Tabela de clientes
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  tipo tipo_cliente DEFAULT 'Pessoa Física',
  ativo BOOLEAN DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- Tabela de produtos
CREATE TABLE IF NOT EXISTS public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  codigo_barras TEXT,
  categoria_id UUID REFERENCES public.categorias(id),
  descricao TEXT,
  preco DECIMAL(10,2) DEFAULT 0,
  custo DECIMAL(10,2) DEFAULT 0,
  estoque INTEGER DEFAULT 0,
  estoque_minimo INTEGER DEFAULT 0,
  unidade_medida TEXT DEFAULT 'un',
  ativo BOOLEAN DEFAULT true,
  imagem_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

-- Tabela de pedidos
CREATE TABLE IF NOT EXISTS public.pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_pedido TEXT NOT NULL UNIQUE,
  cliente_id UUID REFERENCES public.clientes(id),
  vendedor_id UUID REFERENCES auth.users(id),
  status status_pedido DEFAULT 'Aguardando',
  tipo_retirada tipo_retirada DEFAULT 'balcao',
  prazo_entrega TEXT,
  unidade_prazo unidade_prazo,
  codigo_retirada TEXT,
  observacoes TEXT,
  total DECIMAL(10,2) DEFAULT 0,
  desconto_total DECIMAL(10,2) DEFAULT 0,
  valor_final DECIMAL(10,2) DEFAULT 0,
  meio_pagamento TEXT,
  gerar_nf BOOLEAN DEFAULT false,
  data_entrega TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para perfis
DROP POLICY IF EXISTS "Usuários autenticados podem ver perfis" ON public.perfis;
CREATE POLICY "Usuários autenticados podem ver perfis"
  ON public.perfis FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuários podem atualizar próprio perfil" ON public.perfis;
CREATE POLICY "Usuários podem atualizar próprio perfil"
  ON public.perfis FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Sistema pode inserir perfis" ON public.perfis;
CREATE POLICY "Sistema pode inserir perfis"
  ON public.perfis FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Políticas RLS para user_roles
DROP POLICY IF EXISTS "Usuários autenticados podem ver roles" ON public.user_roles;
CREATE POLICY "Usuários autenticados podem ver roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Masters podem gerenciar roles" ON public.user_roles;
CREATE POLICY "Masters podem gerenciar roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'master'))
  WITH CHECK (public.has_role(auth.uid(), 'master'));

DROP POLICY IF EXISTS "Sistema pode inserir primeira role" ON public.user_roles;
CREATE POLICY "Sistema pode inserir primeira role"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Políticas RLS para categorias
DROP POLICY IF EXISTS "Usuários autenticados podem ver categorias" ON public.categorias;
CREATE POLICY "Usuários autenticados podem ver categorias"
  ON public.categorias FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem gerenciar categorias" ON public.categorias;
CREATE POLICY "Usuários autenticados podem gerenciar categorias"
  ON public.categorias FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Políticas RLS para clientes
DROP POLICY IF EXISTS "Usuários autenticados podem ver clientes" ON public.clientes;
CREATE POLICY "Usuários autenticados podem ver clientes"
  ON public.clientes FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem gerenciar clientes" ON public.clientes;
CREATE POLICY "Usuários autenticados podem gerenciar clientes"
  ON public.clientes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Políticas RLS para produtos
DROP POLICY IF EXISTS "Usuários autenticados podem ver produtos" ON public.produtos;
CREATE POLICY "Usuários autenticados podem ver produtos"
  ON public.produtos FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem gerenciar produtos" ON public.produtos;
CREATE POLICY "Usuários autenticados podem gerenciar produtos"
  ON public.produtos FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Políticas RLS para pedidos
DROP POLICY IF EXISTS "Usuários autenticados podem ver pedidos" ON public.pedidos;
CREATE POLICY "Usuários autenticados podem ver pedidos"
  ON public.pedidos FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem gerenciar pedidos" ON public.pedidos;
CREATE POLICY "Usuários autenticados podem gerenciar pedidos"
  ON public.pedidos FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_perfis_updated_at ON public.perfis;
CREATE TRIGGER update_perfis_updated_at BEFORE UPDATE ON public.perfis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_categorias_updated_at ON public.categorias;
CREATE TRIGGER update_categorias_updated_at BEFORE UPDATE ON public.categorias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_clientes_updated_at ON public.clientes;
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_produtos_updated_at ON public.produtos;
CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_pedidos_updated_at ON public.pedidos;
CREATE TRIGGER update_pedidos_updated_at BEFORE UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();