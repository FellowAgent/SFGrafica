import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, X, UserPlus, ChevronDown, ChevronUp, Send, Tag, Package, CreditCard, Banknote, FileText, Wallet, Receipt, UserPen, UserCog } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { AutosuggestInput } from "@/components/ui/autosuggest-input";
import { useProdutosForm } from "@/hooks/useProdutosForm";
import { novoPedidoSchema } from "@/schemas/pedido.schema";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useClientes } from "@/hooks/useClientes";
import { useProdutos } from "@/hooks/useProdutos";
import { supabase } from "@/integrations/supabase";
import { useUserProfile } from "@/hooks/useUserProfile";
import { formatBRL, formatCurrency, parseCurrencyToNumber, formatCurrencyWithSymbol } from "@/utils/inputMasks";
import { useStatusConfig } from "@/hooks/useStatusConfig";
import { ModalEditarCliente } from "@/components/clientes/ModalEditarCliente";
import { useUnidadesMedida } from "@/hooks/useUnidadesMedida";

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

// Funções de validação
const validarCPF = (cpf: string): boolean => {
  const cpfLimpo = cpf.replace(/\D/g, '');
  
  if (cpfLimpo.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpfLimpo)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpfLimpo.charAt(i)) * (10 - i);
  }
  let resto = 11 - (soma % 11);
  const digito1 = resto >= 10 ? 0 : resto;

  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpfLimpo.charAt(i)) * (11 - i);
  }
  resto = 11 - (soma % 11);
  const digito2 = resto >= 10 ? 0 : resto;

  return (
    parseInt(cpfLimpo.charAt(9)) === digito1 &&
    parseInt(cpfLimpo.charAt(10)) === digito2
  );
};

const validarCNPJ = (cnpj: string): boolean => {
  const cnpjLimpo = cnpj.replace(/\D/g, '');
  
  if (cnpjLimpo.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpjLimpo)) return false;

  let tamanho = cnpjLimpo.length - 2;
  let numeros = cnpjLimpo.substring(0, tamanho);
  const digitos = cnpjLimpo.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;

  tamanho = tamanho + 1;
  numeros = cnpjLimpo.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  return resultado === parseInt(digitos.charAt(1));
};

const validarEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export default function NovoPedido() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { clientes, loading: loadingClientes } = useClientes();
  const { produtos: produtosDB, loading: loadingProdutos } = useProdutos();
  const { userProfile } = useUserProfile();
  const { status: statusConfig } = useStatusConfig();
  const { unidades, loading: loadingUnidades } = useUnidadesMedida();
  
  const [busca, setBusca] = useState("");
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);
  const [criandoCliente, setCriandoCliente] = useState(false);
  const [editandoCliente, setEditandoCliente] = useState(false);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const [sugestoesClientes, setSugestoesClientes] = useState<any[]>([]);
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [celular, setCelular] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const nomeCompletoRef = useRef<HTMLInputElement>(null);
  const [pedidoEditando, setPedidoEditando] = useState<any>(null);
  const [etiquetasDB, setEtiquetasDB] = useState<Array<{ id: string; nome: string; cor: string }>>([]);
  const [historicoPedidos, setHistoricoPedidos] = useState<any[]>([]);
  const [modalEditarClienteAberto, setModalEditarClienteAberto] = useState(false);
  const [clienteAtualizado, setClienteAtualizado] = useState(false);

  // Carregar dados do pedido via React Router state (mais seguro que localStorage)
  useEffect(() => {
    const pedidoData = location.state?.pedido;
    if (pedidoData) {
      setPedidoEditando(pedidoData);
      // Limpar o state após carregar para evitar recarregar ao navegar de volta
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);
  
  const {
    produtos,
    adicionarProduto,
    removerProduto,
    atualizarProduto,
    limparProduto,
    fecharTodosDropdowns,
  } = useProdutosForm();
  
  const [tipoRetirada, setTipoRetirada] = useState("balcao");
  const [prazoEntrega, setPrazoEntrega] = useState("");
  const [unidadePrazo, setUnidadePrazo] = useState("imediatamente");
  const [pedidoExpandido, setPedidoExpandido] = useState<string | null>(null);
  
  // Estados para comentários e etiquetas
  const [comentarios, setComentarios] = useState<Array<{
    id: string;
    usuario: string;
    dataHora: string;
    texto: string;
  }>>([]);
  
  // Estados para etiquetas (múltiplas seleções)
  const [etiquetasSelecionadas, setEtiquetasSelecionadas] = useState<Array<{ nome: string; cor: string }>>([]);
  const [buscaEtiqueta, setBuscaEtiqueta] = useState("");
  const [mostrarSugestoesEtiqueta, setMostrarSugestoesEtiqueta] = useState(false);
  const dropdownEtiquetaRef = useRef<HTMLDivElement>(null);
  
  // Estados para pagamento
  const [meioPagamento, setMeioPagamento] = useState<string | null>(null);
  const [gerarNotaFiscal, setGerarNotaFiscal] = useState(false);
  const [produtoExpandidoCheckout, setProdutoExpandidoCheckout] = useState<string | null>(null);
  

  // Carregar etiquetas do banco
  useEffect(() => {
    const fetchEtiquetas = async () => {
      const { data, error } = await supabase
        .from("etiquetas")
        .select("*")
        .order("nome");
      
      if (error) {
        console.error("Erro ao carregar etiquetas:", error);
        return;
      }
      
      setEtiquetasDB(data || []);
    };
    
    fetchEtiquetas();
  }, []);
  
  // Carregar histórico de pedidos do cliente
  useEffect(() => {
    const fetchHistorico = async () => {
      if (!clienteSelecionado?.id) {
        setHistoricoPedidos([]);
        return;
      }
      
      const { data: pedidosData, error } = await supabase
        .from("pedidos")
        .select(`
          *,
          itens_pedido (
            *,
            produtos (nome, codigo_barras)
          )
        `)
        .eq("cliente_id", clienteSelecionado.id)
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (error) {
        console.error("Erro ao carregar histórico:", error);
        return;
      }
      
      if (!pedidosData || pedidosData.length === 0) {
        setHistoricoPedidos([]);
        return;
      }
      
      // Buscar informações dos vendedores
      const vendedorIds = [...new Set(pedidosData.map(p => p.vendedor_id).filter(Boolean))];
      const { data: vendedoresData } = await supabase
        .from("perfis")
        .select("id, nome, username")
        .in("id", vendedorIds);
      
      const vendedoresMap = new Map(
        (vendedoresData || []).map(v => [v.id, v])
      );
      
      // Formatar os dados para o formato esperado
      const pedidosFormatados = pedidosData.map(pedido => {
        const vendedor = vendedoresMap.get(pedido.vendedor_id);
        return {
          ...pedido,
          numero: pedido.numero_pedido,
          dataHora: new Date(pedido.created_at).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          valorTotal: pedido.valor_final || pedido.total || 0,
          vendedor: vendedor?.nome || vendedor?.username || 'N/A',
          produtos: (pedido.itens_pedido || [])
            .map((item: any) => item.produtos?.nome || 'Produto')
            .filter((nome: string, index: number, self: string[]) => self.indexOf(nome) === index),
          prazoEntrega: pedido.unidade_prazo === 'imediatamente' 
            ? 'Imediatamente'
            : pedido.prazo_entrega && pedido.unidade_prazo
              ? `${pedido.prazo_entrega} ${pedido.unidade_prazo}`
              : 'Não informado'
        };
      });
      
      setHistoricoPedidos(pedidosFormatados);
    };
    
    fetchHistorico();
  }, [clienteSelecionado]);

  // Busca clientes conforme o usuário digita
  useEffect(() => {
    if (busca.trim().length > 0 && !clienteSelecionado) {
      const termo = busca.toLowerCase();
      const resultados = clientes.filter(cliente => 
        cliente.nome.toLowerCase().includes(termo) ||
        cliente.celular.includes(busca) ||
        cliente.cpf_cnpj.replace(/[.-/]/g, '').includes(busca.replace(/[.-/]/g, ''))
      );
      setSugestoesClientes(resultados);
      setMostrarSugestoes(true);
    } else {
      setSugestoesClientes([]);
      setMostrarSugestoes(false);
    }
  }, [busca, clienteSelecionado, clientes]);

  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Ignorar cliques na Sidebar (header/navegação)
      const sidebar = document.querySelector('header');
      if (sidebar?.contains(target)) {
        return;
      }
      
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        fecharTodosDropdowns();
      }
      if (dropdownEtiquetaRef.current && !dropdownEtiquetaRef.current.contains(target as Node)) {
        setMostrarSugestoesEtiqueta(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [fecharTodosDropdowns]);


  const handleSelecionarCliente = (cliente: any) => {
    setClienteSelecionado(cliente);
    setBusca(cliente.nome);
    setMostrarSugestoes(false);
    setCriandoCliente(false);
    setEditandoCliente(false);
  };

  const handleAbrirFormularioCadastro = () => {
    setCriandoCliente(true);
    setMostrarSugestoes(false);
    // Foca no campo Nome Completo após o estado ser atualizado
    setTimeout(() => {
      nomeCompletoRef.current?.focus();
    }, 100);
  };

  const handleCriarCliente = async () => {
    const erros: string[] = [];

    // Valida campos obrigatórios na ordem de exibição
    if (!nomeCompleto.trim()) {
      erros.push("• Nome Completo é obrigatório");
    }

    if (!celular.trim()) {
      erros.push("• Celular é obrigatório");
    } else if (celular.replace(/\D/g, '').length < 10) {
      erros.push("• Celular incompleto (mínimo 10 dígitos)");
    }

    if (!cpf.trim()) {
      erros.push("• CPF/CNPJ é obrigatório");
    } else {
      const cpfCnpjLimpo = cpf.replace(/\D/g, '');
      const tipoPessoa = cpfCnpjLimpo.length === 11 ? "Pessoa Física" : "Pessoa Jurídica";
      const isValid = tipoPessoa === "Pessoa Física" ? validarCPF(cpf) : validarCNPJ(cpf);
      
      if (!isValid) {
        erros.push(`• ${tipoPessoa === "Pessoa Física" ? "CPF" : "CNPJ"} inválido`);
      }
    }

    if (!email.trim()) {
      erros.push("• E-mail é obrigatório");
    } else if (!validarEmail(email)) {
      erros.push("• E-mail inválido (use o formato: exemplo@dominio.com)");
    }

    // Se houver erros, mostra todos de uma vez
    if (erros.length > 0) {
      toast({
        title: "Erros de validação",
        description: erros.join("\n"),
        variant: "destructive",
      });
      return;
    }

    // Detecta automaticamente o tipo baseado no CPF/CNPJ
    const cpfCnpjLimpo = cpf.replace(/\D/g, '');
    const tipoPessoa = cpfCnpjLimpo.length === 11 ? "Pessoa Física" : "Pessoa Jurídica";

    const { data, error } = await supabase
      .from("clientes")
      .insert({
        nome: nomeCompleto,
        celular,
        cpf_cnpj: cpf,
        email,
        tipo: tipoPessoa,
      })
      .select()
      .single();
    
    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar o cliente.",
        variant: "destructive",
      });
      return;
    }
    
    setClienteSelecionado(data);
    setBusca(data.nome);
    setCriandoCliente(false);
    setNomeCompleto("");
    setCelular("");
    setCpf("");
    setEmail("");
    toast({
      title: "Cliente criado",
      description: `Novo cliente cadastrado como ${tipoPessoa}!`,
    });
  };

  const handleEditarCliente = () => {
    setEditandoCliente(true);
    setNomeCompleto(clienteSelecionado.nome);
    setCelular(clienteSelecionado.celular);
    setCpf(clienteSelecionado.cpf_cnpj);
    setEmail(clienteSelecionado.email);
  };

  const handleSalvarEdicaoCliente = async () => {
    const erros: string[] = [];

    // Valida campos obrigatórios na ordem de exibição
    if (!nomeCompleto.trim()) {
      erros.push("• Nome Completo é obrigatório");
    }

    if (!celular.trim()) {
      erros.push("• Celular é obrigatório");
    } else if (celular.replace(/\D/g, '').length < 10) {
      erros.push("• Celular incompleto (mínimo 10 dígitos)");
    }

    if (!cpf.trim()) {
      erros.push("• CPF/CNPJ é obrigatório");
    } else {
      const cpfCnpjLimpo = cpf.replace(/\D/g, '');
      const tipoPessoa = cpfCnpjLimpo.length === 11 ? "Pessoa Física" : "Pessoa Jurídica";
      const isValid = tipoPessoa === "Pessoa Física" ? validarCPF(cpf) : validarCNPJ(cpf);
      
      if (!isValid) {
        erros.push(`• ${tipoPessoa === "Pessoa Física" ? "CPF" : "CNPJ"} inválido`);
      }
    }

    if (!email.trim()) {
      erros.push("• E-mail é obrigatório");
    } else if (!validarEmail(email)) {
      erros.push("• E-mail inválido (use o formato: exemplo@dominio.com)");
    }

    // Se houver erros, mostra todos de uma vez
    if (erros.length > 0) {
      toast({
        title: "Erros de validação",
        description: erros.join("\n"),
        variant: "destructive",
      });
      return;
    }

    // Detecta automaticamente o tipo baseado no CPF/CNPJ
    const cpfCnpjLimpo = cpf.replace(/\D/g, '');
    const tipoPessoa = cpfCnpjLimpo.length === 11 ? "Pessoa Física" : "Pessoa Jurídica";

    const { data, error } = await supabase
      .from("clientes")
      .update({
        nome: nomeCompleto,
        celular,
        cpf_cnpj: cpf,
        email,
        tipo: tipoPessoa,
      })
      .eq("id", clienteSelecionado.id)
      .select()
      .single();
    
    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o cliente.",
        variant: "destructive",
      });
      return;
    }
    
    setClienteSelecionado(data);
    setBusca(data.nome);
    setEditandoCliente(false);
    setNomeCompleto("");
    setCelular("");
    setCpf("");
    setEmail("");
    toast({
      title: "Cliente atualizado",
      description: `Dados do cliente foram salvos como ${tipoPessoa}!`,
    });
  };
  

  const handleVerCadastro = () => {
    // Abre uma nova janela ou modal com o cadastro completo do cliente
    window.open(`/clientes?clienteId=${clienteSelecionado.id}`, '_blank');
  };

  const handleLimparCliente = () => {
    setClienteSelecionado(null);
    setBusca("");
    setCriandoCliente(false);
    setEditandoCliente(false);
    setNomeCompleto("");
    setCelular("");
    setCpf("");
    setEmail("");
  };


  const handleProdutoSelect = (produtoItem: any, produto: any) => {
    atualizarProduto(produtoItem.id, "produtoSelecionado", produto);
    atualizarProduto(produtoItem.id, "buscaProduto", produto.nome);
    atualizarProduto(produtoItem.id, "preco", produto.preco.toString());
    // Auto-preencher unidade de medida se o produto tiver uma cadastrada
    if (produto.unidade_medida) {
      atualizarProduto(produtoItem.id, "medida", produto.unidade_medida);
    }
    atualizarProduto(produtoItem.id, "mostrarSugestoesProduto", false);
  };

  const handleBuscaProdutoChange = (id: string, valor: string) => {
    const produtoAtual = produtos.find(p => p.id === id);
    
    // Limpa o produto selecionado se ele existir
    if (produtoAtual?.produtoSelecionado) {
      atualizarProduto(id, "produtoSelecionado", null);
      atualizarProduto(id, "preco", "");
    }
    
    atualizarProduto(id, "buscaProduto", valor);
    const mostrar = valor.trim().length > 0;
    atualizarProduto(id, "mostrarSugestoesProduto", mostrar);
  };

  const handleLimparProduto = (id: string) => {
    limparProduto(id);
  };

  const getSugestoesProdutos = (busca: string) => {
    const termo = busca.toLowerCase();
    return produtosDB.filter(produto => 
      produto.nome.toLowerCase().includes(termo) ||
      (produto.codigo_barras && produto.codigo_barras.toLowerCase().includes(termo))
    );
  };

  const handleSalvar = async () => {
    // Validação básica
    if (!clienteSelecionado) {
      toast({
        title: "Erro",
        description: "Selecione um cliente antes de salvar.",
        variant: "destructive",
      });
      return;
    }

    // Filtrar apenas produtos com item selecionado
    const produtosValidos = produtos.filter(p => p.produtoSelecionado);

    if (produtosValidos.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos um produto.",
        variant: "destructive",
      });
      return;
    }

    // Obter o primeiro status ativo configurado (ordenado por ordem)
    const statusOrdenado = [...statusConfig].sort((a, b) => a.ordem - b.ordem);
    const primeiroStatusAtivo = statusOrdenado.find(s => s.ativo);
    
    if (!primeiroStatusAtivo) {
      toast({
        title: "Erro",
        description: "Nenhum status configurado. Configure os status em Configurações > Pedidos.",
        variant: "destructive",
      });
      return;
    }
    
    const statusInicial = primeiroStatusAtivo.nome;
    
    // Criar pedido
    const { data: pedido, error: pedidoError } = await supabase
      .from("pedidos")
      .insert({
        cliente_id: clienteSelecionado.id,
        vendedor_id: userProfile?.id,
        tipo_retirada: tipoRetirada as any,
        prazo_entrega: prazoEntrega,
        unidade_prazo: (unidadePrazo === "imediatamente" ? null : unidadePrazo) as any,
        meio_pagamento: meioPagamento,
        gerar_nf: gerarNotaFiscal,
        status: statusInicial,
        numero_pedido: "",
      } as any)
      .select()
      .single();

    if (pedidoError) {
      console.error('Erro ao criar pedido:', pedidoError);
      toast({
        title: "Erro",
        description: `Não foi possível criar o pedido: ${pedidoError.message}`,
        variant: "destructive",
      });
      return;
    }

    // Criar itens do pedido (usando apenas produtos válidos)
    const itens = produtosValidos.map(p => {
      const quantidade = parseInt(p.quantidade) || 1;
      const precoUnitario = parseCurrencyToNumber(p.preco);
      const desconto = parseCurrencyToNumber(p.desconto);
      
      // Limitar valores para evitar overflow (max: 99.999.999,99)
      const MAX_VALOR = 99999999.99;
      const precoLimitado = Math.min(precoUnitario, MAX_VALOR);
      const subtotal = Math.min((precoLimitado * quantidade) - desconto, MAX_VALOR);
      
      return {
        pedido_id: pedido.id,
        produto_id: p.produtoSelecionado?.id,
        quantidade: quantidade,
        preco_unitario: precoLimitado,
        desconto: desconto,
        subtotal: subtotal,
        unidade_medida: p.medida,
        observacoes: `Material: ${p.material}, Acabamento: ${p.acabamento}`,
      };
    });

    console.log('Itens a inserir:', itens);

    const { data: itensData, error: itensError } = await supabase
      .from("itens_pedido")
      .insert(itens)
      .select();

    if (itensError) {
      console.error('Erro ao inserir itens:', itensError);
      toast({
        title: "Erro",
        description: `Não foi possível adicionar os itens do pedido: ${itensError.message}`,
        variant: "destructive",
      });
      return;
    }

    console.log('Itens inseridos com sucesso:', itensData);

    // Adicionar etiquetas
    if (etiquetasSelecionadas.length > 0) {
      const etiquetasPedido = etiquetasSelecionadas
        .map(etiqueta => {
          const etiquetaDB = etiquetasDB.find((e: any) => e.nome === etiqueta.nome);
          return etiquetaDB ? {
            pedido_id: pedido.id,
            etiqueta_id: etiquetaDB.id,
          } : null;
        })
        .filter((e): e is { pedido_id: string; etiqueta_id: string } => e !== null);

      if (etiquetasPedido.length > 0) {
        await supabase
          .from("pedidos_etiquetas")
          .insert(etiquetasPedido);
      }
    }

    toast({
      title: "Pedido criado",
      description: "Novo pedido adicionado com sucesso!",
    });
    navigate("/inicio");
  };

  const togglePedidoExpandido = (pedidoId: string) => {
    setPedidoExpandido(pedidoExpandido === pedidoId ? null : pedidoId);
  };
  
  const handleAdicionarComentario = (novoComentario: {
    id: string;
    usuario: string;
    dataHora: string;
    texto: string;
  }) => {
    setComentarios([novoComentario, ...comentarios]);
  };
  
  const getSugestoesEtiquetas = (busca: string) => {
    if (!busca.trim()) return etiquetasDB;
    const termo = busca.toLowerCase();
    return etiquetasDB.filter(etiqueta => 
      etiqueta.nome.toLowerCase().includes(termo)
    );
  };
  
  const handleSelecionarEtiqueta = (etiqueta: any) => {
    // Verifica se a etiqueta já foi adicionada
    if (!etiquetasSelecionadas.find(e => e.nome === etiqueta.nome)) {
      setEtiquetasSelecionadas([...etiquetasSelecionadas, etiqueta]);
      toast({
        title: "Etiqueta adicionada",
        description: `Etiqueta "${etiqueta.nome}" adicionada ao pedido.`,
      });
    }
    setBuscaEtiqueta("");
    setMostrarSugestoesEtiqueta(false);
  };
  
  const handleRemoverEtiqueta = (nomeEtiqueta: string) => {
    setEtiquetasSelecionadas(etiquetasSelecionadas.filter(e => e.nome !== nomeEtiqueta));
    toast({
      title: "Etiqueta removida",
      description: `Etiqueta "${nomeEtiqueta}" removida do pedido.`,
    });
  };

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

  return (
    <div className="flex flex-col w-full min-h-screen">
      <Sidebar type="loja" />
      
      <main className="flex-1 bg-background overflow-y-auto pb-24">
        <div className="p-4 md:p-8 w-full">
          <div className="max-w-[1800px] mx-auto space-y-6">
            {/* Header */}
              <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  localStorage.removeItem('pedidoEditando');
                  navigate("/inicio");
                }}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-3xl font-bold">Novo Pedido</h1>
            </div>
            
            {/* Área de Etiquetas */}
            <div className="flex items-center gap-3">
              <Tag className="h-5 w-5 text-muted-foreground" />
              
              {/* Etiquetas Selecionadas */}
              <div className="flex items-center gap-2">
                {etiquetasSelecionadas.map((etiqueta) => (
                  <Badge
                    key={etiqueta.nome}
                    style={{ 
                      backgroundColor: etiqueta.cor,
                      color: ['#fbbf24'].includes(etiqueta.cor) ? '#000' : '#fff'
                    }}
                    className="px-3 py-1.5 text-sm font-medium flex items-center gap-2 border-0 hover:opacity-90"
                  >
                    {etiqueta.nome.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                    <X
                      className="h-3 w-3 cursor-pointer hover:opacity-70"
                      onClick={() => handleRemoverEtiqueta(etiqueta.nome)}
                    />
                  </Badge>
                ))}
              </div>
              
              {/* Input de Busca de Etiquetas */}
              <div className="relative" ref={dropdownEtiquetaRef}>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Adicionar etiqueta..."
                    value={buscaEtiqueta}
                    onChange={(e) => {
                      setBuscaEtiqueta(e.target.value);
                      setMostrarSugestoesEtiqueta(true);
                    }}
                    onFocus={() => setMostrarSugestoesEtiqueta(true)}
                    className="w-64 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setBuscaEtiqueta("");
                      setMostrarSugestoesEtiqueta(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                {/* Dropdown de Etiquetas */}
                {mostrarSugestoesEtiqueta && (
                  <div className="absolute z-[90] w-full mt-1 border rounded-md shadow-lg max-h-80 overflow-auto bg-popover">
                    {getSugestoesEtiquetas(buscaEtiqueta).map((etiqueta) => (
                      <button
                        key={etiqueta.nome}
                        type="button"
                        onClick={() => handleSelecionarEtiqueta(etiqueta)}
                        disabled={etiquetasSelecionadas.some(e => e.nome === etiqueta.nome)}
                        style={{
                          backgroundColor: etiqueta.cor,
                          color: ['#fbbf24'].includes(etiqueta.cor) ? '#000' : '#fff'
                        }}
                        className="w-full text-left px-4 py-3 font-semibold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                      >
                        {etiqueta.nome.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
              </div>

              {/* Informações do Pedido em Edição */}
          {pedidoEditando && (
            <Card className="bg-accent/10 border-2 border-primary/30">
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span>Pedido:</span>
                    <Badge className="bg-foreground text-background hover:bg-foreground/90 font-bold rounded-full px-4 py-1.5 text-base">
                      {pedidoEditando.numero.padStart(4, '0')}
                    </Badge>
                  </div>
                  <Badge 
                    className={cn(
                      "text-sm font-semibold px-3 py-1",
                      pedidoEditando.status === "Finalizado" && "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30",
                      pedidoEditando.status === "Entrega" && "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30",
                      pedidoEditando.status === "Produção" && "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30",
                      pedidoEditando.status === "Andamento" && "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30",
                      pedidoEditando.status === "Pedido" && "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30"
                    )}
                  >
                    {pedidoEditando.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground font-semibold">Cliente</Label>
                  <p className="font-semibold text-base mt-1">{pedidoEditando.cliente}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground font-semibold">Produto</Label>
                  <p className="font-semibold text-base mt-1">{pedidoEditando.produto}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground font-semibold">Valor</Label>
                  <p className="font-semibold text-base text-primary mt-1">{formatBRL(pedidoEditando.valor)}</p>
                </div>
              </CardContent>
            </Card>
            )}

              {/* Layout duas colunas */}
              <div className="grid md:grid-cols-[2fr,1fr] gap-6 items-start">
                {/* Coluna Esquerda */}
                <div className="space-y-6">
                  {/* GRUPO CLIENTE */}
                  <Card>
              <CardHeader>
                <CardTitle className="text-xl">Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 items-start">
                  <div className="flex-1 relative">
                    <AutosuggestInput
                      ref={inputRef}
                      placeholder="Celular, Nome, ou CPF/CNPJ"
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      onFocus={() => busca && sugestoesClientes.length > 0 && setMostrarSugestoes(true)}
                      onClear={handleLimparCliente}
                      showClearButton={!!clienteSelecionado}
                      isDropdownOpen={!!clienteSelecionado}
                      disabled={clienteSelecionado !== null}
                    />
                    
                    {/* Sugestões de clientes */}
                    {mostrarSugestoes && sugestoesClientes.length > 0 && (
                      <div className="absolute z-[90] w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                        {sugestoesClientes.map((cliente) => (
                          <button
                            key={cliente.id}
                            type="button"
                            onClick={() => handleSelecionarCliente(cliente)}
                            className="w-full text-left px-4 py-3 hover:bg-accent/50 border-b last:border-b-0 transition-colors"
                          >
                            <p className="font-medium text-foreground">{cliente.nome}</p>
                            <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                              <span>{cliente.celular}</span>
                              <span>{cliente.cpf}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Botão cadastrar novo cliente - aparece quando não há resultados */}
                  {busca && sugestoesClientes.length === 0 && !clienteSelecionado && !criandoCliente && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAbrirFormularioCadastro}
                      className="gap-2 whitespace-nowrap"
                    >
                      <UserPlus className="h-4 w-4" />
                      Cadastrar novo cliente
                    </Button>
                  )}
                </div>

                {/* Cliente selecionado */}
                {clienteSelecionado && !criandoCliente && !editandoCliente && (
                  <div 
                    key={clienteSelecionado.id}
                    className={cn(
                      "p-4 bg-accent/10 rounded-lg border border-accent/20 transition-all duration-300",
                      clienteAtualizado && "animate-fade-in"
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <p className="text-sm font-medium text-muted-foreground">Cliente Selecionado:</p>
                      <Button 
                        type="button"
                        variant="add" 
                        size="sm"
                        onClick={handleEditarCliente}
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
                      <div className="text-sm space-y-1">
                        {clienteSelecionado.cpf_cnpj && (
                          <div>
                            <span className="text-muted-foreground">CPF/CNPJ: </span>
                            <span className="text-foreground">{clienteSelecionado.cpf_cnpj}</span>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-4">
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
                        </div>
                        {clienteSelecionado.endereco && (
                          <div>
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

                {/* Formulário de cadastro de novo cliente */}
                {criandoCliente && (
                  <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Cliente não encontrado. Preencha os dados para criar:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <LabelWithCounter 
                          label="Nome Completo *"
                          currentLength={nomeCompleto.length}
                          maxLength={150}
                        />
                        <Input
                          ref={nomeCompletoRef}
                          id="nomeCompleto"
                          value={nomeCompleto}
                          onChange={(e) => setNomeCompleto(e.target.value.slice(0, 150))}
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
                          placeholder="(00) 00000-0000"
                          maxLength={15}
                        />
                      </div>
                      <div className="space-y-2">
                        <LabelWithCounter 
                          label="CPF/CNPJ *"
                          currentLength={cpf.replace(/\D/g, '').length}
                          maxLength={cpf.replace(/\D/g, '').length <= 11 ? 11 : 14}
                        />
                        <Input
                          id="cpfNovo"
                          value={cpf}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            if (value.length <= 11) {
                              setCpf(maskCPF(e.target.value));
                            } else {
                              setCpf(maskCNPJ(e.target.value));
                            }
                          }}
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
                          id="emailNovo"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value.slice(0, 150))}
                          placeholder="email@exemplo.com"
                          maxLength={150}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCriandoCliente(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        onClick={handleCriarCliente}
                      >
                        Criar Cliente
                      </Button>
                    </div>
                  </div>
                )}

                {/* Formulário de edição de cliente existente */}
                {editandoCliente && clienteSelecionado && (
                  <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Edição de dados:</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setModalEditarClienteAberto(true)}
                        className="gap-2"
                      >
                        <UserCog className="h-4 w-4" />
                        Abrir cadastro
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <LabelWithCounter 
                          label="Nome Completo *"
                          currentLength={nomeCompleto.length}
                          maxLength={150}
                        />
                        <Input
                          id="nomeCompletoEdit"
                          value={nomeCompleto}
                          onChange={(e) => setNomeCompleto(e.target.value.slice(0, 150))}
                          maxLength={150}
                        />
                      </div>
                      <div className="space-y-2">
                        <LabelWithCounter 
                          label="CPF/CNPJ *"
                          currentLength={cpf.replace(/\D/g, '').length}
                          maxLength={cpf.replace(/\D/g, '').length <= 11 ? 11 : 14}
                        />
                        <Input
                          id="cpfEdit"
                          value={cpf}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            if (value.length <= 11) {
                              setCpf(maskCPF(e.target.value));
                            } else {
                              setCpf(maskCNPJ(e.target.value));
                            }
                          }}
                          placeholder="000.000.000-00 ou 00.000.000/0000-00"
                          maxLength={18}
                        />
                      </div>
                      <div className="space-y-2">
                        <LabelWithCounter 
                          label="Celular *"
                          currentLength={celular.replace(/\D/g, '').length}
                          maxLength={11}
                        />
                        <Input
                          id="celularEdit"
                          value={celular}
                          onChange={(e) => setCelular(maskCelular(e.target.value))}
                          placeholder="(00) 00000-0000"
                          maxLength={15}
                        />
                      </div>
                      <div className="space-y-2">
                        <LabelWithCounter 
                          label="E-mail *"
                          currentLength={email.length}
                          maxLength={150}
                        />
                        <Input
                          id="emailEdit"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value.slice(0, 150))}
                          placeholder="email@exemplo.com"
                          maxLength={150}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditandoCliente(false);
                          setNomeCompleto("");
                          setCelular("");
                          setCpf("");
                          setEmail("");
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        onClick={handleSalvarEdicaoCliente}
                      >
                        Salvar
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>


            {/* GRUPO PRODUTOS */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Produtos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 overflow-visible">
                {produtos.map((produto, index) => (
                  <div key={produto.id}>
                    {index > 0 && <Separator className="my-6" />}
                     <div className="space-y-4">
                      <Label>Item {index + 1}:</Label>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1" ref={dropdownRef}>
                            <AutosuggestInput
                              placeholder="Ex: cartão, banner, folder, adesivo..."
                              value={produto.buscaProduto || ""}
                              onChange={(e) => handleBuscaProdutoChange(produto.id, e.target.value)}
                              onFocus={() => {
                                if (produto.buscaProduto && produto.buscaProduto.trim()) {
                                  atualizarProduto(produto.id, "mostrarSugestoesProduto", true);
                                }
                              }}
                              onClear={() => handleLimparProduto(produto.id)}
                              showClearButton={!produto.produtoSelecionado}
                              disabled={!!produto.produtoSelecionado}
                            />
                        
                            {/* Dropdown de sugestões */}
                            {produto.mostrarSugestoesProduto && 
                             produto.buscaProduto && 
                             produto.buscaProduto.trim().length > 0 && 
                             !produto.produtoSelecionado && (
                              <div className="absolute top-full mt-1 left-0 right-0 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto z-[90]">
                                {getSugestoesProdutos(produto.buscaProduto).length > 0 ? (
                                  <>
                                    <div className="px-4 py-2 bg-muted/50 text-xs text-muted-foreground border-b sticky top-0">
                                      {getSugestoesProdutos(produto.buscaProduto).length} produto(s) encontrado(s)
                                    </div>
                                    {getSugestoesProdutos(produto.buscaProduto).map((p) => (
                                       <button
                                         key={p.id}
                                         type="button"
                                         onClick={() => {
                                           handleProdutoSelect(produto, p);
                                         }}
                                         className="w-full text-left px-4 py-3 hover:bg-accent border-b border-border last:border-b-0 transition-colors"
                                       >
                                         <p className="font-medium text-foreground">{p.nome}</p>
                                         <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                                           <span>Código: {p.codigo_barras || "N/A"}</span>
                                           <span>{formatBRL(p.preco)}</span>
                                         </div>
                                       </button>
                                    ))}
                                  </>
                                ) : (
                                  <div className="px-4 py-3 text-sm text-muted-foreground">
                                    Nenhum produto encontrado para "{produto.buscaProduto}"
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removerProduto(produto.id)}
                            className="h-10 w-10 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 flex-shrink-0"
                          >
                            <X className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>

                      {produto.produtoSelecionado && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>
                              * Quantidade:
                              <span className="text-xs text-muted-foreground ml-1">
                                ({produto.quantidade.length}/10)
                              </span>
                            </Label>
                            <Input
                              type="number"
                              min="1"
                              max="99999"
                              value={produto.quantidade}
                              onChange={(e) => {
                                const valor = e.target.value.slice(0, 10);
                                atualizarProduto(produto.id, "quantidade", valor);
                              }}
                              placeholder="Digite a quantidade"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>
                              * Unidade de Medida:
                            </Label>
                            <Select
                              value={produto.medida}
                              onValueChange={(valor) => atualizarProduto(produto.id, "medida", valor)}
                              disabled={loadingUnidades}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a unidade" />
                              </SelectTrigger>
                              <SelectContent>
                                {unidades.map((unidade) => (
                                  <SelectItem key={unidade.id} value={unidade.sigla}>
                                    {unidade.sigla} - {unidade.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>
                              Material:
                              <span className="text-xs text-muted-foreground ml-1">
                                ({produto.material.length}/100)
                              </span>
                            </Label>
                            <Input
                              value={produto.material}
                              onChange={(e) => {
                                const valor = e.target.value.slice(0, 100);
                                atualizarProduto(produto.id, "material", valor);
                              }}
                              placeholder="Digite o material"
                              maxLength={100}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>
                              Arte Final/Acabamentos:
                              <span className="text-xs text-muted-foreground ml-1">
                                ({produto.acabamento.length}/100)
                              </span>
                            </Label>
                            <Input
                              value={produto.acabamento}
                              onChange={(e) => {
                                const valor = e.target.value.slice(0, 100);
                                atualizarProduto(produto.id, "acabamento", valor);
                              }}
                              placeholder="Digite o acabamento"
                              maxLength={100}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>* Preço:</Label>
                            <Input
                              placeholder="R$ 0,00"
                              type="text"
                              inputMode="decimal"
                              value={formatCurrencyWithSymbol(produto.preco || "")}
                              onChange={(e) => {
                                const formatted = formatCurrencyWithSymbol(e.target.value);
                                atualizarProduto(produto.id, "preco", formatted);
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Desconto:</Label>
                            <Input
                              placeholder="R$ 0,00"
                              type="text"
                              inputMode="decimal"
                              value={formatCurrencyWithSymbol(produto.desconto || "")}
                              onChange={(e) => {
                                const formatted = formatCurrencyWithSymbol(e.target.value);
                                atualizarProduto(produto.id, "desconto", formatted);
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                <div className="pt-4 flex justify-end">
                  <Button onClick={adicionarProduto} variant="secondary" size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Adicionar Produto
                  </Button>
                </div>
              </CardContent>
            </Card>


            {/* GRUPO INFORMAÇÕES ADICIONAIS */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Informações Adicionais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tipo de Retirada *</Label>
                    <RadioGroup value={tipoRetirada} onValueChange={setTipoRetirada} className="flex flex-col gap-3">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="balcao" id="balcao" />
                        <Label htmlFor="balcao" className="font-normal cursor-pointer">Retirada (loja)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="entrega" id="entrega" />
                        <Label htmlFor="entrega" className="font-normal cursor-pointer">Entrega (moto)</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prazoEntrega">Prazo de Entrega *</Label>
                    <div className="flex flex-col gap-2">
                      {unidadePrazo !== "imediatamente" && (
                        <Input
                          id="prazoEntrega"
                          type="number"
                          value={prazoEntrega}
                          onChange={(e) => setPrazoEntrega(e.target.value)}
                          placeholder="Ex: 3"
                        />
                      )}
                      <Select value={unidadePrazo} onValueChange={setUnidadePrazo}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="imediatamente">Imediatamente</SelectItem>
                          <SelectItem value="minutos">Minutos</SelectItem>
                          <SelectItem value="horas">Horas</SelectItem>
                          <SelectItem value="dias">Dias</SelectItem>
                          <SelectItem value="semanas">Semanas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* GRUPO PAGAMENTO */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Pagamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Preço Total do Pedido - calculado com base nos produtos adicionados */}
                <div className="space-y-2">
                  <Label className="text-base">Preço Total do Pedido</Label>
                  <p className="text-3xl font-bold text-primary">
                    R$ {produtos
                      .filter(p => p.produtoSelecionado && p.preco)
                      .reduce((total, p) => total + parseCurrencyToNumber(p.preco), 0)
                      .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>

                <Separator />
                
                {/* Lista de Produtos */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 text-base">
                    <Package className="h-4 w-4" />
                    Produtos
                  </Label>
                  
                  <div className="space-y-2">
                    {produtos.filter(p => p.produtoSelecionado).map((produto, index) => (
                      <div 
                        key={produto.id}
                        className="flex items-center gap-2"
                      >
                        <div className="border border-border rounded-lg overflow-hidden bg-card flex-1">
                          <button
                            type="button"
                            onClick={() => setProdutoExpandidoCheckout(produtoExpandidoCheckout === produto.id ? null : produto.id)}
                            className="px-3 py-2 hover:bg-muted/50 w-full text-left"
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-muted-foreground">
                                  {index + 1}.
                                </span>
                                <div className="flex flex-col">
                                  <span className="font-medium text-sm">
                                    {produto.produtoSelecionado?.nome}
                                  </span>
                                  {produto.medida && (
                                    <span className="text-xs text-muted-foreground">
                                      {produto.medida}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-primary">
                                  R$ {parseCurrencyToNumber(produto.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <ChevronDown 
                                  className={cn(
                                    "h-4 w-4 transition-transform",
                                    produtoExpandidoCheckout === produto.id && "rotate-180"
                                  )}
                                />
                              </div>
                            </div>
                          </button>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            removerProduto(produto.id);
                          }}
                          className="h-10 w-10 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 flex-shrink-0"
                        >
                          <X className="h-5 w-5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />
                
                <div className="space-y-3">
                  <Label>Meio de Pagamento</Label>
                  <div className="space-y-2">
                    {/* PIX */}
                    <button
                      type="button"
                      onClick={() => setMeioPagamento("pix")}
                      className={cn(
                        "w-full px-3 py-2 rounded-lg border-2 transition-all text-left flex items-center gap-3",
                        meioPagamento === "pix"
                          ? "border-primary bg-primary/5"
                          : "border-border bg-background hover:border-primary/50"
                      )}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 flex-shrink-0">
                        <path fill="#4db6ac" d="M11.9,12h-0.68l8.04-8.04c2.62-2.61,6.86-2.61,9.48,0L36.78,12H36.1c-1.6,0-3.11,0.62-4.24,1.76l-6.8,6.77c-0.59,0.59-1.53,0.59-2.12,0l-6.8-6.77C15.01,12.62,13.5,12,11.9,12z"/>
                        <path fill="#4db6ac" d="M36.1,36h0.68l-8.04,8.04c-2.62,2.61-6.86,2.61-9.48,0L11.22,36h0.68c1.6,0,3.11-0.62,4.24-1.76l6.8-6.77c0.59-0.59,1.53-0.59,2.12,0l6.8,6.77C32.99,35.38,34.5,36,36.1,36z"/>
                        <path fill="#4db6ac" d="M44.04,28.74L38.78,34H36.1c-1.07,0-2.07-0.42-2.83-1.17l-6.8-6.78c-1.36-1.36-3.58-1.36-4.94,0l-6.8,6.78C13.97,33.58,12.97,34,11.9,34H9.22l-5.26-5.26c-2.61-2.62-2.61-6.86,0-9.48L9.22,14h2.68c1.07,0,2.07,0.42,2.83,1.17l6.8,6.78c0.68,0.68,1.58,1.02,2.47,1.02s1.79-0.34,2.47-1.02l6.8-6.78C34.03,14.42,35.03,14,36.1,14h2.68l5.26,5.26C46.65,21.88,46.65,26.12,44.04,28.74z"/>
                      </svg>
                      <span className="font-medium text-sm">PIX</span>
                    </button>

                    {/* Crédito */}
                    <button
                      type="button"
                      onClick={() => setMeioPagamento("credito")}
                      className={cn(
                        "w-full px-3 py-2 rounded-lg border-2 transition-all text-left flex items-center gap-3",
                        meioPagamento === "credito"
                          ? "border-primary bg-primary/5"
                          : "border-border bg-background hover:border-primary/50"
                      )}
                    >
                      <CreditCard className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <span className="font-medium text-sm">Crédito</span>
                    </button>

                    {/* Débito */}
                    <button
                      type="button"
                      onClick={() => setMeioPagamento("debito")}
                      className={cn(
                        "w-full px-3 py-2 rounded-lg border-2 transition-all text-left flex items-center gap-3",
                        meioPagamento === "debito"
                          ? "border-primary bg-primary/5"
                          : "border-border bg-background hover:border-primary/50"
                      )}
                    >
                      <CreditCard className="w-5 h-5 text-orange-600 flex-shrink-0" />
                      <span className="font-medium text-sm">Débito</span>
                    </button>

                    {/* Boleto */}
                    <button
                      type="button"
                      onClick={() => setMeioPagamento("boleto")}
                      className={cn(
                        "w-full px-3 py-2 rounded-lg border-2 transition-all text-left flex items-center gap-3",
                        meioPagamento === "boleto"
                          ? "border-primary bg-primary/5"
                          : "border-border bg-background hover:border-primary/50"
                      )}
                    >
                      <FileText className="w-5 h-5 text-gray-600 flex-shrink-0" />
                      <span className="font-medium text-sm">Boleto</span>
                    </button>

                    {/* Dinheiro */}
                    <button
                      type="button"
                      onClick={() => setMeioPagamento("dinheiro")}
                      className={cn(
                        "w-full px-3 py-2 rounded-lg border-2 transition-all text-left flex items-center gap-3",
                        meioPagamento === "dinheiro"
                          ? "border-primary bg-primary/5"
                          : "border-border bg-background hover:border-primary/50"
                      )}
                    >
                      <Banknote className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <span className="font-medium text-sm">Dinheiro</span>
                    </button>

                    {/* Faturado */}
                    <button
                      type="button"
                      onClick={() => setMeioPagamento("faturado")}
                      className={cn(
                        "w-full px-3 py-2 rounded-lg border-2 transition-all text-left flex items-center gap-3",
                        meioPagamento === "faturado"
                          ? "border-primary bg-primary/5"
                          : "border-border bg-background hover:border-primary/50"
                      )}
                    >
                      <Receipt className="w-5 h-5 text-purple-600 flex-shrink-0" />
                      <span className="font-medium text-sm">Faturado</span>
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-lg bg-accent/10 border border-accent/20">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📄</span>
                    <Label htmlFor="notaFiscal" className="font-medium cursor-pointer text-sm">
                      Gerar Nota Fiscal
                    </Label>
                  </div>
                  <Switch
                    id="notaFiscal"
                    checked={gerarNotaFiscal}
                    onCheckedChange={setGerarNotaFiscal}
                  />
                </div>
              </CardContent>
            </Card>
            </div>

            {/* Coluna Direita - Histórico e Comentários */}
            <div className="space-y-6">
              {/* Histórico de Compra */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl font-semibold">Histórico de Compra</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {!clienteSelecionado ? (
                    <div className="flex items-center justify-center min-h-[200px] text-center">
                      <p className="text-muted-foreground text-sm">
                        Selecione um cliente para visualizar<br />o histórico de compras
                      </p>
                    </div>
                  ) : historicoPedidos.length === 0 ? (
                    <div className="flex items-center justify-center min-h-[200px] text-center">
                      <p className="text-muted-foreground text-sm">
                        Este cliente ainda não possui<br />histórico de compras
                      </p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px] pr-3">
                      <div className="space-y-3">
                        {historicoPedidos.map((pedido) => (
                          <Card key={pedido.id} className="shadow-sm">
                            <CardContent className="p-4">
                              {/* Cabeçalho do pedido - sempre visível */}
                              <div className="space-y-2">
                                <div className="flex items-start justify-between">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-muted-foreground font-medium">Pedido</span>
                                      <Badge className="bg-foreground text-background hover:bg-foreground/90 font-bold">
                                        {parseInt(pedido.numero, 10) || 'N/A'}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{pedido.dataHora}</p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => togglePedidoExpandido(pedido.id)}
                                    className="h-7 w-7 p-0"
                                  >
                                    {pedidoExpandido === pedido.id ? (
                                      <ChevronUp className="h-4 w-4" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>

                                <div className="space-y-1.5">
                                  <div>
                                    <Label className="text-xs text-muted-foreground">Produto(s)</Label>
                                    <div className="text-sm font-medium mt-0.5">
                                      {(pedido.itens_pedido || []).slice(0, 2).map((item: any, idx: number) => (
                                        <div key={idx}>{item.produtos?.nome || 'Produto'}</div>
                                      ))}
                                      {(pedido.itens_pedido || []).length > 2 && (
                                        <div className="text-xs text-muted-foreground italic">
                                          +{(pedido.itens_pedido || []).length - 2} produto(s)
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div>
                                    <Label className="text-xs text-muted-foreground">Funcionário</Label>
                                    <p className="text-sm font-medium">{pedido.vendedor}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Detalhes expandidos */}
                              {pedidoExpandido === pedido.id && (
                                <>
                                  <Separator className="my-3" />
                                  <div className="space-y-2">
                                    <div>
                                      <Label className="text-xs text-muted-foreground">Valor Total</Label>
                                      <p className="text-sm font-semibold text-primary">
                                        {formatBRL(pedido.valorTotal)}
                                      </p>
                                    </div>

                                    <div>
                                      <Label className="text-xs text-muted-foreground">Status</Label>
                                      <div className="mt-1">
                                        <Badge 
                                          className={cn(
                                            "min-w-[120px] justify-center text-xs",
                                            pedido.status === "Finalizado" && "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30",
                                            pedido.status === "Entrega" && "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30",
                                            pedido.status === "Produção" && "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30",
                                            pedido.status === "Andamento" && "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30",
                                            pedido.status === "Pedido" && "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30"
                                          )}
                                        >
                                          {pedido.status}
                                        </Badge>
                                      </div>
                                    </div>

                                    <div>
                                      <Label className="text-xs text-muted-foreground">Tipo de Retirada</Label>
                                      <p className="text-sm font-medium capitalize">{pedido.tipoRetirada === "balcao" ? "Balcão" : "Entrega (moto)"}</p>
                                    </div>

                                    <div>
                                      <Label className="text-xs text-muted-foreground">Prazo de Entrega</Label>
                                      <p className="text-sm font-medium">{pedido.prazoEntrega}</p>
                                    </div>

                                    {pedido.observacoes && (
                                      <div>
                                        <Label className="text-xs text-muted-foreground">Observações</Label>
                                        <p className="text-sm mt-1">{pedido.observacoes}</p>
                                      </div>
                                    )}

                                    {pedido.produtos.length > 0 && (
                                      <div>
                                        <Label className="text-xs text-muted-foreground">Todos os Produtos</Label>
                                        <div className="text-sm mt-1 space-y-0.5">
                                          {pedido.produtos.map((prod: string, idx: number) => (
                                            <div key={idx} className="flex items-start gap-1">
                                              <span className="text-muted-foreground">•</span>
                                              <span>{prod}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              {/* Comentários/Observações com padding maior na base */}
              <div className="pb-12">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl font-semibold">Comentários/Observações</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 px-4 pb-6">
                    {/* Lista de comentários */}
                    {comentarios.length > 0 && (
                      <ScrollArea className="h-[300px] pr-3">
                        <div className="space-y-3">
                          {comentarios.map((comentario) => (
                            <Card key={comentario.id} className="shadow-sm">
                              <CardContent className="p-3">
                                <div className="space-y-1">
                                  <div className="flex items-start justify-between">
                                    <p className="font-semibold text-sm">{comentario.usuario}</p>
                                    <p className="text-xs text-muted-foreground">{comentario.dataHora}</p>
                                  </div>
                                  <p className="text-sm text-foreground">{comentario.texto}</p>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </ScrollArea>
                    )}

                    {/* Campo para adicionar comentário */}
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Escrever um comentário..."
                        rows={3}
                        className="resize-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            const texto = e.currentTarget.value.trim();
                            if (texto) {
                              handleAdicionarComentario({
                                id: Date.now().toString(),
                                usuario: "Administrador",
                                dataHora: new Date().toLocaleString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }),
                                texto: texto,
                              });
                              e.currentTarget.value = "";
                            }
                          }
                        }}
                      />
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            const textarea = e.currentTarget.parentElement?.previousElementSibling as HTMLTextAreaElement;
                            const texto = textarea?.value.trim();
                            if (texto) {
                              handleAdicionarComentario({
                                id: Date.now().toString(),
                                usuario: "Administrador",
                                dataHora: new Date().toLocaleString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }),
                                texto: texto,
                              });
                              if (textarea) textarea.value = "";
                            }
                          }}
                          className="gap-2"
                        >
                          <Send className="h-4 w-4" />
                          Postar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
        </div>
      </main>

      {/* Barra de rodapé fixa */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t p-4 z-[50] shadow-lg">
        <div className="max-w-[1800px] mx-auto flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate("/inicio")} className="min-w-[120px]">
            Cancelar
          </Button>
          <Button onClick={handleSalvar} className="bg-primary min-w-[200px]">
            Salvar Pedido
          </Button>
        </div>
      </div>

      {/* Modal de Edição de Cliente */}
      <ModalEditarCliente
        open={modalEditarClienteAberto}
        onOpenChange={setModalEditarClienteAberto}
        cliente={clienteSelecionado}
        onSalvar={(clienteAtualizadoData) => {
          setClienteSelecionado(clienteAtualizadoData);
          setNomeCompleto(clienteAtualizadoData.nome || "");
          setCelular(clienteAtualizadoData.celular || "");
          setCpf(clienteAtualizadoData.cpf_cnpj || "");
          setEmail(clienteAtualizadoData.email || "");
          
          // Disparar animação
          setClienteAtualizado(true);
          setTimeout(() => setClienteAtualizado(false), 400);
        }}
      />
    </div>
  );
}
