-- ========================================
-- SCRIPT DE DADOS FICTÍCIOS - GRÁFICA RÁPIDA
-- 1000 Clientes, 1000 Produtos, 2000 Pedidos
-- ========================================

-- Limpar todas as tabelas (respeitando ordem de foreign keys)
DELETE FROM comentarios_pedido;
DELETE FROM itens_pedido;
DELETE FROM pedidos_etiquetas;
DELETE FROM asaas_notas_fiscais;
DELETE FROM asaas_cobrancas;
DELETE FROM pedidos;
DELETE FROM produtos_categorias;
DELETE FROM variacoes_produto;
DELETE FROM produtos;
DELETE FROM categorias;
DELETE FROM asaas_customers;
DELETE FROM clientes;

-- Inserir categorias de gráfica
INSERT INTO categorias (id, nome, descricao, ativo, nivel) VALUES
('a1111111-1111-1111-1111-111111111111', 'Cartões e Crachás', 'Cartões de visita, crachás e identificações', true, 0),
('a2222222-2222-2222-2222-222222222222', 'Material Promocional', 'Panfletos, folders e flyers', true, 0),
('a3333333-3333-3333-3333-333333333333', 'Banners e Faixas', 'Banners, faixas e lonas', true, 0),
('a4444444-4444-4444-4444-444444444444', 'Adesivos', 'Adesivos personalizados diversos', true, 0),
('a5555555-5555-5555-5555-555555555555', 'Impressões', 'Impressões em geral', true, 0),
('a6666666-6666-6666-6666-666666666666', 'Carimbos', 'Carimbos personalizados', true, 0),
('a7777777-7777-7777-7777-777777777777', 'Convites', 'Convites para eventos', true, 0),
('a8888888-8888-8888-8888-888888888888', 'Brindes', 'Canetas, blocos e brindes', true, 0);

-- Gerar 1000 clientes
DO $$
DECLARE
  i INTEGER;
  cliente_id UUID;
  nomes TEXT[] := ARRAY[
    'João', 'Maria', 'Pedro', 'Ana', 'Carlos', 'Juliana', 'Roberto', 'Fernanda',
    'Paulo', 'Camila', 'Ricardo', 'Patrícia', 'André', 'Beatriz', 'Felipe',
    'Larissa', 'Marcos', 'Aline', 'Bruno', 'Cristina', 'Diego', 'Renata',
    'Gustavo', 'Tatiana', 'Rafael', 'Vanessa', 'Lucas', 'Gabriela', 'Thiago',
    'Amanda', 'Rodrigo', 'Carla', 'Vinícius', 'Priscila', 'Daniel', 'Luciana',
    'Leandro', 'Adriana', 'Fernando', 'Sabrina', 'Marcelo', 'Daniela', 'Alexandre',
    'Jéssica', 'Eduardo', 'Raquel', 'Fábio', 'Natália', 'César', 'Bianca'
  ];
  sobrenomes TEXT[] := ARRAY[
    'Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Ferreira', 'Costa',
    'Rodrigues', 'Almeida', 'Nascimento', 'Carvalho', 'Araújo', 'Ribeiro',
    'Martins', 'Rocha', 'Alves', 'Pereira', 'Gomes', 'Barbosa', 'Cardoso',
    'Mendes', 'Castro', 'Dias', 'Moreira', 'Cavalcanti', 'Campos', 'Duarte',
    'Reis', 'Ramos', 'Monteiro', 'Freitas', 'Santana', 'Pinto', 'Correia',
    'Azevedo', 'Medeiros', 'Nunes', 'Teixeira', 'Moura', 'Gonçalves'
  ];
  cidades TEXT[] := ARRAY[
    'São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Porto Alegre',
    'Brasília', 'Salvador', 'Fortaleza', 'Recife', 'Manaus', 'Belém', 'Goiânia',
    'Campinas', 'São Luís', 'Maceió', 'Natal', 'João Pessoa', 'Teresina',
    'Ribeirão Preto', 'Sorocaba', 'Uberlândia', 'Juiz de Fora', 'Londrina',
    'Joinville', 'Florianópolis', 'São José dos Campos'
  ];
  estados TEXT[] := ARRAY[
    'SP', 'RJ', 'MG', 'PR', 'RS', 'DF', 'BA', 'CE', 'PE', 'AM', 'PA', 'GO',
    'SP', 'MA', 'AL', 'RN', 'PB', 'PI', 'SP', 'SP', 'MG', 'MG', 'PR',
    'SC', 'SC', 'SP'
  ];
  bairros TEXT[] := ARRAY[
    'Centro', 'Jardim América', 'Vila Nova', 'São José', 'Boa Vista',
    'Santa Cruz', 'Planalto', 'Industrial', 'Comercial', 'Residencial'
  ];
  nome_completo TEXT;
  cpf_cnpj_gerado TEXT;
  celular_gerado TEXT;
  tipo_cliente TEXT;
