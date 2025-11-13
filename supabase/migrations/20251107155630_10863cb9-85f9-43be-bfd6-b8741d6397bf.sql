-- Limpar etiquetas existentes
DELETE FROM pedidos_etiquetas;
DELETE FROM etiquetas;

-- Inserir novas etiquetas com as cores corretas
INSERT INTO etiquetas (nome, cor) VALUES
  ('Entregar', '#4ade80'),
  ('Faturar', '#fbbf24'),
  ('Fazer com muita atenção', '#f97316'),
  ('Gráfica externa', '#b45309'),
  ('Atrasado', '#fb7185'),
  ('Bucha', '#fda4af'),
  ('Urgente', '#dc2626'),
  ('Fotos grandes', '#c084fc');