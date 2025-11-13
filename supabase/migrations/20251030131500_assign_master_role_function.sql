-- Security definer function that assigns the first master role.
DROP FUNCTION IF EXISTS public.assign_master_role(uuid);

CREATE OR REPLACE FUNCTION public.assign_master_role(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION public.assign_master_role(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.assign_master_role(uuid) TO authenticated;
