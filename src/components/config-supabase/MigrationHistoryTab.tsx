import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, CheckCircle, XCircle, RotateCcw, Eye, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/utils/toastHelper';
import { format } from 'date-fns';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface MigrationHistory {
  id: string;
  migration_name: string;
  file_name: string | null;
  sql_content: string;
  executed_at: string;
  status: 'success' | 'failed' | 'rolled_back' | 'executing';
  method: 'option1' | 'option2' | 'option3';
  operations_total: number;
  operations_successful: number;
  operations_failed: number;
  duration_ms: number | null;
  error_message: string | null;
  can_rollback: boolean;
  rollback_sql: string | null;
}

export function MigrationHistoryTab() {
  const [history, setHistory] = useState<MigrationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMigration, setSelectedMigration] = useState<MigrationHistory | null>(null);
  const [showSqlDialog, setShowSqlDialog] = useState(false);
  const [showRollbackDialog, setShowRollbackDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('migration_history')
        .select('*')
        .order('executed_at', { ascending: false });

      if (error) throw error;
      setHistory((data || []) as MigrationHistory[]);
    } catch (err) {
      console.error('Error fetching migration history:', err);
      toast.error('Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async () => {
    if (!selectedMigration) return;

    try {
      const { error } = await supabase
        .from('migration_history')
        .delete()
        .eq('id', selectedMigration.id);

      if (error) throw error;

      toast.success('Registro removido do histórico');
      setShowDeleteDialog(false);
      setSelectedMigration(null);
      fetchHistory();
    } catch (err) {
      console.error('Error deleting migration:', err);
      toast.error('Erro ao remover registro');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800 border-green-300">✓ Sucesso</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 border-red-300">✗ Falhou</Badge>;
      case 'rolled_back':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">↶ Revertido</Badge>;
      case 'executing':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">⏳ Executando</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'option1':
        return <Badge variant="outline">🛡️ Validação</Badge>;
      case 'option2':
        return <Badge variant="outline">⚡ Automática</Badge>;
      case 'option3':
        return <Badge variant="outline">🔄 Híbrida</Badge>;
      default:
        return <Badge variant="outline">{method}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Migrações
          </CardTitle>
          <CardDescription>
            Todas as migrações executadas no banco de dados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando histórico...
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma migração executada ainda
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {history.map((migration) => (
                  <Card key={migration.id} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{migration.migration_name}</h4>
                            {getStatusBadge(migration.status)}
                            {getMethodBadge(migration.method)}
                          </div>
                          {migration.file_name && (
                            <p className="text-sm text-muted-foreground">
                              Arquivo: {migration.file_name}
                            </p>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground text-right">
                          {format(new Date(migration.executed_at), 'dd/MM/yyyy HH:mm:ss')}
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-3 text-sm mb-3">
                        <div>
                          <span className="text-muted-foreground">Total:</span>
                          <span className="ml-2 font-semibold">{migration.operations_total}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Sucesso:</span>
                          <span className="ml-2 font-semibold text-green-600">
                            {migration.operations_successful}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Falhas:</span>
                          <span className="ml-2 font-semibold text-red-600">
                            {migration.operations_failed}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Duração:</span>
                          <span className="ml-2 font-semibold">
                            {migration.duration_ms ? `${migration.duration_ms}ms` : '-'}
                          </span>
                        </div>
                      </div>

                      {migration.error_message && (
                        <div className="p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 mb-3">
                          <p className="text-sm text-red-700 dark:text-red-300 font-mono">
                            {migration.error_message}
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedMigration(migration);
                            setShowSqlDialog(true);
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Ver SQL
                        </Button>
                        {migration.can_rollback && migration.status !== 'rolled_back' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedMigration(migration);
                              setShowRollbackDialog(true);
                            }}
                          >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Rollback
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedMigration(migration);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remover
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* SQL Dialog */}
      <Dialog open={showSqlDialog} onOpenChange={setShowSqlDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>SQL da Migração</DialogTitle>
            <DialogDescription>
              {selectedMigration?.migration_name}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px]">
            <pre className="p-4 rounded-lg bg-muted font-mono text-xs">
              {selectedMigration?.sql_content}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Rollback Dialog */}
      <AlertDialog open={showRollbackDialog} onOpenChange={setShowRollbackDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Confirmar Rollback</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a reverter a migração: <strong>{selectedMigration?.migration_name}</strong>
              <br /><br />
              Esta ação executará o SQL de rollback para desfazer as alterações.
              <br /><br />
              <strong>Esta operação não pode ser desfeita!</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                toast.info('Funcionalidade de rollback em desenvolvimento');
                setShowRollbackDialog(false);
              }}
            >
              Executar Rollback
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Registro</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a remover este registro do histórico: <strong>{selectedMigration?.migration_name}</strong>
              <br /><br />
              Isso não afeta o banco de dados, apenas remove o registro do histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