BEGIN
  FOR i IN 1..1000 LOOP
    cliente_id := gen_random_uuid();
    nome_completo := nomes[1 + (i % 50)] || ' ' || sobrenomes[1 + ((i * 7) % 40)];
    
    -- 15% são Pessoa Jurídica
    IF i % 7 = 0 THEN
      tipo_cliente := 'Pessoa Jurídica';
      -- Gerar CNPJ fictício (14 dígitos)
      cpf_cnpj_gerado := LPAD((10000000000000 + (i * 123456))::TEXT, 14, '0');
      nome_completo := nome_completo || ' ' || CASE (i % 5)
        WHEN 0 THEN 'LTDA'
        WHEN 1 THEN 'ME'
        WHEN 2 THEN 'EIRELI'
        WHEN 3 THEN 'S.A.'
        ELSE 'EPP'
      END;
    ELSE
      tipo_cliente := 'Pessoa Física';
      -- Gerar CPF fictício (11 dígitos)
      cpf_cnpj_gerado := LPAD((10000000000 + (i * 98765))::TEXT, 11, '0');
    END IF;
    
    celular_gerado := '(' || LPAD(((11 + (i % 85))::TEXT), 2, '0') || ') ' || 
                       '9' || LPAD((10000000 + i)::TEXT, 8, '0');
    
    INSERT INTO clientes (
      id, nome, cpf_cnpj, email, celular, telefone, endereco, numero, 
      bairro, cidade, estado, cep, tipo, ativo, observacoes
    ) VALUES (
      cliente_id,
      nome_completo,
      cpf_cnpj_gerado,
      LOWER(REPLACE(REPLACE(nome_completo, ' ', '.'), 'LTDA', '')) || '@email.com',
      celular_gerado,
      CASE WHEN i % 3 = 0 THEN '(16) 3' || LPAD((600000 + i)::TEXT, 7, '0') ELSE NULL END,
      'Rua ' || CASE (i % 20)
        WHEN 0 THEN 'das Flores'
        WHEN 1 THEN 'do Comércio'
        WHEN 2 THEN 'XV de Novembro'
        WHEN 3 THEN 'Marechal Deodoro'
        WHEN 4 THEN 'Sete de Setembro'
        WHEN 5 THEN 'dos Andradas'
        WHEN 6 THEN 'Voluntários da Pátria'
        WHEN 7 THEN 'Rio Branco'
        WHEN 8 THEN 'São Paulo'
        WHEN 9 THEN 'João Pessoa'
        ELSE (i % 200 + 1)::TEXT
      END,
      (i % 2000 + 1)::TEXT,
      bairros[1 + (i % 10)],
      cidades[1 + (i % 26)],
      estados[1 + (i % 26)],
      LPAD((1000000 + i)::TEXT, 8, '0') || '-' || LPAD(((i % 999)::TEXT), 3, '0'),
      tipo_cliente::tipo_cliente,
      CASE WHEN i % 25 = 0 THEN false ELSE true END,
      CASE 
        WHEN i % 30 = 0 THEN 'Cliente VIP - Desconto especial'
        WHEN i % 40 = 0 THEN 'Atacado - Grandes volumes'
        ELSE NULL
      END
    );
  END LOOP;
END $$;

