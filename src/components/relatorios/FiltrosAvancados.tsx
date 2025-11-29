import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Filter } from "lucide-react";

interface FiltrosAvancadosProps {
  onStatusChange: (status: string) => void;
  onFuncionarioChange: (funcionario: string) => void;
  onClienteChange: (cliente: string) => void;
  statusSelecionado?: string;
  funcionarioSelecionado?: string;
  clienteSelecionado?: string;
}

export function FiltrosAvancados({
  onStatusChange,
  onFuncionarioChange,
  onClienteChange,
  statusSelecionado = "todos",
  funcionarioSelecionado = "todos",
  clienteSelecionado = "todos",
}: FiltrosAvancadosProps) {
  // Buscar status configurados
  const { data: statusList } = useQuery({
    queryKey: ['status-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('status_pedidos_config')
        .select('nome')
        .eq('ativo', true)
        .order('ordem');
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 10, // 10 minutos
  });

  // Buscar funcionários
  const { data: funcionarios } = useQuery({
    queryKey: ['funcionarios-relatorio'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('perfis')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 10, // 10 minutos
  });

  // Buscar clientes
  const { data: clientes } = useQuery({
    queryKey: ['clientes-relatorio'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome')
        .limit(100); // Limitar para performance
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 10, // 10 minutos
  });

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Filtro por Status */}
      <div className="space-y-2">
        <Label htmlFor="status-filter" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Status
        </Label>
        <Select value={statusSelecionado} onValueChange={onStatusChange}>
          <SelectTrigger 
            id="status-filter" 
            className="transition-all duration-200 hover:border-primary/50"
          >
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent className="z-50">
            <SelectItem value="todos" className="font-medium">Todos os status</SelectItem>
            {statusList?.map((status) => (
              <SelectItem 
                key={status.nome} 
                value={status.nome}
                className="transition-colors duration-150"
              >
                {status.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filtro por Funcionário */}
      <div className="space-y-2">
        <Label htmlFor="funcionario-filter" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Funcionário
        </Label>
        <Select value={funcionarioSelecionado} onValueChange={onFuncionarioChange}>
          <SelectTrigger 
            id="funcionario-filter"
            className="transition-all duration-200 hover:border-primary/50"
          >
            <SelectValue placeholder="Todos os funcionários" />
          </SelectTrigger>
          <SelectContent className="z-50">
            <SelectItem value="todos" className="font-medium">Todos os funcionários</SelectItem>
            {funcionarios?.map((funcionario) => (
              <SelectItem 
                key={funcionario.id} 
                value={funcionario.id}
                className="transition-colors duration-150"
              >
                {funcionario.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filtro por Cliente */}
      <div className="space-y-2">
        <Label htmlFor="cliente-filter" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Cliente
        </Label>
        <Select value={clienteSelecionado} onValueChange={onClienteChange}>
          <SelectTrigger 
            id="cliente-filter"
            className="transition-all duration-200 hover:border-primary/50"
          >
            <SelectValue placeholder="Todos os clientes" />
          </SelectTrigger>
          <SelectContent className="z-50">
            <SelectItem value="todos" className="font-medium">Todos os clientes</SelectItem>
            {clientes?.map((cliente) => (
              <SelectItem 
                key={cliente.id} 
                value={cliente.id}
                className="transition-colors duration-150"
              >
                {cliente.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
