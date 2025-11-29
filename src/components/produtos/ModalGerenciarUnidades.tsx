import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { useUnidadesMedida } from '@/hooks/useUnidadesMedida';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ModalGerenciarUnidadesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ModalGerenciarUnidades({
  open,
  onOpenChange,
}: ModalGerenciarUnidadesProps) {
  const { unidades, loading, createUnidade, updateUnidade, deleteUnidade } = useUnidadesMedida();
  const [novaSigla, setNovaSigla] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editSigla, setEditSigla] = useState('');
  const [editNome, setEditNome] = useState('');
  const [deletandoId, setDeletandoId] = useState<string | null>(null);

  // Ordenar unidades por nome em ordem alfabética
  const unidadesOrdenadas = useMemo(() => {
    return [...unidades].sort((a, b) => 
      a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
    );
  }, [unidades]);

  const handleCreate = async () => {
    if (!novaSigla.trim() || !novoNome.trim()) return;

    try {
      await createUnidade(novaSigla, novoNome);
      setNovaSigla('');
      setNovoNome('');
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const handleEdit = (id: string, sigla: string, nome: string) => {
    setEditandoId(id);
    setEditSigla(sigla);
    setEditNome(nome);
  };

  const handleSaveEdit = async () => {
    if (!editandoId || !editSigla.trim() || !editNome.trim()) return;

    try {
      await updateUnidade(editandoId, editSigla, editNome);
      setEditandoId(null);
      setEditSigla('');
      setEditNome('');
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const handleCancelEdit = () => {
    setEditandoId(null);
    setEditSigla('');
    setEditNome('');
  };

  const handleDelete = async () => {
    if (!deletandoId) return;

    try {
      await deleteUnidade(deletandoId);
      setDeletandoId(null);
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Gerenciar Unidades de Medida</DialogTitle>
            <DialogDescription>
              Adicione, edite ou remova unidades de medida customizadas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Formulário de nova unidade */}
            <div className="p-4 border rounded-lg bg-muted/50">
              <h3 className="text-sm font-medium mb-3">Nova Unidade</h3>
              <div className="grid grid-cols-[120px_1fr_auto] gap-3">
                <div>
                  <Label htmlFor="nova-sigla">Sigla</Label>
                  <Input
                    id="nova-sigla"
                    value={novaSigla}
                    onChange={(e) => setNovaSigla(e.target.value)}
                    placeholder="ex: un"
                    maxLength={10}
                  />
                </div>
                <div>
                  <Label htmlFor="novo-nome">Nome Completo</Label>
                  <Input
                    id="novo-nome"
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    placeholder="ex: Unidade"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleCreate}
                    disabled={!novaSigla.trim() || !novoNome.trim()}
                    size="default"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
              </div>
            </div>

            {/* Lista de unidades */}
            <div>
              <h3 className="text-sm font-medium mb-3">Unidades Cadastradas</h3>
              <ScrollArea className="h-[400px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Sigla</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead className="w-[120px] text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : unidadesOrdenadas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          Nenhuma unidade cadastrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      unidadesOrdenadas.map((unidade) => (
                        <TableRow key={unidade.id}>
                          {editandoId === unidade.id ? (
                            <>
                              <TableCell>
                                <Input
                                  value={editSigla}
                                  onChange={(e) => setEditSigla(e.target.value)}
                                  maxLength={10}
                                  className="h-8"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={editNome}
                                  onChange={(e) => setEditNome(e.target.value)}
                                  className="h-8"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleSaveEdit}
                                    disabled={!editSigla.trim() || !editNome.trim()}
                                  >
                                    <Check className="h-4 w-4 text-green-600" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleCancelEdit}
                                  >
                                    <X className="h-4 w-4 text-red-600" />
                                  </Button>
                                </div>
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell className="font-medium">
                                {unidade.sigla}
                              </TableCell>
                              <TableCell>{unidade.nome}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      handleEdit(unidade.id, unidade.sigla, unidade.nome)
                                    }
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setDeletandoId(unidade.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletandoId} onOpenChange={() => setDeletandoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta unidade de medida? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
