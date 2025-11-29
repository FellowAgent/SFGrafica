import { useState, useEffect } from "react";
import { Search, Download, Calendar, UserCircle, Bot, ArrowUpDown, X, Filter, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import Sidebar from "@/components/layout/Sidebar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CircularCheckbox } from "@/components/ui/circular-checkbox";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { AutosuggestInput } from "@/components/ui/autosuggest-input";
import { format } from "date-fns";
import { formatBRL } from "@/utils/inputMasks";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { usePedidos } from "@/hooks/usePedidos";
import { useUserProfile } from "@/hooks/useUserProfile";

interface Venda {
  id: string;
  nomeCliente: string;
  nomeProduto: string;
  valor: number;
  formaPagamento: string;
  status: "novo pedido" | "em produção" | "finalizado" | "cancelado";
  data: string;
  canal: "Balcão" | "Agente de IA";
}

type SortField = "nomeCliente" | "nomeProduto" | "valor" | "formaPagamento" | "status" | "data" | "canal";
type SortOrder = "asc" | "desc";


const Financeiro = () => {
  const navigate = useNavigate();
  const { pedidos } = usePedidos();
  const { userProfile, updateProfile } = useUserProfile();
  const [pesquisa, setPesquisa] = useState("");
  const [filtroData, setFiltroData] = useState("este-mes");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  
  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  
  // Estados para filtros avançados
  const [filtroVendedor, setFiltroVendedor] = useState("");
  const [filtroMeioPagamento, setFiltroMeioPagamento] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroCanal, setFiltroCanal] = useState("");
  const [filtroProduto, setFiltroProduto] = useState("");
  
  // Estados para o datepicker personalizado
  const [dataInicio, setDataInicio] = useState<Date | undefined>(undefined);
  const [dataFim, setDataFim] = useState<Date | undefined>(undefined);
  
  // Estados para popover
  const [filtrosOpen, setFiltrosOpen] = useState(false);
  const [dataOpen, setDataOpen] = useState(false);
  
  // Carregar preferências de paginação
  useEffect(() => {
    if (userProfile) {
      if (userProfile.preferencias_financeiro_paginacao) {
        const paginacao = userProfile.preferencias_financeiro_paginacao as any;
        if (paginacao?.pageSize) {
          setPageSize(paginacao.pageSize);
        }
      }
    }
  }, [userProfile]);
  
  // Resetar para primeira página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [pesquisa, filtroData, filtroVendedor, filtroMeioPagamento, filtroStatus, filtroCanal, filtroProduto, sortField, sortOrder]);

  const vendas: Venda[] = pedidos.map(pedido => ({
    id: pedido.id,
    nomeCliente: (pedido as any).clientes?.nome || "Cliente não informado",
    nomeProduto: "Ver detalhes",
    valor: pedido.valor_final || 0,
    formaPagamento: pedido.meio_pagamento || "N/A",
    status: (pedido.status === "Entregue" ? "finalizado" : 
            pedido.status === "Em Produção" ? "em produção" :
            pedido.status === "Cancelado" ? "cancelado" : "novo pedido") as "cancelado" | "em produção" | "finalizado" | "novo pedido",
    data: new Date(pedido.created_at).toISOString().split('T')[0],
    canal: "Balcão" as const
  }));

  const vendasFiltradas = vendas.filter((venda) => {
    const matchPesquisa =
      pesquisa === "" ||
      venda.nomeCliente.toLowerCase().includes(pesquisa.toLowerCase()) ||
      venda.nomeProduto.toLowerCase().includes(pesquisa.toLowerCase()) ||
      venda.id.includes(pesquisa);

    const matchStatus =
      filtroStatus === "" || venda.status === filtroStatus;

    const matchCanal =
      filtroCanal === "" || venda.canal === filtroCanal;
      
    const matchMeioPagamento =
      filtroMeioPagamento === "" || venda.formaPagamento === filtroMeioPagamento;
      
    const matchProduto =
      filtroProduto === "" || venda.nomeProduto.toLowerCase().includes(filtroProduto.toLowerCase());

    return matchPesquisa && matchStatus && matchCanal && matchMeioPagamento && matchProduto;
  });

  const vendasOrdenadas = [...vendasFiltradas].sort((a, b) => {
    if (!sortField) return 0;

    let aValue = a[sortField];
    let bValue = b[sortField];

    if (sortField === "valor") {
      aValue = a.valor;
      bValue = b.valor;
    }

    if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
    if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });
  
  // Paginação
  const totalCount = vendasOrdenadas.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const vendasPaginadas = vendasOrdenadas.slice(startIndex, endIndex);

  const totalVendas = vendasOrdenadas.reduce(
    (acc, venda) => acc + venda.valor,
    0
  );

  const getStatusVariant = (status: Venda["status"]) => {
    switch (status) {
      case "novo pedido":
        return "default";
      case "em produção":
        return "outline";
      case "finalizado":
        return "secondary";
      case "cancelado":
        return "destructive";
      default:
        return "default";
    }
  };

  const getStatusColor = (status: Venda["status"]) => {
    switch (status) {
      case "novo pedido":
        return "min-w-[120px] justify-center bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30";
      case "em produção":
        return "min-w-[120px] justify-center bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30";
      case "finalizado":
        return "min-w-[120px] justify-center bg-green-500/10 text-green-600 border-green-500/20 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30";
      case "cancelado":
        return "min-w-[120px] justify-center bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30";
      default:
        return "min-w-[120px] justify-center bg-muted text-muted-foreground border-border";
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const limparFiltros = () => {
    setPesquisa("");
    setFiltroData("este-mes");
    setFiltroVendedor("");
    setFiltroMeioPagamento("");
    setFiltroStatus("");
    setFiltroCanal("");
    setFiltroProduto("");
    setDataInicio(undefined);
    setDataFim(undefined);
    setSortField(null);
    setSortOrder("asc");
  };
  
  const aplicarFiltrosData = () => {
    setDataOpen(false);
  };
  
  const limparFiltrosData = () => {
    setFiltroData("este-mes");
    setDataInicio(undefined);
    setDataFim(undefined);
  };
  
  const aplicarFiltrosAvancados = () => {
    setFiltrosOpen(false);
  };
  
  const limparFiltrosAvancados = () => {
    setFiltroVendedor("");
    setFiltroMeioPagamento("");
    setFiltroStatus("");
    setFiltroCanal("");
    setFiltroProduto("");
  };

  const temFiltrosAtivos = 
    pesquisa !== "" || 
    filtroData !== "este-mes" || 
    filtroVendedor !== "" || 
    filtroMeioPagamento !== "" || 
    filtroStatus !== "" || 
    filtroCanal !== "" || 
    filtroProduto !== "" ||
    dataInicio !== undefined ||
    dataFim !== undefined;

  const handleExportar = () => {
    if (selectedRows.length === 0) {
      console.log("Nenhum registro selecionado para exportar");
      return;
    }
    console.log("Exportando dados:", selectedRows);
  };

  const handleSelectAll = () => {
    if (selectedRows.length === vendasOrdenadas.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(vendasOrdenadas.map(v => v.id));
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedRows(prev => 
      prev.includes(id) 
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  };

  const handleVerPedido = (venda: Venda) => {
    navigate(`/pedido/${venda.id}`);
  };

  return (
    <>
      <Sidebar type="loja" />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Fixed Header */}
        <div className="flex-shrink-0 px-8 pt-8 pb-4 bg-background">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Pedidos</h1>
              </div>

              {/* Total de Vendas */}
              <Card className="bg-background border-2 border-primary shadow-lg px-6 py-3">
                <span className="text-lg font-medium text-foreground whitespace-nowrap">
                  Total de Vendas: <span className="font-bold text-primary">{formatBRL(totalVendas)}</span>
                </span>
              </Card>
            </div>

            {/* Filtros */}
            <div className="bg-card rounded-2xl border border-border shadow-fellow-md p-4">
              <div className="flex flex-wrap items-center gap-4">
              {/* Pesquisar */}
              <div className="relative flex-1 min-w-[250px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por cliente, produto ou pedido..."
                  value={pesquisa}
                  onChange={(e) => setPesquisa(e.target.value)}
                  className={`pl-10 ${pesquisa ? "border-primary" : ""}`}
                />
                {pesquisa && (
                  <button
                    onClick={() => setPesquisa("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Filtro Data */}
              <Popover open={dataOpen} onOpenChange={setDataOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className={`w-[180px] justify-start gap-2 ${filtroData !== "este-mes" || dataInicio || dataFim ? "border-primary" : ""}`}
                  >
                    <Calendar className="h-4 w-4" />
                    {filtroData === "hoje" ? "Hoje" : 
                     filtroData === "este-mes" ? "Este mês" : 
                     filtroData === "este-ano" ? "Este ano" : 
                     filtroData === "desde-inicio" ? "Desde o início" : 
                     filtroData === "personalizado" ? "Personalizado" : "Este mês"}
                    <ChevronDown className="h-4 w-4 ml-auto" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4" align="start">
                  <RadioGroup value={filtroData} onValueChange={setFiltroData}>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="hoje" id="hoje" />
                        <Label htmlFor="hoje" className="cursor-pointer">Hoje</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="este-mes" id="este-mes" />
                        <Label htmlFor="este-mes" className="cursor-pointer">Este mês</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="este-ano" id="este-ano" />
                        <Label htmlFor="este-ano" className="cursor-pointer">Este ano</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="desde-inicio" id="desde-inicio" />
                        <Label htmlFor="desde-inicio" className="cursor-pointer">Desde o início</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="personalizado" id="personalizado" />
                        <Label htmlFor="personalizado" className="cursor-pointer">Personalizado</Label>
                      </div>
                      
                      {filtroData === "personalizado" && (
                        <div className="pt-3 space-y-3 border-t">
                          <div className="flex items-center gap-2">
                            <Input
                              type="date"
                              value={dataInicio ? format(dataInicio, "yyyy-MM-dd") : ""}
                              onChange={(e) => setDataInicio(e.target.value ? new Date(e.target.value) : undefined)}
                              className="flex-1"
                            />
                            <span className="text-sm text-muted-foreground">até</span>
                            <Input
                              type="date"
                              value={dataFim ? format(dataFim, "yyyy-MM-dd") : ""}
                              onChange={(e) => setDataFim(e.target.value ? new Date(e.target.value) : undefined)}
                              className="flex-1"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </RadioGroup>
                  
                  <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                    <Button variant="outline" onClick={limparFiltrosData}>
                      Limpar
                    </Button>
                    <Button onClick={aplicarFiltrosData}>
                      Aplicar
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Filtros Avançados */}
              <Popover open={filtrosOpen} onOpenChange={setFiltrosOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className={`gap-2 ${filtroVendedor || filtroMeioPagamento || filtroStatus || filtroCanal || filtroProduto ? "border-primary" : ""}`}
                  >
                    <Filter className="h-4 w-4" />
                    Filtros
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[600px] p-6" align="start">
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-6">
                      {/* Coluna 1 */}
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium mb-2 block">Vendedor</Label>
                          <AutosuggestInput
                            value={filtroVendedor}
                            onChange={(e) => setFiltroVendedor(e.target.value)}
                            placeholder="Buscar vendedor..."
                            showClearButton={!!filtroVendedor}
                            onClear={() => setFiltroVendedor("")}
                          />
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium mb-2 block">Meio de Pagamento</Label>
                          <AutosuggestInput
                            value={filtroMeioPagamento}
                            onChange={(e) => setFiltroMeioPagamento(e.target.value)}
                            placeholder="Buscar pagamento..."
                            showClearButton={!!filtroMeioPagamento}
                            onClear={() => setFiltroMeioPagamento("")}
                          />
                        </div>
                      </div>
                      
                      {/* Coluna 2 */}
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium mb-2 block">Status do Pedido</Label>
                          <AutosuggestInput
                            value={filtroStatus}
                            onChange={(e) => setFiltroStatus(e.target.value)}
                            placeholder="Buscar status..."
                            showClearButton={!!filtroStatus}
                            onClear={() => setFiltroStatus("")}
                          />
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium mb-2 block">Canal</Label>
                          <AutosuggestInput
                            value={filtroCanal}
                            onChange={(e) => setFiltroCanal(e.target.value)}
                            placeholder="Buscar canal..."
                            showClearButton={!!filtroCanal}
                            onClear={() => setFiltroCanal("")}
                          />
                        </div>
                      </div>
                      
                      {/* Coluna 3 */}
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium mb-2 block">Produto</Label>
                          <AutosuggestInput
                            value={filtroProduto}
                            onChange={(e) => setFiltroProduto(e.target.value)}
                            placeholder="Buscar produto..."
                            showClearButton={!!filtroProduto}
                            onClear={() => setFiltroProduto("")}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                    <Button variant="outline" onClick={limparFiltrosAvancados}>
                      Limpar
                    </Button>
                    <Button onClick={aplicarFiltrosAvancados}>
                      Aplicar
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Botão Limpar Filtros */}
              {temFiltrosAtivos && (
                <Button onClick={limparFiltros} variant="outline" className="gap-2">
                  <X className="h-4 w-4" />
                  Limpar Filtros
                </Button>
              )}
              </div>
            </div>

            {/* Action Buttons - Only shown when items are selected */}
            {selectedRows.length > 0 && (
              <div className="flex flex-wrap gap-2 p-4 bg-card rounded-lg border border-border mt-4">
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto px-8 pb-8">
          <div className="max-w-7xl mx-auto">
            {/* Tabela */}
            <div className="rounded-lg border bg-card shadow-fellow-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <CircularCheckbox
                        checked={selectedRows.length === vendasOrdenadas.length && vendasOrdenadas.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("nomeCliente")}
                    >
                      <div className="flex items-center gap-1">
                        Nome do Cliente
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("nomeProduto")}
                    >
                      <div className="flex items-center gap-1">
                        Nome do Produto
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("valor")}
                    >
                      <div className="flex items-center gap-1">
                        Valor
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("formaPagamento")}
                    >
                      <div className="flex items-center gap-1">
                        Forma de Pagamento
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("status")}
                    >
                      <div className="flex items-center gap-1">
                        Status
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("data")}
                    >
                      <div className="flex items-center gap-1">
                        Data
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("canal")}
                    >
                      <div className="flex items-center gap-1">
                        Canal
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendasPaginadas.map((venda, index) => (
                    <TableRow
                      key={venda.id}
                      className={`${
                        index % 2 === 0 ? "bg-muted/30" : ""
                      }`}
                    >
                      <TableCell className="w-12">
                        <CircularCheckbox
                          checked={selectedRows.includes(venda.id)}
                          onCheckedChange={() => handleSelectRow(venda.id)}
                        />
                      </TableCell>
                      <TableCell 
                        className="font-medium cursor-pointer"
                        onClick={() => handleVerPedido(venda)}
                      >
                        {venda.nomeCliente}
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer"
                        onClick={() => handleVerPedido(venda)}
                      >
                        {venda.nomeProduto}
                      </TableCell>
                      <TableCell 
                        className="font-bold cursor-pointer"
                        onClick={() => handleVerPedido(venda)}
                      >
                        {formatBRL(venda.valor)}
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer"
                        onClick={() => handleVerPedido(venda)}
                      >
                        {venda.formaPagamento}
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer"
                        onClick={() => handleVerPedido(venda)}
                      >
                        <Badge className={getStatusColor(venda.status)}>
                          {venda.status}
                        </Badge>
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer"
                        onClick={() => handleVerPedido(venda)}
                      >
                        {new Date(venda.data).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer"
                        onClick={() => handleVerPedido(venda)}
                      >
                        <div className="flex items-center gap-2">
                          {venda.canal === "Balcão" ? (
                            <>
                              <UserCircle className="h-4 w-4 text-muted-foreground" />
                              <span>Balcão</span>
                            </>
                          ) : (
                            <>
                              <Bot className="h-4 w-4 text-muted-foreground" />
                              <span>Agente de IA</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Rodapé de Paginação */}
            {vendasOrdenadas.length > 0 && (
              <div className="mt-6 px-4 py-3 bg-card rounded-lg border border-border">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {startIndex + 1} até {Math.min(endIndex, totalCount)} de {totalCount} pedidos
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Select value={pageSize.toString()} onValueChange={async (v) => {
                      const newPageSize = Number(v);
                      setPageSize(newPageSize);
                      setCurrentPage(1);
                      
                      // Salvar preferência de paginação
                      try {
                        await updateProfile({
                          preferencias_financeiro_paginacao: {
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
                        Página {currentPage} de {totalPages}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                      >
                        Próxima
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage >= totalPages}
                      >
                        Última
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
};

export default Financeiro;