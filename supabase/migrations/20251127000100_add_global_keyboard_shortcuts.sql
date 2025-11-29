-- Criar tabela para configurações globais do sistema
CREATE TABLE IF NOT EXISTS public.configuracoes_globais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chave TEXT UNIQUE NOT NULL,
    valor JSONB NOT NULL,
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.configuracoes_globais ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
DROP POLICY IF EXISTS "Todos podem ler configurações globais" ON public.configuracoes_globais;
CREATE POLICY "Todos podem ler configurações globais"
    ON public.configuracoes_globais
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Apenas MASTER pode atualizar configurações globais" ON public.configuracoes_globais;
CREATE POLICY "Apenas MASTER pode atualizar configurações globais"
    ON public.configuracoes_globais
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'master'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'master'
        )
    );

-- Inserir configuração padrão de atalhos
INSERT INTO public.configuracoes_globais (chave, valor, descricao)
VALUES (
    'keyboard_shortcuts',
    '{"toggleSettingsGear": {"ctrl": true, "shift": true, "alt": false, "key": "Z"}}'::jsonb,
    'Atalhos de teclado globais do sistema'
)
ON CONFLICT (chave) DO NOTHING;

-- Índice para otimizar queries
CREATE INDEX IF NOT EXISTS idx_configuracoes_globais_chave ON public.configuracoes_globais(chave);

-- Comentários
COMMENT ON TABLE public.configuracoes_globais IS 'Armazena configurações globais do sistema';
COMMENT ON COLUMN public.configuracoes_globais.chave IS 'Identificador único da configuração';
COMMENT ON COLUMN public.configuracoes_globais.valor IS 'Valor da configuração em formato JSONB';

