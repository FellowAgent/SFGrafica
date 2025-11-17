-- Atualizar a function gerar_numero_pedido para usar padding de 10 dígitos sem prefixo
CREATE OR REPLACE FUNCTION public.gerar_numero_pedido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    proximo_numero INTEGER;
BEGIN
    -- Buscar o maior número existente (apenas números puros, sem prefixo)
    SELECT COALESCE(MAX(CAST(numero_pedido AS INTEGER)), -1) + 1
    INTO proximo_numero
    FROM public.pedidos
    WHERE numero_pedido ~ '^[0-9]+$';
    
    -- Gerar número com padding de 10 dígitos (ex: 0000000000, 0000000001, etc)
    NEW.numero_pedido := LPAD(proximo_numero::TEXT, 10, '0');
    RETURN NEW;
END;
$$;

-- Migrar dados existentes: remover prefixo "PED-" e aplicar padding de 10 dígitos
UPDATE public.pedidos
SET numero_pedido = LPAD(SUBSTRING(numero_pedido FROM 5), 10, '0')
WHERE numero_pedido LIKE 'PED-%';

-- Garantir que pedidos que já estão sem prefixo também tenham padding de 10 dígitos
UPDATE public.pedidos
SET numero_pedido = LPAD(numero_pedido, 10, '0')
WHERE numero_pedido ~ '^[0-9]+$' AND LENGTH(numero_pedido) < 10;