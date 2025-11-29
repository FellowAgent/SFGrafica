import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase';
import { toast } from '@/hooks/use-toast';

export type UsuarioRole = 'master' | 'financeiro' | 'vendedor';

export interface Usuario {
  id: string;
  nome: string;
  username: string;
  role: UsuarioRole;
  ativo: boolean;
  email?: string;
  avatar_url?: string;
  nome_exibicao_pedidos?: string;
}

export interface NovoUsuario {
  nome: string;
  username: string;
  email: string;
  senha: string;
  role: UsuarioRole;
  celular?: string;
  nomeExibicao?: string;
}

export function useUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      
      // Buscar perfis com suas roles
      const { data: perfis, error: perfisError } = await supabase
        .from('perfis')
        .select(`
          id,
          nome,
          username,
          email,
          ativo,
          avatar_url,
          nome_exibicao_pedidos
        `)
        .order('nome', { ascending: true });

      if (perfisError) throw perfisError;

      // Buscar roles separadamente
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const usuariosComRoles: Usuario[] = (perfis || []).map((perfil: any) => {
        const userRole = (roles as any)?.find((r: any) => r.user_id === perfil.id);
        const role = (userRole?.role || 'vendedor') as UsuarioRole;
        
        return {
          id: perfil.id,
          nome: perfil.nome,
          username: perfil.username,
          email: perfil.email,
          role,
          ativo: perfil.ativo,
          avatar_url: perfil.avatar_url,
          nome_exibicao_pedidos: perfil.nome_exibicao_pedidos,
        };
      });

      setUsuarios(usuariosComRoles);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar usuários",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createUsuario = async (novoUsuario: NovoUsuario) => {
    try {
      // Chamar edge function para criar usuário sem fazer login automático
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: novoUsuario.email,
          password: novoUsuario.senha,
          nome: novoUsuario.nome,
          username: novoUsuario.username,
          role: novoUsuario.role,
          celular: novoUsuario.celular,
          nomeExibicao: novoUsuario.nomeExibicao,
        }
      });

      if (error) throw error;
      if (data?.error) {
        // Traduzir erros comuns para português
        let mensagemErro = data.error;
        
        if (mensagemErro.includes('A user with this email address has already been registered')) {
          mensagemErro = 'Já existe um usuário cadastrado com este e-mail';
        } else if (mensagemErro.includes('email already exists')) {
          mensagemErro = 'Este e-mail já está em uso';
        } else if (mensagemErro.includes('invalid email')) {
          mensagemErro = 'E-mail inválido';
        } else if (mensagemErro.includes('password')) {
          mensagemErro = 'Senha inválida ou muito fraca';
        }
        
        throw new Error(mensagemErro);
      }

      await fetchUsuarios();
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      const mensagemErro = error instanceof Error ? error.message : 'Erro ao criar usuário';
      toast({
        title: "Erro",
        description: mensagemErro,
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateUsuarioStatus = async (id: string, ativo: boolean) => {
    try {
      // @ts-expect-error - RPC function exists but not in types
      const { error } = await supabase
        .from('perfis')
        .update({ ativo } as any)
        .eq('id', id);

      if (error) throw error;

      setUsuarios(usuarios.map(u => 
        u.id === id ? { ...u, ativo } : u
      ));
      
      toast({
        title: "Sucesso",
        description: `Usuário ${ativo ? 'ativado' : 'desativado'} com sucesso`,
        variant: "success"
      });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status do usuário",
        variant: "destructive"
      });
    }
  };

  const deleteUsuario = async (id: string) => {
    try {
      // Call edge function instead of admin.deleteUser directly for security
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId: id }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setUsuarios(usuarios.filter(u => u.id !== id));
      toast({
        title: "Sucesso",
        description: "Usuário removido com sucesso",
        variant: "success"
      });
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao deletar usuário';
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  // Filtrar apenas usuários ativos para uso em filtros e listas
  const usuariosAtivos = usuarios.filter(u => u.ativo);

  return {
    usuarios,
    usuariosAtivos,
    loading,
    fetchUsuarios,
    createUsuario,
    updateUsuarioStatus,
    deleteUsuario,
  };
}
