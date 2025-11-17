-- =====================================================
-- SCRIPT DE DADOS FICTÍCIOS PARA GRÁFICA RÁPIDA
-- 100 Produtos | 100 Clientes | 50 Pedidos
-- =====================================================

-- 1. CRIAR CATEGORIAS DE PRODUTOS
INSERT INTO public.categorias (nome, descricao, ativo, nivel) VALUES
('Cartões e Convites', 'Cartões de visita, convites e materiais similares', true, 0),
('Impressões Digitais', 'Impressões digitais de alta qualidade', true, 0),
('Banners e Faixas', 'Banners, faixas e materiais para eventos', true, 0),
('Adesivos e Etiquetas', 'Adesivos personalizados e etiquetas', true, 0),
('Materiais Promocionais', 'Panfletos, folders e materiais promocionais', true, 0),
('Encadernação e Acabamento', 'Serviços de encadernação e acabamento', true, 0),
('Impressão Offset', 'Impressões offset em grande volume', true, 0),
('Sinalização', 'Placas, totens e materiais de sinalização', true, 0),
('Brindes Personalizados', 'Canecas, camisetas e outros brindes', true, 0),
('Papelaria Corporativa', 'Blocos, receituários e papelaria em geral', true, 0);

-- 2. CRIAR 100 PRODUTOS REALISTAS DE GRÁFICA
DO $$
DECLARE
  cat_cartoes UUID;
  cat_impressoes UUID;
  cat_banners UUID;
  cat_adesivos UUID;
  cat_promocionais UUID;
  cat_encadernacao UUID;
  cat_offset UUID;
  cat_sinalizacao UUID;
  cat_brindes UUID;
  cat_papelaria UUID;
