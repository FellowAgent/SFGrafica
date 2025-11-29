import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Settings, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FormControl } from "@/components/ui/form";
import { UnidadeMedida } from "@/hooks/useUnidadesMedida";

interface UnidadeMedidaComboboxProps {
  unidades: UnidadeMedida[];
  loading: boolean;
  value: string | undefined;
  onValueChange: (value: string) => void;
  onOpenSettings: () => void;
}

export function UnidadeMedidaCombobox({
  unidades,
  loading,
  value,
  onValueChange,
  onOpenSettings,
}: UnidadeMedidaComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Encontrar a unidade selecionada
  const selectedUnidade = unidades.find((u) => u.sigla === value);

  // Ordenar e filtrar unidades baseado na busca
  const filteredUnidades = useMemo(() => {
    const searchLower = search.toLowerCase();
    
    // Se não há busca, ordenar alfabeticamente
    if (!searchLower) {
      return [...unidades].sort((a, b) => 
        a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
      );
    }
    
    // Filtrar e ordenar por relevância
    return [...unidades]
      .filter((unidade) =>
        unidade.nome.toLowerCase().includes(searchLower) ||
        unidade.sigla.toLowerCase().includes(searchLower)
      )
      .sort((a, b) => {
        const aNameLower = a.nome.toLowerCase();
        const bNameLower = b.nome.toLowerCase();
        const aSiglaLower = a.sigla.toLowerCase();
        const bSiglaLower = b.sigla.toLowerCase();
        
        // Prioridade 1: Começa com o termo pesquisado (nome ou sigla)
        const aStartsWithName = aNameLower.startsWith(searchLower);
        const bStartsWithName = bNameLower.startsWith(searchLower);
        const aStartsWithSigla = aSiglaLower.startsWith(searchLower);
        const bStartsWithSigla = bSiglaLower.startsWith(searchLower);
        
        const aStarts = aStartsWithName || aStartsWithSigla;
        const bStarts = bStartsWithName || bStartsWithSigla;
        
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        
        // Prioridade 2: Se ambos começam ou ambos não começam, ordenar alfabeticamente
        return aNameLower.localeCompare(bNameLower, 'pt-BR', { sensitivity: 'base' });
      });
  }, [unidades, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <FormControl>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between font-normal",
              !value && "text-muted-foreground"
            )}
            disabled={loading}
          >
            {loading ? (
              "Carregando..."
            ) : selectedUnidade ? (
              `${selectedUnidade.nome} (${selectedUnidade.sigla})`
            ) : (
              "Selecione uma unidade..."
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </FormControl>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[--radix-popover-trigger-width] p-0" 
        align="start"
        sideOffset={4}
      >
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Buscar unidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                title="Limpar busca"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSearch("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              title="Gerenciar unidades"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
                onOpenSettings();
              }}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
          <CommandList>
            <CommandEmpty>
              <div className="py-6 text-center text-sm">
                <p className="text-muted-foreground">Nenhuma unidade encontrada.</p>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setOpen(false);
                    onOpenSettings();
                  }}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Adicionar nova unidade
                </Button>
              </div>
            </CommandEmpty>
            <CommandGroup>
              {filteredUnidades.map((unidade) => (
                <CommandItem
                  key={unidade.id}
                  value={unidade.sigla}
                  onSelect={() => {
                    onValueChange(unidade.sigla);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === unidade.sigla ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="flex-1">
                    {unidade.nome} ({unidade.sigla})
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

