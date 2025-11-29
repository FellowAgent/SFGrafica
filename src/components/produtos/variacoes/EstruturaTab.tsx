import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, GripVertical, Edit2, Check, X } from "lucide-react";
import { useAtributosVariacao, AtributoVariacao } from "@/hooks/useAtributosVariacao";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface EstruturaTabProps {
  templateId: string;
}

export function EstruturaTab({ templateId }: EstruturaTabProps) {
  const { atributos, loading, fetchAtributos, createAtributo, deleteAtributo, updateAtributo, reordenarAtributos } = useAtributosVariacao();
  const [novoAtributo, setNovoAtributo] = useState("");
  const [atributoPaiId, setAtributoPaiId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNome, setEditingNome] = useState("");

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

  const handleAddAtributo = async () => {
    if (!novoAtributo.trim()) return;

    const nivel = atributoPaiId 
      ? (atributos.find(a => a.id === atributoPaiId)?.nivel || 0) + 1 
      : 0;

    await createAtributo({
      template_id: templateId,
      nome: novoAtributo,
      pai_id: atributoPaiId,
      nivel,
      ordem: 0,
    });

    setNovoAtributo("");
    setAtributoPaiId(null);
  };

  const handleDelete = async (id: string) => {
    await deleteAtributo(id, templateId);
  };

  const handleStartEdit = (atributo: AtributoVariacao) => {
    setEditingId(atributo.id);
    setEditingNome(atributo.nome);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingNome.trim()) return;
    await updateAtributo(editingId, templateId, { nome: editingNome });
    setEditingId(null);
    setEditingNome("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingNome("");
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = atributos.findIndex((a) => a.id === active.id);
      const newIndex = atributos.findIndex((a) => a.id === over.id);

      const reorderedAtributos = arrayMove(atributos, oldIndex, newIndex);
      const updates = reorderedAtributos.map((attr, index) => ({
        id: attr.id,
        ordem: index,
      }));

      await reordenarAtributos(templateId, updates);
    }
  };

  const SortableAtributo = ({ atributo, depth = 0 }: { atributo: AtributoVariacao; depth?: number }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
    } = useSortable({ id: atributo.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <div ref={setNodeRef} style={style} className={`ml-${depth * 6}`}>
        <Card className="mb-2">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
                
                {editingId === atributo.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editingNome}
                      onChange={(e) => setEditingNome(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSaveEdit()}
                      className="h-8"
                      autoFocus
                    />
                    <Button size="sm" variant="ghost" onClick={handleSaveEdit}>
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <CardTitle className="text-base">{atributo.nome}</CardTitle>
                    <Badge variant="outline">Nível {atributo.nivel}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStartEdit(atributo)}
                      className="ml-2"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAtributoPaiId(atributo.id)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Subatributo
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(atributo.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {atributo.filhos && atributo.filhos.length > 0 && (
          <div className="ml-6 border-l-2 border-border pl-4">
            {atributo.filhos.map(filho => (
              <SortableAtributo key={filho.id} atributo={filho} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder={atributoPaiId ? "Nome do subatributo..." : "Nome do atributo raiz..."}
          value={novoAtributo}
          onChange={(e) => setNovoAtributo(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleAddAtributo()}
        />
        <Button onClick={handleAddAtributo}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar
        </Button>
        {atributoPaiId && (
          <Button variant="outline" onClick={() => setAtributoPaiId(null)}>
            Cancelar
          </Button>
        )}
      </div>

      {atributoPaiId && (
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            Adicionando subatributo para: <strong>{atributos.find(a => a.id === atributoPaiId)?.nome}</strong>
          </p>
        </div>
      )}

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Carregando estrutura...</p>
      ) : atributos.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Nenhum atributo criado ainda. Comece adicionando um atributo raiz.
            </p>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={atributos.map(a => a.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {atributos.map(atributo => (
                <SortableAtributo key={atributo.id} atributo={atributo} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
