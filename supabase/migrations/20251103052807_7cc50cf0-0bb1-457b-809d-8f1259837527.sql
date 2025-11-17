-- Alterar a coluna status de ENUM para TEXT para permitir status dinâmicos
ALTER TABLE pedidos 
ALTER COLUMN status TYPE text USING status::text;

-- Remover o tipo ENUM antigo se não estiver mais em uso
DROP TYPE IF EXISTS status_pedido CASCADE;