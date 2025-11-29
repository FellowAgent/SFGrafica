import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DestinationConfig {
  supabaseUrl: string
  serviceRoleKey: string
}

interface ResetRequest {
  destination: DestinationConfig
}

const RESET_SQL = `
DO $$
BEGIN
  EXECUTE 'DROP SCHEMA IF EXISTS public CASCADE';
  EXECUTE 'CREATE SCHEMA public AUTHORIZATION postgres';
  EXECUTE 'GRANT ALL ON SCHEMA public TO postgres';
  EXECUTE 'GRANT ALL ON SCHEMA public TO public';

  EXECUTE $func$
    CREATE OR REPLACE FUNCTION public.exec_sql(sql_query text)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO 'public'
    AS $body$
    DECLARE
      result JSONB;
    BEGIN
      EXECUTE sql_query;
      RETURN jsonb_build_object('success', true);
    EXCEPTION
      WHEN OTHERS THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', SQLERRM,
          'detail', SQLSTATE
        );
    END;
    $body$;
  $func$;

  EXECUTE $func_query$
    CREATE OR REPLACE FUNCTION public.exec_sql_query(sql_query text)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO 'public'
    AS $body$
    DECLARE
      result JSONB;
    BEGIN
      EXECUTE format('SELECT jsonb_agg(row_to_json(t)) FROM (%s) t', sql_query) INTO result;
      RETURN COALESCE(result, '[]'::jsonb);
    EXCEPTION
      WHEN OTHERS THEN
        RETURN jsonb_build_object(
          'error', SQLERRM,
          'detail', SQLSTATE
        );
    END;
    $body$;
  $func_query$;

  PERFORM pg_notify('pgrst', 'reload schema');
END;
$$;
`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = (await req.json()) as ResetRequest
    if (!body.destination?.supabaseUrl || !body.destination?.serviceRoleKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Informe URL e Service Role Key do destino.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const destClient = createClient(body.destination.supabaseUrl, body.destination.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    await destClient.rpc('exec_sql', { sql_query: 'BEGIN;' })
    const { error } = await destClient.rpc('exec_sql', { sql_query: RESET_SQL })

    if (error) {
      await destClient.rpc('exec_sql', { sql_query: 'ROLLBACK;' })
      throw new Error(error.message || 'Erro ao esvaziar banco de destino')
    }

    await destClient.rpc('exec_sql', { sql_query: 'COMMIT;' })

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Erro ao resetar banco destino:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})

