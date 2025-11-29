import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase';
import { toast } from '@/utils/toastHelper';

export interface Permission {
  key: string;
  label: string;
  children?: Permission[];
}

export const PERMISSIONS_STRUCTURE: Record<string, Permission[]> = {
  configuracoes: [
    {
      key: 'config',
      label: 'Configurações',
      children: [
        { key: 'config.acessar', label: 'Acessar Configurações' },
        { key: 'config.usuarios', label: 'Acessar Usuários' },
        { key: 'config.aparencia', label: 'Acessar Aparência' },
        { key: 'config.pedidos', label: 'Acessar Pedidos' },
      ],
    },
  ],
  pedidos: [
    {
      key: 'pedidos',
      label: 'Pedidos',
      children: [
        { key: 'pedidos.criar', label: 'Criar Pedidos' },
        { key: 'pedidos.editar', label: 'Editar Pedidos' },
        { key: 'pedidos.excluir', label: 'Excluir Pedidos' },
        { key: 'pedidos.checkout', label: 'Acessar o Checkout' },
      ],
    },
  ],
  clientes: [
    {
      key: 'clientes',
      label: 'Clientes',
      children: [
        { key: 'clientes.visualizar', label: 'Visualizar Clientes' },
        { key: 'clientes.incluir', label: 'Incluir Clientes' },
        { key: 'clientes.editar', label: 'Editar Clientes' },
        { key: 'clientes.excluir', label: 'Excluir Clientes' },
        { key: 'clientes.exportar', label: 'Exportar Dados para Planilha' },
      ],
    },
  ],
  produtos: [
    {
      key: 'produtos',
      label: 'Produtos',
      children: [
        { key: 'produtos.visualizar', label: 'Visualizar Produtos' },
        { key: 'produtos.incluir', label: 'Incluir Produtos' },
        { key: 'produtos.editar', label: 'Editar Produtos' },
        { key: 'produtos.excluir', label: 'Excluir Produtos' },
        { key: 'produtos.exportar', label: 'Exportar Produtos para Planilha' },
      ],
    },
    {
      key: 'categorias',
      label: 'Categorias',
      children: [
        { key: 'categorias.visualizar', label: 'Visualizar Categorias' },
        { key: 'categorias.incluir', label: 'Incluir Categorias' },
        { key: 'categorias.editar', label: 'Editar Categorias' },
        { key: 'categorias.excluir', label: 'Excluir Categorias' },
        { key: 'categorias.exportar', label: 'Exportar Categorias para Planilha' },
      ],
    },
  ],
  financeiro: [
    {
      key: 'financeiro',
      label: 'Financeiro',
      children: [
        { key: 'financeiro.visualizar', label: 'Visualizar Valores' },
        { key: 'financeiro.nf', label: 'Gerar Nota Fiscal' },
      ],
    },
  ],
  relatorios: [
    {
      key: 'relatorios',
      label: 'Relatórios',
      children: [
        { key: 'relatorios.visualizar', label: 'Visualizar Relatórios' },
        { key: 'relatorios.exportar', label: 'Exportar Categorias para Planilha' },
      ],
    },
  ],
};

export function usePermissoes(userId: string | undefined) {
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const fetchPermissions = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_permissions')
        .select('permission_key, enabled')
        .eq('user_id', userId);

      if (error) throw error;

      const permissionsMap: Record<string, boolean> = {};
      data?.forEach((p) => {
        permissionsMap[p.permission_key] = p.enabled;
      });

      setPermissions(permissionsMap);
    } catch (error) {
      console.error('Erro ao carregar permissões:', error);
      toast.error('Erro ao carregar permissões');
    } finally {
      setLoading(false);
    }
  };

  const updatePermission = async (permissionKey: string, enabled: boolean) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('user_permissions')
        .upsert({
          user_id: userId,
          permission_key: permissionKey,
          enabled,
        });

      if (error) throw error;

      setPermissions((prev) => ({ ...prev, [permissionKey]: enabled }));
    } catch (error) {
      console.error('Erro ao atualizar permissão:', error);
      toast.error('Erro ao atualizar permissão');
    }
  };

  const updatePermissionWithChildren = async (
    permission: Permission,
    enabled: boolean
  ) => {
    const keysToUpdate: string[] = [permission.key];

    if (permission.children) {
      permission.children.forEach((child) => {
        keysToUpdate.push(child.key);
      });
    }

    try {
      const updates = keysToUpdate.map((key) => ({
        user_id: userId!,
        permission_key: key,
        enabled,
      }));

      const { error } = await supabase
        .from('user_permissions')
        .upsert(updates);

      if (error) throw error;

      const newPermissions = { ...permissions };
      keysToUpdate.forEach((key) => {
        newPermissions[key] = enabled;
      });
      setPermissions(newPermissions);
    } catch (error) {
      console.error('Erro ao atualizar permissões:', error);
      toast.error('Erro ao atualizar permissões');
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, [userId]);

  return {
    permissions,
    loading,
    updatePermission,
    updatePermissionWithChildren,
  };
}
