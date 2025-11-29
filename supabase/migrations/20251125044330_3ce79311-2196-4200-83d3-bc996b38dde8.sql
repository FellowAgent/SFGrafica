-- Atualizar política de exclusão de templates para permitir usuários autenticados
DROP POLICY IF EXISTS "Masters podem excluir templates" ON templates_variacoes;

CREATE POLICY "Usuários autenticados podem excluir templates"
ON templates_variacoes
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);