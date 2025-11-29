import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Search, X, UserPen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useClientes } from "@/hooks/useClientes";
import { useProdutos } from "@/hooks/useProdutos";
import { formatCurrency, parseCurrencyToNumber } from "@/utils/inputMasks";
import { AutosuggestInput } from "@/components/ui/autosuggest-input";

// Funções de máscara
const maskCPF = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

const maskCNPJ = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

const maskCelular = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

interface NovoPedidoFormProps {
  onSave: (pedido: any) => void;
  onClose: () => void;
  pedidoInicial?: any; // Para edição
}

export const NovoPedidoForm = ({ onSave, onClose, pedidoInicial }: NovoPedidoFormProps) => {
  const { toast } = useToast();
  const { clientes } = useClientes();
  const { produtos: produtosDisponiveis } = useProdutos();
  
  // Filtrar apenas produtos ativos
  const produtosAtivos = produtosDisponiveis.filter(p => p.ativo !== false);
  
  const [celular, setCelular] = useState(pedidoInicial?.celular || "");
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(
    pedidoInicial ? { nome: pedidoInicial.cliente, celular: pedidoInicial.celular || "" } : null
  );
  const [criandoCliente, setCriandoCliente] = useState(false);
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [email, setEmail] = useState("");
  
  const [produtoSelecionado, setProdutoSelecionado] = useState<any>(
    pedidoInicial ? { nome: pedidoInicial.produto } : null
  );
  const [quantidade, setQuantidade] = useState(pedidoInicial?.quantidade || "");
  const [medida, setMedida] = useState(pedidoInicial?.medida || "");
  const [unidade, setUnidade] = useState(pedidoInicial?.unidade || "");
  const [material, setMaterial] = useState(pedidoInicial?.material || "");
  const [acabamento, setAcabamento] = useState(pedidoInicial?.acabamento || "");
  const [preco, setPreco] = useState(pedidoInicial?.valor?.toString() || "");
  const [desconto, setDesconto] = useState(pedidoInicial?.desconto || 0);
  const [aplicarDesconto, setAplicarDesconto] = useState(false);

  const [prazoRetirada, setPrazoRetirada] = useState(pedidoInicial?.prazoRetirada || "");
  const [observacoes, setObservacoes] = useState(pedidoInicial?.observacoes || "");
  const [codigoRetirada, setCodigoRetirada] = useState(pedidoInicial?.codigoRetirada || "");

  // Sugestões para os campos autocomplete baseado em produtos cadastrados
  const sugestoesMedidas = useMemo(() => {
    const medidas = new Set<string>();
    produtosDisponiveis.forEach(p => {
      if ((p as any).medidas) medidas.add((p as any).medidas);
    });
    return Array.from(medidas);
  }, [produtosDisponiveis]);

  const sugestoesUnidades = useMemo(() => {
    const unidades = new Set<string>();
    produtosDisponiveis.forEach(p => {
      if (p.unidade_medida) unidades.add(p.unidade_medida);
    });
    return Array.from(unidades);
  }, [produtosDisponiveis]);

  const sugestoesMateriais = useMemo(() => {
    const materiais = new Set<string>();
    produtosDisponiveis.forEach(p => {
      if ((p as any).material) materiais.add((p as any).material);
    });
    return Array.from(materiais);
  }, [produtosDisponiveis]);

  const sugestoesAcabamentos = useMemo(() => {
    const acabamentos = new Set<string>();
    produtosDisponiveis.forEach(p => {
      if ((p as any).arte_final_acabamentos) acabamentos.add((p as any).arte_final_acabamentos);
    });
    return Array.from(acabamentos);
  }, [produtosDisponiveis]);

  const sugestoesQuantidades = useMemo(() => {
    const quantidades = new Set<string>();
    produtosDisponiveis.forEach(p => {
      if ((p as any).quantidade) quantidades.add((p as any).quantidade);
    });
    return Array.from(quantidades);
  }, [produtosDisponiveis]);

  const sugestoesPrecos = useMemo(() => {
    const precos = new Set<string>();
    produtosDisponiveis.forEach(p => {
      if (p.preco) precos.add(formatCurrency(String(p.preco * 100)));
    });
    return Array.from(precos);
  }, [produtosDisponiveis]);

  // Componente auxiliar para label com contador
  const LabelWithCounter = ({ 
    label, 
    currentLength, 
    maxLength 
  }: { 
    label: string; 
    currentLength: number; 
    maxLength: number; 
  }) => (
    <div className="flex items-center gap-2">
      <span>{label}</span>
      <span className="text-xs text-muted-foreground">
        ({currentLength}/{maxLength})
      </span>
    </div>
  );

  const handleCelularBlur = () => {
    const clienteEncontrado = clientes.find(c => c.celular.includes(celular.replace(/\D/g, '')));
    if (clienteEncontrado) {
      setClienteSelecionado(clienteEncontrado);
      setCriandoCliente(false);
    } else if (celular.replace(/\D/g, '').length >= 10) {
      setCriandoCliente(true);
      setClienteSelecionado(null);
    }
  };

  const handleCelularKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && criandoCliente && nomeCompleto && celular && cpfCnpj && email) {
      const novoCliente = {
        id: Date.now().toString(),
        nome: nomeCompleto,
        celular,
        cpf_cnpj: cpfCnpj,
        email,
      };
      setClienteSelecionado(novoCliente);
      setCriandoCliente(false);
      toast({
        title: "Cliente criado",
        description: "Novo cliente cadastrado com sucesso!",
      });
    }
  };

  const handleProdutoSelect = (produtoId: string) => {
    const produto = produtosDisponiveis.find(p => p.id === produtoId);
    if (produto) {
      setProdutoSelecionado(produto);
      // Preencher automaticamente os campos com dados do produto
      const produtoExtendido = produto as any;
      if (produtoExtendido.medidas) setMedida(produtoExtendido.medidas);
      if (produto.unidade_medida) setUnidade(produto.unidade_medida);
      if (produtoExtendido.material) setMaterial(produtoExtendido.material);
      if (produtoExtendido.arte_final_acabamentos) setAcabamento(produtoExtendido.arte_final_acabamentos);
      if (produtoExtendido.quantidade) setQuantidade(produtoExtendido.quantidade);
      if (produto.preco) setPreco(formatCurrency(String(produto.preco * 100)));
    }
  };

  const handleSalvar = () => {
    if (!clienteSelecionado || !produtoSelecionado) {
      toast({
        title: "Erro",
        description: "Selecione um cliente e um produto.",
        variant: "destructive",
      });
      return;
    }

    const valorFinal = parseCurrencyToNumber(preco);
    const valorDesconto = aplicarDesconto ? (valorFinal * desconto) / 100 : 0;

    const pedido = {
      id: pedidoInicial?.id || Date.now().toString(),
      cliente: clienteSelecionado.nome,
      produto: produtoSelecionado.nome,
      valor: valorFinal - valorDesconto,
      vendedor: pedidoInicial?.vendedor || "Ana Silva",
      quantidade,
      medida,
      unidade,
      material,
      acabamento,
      desconto: valorDesconto,
      prazoRetirada,
      observacoes,
      codigoRetirada,
      celular,
    };

    onSave(pedido);
    toast({
      title: pedidoInicial ? "Pedido atualizado" : "Pedido criado",
      description: pedidoInicial 
        ? "Pedido atualizado com sucesso!" 
        : "Novo pedido adicionado com sucesso!",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-fellow-lg bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <CardTitle className="text-2xl">{pedidoInicial ? "Editar Pedido" : "Novo Pedido"}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10 rounded-full hover:bg-muted bg-muted/50">
            <X className="h-[18px] w-[18px]" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* GRUPO CLIENTE */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground border-b pb-2">Cliente</h3>
            
            <div className="space-y-2">
              <LabelWithCounter 
                label="Celular *"
                currentLength={celular.replace(/\D/g, '').length}
                maxLength={11}
              />
              <div className="relative">
                <Input
                  id="celular"
                  placeholder="(00) 00000-0000"
                  value={celular}
                  onChange={(e) => setCelular(maskCelular(e.target.value))}
                  onBlur={handleCelularBlur}
                  onKeyDown={handleCelularKeyDown}
                  className="pr-10"
                  maxLength={15}
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            {clienteSelecionado && !criandoCliente && (
              <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-sm font-medium text-muted-foreground">Cliente Selecionado:</p>
                  <Button 
                    variant="add" 
                    size="sm"
                    onClick={() => {
                      setCriandoCliente(true);
                      setNomeCompleto(clienteSelecionado.nome || "");
                      setEmail(clienteSelecionado.email || "");
                      setCpfCnpj(clienteSelecionado.cpf_cnpj || "");
                    }}
                    className="h-8"
                  >
                    <UserPen className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-foreground font-semibold text-lg">{clienteSelecionado.nome}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Celular: </span>
                      <span className="text-foreground">{clienteSelecionado.celular}</span>
                    </div>
                    {clienteSelecionado.email && (
                      <div>
                        <span className="text-muted-foreground">E-mail: </span>
                        <span className="text-foreground">{clienteSelecionado.email}</span>
                      </div>
                    )}
                    {clienteSelecionado.cpf_cnpj && (
                      <div>
                        <span className="text-muted-foreground">CPF/CNPJ: </span>
                        <span className="text-foreground">{clienteSelecionado.cpf_cnpj}</span>
                      </div>
                    )}
                    {clienteSelecionado.endereco && (
                      <div className="md:col-span-2">
                        <span className="text-muted-foreground">Endereço: </span>
                        <span className="text-foreground">
                          {clienteSelecionado.endereco}
                          {clienteSelecionado.numero && `, ${clienteSelecionado.numero}`}
                          {clienteSelecionado.complemento && ` - ${clienteSelecionado.complemento}`}
                          {clienteSelecionado.bairro && ` - ${clienteSelecionado.bairro}`}
                          {clienteSelecionado.cidade && ` - ${clienteSelecionado.cidade}`}
                          {clienteSelecionado.estado && `/${clienteSelecionado.estado}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {criandoCliente && (
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
                <p className="text-sm text-muted-foreground">Cliente não encontrado. Preencha os dados para criar:</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <LabelWithCounter 
                      label="Nome Completo *"
                      currentLength={nomeCompleto.length}
                      maxLength={150}
                    />
                    <Input
                      id="nomeCompleto"
                      value={nomeCompleto}
                      onChange={(e) => setNomeCompleto(e.target.value.slice(0, 150))}
                      onKeyDown={handleCelularKeyDown}
                      placeholder="Nome completo do cliente"
                      maxLength={150}
                    />
                  </div>
                  <div className="space-y-2">
                    <LabelWithCounter 
                      label="Celular *"
                      currentLength={celular.replace(/\D/g, '').length}
                      maxLength={11}
                    />
                    <Input
                      id="celularNovo"
                      value={celular}
                      onChange={(e) => setCelular(maskCelular(e.target.value))}
                      onKeyDown={handleCelularKeyDown}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <LabelWithCounter 
                      label="CPF/CNPJ *"
                      currentLength={cpfCnpj.replace(/\D/g, '').length}
                      maxLength={cpfCnpj.replace(/\D/g, '').length <= 11 ? 11 : 14}
                    />
                    <Input
                      id="cpfCnpj"
                      value={cpfCnpj}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        if (value.length <= 11) {
                          setCpfCnpj(maskCPF(e.target.value));
                        } else {
                          setCpfCnpj(maskCNPJ(e.target.value));
                        }
                      }}
                      onKeyDown={handleCelularKeyDown}
                      placeholder="000.000.000-00 ou 00.000.000/0000-00"
                      maxLength={18}
                    />
                  </div>
                  <div className="space-y-2">
                    <LabelWithCounter 
                      label="E-mail *"
                      currentLength={email.length}
                      maxLength={150}
                    />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value.slice(0, 150))}
                      onKeyDown={handleCelularKeyDown}
                      placeholder="email@exemplo.com"
                      maxLength={150}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">* Preencha todos os campos obrigatórios e pressione Enter para criar o cliente</p>
              </div>
            )}
          </div>

          {/* GRUPO PRODUTO */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground border-b pb-2">Produto</h3>
            
            <div className="space-y-2">
              <Label htmlFor="produto">Nome do Produto</Label>
              <Select onValueChange={handleProdutoSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent>
                  {produtosAtivos.map((produto) => (
                    <SelectItem key={produto.id} value={produto.id}>
                      {produto.nome} - {produto.codigo_barras || 'N/A'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {produtoSelecionado && (
              <div className="space-y-4">
                {/* Medidas e Unidade */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="medidas">Medidas</Label>
                    <div className="relative">
                      <Input
                        id="medidas"
                        value={medida}
                        onChange={(e) => setMedida(e.target.value)}
                        placeholder="Ex: 10x15cm"
                        list="medidas-list"
                      />
                      <datalist id="medidas-list">
                        {sugestoesMedidas.map((m, i) => (
                          <option key={i} value={m} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unidade">Unidade</Label>
                    <div className="relative">
                      <Input
                        id="unidade"
                        value={unidade}
                        onChange={(e) => setUnidade(e.target.value)}
                        placeholder="Ex: un, m, cm"
                        list="unidades-list"
                      />
                      <datalist id="unidades-list">
                        {sugestoesUnidades.map((u, i) => (
                          <option key={i} value={u} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                </div>

                {/* Material */}
                <div className="space-y-2">
                  <Label htmlFor="material">Material</Label>
                  <div className="relative">
                    <Input
                      id="material"
                      value={material}
                      onChange={(e) => setMaterial(e.target.value)}
                      placeholder="Digite o material"
                      list="materiais-list"
                    />
                    <datalist id="materiais-list">
                      {sugestoesMateriais.map((m, i) => (
                        <option key={i} value={m} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* Arte Final/Acabamentos */}
                <div className="space-y-2">
                  <Label htmlFor="acabamento">Arte Final/Acabamentos</Label>
                  <div className="relative">
                    <Input
                      id="acabamento"
                      value={acabamento}
                      onChange={(e) => setAcabamento(e.target.value)}
                      placeholder="Digite o acabamento"
                      list="acabamentos-list"
                    />
                    <datalist id="acabamentos-list">
                      {sugestoesAcabamentos.map((a, i) => (
                        <option key={i} value={a} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* Quantidade e Preço */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantidade">Quantidade</Label>
                    <div className="relative">
                      <Input
                        id="quantidade"
                        value={quantidade}
                        onChange={(e) => setQuantidade(e.target.value)}
                        placeholder="Digite a quantidade"
                        list="quantidades-list"
                      />
                      <datalist id="quantidades-list">
                        {sugestoesQuantidades.map((q, i) => (
                          <option key={i} value={q} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preco">Preço</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                      <Input
                        id="preco"
                        type="text"
                        inputMode="decimal"
                        className="pl-10"
                        placeholder="0,00"
                        value={preco}
                        onChange={(e) => {
                          const numericValue = parseCurrencyToNumber(e.target.value);
                          setPreco(formatCurrency(String(numericValue * 100)));
                        }}
                        list="precos-list"
                      />
                      <datalist id="precos-list">
                        {sugestoesPrecos.map((p, i) => (
                          <option key={i} value={p} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                </div>

                {/* Desconto */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="desconto-switch">Aplicar Desconto</Label>
                    <Switch
                      id="desconto-switch"
                      checked={aplicarDesconto}
                      onCheckedChange={setAplicarDesconto}
                    />
                  </div>
                  {aplicarDesconto && (
                    <div className="space-y-2">
                      <Label htmlFor="desconto">Desconto (%)</Label>
                      <Input
                        id="desconto"
                        type="number"
                        min="0"
                        max="100"
                        value={desconto}
                        onChange={(e) => setDesconto(Number(e.target.value))}
                        placeholder="0"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* GRUPO INFORMAÇÕES ADICIONAIS */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground border-b pb-2">Informações Adicionais</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prazoRetirada">Prazo de Retirada</Label>
                <Input
                  id="prazoRetirada"
                  value={prazoRetirada}
                  onChange={(e) => setPrazoRetirada(e.target.value)}
                  placeholder="Ex: 3 dias úteis"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="codigoRetirada">Código de Retirada</Label>
                <Input
                  id="codigoRetirada"
                  value={codigoRetirada}
                  onChange={(e) => setCodigoRetirada(e.target.value.slice(0, 4))}
                  placeholder="4 dígitos"
                  maxLength={4}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={4}
                placeholder="Observações sobre o pedido..."
              />
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSalvar} className="bg-primary">
              {pedidoInicial ? "Atualizar Pedido" : "Salvar Pedido"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
