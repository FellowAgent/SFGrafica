-- =====================================================
-- Script: Distribuir Pedidos Aleatoriamente entre Vendedores
-- Descrição: Atualiza TODOS os pedidos distribuindo ALEATORIAMENTE
--            entre TODOS os funcionários ativos do sistema
-- Versão: 3.0 (GARANTIDO)
-- =====================================================

-- IMPORTANTE: Execute este script no SQL Editor do Supabase
-- Link: https://supabase.com/dashboard/project/odlfkrnrkvruvqxseusr/sql/new

-- Passo 1: Ver situação ANTES da atualização
SELECT 
  COALESCE(p.nome, 'SEM VENDEDOR') as vendedor_antes,
  COUNT(ped.id) as total_pedidos
FROM pedidos ped
LEFT JOIN perfis p ON ped.vendedor_id = p.id
GROUP BY p.nome
ORDER BY total_pedidos DESC;

-- Passo 2: Criar array com todos os funcionários ativos
DO $$
DECLARE
  funcionarios_ids UUID[];
  total_funcionarios INT;
  contador INT := 0;
  pedido_record RECORD;
  vendedor_aleatorio UUID;
BEGIN
  -- Buscar todos os IDs de funcionários ativos em um array
  SELECT ARRAY_AGG(id) INTO funcionarios_ids
  FROM perfis
  WHERE ativo = true;
  
  -- Contar quantos funcionários temos
  total_funcionarios := array_length(funcionarios_ids, 1);
  
  RAISE NOTICE 'Total de funcionários ativos: %', total_funcionarios;
  RAISE NOTICE 'IDs dos funcionários: %', funcionarios_ids;
  
  -- Iterar sobre CADA pedido e atribuir um funcionário ALEATÓRIO
  FOR pedido_record IN 
    SELECT id FROM pedidos ORDER BY id
  LOOP
    -- Selecionar um índice aleatório do array (1 a total_funcionarios)
    vendedor_aleatorio := funcionarios_ids[1 + floor(random() * total_funcionarios)::int];
    
    -- Atualizar o pedido com o vendedor aleatório
    UPDATE pedidos 
    SET 
      vendedor_id = vendedor_aleatorio,
      updated_at = NOW()
    WHERE id = pedido_record.id;
    
    contador := contador + 1;
    
    -- Log a cada 500 pedidos
    IF contador % 500 = 0 THEN
      RAISE NOTICE 'Processados % pedidos...', contador;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'CONCLUÍDO! Total de pedidos atualizados: %', contador;
END $$;

-- Passo 3: Verificar a distribuição APÓS a atualização
SELECT 
  p.nome as vendedor_depois,
  COUNT(ped.id) as total_pedidos,
  ROUND(COUNT(ped.id)::numeric / (SELECT COUNT(*) FROM pedidos) * 100, 2) as percentual
FROM pedidos ped
LEFT JOIN perfis p ON ped.vendedor_id = p.id
GROUP BY p.id, p.nome
ORDER BY total_pedidos DESC;

-- =====================================================
-- Este script GARANTE que:
-- 1. CADA pedido será processado individualmente
-- 2. CADA pedido receberá um funcionário ALEATÓRIO do array
-- 3. A distribuição será aproximadamente 25% para cada um dos 4 funcionários
-- 4. Você verá logs do progresso durante a execução
-- =====================================================
