-- Remover políticas antigas do bucket avatars
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload de avatares" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios avatares" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem deletar seus próprios avatares" ON storage.objects;

-- Criar políticas mais permissivas para masters
CREATE POLICY "Masters podem fazer upload de qualquer avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (
    -- Usuário pode fazer upload do próprio avatar
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Masters podem fazer upload de avatares de qualquer usuário
    has_role(auth.uid(), 'master'::app_role)
  )
);

CREATE POLICY "Masters podem atualizar qualquer avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (
    -- Usuário pode atualizar o próprio avatar
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Masters podem atualizar avatares de qualquer usuário
    has_role(auth.uid(), 'master'::app_role)
  )
);

CREATE POLICY "Masters podem deletar qualquer avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (
    -- Usuário pode deletar o próprio avatar
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Masters podem deletar avatares de qualquer usuário
    has_role(auth.uid(), 'master'::app_role)
  )
);