-- Fix search_path for remaining SECURITY DEFINER functions
-- This prevents search path hijacking attacks

-- Fix assign_master_role function
CREATE OR REPLACE FUNCTION public.assign_master_role(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  master_count integer;
BEGIN
  SELECT COUNT(*) INTO master_count
  FROM public.user_roles
  WHERE role = 'master';

  IF master_count > 0 THEN
    RAISE EXCEPTION 'Master user already exists';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'master');
END;
$function$;

-- Fix create_master_user function
CREATE OR REPLACE FUNCTION public.create_master_user(p_email text, p_password text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  master_count integer;
  new_user_id uuid;
BEGIN
  SELECT COUNT(*) INTO master_count
  FROM public.user_roles
  WHERE role = 'master';

  IF master_count > 0 THEN
    RAISE EXCEPTION 'Master user already exists';
  END IF;

  -- Note: auth.create_user is not available in this context
  -- This function should only be called after user creation via Supabase Auth
  -- The function signature is kept for compatibility but should not be used directly
  
  RAISE EXCEPTION 'This function is deprecated. Use Supabase Auth to create users.';
  
  RETURN NULL;
END;
$function$;