-- Adicionar coluna avatar_url na tabela clientes
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Criar bucket para avatares de clientes (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('clientes-avatars', 'clientes-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas RLS para o bucket de avatares de clientes
CREATE POLICY "Usuários autenticados podem ver avatares de clientes"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'clientes-avatars');

CREATE POLICY "Usuários autenticados podem fazer upload de avatares de clientes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'clientes-avatars');

CREATE POLICY "Usuários autenticados podem atualizar avatares de clientes"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'clientes-avatars')
WITH CHECK (bucket_id = 'clientes-avatars');

CREATE POLICY "Usuários autenticados podem deletar avatares de clientes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'clientes-avatars');

-- Criar trigger de auditoria para a tabela clientes (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'audit_clientes_trigger'
  ) THEN
    CREATE TRIGGER audit_clientes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.clientes
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();
  END IF;
END $$;