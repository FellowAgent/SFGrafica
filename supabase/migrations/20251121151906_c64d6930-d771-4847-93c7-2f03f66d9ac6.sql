-- Popular templates de variações
INSERT INTO public.templates_variacoes (nome, descricao, ativo, ordem) VALUES
  ('Papéis (Impressos em geral)', 'Variações para produtos impressos em diferentes tipos de papel', true, 1),
  ('Plásticos e Vinis', 'Variações para materiais plásticos, vinis e lonas', true, 2),
  ('Materiais Rígidos', 'Variações para materiais rígidos como ACM, PVC, MDF', true, 3),
  ('Têxteis', 'Variações para camisetas, ecobags e tecidos', true, 4),
  ('Outros Substratos', 'Variações para acrílico, etiquetas e outros materiais', true, 5)
ON CONFLICT DO NOTHING;

-- Template 1: Papéis - Criar estrutura hierárquica
DO $$
DECLARE
  template_papeis_id UUID;
  attr_material_id UUID;
  attr_couche_brilho_id UUID;
  attr_couche_fosco_id UUID;
  attr_offset_id UUID;
  attr_verge_id UUID;
  attr_reciclado_id UUID;
  attr_kraft_id UUID;
BEGIN
  -- Obter ID do template
  SELECT id INTO template_papeis_id FROM public.templates_variacoes WHERE nome = 'Papéis (Impressos em geral)';
  
  -- Criar atributo raiz: Material
  INSERT INTO public.atributos_variacao (template_id, nome, pai_id, nivel, ordem)
  VALUES (template_papeis_id, 'Material', NULL, 0, 0)
  RETURNING id INTO attr_material_id;
  
  -- Criar sub-atributos (tipos de papel)
  INSERT INTO public.atributos_variacao (template_id, nome, pai_id, nivel, ordem)
  VALUES (template_papeis_id, 'Couché Brilho', attr_material_id, 1, 0)
  RETURNING id INTO attr_couche_brilho_id;
  
  INSERT INTO public.atributos_variacao (template_id, nome, pai_id, nivel, ordem)
  VALUES (template_papeis_id, 'Couché Fosco', attr_material_id, 1, 1)
  RETURNING id INTO attr_couche_fosco_id;
  
  INSERT INTO public.atributos_variacao (template_id, nome, pai_id, nivel, ordem)
  VALUES (template_papeis_id, 'Off Set', attr_material_id, 1, 2)
  RETURNING id INTO attr_offset_id;
  
  INSERT INTO public.atributos_variacao (template_id, nome, pai_id, nivel, ordem)
  VALUES (template_papeis_id, 'Vergê', attr_material_id, 1, 3)
  RETURNING id INTO attr_verge_id;
  
  INSERT INTO public.atributos_variacao (template_id, nome, pai_id, nivel, ordem)
  VALUES (template_papeis_id, 'Reciclado', attr_material_id, 1, 4)
  RETURNING id INTO attr_reciclado_id;
  
  INSERT INTO public.atributos_variacao (template_id, nome, pai_id, nivel, ordem)
  VALUES (template_papeis_id, 'Kraft', attr_material_id, 1, 5)
  RETURNING id INTO attr_kraft_id;
  
  -- Inserir opções de gramatura para cada tipo
  -- Couché Brilho
  INSERT INTO public.opcoes_variacao (atributo_id, nome, valor_adicional, estoque, ativo, ordem) VALUES
    (attr_couche_brilho_id, '90g', 0, 100, true, 0),
    (attr_couche_brilho_id, '115g', 0.50, 100, true, 1),
    (attr_couche_brilho_id, '150g', 1.00, 100, true, 2),
    (attr_couche_brilho_id, '250g', 2.00, 100, true, 3),
    (attr_couche_brilho_id, '300g', 3.00, 100, true, 4);
  
  -- Couché Fosco
  INSERT INTO public.opcoes_variacao (atributo_id, nome, valor_adicional, estoque, ativo, ordem) VALUES
    (attr_couche_fosco_id, '150g', 1.00, 100, true, 0),
    (attr_couche_fosco_id, '250g', 2.00, 100, true, 1),
    (attr_couche_fosco_id, '300g', 3.00, 100, true, 2);
  
  -- Off Set
  INSERT INTO public.opcoes_variacao (atributo_id, nome, valor_adicional, estoque, ativo, ordem) VALUES
    (attr_offset_id, '75g', 0, 100, true, 0),
    (attr_offset_id, '90g', 0.20, 100, true, 1),
    (attr_offset_id, '120g', 0.50, 100, true, 2),
    (attr_offset_id, '180g', 1.00, 100, true, 3);
  
  -- Vergê
  INSERT INTO public.opcoes_variacao (atributo_id, nome, valor_adicional, estoque, ativo, ordem) VALUES
    (attr_verge_id, '120g', 0.80, 100, true, 0),
    (attr_verge_id, '180g', 1.50, 100, true, 1);
  
  -- Reciclado
  INSERT INTO public.opcoes_variacao (atributo_id, nome, valor_adicional, estoque, ativo, ordem) VALUES
    (attr_reciclado_id, '90g', 0.30, 100, true, 0),
    (attr_reciclado_id, '120g', 0.60, 100, true, 1),
    (attr_reciclado_id, '180g', 1.20, 100, true, 2);
  
  -- Kraft
  INSERT INTO public.opcoes_variacao (atributo_id, nome, valor_adicional, estoque, ativo, ordem) VALUES
    (attr_kraft_id, '80g', 0.40, 100, true, 0),
    (attr_kraft_id, '120g', 0.70, 100, true, 1),
    (attr_kraft_id, '180g', 1.30, 100, true, 2);
