-- Criar bucket para imagens de produtos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'produtos-imagens',
  'produtos-imagens',
  true,
  5242880, -- 5MB por arquivo
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas RLS para o bucket produtos-imagens
-- Método alternativo: usar DROP IF EXISTS e CREATE

-- Remover políticas existentes (seguro)
DROP POLICY IF EXISTS "Imagens de produtos são publicamente acessíveis" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload de imagens de produtos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar imagens de produtos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar imagens de produtos" ON storage.objects;

-- Criar políticas
CREATE POLICY "Imagens de produtos são publicamente acessíveis"
ON storage.objects FOR SELECT
USING (bucket_id = 'produtos-imagens');

CREATE POLICY "Usuários autenticados podem fazer upload de imagens de produtos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'produtos-imagens');

CREATE POLICY "Usuários autenticados podem atualizar imagens de produtos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'produtos-imagens');

CREATE POLICY "Usuários autenticados podem deletar imagens de produtos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'produtos-imagens');

-- Garantir que o campo imagens existe (já existe, mas por segurança)
ALTER TABLE public.produtos 
ADD COLUMN IF NOT EXISTS imagens TEXT[];

-- Migrar dados existentes: mover imagem_url para array imagens
UPDATE public.produtos
SET imagens = ARRAY[imagem_url]
WHERE imagem_url IS NOT NULL
  AND imagem_url != ''
  AND (imagens IS NULL OR array_length(imagens, 1) IS NULL);