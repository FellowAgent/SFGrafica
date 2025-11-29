-- Adicionar políticas RLS para gerenciar etiquetas
-- Apenas Masters podem criar, atualizar e excluir etiquetas

CREATE POLICY "Masters podem criar etiquetas"
ON public.etiquetas
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'master'::app_role));

CREATE POLICY "Masters podem atualizar etiquetas"
ON public.etiquetas
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'master'::app_role))
WITH CHECK (has_role(auth.uid(), 'master'::app_role));

CREATE POLICY "Masters podem excluir etiquetas"
ON public.etiquetas
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'master'::app_role));