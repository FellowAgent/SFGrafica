import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermissoes, PERMISSIONS_STRUCTURE, type Permission } from '@/hooks/usePermissoes';
import { Loader2 } from 'lucide-react';

interface PermissoesTabProps {
  userId: string;
}

export function PermissoesTab({ userId }: PermissoesTabProps) {
  const { permissions, loading, updatePermission, updatePermissionWithChildren } = usePermissoes(userId);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const renderPermissionGroup = (permission: Permission) => {
    const hasChildren = permission.children && permission.children.length > 0;
    
    // Verificar se o pai está marcado OU se todos os filhos estão marcados
    let isParentChecked = permissions[permission.key] || false;
    if (hasChildren && !isParentChecked) {
      const allChildrenChecked = permission.children!.every(
        (child) => permissions[child.key] || false
      );
      isParentChecked = allChildrenChecked;
    }

    const handleParentChange = async (checked: boolean) => {
      await updatePermissionWithChildren(permission, checked);
    };

    const handleChildChange = async (childKey: string, checked: boolean) => {
      await updatePermission(childKey, checked);
      
      // Se desmarcou um filho, desmarcar o pai também
      if (!checked && hasChildren) {
        await updatePermission(permission.key, false);
      }
      
      // Se marcou um filho e todos estão marcados, marcar o pai
      if (checked && hasChildren) {
        const allOthersChecked = permission.children!.every(
          (child) => child.key === childKey ? checked : (permissions[child.key] || false)
        );
        if (allOthersChecked) {
          await updatePermission(permission.key, true);
        }
      }
    };

    return (
      <div key={permission.key} className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id={permission.key}
            checked={isParentChecked}
            onCheckedChange={handleParentChange}
          />
          <Label
            htmlFor={permission.key}
            className="text-sm font-medium cursor-pointer"
          >
            {permission.label}
          </Label>
        </div>

        {hasChildren && (
          <div className="ml-6 space-y-2">
            {permission.children!.map((child) => (
              <div key={child.key} className="flex items-center space-x-2">
                <Checkbox
                  id={child.key}
                  checked={permissions[child.key] || false}
                  onCheckedChange={(checked) =>
                    handleChildChange(child.key, checked as boolean)
                  }
                />
                <Label
                  htmlFor={child.key}
                  className="text-sm font-normal cursor-pointer"
                >
                  {child.label}
                </Label>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permissões do Usuário</CardTitle>
        <CardDescription>
          Gerencie as permissões específicas deste usuário
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="configuracoes" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
            <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
            <TabsTrigger value="clientes">Clientes</TabsTrigger>
            <TabsTrigger value="produtos">Produtos</TabsTrigger>
            <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
            <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
          </TabsList>

          <TabsContent value="configuracoes" className="space-y-4 mt-4">
            {PERMISSIONS_STRUCTURE.configuracoes.map(renderPermissionGroup)}
          </TabsContent>

          <TabsContent value="pedidos" className="space-y-4 mt-4">
            {PERMISSIONS_STRUCTURE.pedidos.map(renderPermissionGroup)}
          </TabsContent>

          <TabsContent value="clientes" className="space-y-4 mt-4">
            {PERMISSIONS_STRUCTURE.clientes.map(renderPermissionGroup)}
          </TabsContent>

          <TabsContent value="produtos" className="space-y-4 mt-4">
            {PERMISSIONS_STRUCTURE.produtos.map(renderPermissionGroup)}
          </TabsContent>

          <TabsContent value="financeiro" className="space-y-4 mt-4">
            {PERMISSIONS_STRUCTURE.financeiro.map(renderPermissionGroup)}
          </TabsContent>

          <TabsContent value="relatorios" className="space-y-4 mt-4">
            {PERMISSIONS_STRUCTURE.relatorios.map(renderPermissionGroup)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
