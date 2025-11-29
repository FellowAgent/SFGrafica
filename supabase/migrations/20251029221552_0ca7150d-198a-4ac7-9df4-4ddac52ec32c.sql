-- ====================================
-- ENUMS
-- ====================================

-- Criar ENUM para roles de usuários
DO $$ BEGIN
    CREATE TYPE app_role AS ENUM ('master', 'financeiro', 'vendedor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Criar ENUM para tipo de cliente
DO $$ BEGIN
    CREATE TYPE tipo_cliente AS ENUM ('Pessoa Física', 'Pessoa Jurídica');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Criar ENUM para status do pedido
DO $$ BEGIN
    CREATE TYPE status_pedido AS ENUM ('Aguardando', 'Em Produção', 'Pronto', 'Entregue', 'Cancelado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Criar ENUM para tipo de retirada
DO $$ BEGIN
    CREATE TYPE tipo_retirada AS ENUM ('balcao', 'entrega');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Criar ENUM para unidade de prazo
DO $$ BEGIN
    CREATE TYPE unidade_prazo AS ENUM ('imediatamente', 'minutos', 'horas', 'dias', 'semanas');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ====================================
-- TABELA: user_roles
-- ====================================

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies para user_roles
DROP POLICY IF EXISTS "Masters podem gerenciar roles" ON public.user_roles;
CREATE POLICY "Masters podem gerenciar roles"
    ON public.user_roles
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'master'))
    WITH CHECK (public.has_role(auth.uid(), 'master'));

DROP POLICY IF EXISTS "Usuários autenticados podem ver roles" ON public.user_roles;
CREATE POLICY "Usuários autenticados podem ver roles"
    ON public.user_roles
    FOR SELECT
    TO authenticated
    USING (true);

-- ====================================
-- TABELA: perfis
-- ====================================

CREATE TABLE IF NOT EXISTS public.perfis (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    email TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- RLS Policies para perfis
DROP POLICY IF EXISTS "Usuários autenticados podem ver perfis" ON public.perfis;
CREATE POLICY "Usuários autenticados podem ver perfis"
    ON public.perfis
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Usuários podem atualizar próprio perfil" ON public.perfis;
CREATE POLICY "Usuários podem atualizar próprio perfil"
    ON public.perfis
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Sistema pode inserir perfis" ON public.perfis;
CREATE POLICY "Sistema pode inserir perfis"
    ON public.perfis
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ====================================
-- FUNCTION: has_role
-- ====================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
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

-- ====================================
-- TABELA: clientes
-- ====================================

CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    cpf_cnpj TEXT NOT NULL,
    tipo tipo_cliente DEFAULT 'Pessoa Física',
    celular TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    endereco TEXT,
    numero TEXT,
    complemento TEXT,
    bairro TEXT,
    cidade TEXT,
    estado TEXT,
    cep TEXT,
    observacoes TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- RLS Policies para clientes
DROP POLICY IF EXISTS "Masters podem ver todos os clientes" ON public.clientes;
CREATE POLICY "Masters podem ver todos os clientes"
    ON public.clientes
    FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), 'master'));

DROP POLICY IF EXISTS "Masters podem criar clientes" ON public.clientes;
CREATE POLICY "Masters podem criar clientes"
    ON public.clientes
    FOR INSERT
    TO authenticated
    WITH CHECK (public.has_role(auth.uid(), 'master'));

DROP POLICY IF EXISTS "Masters podem atualizar clientes" ON public.clientes;
CREATE POLICY "Masters podem atualizar clientes"
    ON public.clientes
    FOR UPDATE
    TO authenticated
    USING (public.has_role(auth.uid(), 'master'))
    WITH CHECK (public.has_role(auth.uid(), 'master'));

DROP POLICY IF EXISTS "Masters podem excluir clientes" ON public.clientes;
CREATE POLICY "Masters podem excluir clientes"
    ON public.clientes
    FOR DELETE
    TO authenticated
    USING (public.has_role(auth.uid(), 'master'));

-- ====================================
-- TABELA: categorias
-- ====================================

CREATE TABLE IF NOT EXISTS public.categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

-- RLS Policies para categorias
DROP POLICY IF EXISTS "Usuários autenticados podem ver categorias" ON public.categorias;
CREATE POLICY "Usuários autenticados podem ver categorias"
    ON public.categorias
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem gerenciar categorias" ON public.categorias;
CREATE POLICY "Usuários autenticados podem gerenciar categorias"
    ON public.categorias
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ====================================
-- TABELA: produtos
-- ====================================

CREATE TABLE IF NOT EXISTS public.produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    descricao TEXT,
    categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
    preco NUMERIC DEFAULT 0,
    custo NUMERIC DEFAULT 0,
    estoque INTEGER DEFAULT 0,
    estoque_minimo INTEGER DEFAULT 0,
    unidade_medida TEXT DEFAULT 'un',
    codigo_barras TEXT,
    imagem_url TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

