import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { LocalAtributo, LocalOpcao } from "./ModalGerenciarVariacoes";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface OpcoesTabLocalProps {
  atributos: LocalAtributo[];
  opcoes: Map<string, LocalOpcao[]>;
  onOpcoesChange: (atributoId: string, opcoes: LocalOpcao[]) => void;
}

export function OpcoesTabLocal({ atributos, opcoes, onOpcoesChange }: OpcoesTabLocalProps) {
  const [atributoSelecionado, setAtributoSelecionado] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingOpcao, setEditingOpcao] = useState<Partial<LocalOpcao>>({});
  const [novaOpcao, setNovaOpcao] = useState({
    nome: "",
    sku: "",
    codigo_barras: "",
    valor_adicional: 0,
    estoque: 0,
    imagem_url: "",
  });
  const [nomeError, setNomeError] = useState(false);
  const nomeInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);
  const [editingImageFile, setEditingImageFile] = useState<File | null>(null);
  const [editingImagePreview, setEditingImagePreview] = useState<string | null>(null);

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

  // Obter todos os atributos em lista plana (incluindo filhos)
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

  const atributosList = getAllAtributos(atributos);
  const opcoesAtributo = opcoes.get(atributoSelecionado) || [];

  // Cleanup de URLs de preview ao desmontar componente
  useEffect(() => {
    return () => {
      if (pendingImagePreview) {
        URL.revokeObjectURL(pendingImagePreview);
      }
      if (editingImagePreview) {
        URL.revokeObjectURL(editingImagePreview);
      }
    };
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'nova' | 'edit') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione uma imagem nos formatos JPG, PNG, GIF ou WEBP.",
        variant: "destructive",
      });
      e.target.value = '';
      return;
    }

    // Validar tamanho do arquivo (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo permitido é 5MB.",
        variant: "destructive",
      });
      e.target.value = '';
      return;
    }

    // Criar preview temporário
    const previewUrl = URL.createObjectURL(file);

    if (type === 'nova') {
      // Limpar preview anterior se existir
      if (pendingImagePreview) {
        URL.revokeObjectURL(pendingImagePreview);
      }
      setPendingImageFile(file);
      setPendingImagePreview(previewUrl);
    } else {
      // Limpar preview anterior se existir
      if (editingImagePreview) {
        URL.revokeObjectURL(editingImagePreview);
      }
      setEditingImageFile(file);
      setEditingImagePreview(previewUrl);
    }

    // Limpar o input
    e.target.value = '';
  };

  const uploadImageToStorage = async (file: File): Promise<string> => {
    // Gerar nome único para o arquivo
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `variacoes/${fileName}`;

    // Fazer upload para o Supabase Storage
    const { data, error } = await supabase.storage
      .from('produtos-imagens')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Obter URL pública da imagem
    const { data: { publicUrl } } = supabase.storage
      .from('produtos-imagens')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleAddOpcao = async () => {
    if (!atributoSelecionado) {
      toast({
        title: "Selecione um atributo",
        description: "Por favor, selecione um atributo antes de adicionar uma opção.",
        variant: "destructive",
      });
      return;
    }

    if (!novaOpcao.nome.trim()) {
      setNomeError(true);
      nomeInputRef.current?.focus();
      toast({
        title: "Campo obrigatório",
        description: "O nome da opção é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    setNomeError(false);

    try {
      setUploadingImage(true);

      // Fazer upload da imagem se houver arquivo pendente
      let imagemUrl = novaOpcao.imagem_url;
      if (pendingImageFile) {
        imagemUrl = await uploadImageToStorage(pendingImageFile);
        // Limpar preview
        if (pendingImagePreview) {
          URL.revokeObjectURL(pendingImagePreview);
        }
      }

      const novaOpcaoObj: LocalOpcao = {
        id: `temp_${Date.now()}`,
        atributo_id: atributoSelecionado,
        nome: novaOpcao.nome,
        sku: novaOpcao.sku,
        codigo_barras: novaOpcao.codigo_barras,
        valor_adicional: novaOpcao.valor_adicional,
        estoque: novaOpcao.estoque,
        imagem_url: imagemUrl,
        ativo: true,
        ordem: opcoesAtributo.length,
      };

      onOpcoesChange(atributoSelecionado, [...opcoesAtributo, novaOpcaoObj]);

      setNovaOpcao({
        nome: "",
        sku: "",
        codigo_barras: "",
        valor_adicional: 0,
        estoque: 0,
        imagem_url: "",
      });
      setPendingImageFile(null);
      setPendingImagePreview(null);

      if (pendingImageFile) {
        toast({
          title: "Sucesso",
          description: "Valor adicionado com imagem!",
        });
      }
    } catch (error: any) {
      console.error("Erro ao adicionar opção:", error);
      toast({
        title: "Erro ao fazer upload da imagem",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDelete = (id: string) => {
    const updatedOpcoes = opcoesAtributo.filter(op => op.id !== id);
    onOpcoesChange(atributoSelecionado, updatedOpcoes);
  };

  const handleEdit = (opcao: LocalOpcao) => {
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

  const handleSaveEdit = () => {
    if (!editingId) return;

    if (!editingOpcao.nome?.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "O nome da opção não pode estar vazio.",
        variant: "destructive",
      });
      return;
    }
    
    const updatedOpcoes = opcoesAtributo.map(op => {
      if (op.id === editingId) {
        return { ...op, ...editingOpcao };
      }
      return op;
    });

    onOpcoesChange(atributoSelecionado, updatedOpcoes);
    setEditingId(null);
    setEditingOpcao({});
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingOpcao({});
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = opcoesAtributo.findIndex((o) => o.id === active.id);
      const newIndex = opcoesAtributo.findIndex((o) => o.id === over.id);

      const reordered = arrayMove(opcoesAtributo, oldIndex, newIndex).map((op, index) => ({
        ...op,
        ordem: index,
      }));
      
      onOpcoesChange(atributoSelecionado, reordered);
    }
  };

  return (
    <div className="space-y-6">
      {/* Seção de Valores Cadastrados - Exibição Automática */}
      {atributosList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Valores Cadastrados</CardTitle>
            <span className="text-muted-foreground text-xs block mt-2">
              Visualização de todos os valores cadastrados, organizados por atributo.
            </span>
          </CardHeader>
          <CardContent className="space-y-6">
            {atributosList.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum atributo cadastrado ainda.
              </p>
            ) : (
              atributosList.map(atributo => {
                const opcoesDoAtributo = opcoes.get(atributo.id) || [];
                return (
                  <div key={atributo.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        <span className="text-muted-foreground">{"─".repeat(atributo.nivel)}</span>
                        {atributo.nome} 
                        <span className="text-muted-foreground font-normal">(Nível {atributo.nivel})</span>
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAtributoSelecionado(atributo.id)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Adicionar Valor
                      </Button>
                    </div>
                    
                    {opcoesDoAtributo.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic pl-4">
                        Nenhum valor cadastrado
                      </p>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nome</TableHead>
                              <TableHead>SKU</TableHead>
                              <TableHead>Cód. Barras</TableHead>
                              <TableHead>Valor</TableHead>
                              <TableHead>Estoque</TableHead>
                              <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {opcoesDoAtributo.map(opcao => (
                              <TableRow key={opcao.id}>
                                <TableCell className="font-medium">{opcao.nome}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">{opcao.sku || "-"}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">{opcao.codigo_barras || "-"}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                  {opcao.valor_adicional > 0 ? `R$ ${opcao.valor_adicional.toFixed(2)}` : "-"}
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">{opcao.estoque || 0}</TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setAtributoSelecionado(atributo.id);
                                      setTimeout(() => {
                                        const element = document.getElementById(`edit-opcao-${opcao.id}`);
                                        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                      }, 100);
                                    }}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Selecionar Atributo para Adicionar/Editar Valores</CardTitle>
          <span className="text-muted-foreground text-xs block mt-2">
            Escolha o Atributo para adicionar ou editar Valores. Ex: [Atributo]: Tamanho. E [Valores]: P, M, G e GG.
            <br />
            É recomendado sempre escolher o nível final (com maior numeração) para definir os Valores dos Atributos.
          </span>
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
                  <Label>
                    <LabelWithCounter
                      label="Valor do Atributo"
                      currentLength={novaOpcao.nome.length}
                      maxLength={100}
                      required={true}
                    />
                  </Label>
                  <Input
                    ref={nomeInputRef}
                    placeholder="Ex: Couché brilho"
                    value={novaOpcao.nome}
                    maxLength={100}
                    onChange={(e) => {
                      setNovaOpcao({ ...novaOpcao, nome: e.target.value });
                      if (nomeError && e.target.value.trim()) {
                        setNomeError(false);
                      }
                    }}
                    className={nomeError ? "border-red-500 focus-visible:ring-red-500" : ""}
                  />
                  {nomeError && (
                    <p className="text-sm text-red-500 mt-1">Este campo é obrigatório</p>
                  )}
                </div>
                <div>
                  <Label>
                    <LabelWithCounter
                      label="SKU"
                      currentLength={novaOpcao.sku.length}
                      maxLength={50}
                    />
                  </Label>
                  <Input
                    placeholder="Ex: CB-90G"
                    value={novaOpcao.sku}
                    maxLength={50}
                    onChange={(e) => setNovaOpcao({ ...novaOpcao, sku: e.target.value })}
                  />
                </div>
                <div>
                  <Label>
                    <LabelWithCounter
                      label="Código de Barras"
                      currentLength={novaOpcao.codigo_barras.length}
                      maxLength={50}
                    />
                  </Label>
                  <Input
                    placeholder="Ex: 7891234567890"
                    value={novaOpcao.codigo_barras}
                    maxLength={50}
                    onChange={(e) => setNovaOpcao({ ...novaOpcao, codigo_barras: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Valor Adicional (R$):</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={novaOpcao.valor_adicional}
                    onChange={(e) => setNovaOpcao({ ...novaOpcao, valor_adicional: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Estoque:</Label>
                  <Input
                    type="number"
                    value={novaOpcao.estoque}
                    onChange={(e) => setNovaOpcao({ ...novaOpcao, estoque: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Imagem alternativa</Label>
                  <div className="space-y-2">
                    {pendingImagePreview && (
                      <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
                        <img 
                          src={pendingImagePreview} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1"
                          onClick={() => {
                            if (pendingImagePreview) {
                              URL.revokeObjectURL(pendingImagePreview);
                            }
                            setPendingImageFile(null);
                            setPendingImagePreview(null);
                          }}
                        >
                          Remover
                        </Button>
                      </div>
                    )}
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageSelect(e, 'nova')}
                      className="cursor-pointer"
                      disabled={uploadingImage}
                    />
                    {uploadingImage && (
                      <p className="text-xs text-blue-600">Enviando imagem...</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Formatos aceitos: JPG, PNG, GIF, WEBP. Tamanho máximo: 5MB. A imagem será enviada ao clicar em "Adicionar Opção".
                    </p>
                  </div>
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
              {opcoesAtributo.length === 0 ? (
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
                    <SortableContext items={opcoesAtributo.map(o => o.id)} strategy={verticalListSortingStrategy}>
                      <TableBody>
                        {opcoesAtributo.map(opcao => (
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
  opcao: LocalOpcao;
  isEditing: boolean;
  editingOpcao: Partial<LocalOpcao>;
  onEdit: (opcao: LocalOpcao) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: (id: string) => void;
  onEditChange: (opcao: Partial<LocalOpcao>) => void;
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
              maxLength={100}
              onChange={(e) => onEditChange({ ...editingOpcao, nome: e.target.value })}
              className="h-8"
            />
          </TableCell>
          <TableCell>
            <Input
              value={editingOpcao.sku || ""}
              maxLength={50}
              onChange={(e) => onEditChange({ ...editingOpcao, sku: e.target.value })}
              className="h-8"
            />
          </TableCell>
          <TableCell>
            <Input
              value={editingOpcao.codigo_barras || ""}
              maxLength={50}
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

