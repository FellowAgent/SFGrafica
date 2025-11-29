-- Adicionar coluna para preferências de variações no perfil do usuário
ALTER TABLE perfis 
ADD COLUMN IF NOT EXISTS preferencias_variacoes JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN perfis.preferencias_variacoes IS 'Preferências do usuário para a tela de variações (viewMode, ordenacao, etc.)';
