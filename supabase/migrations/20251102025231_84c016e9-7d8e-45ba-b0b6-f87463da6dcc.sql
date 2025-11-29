-- Add celular field to perfis table
ALTER TABLE public.perfis
ADD COLUMN IF NOT EXISTS celular text;