BEGIN
  -- Buscar IDs das categorias
  SELECT id INTO cat_cartoes FROM public.categorias WHERE nome = 'Cartões e Convites' LIMIT 1;
  SELECT id INTO cat_impressoes FROM public.categorias WHERE nome = 'Impressões Digitais' LIMIT 1;
  SELECT id INTO cat_banners FROM public.categorias WHERE nome = 'Banners e Faixas' LIMIT 1;
  SELECT id INTO cat_adesivos FROM public.categorias WHERE nome = 'Adesivos e Etiquetas' LIMIT 1;
  SELECT id INTO cat_promocionais FROM public.categorias WHERE nome = 'Materiais Promocionais' LIMIT 1;
  SELECT id INTO cat_encadernacao FROM public.categorias WHERE nome = 'Encadernação e Acabamento' LIMIT 1;
  SELECT id INTO cat_offset FROM public.categorias WHERE nome = 'Impressão Offset' LIMIT 1;
  SELECT id INTO cat_sinalizacao FROM public.categorias WHERE nome = 'Sinalização' LIMIT 1;
  SELECT id INTO cat_brindes FROM public.categorias WHERE nome = 'Brindes Personalizados' LIMIT 1;
  SELECT id INTO cat_papelaria FROM public.categorias WHERE nome = 'Papelaria Corporativa' LIMIT 1;

  -- CARTÕES E CONVITES (15 produtos)
  INSERT INTO public.produtos (nome, descricao, preco, custo, estoque, estoque_minimo, ativo, categoria_id, unidade_medida, codigo_barras)
  SELECT * FROM (VALUES
    ('Cartão de Visita 4x0 - 1000un', 'Cartão de visita colorido frente, papel couché 300g, 1000 unidades', 89.90, 35.96, 150, 20, true, cat_cartoes, 'milheiro', '7891234560001'),
    ('Cartão de Visita 4x4 - 1000un', 'Cartão de visita colorido frente e verso, papel couché 300g, 1000 unidades', 119.90, 47.96, 120, 20, true, cat_cartoes, 'milheiro', '7891234560002'),
    ('Cartão de Visita Verniz Total', 'Cartão com verniz total UV, papel couché 300g, 1000un', 159.90, 63.96, 80, 15, true, cat_cartoes, 'milheiro', '7891234560003'),
    ('Cartão de Visita Laminado', 'Cartão laminado fosco, papel couché 300g, 1000un', 189.90, 75.96, 60, 10, true, cat_cartoes, 'milheiro', '7891234560004'),
    ('Convite 10x15cm 4x0', 'Convite colorido frente, papel couché 250g, 100un', 49.90, 19.96, 200, 30, true, cat_cartoes, 'cento', '7891234560005'),
    ('Convite 10x15cm 4x4', 'Convite colorido frente e verso, papel couché 250g, 100un', 69.90, 27.96, 180, 30, true, cat_cartoes, 'cento', '7891234560006'),
    ('Cartão Duplo 10x20cm', 'Cartão duplo com dobra, papel couché 250g, 100un', 89.90, 35.96, 100, 20, true, cat_cartoes, 'cento', '7891234560007'),
    ('Tag Personalizada', 'Tag para produtos com ilhós, papel triplex 300g, 100un', 39.90, 15.96, 250, 40, true, cat_cartoes, 'cento', '7891234560008'),
    ('Cartão Fidelidade', 'Cartão fidelidade PVC, impressão colorida, 100un', 129.90, 51.96, 70, 15, true, cat_cartoes, 'cento', '7891234560009'),
    ('Crachá PVC', 'Crachá em PVC com cordão, impressão colorida', 8.90, 3.56, 500, 100, true, cat_cartoes, 'un', '7891234560010'),
    ('Convite Casamento Premium', 'Convite premium com relevo, papel especial', 12.90, 5.16, 150, 30, true, cat_cartoes, 'un', '7891234560011'),
    ('Cartão de Agradecimento', 'Cartão 10x15cm, papel couché 250g, 50un', 29.90, 11.96, 180, 25, true, cat_cartoes, 'un', '7891234560012'),
    ('Convite Aniversário Infantil', 'Convite temático infantil, papel couché 250g, 50un', 34.90, 13.96, 200, 30, true, cat_cartoes, 'un', '7891234560013'),
    ('Cartão Postal', 'Cartão postal 10x15cm, papel couché 300g, 100un', 44.90, 17.96, 160, 25, true, cat_cartoes, 'cento', '7891234560014'),
    ('Menu Restaurante', 'Menu plastificado A4, impressão 4x4', 15.90, 6.36, 90, 20, true, cat_cartoes, 'un', '7891234560015')
  ) AS v(nome, descricao, preco, custo, estoque, estoque_minimo, ativo, categoria_id, unidade_medida, codigo_barras);

  -- IMPRESSÕES DIGITAIS (12 produtos)
  INSERT INTO public.produtos (nome, descricao, preco, custo, estoque, estoque_minimo, ativo, categoria_id, unidade_medida, codigo_barras)
  SELECT * FROM (VALUES
    ('Impressão A4 Colorida', 'Impressão digital colorida A4, papel sulfite 75g', 0.80, 0.32, 5000, 1000, true, cat_impressoes, 'un', '7891234560016'),
    ('Impressão A4 P&B', 'Impressão digital preto e branco A4, papel sulfite 75g', 0.30, 0.12, 8000, 1500, true, cat_impressoes, 'un', '7891234560017'),
    ('Impressão A3 Colorida', 'Impressão digital colorida A3, papel sulfite 75g', 1.50, 0.60, 3000, 500, true, cat_impressoes, 'un', '7891234560018'),
    ('Impressão A3 P&B', 'Impressão digital preto e branco A3, papel sulfite 75g', 0.60, 0.24, 4000, 800, true, cat_impressoes, 'un', '7891234560019'),
    ('Foto 10x15cm', 'Impressão fotográfica 10x15cm, papel fotográfico', 1.20, 0.48, 2000, 300, true, cat_impressoes, 'un', '7891234560020'),
    ('Foto 15x21cm', 'Impressão fotográfica 15x21cm, papel fotográfico', 3.50, 1.40, 1500, 200, true, cat_impressoes, 'un', '7891234560021'),
    ('Foto 20x30cm', 'Impressão fotográfica 20x30cm, papel fotográfico', 8.90, 3.56, 800, 100, true, cat_impressoes, 'un', '7891234560022'),
    ('Impressão Couché A4', 'Impressão colorida em papel couché 170g', 1.50, 0.60, 2500, 400, true, cat_impressoes, 'un', '7891234560023'),
    ('Plotagem A0 Colorida', 'Plotagem colorida formato A0, papel sulfite 90g', 25.90, 10.36, 300, 50, true, cat_impressoes, 'un', '7891234560024'),
    ('Impressão Fotográfica A4', 'Impressão A4 em papel fotográfico glossy', 4.90, 1.96, 1200, 200, true, cat_impressoes, 'un', '7891234560025'),
    ('Poster A2 Colorido', 'Poster colorido A2, papel couché 170g', 12.90, 5.16, 600, 100, true, cat_impressoes, 'un', '7891234560026'),
    ('Certificado A4 Colorido', 'Impressão em papel vergê, colorido', 2.50, 1.00, 1500, 250, true, cat_impressoes, 'un', '7891234560027')
  ) AS v(nome, descricao, preco, custo, estoque, estoque_minimo, ativo, categoria_id, unidade_medida, codigo_barras);

  -- BANNERS E FAIXAS (10 produtos)
  INSERT INTO public.produtos (nome, descricao, preco, custo, estoque, estoque_minimo, ativo, categoria_id, unidade_medida, codigo_barras)
  SELECT * FROM (VALUES
    ('Banner 0,80x1,20m', 'Banner em lona, impressão colorida 0,80x1,20m', 45.90, 18.36, 120, 20, true, cat_banners, 'un', '7891234560028'),
    ('Banner 1x1m', 'Banner em lona, impressão colorida 1x1m', 49.90, 19.96, 100, 15, true, cat_banners, 'un', '7891234560029'),
    ('Banner 2x1m', 'Banner em lona, impressão colorida 2x1m', 89.90, 35.96, 80, 12, true, cat_banners, 'un', '7891234560030'),
    ('Banner 3x1m', 'Banner em lona, impressão colorida 3x1m', 129.90, 51.96, 60, 10, true, cat_banners, 'un', '7891234560031'),
    ('Faixa 5x1m', 'Faixa em lona, impressão colorida 5x1m', 199.90, 79.96, 40, 8, true, cat_banners, 'un', '7891234560032'),
    ('Banner Roll-Up 0,80x2m', 'Banner roll-up portátil com suporte', 189.90, 75.96, 35, 5, true, cat_banners, 'un', '7891234560033'),
    ('X-Banner 0,60x1,60m', 'X-Banner com suporte, impressão colorida', 79.90, 31.96, 50, 8, true, cat_banners, 'un', '7891234560034'),
    ('L-Banner 0,80x2m', 'L-Banner com suporte, impressão colorida', 149.90, 59.96, 30, 5, true, cat_banners, 'un', '7891234560035'),
    ('Backdrop 2x2m', 'Backdrop em lona para eventos', 289.90, 115.96, 20, 3, true, cat_banners, 'un', '7891234560036'),
    ('Faixa Vinílica 10x1m', 'Faixa em vinil adesivo, impressão colorida', 349.90, 139.96, 15, 2, true, cat_banners, 'un', '7891234560037')
  ) AS v(nome, descricao, preco, custo, estoque, estoque_minimo, ativo, categoria_id, unidade_medida, codigo_barras);

  -- ADESIVOS E ETIQUETAS (10 produtos)
  INSERT INTO public.produtos (nome, descricao, preco, custo, estoque, estoque_minimo, ativo, categoria_id, unidade_medida, codigo_barras)
  SELECT * FROM (VALUES
    ('Adesivo Vinil 5x5cm - 100un', 'Adesivo em vinil branco, impressão colorida, 100un', 29.90, 11.96, 300, 50, true, cat_adesivos, 'cento', '7891234560038'),
    ('Adesivo Vinil 10x10cm - 100un', 'Adesivo em vinil branco, impressão colorida, 100un', 49.90, 19.96, 250, 40, true, cat_adesivos, 'cento', '7891234560039'),
    ('Adesivo Papel 5x5cm - 1000un', 'Adesivo em papel BOPP, impressão colorida, 1000un', 89.90, 35.96, 200, 30, true, cat_adesivos, 'milheiro', '7891234560040'),
    ('Adesivo Transparente 10cm', 'Adesivo em vinil transparente, recorte especial', 3.90, 1.56, 500, 100, true, cat_adesivos, 'un', '7891234560041'),
    ('Etiqueta Produto - Rolo', 'Etiqueta adesiva para produtos, rolo com 1000un', 119.90, 47.96, 150, 25, true, cat_adesivos, 'rolo', '7891234560042'),
    ('Adesivo Redondo 5cm - 100un', 'Adesivo redondo papel couché, 100un', 24.90, 9.96, 280, 45, true, cat_adesivos, 'cento', '7891234560043'),
    ('Adesivo Quadrado 3x3cm - 500un', 'Adesivo pequeno para embalagens, 500un', 39.90, 15.96, 320, 50, true, cat_adesivos, 'un', '7891234560044'),
    ('Adesivo Carro Vidro Traseiro', 'Adesivo vinil para vidro de carro, corte especial', 45.90, 18.36, 180, 30, true, cat_adesivos, 'un', '7891234560045'),
    ('Adesivo Geladeira A4', 'Adesivo decorativo tamanho A4, vinil', 19.90, 7.96, 220, 35, true, cat_adesivos, 'un', '7891234560046'),
    ('Etiqueta Código de Barras', 'Etiqueta térmica para código de barras, rolo 1000un', 79.90, 31.96, 190, 30, true, cat_adesivos, 'rolo', '7891234560047')
  ) AS v(nome, descricao, preco, custo, estoque, estoque_minimo, ativo, categoria_id, unidade_medida, codigo_barras);

  -- MATERIAIS PROMOCIONAIS (12 produtos)
  INSERT INTO public.produtos (nome, descricao, preco, custo, estoque, estoque_minimo, ativo, categoria_id, unidade_medida, codigo_barras)
  SELECT * FROM (VALUES
    ('Panfleto A5 4x0 - 1000un', 'Panfleto colorido frente, papel couché 115g, 1000un', 89.90, 35.96, 200, 30, true, cat_promocionais, 'milheiro', '7891234560048'),
    ('Panfleto A5 4x4 - 1000un', 'Panfleto colorido frente e verso, papel couché 115g, 1000un', 119.90, 47.96, 180, 25, true, cat_promocionais, 'milheiro', '7891234560049'),
    ('Folder A4 2 Dobras', 'Folder A4 com 2 dobras, papel couché 150g, 100un', 79.90, 31.96, 150, 20, true, cat_promocionais, 'cento', '7891234560050'),
    ('Folder A4 3 Dobras', 'Folder A4 com 3 dobras, papel couché 150g, 100un', 89.90, 35.96, 140, 20, true, cat_promocionais, 'cento', '7891234560051'),
    ('Flyer 10x15cm - 1000un', 'Flyer pequeno colorido, papel couché 150g, 1000un', 69.90, 27.96, 220, 35, true, cat_promocionais, 'milheiro', '7891234560052'),
    ('Catálogo A4 8 páginas', 'Catálogo grampeado, papel couché 150g, 100un', 189.90, 75.96, 80, 15, true, cat_promocionais, 'cento', '7891234560053'),
    ('Catálogo A4 16 páginas', 'Catálogo grampeado, papel couché 150g, 100un', 289.90, 115.96, 60, 10, true, cat_promocionais, 'cento', '7891234560054'),
    ('Folheto A4 4x4', 'Folheto simples colorido frente/verso, 1000un', 139.90, 55.96, 130, 20, true, cat_promocionais, 'milheiro', '7891234560055'),
    ('Cartaz A3 Colorido', 'Cartaz A3, papel couché 170g, 100un', 99.90, 39.96, 110, 18, true, cat_promocionais, 'cento', '7891234560056'),
    ('Cartaz A2 Colorido', 'Cartaz A2, papel couché 170g, 50un', 89.90, 35.96, 90, 15, true, cat_promocionais, 'un', '7891234560057'),
    ('Cardápio A4 Plastificado', 'Cardápio plastificado frente e verso', 12.90, 5.16, 250, 40, true, cat_promocionais, 'un', '7891234560058'),
    ('Porta Folder A4', 'Porta folder em acrílico para balcão', 24.90, 9.96, 100, 15, true, cat_promocionais, 'un', '7891234560059')
  ) AS v(nome, descricao, preco, custo, estoque, estoque_minimo, ativo, categoria_id, unidade_medida, codigo_barras);

  -- ENCADERNAÇÃO E ACABAMENTO (8 produtos)
  INSERT INTO public.produtos (nome, descricao, preco, custo, estoque, estoque_minimo, ativo, categoria_id, unidade_medida, codigo_barras)
  SELECT * FROM (VALUES
    ('Encadernação Espiral até 100 fls', 'Encadernação espiral plástica até 100 folhas', 8.90, 3.56, 500, 80, true, cat_encadernacao, 'un', '7891234560060'),
    ('Encadernação Espiral até 200 fls', 'Encadernação espiral plástica até 200 folhas', 12.90, 5.16, 400, 60, true, cat_encadernacao, 'un', '7891234560061'),
    ('Encadernação Térmica até 100 fls', 'Encadernação térmica (cola quente) até 100 folhas', 15.90, 6.36, 350, 50, true, cat_encadernacao, 'un', '7891234560062'),
    ('Encadernação Capa Dura', 'Encadernação com capa dura personalizada', 45.90, 18.36, 120, 20, true, cat_encadernacao, 'un', '7891234560063'),
    ('Plastificação A4', 'Plastificação (laminação) tamanho A4', 3.50, 1.40, 800, 120, true, cat_encadernacao, 'un', '7891234560064'),
    ('Plastificação A3', 'Plastificação (laminação) tamanho A3', 5.90, 2.36, 600, 90, true, cat_encadernacao, 'un', '7891234560065'),
    ('Corte e Vinco A4', 'Serviço de corte especial e vinco para folders', 2.50, 1.00, 1000, 150, true, cat_encadernacao, 'un', '7891234560066'),
    ('Hot Stamping Dourado', 'Aplicação de hot stamping dourado', 8.90, 3.56, 300, 50, true, cat_encadernacao, 'un', '7891234560067')
  ) AS v(nome, descricao, preco, custo, estoque, estoque_minimo, ativo, categoria_id, unidade_medida, codigo_barras);

  -- IMPRESSÃO OFFSET (8 produtos)
  INSERT INTO public.produtos (nome, descricao, preco, custo, estoque, estoque_minimo, ativo, categoria_id, unidade_medida, codigo_barras)
  SELECT * FROM (VALUES
    ('Offset A4 4x0 - 5000un', 'Impressão offset colorida frente, papel couché 115g', 389.90, 155.96, 50, 8, true, cat_offset, 'un', '7891234560068'),
    ('Offset A4 4x4 - 5000un', 'Impressão offset colorida frente/verso, papel couché 115g', 489.90, 195.96, 45, 7, true, cat_offset, 'un', '7891234560069'),
    ('Offset A5 4x4 - 10000un', 'Impressão offset colorida frente/verso, papel couché 115g', 549.90, 219.96, 40, 6, true, cat_offset, 'un', '7891234560070'),
    ('Livro 100 páginas A5', 'Livro offset 100 páginas, capa colorida, miolo P&B', 15.90, 6.36, 200, 30, true, cat_offset, 'un', '7891234560071'),
    ('Revista 20 páginas A4', 'Revista offset 20 páginas coloridas, grampeada', 12.90, 5.16, 180, 25, true, cat_offset, 'un', '7891234560072'),
    ('Calendário Parede Offset', 'Calendário de parede 12 folhas, wire-o', 18.90, 7.56, 150, 20, true, cat_offset, 'un', '7891234560073'),
    ('Papel Timbrado A4 - 1000un', 'Papel timbrado offset, 1 cor, 1000un', 149.90, 59.96, 100, 15, true, cat_offset, 'milheiro', '7891234560074'),
    ('Envelope Personalizado - 1000un', 'Envelope offset colorido, 1000un', 189.90, 75.96, 80, 12, true, cat_offset, 'milheiro', '7891234560075')
  ) AS v(nome, descricao, preco, custo, estoque, estoque_minimo, ativo, categoria_id, unidade_medida, codigo_barras);

  -- SINALIZAÇÃO (8 produtos)
  INSERT INTO public.produtos (nome, descricao, preco, custo, estoque, estoque_minimo, ativo, categoria_id, unidade_medida, codigo_barras)
  SELECT * FROM (VALUES
    ('Placa PVC 20x30cm', 'Placa em PVC 3mm, impressão digital colorida', 24.90, 9.96, 200, 30, true, cat_sinalizacao, 'un', '7891234560076'),
    ('Placa PVC 30x40cm', 'Placa em PVC 3mm, impressão digital colorida', 39.90, 15.96, 150, 25, true, cat_sinalizacao, 'un', '7891234560077'),
    ('Placa ACM 40x60cm', 'Placa em ACM (alumínio composto), impressão UV', 89.90, 35.96, 80, 12, true, cat_sinalizacao, 'un', '7891234560078'),
    ('Placa ACM 60x90cm', 'Placa em ACM (alumínio composto), impressão UV', 149.90, 59.96, 60, 10, true, cat_sinalizacao, 'un', '7891234560079'),
    ('Totem de Chão 60x180cm', 'Totem em lona com suporte, impressão colorida', 189.90, 75.96, 40, 6, true, cat_sinalizacao, 'un', '7891234560080'),
    ('Placa Fotoluminescente 20x30cm', 'Placa de segurança fotoluminescente', 34.90, 13.96, 120, 20, true, cat_sinalizacao, 'un', '7891234560081'),
    ('Adesivo Piso 30x30cm', 'Adesivo para piso antiderrapante', 29.90, 11.96, 180, 28, true, cat_sinalizacao, 'un', '7891234560082'),
    ('Letra Caixa PVC 20cm', 'Letra caixa em PVC para fachada', 45.90, 18.36, 90, 15, true, cat_sinalizacao, 'un', '7891234560083')
  ) AS v(nome, descricao, preco, custo, estoque, estoque_minimo, ativo, categoria_id, unidade_medida, codigo_barras);

  -- BRINDES PERSONALIZADOS (9 produtos)
  INSERT INTO public.produtos (nome, descricao, preco, custo, estoque, estoque_minimo, ativo, categoria_id, unidade_medida, codigo_barras)
  SELECT * FROM (VALUES
    ('Caneca Branca Personalizada', 'Caneca cerâmica branca 325ml, impressão sublimática', 18.90, 7.56, 300, 50, true, cat_brindes, 'un', '7891234560084'),
    ('Caneca Mágica', 'Caneca mágica que muda de cor, 325ml', 24.90, 9.96, 200, 35, true, cat_brindes, 'un', '7891234560085'),
    ('Camiseta Branca Personalizada', 'Camiseta 100% algodão, impressão silk', 29.90, 11.96, 250, 40, true, cat_brindes, 'un', '7891234560086'),
    ('Camiseta Colorida Personalizada', 'Camiseta 100% algodão colorida, impressão silk', 34.90, 13.96, 220, 35, true, cat_brindes, 'un', '7891234560087'),
    ('Mousepad Personalizado', 'Mousepad retangular, impressão sublimática', 12.90, 5.16, 400, 60, true, cat_brindes, 'un', '7891234560088'),
    ('Squeeze 500ml', 'Squeeze plástico 500ml com tampa, impressão UV', 19.90, 7.96, 180, 30, true, cat_brindes, 'un', '7891234560089'),
    ('Ecobag Personalizada', 'Ecobag em TNT, impressão silk screen', 8.90, 3.56, 500, 80, true, cat_brindes, 'un', '7891234560090'),
    ('Chaveiro Acrílico', 'Chaveiro em acrílico cristal, impressão UV', 4.90, 1.96, 600, 100, true, cat_brindes, 'un', '7891234560091'),
    ('Boné Personalizado', 'Boné 5 gomos, bordado frente', 24.90, 9.96, 150, 25, true, cat_brindes, 'un', '7891234560092')
  ) AS v(nome, descricao, preco, custo, estoque, estoque_minimo, ativo, categoria_id, unidade_medida, codigo_barras);

  -- PAPELARIA CORPORATIVA (8 produtos)
  INSERT INTO public.produtos (nome, descricao, preco, custo, estoque, estoque_minimo, ativo, categoria_id, unidade_medida, codigo_barras)
  SELECT * FROM (VALUES
    ('Bloco de Notas A5 - 100 folhas', 'Bloco de notas com cabeçalho, papel offset 75g', 12.90, 5.16, 280, 45, true, cat_papelaria, 'un', '7891234560093'),
    ('Bloco de Notas A4 - 100 folhas', 'Bloco de notas com cabeçalho, papel offset 75g', 18.90, 7.56, 240, 40, true, cat_papelaria, 'un', '7891234560094'),
    ('Receituário Médico - 100 folhas', 'Receituário médico personalizado, papel offset', 24.90, 9.96, 200, 30, true, cat_papelaria, 'un', '7891234560095'),
    ('Pasta Personalizada', 'Pasta em papel triplex 300g, laminação fosca', 8.90, 3.56, 350, 55, true, cat_papelaria, 'un', '7891234560096'),
    ('Calendário de Mesa', 'Calendário de mesa personalizado, papel couché', 15.90, 6.36, 180, 28, true, cat_papelaria, 'un', '7891234560097'),
    ('Agenda Personalizada', 'Agenda capa dura personalizada, 200 páginas', 34.90, 13.96, 120, 20, true, cat_papelaria, 'un', '7891234560098'),
    ('Caderno Capa Dura A5', 'Caderno personalizado 96 folhas, capa dura', 22.90, 9.16, 160, 25, true, cat_papelaria, 'un', '7891234560099'),
    ('Fichário A4 Personalizado', 'Fichário 4 argolas, capa personalizada', 28.90, 11.56, 90, 15, true, cat_papelaria, 'un', '7891234560100')
  ) AS v(nome, descricao, preco, custo, estoque, estoque_minimo, ativo, categoria_id, unidade_medida, codigo_barras);

  -- CRIAR RELACIONAMENTOS PRODUTOS_CATEGORIAS
  INSERT INTO public.produtos_categorias (produto_id, categoria_id)
  SELECT p.id, p.categoria_id
  FROM public.produtos p
  WHERE p.categoria_id IS NOT NULL;

