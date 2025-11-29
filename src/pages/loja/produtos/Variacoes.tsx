import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, Eye, EyeOff, LayoutGrid, Network, ChevronDown, ChevronRight } from "lucide-react";
import { useTemplatesVariacoes } from "@/hooks/useTemplatesVariacoes";
import { useAtributosVariacao } from "@/hooks/useAtributosVariacao";
import { ModalGerenciarVariacoes } from "@/components/produtos/variacoes/ModalGerenciarVariacoes";
import Sidebar from "@/components/layout/Sidebar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
export default function Variacoes() {
  const {
    user
  } = useSupabaseAuth();
  const {
    templates,
    loading,
    fetchTemplates,
    deleteTemplate,
    updateTemplate
  } = useTemplatesVariacoes();
  const {
    atributos,
    fetchAtributos
  } = useAtributosVariacao();
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "tree">("grid");
  const [ordenacao, setOrdenacao] = useState<string>("name-asc");
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());
  const [templateAtributos, setTemplateAtributos] = useState<Map<string, any[]>>(new Map());

  // Carregar preferências do usuário
  useEffect(() => {
    const loadPreferences = async () => {
      if (user?.id) {
        try {
          const {
            data: perfil
          } = await supabase.from('perfis').select('preferencias_variacoes').eq('id', user.id).single();
          if (perfil?.preferencias_variacoes) {
            const prefs = perfil.preferencias_variacoes as any;
            if (prefs.viewMode) setViewMode(prefs.viewMode);
            if (prefs.ordenacao) setOrdenacao(prefs.ordenacao);
          }
        } catch (error) {
          console.error('Erro ao carregar preferências:', error);
        }
      }
    };
    loadPreferences();
  }, [user?.id]);

  // Salvar preferências quando mudarem
  const savePreferences = async (updates: any) => {
    if (user?.id) {
      try {
        const {
          data: perfil
        } = await supabase.from('perfis').select('preferencias_variacoes').eq('id', user.id).single();
        const currentPrefs = perfil?.preferencias_variacoes as any || {};
        const newPrefs = {
          ...currentPrefs,
          ...updates
        };
        await supabase.from('perfis').update({
          preferencias_variacoes: newPrefs
        }).eq('id', user.id);
      } catch (error) {
        console.error('Erro ao salvar preferências:', error);
      }
    }
  };
  const handleViewModeChange = (newMode: "grid" | "tree") => {
    setViewMode(newMode);
    savePreferences({
      viewMode: newMode
    });
  };
  const handleOrdenacaoChange = (newOrdenacao: string) => {
    setOrdenacao(newOrdenacao);
    savePreferences({
      ordenacao: newOrdenacao
    });
  };

  // Função para normalizar strings removendo acentos
  const normalizeString = (str: string) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  };
  const filteredTemplates = templates.filter(template => normalizeString(template.nome).includes(normalizeString(searchTerm))).sort((a, b) => {
    if (ordenacao === "name-asc") {
      return a.nome.localeCompare(b.nome);
    } else if (ordenacao === "name-desc") {
      return b.nome.localeCompare(a.nome);
    }
    return 0;
  });

  // Carregar atributos de cada template quando em modo árvore
  useEffect(() => {
    if (viewMode === "tree" && filteredTemplates.length > 0) {
      filteredTemplates.forEach(async template => {
        if (!templateAtributos.has(template.id)) {
          await fetchAtributos(template.id);
          setTemplateAtributos(prev => new Map(prev).set(template.id, atributos));
        }
      });
    }
  }, [viewMode, filteredTemplates]);
  const toggleTemplateExpand = (templateId: string) => {
    const newExpanded = new Set(expandedTemplates);
    if (newExpanded.has(templateId)) {
      newExpanded.delete(templateId);
    } else {
      newExpanded.add(templateId);
      // Carregar atributos quando expandir
      fetchAtributos(templateId);
    }
    setExpandedTemplates(newExpanded);
  };
  const handleEdit = (template: any) => {
    setSelectedTemplate(template);
    setModalOpen(true);
  };
  const handleDelete = async () => {
    if (templateToDelete) {
      await deleteTemplate(templateToDelete);
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };
  const toggleStatus = async (id: string, ativo: boolean) => {
    await updateTemplate(id, {
      ativo: !ativo
    });
  };
  const renderAtributoTree = (atributo: any, depth: number = 0) => <div key={atributo.id} className={`ml-${depth * 4}`}>
      <div className="flex items-center gap-2 py-1">
        <Badge variant="outline" className="text-xs">
          {atributo.nome}
        </Badge>
        {atributo.filhos && atributo.filhos.length > 0 && <span className="text-xs text-muted-foreground">
            ({atributo.filhos.length} sub-atributos)
          </span>}
      </div>
      {atributo.filhos && atributo.filhos.length > 0 && <div className="ml-4 border-l-2 border-border pl-2">
          {atributo.filhos.map((filho: any) => renderAtributoTree(filho, depth + 1))}
        </div>}
    </div>;
  return <>
      <Sidebar type="loja" />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex-shrink-0 px-8 pt-8 pb-4 bg-background">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Variações</h1>
              </div>
              <Button onClick={() => {
              setSelectedTemplate(null);
              setModalOpen(true);
            }} variant="add" className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Template
              </Button>
            </div>

            {/* Search and Filters */}
            <div className="bg-card rounded-2xl border border-border shadow-fellow-md p-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Pesquisar variações..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
                </div>

                <Select value={ordenacao} onValueChange={handleOrdenacaoChange}>
                  <SelectTrigger className="w-[180px]" showClear={ordenacao !== "name-asc"} onClear={() => handleOrdenacaoChange("name-asc")}>
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-asc">A&gt;Z - Crescente</SelectItem>
                    <SelectItem value="name-desc">Z&gt;A - Decrescente</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <Button variant={viewMode === "grid" ? "viewActive" : "viewInactive"} size="icon" onClick={() => handleViewModeChange("grid")} title="Visualização em Grade">
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button variant={viewMode === "tree" ? "viewActive" : "viewInactive"} size="icon" onClick={() => handleViewModeChange("tree")} title="Visualização em Árvore">
                    <Network className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-auto px-8 pb-8">
          <div className="max-w-7xl mx-auto">
            {loading ? <div className="text-center py-12">
                <p className="text-muted-foreground">Nenhum template criado ainda.</p>
              </div> : filteredTemplates.length === 0 ? <div className="bg-card rounded-2xl border border-border shadow-fellow-md p-12 text-center">
                <p className="text-muted-foreground">
                  {searchTerm ? "Nenhuma variação encontrada." : "Nenhum template criado ainda."}
                </p>
              </div> : viewMode === "grid" ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
                {filteredTemplates.map((template, index) => <Card key={template.id} className="hover:shadow-lg transition-all duration-200 border-border animate-fade-in" style={{
              animationDelay: `${Math.min(index * 0.03, 0.5)}s`
            }}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{template.nome}</CardTitle>
                          {template.descricao && <CardDescription className="mt-1">{template.descricao}</CardDescription>}
                        </div>
                        <Badge variant={template.ativo ? "default" : "secondary"}>
                          {template.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(template)}>
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => toggleStatus(template.id, template.ativo)}>
                          {template.ativo ? <><EyeOff className="h-4 w-4 mr-1" />Desativar</> : <><Eye className="h-4 w-4 mr-1" />Ativar</>}
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => {
                    setTemplateToDelete(template.id);
                    setDeleteDialogOpen(true);
                  }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>)}
              </div> : <div className="space-y-3 animate-fade-in">
                {filteredTemplates.map((template, index) => <Card key={template.id} className="border-border animate-fade-in" style={{
              animationDelay: `${Math.min(index * 0.03, 0.5)}s`
            }}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => toggleTemplateExpand(template.id)}>
                            {expandedTemplates.has(template.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                          <div className="flex-1">
                            <CardTitle className="text-base">{template.nome}</CardTitle>
                            {template.descricao && <CardDescription className="text-sm mt-1">{template.descricao}</CardDescription>}
                          </div>
                          <Badge variant={template.ativo ? "default" : "secondary"}>
                            {template.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(template)}>
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => toggleStatus(template.id, template.ativo)}>
                            {template.ativo ? <><EyeOff className="h-4 w-4 mr-1" />Desativar</> : <><Eye className="h-4 w-4 mr-1" />Ativar</>}
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => {
                      setTemplateToDelete(template.id);
                      setDeleteDialogOpen(true);
                    }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    {expandedTemplates.has(template.id) && atributos.length > 0 && <CardContent className="pt-0">
                        <div className="pl-11 space-y-2">
                          <p className="text-sm font-medium text-muted-foreground mb-2">Estrutura de Variações:</p>
                          {atributos.map(attr => renderAtributoTree(attr))}
                        </div>
                      </CardContent>}
                  </Card>)}
              </div>}
          </div>
        </div>
      </main>

      {/* Modal de Gerenciamento */}
      <ModalGerenciarVariacoes 
        open={modalOpen} 
        onOpenChange={(isOpen) => {
          setModalOpen(isOpen);
          if (!isOpen) {
            setSelectedTemplate(null);
          }
        }}
        template={selectedTemplate}
        onSuccess={fetchTemplates}
      />

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este template? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>;
}