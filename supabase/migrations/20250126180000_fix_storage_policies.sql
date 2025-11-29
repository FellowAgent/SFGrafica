-- Migration alternativa para corrigir políticas RLS do bucket produtos-imagens
-- Execute esta se a migration principal falhar
-- Esta versão usa apenas comandos PostgreSQL nativos

-- Verificar se o bucket existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'produtos-imagens'
    ) THEN
        RAISE EXCEPTION 'Bucket produtos-imagens não existe. Crie o bucket primeiro.';
    END IF;
END $$;

-- Abordagem mais simples: tentar remover e recriar políticas uma por vez
-- Se alguma já existir, será ignorada

DO $$
BEGIN
    -- Remover política de SELECT se existir
    BEGIN
        DROP POLICY IF EXISTS "Imagens de produtos são publicamente acessíveis" ON storage.objects;
    EXCEPTION WHEN undefined_object THEN
        NULL; -- Ignorar se não existir
    END;

    -- Criar política de SELECT
    BEGIN
        CREATE POLICY "Imagens de produtos são publicamente acessíveis"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'produtos-imagens');
    EXCEPTION WHEN duplicate_object THEN
        NULL; -- Ignorar se já existir
    END;
END $$;

DO $$
BEGIN
    -- Remover política de INSERT se existir
    BEGIN
        DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload de imagens de produtos" ON storage.objects;
    EXCEPTION WHEN undefined_object THEN
        NULL;
    END;

    -- Criar política de INSERT
    BEGIN
        CREATE POLICY "Usuários autenticados podem fazer upload de imagens de produtos"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'produtos-imagens');
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END $$;

DO $$
BEGIN
    -- Remover política de UPDATE se existir
    BEGIN
        DROP POLICY IF EXISTS "Usuários autenticados podem atualizar imagens de produtos" ON storage.objects;
    EXCEPTION WHEN undefined_object THEN
        NULL;
    END;

    -- Criar política de UPDATE
    BEGIN
        CREATE POLICY "Usuários autenticados podem atualizar imagens de produtos"
        ON storage.objects FOR UPDATE
        TO authenticated
        USING (bucket_id = 'produtos-imagens');
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END $$;

DO $$
BEGIN
    -- Remover política de DELETE se existir
    BEGIN
        DROP POLICY IF EXISTS "Usuários autenticados podem deletar imagens de produtos" ON storage.objects;
    EXCEPTION WHEN undefined_object THEN
        NULL;
    END;

    -- Criar política de DELETE
    BEGIN
        CREATE POLICY "Usuários autenticados podem deletar imagens de produtos"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (bucket_id = 'produtos-imagens');
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END $$;