-- RLS Policies para produtos
DROP POLICY IF EXISTS "Usuários autenticados podem ver produtos" ON public.produtos;
CREATE POLICY "Usuários autenticados podem ver produtos"
    ON public.produtos
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem gerenciar produtos" ON public.produtos;
CREATE POLICY "Usuários autenticados podem gerenciar produtos"
    ON public.produtos
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ====================================
-- TABELA: variacoes_produto
-- ====================================

CREATE TABLE IF NOT EXISTS public.variacoes_produto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    valor_adicional NUMERIC DEFAULT 0,
    estoque INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.variacoes_produto ENABLE ROW LEVEL SECURITY;

-- RLS Policies para variacoes_produto
DROP POLICY IF EXISTS "Usuários autenticados podem ver variações" ON public.variacoes_produto;
CREATE POLICY "Usuários autenticados podem ver variações"
    ON public.variacoes_produto
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem gerenciar variações" ON public.variacoes_produto;
CREATE POLICY "Usuários autenticados podem gerenciar variações"
    ON public.variacoes_produto
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ====================================
-- TABELA: pedidos
-- ====================================

CREATE TABLE IF NOT EXISTS public.pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_pedido TEXT NOT NULL UNIQUE,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    vendedor_id UUID,
    status status_pedido DEFAULT 'Aguardando',
    tipo_retirada tipo_retirada DEFAULT 'balcao',
    prazo_entrega TEXT,
    unidade_prazo unidade_prazo,
    data_entrega TIMESTAMP WITH TIME ZONE,
    codigo_retirada TEXT,
    meio_pagamento TEXT,
    total NUMERIC DEFAULT 0,
    desconto_total NUMERIC DEFAULT 0,
    valor_final NUMERIC DEFAULT 0,
    gerar_nf BOOLEAN DEFAULT false,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- RLS Policies para pedidos
DROP POLICY IF EXISTS "Usuários autenticados podem ver pedidos" ON public.pedidos;
CREATE POLICY "Usuários autenticados podem ver pedidos"
    ON public.pedidos
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem gerenciar pedidos" ON public.pedidos;
CREATE POLICY "Usuários autenticados podem gerenciar pedidos"
    ON public.pedidos
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ====================================
-- TABELA: itens_pedido
-- ====================================

CREATE TABLE IF NOT EXISTS public.itens_pedido (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
    variacao_id UUID REFERENCES public.variacoes_produto(id) ON DELETE SET NULL,
    quantidade INTEGER NOT NULL,
    preco_unitario NUMERIC NOT NULL,
    desconto NUMERIC DEFAULT 0,
    subtotal NUMERIC NOT NULL,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.itens_pedido ENABLE ROW LEVEL SECURITY;

-- RLS Policies para itens_pedido
DROP POLICY IF EXISTS "Usuários autenticados podem ver itens de pedido" ON public.itens_pedido;
CREATE POLICY "Usuários autenticados podem ver itens de pedido"
    ON public.itens_pedido
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem gerenciar itens de pedido" ON public.itens_pedido;
CREATE POLICY "Usuários autenticados podem gerenciar itens de pedido"
    ON public.itens_pedido
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ====================================
-- TABELA: etiquetas
-- ====================================

CREATE TABLE IF NOT EXISTS public.etiquetas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    cor TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.etiquetas ENABLE ROW LEVEL SECURITY;

-- RLS Policies para etiquetas
DROP POLICY IF EXISTS "Usuários autenticados podem ver etiquetas" ON public.etiquetas;
CREATE POLICY "Usuários autenticados podem ver etiquetas"
    ON public.etiquetas
    FOR SELECT
    TO authenticated
    USING (true);

-- ====================================
-- TABELA: pedidos_etiquetas
-- ====================================

CREATE TABLE IF NOT EXISTS public.pedidos_etiquetas (
    pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
    etiqueta_id UUID NOT NULL REFERENCES public.etiquetas(id) ON DELETE CASCADE,
    PRIMARY KEY (pedido_id, etiqueta_id)
);

ALTER TABLE public.pedidos_etiquetas ENABLE ROW LEVEL SECURITY;

-- RLS Policies para pedidos_etiquetas
DROP POLICY IF EXISTS "Usuários autenticados podem gerenciar etiquetas de pedidos" ON public.pedidos_etiquetas;
CREATE POLICY "Usuários autenticados podem gerenciar etiquetas de pedidos"
    ON public.pedidos_etiquetas
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ====================================
-- TABELA: comentarios_pedido
-- ====================================

CREATE TABLE IF NOT EXISTS public.comentarios_pedido (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    comentario TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.comentarios_pedido ENABLE ROW LEVEL SECURITY;

-- RLS Policies para comentarios_pedido
DROP POLICY IF EXISTS "Usuários autenticados podem ver comentários" ON public.comentarios_pedido;
CREATE POLICY "Usuários autenticados podem ver comentários"
    ON public.comentarios_pedido
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem criar comentários" ON public.comentarios_pedido;
CREATE POLICY "Usuários autenticados podem criar comentários"
    ON public.comentarios_pedido
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ====================================
-- TABELA: configuracoes
-- ====================================

CREATE TABLE IF NOT EXISTS public.configuracoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chave TEXT NOT NULL UNIQUE,
    valor TEXT,
    tipo TEXT,
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

-- RLS Policies para configuracoes
DROP POLICY IF EXISTS "Usuários autenticados podem ver configurações" ON public.configuracoes;
CREATE POLICY "Usuários autenticados podem ver configurações"
    ON public.configuracoes
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Masters podem gerenciar configurações" ON public.configuracoes;
CREATE POLICY "Masters podem gerenciar configurações"
    ON public.configuracoes
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'master'))
    WITH CHECK (public.has_role(auth.uid(), 'master'));

