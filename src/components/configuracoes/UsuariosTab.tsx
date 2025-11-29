import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { MoreVertical, Trash2, Loader2, Download, Edit, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useUsuarios, type UsuarioRole } from "@/hooks/useUsuarios";
import { useUserRole } from "@/hooks/useUserRole";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export const UsuariosTab = () => {
  const navigate = useNavigate();
  const { usuarios, loading, updateUsuarioStatus, deleteUsuario } = useUsuarios();
  const { isMaster } = useUserRole();
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const selectedUser = usuarios.find(u => u.id === selectedUserId);

  const getRoleBadge = (role: UsuarioRole) => {
    const config = {
      master: { variant: "default" as const, label: "Master" },
      financeiro: { variant: "secondary" as const, label: "Financeiro" },
      vendedor: { variant: "outline" as const, label: "Funcionário" },
    };

    const { variant, label } = config[role];
    return <Badge variant={variant}>{label}</Badge>;
  };

  const handleToggleStatus = async (id: string, novoStatus: boolean) => {
    await updateUsuarioStatus(id, novoStatus);
  };

  const handleDeleteClick = (id: string) => {
    setUserToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (userToDelete) {
      await deleteUsuario(userToDelete);
      setUserToDelete(null);
      setIsDeleteDialogOpen(false);
      setSelectedUserId(null);
    }
  };

  const handleEdit = (userId: string) => {
    navigate(`/editar-usuario/${userId}`);
  };

  const handleExport = () => {
    if (!selectedUser) return;
    
    // Criar CSV com dados do usuário
    const csvData = [
      ['Nome', 'Usuário', 'Email', 'Permissão', 'Status'],
      [
        selectedUser.nome,
        selectedUser.username,
        selectedUser.email || '-',
        selectedUser.role,
        selectedUser.ativo ? 'Ativo' : 'Inativo'
      ]
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `usuario_${selectedUser.username}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Sucesso",
      description: "Usuário exportado com sucesso",
      variant: "success"
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        {selectedUserId ? (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleEdit(selectedUserId)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleExport}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleDeleteClick(selectedUserId)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Apagar
            </Button>
          </div>
        ) : (
          <div />
        )}
        
        {isMaster && (
          <Button 
            variant="add" 
            onClick={() => navigate('/adicionar-usuario')}
          >
            Adicionar Usuário
          </Button>
        )}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <RadioGroup value={selectedUserId || ''} onValueChange={setSelectedUserId}>
                  <RadioGroupItem 
                    value="" 
                    className="opacity-0 pointer-events-none" 
                  />
                </RadioGroup>
              </TableHead>
              <TableHead className="w-[60px]">Foto</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Nome de Exibição</TableHead>
              <TableHead>E-mail/Nome do Usuário</TableHead>
              <TableHead>Permissão</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhum usuário cadastrado
                </TableCell>
              </TableRow>
            ) : (
              usuarios.map((usuario) => (
                <TableRow 
                  key={usuario.id}
                  className={selectedUserId === usuario.id ? 'bg-muted/50' : ''}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <RadioGroup value={selectedUserId || ''} onValueChange={setSelectedUserId}>
                      <RadioGroupItem value={usuario.id} />
                    </RadioGroup>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleEdit(usuario.id)}
                      className="focus:outline-none hover:opacity-80 transition-opacity"
                    >
                      <Avatar className="h-10 w-10 cursor-pointer">
                        <AvatarImage 
                          src={usuario.avatar_url ? `${usuario.avatar_url}?t=${Date.now()}` : undefined} 
                          className="object-cover" 
                        />
                        <AvatarFallback className="bg-muted">
                          {usuario.nome ? (
                            usuario.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
                          ) : (
                            <User className="h-5 w-5 text-muted-foreground" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleEdit(usuario.id)}
                      className="font-bold text-left hover:underline focus:outline-none"
                    >
                      {usuario.nome}
                    </button>
                  </TableCell>
                  <TableCell>{usuario.username}</TableCell>
                  <TableCell>{usuario.email || '-'}</TableCell>
                  <TableCell>{getRoleBadge(usuario.role)}</TableCell>
                  <TableCell>
                    <Switch
                      checked={usuario.ativo}
                      onCheckedChange={(checked) => handleToggleStatus(usuario.id, checked)}
                      onClick={(e) => e.stopPropagation()}
                      disabled={usuario.role === 'master'}
                    />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleEdit(usuario.id)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUserId(usuario.id);
                            handleExport();
                          }}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Exportar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(usuario.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Apagar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
