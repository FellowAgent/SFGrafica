import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Plus, Save, GripVertical, User, Minus, ArrowRight, Settings } from "lucide-react";
import { toast } from "@/utils/toastHelper";
import { useUsuarios } from "@/hooks/useUsuarios";
import { useStatusConfig } from "@/hooks/useStatusConfig";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ModalGerenciarStatus } from "./ModalGerenciarStatus";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface FluxoBloco {
  id: string;
  titulo: string;
  ordem: number;
  cor: string;
  text_color: string;
  ativo: boolean;
  exibir_no_inicio: boolean;
}

interface FuncionarioFluxo {
  id: string;
  nome: string;
  username?: string;
  avatar_url?: string;
  ordem: number;
  ativo: boolean;
}

interface SortableFuncionarioProps {
  funcionario: FuncionarioFluxo;
  onToggleAtivo: (id: string, ativo: boolean) => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  onUpdateNome: (id: string, nome: string) => void;
}

function SortableFuncionario({ funcionario, onToggleAtivo, editingId, setEditingId, onUpdateNome }: SortableFuncionarioProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: funcionario.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <Card className={cn(
        "w-48 shadow-fellow-md hover:shadow-fellow-lg transition-all border-2 hover:border-primary/50",
        !funcionario.ativo && "bg-muted/50"
      )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <Switch
              checked={funcionario.ativo}
              onCheckedChange={(checked) => onToggleAtivo(funcionario.id, checked)}
              className={cn(
                "data-[state=checked]:bg-green-500",
                "data-[state=unchecked]:bg-red-500"
              )}
            />
          </div>
          
          <div className="flex items-center justify-center mb-3">
            <Avatar className="h-12 w-12">
              <AvatarImage 
                src={funcionario.avatar_url ? `${funcionario.avatar_url}?t=${Date.now()}` : undefined} 
                className={cn(
                  "object-cover",
                  !funcionario.ativo && "grayscale"
                )}
              />
              <AvatarFallback className="bg-muted">
                {funcionario.nome ? (
                  funcionario.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
                ) : (
                  <User className="h-5 w-5 text-muted-foreground" />
                )}
              </AvatarFallback>
            </Avatar>
          </div>
          
          {editingId === funcionario.id ? (
            <Input
              autoFocus
              value={funcionario.nome}
              onChange={(e) => onUpdateNome(funcionario.id, e.target.value.toUpperCase())}
              onBlur={() => setEditingId(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setEditingId(null);
              }}
              className="font-semibold text-center text-sm h-7 px-2"
            />
          ) : (
            <h3 
              className="font-semibold text-center text-sm cursor-pointer hover:text-primary transition-colors truncate"
              onClick={() => setEditingId(funcionario.id)}
            >
              {funcionario.nome.toUpperCase()}
            </h3>
          )}
          
          <div className="mt-2 text-center">
            <span className={cn(
              "text-xs font-medium px-2 py-1 rounded",
              funcionario.ativo 
                ? "bg-green-500/10 text-green-600" 
                : "bg-red-500/10 text-red-600"
            )}>
              {funcionario.ativo ? "Ativo" : "Inativo"}
            </span>
          </div>
          
          <div className="mt-3 space-y-1.5">
            <div className="h-2 bg-muted rounded-full" />
            <div className="h-2 bg-muted rounded-full w-3/4" />
            <div className="h-2 bg-muted rounded-full w-1/2" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface SortableStatusProps {
  status: FluxoBloco;
  index: number;
  onToggleAtivo: (id: string, ativo: boolean) => void;
  onToggleExibirNoInicio: (id: string, exibir: boolean) => void;
  isOverlay?: boolean;
}

function SortableStatus({ status, index, onToggleAtivo, onToggleExibirNoInicio, isOverlay = false }: SortableStatusProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: status.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  if (isOverlay) {
    return (
      <Card className="w-48 shadow-2xl border-2 border-primary rotate-3 scale-105">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
              {index + 1}
            </div>
          </div>
          <h3 className="font-semibold text-center text-sm mb-3">
            {status.titulo.toUpperCase()}
          </h3>
          <div 
            className="h-8 rounded-md flex items-center justify-center text-xs font-medium"
            style={{
              backgroundColor: status.cor,
              color: status.text_color || '#000000'
            }}
          >
            {status.titulo}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {isOver && !isDragging && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-primary border-dashed rounded-2xl animate-pulse" />
      )}
      <div ref={setNodeRef} style={style} className="relative group">
        <Card className={cn(
          "w-48 shadow-fellow-md hover:shadow-fellow-lg transition-all border-2",
          !status.ativo && "bg-muted/50",
          isDragging && "border-primary shadow-2xl",
          !isDragging && "hover:border-primary/50"
        )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
              {index + 1}
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={status.ativo}
                onCheckedChange={(checked) => onToggleAtivo(status.id, checked)}
                className={cn(
                  "data-[state=checked]:bg-green-500",
                  "data-[state=unchecked]:bg-red-500"
                )}
              />
              <div 
                {...attributes} 
                {...listeners} 
                className={cn(
                  "cursor-grab active:cursor-grabbing p-1 rounded hover:bg-primary/10 transition-colors",
                  isDragging && "cursor-grabbing"
                )}
                title="Arraste para reordenar"
              >
                <GripVertical className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </div>
          <h3 className={cn(
            "font-semibold text-center text-sm mb-3",
            !status.ativo && "text-muted-foreground"
          )}>
            {status.titulo.toUpperCase()}
          </h3>
          <div 
            className={cn(
              "h-8 rounded-md flex items-center justify-center text-xs font-medium",
              !status.ativo && "grayscale opacity-50"
            )}
            style={{
              backgroundColor: status.cor,
              color: status.text_color || '#000000'
            }}
          >
            {status.titulo}
          </div>
          <div className="mt-3 space-y-1.5">
            <div className="h-2 bg-muted rounded-full" />
            <div className="h-2 bg-muted rounded-full w-3/4" />
            <div className="h-2 bg-muted rounded-full w-1/2" />
          </div>
          
          <div className="mt-3 text-center">
            <span className={cn(
              "text-xs font-medium px-2 py-1 rounded",
              status.ativo 
                ? "bg-green-500/10 text-green-600" 
                : "bg-red-500/10 text-red-600"
            )}>
              {status.ativo ? "Ativo" : "Inativo"}
            </span>
          </div>
          
          {/* Checkbox Exibir no Início */}
          <div className="mt-3 flex items-center justify-center gap-2">
            <Checkbox
              id={`exibir-inicio-${status.id}`}
              checked={status.exibir_no_inicio}
              onCheckedChange={(checked) => onToggleExibirNoInicio(status.id, checked as boolean)}
            />
            <Label 
              htmlFor={`exibir-inicio-${status.id}`}
              className="text-xs cursor-pointer"
            >
              Exibir no Início
            </Label>
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  );
}

export function PedidosTab() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingFuncionarioId, setEditingFuncionarioId] = useState<string | null>(null);
  const { usuariosAtivos: usuarios, loading: loadingUsuarios } = useUsuarios();
  const { status: statusConfig, loading: loadingStatus, updateStatus, fetchStatus } = useStatusConfig();
  const { userProfile, updateProfile } = useUserProfile();
  const [funcionarios, setFuncionarios] = useState<FuncionarioFluxo[]>([]);
  const [statusOrdenados, setStatusOrdenados] = useState<FluxoBloco[]>([]);
  const [modalGerenciarStatusOpen, setModalGerenciarStatusOpen] = useState(false);
  
  // Callback para quando o modal de gerenciar status fechar
  const handleModalGerenciarStatusChange = (open: boolean) => {
    setModalGerenciarStatusOpen(open);
    // Quando o modal fechar, recarregar os status
    if (!open) {
      fetchStatus();
    }
  };
  
  // Carregar preferências do usuário
  const [ocultarInativos, setOcultarInativos] = useState(
    userProfile?.preferencias_pedidos_tab?.ocultarInativos ?? false
  );
  const [ocultarInativosFuncionarios, setOcultarInativosFuncionarios] = useState(
    userProfile?.preferencias_pedidos_tab?.ocultarInativosFuncionarios ?? false
  );

  // Sensores para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Carregar status do banco e criar lista ordenada
  useEffect(() => {
    if (!loadingStatus && statusConfig.length > 0) {
      const statusMapeados: FluxoBloco[] = statusConfig
        .map(s => ({
          id: s.id,
          titulo: s.nome,
          ordem: s.ordem || 0,
          cor: s.cor,
          text_color: s.text_color || '#000000',
          ativo: s.ativo,
          exibir_no_inicio: s.exibir_no_inicio ?? true
        }))
        .sort((a, b) => a.ordem - b.ordem);
      
      setStatusOrdenados(statusMapeados);
    }
  }, [statusConfig, loadingStatus]);

  // Atualizar preferências quando mudarem
  useEffect(() => {
    if (userProfile) {
      setOcultarInativos(userProfile.preferencias_pedidos_tab?.ocultarInativos ?? false);
      setOcultarInativosFuncionarios(userProfile.preferencias_pedidos_tab?.ocultarInativosFuncionarios ?? false);
    }
  }, [userProfile]);

  // Salvar preferência de ocultar inativos (status)
  const handleOcultarInativosChange = async (checked: boolean) => {
    setOcultarInativos(checked);
    try {
      await updateProfile({
        preferencias_pedidos_tab: {
          ...userProfile?.preferencias_pedidos_tab,
          ocultarInativos: checked
        }
      });
    } catch (error) {
      console.error("Erro ao salvar preferência:", error);
    }
  };

  // Salvar preferência de ocultar inativos (funcionários)
  const handleOcultarInativosFuncionariosChange = async (checked: boolean) => {
    setOcultarInativosFuncionarios(checked);
    try {
      await updateProfile({
        preferencias_pedidos_tab: {
          ...userProfile?.preferencias_pedidos_tab,
          ocultarInativosFuncionarios: checked
        }
      });
    } catch (error) {
      console.error("Erro ao salvar preferência:", error);
    }
  };

  // Funções para gerenciar status
  const toggleStatusAtivo = async (id: string, ativo: boolean) => {
    try {
      await updateStatus(id, { ativo });
      setStatusOrdenados(statusOrdenados.map(s => 
        s.id === id ? { ...s, ativo } : s
      ));
      toast.success(ativo ? "Status ativado" : "Status desativado");
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
    }
  };
  
  const toggleExibirNoInicio = async (id: string, exibir: boolean) => {
    try {
      await updateStatus(id, { exibir_no_inicio: exibir });
      setStatusOrdenados((prev) =>
        prev.map((s) => (s.id === id ? { ...s, exibir_no_inicio: exibir } : s))
      );
      toast.success(exibir ? "Status exibido no Início" : "Status oculto do Início");
    } catch (error) {
      console.error("Erro ao atualizar exibição do status:", error);
      toast.error("Erro ao atualizar exibição do status");
    }
  };

  const handleDragEndStatus = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setStatusOrdenados((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        const itemsComNovaOrdem = newItems.map((item, index) => ({ ...item, ordem: index }));
        
        // Salvar nova ordem no banco
        itemsComNovaOrdem.forEach(async (item) => {
          try {
            await updateStatus(item.id, { ordem: item.ordem });
          } catch (error) {
            console.error("Erro ao atualizar ordem:", error);
          }
        });

        toast.success("Ordem dos status atualizada");
        return itemsComNovaOrdem;
      });
    }
  };

  const handleDragStartStatus = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const activeStatus = statusOrdenados.find(s => s.id === activeId);

  // Carregar fluxo de funcionários do banco de dados
  useEffect(() => {
    if (!loadingUsuarios && usuarios.length > 0) {
      carregarFluxoFuncionarios();
    }
  }, [usuarios, loadingUsuarios]);

  const carregarFluxoFuncionarios = async () => {
    try {
      const { data: fluxoData, error } = await supabase
        .from('funcionarios_fluxo')
        .select('*')
        .order('ordem', { ascending: true });

      if (error) throw error;

      // Criar mapa de funcionários do banco
      const fluxoMap = new Map(fluxoData?.map(f => [f.user_id, f]) || []);

      // Criar lista com TODOS os usuários
      const funcionariosCompletos = usuarios.map((u, index) => {
        const fluxoExistente = fluxoMap.get(u.id);
        return {
          id: u.id,
          nome: u.username,
          username: u.username,
          avatar_url: u.avatar_url,
          ordem: fluxoExistente?.ordem ?? index,
          ativo: fluxoExistente?.ativo ?? true,
        };
      });

      // Ordenar por ordem
      funcionariosCompletos.sort((a, b) => a.ordem - b.ordem);
      setFuncionarios(funcionariosCompletos);
    } catch (error) {
      console.error("Erro ao carregar fluxo de funcionários:", error);
      toast.error("Erro ao carregar configuração de funcionários");
    }
  };

  // Funções para gerenciar funcionários
  const toggleFuncionarioAtivo = (id: string, ativo: boolean) => {
    setFuncionarios(funcionarios.map(v => 
      v.id === id ? { ...v, ativo } : v
    ));
    
    // Salvar no banco automaticamente
    supabase
      .from('funcionarios_fluxo')
      .upsert({
        user_id: id,
        ativo: ativo,
        ordem: funcionarios.find(v => v.id === id)?.ordem || 0,
      }, {
        onConflict: 'user_id'
      })
      .then(({ error }) => {
        if (error) {
          console.error("Erro ao salvar:", error);
          toast.error("Erro ao atualizar funcionário");
        } else {
          toast.success(ativo ? "Funcionário ativado" : "Funcionário desativado");
        }
      });
  };

  const atualizarNomeFuncionario = (id: string, novoNome: string) => {
    setFuncionarios(funcionarios.map(v => v.id === id ? { ...v, nome: novoNome } : v));
  };

  const handleDragEndFuncionarios = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFuncionarios((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        const itemsComNovaOrdem = newItems.map((item, index) => ({ ...item, ordem: index }));
        
        // Salvar nova ordem no banco automaticamente
        itemsComNovaOrdem.forEach(async (item) => {
          try {
            await supabase
              .from('funcionarios_fluxo')
              .upsert({
                user_id: item.id,
                ativo: item.ativo,
                ordem: item.ordem,
              }, {
                onConflict: 'user_id'
              });
          } catch (error) {
            console.error("Erro ao salvar ordem:", error);
          }
        });

        toast.success("Ordem atualizada");
        return itemsComNovaOrdem;
      });
    }
  };

  return (
    <>
      {/* Modal Gerenciar Status */}
      <ModalGerenciarStatus
        open={modalGerenciarStatusOpen}
        onOpenChange={handleModalGerenciarStatusChange}
      />

      <div className="space-y-8">
        {/* Fluxo por Status */}
        <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Fluxo por Status</CardTitle>
              <CardDescription>
                Visualize as etapas do kanban de pedidos
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label htmlFor="ocultar-inativos" className="text-sm text-muted-foreground">
                  Ocultar Inativos
                </label>
                <Switch
                  id="ocultar-inativos"
                  checked={ocultarInativos}
                  onCheckedChange={handleOcultarInativosChange}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalGerenciarStatusOpen(true)}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                Gerenciar Status
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Grid/Canvas do Fluxo */}
          <div
            className="relative rounded-lg p-8 border-2 border-dashed border-border min-h-[400px]"
            style={{
              backgroundImage: `
                linear-gradient(to right, hsl(var(--border) / 0.3) 1px, transparent 1px),
                linear-gradient(to bottom, hsl(var(--border) / 0.3) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
              backgroundColor: 'hsl(var(--muted) / 0.2)'
            }}
          >
          {loadingStatus ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-muted-foreground">Carregando status...</p>
            </div>
          ) : statusOrdenados.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-muted-foreground">Nenhum status cadastrado. Acesse a aba Aparência para criar status.</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStartStatus}
              onDragEnd={handleDragEndStatus}
            >
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <SortableContext
                  items={statusOrdenados.filter(s => ocultarInativos ? s.ativo : true).map(s => s.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  {statusOrdenados
                    .filter(s => ocultarInativos ? s.ativo : true)
                    .map((status, index) => (
                      <div 
                        key={status.id} 
                        className="flex items-center gap-4 animate-fade-in"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <SortableStatus
                          status={status}
                          index={index}
                          onToggleAtivo={toggleStatusAtivo}
                          onToggleExibirNoInicio={toggleExibirNoInicio}
                        />

                        {/* Seta conectora */}
                        {index < statusOrdenados.filter(s => ocultarInativos ? s.ativo : true).length - 1 && (
                          <ArrowRight className="h-8 w-8 text-primary/50 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                </SortableContext>
              </div>
              <DragOverlay>
                {activeStatus ? (
                  <SortableStatus
                    status={activeStatus}
                    index={statusOrdenados.findIndex(s => s.id === activeId)}
                    onToggleAtivo={() => {}}
                    onToggleExibirNoInicio={() => {}}
                    isOverlay
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
          </div>

        {/* Informações */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground">
            <strong>Dica:</strong> Arraste os cartões para reordenar os status. Use o switch para ativar/desativar status.
            Para adicionar, editar ou remover status, acesse a aba "Aparência" &gt; "Status de Pedidos".
          </p>
        </div>
        </CardContent>
      </Card>

    {/* Fluxo por Funcionário */}
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Fluxo por Funcionário</CardTitle>
            <CardDescription>
              Personalize a ordem dos funcionários no kanban. As alterações serão refletidas na página Início.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="ocultar-inativos-funcionarios" className="text-sm text-muted-foreground">
              Ocultar Inativos
            </label>
            <Switch
              id="ocultar-inativos-funcionarios"
              checked={ocultarInativosFuncionarios}
              onCheckedChange={handleOcultarInativosFuncionariosChange}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Grid/Canvas do Fluxo de Funcionários */}
        <div 
          className="relative rounded-lg p-8 border-2 border-dashed border-border min-h-[400px]"
          style={{
            backgroundImage: `
              linear-gradient(to right, hsl(var(--border) / 0.3) 1px, transparent 1px),
              linear-gradient(to bottom, hsl(var(--border) / 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
            backgroundColor: 'hsl(var(--muted) / 0.2)'
          }}
        >
          {loadingUsuarios ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-muted-foreground">Carregando funcionários...</p>
            </div>
          ) : funcionarios.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-muted-foreground">Nenhum funcionário cadastrado ainda</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEndFuncionarios}
            >
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <SortableContext
                  items={funcionarios.filter(f => ocultarInativosFuncionarios ? f.ativo : true).map(v => v.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  {funcionarios
                    .filter(f => ocultarInativosFuncionarios ? f.ativo : true)
                    .map((funcionario, index) => (
                      <div 
                        key={funcionario.id} 
                        className="flex items-center gap-4 animate-fade-in"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <SortableFuncionario
                          funcionario={funcionario}
                          onToggleAtivo={toggleFuncionarioAtivo}
                          editingId={editingFuncionarioId}
                          setEditingId={setEditingFuncionarioId}
                          onUpdateNome={atualizarNomeFuncionario}
                        />

                        {/* Linha conectora */}
                        {index < funcionarios.filter(f => ocultarInativosFuncionarios ? f.ativo : true).length - 1 && (
                          <div className="w-8 h-0.5 bg-primary/30" />
                        )}
                      </div>
                    ))}
                </SortableContext>
              </div>
            </DndContext>
          )}
        </div>

        {/* Informações */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground">
            <strong>Dica:</strong> Arraste os cartões para reordenar os funcionários. Use o switch para ativar/desativar funcionários.
            Todas as alterações são salvas automaticamente.
          </p>
        </div>
      </CardContent>
    </Card>
      </div>
    </>
  );
}