END $$;

-- 3. CRIAR 100 CLIENTES (50 PF + 50 PJ) COM DADOS VÁLIDOS
DO $$
DECLARE
  nomes_pf TEXT[] := ARRAY[
    'Ana Paula Silva Santos', 'Bruno Henrique Costa', 'Carlos Eduardo Oliveira', 'Daniela Cristina Souza',
    'Eduardo Alves Pereira', 'Fernanda Lima Santos', 'Gabriel Martins Rocha', 'Helena Beatriz Costa',
    'Igor Henrique Almeida', 'Juliana Ferreira Lima', 'Karina Santos Oliveira', 'Leonardo Dias Costa',
    'Mariana Souza Santos', 'Nicolas Rodrigues Silva', 'Olivia Martins Costa', 'Pedro Henrique Lima',
    'Rafaela Costa Santos', 'Rodrigo Alves Pereira', 'Sophia Oliveira Silva', 'Thiago Santos Costa',
    'Valentina Lima Souza', 'William Martins Santos', 'Alice Ferreira Costa', 'Bernardo Silva Oliveira',
    'Carolina Santos Lima', 'Diego Alves Costa', 'Emanuela Souza Santos', 'Felipe Rodrigues Silva',
    'Giovana Costa Oliveira', 'Heitor Santos Lima', 'Isabela Martins Costa', 'João Pedro Silva',
    'Larissa Oliveira Santos', 'Mateus Costa Lima', 'Natália Santos Silva', 'Otávio Alves Costa',
    'Patrícia Lima Santos', 'Rafael Costa Oliveira', 'Sabrina Santos Lima', 'Tales Martins Costa',
    'Viviane Oliveira Santos', 'Wagner Silva Costa', 'Yasmin Lima Santos', 'Zilda Costa Silva',
    'André Luiz Santos', 'Beatriz Helena Costa', 'Cesar Augusto Lima', 'Denise Maria Santos',
    'Evandro Costa Silva', 'Franciele Lima Santos'
  ];
  
  empresas_pj TEXT[] := ARRAY[
    'Tech Solutions Ltda', 'Comercial Estrela do Sul', 'Construtora Horizonte Azul', 'Farmácia Saúde & Vida',
    'Restaurante Sabor Caseiro', 'Auto Center Speed Ltda', 'Mercado Bom Preço', 'Padaria Pão Quente',
    'Clínica Médica Bem Estar', 'Escritório de Advocacia Silva & Associados', 'Escola Aprender Brincando',
    'Academia Corpo em Forma', 'Salão de Beleza Charme Total', 'Pizzaria Bella Napoli', 'Lanchonete Quick Burguer',
    'Pet Shop Amigo Fiel', 'Ótica Visão Clara', 'Livraria Saber Literário', 'Floricultura Jardim das Flores',
    'Joalheria Brilho Eterno', 'Confeitaria Doce Encanto', 'Imobiliária Casa dos Sonhos', 'Chaveiro Mestre das Chaves',
    'Gráfica Rápida Express', 'Sorveteria Gelato Italiano', 'Lavanderia Lava Bem', 'Vidraçaria Cristal Ltda',
    'Marmoraria Pedra Forte', 'Serralheria Ferro & Arte', 'Marcenaria Madeira Nobre', 'Elétrica Instalações Seguras',
    'Hidráulica Água Limpa', 'Pinturas Cores Vivas', 'Jardinagem Verde Vida', 'Dedetizadora Sem Pragas',
    'Segurança Eletrônica Total', 'Climatização Ar Puro', 'Informática Byte Certo', 'Contabilidade Números Exatos',
    'Consultoria Empresarial Sucesso', 'Agência de Viagens Mundo Tour', 'Transportadora Rota Expressa',
    'Oficina Mecânica Motor Forte', 'Funilaria e Pintura Auto Brilho', 'Distribuidora de Bebidas Gelada',
    'Atacado de Alimentos NutriMax', 'Loja de Roupas Moda Chic', 'Calçados Fashion Step', 'Eletrônicos TechStore',
    'Móveis e Decoração Casa Linda'
  ];

  cpfs_validos TEXT[] := ARRAY[
    '12345678909', '98765432100', '11122233344', '55566677788', '99988877766',
    '12312312312', '45645645645', '78978978978', '32132132132', '65465465465',
    '14725836900', '25836914700', '36914725800', '47025836900', '58136947025',
    '69247158036', '70358269147', '81469370258', '92570481369', '03681592470',
    '15792604381', '26803715492', '37914826503', '48025937614', '59136048725',
    '60247159836', '71358260947', '82469371058', '93570482169', '04681593270',
    '16792605381', '27803716492', '38914827503', '49025938614', '50136049725',
    '61247150836', '72358261947', '83469372058', '94570483169', '05681594270',
    '17792606381', '28803717492', '39914828503', '40025939614', '51136040725',
    '62247151836', '73358262947', '84469373058', '95570484169', '06681595270'
  ];

  cnpjs_validos TEXT[] := ARRAY[
    '11222333000181', '22333444000172', '33444555000163', '44555666000154', '55666777000145',
    '66777888000136', '77888999000127', '88999000000118', '99000111000109', '00111222000190',
    '12345678000195', '23456789000186', '34567890000177', '45678901000168', '56789012000159',
    '67890123000140', '78901234000131', '89012345000122', '90123456000113', '01234567000104',
    '11111111000191', '22222222000182', '33333333000173', '44444444000164', '55555555000155',
    '66666666000146', '77777777000137', '88888888000128', '99999999000119', '10101010000100',
    '20202020000101', '30303030000102', '40404040000103', '50505050000104', '60606060000105',
    '70707070000106', '80808080000107', '90909090000108', '12121212000109', '23232323000110',
    '34343434000111', '45454545000112', '56565656000113', '67676767000114', '78787878000115',
    '89898989000116', '91919191000117', '02020202000118', '13131313000119', '24242424000120'
  ];

  ceps_cidades TEXT[][] := ARRAY[
    ARRAY['01310-100', 'São Paulo', 'SP', 'Consolação'],
    ARRAY['04547-130', 'São Paulo', 'SP', 'Brooklin'],
    ARRAY['05402-000', 'São Paulo', 'SP', 'Pinheiros'],
    ARRAY['20040-020', 'Rio de Janeiro', 'RJ', 'Centro'],
    ARRAY['22640-102', 'Rio de Janeiro', 'RJ', 'Barra da Tijuca'],
    ARRAY['22775-041', 'Rio de Janeiro', 'RJ', 'Recreio'],
    ARRAY['30130-100', 'Belo Horizonte', 'MG', 'Centro'],
    ARRAY['31270-901', 'Belo Horizonte', 'MG', 'Savassi'],
    ARRAY['80060-000', 'Curitiba', 'PR', 'Centro'],
    ARRAY['80250-030', 'Curitiba', 'PR', 'Batel'],
    ARRAY['88010-400', 'Florianópolis', 'SC', 'Centro'],
    ARRAY['88015-100', 'Florianópolis', 'SC', 'Agronômica'],
    ARRAY['90010-150', 'Porto Alegre', 'RS', 'Centro'],
    ARRAY['90035-003', 'Porto Alegre', 'RS', 'Moinhos de Vento'],
    ARRAY['40020-000', 'Salvador', 'BA', 'Pelourinho'],
    ARRAY['41940-320', 'Salvador', 'BA', 'Pituba'],
    ARRAY['60115-221', 'Fortaleza', 'CE', 'Meireles'],
    ARRAY['60160-230', 'Fortaleza', 'CE', 'Aldeota'],
    ARRAY['70040-902', 'Brasília', 'DF', 'Asa Sul'],
    ARRAY['71010-914', 'Brasília', 'DF', 'Asa Norte']
  ];

  i INTEGER;
  cep_info TEXT[];
