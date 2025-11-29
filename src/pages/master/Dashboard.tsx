import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import Sidebar from "@/components/layout/Sidebar";
import {
  Search,
  Plus,
  Building2,
  Users,
  DollarSign,
  Package,
  TrendingUp,
  Settings,
  Eye,
  Edit,
  Copy,
} from "lucide-react";

interface ClienteLoja {
  id: string;
  nome: string;
  logo: string;
  ativo: boolean;
  clientes: number;
  faturamento: number;
  produtos: number;
  atendimentos: number;
  dataCriacao: string;
  segmento: string;
}

const Dashboard = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [clientes] = useState<ClienteLoja[]>([
    {
      id: "1",
      nome: "Gráfica Express",
      logo: "📊",
      ativo: true,
      clientes: 245,
      faturamento: 125000,
      produtos: 89,
      atendimentos: 1234,
      dataCriacao: "15/01/2024",
      segmento: "Gráfica Rápida",
    },
    {
      id: "2",
      nome: "PrintMax",
      logo: "🖨️",
      ativo: true,
      clientes: 189,
      faturamento: 98500,
      produtos: 67,
      atendimentos: 890,
      dataCriacao: "22/02/2024",
      segmento: "Gráfica Rápida",
    },
    {
      id: "3",
      nome: "Design Studio",
      logo: "🎨",
      ativo: true,
      clientes: 312,
      faturamento: 178000,
      produtos: 145,
      atendimentos: 2100,
      dataCriacao: "10/12/2023",
      segmento: "Design",
    },
    {
      id: "4",
      nome: "FastPrint",
      logo: "⚡",
      ativo: false,
      clientes: 56,
      faturamento: 23000,
      produtos: 34,
      atendimentos: 234,
      dataCriacao: "05/03/2024",
      segmento: "Gráfica Rápida",
    },
  ]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const filteredClientes = clientes.filter((cliente) =>
    cliente.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col w-full min-h-screen">
      <Sidebar type="master" />
      {/* Header */}
      <header className="bg-card border-b border-border shadow-fellow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Portal Master</h1>
              <p className="text-muted-foreground mt-1">
                Gerencie todos os seus clientes CRM
              </p>
            </div>
            <Button
              className="bg-accent text-accent-foreground hover:bg-accent/90 h-12 px-6 font-semibold shadow-md hover:shadow-lg rounded-xl transition-smooth"
            >
              <Plus className="mr-2 h-5 w-5" />
              Adicionar Cliente
            </Button>
          </div>

          {/* Search Bar */}
          <div className="mt-6 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Pesquisar clientes..."
              className="pl-12 h-12 bg-background rounded-xl border-border focus:ring-accent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 bg-background max-w-7xl mx-auto px-8 py-8 w-full">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-card p-6 rounded-2xl shadow-fellow-md border border-border hover:shadow-fellow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Total Clientes</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {clientes.length}
                </p>
              </div>
              <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center">
                <Building2 className="h-7 w-7 text-accent" />
              </div>
            </div>
          </div>

          <div className="bg-card p-6 rounded-2xl shadow-fellow-md border border-border hover:shadow-fellow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Clientes Ativos</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {clientes.filter((c) => c.ativo).length}
                </p>
              </div>
              <div className="w-14 h-14 bg-accent/20 rounded-2xl flex items-center justify-center">
                <TrendingUp className="h-7 w-7 text-accent" />
              </div>
            </div>
          </div>

          <div className="bg-card p-6 rounded-2xl shadow-fellow-md border border-border hover:shadow-fellow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Faturamento Total</p>
                <p className="text-2xl font-bold text-foreground mt-2">
                  {formatCurrency(
                    clientes.reduce((acc, c) => acc + c.faturamento, 0)
                  )}
                </p>
              </div>
              <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                <DollarSign className="h-7 w-7 text-blue-500" />
              </div>
            </div>
          </div>

          <div className="bg-card p-6 rounded-2xl shadow-fellow-md border border-border hover:shadow-fellow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Clientes Finais</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {clientes.reduce((acc, c) => acc + c.clientes, 0)}
                </p>
              </div>
              <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center">
                <Users className="h-7 w-7 text-purple-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Clients Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClientes.map((cliente) => (
            <div
              key={cliente.id}
              className="bg-card rounded-2xl shadow-fellow-md border border-border overflow-hidden card-hover"
            >
              {/* Card Header */}
              <div className="p-6 border-b border-border">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-accent/20 to-accent/5 rounded-2xl flex items-center justify-center text-3xl border border-accent/20">
                      {cliente.logo}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground">
                        {cliente.nome}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-0.5">{cliente.segmento}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <Badge
                    variant={cliente.ativo ? "default" : "secondary"}
                    className={
                      cliente.ativo
                        ? "bg-accent/20 text-accent border-accent/30 font-medium"
                        : "bg-muted text-muted-foreground font-medium"
                    }
                  >
                    {cliente.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                  <Switch 
                    checked={cliente.ativo} 
                    className="data-[state=checked]:bg-accent"
                  />
                </div>
              </div>

              {/* Card Stats */}
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Clientes</p>
                    <p className="text-xl font-semibold text-foreground">
                      {cliente.clientes}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Produtos</p>
                    <p className="text-xl font-semibold text-foreground">
                      {cliente.produtos}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Faturamento</p>
                  <p className="text-lg font-semibold text-foreground">
                    {formatCurrency(cliente.faturamento)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Atendimentos</p>
                  <p className="text-lg font-semibold text-foreground">
                    {cliente.atendimentos}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Criado em</p>
                  <p className="text-sm font-medium text-foreground">
                    {cliente.dataCriacao}
                  </p>
                </div>
              </div>

              {/* Card Actions */}
              <div className="px-6 pb-6 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  asChild
                >
                  <Link to={`/inicio`}>
                    <Eye className="mr-2 h-4 w-4" />
                    Abrir
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Button>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