-- Gerar 1000 produtos
DO $$
DECLARE
  i INTEGER;
  produto_id UUID;
  categorias UUID[] := ARRAY[
    'a1111111-1111-1111-1111-111111111111'::UUID,
    'a2222222-2222-2222-2222-222222222222'::UUID,
    'a3333333-3333-3333-3333-333333333333'::UUID,
    'a4444444-4444-4444-4444-444444444444'::UUID,
    'a5555555-5555-5555-5555-555555555555'::UUID,
    'a6666666-6666-6666-6666-666666666666'::UUID,
    'a7777777-7777-7777-7777-777777777777'::UUID,
    'a8888888-8888-8888-8888-888888888888'::UUID
  ];
  produtos_base TEXT[] := ARRAY[
    'Cartão de Visita', 'Panfleto', 'Banner', 'Adesivo Redondo', 'Impressão',
    'Carimbo Automático', 'Convite', 'Caneta Personalizada', 'Folder',
    'Adesivo Quadrado', 'Lona', 'Cartão Fidelidade', 'Bloco Personalizado',
    'Crachá', 'Adesivo Retangular', 'Carimbo Madeira', 'Papel Timbrado',
    'Envelope Personalizado', 'Sacola', 'Etiqueta Adesiva', 'Caderno Personalizado',
    'Calendário', 'Imã de Geladeira', 'Mouse Pad', 'Banner Roll-Up', 'Faixa',
    'Placa', 'Tag', 'Bobina Térmica', 'Papel Fotográfico'
  ];
  tamanhos TEXT[] := ARRAY[
    'A4', 'A5', 'A3', '10x15cm', '15x21cm', '20x30cm', '30x40cm',
    '1x1m', '2x1m', '3x2m', '0,80x1,20m', '1,20x1,80m', 'Personalizado'
  ];
  acabamentos TEXT[] := ARRAY[
    'Fosco', 'Brilho', 'Verniz UV', 'Laminado', 'Simples', 'Hot Stamping',
    'Relevo Seco', 'Especial', 'Premium', 'Couché'
  ];
  nome_produto TEXT;
  preco_base NUMERIC;
BEGIN
  FOR i IN 1..1000 LOOP
    produto_id := gen_random_uuid();
    nome_produto := produtos_base[1 + (i % 30)] || ' ' || 
                    tamanhos[1 + ((i * 3) % 13)] || ' ' ||
                    acabamentos[1 + ((i * 7) % 10)];
    
    -- Preço variado entre R$ 5 e R$ 1000
    preco_base := 5 + (i % 995) + ((i % 100) / 100.0);
    
    INSERT INTO produtos (
      id, nome, descricao, descricao_curta, codigo_barras, preco, custo,
      estoque, estoque_minimo, categoria_id, ativo, unidade_medida
    ) VALUES (
      produto_id,
      nome_produto,
      'Produto de gráfica rápida - ' || nome_produto || '. Qualidade garantida!',
      SUBSTRING(nome_produto FROM 1 FOR 50),
      '789' || LPAD(i::TEXT, 10, '0'),
      preco_base,
      (preco_base * 0.4)::NUMERIC(10,2), -- Custo = 40% do preço
      (10 + (i % 200)), -- Estoque entre 10 e 210
      (5 + (i % 20)), -- Estoque mínimo entre 5 e 25
      categorias[1 + (i % 8)],
      CASE WHEN i % 30 = 0 THEN false ELSE true END,
      CASE (i % 6)
        WHEN 0 THEN 'un'
        WHEN 1 THEN 'cx'
        WHEN 2 THEN 'm²'
        WHEN 3 THEN 'pç'
        WHEN 4 THEN 'pc'
        ELSE 'un'
      END
    );
  END LOOP;
END $$;

-- Gerar 2000 pedidos com itens
DO $$
DECLARE
  i INTEGER;
  pedido_id UUID;
  clientes_ids UUID[];
  produtos_ids UUID[];
  vendedor_id UUID;
  j INTEGER;
  qtd_itens INTEGER;
  item_produto_id UUID;
  item_preco NUMERIC;
  item_qtd INTEGER;
  item_subtotal NUMERIC;
  total_pedido NUMERIC;
  desconto_item NUMERIC;
  status_pedido TEXT;
  dias_atras INTEGER;
