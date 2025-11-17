-- Resolver duplicatas de CPF/CNPJ mantendo o registro mais recente
-- e atualizando as referências de pedidos

-- Para cada CPF/CNPJ duplicado, atualizar pedidos para referenciar o cliente mais recente
WITH duplicatas AS (
  SELECT 
    cpf_cnpj,
    id,
    ROW_NUMBER() OVER (PARTITION BY cpf_cnpj ORDER BY created_at DESC) as rn,
    FIRST_VALUE(id) OVER (PARTITION BY cpf_cnpj ORDER BY created_at DESC) as id_manter
  FROM public.clientes
  WHERE cpf_cnpj IS NOT NULL AND cpf_cnpj != ''
),
clientes_para_remover AS (
  SELECT id, id_manter
  FROM duplicatas
  WHERE rn > 1
)
-- Atualizar pedidos para referenciar o cliente mais recente
UPDATE public.pedidos
SET cliente_id = cpr.id_manter
FROM clientes_para_remover cpr
WHERE pedidos.cliente_id = cpr.id;

-- Deletar clientes duplicados que não são mais referenciados
WITH duplicatas AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY cpf_cnpj ORDER BY created_at DESC) as rn
  FROM public.clientes
  WHERE cpf_cnpj IS NOT NULL AND cpf_cnpj != ''
)
DELETE FROM public.clientes
WHERE id IN (SELECT id FROM duplicatas WHERE rn > 1);

-- Adicionar constraint única
ALTER TABLE public.clientes
ADD CONSTRAINT clientes_cpf_cnpj_unique UNIQUE (cpf_cnpj);