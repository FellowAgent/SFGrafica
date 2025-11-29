import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Grid3x3, List, Edit, CheckCircle, XCircle, Download, Phone, X, Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useClientes } from "@/hooks/useClientes";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCelular } from "@/utils/inputMasks";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CircularCheckbox } from "@/components/ui/circular-checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ClienteForm } from "@/components/clientes/ClienteForm";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/integrations/supabase";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { TableSkeleton, CardGridSkeleton } from "@/components/ui/skeleton-loaders";
import { useUserProfile } from "@/hooks/useUserProfile";

const Clientes = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    user
  } = useSupabaseAuth();
  const { userProfile, updateProfile } = useUserProfile();
  const {
    clientes,
    loading,
    totalCount,
    globalStats,
    deleteCliente,
    toggleStatus,
    fetchClientes
  } = useClientes();
  const [viewMode, setViewMode] = useState<"lista" | "grid">("lista");
  const [searchInput, setSearchInput] = useState("");
  const searchTerm = useDebouncedValue(searchInput, 300);
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterTipo, setFilterTipo] = useState<string>("todos");
  const [ordenacao, setOrdenacao] = useState<string>("name-asc");
  const [selectedClientes, setSelectedClientes] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const minSearchChars = 2;
  const modalFromUrl = searchParams.get("modal");
  const clienteIdFromUrl = searchParams.get("clienteId");
  const [dialogOpen, setDialogOpen] = useState(modalFromUrl === "novo" || modalFromUrl === "editar");
  const [editandoCliente, setEditandoCliente] = useState<any | null>(null);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [clienteWhatsapp, setClienteWhatsapp] = useState<any | null>(null);
  const [mensagemWhatsapp, setMensagemWhatsapp] = useState("");

  // Carregar preferências do perfil
  useEffect(() => {
    if (userProfile) {
      // Carregar visualização
      if (userProfile.preferencia_visualizacao_clientes) {
        setViewMode(userProfile.preferencia_visualizacao_clientes as "lista" | "grid");
      }
      
      // Carregar preferência de paginação
      if (userProfile.preferencias_clientes_paginacao) {
        const paginacao = userProfile.preferencias_clientes_paginacao as any;
        if (paginacao?.pageSize) {
          setPageSize(paginacao.pageSize);
        }
      }
    }
  }, [userProfile]);

  // Salvar preferência ao mudar visualização
  const handleViewModeChange = async (newMode: "lista" | "grid") => {
    setViewMode(newMode);
    try {
      await updateProfile({
        preferencia_visualizacao_clientes: newMode
      });
    } catch (error) {
      console.error('Erro ao salvar preferência de visualização:', error);
    }
  };

  // Sincronizar com URL params
  useEffect(() => {
    if (modalFromUrl === "novo" || modalFromUrl === "editar") {
      setDialogOpen(true);
      if (modalFromUrl === "editar" && clienteIdFromUrl) {
        const cliente = clientes.find(c => c.id === clienteIdFromUrl);
        if (cliente) setEditandoCliente(cliente);
      }
    } else {
      setDialogOpen(false);
      setEditandoCliente(null);
    }
  }, [modalFromUrl, clienteIdFromUrl, clientes]);
  const handleDialogClose = () => {
    navigate("/clientes", {
      replace: true
    });
    setDialogOpen(false);
    setEditandoCliente(null);
    fetchClientes(currentPage, pageSize, searchTerm, filterStatus, filterTipo);
  };
  const handleAbrirNovoCliente = () => {
    navigate("/clientes?modal=novo");
  };

  // Buscar clientes quando filtros mudarem
  useEffect(() => {
    const shouldSearch = searchTerm.length >= minSearchChars || searchTerm.length === 0;
    if (shouldSearch) {
      setCurrentPage(1); // Resetar para página 1 ao mudar filtros
      fetchClientes(1, pageSize, searchTerm, filterStatus, filterTipo);
    }
  }, [searchTerm, filterStatus, filterTipo, pageSize]);

  // Buscar clientes quando página mudar
  useEffect(() => {
    const shouldSearch = searchTerm.length >= minSearchChars || searchTerm.length === 0;
    if (shouldSearch) {
      fetchClientes(currentPage, pageSize, searchTerm, filterStatus, filterTipo);
    }
  }, [currentPage]);

  // Ordenação client-side (já que são poucos registros por página)
  const filteredClientes = [...clientes].sort((a, b) => {
    if (ordenacao === "name-asc") {
      return a.nome.localeCompare(b.nome);
    } else if (ordenacao === "name-desc") {
      return b.nome.localeCompare(a.nome);
    }
    return 0;
  });
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedClientes(clientes.map(c => c.id));
    } else {
      setSelectedClientes([]);
    }
  };
  const handleSelectCliente = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedClientes([...selectedClientes, id]);
    } else {
      setSelectedClientes(selectedClientes.filter(cId => cId !== id));
    }
  };
  const handleEditarCliente = (cliente: any) => {
    navigate(`/clientes?modal=editar&clienteId=${cliente.id}`);
  };
  const handleToggleStatusSelected = async () => {
    if (selectedClientes.length === 0) return;
    
    // Verifica se todos os clientes selecionados estão ativos
    const todosAtivos = selectedClientes.every(id => {
      const cliente = clientes.find(c => c.id === id);
      return cliente?.ativo;
    });
    
    // Se todos estão ativos, desativa. Caso contrário, ativa
    const novoStatus = !todosAtivos;
    
    for (const id of selectedClientes) {
      await toggleStatus(id, novoStatus);
    }
    setSelectedClientes([]);
  };
  
  const handleToggleStatus = async (id: string, novoStatus: boolean) => {
    await toggleStatus(id, novoStatus);
  };

  const handleOpenWhatsapp = (cliente: any) => {
    setClienteWhatsapp(cliente);
    setMensagemWhatsapp("");
    setWhatsappModalOpen(true);
  };

  const getWhatsappUrl = () => {
    if (!clienteWhatsapp) return '#';
    const telefone = clienteWhatsapp.celular?.replace(/\D/g, '');
    const mensagem = encodeURIComponent(mensagemWhatsapp);
    return `https://wa.me/${telefone}${mensagem ? `?text=${mensagem}` : ''}`;
  };

  return <>
      <Sidebar type="loja" />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex-shrink-0 px-8 pt-8 pb-4 bg-background">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
                
                {/* Estatísticas dos Clientes - alinhadas à direita */}
                <div className="ml-auto flex items-center gap-2">
                  <div className="flex items-center justify-center gap-1.5 px-3 py-2 h-10 rounded-lg bg-muted/50 border border-border transition-all hover:shadow-sm">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-muted-foreground font-medium">Total</span>
                      <span className="text-sm font-bold text-foreground animate-scale-in">{globalStats.total}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center gap-1.5 px-3 py-2 h-10 rounded-lg bg-green-500/10 border border-green-500/20 transition-all hover:shadow-sm">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-green-700 dark:text-green-400 font-medium">Ativos</span>
                      <span className="text-sm font-bold text-green-700 dark:text-green-400 animate-scale-in">{globalStats.ativos}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center gap-1.5 px-3 py-2 h-10 rounded-lg bg-red-500/10 border border-red-500/20 transition-all hover:shadow-sm">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-red-700 dark:text-red-400 font-medium">Inativos</span>
                      <span className="text-sm font-bold text-red-700 dark:text-red-400 animate-scale-in">{globalStats.inativos}</span>
                    </div>
                  </div>
                  
                  <div className="h-6 w-px bg-border" />
                  
                  <div className="flex items-center justify-center gap-1.5 px-3 py-2 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 transition-all hover:shadow-sm">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-blue-700 dark:text-blue-400 font-medium">PF</span>
                      <span className="text-sm font-bold text-blue-700 dark:text-blue-400 animate-scale-in">{globalStats.pf}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center gap-1.5 px-3 py-2 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 transition-all hover:shadow-sm">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-purple-700 dark:text-purple-400 font-medium">PJ</span>
                      <span className="text-sm font-bold text-purple-700 dark:text-purple-400 animate-scale-in">{globalStats.pj}</span>
                    </div>
                  </div>
                </div>
                
                <Button onClick={handleAbrirNovoCliente} variant="add" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar Cliente
                </Button>
              </div>
            </div>
              
            <Dialog open={dialogOpen} onOpenChange={open => {
              if (!open) handleDialogClose();
            }}>
              <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto bg-card border-border" onInteractOutside={handleDialogClose}>
                <DialogHeader>
                  <DialogTitle>{editandoCliente ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
                </DialogHeader>
                <ClienteForm cliente={editandoCliente} onSuccess={handleDialogClose} onClose={handleDialogClose} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="flex-shrink-0 px-8 pb-4 bg-background">
          <div className="max-w-7xl mx-auto">
            <div className="bg-card rounded-2xl border border-border shadow-fellow-md p-4">
              <div className="flex items-center gap-4">
                {/* Search */}
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Pesquisar por nome ou CPF/CNPJ..." 
                      value={searchInput} 
                      onChange={e => setSearchInput(e.target.value)} 
                      className="pl-10 pr-10" 
                    />
                    {searchInput && <button onClick={() => setSearchInput("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" />
                      </button>}
                  </div>
                  {searchInput.length > 0 && searchInput.length < minSearchChars && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Digite pelo menos {minSearchChars} caracteres para buscar
                    </p>
                  )}
                </div>

                {/* Filters */}
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[180px]" showClear={filterStatus !== "todos"} onClear={() => setFilterStatus("todos")}>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Status</SelectItem>
                    <SelectItem value="ativos">Ativos</SelectItem>
                    <SelectItem value="inativos">Inativos</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterTipo} onValueChange={setFilterTipo}>
                  <SelectTrigger className="w-[180px]" showClear={filterTipo !== "todos"} onClear={() => setFilterTipo("todos")}>
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos tipos Pessoa</SelectItem>
                    <SelectItem value="Pessoa Física">Pessoa Física</SelectItem>
                    <SelectItem value="Pessoa Jurídica">Pessoa Jurídica</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={ordenacao} onValueChange={setOrdenacao}>
                  <SelectTrigger className="w-[180px]" showClear={ordenacao !== "name-asc"} onClear={() => setOrdenacao("name-asc")}>
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-asc">A&gt;Z - Crescente</SelectItem>
                    <SelectItem value="name-desc">Z&gt;A - Decrescente</SelectItem>
                  </SelectContent>
                </Select>

                {/* View Mode */}
                <div className="flex gap-2 ml-auto">
                  <Button variant={viewMode === "lista" ? "viewActive" : "viewInactive"} size="icon" onClick={() => handleViewModeChange("lista")}>
                    <List className="h-4 w-4" />
                  </Button>
                  <Button variant={viewMode === "grid" ? "viewActive" : "viewInactive"} size="icon" onClick={() => handleViewModeChange("grid")}>
                    <Grid3x3 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons - Only shown when items are selected */}
        {selectedClientes.length > 0 && (() => {
          const todosAtivos = selectedClientes.every(id => {
            const cliente = clientes.find(c => c.id === id);
            return cliente?.ativo;
          });
          
          return (
            <div className="flex-shrink-0 px-8 pb-4 bg-background">
              <div className="max-w-7xl mx-auto">
                <div className="flex flex-wrap gap-2 p-4 bg-card rounded-lg border border-border">
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => {
                    if (selectedClientes.length === 1) {
                      const cliente = clientes.find(c => c.id === selectedClientes[0]);
                      if (cliente) handleEditarCliente(cliente);
                    }
                  }} disabled={selectedClientes.length !== 1}>
                    <Edit className="h-4 w-4" />
                    Editar
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2" onClick={handleToggleStatusSelected}>
                    {todosAtivos ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                    {todosAtivos ? "Desativar" : "Ativar"}
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Exportar
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-auto px-8 pb-8">
          <div className="max-w-7xl mx-auto">
            {loading ? (
              viewMode === "lista" ? (
                <TableSkeleton rows={10} columns={7} />
              ) : (
                <CardGridSkeleton count={9} />
              )
            ) : (
              <>
                {/* Table View */}
                {viewMode === "lista" && <div className="bg-card rounded-2xl border border-border shadow-fellow-md overflow-hidden animate-fade-in">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-12">
                        <CircularCheckbox checked={selectedClientes.length === clientes.length && clientes.length > 0} onCheckedChange={handleSelectAll} />
                      </TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>CPF/CNPJ</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Cliente desde</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {searchInput.length > 0 && searchInput.length < minSearchChars 
                            ? `Digite pelo menos ${minSearchChars} caracteres para buscar`
                            : 'Nenhum cliente encontrado'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      clientes.map((cliente, index) => <TableRow 
                        key={cliente.id} 
                        className={`${index % 2 === 0 ? "bg-background" : "bg-muted/20"} animate-fade-in`}
                        style={{ animationDelay: `${Math.min(index * 0.03, 0.5)}s` }}
                      >
                        <TableCell>
                          <CircularCheckbox checked={selectedClientes.includes(cliente.id)} onCheckedChange={checked => handleSelectCliente(cliente.id, checked as boolean)} />
                        </TableCell>
                        <TableCell className="font-bold cursor-pointer hover:text-primary transition-colors" onClick={() => handleEditarCliente(cliente)}>
                          {cliente.nome}
                        </TableCell>
                        <TableCell>
                          <button 
                            onClick={() => handleOpenWhatsapp(cliente)}
                            className="flex items-center gap-2 text-accent hover:underline cursor-pointer"
                          >
                            <Phone className="h-4 w-4" />
                            {formatCelular(cliente.celular)}
                          </button>
                        </TableCell>
                        <TableCell>{cliente.cpf_cnpj}</TableCell>
                        <TableCell>{cliente.tipo}</TableCell>
                        <TableCell>{format(new Date(cliente.created_at), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch checked={cliente.ativo} onCheckedChange={checked => handleToggleStatus(cliente.id, checked)} />
                            <span className="text-sm">{cliente.ativo ? "Ativo" : "Inativo"}</span>
                          </div>
                        </TableCell>
                      </TableRow>)
                    )}
                  </TableBody>
                </Table>
              </div>}

            {/* Grid View */}
            {viewMode === "grid" && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clientes.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-muted-foreground animate-fade-in">
                    {searchInput.length > 0 && searchInput.length < minSearchChars 
                      ? `Digite pelo menos ${minSearchChars} caracteres para buscar`
                      : 'Nenhum cliente encontrado'}
                  </div>
                ) : (
                  clientes.map((cliente, index) => <div 
                    key={cliente.id} 
                    className="bg-card rounded-2xl border border-border shadow-fellow-md p-6 hover:shadow-fellow-lg transition-all card-hover animate-fade-in"
                    style={{ animationDelay: `${Math.min(index * 0.05, 0.8)}s` }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-foreground mb-1">{cliente.nome}</h3>
                        <p className="text-sm text-muted-foreground">{formatCelular(cliente.celular)}</p>
                      </div>
                      <CircularCheckbox checked={selectedClientes.includes(cliente.id)} onCheckedChange={checked => handleSelectCliente(cliente.id, checked as boolean)} />
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">CPF/CNPJ:</span>
                        <span className="font-medium">{cliente.cpf_cnpj}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tipo:</span>
                        <span className="font-medium">{cliente.tipo}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Cliente desde:</span>
                        <span className="font-medium">{format(new Date(cliente.created_at), 'dd/MM/yyyy')}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch checked={cliente.ativo} onCheckedChange={checked => handleToggleStatus(cliente.id, checked)} />
                        <span className="text-sm">{cliente.ativo ? "Ativo" : "Inativo"}</span>
                      </div>
                      <a href={`https://wa.me/${cliente.celular?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                      </a>
                    </div>
                  </div>)
                )}
              </div>}

              </>
            )}

            {/* Paginação */}
            {!loading && clientes.length > 0 && (
              <div className="flex items-center justify-between mt-6 px-4 py-3 bg-card rounded-lg border border-border">
                <div className="text-sm text-muted-foreground">
                  Mostrando {((currentPage - 1) * pageSize) + 1} até {Math.min(currentPage * pageSize, totalCount)} de {totalCount} clientes
                </div>
                
                <div className="flex items-center gap-3">
                  <Select value={pageSize.toString()} onValueChange={async (v) => {
                    const newPageSize = Number(v);
                    setPageSize(newPageSize);
                    setCurrentPage(1);
                    
                    // Salvar preferência de paginação
                    try {
                      await updateProfile({
                        preferencias_clientes_paginacao: {
                          pageSize: newPageSize
                        }
                      });
                    } catch (error) {
                      console.error('Erro ao salvar preferência de paginação:', error);
                    }
                  }}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 por página</SelectItem>
                      <SelectItem value="25">25 por página</SelectItem>
                      <SelectItem value="50">50 por página</SelectItem>
                      <SelectItem value="100">100 por página</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      Primeira
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    
                    <div className="px-3 py-1 text-sm">
                      Página {currentPage} de {Math.ceil(totalCount / pageSize)}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalCount / pageSize), p + 1))}
                      disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                    >
                      Próxima
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.ceil(totalCount / pageSize))}
                      disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                    >
                      Última
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* WhatsApp Modal */}
        <Dialog open={whatsappModalOpen} onOpenChange={setWhatsappModalOpen}>
          <DialogContent className="max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-accent" />
                Enviar mensagem via WhatsApp
              </DialogTitle>
            </DialogHeader>
            
            {clienteWhatsapp && (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cliente:</span>
                    <span className="font-medium">{clienteWhatsapp.nome}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Celular:</span>
                    <span className="font-medium">{formatCelular(clienteWhatsapp.celular)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Mensagem (opcional)</label>
                  <Textarea
                    placeholder="Digite sua mensagem aqui..."
                    value={mensagemWhatsapp}
                    onChange={(e) => setMensagemWhatsapp(e.target.value)}
                    rows={5}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    A mensagem será enviada via WhatsApp Web
                  </p>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button 
                    variant="outline" 
                    onClick={() => setWhatsappModalOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    asChild
                    className="gap-2"
                  >
                    <a 
                      href={getWhatsappUrl()} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={() => setWhatsappModalOpen(false)}
                    >
                      <Send className="h-4 w-4" />
                      Abrir WhatsApp
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </>;
};
export default Clientes;