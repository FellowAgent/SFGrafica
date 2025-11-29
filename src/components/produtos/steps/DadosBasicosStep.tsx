import { useState, useEffect } from "react";
import { formatCurrency, parseCurrencyToNumber } from "@/utils/inputMasks";
import { UseFormReturn } from "react-hook-form";
import { Settings } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AutosuggestInput } from "@/components/ui/autosuggest-input";
import { useNavigate } from "react-router-dom";
import { useCategorias } from "@/hooks/useCategorias";
import { useUnidadesMedida } from "@/hooks/useUnidadesMedida";
import { ModalGerenciarUnidades } from "@/components/produtos/ModalGerenciarUnidades";

interface DadosBasicosStepProps {
  form: UseFormReturn<any>;
}

export function DadosBasicosStep({ form }: DadosBasicosStepProps) {
  const navigate = useNavigate();
  const { categorias: categoriasDB } = useCategorias();
  const { unidades, loading: loadingUnidades, fetchUnidades } = useUnidadesMedida();
  const [buscaCategoria, setBuscaCategoria] = useState("");
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const [modalUnidadesOpen, setModalUnidadesOpen] = useState(false);

  const categorias = categoriasDB.map(cat => ({
    nome: cat.nome,
    codigo: cat.id
  }));

  const categoriasFiltradas = categorias.filter(
    (cat) =>
      cat.nome.toLowerCase().includes(buscaCategoria.toLowerCase())
  );

  const handleCategoriaSelect = (categoria: { nome: string; codigo: string }) => {
    form.setValue("categoria", categoria.nome);
    setBuscaCategoria(categoria.nome);
    setMostrarSugestoes(false);
  };

  // Calcular margem de lucro
  const preco = form.watch("preco") || 0;
  const custo = form.watch("custo") || 0;
  const desconto = form.watch("desconto") || 0;
  const tipoDesconto = form.watch("tipo_desconto") || "valor";
  
  const margemLucro = preco > 0 ? ((preco - custo) / preco * 100).toFixed(1) : "0.0";
  
  const descontoValor = tipoDesconto === "porcentagem" 
    ? (preco * desconto / 100) 
    : desconto;
  const precoFinal = preco - descontoValor;

  // Recarregar unidades quando o modal for fechado
  useEffect(() => {
    if (!modalUnidadesOpen) {
      console.log('🔄 Modal de unidades fechado, recarregando lista...');
      fetchUnidades();
    }
  }, [modalUnidadesOpen, fetchUnidades]);

  return (
    <>
      <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Dados Básicos</h3>
        <p className="text-sm text-muted-foreground mb-4">
          (*) Campos Obrigatórios
        </p>
      </div>

      <Form {...form}>
        <div className="space-y-6">
          {/* Nome do Produto */}
          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>* Nome do Produto:</FormLabel>
                <FormControl>
                  <Input placeholder="Digite o nome do produto" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Categoria */}
          <FormField
            control={form.control}
            name="categoria"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <FormLabel>* Categoria:</FormLabel>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    title="Gerenciar categorias"
                    onClick={() => navigate("/produtos/categorias")}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
                <FormControl>
                  <div className="relative">
                    <AutosuggestInput
                      placeholder="Buscar por nome ou código"
                      value={buscaCategoria}
                      onChange={(e) => {
                        setBuscaCategoria(e.target.value);
                        setMostrarSugestoes(true);
                      }}
                      onFocus={() => setMostrarSugestoes(true)}
                      isDropdownOpen={mostrarSugestoes}
                      showClearButton={buscaCategoria.length > 0}
                      onClear={() => {
                        setBuscaCategoria("");
                        form.setValue("categoria", "");
                        setMostrarSugestoes(false);
                      }}
                    />
                    {mostrarSugestoes && categoriasFiltradas.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                        {categoriasFiltradas.map((cat) => (
                          <div
                            key={cat.codigo}
                            className="px-3 py-2 cursor-pointer hover:bg-accent transition-colors flex items-center justify-between"
                            onClick={() => handleCategoriaSelect(cat)}
                          >
                            <span className="text-sm">{cat.nome}</span>
                            <span className="text-xs text-muted-foreground">
                              {cat.codigo}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Unidade de Medida */}
          <FormField
            control={form.control}
            name="unidade_medida"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <FormLabel>* Unidade de Medida:</FormLabel>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    title="Gerenciar unidades de medida"
                    onClick={() => setModalUnidadesOpen(true)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value || "un"}
                  disabled={loadingUnidades}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {unidades.map((unidade) => (
                      <SelectItem key={unidade.id} value={unidade.sigla}>
                        {unidade.nome} ({unidade.sigla})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Arte Final/Acabamentos */}
          <FormField
            control={form.control}
            name="arte_final_acabamentos"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Arte Final/Acabamentos:</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Verniz localizado" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Código de Barras/SKU */}
          <FormField
            control={form.control}
            name="codigo_barras"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código de Barras/SKU:</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: 7891234567890" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Grupo: Preços */}
          <div className="border border-border rounded-lg p-4 space-y-4">
            <h4 className="font-semibold text-sm">Precificação</h4>
            
            <div className="grid grid-cols-3 gap-4">
              {/* Preço de Venda */}
              <FormField
                control={form.control}
                name="preco"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>* Preço de Venda:</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                        <Input
                          className="pl-10"
                          placeholder="0,00"
                          type="text"
                          inputMode="decimal"
                          value={formatCurrency(String((field.value || 0) * 100))}
                          onChange={(e) => {
                            const numericValue = parseCurrencyToNumber(e.target.value);
                            field.onChange(numericValue);
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Custo do Produto */}
              <FormField
                control={form.control}
                name="custo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custo do Produto:</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                        <Input
                          className="pl-10"
                          placeholder="0,00"
                          type="text"
                          inputMode="decimal"
                          value={formatCurrency(String((field.value || 0) * 100))}
                          onChange={(e) => {
                            const numericValue = parseCurrencyToNumber(e.target.value);
                            field.onChange(numericValue);
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Margem de Lucro */}
              <FormItem>
                <FormLabel>Margem de Lucro:</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      className="pr-8"
                      value={margemLucro}
                      disabled
                      readOnly
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                </FormControl>
              </FormItem>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Desconto */}
              <FormField
                control={form.control}
                name="desconto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Desconto:</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            {tipoDesconto === "porcentagem" ? "%" : "R$"}
                          </span>
                          <Input
                            className="pl-10"
                            placeholder="0"
                            type="text"
                            inputMode="decimal"
                            value={tipoDesconto === "porcentagem" ? field.value : formatCurrency(String((field.value || 0) * 100))}
                            onChange={(e) => {
                              if (tipoDesconto === "porcentagem") {
                                field.onChange(parseFloat(e.target.value) || 0);
                              } else {
                                const numericValue = parseCurrencyToNumber(e.target.value);
                                field.onChange(numericValue);
                              }
                            }}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name="tipo_desconto"
                          render={({ field: tipoField }) => (
                            <Select onValueChange={tipoField.onChange} defaultValue={tipoField.value || "valor"}>
                              <FormControl>
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="valor">R$</SelectItem>
                                <SelectItem value="porcentagem">%</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Preço Final */}
              <FormItem>
                <FormLabel>Preço Final:</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                    <Input
                      className="pl-10 font-semibold"
                      value={formatCurrency(String((precoFinal || 0) * 100))}
                      disabled
                      readOnly
                    />
                  </div>
                </FormControl>
              </FormItem>
            </div>
          </div>

          {/* Grupo: Estoque */}
          <div className="border border-border rounded-lg p-4 space-y-4">
            <h4 className="font-semibold text-sm">Controle de Estoque</h4>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Estoque Atual */}
              <FormField
                control={form.control}
                name="estoque"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estoque Atual:</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="0" 
                        type="number" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Estoque Mínimo */}
              <FormField
                control={form.control}
                name="estoque_minimo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estoque Mínimo:</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="0" 
                        type="number" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
      </Form>
    </div>

    <ModalGerenciarUnidades
      open={modalUnidadesOpen}
      onOpenChange={setModalUnidadesOpen}
    />
  </>
  );
}