-- ====================================
-- FUNCTIONS E TRIGGERS
-- ====================================

-- Function para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_perfis_updated_at ON public.perfis;
CREATE TRIGGER update_perfis_updated_at
    BEFORE UPDATE ON public.perfis
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_clientes_updated_at ON public.clientes;
CREATE TRIGGER update_clientes_updated_at
    BEFORE UPDATE ON public.clientes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_categorias_updated_at ON public.categorias;
CREATE TRIGGER update_categorias_updated_at
    BEFORE UPDATE ON public.categorias
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_produtos_updated_at ON public.produtos;
CREATE TRIGGER update_produtos_updated_at
    BEFORE UPDATE ON public.produtos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_variacoes_updated_at ON public.variacoes_produto;
CREATE TRIGGER update_variacoes_updated_at
    BEFORE UPDATE ON public.variacoes_produto
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_pedidos_updated_at ON public.pedidos;
CREATE TRIGGER update_pedidos_updated_at
    BEFORE UPDATE ON public.pedidos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_configuracoes_updated_at ON public.configuracoes;
CREATE TRIGGER update_configuracoes_updated_at
    BEFORE UPDATE ON public.configuracoes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function para gerar número de pedido
CREATE OR REPLACE FUNCTION public.gerar_numero_pedido()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    proximo_numero INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_pedido FROM '[0-9]+') AS INTEGER)), 0) + 1
    INTO proximo_numero
    FROM public.pedidos;
    
    NEW.numero_pedido := 'PED-' || LPAD(proximo_numero::TEXT, 6, '0');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_gerar_numero_pedido ON public.pedidos;
CREATE TRIGGER trigger_gerar_numero_pedido
    BEFORE INSERT ON public.pedidos
    FOR EACH ROW
    WHEN (NEW.numero_pedido IS NULL)
    EXECUTE FUNCTION public.gerar_numero_pedido();

-- Function para calcular total do pedido
CREATE OR REPLACE FUNCTION public.calcular_total_pedido()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.pedidos
    SET 
        total = (
            SELECT COALESCE(SUM(subtotal), 0)
            FROM public.itens_pedido
            WHERE pedido_id = NEW.pedido_id
        ),
        desconto_total = (
            SELECT COALESCE(SUM(desconto * quantidade), 0)
            FROM public.itens_pedido
            WHERE pedido_id = NEW.pedido_id
        )
    WHERE id = NEW.pedido_id;
    
    UPDATE public.pedidos
    SET valor_final = total - desconto_total
    WHERE id = NEW.pedido_id;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_calcular_total ON public.itens_pedido;
CREATE TRIGGER trigger_calcular_total
    AFTER INSERT OR UPDATE OR DELETE ON public.itens_pedido
    FOR EACH ROW
    EXECUTE FUNCTION public.calcular_total_pedido();

-- Function para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.perfis (id, nome, username, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
        NEW.email
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ====================================
-- INDEXES
-- ====================================

CREATE INDEX IF NOT EXISTS idx_clientes_cpf_cnpj ON public.clientes(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON public.clientes(nome);
CREATE INDEX IF NOT EXISTS idx_produtos_nome ON public.produtos(nome);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON public.produtos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON public.pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON public.pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_numero ON public.pedidos(numero_pedido);
CREATE INDEX IF NOT EXISTS idx_itens_pedido_pedido ON public.itens_pedido(pedido_id);
CREATE INDEX IF NOT EXISTS idx_itens_pedido_produto ON public.itens_pedido(produto_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_perfis_username ON public.perfis(username);

-- ====================================
-- DADOS INICIAIS
-- ====================================

INSERT INTO public.etiquetas (nome, cor) VALUES
    ('Urgente', '#ef4444'),
    ('Prioridade', '#f97316'),
    ('Normal', '#3b82f6'),
    ('Concluído', '#22c55e')
ON CONFLICT (nome) DO NOTHING;