import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAtributosVariacao, AtributoVariacao } from "@/hooks/useAtributosVariacao";
import { useOpcoesVariacao, OpcaoVariacao } from "@/hooks/useOpcoesVariacao";
import { Plus, Trash2, Pencil, Check, X, GripVertical } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface OpcoesTabProps {
  templateId: string;
}

export function OpcoesTab({ templateId }: OpcoesTabProps) {
  const { atributos, fetchAtributos } = useAtributosVariacao();
  const { opcoes, loading, fetchOpcoes, createOpcao, updateOpcao, deleteOpcao, reordenarOpcoes } = useOpcoesVariacao();
  const [atributoSelecionado, setAtributoSelecionado] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingOpcao, setEditingOpcao] = useState<Partial<OpcaoVariacao>>({});
  const [novaOpcao, setNovaOpcao] = useState({
    nome: "",
    sku: "",
    codigo_barras: "",
    valor_adicional: 0,
    estoque: 0,
    imagem_url: "",
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (templateId) {
      fetchAtributos(templateId);
    }
  }, [templateId]);

  useEffect(() => {
    if (atributoSelecionado) {
      fetchOpcoes(atributoSelecionado);
    }
  }, [atributoSelecionado]);

  // Obter todos os atributos em lista plana (incluindo filhos)
  const getAllAtributos = (attrs: AtributoVariacao[]): AtributoVariacao[] => {
    const result: AtributoVariacao[] = [];
    attrs.forEach(attr => {
      result.push(attr);
      if (attr.filhos && attr.filhos.length > 0) {
        result.push(...getAllAtributos(attr.filhos));
      }
    });
    return result;
  };

  const atributosList = getAllAtributos(atributos);

  const handleAddOpcao = async () => {
    if (!novaOpcao.nome.trim() || !atributoSelecionado) return;

    await createOpcao({
      atributo_id: atributoSelecionado,
      nome: novaOpcao.nome,
      sku: novaOpcao.sku,
      codigo_barras: novaOpcao.codigo_barras,
      valor_adicional: novaOpcao.valor_adicional,
      estoque: novaOpcao.estoque,
      imagem_url: novaOpcao.imagem_url,
      ativo: true,
      ordem: 0,
    });

    setNovaOpcao({
      nome: "",
      sku: "",
      codigo_barras: "",
      valor_adicional: 0,
      estoque: 0,
      imagem_url: "",
    });
  };

  const handleDelete = async (id: string) => {
    await deleteOpcao(id, atributoSelecionado);
  };

  const handleEdit = (opcao: OpcaoVariacao) => {
    setEditingId(opcao.id);
    setEditingOpcao({
      nome: opcao.nome,
      sku: opcao.sku || "",
      codigo_barras: opcao.codigo_barras || "",
      valor_adicional: opcao.valor_adicional,
      estoque: opcao.estoque,
      imagem_url: opcao.imagem_url || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingOpcao.nome?.trim()) return;
    
    await updateOpcao(editingId, atributoSelecionado, editingOpcao);
    setEditingId(null);
    setEditingOpcao({});
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingOpcao({});
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = opcoes.findIndex((o) => o.id === active.id);
      const newIndex = opcoes.findIndex((o) => o.id === over.id);

      const reordered = arrayMove(opcoes, oldIndex, newIndex);
      
      // Reordena todas as opções de uma vez com apenas um toast
      await reordenarOpcoes(reordered, atributoSelecionado);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Selecionar Atributo</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={atributoSelecionado} onValueChange={setAtributoSelecionado}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um atributo..." />
            </SelectTrigger>
            <SelectContent className="z-[100]">
              {atributosList.map(attr => (
                <SelectItem key={attr.id} value={attr.id}>
                  {"─".repeat(attr.nivel)} {attr.nome} (Nível {attr.nivel})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {atributoSelecionado && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Adicionar Nova Opção</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome da Opção *</Label>
                  <Input
                    placeholder="Ex: Couché brilho"
                    value={novaOpcao.nome}
                    onChange={(e) => setNovaOpcao({ ...novaOpcao, nome: e.target.value })}
                  />
                </div>
                <div>
                  <Label>SKU</Label>
                  <Input
                    placeholder="Ex: CB-90G"
                    value={novaOpcao.sku}
                    onChange={(e) => setNovaOpcao({ ...novaOpcao, sku: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Código de Barras</Label>
                  <Input
                    placeholder="Ex: 7891234567890"
                    value={novaOpcao.codigo_barras}
                    onChange={(e) => setNovaOpcao({ ...novaOpcao, codigo_barras: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Valor Adicional (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={novaOpcao.valor_adicional}
                    onChange={(e) => setNovaOpcao({ ...novaOpcao, valor_adicional: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Estoque</Label>
                  <Input
                    type="number"
                    value={novaOpcao.estoque}
                    onChange={(e) => setNovaOpcao({ ...novaOpcao, estoque: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>URL da Imagem</Label>
                  <Input
                    placeholder="https://..."
                    value={novaOpcao.imagem_url}
                    onChange={(e) => setNovaOpcao({ ...novaOpcao, imagem_url: e.target.value })}
                  />
                </div>
              </div>
              <Button onClick={handleAddOpcao} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Opção
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Opções Cadastradas</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground py-8">Carregando opções...</p>
              ) : opcoes.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma opção cadastrada para este atributo.
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[30px]"></TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Cód. Barras</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Estoque</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <SortableContext items={opcoes.map(o => o.id)} strategy={verticalListSortingStrategy}>
                      <TableBody>
                        {opcoes.map(opcao => (
                          <SortableOpcaoRow
                            key={opcao.id}
                            opcao={opcao}
                            isEditing={editingId === opcao.id}
                            editingOpcao={editingOpcao}
                            onEdit={handleEdit}
                            onSave={handleSaveEdit}
                            onCancel={handleCancelEdit}
                            onDelete={handleDelete}
                            onEditChange={setEditingOpcao}
                          />
                        ))}
                      </TableBody>
                    </SortableContext>
                  </Table>
                </DndContext>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

interface SortableOpcaoRowProps {
  opcao: OpcaoVariacao;
  isEditing: boolean;
  editingOpcao: Partial<OpcaoVariacao>;
  onEdit: (opcao: OpcaoVariacao) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: (id: string) => void;
  onEditChange: (opcao: Partial<OpcaoVariacao>) => void;
}

function SortableOpcaoRow({
  opcao,
  isEditing,
  editingOpcao,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onEditChange,
}: SortableOpcaoRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: opcao.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        <div
          className="cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </TableCell>
      {isEditing ? (
        <>
          <TableCell>
            <Input
              value={editingOpcao.nome || ""}
              onChange={(e) => onEditChange({ ...editingOpcao, nome: e.target.value })}
              className="h-8"
            />
          </TableCell>
          <TableCell>
            <Input
              value={editingOpcao.sku || ""}
              onChange={(e) => onEditChange({ ...editingOpcao, sku: e.target.value })}
              className="h-8"
            />
          </TableCell>
          <TableCell>
            <Input
              value={editingOpcao.codigo_barras || ""}
              onChange={(e) => onEditChange({ ...editingOpcao, codigo_barras: e.target.value })}
              className="h-8"
            />
          </TableCell>
          <TableCell>
            <Input
              type="number"
              step="0.01"
              value={editingOpcao.valor_adicional || 0}
              onChange={(e) => onEditChange({ ...editingOpcao, valor_adicional: parseFloat(e.target.value) || 0 })}
              className="h-8"
            />
          </TableCell>
          <TableCell>
            <Input
              type="number"
              value={editingOpcao.estoque || 0}
              onChange={(e) => onEditChange({ ...editingOpcao, estoque: parseInt(e.target.value) || 0 })}
              className="h-8"
            />
          </TableCell>
          <TableCell className="text-right">
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={onSave}>
                <Check className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onCancel}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </TableCell>
        </>
      ) : (
        <>
          <TableCell className="font-medium">{opcao.nome}</TableCell>
          <TableCell>{opcao.sku || "-"}</TableCell>
          <TableCell>{opcao.codigo_barras || "-"}</TableCell>
          <TableCell>R$ {opcao.valor_adicional.toFixed(2)}</TableCell>
          <TableCell>{opcao.estoque}</TableCell>
          <TableCell className="text-right">
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => onEdit(opcao)}>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button variant="destructive" size="sm" onClick={() => onDelete(opcao.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </TableCell>
        </>
      )}
    </TableRow>
  );
}
