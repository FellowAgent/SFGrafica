-- Script para atualizar status dos pedidos de forma aleatória
-- usando os status ativos cadastrados no sistema

-- Atualizar pedidos com status aleatórios dos status ativos
UPDATE pedidos
SET status = (
  SELECT nome 
  FROM status_pedidos_config 
  WHERE ativo = true 
  ORDER BY random() 
  LIMIT 1
),
updated_at = now()
WHERE status NOT IN (
  SELECT nome FROM status_pedidos_config WHERE ativo = true
);

-- Verificar distribuição dos status após atualização
SELECT status, COUNT(*) as quantidade
FROM pedidos
GROUP BY status
ORDER BY quantidade DESC;
