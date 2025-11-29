-- FASE 1: Índices críticos para performance

-- Índices compostos para queries de relatórios (pedidos)
CREATE INDEX IF NOT EXISTS idx_pedidos_created_status 
  ON pedidos(created_at DESC, status);

CREATE INDEX IF NOT EXISTS idx_pedidos_vendedor_created 
  ON pedidos(vendedor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_created 
  ON pedidos(cliente_id, created_at DESC);

-- Índice para itens_pedido com created_at
CREATE INDEX IF NOT EXISTS idx_itens_pedido_created 
  ON itens_pedido(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_itens_pedido_pedido_id 
  ON itens_pedido(pedido_id);

-- Índice para filtros de vendedores
CREATE INDEX IF NOT EXISTS idx_perfis_ativo 
  ON perfis(ativo) WHERE ativo = true;

-- Otimizar busca por número de pedido usando trigram
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_pedidos_numero_trgm 
  ON pedidos USING gin(numero_pedido gin_trgm_ops);

-- Índices para clientes (otimizar queries de relatórios)
CREATE INDEX IF NOT EXISTS idx_clientes_ativo 
  ON clientes(ativo) WHERE ativo = true;

-- Índices para produtos
CREATE INDEX IF NOT EXISTS idx_produtos_ativo 
  ON produtos(ativo) WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_produtos_categoria 
  ON produtos(categoria_id) WHERE categoria_id IS NOT NULL;