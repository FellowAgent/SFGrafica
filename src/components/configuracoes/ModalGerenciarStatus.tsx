import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Pencil, Trash2, Save, X, Package } from "lucide-react";
import { toast } from "@/utils/toastHelper";
import { useStatusConfig, StatusConfig } from "@/hooks/useStatusConfig";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface ModalGerenciarStatusProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ModalGerenciarStatus({ open, onOpenChange }: ModalGerenciarStatusProps) {
  const { status, loading, createStatus, updateStatus, deleteStatus } = useStatusConfig();
  
  // Estados de edição
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [editingStatusNome, setEditingStatusNome] = useState("");
  const [editingStatusCor, setEditingStatusCor] = useState("");
  const [editingStatusTextColor, setEditingStatusTextColor] = useState("#000000");
  const [statusEntrega, setStatusEntrega] = useState<string>("");

  // Organizar status em ordem alfabética
  const statusOrdenados = [...status].sort((a, b) => a.nome.localeCompare(b.nome));

  // Carregar status de entrega atual
  useEffect(() => {
    const statusEntregaAtual = status.find(s => s.is_status_entrega);
    if (statusEntregaAtual) {
      setStatusEntrega(statusEntregaAtual.id);
    }
  }, [status]);

  const adicionarStatus = async () => {
    try {
      const maxOrdem = Math.max(...status.map(s => s.ordem), 0);
      await createStatus({
        nome: "novo status",
        cor: "#e5e7eb",
        text_color: "#374151",
        ordem: maxOrdem + 1,
        exibir_no_inicio: true,
      });
    } catch (error) {
      console.error('Erro ao adicionar status:', error);
    }
  };

  const removerStatus = async (id: string) => {
    try {
      // Verificar se é o status de entrega
      const statusParaRemover = status.find(s => s.id === id);
      if (statusParaRemover?.is_status_entrega) {
        toast.warning("Remova primeiro a marcação de 'Status de Entrega' antes de excluir");
        return;
      }
      await deleteStatus(id);
    } catch (error) {
      console.error('Erro ao remover status:', error);
    }
  };

  const iniciarEdicao = (s: StatusConfig) => {
    setEditingStatusId(s.id);
    setEditingStatusNome(s.nome);
    setEditingStatusCor(s.cor);
    setEditingStatusTextColor(s.text_color);
  };

  const cancelarEdicao = () => {
    setEditingStatusId(null);
    setEditingStatusNome("");
    setEditingStatusCor("");
    setEditingStatusTextColor("#000000");
  };

  const salvarEdicao = async () => {
    if (!editingStatusId) return;
    
    try {
      await updateStatus(editingStatusId, {
        nome: editingStatusNome,
        cor: editingStatusCor,
        text_color: editingStatusTextColor,
      });
      cancelarEdicao();
    } catch (error) {
      console.error('Erro ao salvar status:', error);
    }
  };

  const handleStatusEntregaChange = async (statusId: string) => {
    try {
      // Desmarcar o anterior
      if (statusEntrega) {
        await updateStatus(statusEntrega, { is_status_entrega: false });
      }
      
      // Marcar o novo
      if (statusId) {
        await updateStatus(statusId, { is_status_entrega: true });
        setStatusEntrega(statusId);
        toast.success("Status de entrega atualizado!");
      }
    } catch (error) {
      console.error('Erro ao atualizar status de entrega:', error);
      toast.error("Erro ao atualizar status de entrega");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Gerenciar Status de Pedidos
          </DialogTitle>
          <DialogDescription>
            Configure os status dos pedidos, suas cores e defina qual status gera o código de entrega
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Lista de Status */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Status Cadastrados ({statusOrdenados.length})</h3>
                <Button onClick={adicionarStatus} size="sm" variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar Status
                </Button>
              </div>

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando status...
                </div>
              ) : statusOrdenados.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum status cadastrado
                </div>
              ) : (
                <div className="space-y-2">
                  {statusOrdenados.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      {editingStatusId === s.id ? (
                        // Modo de edição
                        <>
                          <div className="flex-1 grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Nome do Status</Label>
                              <Input
                                value={editingStatusNome}
                                onChange={(e) => setEditingStatusNome(e.target.value)}
                                placeholder="Nome do status"
                                className="h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Cor de Fundo</Label>
                              <div className="flex gap-2">
                                <Input
                                  type="color"
                                  value={editingStatusCor}
                                  onChange={(e) => setEditingStatusCor(e.target.value)}
                                  className="h-8 w-20 cursor-pointer"
                                />
                                <Input
                                  type="text"
                                  value={editingStatusCor}
                                  onChange={(e) => setEditingStatusCor(e.target.value)}
                                  className="h-8 flex-1"
                                />
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs">Cor do Texto</Label>
                              <div className="flex gap-2">
                                <Input
                                  type="color"
                                  value={editingStatusTextColor}
                                  onChange={(e) => setEditingStatusTextColor(e.target.value)}
                                  className="h-8 w-20 cursor-pointer"
                                />
                                <Input
                                  type="text"
                                  value={editingStatusTextColor}
                                  onChange={(e) => setEditingStatusTextColor(e.target.value)}
                                  className="h-8 flex-1"
                                />
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs mb-1 block">Preview</Label>
                              <Badge
                                className="h-8 px-4"
                                style={{
                                  backgroundColor: editingStatusCor,
                                  color: editingStatusTextColor,
                                }}
                              >
                                {editingStatusNome}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={salvarEdicao}
                              className="h-8 w-8 p-0"
                            >
                              <Save className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelarEdicao}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </>
                      ) : (
                        // Modo de visualização
                        <>
                          <Badge
                            className="min-w-[120px] justify-center"
                            style={{
                              backgroundColor: s.cor,
                              color: s.text_color,
                            }}
                          >
                            {s.nome}
                          </Badge>
                          <span className="flex-1 text-sm font-medium">{s.nome}</span>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => iniciarEdicao(s)}
                              className="h-8 w-8 p-0"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removerStatus(s.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Seleção de Status de Entrega */}
            {statusOrdenados.length > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <div>
                  <h3 className="text-sm font-semibold mb-1">Status de Entrega</h3>
                  <p className="text-xs text-muted-foreground">
                    Selecione qual status irá gerar automaticamente o código de entrega do pedido
                  </p>
                </div>

                <RadioGroup value={statusEntrega} onValueChange={handleStatusEntregaChange}>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 p-2 rounded-lg hover:bg-accent/50">
                      <RadioGroupItem value="" id="status-entrega-nenhum" />
                      <Label htmlFor="status-entrega-nenhum" className="flex-1 cursor-pointer">
                        <span className="text-sm text-muted-foreground">Nenhum (não gerar código automaticamente)</span>
                      </Label>
                    </div>
                    {statusOrdenados.map((s) => (
                      <div key={s.id} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-accent/50">
                        <RadioGroupItem value={s.id} id={`status-entrega-${s.id}`} />
                        <Label htmlFor={`status-entrega-${s.id}`} className="flex-1 cursor-pointer flex items-center gap-2">
                          <Badge
                            className="min-w-[100px] justify-center"
                            style={{
                              backgroundColor: s.cor,
                              color: s.text_color,
                            }}
                          >
                            {s.nome}
                          </Badge>
                          <span className="text-sm">{s.nome}</span>
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