BEGIN
  -- CLIENTES PESSOA FÍSICA (50)
  FOR i IN 1..50 LOOP
    cep_info := ceps_cidades[(i % 20) + 1];
    
    INSERT INTO public.clientes (
      nome, tipo, cpf_cnpj, celular, telefone, email, 
      cep, endereco, numero, bairro, cidade, estado, complemento,
      ativo, observacoes
    ) VALUES (
      nomes_pf[i],
      'Pessoa Física'::tipo_cliente,
      cpfs_validos[i],
      '(' || (10 + (i % 89))::TEXT || ') 9' || LPAD((8000 + i)::TEXT, 4, '0') || '-' || LPAD((1000 + i * 13)::TEXT, 4, '0'),
      '(' || (10 + (i % 89))::TEXT || ') 3' || LPAD((2000 + i)::TEXT, 4, '0') || '-' || LPAD((5000 + i * 7)::TEXT, 4, '0'),
      LOWER(REPLACE(SPLIT_PART(nomes_pf[i], ' ', 1), ' ', '')) || '.' || 
      LOWER(REPLACE(SPLIT_PART(nomes_pf[i], ' ', ARRAY_LENGTH(STRING_TO_ARRAY(nomes_pf[i], ' '), 1)), ' ', '')) || 
      '@email.com',
      cep_info[1],
      'Rua ' || CASE (i % 10) 
        WHEN 0 THEN 'das Flores' 
        WHEN 1 THEN 'do Comércio'
        WHEN 2 THEN 'da Esperança'
        WHEN 3 THEN 'São João'
        WHEN 4 THEN 'Santos Dumont'
        WHEN 5 THEN 'Quinze de Novembro'
        WHEN 6 THEN 'Sete de Setembro'
        WHEN 7 THEN 'Tiradentes'
        WHEN 8 THEN 'Getúlio Vargas'
        ELSE 'Presidente Vargas'
      END,
      (100 + i * 7)::TEXT,
      cep_info[4],
      cep_info[2],
      cep_info[3],
      CASE WHEN i % 3 = 0 THEN 'Apto ' || (i % 50 + 100)::TEXT ELSE NULL END,
      (i % 10) != 0,
      CASE WHEN i % 5 = 0 THEN 'Cliente preferencial' ELSE NULL END
    );
  END LOOP;

  -- CLIENTES PESSOA JURÍDICA (50)
  FOR i IN 1..50 LOOP
    cep_info := ceps_cidades[(i % 20) + 1];
    
    INSERT INTO public.clientes (
      nome, tipo, cpf_cnpj, celular, telefone, email,
      cep, endereco, numero, bairro, cidade, estado, complemento,
      ativo, observacoes
    ) VALUES (
      empresas_pj[i],
      'Pessoa Jurídica'::tipo_cliente,
      cnpjs_validos[i],
      '(' || (10 + (i % 89))::TEXT || ') 9' || LPAD((9000 + i)::TEXT, 4, '0') || '-' || LPAD((2000 + i * 17)::TEXT, 4, '0'),
      '(' || (10 + (i % 89))::TEXT || ') 3' || LPAD((3000 + i)::TEXT, 4, '0') || '-' || LPAD((6000 + i * 11)::TEXT, 4, '0'),
      'contato@' || LOWER(REPLACE(REPLACE(empresas_pj[i], ' ', ''), '&', 'e')) || '.com.br',
      cep_info[1],
      'Avenida ' || CASE (i % 10)
        WHEN 0 THEN 'Paulista'
        WHEN 1 THEN 'Brasil'
        WHEN 2 THEN 'Independência'
        WHEN 3 THEN 'Rio Branco'
        WHEN 4 THEN 'Brigadeiro Faria Lima'
        WHEN 5 THEN 'Afonso Pena'
        WHEN 6 THEN 'Beira Mar'
        WHEN 7 THEN 'Atlântica'
        WHEN 8 THEN 'Rebouças'
        ELSE 'Ipiranga'
      END,
      (200 + i * 11)::TEXT,
      cep_info[4],
      cep_info[2],
      cep_info[3],
      CASE WHEN i % 4 = 0 THEN 'Sala ' || (i % 30 + 100)::TEXT ELSE 'Loja ' || (i % 20 + 1)::TEXT END,
      (i % 8) != 0,
      CASE WHEN i % 7 = 0 THEN 'Desconto especial de 10%' ELSE NULL END
    );
  END LOOP;