BEGIN
  -- Buscar IDs de clientes e produtos
  SELECT ARRAY_AGG(id) INTO clientes_ids FROM clientes WHERE ativo = true;
  SELECT ARRAY_AGG(id) INTO produtos_ids FROM produtos WHERE ativo = true;
  SELECT id INTO vendedor_id FROM perfis LIMIT 1;
  
  FOR i IN 1..2000 LOOP
    pedido_id := gen_random_uuid();
    total_pedido := 0;
    
    -- Status variado
    status_pedido := CASE (i % 6)
      WHEN 0 THEN 'Aguardando'
      WHEN 1 THEN 'Em Produção'
      WHEN 2 THEN 'Pronto'
      WHEN 3 THEN 'Concluído'
      WHEN 4 THEN 'Entregue'
      ELSE 'Em Produção'
    END;
    
    -- Pedidos distribuídos nos últimos 365 dias
    dias_atras := (i % 365);
    
    -- Inserir pedido
    INSERT INTO pedidos (
      id, numero_pedido, cliente_id, vendedor_id, status, tipo_retirada,
      prazo_entrega, unidade_prazo, total, pago, created_at, meio_pagamento,
      observacoes
    ) VALUES (
      pedido_id,
      i::TEXT,
      clientes_ids[1 + (i % ARRAY_LENGTH(clientes_ids, 1))],
      vendedor_id,
      status_pedido,
      CASE WHEN i % 3 = 0 THEN 'entrega' ELSE 'balcao' END::tipo_retirada,
      ((i % 15) + 1)::TEXT,
      CASE (i % 4)
        WHEN 0 THEN 'horas'
        WHEN 1 THEN 'dias'
        WHEN 2 THEN 'semanas'
        ELSE 'dias'
      END::unidade_prazo,
      0,
      CASE WHEN i % 4 = 0 THEN true ELSE false END,
      NOW() - (dias_atras || ' days')::INTERVAL,
      CASE (i % 5)
        WHEN 0 THEN 'PIX'
        WHEN 1 THEN 'Cartão de Crédito'
        WHEN 2 THEN 'Cartão de Débito'
        WHEN 3 THEN 'Dinheiro'
        ELSE 'Boleto'
      END,
      CASE 
        WHEN i % 20 = 0 THEN 'Cliente solicitou urgência'
        WHEN i % 25 = 0 THEN 'Revisar arte antes de imprimir'
        ELSE NULL
      END
    );
    
    -- Inserir itens do pedido (2 a 8 itens por pedido)
    qtd_itens := 2 + (i % 7);
    FOR j IN 1..qtd_itens LOOP
      item_produto_id := produtos_ids[1 + ((i * j * 17) % ARRAY_LENGTH(produtos_ids, 1))];
      SELECT preco INTO item_preco FROM produtos WHERE id = item_produto_id;
      item_qtd := 1 + (((i + j) * 13) % 50); -- Quantidade entre 1 e 50
      
      -- Desconto ocasional (10% dos itens têm desconto)
      desconto_item := CASE WHEN (i + j) % 10 = 0 THEN (item_preco * 0.1) ELSE 0 END;
      
      item_subtotal := (item_preco - desconto_item) * item_qtd;
      total_pedido := total_pedido + item_subtotal;
      
      INSERT INTO itens_pedido (
        pedido_id, produto_id, quantidade, preco_unitario, desconto, subtotal,
        observacoes
      ) VALUES (
        pedido_id,
        item_produto_id,
        item_qtd,
        item_preco,
        desconto_item,
        item_subtotal,
        CASE WHEN (i + j) % 15 = 0 THEN 'Arte aprovada pelo cliente' ELSE NULL END
      );
    END LOOP;
    
    -- Atualizar total do pedido
    UPDATE pedidos 
    SET total = total_pedido, 
        valor_final = total_pedido,
        desconto_total = (
          SELECT COALESCE(SUM(desconto * quantidade), 0)
          FROM itens_pedido
          WHERE itens_pedido.pedido_id = pedidos.id
        )
    WHERE pedidos.id = pedido_id;
  END LOOP;
END $$;
