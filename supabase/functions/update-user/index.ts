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

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the user making the request
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      throw new Error('Unauthorized');
    }

    // Check if requesting user is master
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .single();

    if (roleError || roleData?.role !== 'master') {
      throw new Error('Only master users can update other users');
    }

    const { userId, email, password } = await req.json();

    if (!userId) {
      throw new Error('User ID is required');
    }

    const updates: any = {};
    
    // Update email if provided
    if (email) {
      updates.email = email;
      updates.email_confirm = true; // Skip email confirmation for admin updates
    }

    // Update password if provided
    if (password) {
      updates.password = password;
    }

    if (Object.keys(updates).length === 0) {
      throw new Error('No updates provided');
    }

    // Update user in auth.users
    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      updates
    );

    if (updateError) {
      console.error('Error updating user:', updateError);
      throw updateError;
    }

    // Update email in perfis table if email was changed
    if (email) {
      const { error: perfilError } = await supabaseAdmin
        .from('perfis')
        .update({ email })
        .eq('id', userId);

      if (perfilError) {
        console.error('Error updating perfil:', perfilError);
        // Don't throw - auth update succeeded
      }
    }

    console.log('User updated successfully:', userId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: email 
          ? 'Usuário atualizado com sucesso. Email atualizado sem necessidade de confirmação.' 
          : 'Usuário atualizado com sucesso.',
        user: updatedUser
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in update-user function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
