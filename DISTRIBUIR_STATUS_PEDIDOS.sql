-- Script para distribuir pedidos aleatoriamente entre os status ativos
-- Usando uma abordagem mais robusta

-- Primeiro, vamos criar uma tabela temporária com os status e seus índices
WITH status_list AS (
  SELECT nome, ROW_NUMBER() OVER (ORDER BY ordem) as status_index
  FROM status_pedidos_config
  WHERE ativo = true
),
total_status AS (
  SELECT COUNT(*) as total FROM status_list
),
pedidos_numerados AS (
  SELECT 
    id, 
    ROW_NUMBER() OVER (ORDER BY created_at) as pedido_index
  FROM pedidos
)
UPDATE pedidos p
SET 
  status = sl.nome,
  updated_at = now()
FROM pedidos_numerados pn, status_list sl, total_status ts
WHERE p.id = pn.id
  AND sl.status_index = ((pn.pedido_index - 1) % ts.total) + 1;

-- Verificar distribuição após atualização
SELECT 
  status, 
  COUNT(*) as quantidade,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM pedidos), 2) as percentual
FROM pedidos
GROUP BY status
ORDER BY quantidade DESC;
