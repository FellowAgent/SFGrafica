import Sidebar from "@/components/layout/Sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangePicker } from "@/components/relatorios/DateRangePicker";
import { ExportButton } from "@/components/relatorios/ExportButton";
import { FiltrosAvancados } from "@/components/relatorios/FiltrosAvancados";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { VisaoGeralTab } from "@/components/relatorios/tabs/VisaoGeralTab";
import { VendasTab } from "@/components/relatorios/tabs/VendasTab";
import { ProdutosTab } from "@/components/relatorios/tabs/ProdutosTab";
import { ClientesTab } from "@/components/relatorios/tabs/ClientesTab";
import { FinanceiroTab } from "@/components/relatorios/tabs/FinanceiroTab";
import { OperacionalTab } from "@/components/relatorios/tabs/OperacionalTab";
import { RefreshCw, Filter, X, Presentation, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/utils/toastHelper";
import { useRelatorioData } from "@/hooks/useRelatorioData";
import { exportarPDF, exportarExcel, exportarCSV } from "@/utils/exportHelpers";
import { formatDate } from "@/utils/chartHelpers";
import { useState, useEffect } from "react";
import { DateRange } from "react-day-picker";

export default function Relatorios() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [vendedorFiltro, setVendedorFiltro] = useState<string>("todos");
  const [clienteFiltro, setClienteFiltro] = useState<string>("todos");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);

  // Buscar dados otimizados com filtros
  const { pedidos, produtos, clientes, itensPedido, loading } = useRelatorioData({ 
    dateRange,
    status: statusFiltro,
    vendedor: vendedorFiltro,
    cliente: clienteFiltro,
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    toast.success("Dados atualizados!");
  };

  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    try {
      // Preparar informações de filtros
      const periodo = dateRange?.from && dateRange?.to 
        ? `${formatDate(dateRange.from)} até ${formatDate(dateRange.to)}`
        : 'Todos os períodos';
      
      const filtros = {
        periodo,
        status: statusFiltro !== 'todos' ? statusFiltro : undefined,
        vendedor: vendedorFiltro !== 'todos' ? vendedorFiltro : undefined,
        cliente: clienteFiltro !== 'todos' ? clienteFiltro : undefined,
      };

      const timestamp = Date.now();

      switch (format) {
        case 'pdf':
          exportarPDF('pedidos', pedidos, 'Relatório de Pedidos', filtros);
          toast.success("Relatório PDF gerado com sucesso!");
          break;
          
        case 'excel':
          exportarExcel('pedidos', pedidos, `relatorio-pedidos-${timestamp}`);
          toast.success("Relatório Excel gerado com sucesso!");
          break;
          
        case 'csv':
          exportarCSV('pedidos', pedidos, `relatorio-pedidos-${timestamp}`);
          toast.success("Relatório CSV gerado com sucesso!");
          break;
      }
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error("Erro ao exportar relatório. Tente novamente.");
    }
  };

  const activeFiltersCount = [
    statusFiltro !== 'todos',
    vendedorFiltro !== 'todos',
    clienteFiltro !== 'todos',
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setStatusFiltro('todos');
    setVendedorFiltro('todos');
    setClienteFiltro('todos');
    toast.success('Filtros limpos');
  };

  const togglePresentationMode = () => {
    setPresentationMode(!presentationMode);
    if (!presentationMode) {
      toast.success('Modo apresentação ativado', {
        description: 'Pressione ESC ou clique no botão para sair'
      });
    } else {
      toast.success('Modo apresentação desativado');
    }
  };

  // Listener para tecla ESC sair do modo apresentação
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && presentationMode) {
        setPresentationMode(false);
        toast.success('Modo apresentação desativado');
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [presentationMode]);

  return (
    <>
      {/* Sidebar - Oculta no modo apresentação */}
      {!presentationMode && <Sidebar type="loja" />}
      
      <main className={`flex-1 flex flex-col h-screen overflow-hidden ${presentationMode ? 'w-full' : ''}`}>
        {/* Header - Oculto no modo apresentação */}
        {!presentationMode && (
          <div className="flex-shrink-0 px-8 pt-8 pb-4 bg-background">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-foreground mb-2">Relatórios</h1>
                </div>
                
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={togglePresentationMode}
                          className="gap-2 hover-scale transition-all duration-200"
                        >
                          <Presentation className="h-4 w-4" />
                          <span className="hidden lg:inline">Apresentação</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Modo tela cheia para apresentações</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRefresh}
                    className="gap-2 hover-scale transition-all duration-200"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span className="hidden sm:inline">Atualizar</span>
                  </Button>
                  <ExportButton onExport={handleExport} disabled={loading || pedidos.length === 0} />
                </div>
              </div>

              {/* Filters */}
              <div className="bg-card rounded-2xl border border-border shadow-fellow-md p-4">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Período */}
                  <DateRangePicker date={dateRange} onDateChange={setDateRange} />

                  {/* Comparação */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-background/50 transition-colors duration-150">
                    <Switch
                      id="compare"
                      checked={compareEnabled}
                      onCheckedChange={setCompareEnabled}
                      className="data-[state=checked]:bg-primary"
                    />
                    <Label htmlFor="compare" className="cursor-pointer text-sm font-medium">
                      Comparar
                    </Label>
                  </div>

                  {/* Filtros Avançados */}
                  <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2 hover-scale transition-all duration-200 relative"
                      >
                        <Filter className="h-4 w-4" />
                        <span>Filtros</span>
                        {activeFiltersCount > 0 && (
                          <Badge 
                            variant="secondary" 
                            className="ml-1 h-5 min-w-5 px-1.5 animate-scale-in"
                          >
                            {activeFiltersCount}
                          </Badge>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent 
                      className="w-[90vw] max-w-3xl p-0 animate-scale-in" 
                      align="start"
                      sideOffset={8}
                    >
                      <div className="backdrop-blur-sm">
                        {/* Header do Popover */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/30">
                          <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            <h3 className="text-sm font-semibold">Filtros Avançados</h3>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setFiltersOpen(false)}
                            className="h-8 w-8 p-0 hover-scale"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Conteúdo */}
                        <div className="p-4">
                          <FiltrosAvancados
                            statusSelecionado={statusFiltro}
                            funcionarioSelecionado={vendedorFiltro}
                            clienteSelecionado={clienteFiltro}
                            onStatusChange={setStatusFiltro}
                            onFuncionarioChange={setVendedorFiltro}
                            onClienteChange={setClienteFiltro}
                          />
                        </div>

                        {/* Footer com Ações */}
                        <div className="flex items-center justify-between px-4 py-3 border-t border-border/40 bg-muted/20">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearAllFilters}
                            disabled={activeFiltersCount === 0}
                            className="gap-2 hover-scale transition-all duration-200"
                          >
                            <X className="h-4 w-4" />
                            Limpar Filtros
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => setFiltersOpen(false)}
                            className="gap-2 hover-scale transition-all duration-200"
                          >
                            Aplicar
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Botão Flutuante para Sair do Modo Apresentação */}
        {presentationMode && (
          <div className="fixed top-4 right-4 z-50 animate-fade-in">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={togglePresentationMode}
                    className="gap-2 hover-scale transition-all duration-200 shadow-2xl backdrop-blur-sm bg-background/90 border-2"
                    size="sm"
                  >
                    <Minimize2 className="h-4 w-4" />
                    <span>Sair do Modo Apresentação</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Ou pressione ESC</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Conteúdo Principal */}
        <div className={`flex-1 overflow-auto ${presentationMode ? 'px-4 md:px-8 pb-12 pt-4' : 'px-8 pb-12'}`}>
          <div className={`mx-auto space-y-4 ${presentationMode ? 'max-w-full pt-4' : 'max-w-7xl'}`}>

            {/* Tabs de Relatórios */}
            <Tabs defaultValue="visao-geral" className="space-y-4">
              <TabsList>
                <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
                <TabsTrigger value="vendas">Vendas</TabsTrigger>
                <TabsTrigger value="produtos">Produtos</TabsTrigger>
                <TabsTrigger value="clientes">Clientes</TabsTrigger>
                <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
                <TabsTrigger value="operacional">Operacional</TabsTrigger>
              </TabsList>

              <TabsContent value="visao-geral" key={`visao-geral-${refreshKey}`}>
                <VisaoGeralTab dateRange={dateRange} compareEnabled={compareEnabled} />
              </TabsContent>

              <TabsContent value="vendas" key={`vendas-${refreshKey}`}>
                <VendasTab dateRange={dateRange} compareEnabled={compareEnabled} />
              </TabsContent>

              <TabsContent value="produtos" key={`produtos-${refreshKey}`}>
                <ProdutosTab dateRange={dateRange} compareEnabled={compareEnabled} />
              </TabsContent>

              <TabsContent value="clientes" key={`clientes-${refreshKey}`}>
                {loading ? (
                  <div className="text-center py-12 text-muted-foreground">Carregando dados...</div>
                ) : (
                  <ClientesTab 
                    dateRange={dateRange} 
                    compareEnabled={compareEnabled}
                    pedidos={pedidos}
                    clientes={clientes}
                  />
                )}
              </TabsContent>

              <TabsContent value="financeiro" key={`financeiro-${refreshKey}`}>
                {loading ? (
                  <div className="text-center py-12 text-muted-foreground">Carregando dados...</div>
                ) : (
                  <FinanceiroTab 
                    dateRange={dateRange} 
                    compareEnabled={compareEnabled}
                    pedidos={pedidos}
                  />
                )}
              </TabsContent>

              <TabsContent value="operacional" key={`operacional-${refreshKey}`}>
                {loading ? (
                  <div className="text-center py-12 text-muted-foreground">Carregando dados...</div>
                ) : (
                  <OperacionalTab 
                    dateRange={dateRange} 
                    compareEnabled={compareEnabled}
                    pedidos={pedidos}
                    produtos={produtos}
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </>
  );
}
