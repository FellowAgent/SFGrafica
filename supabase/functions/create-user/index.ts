import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';
import { z } from 'https://esm.sh/zod@3.22.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const createUserSchema = z.object({
  email: z.string().trim().email('Email inválido').max(255),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres').max(128),
  nome: z.string().trim().min(1, 'Nome obrigatório').max(200),
  username: z.string().trim().min(1, 'Username obrigatório').max(50)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username deve conter apenas letras, números, _ e -'),
  role: z.enum(['master', 'financeiro', 'vendedor'], {
    errorMap: () => ({ message: 'Role inválida' })
  }),
  celular: z.string().trim().optional(),
  nomeExibicao: z.string().trim().optional()
});

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user is authenticated
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error('User verification failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is master
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || roleData?.role !== 'master') {
      console.error('Forbidden - insufficient permissions');
      return new Response(
        JSON.stringify({ error: 'Apenas masters podem criar usuários' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get and validate the user data from the request body
    const body = await req.json();
    
    const validation = createUserSchema.safeParse(body);
    
    if (!validation.success) {
      console.error('Validation failed');
      return new Response(
        JSON.stringify({ 
          error: 'Dados inválidos',
          details: validation.error.errors 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, password, nome, username, role, celular, nomeExibicao } = validation.data;

    console.log('User creation initiated');

    // Create the user using admin API (does NOT log them in)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        nome,
        username,
      },
    });

    if (createError) {
      console.error('User creation failed');
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!newUser.user) {
      console.error('User creation failed - no user returned');
      return new Response(
        JSON.stringify({ error: 'Erro ao criar usuário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User created successfully');

    // Wait a bit for the trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 500));

    // Update profile with celular and nomeExibicao if provided
    const updates: { celular?: string; nome_exibicao_pedidos?: string } = {};
    if (celular) updates.celular = celular;
    if (nomeExibicao) updates.nome_exibicao_pedidos = nomeExibicao;
    
    if (Object.keys(updates).length > 0) {
      const { error: profileUpdateError } = await supabaseAdmin
        .from('perfis')
        .update(updates)
        .eq('id', newUser.user.id);

      if (profileUpdateError) {
        console.error('Error updating profile:', profileUpdateError);
      }
    }

    // Assign role to the new user
    const { error: roleAssignError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: role,
      });

    if (roleAssignError) {
      console.error('Error assigning role:', roleAssignError);
      // User was created but role assignment failed
      return new Response(
        JSON.stringify({ 
          error: 'Usuário criado mas erro ao atribuir role',
          userId: newUser.user.id 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Role assigned successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        userId: newUser.user.id,
        email: newUser.user.email 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
