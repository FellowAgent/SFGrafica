-- Corrigir search_path da função calcular_total_pedido
DROP FUNCTION IF EXISTS public.calcular_total_pedido() CASCADE;

CREATE OR REPLACE FUNCTION public.calcular_total_pedido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.pedidos
    SET 
        total = (
            SELECT COALESCE(SUM(subtotal), 0)
            FROM public.itens_pedido
            WHERE pedido_id = NEW.pedido_id
        ),
        desconto_total = (
            SELECT COALESCE(SUM(desconto * quantidade), 0)
            FROM public.itens_pedido
            WHERE pedido_id = NEW.pedido_id
        )
    WHERE id = NEW.pedido_id;
    
    UPDATE public.pedidos
    SET valor_final = total - desconto_total
    WHERE id = NEW.pedido_id;
    
    RETURN NEW;
END;
$$;

-- Corrigir search_path da função gerar_numero_pedido
DROP FUNCTION IF EXISTS public.gerar_numero_pedido() CASCADE;

CREATE OR REPLACE FUNCTION public.gerar_numero_pedido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    proximo_numero INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_pedido FROM '[0-9]+') AS INTEGER)), 0) + 1
    INTO proximo_numero
    FROM public.pedidos;
    
    NEW.numero_pedido := 'PED-' || LPAD(proximo_numero::TEXT, 6, '0');
    RETURN NEW;
END;
$$;

-- Recriar triggers
CREATE TRIGGER trigger_calcular_total_pedido
    AFTER INSERT OR UPDATE ON public.itens_pedido
    FOR EACH ROW
    EXECUTE FUNCTION public.calcular_total_pedido();

CREATE TRIGGER trigger_gerar_numero_pedido
    BEFORE INSERT ON public.pedidos
    FOR EACH ROW
    WHEN (NEW.numero_pedido IS NULL OR NEW.numero_pedido = '')
    EXECUTE FUNCTION public.gerar_numero_pedido();