import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, GripVertical, Edit2, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { LocalAtributo } from "./ModalGerenciarVariacoes";
import { toast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

interface EstruturaTabLocalProps {
  atributos: LocalAtributo[];
  onAtributosChange: (atributos: LocalAtributo[]) => void;
}

export function EstruturaTabLocal({ atributos, onAtributosChange }: EstruturaTabLocalProps) {
  const [novoAtributo, setNovoAtributo] = useState("");
  const [atributoPaiId, setAtributoPaiId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNome, setEditingNome] = useState("");
  const [nomeError, setNomeError] = useState(false);
  const nomeInputRef = useRef<HTMLInputElement>(null);

  // Componente auxiliar para label com contador
  const LabelWithCounter = ({ 
    label, 
    currentLength, 
    maxLength,
    required = false
  }: { 
    label: string; 
    currentLength: number; 
    maxLength: number;
    required?: boolean;
  }) => (
    <div className="flex items-center gap-2">
      <span>
        {required && <span className="text-red-500">* </span>}
        {label}:
      </span>
      <span className="text-xs text-muted-foreground">
        ({currentLength}/{maxLength})
      </span>
    </div>
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleAddAtributo = () => {
    if (!novoAtributo.trim()) {
      setNomeError(true);
      nomeInputRef.current?.focus();
      toast({
        title: "Campo obrigatório",
        description: "O nome do atributo é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    setNomeError(false);

    const nivel = atributoPaiId 
      ? (findAtributo(atributos, atributoPaiId)?.nivel || 0) + 1 
      : 0;

    const novoAtributoObj: LocalAtributo = {
      id: `temp_${Date.now()}`,
      template_id: "",
      nome: novoAtributo,
      pai_id: atributoPaiId,
      nivel,
      ordem: 0,
      filhos: [],
    };

    if (atributoPaiId) {
      // Adicionar como filho
      const updatedAtributos = addFilhoToAtributo(atributos, atributoPaiId, novoAtributoObj);
      onAtributosChange(updatedAtributos);
    } else {
      // Adicionar como raiz
      onAtributosChange([...atributos, novoAtributoObj]);
    }

    setNovoAtributo("");
    setAtributoPaiId(null);
  };

  const findAtributo = (attrs: LocalAtributo[], id: string): LocalAtributo | null => {
    for (const attr of attrs) {
      if (attr.id === id) return attr;
      if (attr.filhos && attr.filhos.length > 0) {
        const found = findAtributo(attr.filhos, id);
        if (found) return found;
      }
    }
    return null;
  };

  const addFilhoToAtributo = (attrs: LocalAtributo[], paiId: string, filho: LocalAtributo): LocalAtributo[] => {
    return attrs.map(attr => {
      if (attr.id === paiId) {
        return {
          ...attr,
          filhos: [...(attr.filhos || []), filho],
        };
      }
      if (attr.filhos && attr.filhos.length > 0) {
        return {
          ...attr,
          filhos: addFilhoToAtributo(attr.filhos, paiId, filho),
        };
      }
      return attr;
    });
  };

  const handleDelete = (id: string) => {
    const removeAtributo = (attrs: LocalAtributo[]): LocalAtributo[] => {
      return attrs.filter(attr => {
        if (attr.id === id) return false;
        if (attr.filhos && attr.filhos.length > 0) {
          attr.filhos = removeAtributo(attr.filhos);
        }
        return true;
      });
    };

    onAtributosChange(removeAtributo(atributos));
  };

  const handleStartEdit = (atributo: LocalAtributo) => {
    setEditingId(atributo.id);
    setEditingNome(atributo.nome);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;

    if (!editingNome.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "O nome do atributo não pode estar vazio.",
        variant: "destructive",
      });
      return;
    }

    const updateAtributoNome = (attrs: LocalAtributo[]): LocalAtributo[] => {
      return attrs.map(attr => {
        if (attr.id === editingId) {
          return { ...attr, nome: editingNome };
        }
        if (attr.filhos && attr.filhos.length > 0) {
          return {
            ...attr,
            filhos: updateAtributoNome(attr.filhos),
          };
        }
        return attr;
      });
    };

    onAtributosChange(updateAtributoNome(atributos));
    setEditingId(null);
    setEditingNome("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingNome("");
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const getAllAtributos = (attrs: LocalAtributo[]): LocalAtributo[] => {
        const result: LocalAtributo[] = [];
        attrs.forEach(attr => {
          result.push(attr);
          if (attr.filhos && attr.filhos.length > 0) {
            result.push(...getAllAtributos(attr.filhos));
          }
        });
        return result;
      };

      const flatAtributos = getAllAtributos(atributos);
      const itemToMove = flatAtributos.find((a) => a.id === active.id);
      const targetItem = flatAtributos.find((a) => a.id === over.id);

      // Apenas reordenar se estiverem no mesmo nível
      if (itemToMove && targetItem && itemToMove.pai_id === targetItem.pai_id) {
        const reorderAtLevel = (attrs: LocalAtributo[], paiId: string | null | undefined): LocalAtributo[] => {
          // Filtrar atributos do mesmo nível
          const atributosDoNivel = attrs.filter(a => a.pai_id === paiId);
          const outrosNiveis = attrs.filter(a => a.pai_id !== paiId);

          const oldIndex = atributosDoNivel.findIndex((a) => a.id === active.id);
          const newIndex = atributosDoNivel.findIndex((a) => a.id === over.id);

          if (oldIndex !== -1 && newIndex !== -1) {
            const reordered = arrayMove(atributosDoNivel, oldIndex, newIndex).map((attr, index) => ({
              ...attr,
              ordem: index,
            }));
            return [...reordered, ...outrosNiveis];
          }

          return attrs;
        };

        // Se for nível raiz
        if (!itemToMove.pai_id) {
          const oldIndex = atributos.findIndex((a) => a.id === active.id);
          const newIndex = atributos.findIndex((a) => a.id === over.id);

          if (oldIndex !== -1 && newIndex !== -1) {
            const reordered = arrayMove(atributos, oldIndex, newIndex).map((attr, index) => ({
              ...attr,
              ordem: index,
            }));
            onAtributosChange(reordered);
          }
        } else {
          // Reordenar dentro de um nível aninhado
          const updateNestedOrder = (attrs: LocalAtributo[]): LocalAtributo[] => {
            return attrs.map(attr => {
              if (attr.id === itemToMove.pai_id && attr.filhos) {
                const oldIndex = attr.filhos.findIndex((a) => a.id === active.id);
                const newIndex = attr.filhos.findIndex((a) => a.id === over.id);
                
                if (oldIndex !== -1 && newIndex !== -1) {
                  const reordered = arrayMove(attr.filhos, oldIndex, newIndex).map((filho, index) => ({
                    ...filho,
                    ordem: index,
                  }));
                  return { ...attr, filhos: reordered };
                }
              }
              if (attr.filhos && attr.filhos.length > 0) {
                return { ...attr, filhos: updateNestedOrder(attr.filhos) };
              }
              return attr;
            });
          };

          onAtributosChange(updateNestedOrder(atributos));
        }
      }
    }
  };

  const getAllAtributos = (attrs: LocalAtributo[]): LocalAtributo[] => {
    const result: LocalAtributo[] = [];
    attrs.forEach(attr => {
      result.push(attr);
      if (attr.filhos && attr.filhos.length > 0) {
        result.push(...getAllAtributos(attr.filhos));
      }
    });
    return result;
  };

  const SortableAtributo = ({ atributo, depth = 0 }: { atributo: LocalAtributo; depth?: number }) => {
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
                      maxLength={100}
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
                  onClick={() => {
                    setAtributoPaiId(atributo.id);
                    setTimeout(() => {
                      nomeInputRef.current?.focus();
                      nomeInputRef.current?.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center' 
                      });
                    }, 100);
                  }}
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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={atributo.filhos.map(f => f.id)}
                strategy={verticalListSortingStrategy}
              >
                {atributo.filhos.map(filho => (
                  <SortableAtributo key={filho.id} atributo={filho} depth={depth + 1} />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}
      </div>
    );
  };

  const allAtributos = getAllAtributos(atributos);

  return (
    <div className="space-y-4 pb-4">
      <div className="space-y-2 pt-2">
        <Label>
          <LabelWithCounter
            label={atributoPaiId ? "Nome do Subatributo" : "Nome do Atributo"}
            currentLength={novoAtributo.length}
            maxLength={100}
            required={true}
          />
          {!atributoPaiId && (
            <span className="text-muted-foreground text-xs block mt-1">
              O Atributo ou Atributos principais para identificar a variação do produto. Ex: [Atributo]: Tamanho, Peso, Cor, Medida, e etc.. Suporta múltiplos níveis de Atributos.
              <br />
              Ex: [Atributo]+[Subatributo]: Embalagem &gt; Caixa. E [Valores]: Com 06 Un ou Com 12 Un.
            </span>
          )}
        </Label>
        <div className="flex items-center gap-2">
          <Input
            ref={nomeInputRef}
            placeholder={atributoPaiId ? "Ex: Gramatura" : "Ex: Tipo de Papel"}
            value={novoAtributo}
            maxLength={100}
            onChange={(e) => {
              setNovoAtributo(e.target.value);
              if (nomeError && e.target.value.trim()) {
                setNomeError(false);
              }
            }}
            onKeyPress={(e) => e.key === "Enter" && handleAddAtributo()}
            className={nomeError ? "border-red-500 focus-visible:ring-red-500" : ""}
          />
          <Button onClick={handleAddAtributo}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
          {atributoPaiId && (
            <Button variant="outline" onClick={() => {
              setAtributoPaiId(null);
              setNomeError(false);
            }}>
              Cancelar
            </Button>
          )}
        </div>
        {nomeError && (
          <p className="text-sm text-red-500">Este campo é obrigatório</p>
        )}
      </div>

      {atributoPaiId && (
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            Adicionando subatributo para: <strong>{findAtributo(atributos, atributoPaiId)?.nome}</strong>
          </p>
        </div>
      )}

      {atributos.length === 0 ? (
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