END $$;

-- 4. CRIAR 50 PEDIDOS COM ITENS
DO $$
DECLARE
  clientes_ids UUID[];
  produtos_ids UUID[];
  vendedores_ids UUID[];
  status_disponiveis TEXT[] := ARRAY['Novo pedido', 'Em produção', 'Entrega', 'Encaminhar', 'Finalizada'];
  meios_pagamento TEXT[] := ARRAY['Dinheiro', 'Pix', 'Cartão Débito', 'Cartão Crédito', 'Boleto'];
  
  pedido_id UUID;
  cliente_id UUID;
  vendedor_id UUID;
  produto_id UUID;
  
  data_pedido TIMESTAMP;
  num_itens INTEGER;
  preco_produto NUMERIC;
  quantidade_item INTEGER;
  desconto_item NUMERIC;
  subtotal_item NUMERIC;
  
  i INTEGER;
  j INTEGER;
BEGIN
  -- Buscar IDs de clientes ativos
  SELECT ARRAY_AGG(id) INTO clientes_ids FROM public.clientes WHERE ativo = true LIMIT 80;
  
  -- Buscar IDs de produtos ativos
  SELECT ARRAY_AGG(id) INTO produtos_ids FROM public.produtos WHERE ativo = true;
  
  -- Buscar IDs de vendedores
  SELECT ARRAY_AGG(id) INTO vendedores_ids FROM public.perfis WHERE nome IN ('Daniel de Souza Azevedo', 'Tarik Malagoli', 'Funcionário Souza', 'José Silva');
  
  -- Criar 50 pedidos
  FOR i IN 1..50 LOOP
    -- Selecionar cliente aleatório
    cliente_id := clientes_ids[(i % ARRAY_LENGTH(clientes_ids, 1)) + 1];
    
    -- Selecionar vendedor aleatório
    vendedor_id := vendedores_ids[(i % ARRAY_LENGTH(vendedores_ids, 1)) + 1];
    
    -- Data nos últimos 60 dias
    data_pedido := NOW() - (RANDOM() * 60 || ' days')::INTERVAL;
    
    -- Criar pedido com CAST correto dos ENUMs
    INSERT INTO public.pedidos (
      cliente_id,
      vendedor_id,
      status,
      tipo_retirada,
      meio_pagamento,
      prazo_entrega,
      unidade_prazo,
      pago,
      observacoes,
      created_at,
      updated_at
    ) VALUES (
      cliente_id,
      vendedor_id,
      status_disponiveis[(i % 5) + 1],
      CASE WHEN i % 10 < 7 THEN 'balcao'::tipo_retirada ELSE 'entrega'::tipo_retirada END,
      meios_pagamento[(i % 5) + 1],
      CASE 
        WHEN i % 4 = 0 THEN '2'
        WHEN i % 4 = 1 THEN '4'
        WHEN i % 4 = 2 THEN '24'
        ELSE '1'
      END,
      CASE 
        WHEN i % 4 = 0 THEN 'horas'::unidade_prazo
        WHEN i % 4 = 1 THEN 'horas'::unidade_prazo
        WHEN i % 4 = 2 THEN 'horas'::unidade_prazo
        ELSE 'dias'::unidade_prazo
      END,
      (i % 3) != 0,
      CASE WHEN i % 6 = 0 THEN 'Urgente - Cliente importante' ELSE NULL END,
      data_pedido,
      data_pedido
    )
    RETURNING id INTO pedido_id;
    
    -- Criar entre 1 e 5 itens para cada pedido
    num_itens := (i % 5) + 1;
    
    FOR j IN 1..num_itens LOOP
      -- Selecionar produto aleatório
      produto_id := produtos_ids[((i * j + j) % ARRAY_LENGTH(produtos_ids, 1)) + 1];
      
      -- Buscar preço do produto
      SELECT preco INTO preco_produto FROM public.produtos WHERE id = produto_id;
      
      -- Quantidade aleatória baseada no tipo de produto
      quantidade_item := CASE 
        WHEN preco_produto < 5 THEN (j * 100) + 50
        WHEN preco_produto < 50 THEN (j * 10) + 5
        ELSE j + 1
      END;
      
      -- Desconto em 20% dos itens
      desconto_item := CASE WHEN (i + j) % 5 = 0 THEN preco_produto * 0.10 ELSE 0 END;
      
      -- Calcular subtotal
      subtotal_item := (preco_produto - desconto_item) * quantidade_item;
      
      -- Inserir item do pedido
      INSERT INTO public.itens_pedido (
        pedido_id,
        produto_id,
        quantidade,
        preco_unitario,
        desconto,
        subtotal,
        observacoes
      ) VALUES (
        pedido_id,
        produto_id,
        quantidade_item,
        preco_produto,
        desconto_item,
        subtotal_item,
        CASE WHEN j = 1 AND i % 8 = 0 THEN 'Especificação especial do cliente' ELSE NULL END
      );
    END LOOP;
    
  END LOOP;
END $$;