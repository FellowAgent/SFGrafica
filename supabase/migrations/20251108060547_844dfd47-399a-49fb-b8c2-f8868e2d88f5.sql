-- Criar tabela de configurações de alertas
CREATE TABLE public.alert_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo_alerta TEXT NOT NULL, -- 'exclusoes_multiplas', 'mudancas_permissoes', 'atividade_suspeita', 'customizado'
  tabela TEXT, -- Tabela a monitorar
  acao TEXT, -- INSERT, UPDATE, DELETE ou NULL para todas
  threshold_count INTEGER, -- Número de ações para disparar alerta
  threshold_minutes INTEGER, -- Período em minutos
  usuarios_monitorados UUID[], -- Array de IDs de usuários a monitorar (NULL = todos)
  ativo BOOLEAN DEFAULT true,
  severidade TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  notificar_usuarios UUID[], -- Array de IDs de usuários que devem ser notificados
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de histórico de alertas disparados
CREATE TABLE public.alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_config_id UUID REFERENCES public.alert_configs(id) ON DELETE CASCADE,
  disparado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  detalhes JSONB NOT NULL,
  contagem_acoes INTEGER NOT NULL,
  periodo_minutos INTEGER NOT NULL,
  usuarios_envolvidos JSONB,
  resolvido BOOLEAN DEFAULT false,
  resolvido_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolvido_em TIMESTAMP WITH TIME ZONE,
  notas TEXT
);

-- Criar índices
CREATE INDEX idx_alert_configs_ativo ON public.alert_configs(ativo);
CREATE INDEX idx_alert_configs_tipo ON public.alert_configs(tipo_alerta);
CREATE INDEX idx_alert_history_config ON public.alert_history(alert_config_id);
CREATE INDEX idx_alert_history_disparado ON public.alert_history(disparado_em DESC);
CREATE INDEX idx_alert_history_resolvido ON public.alert_history(resolvido);

-- Habilitar RLS
ALTER TABLE public.alert_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_history ENABLE ROW LEVEL SECURITY;

-- Policies para alert_configs
CREATE POLICY "Masters podem gerenciar configurações de alertas"
ON public.alert_configs
FOR ALL
USING (has_role(auth.uid(), 'master'::app_role))
WITH CHECK (has_role(auth.uid(), 'master'::app_role));

CREATE POLICY "Usuários autenticados podem ver alertas"
ON public.alert_configs
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Policies para alert_history
CREATE POLICY "Masters podem ver todo histórico de alertas"
ON public.alert_history
FOR SELECT
USING (has_role(auth.uid(), 'master'::app_role));

CREATE POLICY "Masters podem atualizar alertas"
ON public.alert_history
FOR UPDATE
USING (has_role(auth.uid(), 'master'::app_role))
WITH CHECK (has_role(auth.uid(), 'master'::app_role));

-- Inserir alguns alertas padrão
INSERT INTO public.alert_configs (nome, descricao, tipo_alerta, tabela, acao, threshold_count, threshold_minutes, severidade, ativo) VALUES
('Múltiplas Exclusões de Pedidos', 'Alerta quando mais de 5 pedidos são excluídos em 10 minutos', 'exclusoes_multiplas', 'pedidos', 'DELETE', 5, 10, 'high', true),
('Mudanças em Permissões', 'Alerta quando permissões de usuário são alteradas', 'mudancas_permissoes', 'user_roles', NULL, 1, 1, 'critical', true),
('Exclusões em Massa de Clientes', 'Alerta quando mais de 10 clientes são excluídos em 30 minutos', 'exclusoes_multiplas', 'clientes', 'DELETE', 10, 30, 'high', true),
('Atividade Suspeita - Múltiplas Alterações', 'Alerta quando um usuário faz mais de 50 alterações em 5 minutos', 'atividade_suspeita', NULL, 'UPDATE', 50, 5, 'medium', true);

-- Função para verificar alertas (chamada por trigger)
CREATE OR REPLACE FUNCTION public.check_alert_conditions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alert_config RECORD;
  log_count INTEGER;
  data_limite TIMESTAMP WITH TIME ZONE;
  usuarios_envolvidos JSONB;
BEGIN
  -- Buscar configurações de alertas ativos para esta tabela e ação
  FOR alert_config IN 
    SELECT * FROM public.alert_configs 
    WHERE ativo = true 
    AND (tabela IS NULL OR tabela = TG_TABLE_NAME)
    AND (acao IS NULL OR acao = TG_OP)
  LOOP
    -- Calcular data limite baseada no período
    data_limite := now() - (alert_config.threshold_minutes || ' minutes')::interval;
    
    -- Contar logs no período
    SELECT COUNT(*), jsonb_agg(DISTINCT jsonb_build_object(
      'usuario_id', usuario_id,
      'usuario_nome', usuario_nome
    ))
    INTO log_count, usuarios_envolvidos
    FROM public.audit_logs
    WHERE tabela = TG_TABLE_NAME
    AND (alert_config.acao IS NULL OR acao::text = alert_config.acao)
    AND timestamp >= data_limite
    AND (alert_config.usuarios_monitorados IS NULL OR usuario_id = ANY(alert_config.usuarios_monitorados));
    
    -- Verificar se threshold foi atingido
    IF log_count >= alert_config.threshold_count THEN
      -- Verificar se já existe alerta não resolvido recente (últimos 30 min)
      IF NOT EXISTS (
        SELECT 1 FROM public.alert_history
        WHERE alert_config_id = alert_config.id
        AND resolvido = false
        AND disparado_em > now() - interval '30 minutes'
      ) THEN
        -- Inserir novo alerta
        INSERT INTO public.alert_history (
          alert_config_id,
          detalhes,
          contagem_acoes,
          periodo_minutos,
          usuarios_envolvidos
        ) VALUES (
          alert_config.id,
          jsonb_build_object(
            'tabela', TG_TABLE_NAME,
            'acao', TG_OP,
            'threshold_atingido', log_count,
            'threshold_configurado', alert_config.threshold_count,
            'severidade', alert_config.severidade,
            'nome_alerta', alert_config.nome
          ),
          log_count,
          alert_config.threshold_minutes,
          usuarios_envolvidos
        );
        
        -- Log para debug
        RAISE NOTICE 'Alerta disparado: % - % ações em % minutos', alert_config.nome, log_count, alert_config.threshold_minutes;
      END IF;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Criar triggers nas tabelas de auditoria principais
CREATE TRIGGER check_alerts_after_audit
AFTER INSERT ON public.audit_logs
FOR EACH ROW
EXECUTE FUNCTION public.check_alert_conditions();