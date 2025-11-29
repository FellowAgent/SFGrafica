import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('Iniciando verificação de emails pendentes...');

    // Calcular data de 7 dias atrás
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Buscar todos os perfis
    const { data: perfis, error: perfisError } = await supabaseAdmin
      .from('perfis')
      .select('id, nome, email');

    if (perfisError) {
      console.error('Erro ao buscar perfis:', perfisError);
      throw perfisError;
    }

    console.log(`Verificando ${perfis?.length || 0} usuários...`);

    const usuariosPendentes: { id: string; nome: string; email: string; diasPendente: number }[] = [];

    // Verificar cada usuário
    for (const perfil of perfis || []) {
      try {
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(perfil.id);

        if (authError) {
          console.error(`Erro ao buscar usuário ${perfil.id}:`, authError);
          continue;
        }

        // Verificar se email não foi confirmado
        if (!authData.user.email_confirmed_at) {
          const createdAt = new Date(authData.user.created_at);
          const diasPendente = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

          // Se passou mais de 7 dias
          if (createdAt < sevenDaysAgo) {
            usuariosPendentes.push({
              id: perfil.id,
              nome: perfil.nome,
              email: perfil.email || authData.user.email || '',
              diasPendente
            });
          }
        }
      } catch (error) {
        console.error(`Erro ao processar usuário ${perfil.id}:`, error);
      }
    }

    console.log(`Encontrados ${usuariosPendentes.length} usuários com emails pendentes há mais de 7 dias`);

    // Se houver usuários pendentes, criar notificações para admins
    if (usuariosPendentes.length > 0) {
      // Buscar todos os usuários master
      const { data: masterRoles, error: masterError } = await supabaseAdmin
        .from('user_roles')
        .select('user_id')
        .eq('role', 'master');

      if (masterError) {
        console.error('Erro ao buscar masters:', masterError);
        throw masterError;
      }

      console.log(`Enviando notificações para ${masterRoles?.length || 0} admins...`);

      // Criar notificações para cada admin
      for (const masterRole of masterRoles || []) {
        // Verificar se já existe uma notificação recente (últimas 24h) para evitar spam
        const { data: notificacoesRecentes } = await supabaseAdmin
          .from('notificacoes')
          .select('id')
          .eq('user_id', masterRole.user_id)
          .eq('tipo', 'email_pendente')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .single();

        // Se já existe notificação recente, pular
        if (notificacoesRecentes) {
          console.log(`Admin ${masterRole.user_id} já recebeu notificação nas últimas 24h`);
          continue;
        }

        const mensagem = usuariosPendentes.length === 1
          ? `${usuariosPendentes[0].nome} (${usuariosPendentes[0].email}) está há ${usuariosPendentes[0].diasPendente} dias sem confirmar o email.`
          : `${usuariosPendentes.length} usuários estão há mais de 7 dias sem confirmar seus emails.`;

        const { error: notifError } = await supabaseAdmin
          .from('notificacoes')
          .insert({
            user_id: masterRole.user_id,
            tipo: 'email_pendente',
            titulo: '⚠️ Emails Pendentes de Confirmação',
            mensagem: mensagem,
            link: '/loja/configuracoes?tab=emails',
          });

        if (notifError) {
          console.error('Erro ao criar notificação:', notifError);
        } else {
          console.log(`Notificação criada para admin ${masterRole.user_id}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        usuariosPendentes: usuariosPendentes.length,
        notificacoesEnviadas: true,
        detalhes: usuariosPendentes.map(u => ({ 
          nome: u.nome, 
          email: u.email, 
          diasPendente: u.diasPendente 
        }))
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Erro na verificação de emails pendentes:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
