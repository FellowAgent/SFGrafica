import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Verificando existência de usuários...')

    // Criar cliente admin com Service Role Key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Contar perfis existentes
    const { count, error } = await supabaseAdmin
      .from('perfis')
      .select('id', { count: 'exact', head: true })

    if (error) {
      console.error('Erro ao verificar usuários:', error)
      throw error
    }

    const hasUsers = (count || 0) > 0
    console.log(`Usuários encontrados: ${count}, hasUsers: ${hasUsers}`)

    return new Response(
      JSON.stringify({ hasUsers, count }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Erro na função check-users:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        hasUsers: true // Modo seguro: assumir que há usuários em caso de erro
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
