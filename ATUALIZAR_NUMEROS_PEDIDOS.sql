-- Script para remover zeros à esquerda dos números de pedidos
-- Execute este script no SQL Editor do Supabase

-- Remove zeros à esquerda dos números de pedidos
UPDATE pedidos 
SET numero_pedido = LTRIM(numero_pedido, '0')
WHERE numero_pedido ~ '^0+[0-9]+$';

-- Para casos onde o número ficaria vazio, manter "0"
UPDATE pedidos 
SET numero_pedido = '0'
WHERE numero_pedido = '' OR numero_pedido IS NULL;

-- Verificar os resultados
SELECT id, numero_pedido FROM pedidos ORDER BY created_at DESC LIMIT 10;