END $$;

-- Template 2: Plásticos e Vinis
DO $$
DECLARE
  template_plasticos_id UUID;
  attr_material_id UUID;
BEGIN
  SELECT id INTO template_plasticos_id FROM public.templates_variacoes WHERE nome = 'Plásticos e Vinis';
  
  INSERT INTO public.atributos_variacao (template_id, nome, pai_id, nivel, ordem)
  VALUES (template_plasticos_id, 'Material', NULL, 0, 0)
  RETURNING id INTO attr_material_id;
  
  INSERT INTO public.opcoes_variacao (atributo_id, nome, valor_adicional, estoque, ativo, ordem) VALUES
    (attr_material_id, 'Vinil adesivo branco fosco', 5.00, 50, true, 0),
    (attr_material_id, 'Vinil adesivo branco brilho', 5.50, 50, true, 1),
    (attr_material_id, 'Vinil transparente', 6.00, 50, true, 2),
    (attr_material_id, 'Vinil jateado', 7.00, 50, true, 3),
    (attr_material_id, 'Vinil perfurado (one way)', 8.00, 30, true, 4),
    (attr_material_id, 'Vinil blackout', 9.00, 40, true, 5),
    (attr_material_id, 'Lona 280g', 10.00, 60, true, 6),
    (attr_material_id, 'Lona 340g', 12.00, 60, true, 7),
    (attr_material_id, 'Lona 440g', 15.00, 60, true, 8),
    (attr_material_id, 'PVC 0,3mm', 8.00, 40, true, 9),
    (attr_material_id, 'PVC 0,5mm', 10.00, 40, true, 10),
    (attr_material_id, 'PVC 1mm', 15.00, 40, true, 11);
END $$;

-- Template 3: Materiais Rígidos
DO $$
DECLARE
  template_rigidos_id UUID;
  attr_material_id UUID;
  attr_pvc_expandido_id UUID;
BEGIN
  SELECT id INTO template_rigidos_id FROM public.templates_variacoes WHERE nome = 'Materiais Rígidos';
  
  INSERT INTO public.atributos_variacao (template_id, nome, pai_id, nivel, ordem)
  VALUES (template_rigidos_id, 'Material', NULL, 0, 0)
  RETURNING id INTO attr_material_id;
  
  -- Criar sub-atributo para PVC Expandido
  INSERT INTO public.atributos_variacao (template_id, nome, pai_id, nivel, ordem)
  VALUES (template_rigidos_id, 'PVC Expandido', attr_material_id, 1, 0)
  RETURNING id INTO attr_pvc_expandido_id;
  
  -- Opções diretas de Material
  INSERT INTO public.opcoes_variacao (atributo_id, nome, valor_adicional, estoque, ativo, ordem) VALUES
    (attr_material_id, 'ACM', 25.00, 30, true, 1),
    (attr_material_id, 'PS (Poliestireno)', 18.00, 40, true, 2),
    (attr_material_id, 'MDF', 20.00, 35, true, 3),
    (attr_material_id, 'Papelão Paraná', 8.00, 50, true, 4),
    (attr_material_id, 'Foam Board', 12.00, 45, true, 5),
    (attr_material_id, 'Placas imantadas', 30.00, 25, true, 6);
  
  -- Espessuras do PVC Expandido
  INSERT INTO public.opcoes_variacao (atributo_id, nome, valor_adicional, estoque, ativo, ordem) VALUES
    (attr_pvc_expandido_id, '3mm', 15.00, 50, true, 0),
    (attr_pvc_expandido_id, '5mm', 20.00, 50, true, 1),
    (attr_pvc_expandido_id, '10mm', 35.00, 50, true, 2);
