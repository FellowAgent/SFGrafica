-- Criar enum para tipos de ação
CREATE TYPE public.audit_action AS ENUM ('INSERT', 'UPDATE', 'DELETE');

-- Criar tabela de logs de auditoria
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela TEXT NOT NULL,
  acao public.audit_action NOT NULL,
  registro_id UUID NOT NULL,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  usuario_nome TEXT,
  dados_anteriores JSONB,
  dados_novos JSONB,
  campos_alterados TEXT[],
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar índices para melhorar performance
CREATE INDEX idx_audit_logs_tabela ON public.audit_logs(tabela);
CREATE INDEX idx_audit_logs_registro_id ON public.audit_logs(registro_id);
CREATE INDEX idx_audit_logs_usuario_id ON public.audit_logs(usuario_id);
CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_acao ON public.audit_logs(acao);

-- Habilitar RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy para Masters verem todos os logs
CREATE POLICY "Masters podem ver todos os logs de auditoria"
ON public.audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'master'::app_role));

-- Policy para outros usuários verem apenas seus próprios logs
CREATE POLICY "Usuários podem ver seus próprios logs"
ON public.audit_logs
FOR SELECT
USING (auth.uid() = usuario_id);

-- Função genérica para criar log de auditoria
CREATE OR REPLACE FUNCTION public.audit_log_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  usuario_nome_var TEXT;
  campos_alterados_var TEXT[];
  key TEXT;
BEGIN
  -- Buscar nome do usuário
  SELECT nome INTO usuario_nome_var
  FROM public.perfis
  WHERE id = auth.uid();

  -- Se for UPDATE, identificar campos alterados
  IF TG_OP = 'UPDATE' THEN
    campos_alterados_var := ARRAY[]::TEXT[];
    FOR key IN SELECT jsonb_object_keys(to_jsonb(NEW))
    LOOP
      IF to_jsonb(OLD)->>key IS DISTINCT FROM to_jsonb(NEW)->>key THEN
        campos_alterados_var := array_append(campos_alterados_var, key);
      END IF;
    END LOOP;
  END IF;

  -- Inserir log de auditoria
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (
      tabela,
      acao,
      registro_id,
      usuario_id,
      usuario_nome,
      dados_anteriores,
      dados_novos,
      campos_alterados
    ) VALUES (
      TG_TABLE_NAME,
      'DELETE'::audit_action,
      OLD.id,
      auth.uid(),
      usuario_nome_var,
      to_jsonb(OLD),
      NULL,
      NULL
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (
      tabela,
      acao,
      registro_id,
      usuario_id,
      usuario_nome,
      dados_anteriores,
      dados_novos,
      campos_alterados
    ) VALUES (
      TG_TABLE_NAME,
      'UPDATE'::audit_action,
      NEW.id,
      auth.uid(),
      usuario_nome_var,
      to_jsonb(OLD),
      to_jsonb(NEW),
      campos_alterados_var
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      tabela,
      acao,
      registro_id,
      usuario_id,
      usuario_nome,
      dados_anteriores,
      dados_novos,
      campos_alterados
    ) VALUES (
      TG_TABLE_NAME,
      'INSERT'::audit_action,
      NEW.id,
      auth.uid(),
      usuario_nome_var,
      NULL,
      to_jsonb(NEW),
      NULL
    );
    RETURN NEW;
  END IF;
END;
$$;

-- Criar triggers para tabela perfis (usuários)
CREATE TRIGGER audit_perfis_insert
AFTER INSERT ON public.perfis
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_perfis_update
AFTER UPDATE ON public.perfis
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_perfis_delete
AFTER DELETE ON public.perfis
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- Criar triggers para tabela clientes
CREATE TRIGGER audit_clientes_insert
AFTER INSERT ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_clientes_update
AFTER UPDATE ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_clientes_delete
AFTER DELETE ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- Criar triggers para tabela pedidos
CREATE TRIGGER audit_pedidos_insert
AFTER INSERT ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_pedidos_update
AFTER UPDATE ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_pedidos_delete
AFTER DELETE ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- Criar triggers para tabela user_roles (mudanças de permissão)
CREATE TRIGGER audit_user_roles_insert
AFTER INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_user_roles_update
AFTER UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_user_roles_delete
AFTER DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();