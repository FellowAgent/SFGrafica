import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';
import postgres from 'https://deno.land/x/postgresjs@v3.4.3/mod.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestRequest {
  databaseUrl?: string;
  supabaseUrl?: string;
  serviceRoleKey?: string;
}

Deno.serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let pgClient: ReturnType<typeof postgres> | null = null;

  try {
    const body = await req.json().catch(() => ({})) as TestRequest;
    
    // Test direct Postgres connection if databaseUrl is provided
    if (body.databaseUrl?.trim()) {
      console.log('Testando conexão direta com PostgreSQL...');
      
      try {
        pgClient = postgres(body.databaseUrl.trim(), {
          prepare: false,
          idle_timeout: 10,
          connect_timeout: 10,
          max: 1,
        });

        // Test the connection with a simple query
        const result = await pgClient`SELECT 1 as test, current_database() as database, current_user as user`;
        
        if (result && result.length > 0) {
          return new Response(
            JSON.stringify({
              success: true,
              message: 'Conexão PostgreSQL estabelecida com sucesso!',
              details: {
                database: result[0].database,
                user: result[0].user,
              },
              timestamp: new Date().toISOString(),
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        throw new Error('Consulta retornou resultado vazio');
      } catch (pgError: any) {
        console.error('Erro na conexão PostgreSQL:', pgError);
        
        return new Response(
          JSON.stringify({
            success: false,
            error: pgError?.message || 'Falha na conexão PostgreSQL',
            details: pgError?.code || undefined,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Test Supabase API connection with Service Role Key
    const serviceRoleKey = body.serviceRoleKey || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = body.supabaseUrl || Deno.env.get('SUPABASE_URL');

    if (!serviceRoleKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Service Role Key não fornecida',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!supabaseUrl) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'URL do Supabase não fornecida',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create client with Service Role Key
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Test the connection with exec_sql if available
    const { data, error } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: 'SELECT 1;',
    });

    if (error) {
      // If exec_sql doesn't exist, try a simple query
      const { error: fallbackError } = await supabaseAdmin
        .from('perfis')
        .select('count')
        .limit(1);

      if (fallbackError) {
        return new Response(
          JSON.stringify({
            success: false,
            error: fallbackError.message,
            details: 'Erro ao testar conexão com Service Role Key',
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Service Role Key validada com sucesso!',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao testar conexão';

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } finally {
    if (pgClient) {
      try {
        await pgClient.end({ timeout: 5 });
      } catch (err) {
        console.warn('Erro ao fechar conexão PostgreSQL:', err);
      }
    }
  }
});
