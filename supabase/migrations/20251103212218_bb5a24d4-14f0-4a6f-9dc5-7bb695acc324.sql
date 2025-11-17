-- Adicionar coluna para armazenar preferência de exibição de filtros na página de clientes
ALTER TABLE perfis 
ADD COLUMN IF NOT EXISTS mostrar_filtros_clientes BOOLEAN DEFAULT true;