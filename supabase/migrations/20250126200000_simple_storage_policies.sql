-- Migration SIMPLES para políticas RLS do bucket produtos-imagens
-- Execute esta se as outras migrations falharem
-- Versão ultra-simplificada e garantidamente compatível

-- Simplesmente tentar executar os comandos básicos
-- Se já existirem, serão ignorados ou substituídos

-- Política 1: Acesso público de leitura
DROP POLICY IF EXISTS "Imagens de produtos são publicamente acessíveis" ON storage.objects;
CREATE POLICY "Imagens de produtos são publicamente acessíveis"
ON storage.objects FOR SELECT
USING (bucket_id = 'produtos-imagens');

-- Política 2: Upload para usuários autenticados
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload de imagens de produtos" ON storage.objects;
CREATE POLICY "Usuários autenticados podem fazer upload de imagens de produtos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'produtos-imagens');

-- Política 3: Atualização para usuários autenticados
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar imagens de produtos" ON storage.objects;
CREATE POLICY "Usuários autenticados podem atualizar imagens de produtos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'produtos-imagens');

-- Política 4: Exclusão para usuários autenticados
DROP POLICY IF EXISTS "Usuários autenticados podem deletar imagens de produtos" ON storage.objects;
CREATE POLICY "Usuários autenticados podem deletar imagens de produtos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'produtos-imagens');
