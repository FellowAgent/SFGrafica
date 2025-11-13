-- Corrigir função gerar_numero_pedido para não usar padding de 10 dígitos
CREATE OR REPLACE FUNCTION public.gerar_numero_pedido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    proximo_numero INTEGER;
BEGIN
    -- Buscar o maior número existente (remove zeros à esquerda para comparação)
    SELECT COALESCE(MAX(
        CASE 
            WHEN numero_pedido ~ '^[0-9]+$' 
            THEN CAST(numero_pedido AS INTEGER)
            ELSE 0
        END
    ), 0) + 1
    INTO proximo_numero
    FROM public.pedidos;
    
    -- Gerar número sem padding (ex: 1, 2, 3, etc)
    NEW.numero_pedido := proximo_numero::TEXT;
    RETURN NEW;
END;
$function$;