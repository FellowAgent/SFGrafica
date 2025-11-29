-- ================================================================
-- MIGRAÇÃO: Corrigir tabela perfis e adicionar sistema de roles
-- Execute este script no SQL Editor do Supabase:
-- https://supabase.myfellow.cloud/project/_/sql
-- ================================================================

-- 1. ADICIONAR COLUNA USUARIO NA TABELA PERFIS
-- ================================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'perfis' 
    AND column_name = 'usuario'
  ) THEN
    ALTER TABLE public.perfis ADD COLUMN usuario TEXT UNIQUE;
  END IF;
END $$;

-- 2. ADICIONAR COLUNA ATIVO NA TABELA PERFIS
-- ================================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'perfis' 
    AND column_name = 'ativo'
  ) THEN
    ALTER TABLE public.perfis ADD COLUMN ativo BOOLEAN DEFAULT true NOT NULL;
  END IF;
END $$;

-- 3. CRIAR ENUM PARA ROLES (SE NÃO EXISTIR)
-- ================================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('master', 'financeiro', 'vendedor');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 4. CRIAR TABELA USER_ROLES (SE NÃO EXISTIR)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- 5. HABILITAR RLS NA TABELA USER_ROLES
-- ================================================================
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todas operações roles" ON public.user_roles;
CREATE POLICY "Permitir todas operações roles"
  ON public.user_roles
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6. CRIAR FUNÇÃO DE SEGURANÇA PARA VERIFICAR ROLES
-- ================================================================
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

-- 7. ATUALIZAR POLÍTICAS RLS DA TABELA PERFIS
-- ================================================================
DROP POLICY IF EXISTS "Usuários podem ver próprio perfil" ON public.perfis;
DROP POLICY IF EXISTS "Usuários podem atualizar próprio perfil" ON public.perfis;
DROP POLICY IF EXISTS "Permitir todas operações perfis" ON public.perfis;

CREATE POLICY "Permitir todas operações perfis"
  ON public.perfis
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 8. ATUALIZAR TRIGGER PARA INCLUIR CAMPO USUARIO
-- ================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfis (id, nome, usuario, email, ativo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'usuario', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. CRIAR ÍNDICE PARA PERFORMANCE
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_perfis_usuario ON public.perfis(usuario);

-- 10. ATUALIZAR PERFIS EXISTENTES COM CAMPO USUARIO
-- ================================================================
UPDATE public.perfis 
SET usuario = SPLIT_PART(email, '@', 1)
WHERE usuario IS NULL;

-- ================================================================
-- VERIFICAÇÃO FINAL
-- ================================================================
SELECT 
  'perfis' as tabela,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'perfis'
ORDER BY ordinal_position;