END $$;

-- Template 4: Têxteis
DO $$
DECLARE
  template_texteis_id UUID;
  attr_material_id UUID;
  attr_camiseta_algodao_id UUID;
BEGIN
  SELECT id INTO template_texteis_id FROM public.templates_variacoes WHERE nome = 'Têxteis';
  
  INSERT INTO public.atributos_variacao (template_id, nome, pai_id, nivel, ordem)
  VALUES (template_texteis_id, 'Material', NULL, 0, 0)
  RETURNING id INTO attr_material_id;
  
  -- Criar sub-atributo para Camiseta 100% algodão
  INSERT INTO public.atributos_variacao (template_id, nome, pai_id, nivel, ordem)
  VALUES (template_texteis_id, 'Camiseta 100% algodão', attr_material_id, 1, 0)
  RETURNING id INTO attr_camiseta_algodao_id;
  
  -- Opções diretas
  INSERT INTO public.opcoes_variacao (atributo_id, nome, valor_adicional, estoque, ativo, ordem) VALUES
    (attr_material_id, 'Camiseta Poliéster (sublimação)', 15.00, 100, true, 1),
    (attr_material_id, 'Camiseta Dry Fit', 20.00, 80, true, 2),
    (attr_material_id, 'Moletom', 35.00, 50, true, 3),
    (attr_material_id, 'Ecobags algodão cru', 10.00, 100, true, 4),
    (attr_material_id, 'Ecobags poliéster', 12.00, 100, true, 5),
    (attr_material_id, 'Tecido Oxford', 18.00, 60, true, 6),
    (attr_material_id, 'Tecido Helanca', 16.00, 60, true, 7);
  
  -- Tipos de fio para algodão
  INSERT INTO public.opcoes_variacao (atributo_id, nome, valor_adicional, estoque, ativo, ordem) VALUES
    (attr_camiseta_algodao_id, 'Fio 24.1', 12.00, 100, true, 0),
    (attr_camiseta_algodao_id, 'Fio 30.1', 18.00, 100, true, 1);
END $$;

-- Template 5: Outros Substratos
DO $$
DECLARE
  template_outros_id UUID;
  attr_material_id UUID;
  attr_acrilico_id UUID;
  attr_etiquetas_id UUID;
BEGIN
  SELECT id INTO template_outros_id FROM public.templates_variacoes WHERE nome = 'Outros Substratos';
  
  INSERT INTO public.atributos_variacao (template_id, nome, pai_id, nivel, ordem)
  VALUES (template_outros_id, 'Material', NULL, 0, 0)
  RETURNING id INTO attr_material_id;
  
  -- Criar sub-atributos
  INSERT INTO public.atributos_variacao (template_id, nome, pai_id, nivel, ordem)
  VALUES (template_outros_id, 'Acrílico', attr_material_id, 1, 0)
  RETURNING id INTO attr_acrilico_id;
  
  INSERT INTO public.atributos_variacao (template_id, nome, pai_id, nivel, ordem)
  VALUES (template_outros_id, 'Etiquetas BOPP', attr_material_id, 1, 1)
  RETURNING id INTO attr_etiquetas_id;
  
  -- Opções diretas
  INSERT INTO public.opcoes_variacao (atributo_id, nome, valor_adicional, estoque, ativo, ordem) VALUES
    (attr_material_id, 'Papel térmico', 8.00, 100, true, 2),
    (attr_material_id, 'Porcelana', 25.00, 30, true, 3);
  
  -- Tipos de Acrílico
  INSERT INTO public.opcoes_variacao (atributo_id, nome, valor_adicional, estoque, ativo, ordem) VALUES
    (attr_acrilico_id, 'Cristal', 40.00, 40, true, 0),
    (attr_acrilico_id, 'Branco', 35.00, 40, true, 1);
  
  -- Tipos de Etiquetas BOPP
  INSERT INTO public.opcoes_variacao (atributo_id, nome, valor_adicional, estoque, ativo, ordem) VALUES
    (attr_etiquetas_id, 'Branco', 5.00, 200, true, 0),
    (attr_etiquetas_id, 'Transparente', 6.00, 200, true, 1),
    (attr_etiquetas_id, 'Metalizado', 8.00, 150, true, 2);
END $$;