import { useState, useCallback, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/utils/toastHelper";
import { Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { clienteSchema, type ClienteInput } from "@/schemas/cliente.schema";
import { useClientes } from "@/hooks/useClientes";
import { estadosBrasil } from "@/data/brasilData";
import { supabase } from "@/integrations/supabase/client";
import { AvatarUpload } from "./AvatarUpload";
import { HistoricoAlteracoes } from "./HistoricoAlteracoes";

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

const maskTelefone = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{4})(\d{1,4})/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

const maskCEP = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d{1,3})/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1');
};

// Buscar endereço por CEP usando ViaCEP
const buscarCEP = async (cep: string) => {
  const cepLimpo = cep.replace(/\D/g, '');
  
  if (cepLimpo.length !== 8) {
    return null;
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    const data = await response.json();
    
    if (data.erro) {
      return null;
    }

    return {
      endereco: data.logradouro || '',
      bairro: data.bairro || '',
      cidade: data.localidade || '',
      estado: data.uf || '',
    };
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    return null;
  }
};

interface ClienteFormProps {
  onSuccess?: () => void;
  onClose?: () => void;
  cliente?: any;
}

export const ClienteForm = ({ onSuccess, onClose, cliente }: ClienteFormProps) => {
  const { createCliente, updateCliente } = useClientes();
  const [tipoPessoa, setTipoPessoa] = useState<"Pessoa Física" | "Pessoa Jurídica">(
    cliente?.tipo || "Pessoa Física"
  );
  const [cpfCnpjError, setCpfCnpjError] = useState<string | null>(null);
  const [consultandoCnpj, setConsultandoCnpj] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(cliente?.avatar_url || null);
  const [activeTab, setActiveTab] = useState("dados");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const form = useForm<ClienteInput>({
    resolver: zodResolver(clienteSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      nome: cliente?.nome || "",
      cpf_cnpj: cliente?.cpf_cnpj || "",
      celular: cliente?.celular || "",
      email: cliente?.email || "",
      telefone: cliente?.telefone || "",
      endereco: cliente?.endereco || "",
      numero: cliente?.numero || "",
      complemento: cliente?.complemento || "",
      bairro: cliente?.bairro || "",
      cidade: cliente?.cidade || "",
      estado: cliente?.estado || "",
      cep: cliente?.cep || "",
      observacoes: cliente?.observacoes || "",
      tipo: cliente?.tipo || "Pessoa Física",
      ativo: cliente?.ativo ?? true,
    },
  });

  // Atualizar avatarUrl quando cliente mudar
  useEffect(() => {
    if (cliente?.avatar_url) {
      setAvatarUrl(cliente.avatar_url);
    }
  }, [cliente?.avatar_url]);

  const onSubmit = async (data: ClienteInput) => {
    // Validar CPF/CNPJ de acordo com o tipo de pessoa
    const cpfCnpjLimpo = data.cpf_cnpj.replace(/\D/g, '');
    
    if (data.tipo === "Pessoa Física" && cpfCnpjLimpo.length !== 11) {
      form.setError('cpf_cnpj', {
        type: 'manual',
        message: 'CPF deve ter 11 dígitos'
      });
      return;
    }
    
    if (data.tipo === "Pessoa Jurídica" && cpfCnpjLimpo.length !== 14) {
      form.setError('cpf_cnpj', {
        type: 'manual',
        message: 'CNPJ deve ter 14 dígitos'
      });
      return;
    }

    // Verificar duplicatas antes de salvar
    try {
      const { data: clienteExistente, error } = await supabase
        .from('clientes')
        .select('id, nome')
        .eq('cpf_cnpj', data.cpf_cnpj)
        .maybeSingle();

      if (error) {
        console.error('Erro ao verificar duplicata:', error);
        toast.error("Erro ao verificar duplicidade de CPF/CNPJ");
        return;
      }

      // Se encontrou um cliente e não é o mesmo que está sendo editado
      if (clienteExistente && clienteExistente.id !== cliente?.id) {
        const tipo = data.tipo === "Pessoa Física" ? 'CPF' : 'CNPJ';
        form.setError('cpf_cnpj', {
          type: 'manual',
          message: `${tipo} já cadastrado para o cliente: ${clienteExistente.nome}`
        });
        toast.error(`${tipo} já cadastrado para o cliente: ${clienteExistente.nome}`);
        return;
      }

      const dataComAvatar = { ...data, avatar_url: avatarUrl };
      
      if (cliente?.id) {
        await updateCliente(cliente.id, dataComAvatar);
      } else {
        await createCliente(dataComAvatar);
      }
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
    }
  };

  const onError = (errors: any) => {
    // Encontrar a primeira aba com erro
    const errorFields = Object.keys(errors);
    
    if (errorFields.some(field => ['nome', 'cpf_cnpj', 'celular', 'email', 'telefone', 'tipo'].includes(field))) {
      setActiveTab('dados');
    } else if (errorFields.some(field => ['cep', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado'].includes(field))) {
      setActiveTab('endereco');
    } else if (errorFields.includes('observacoes')) {
      setActiveTab('observacoes');
    }
  };

  // Verificação de duplicatas com debounce
  const verificarDuplicataCpfCnpj = useCallback(async (cpfCnpj: string) => {
    const limpo = cpfCnpj.replace(/\D/g, '');
    
    if (limpo.length !== 11 && limpo.length !== 14) {
      setCpfCnpjError(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome')
        .eq('cpf_cnpj', cpfCnpj)
        .maybeSingle();

      if (error) {
        console.error('Erro ao verificar duplicata:', error);
        return;
      }

      // Se encontrou um cliente e não é o mesmo que está sendo editado
      if (data && data.id !== cliente?.id) {
        const tipo = limpo.length === 11 ? 'CPF' : 'CNPJ';
        setCpfCnpjError(`${tipo} já cadastrado para o cliente: ${data.nome}`);
        form.setError('cpf_cnpj', {
          type: 'manual',
          message: `${tipo} já cadastrado para o cliente: ${data.nome}`
        });
      } else {
        setCpfCnpjError(null);
        form.clearErrors('cpf_cnpj');
      }
    } catch (err) {
      console.error('Erro ao verificar duplicata:', err);
    }
  }, [cliente?.id, form]);

  const handleCpfCnpjChange = useCallback((value: string, onChange: (value: string) => void) => {
    onChange(value);
    
    // Limpar timer anterior
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Criar novo timer com debounce de 500ms
    debounceTimerRef.current = setTimeout(() => {
      verificarDuplicataCpfCnpj(value);
    }, 500);
  }, [verificarDuplicataCpfCnpj]);

  // Consultar CNPJ na Receita Federal
  const consultarCnpj = useCallback(async (cnpj: string) => {
    const limpo = cnpj.replace(/\D/g, '');
    
    if (limpo.length !== 14 || tipoPessoa !== "Pessoa Jurídica") {
      return;
    }

    setConsultandoCnpj(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('consultar-cnpj', {
        body: { cnpj }
      });

      if (error) throw error;

      if (data && !data.error) {
        // Preencher campos automaticamente
        form.setValue('nome', data.razao_social || data.nome);
        if (data.email) form.setValue('email', data.email);
        if (data.telefone) form.setValue('telefone', data.telefone);
        if (data.cep) form.setValue('cep', data.cep);
        if (data.endereco) form.setValue('endereco', data.endereco);
        if (data.numero) form.setValue('numero', data.numero);
        if (data.complemento) form.setValue('complemento', data.complemento);
        if (data.bairro) form.setValue('bairro', data.bairro);
        if (data.cidade) form.setValue('cidade', data.cidade);
        if (data.estado) form.setValue('estado', data.estado);
        
        toast.success('Dados da Receita Federal carregados com sucesso!');
      } else {
        toast.error(data?.error || 'Erro ao consultar CNPJ');
      }
    } catch (error) {
      console.error('Erro ao consultar CNPJ:', error);
      toast.error('Erro ao consultar CNPJ na Receita Federal');
    } finally {
      setConsultandoCnpj(false);
    }
  }, [form, tipoPessoa]);

  const handleCpfCnpjBlur = useCallback((value: string) => {
    // Ao perder o foco, se for CNPJ válido, consultar Receita
    const limpo = value.replace(/\D/g, '');
    if (limpo.length === 14 && tipoPessoa === "Pessoa Jurídica") {
      consultarCnpj(value);
    }
  }, [consultarCnpj, tipoPessoa]);

  // Componente auxiliar para label com contador
  const LabelWithCounter = ({ 
    label, 
    currentLength, 
    maxLength, 
    tooltip 
  }: { 
    label: string; 
    currentLength: number; 
    maxLength: number; 
    tooltip: string;
  }) => (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip delayDuration={500}>
          <TooltipTrigger asChild tabIndex={-1}>
            <span className="cursor-help" tabIndex={-1}>{label}</span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <span className="text-xs text-muted-foreground">
        ({currentLength}/{maxLength})
      </span>
    </div>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-6">
        <div className="text-sm text-muted-foreground text-right mb-4">
          (*) Campos Obrigatórios
        </div>

        {/* Abas */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5" tabIndex={-1}>
            <TabsTrigger value="avatar" tabIndex={-1}>Foto</TabsTrigger>
            <TabsTrigger value="dados" tabIndex={-1}>Dados Cadastrais</TabsTrigger>
            <TabsTrigger value="endereco" tabIndex={-1}>Endereço</TabsTrigger>
            <TabsTrigger value="observacoes" tabIndex={-1}>Observações</TabsTrigger>
            <TabsTrigger value="historico" tabIndex={-1}>Histórico</TabsTrigger>
          </TabsList>

          {/* Aba: Avatar */}
          <TabsContent value="avatar" className="space-y-4 min-h-[400px]" tabIndex={-1}>
            <div className="rounded-lg p-6 border focus:outline-none flex flex-col items-center justify-center min-h-[400px]" tabIndex={-1}>
              <AvatarUpload
                currentAvatarUrl={avatarUrl}
                clienteId={cliente?.id}
                onAvatarChange={setAvatarUrl}
              />
              <p className="text-xs text-muted-foreground mt-4 text-center max-w-xs">
                Adicione uma foto do cliente. Formatos aceitos: JPG, PNG. Tamanho máximo: 2MB.
              </p>
            </div>
          </TabsContent>

          {/* Aba: Dados Cadastrais */}
          <TabsContent value="dados" className="space-y-4 min-h-[400px]" tabIndex={-1}>
            <div className="space-y-4 rounded-lg p-6 border focus:outline-none" tabIndex={-1}>
              {/* Tipo de Pessoa */}
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">* Tipo de Pessoa:</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(value) => {
                          field.onChange(value);
                          setTipoPessoa(value as "Pessoa Física" | "Pessoa Jurídica");
                        }}
                        defaultValue={field.value}
                        className="flex gap-6"
                        tabIndex={-1}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Pessoa Física" id="pf" tabIndex={-1} />
                          <Label htmlFor="pf" className="cursor-pointer font-normal" tabIndex={-1}>Pessoa Física</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Pessoa Jurídica" id="pj" tabIndex={-1} />
                          <Label htmlFor="pj" className="cursor-pointer font-normal" tabIndex={-1}>Pessoa Jurídica</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4" key={tipoPessoa}>
                {tipoPessoa === "Pessoa Jurídica" ? (
                  <>
                    {/* CNPJ primeiro para Pessoa Jurídica */}
                    <FormField
                      control={form.control}
                      name="cpf_cnpj"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <FormLabel>
                            <LabelWithCounter
                              label="* CNPJ:"
                              currentLength={field.value?.replace(/\D/g, '').length || 0}
                              maxLength={14}
                              tooltip="Digite o CNPJ no formato 99.999.999/9999-99. Os dados serão preenchidos automaticamente."
                            />
                          </FormLabel>
                          <FormControl>
                            <Input 
                              key="cnpj-input"
                              {...field} 
                              placeholder="99.999.999/9999-99"
                              onChange={(e) => {
                                const masked = maskCNPJ(e.target.value);
                                handleCpfCnpjChange(masked, field.onChange);
                              }}
                              onBlur={(e) => handleCpfCnpjBlur(e.target.value)}
                              maxLength={18}
                              state={consultandoCnpj ? "default" : (fieldState.error || cpfCnpjError ? "error" : fieldState.isDirty && !fieldState.error && !cpfCnpjError ? "success" : "default")}
                              showStateIcon={fieldState.isDirty && !consultandoCnpj}
                              disabled={consultandoCnpj}
                            />
                          </FormControl>
                          {consultandoCnpj && (
                            <p className="text-xs text-muted-foreground flex items-center gap-2">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Consultando CNPJ na Receita Federal...
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Nome/Razão Social depois para Pessoa Jurídica */}
                    <FormField
                      control={form.control}
                      name="nome"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <FormLabel>
                            <LabelWithCounter
                              label="* Nome/Razão Social:"
                              currentLength={field.value?.length || 0}
                              maxLength={150}
                              tooltip="Digite a razão social completa da empresa conforme CNPJ."
                            />
                          </FormLabel>
                          <FormControl>
                            <Input 
                              key="razao-social-input"
                              {...field} 
                              maxLength={150} 
                              state={fieldState.error ? "error" : fieldState.isDirty && !fieldState.error ? "success" : "default"}
                              showStateIcon={fieldState.isDirty}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                ) : (
                  <>
                    {/* Nome Completo primeiro para Pessoa Física */}
                    <FormField
                      control={form.control}
                      name="nome"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <FormLabel>
                            <LabelWithCounter
                              label="* Nome Completo:"
                              currentLength={field.value?.length || 0}
                              maxLength={150}
                              tooltip="Digite o nome completo do cliente conforme documento de identidade."
                            />
                          </FormLabel>
                          <FormControl>
                            <Input 
                              key="nome-completo-input"
                              {...field} 
                              maxLength={150} 
                              autoFocus
                              state={fieldState.error ? "error" : fieldState.isDirty && !fieldState.error ? "success" : "default"}
                              showStateIcon={fieldState.isDirty}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* CPF depois para Pessoa Física */}
                    <FormField
                      control={form.control}
                      name="cpf_cnpj"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <FormLabel>
                            <LabelWithCounter
                              label="* CPF:"
                              currentLength={field.value?.replace(/\D/g, '').length || 0}
                              maxLength={11}
                              tooltip="Digite o CPF no formato 999.999.999-99."
                            />
                          </FormLabel>
                          <FormControl>
                            <Input 
                              key="cpf-input"
                              {...field} 
                              placeholder="999.999.999-99"
                              onChange={(e) => {
                                const masked = maskCPF(e.target.value);
                                handleCpfCnpjChange(masked, field.onChange);
                              }}
                              onBlur={(e) => handleCpfCnpjBlur(e.target.value)}
                              maxLength={14}
                              state={fieldState.error || cpfCnpjError ? "error" : fieldState.isDirty && !fieldState.error && !cpfCnpjError ? "success" : "default"}
                              showStateIcon={fieldState.isDirty}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="celular"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>
                        <LabelWithCounter
                          label="* Celular:"
                          currentLength={field.value?.replace(/\D/g, '').length || 0}
                          maxLength={11}
                          tooltip="Digite o celular com DDD no formato (99) 99999-9999."
                        />
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field}
                          value={maskCelular(field.value || '')}
                          placeholder="(99) 99999-9999"
                          onChange={(e) => {
                            const onlyNumbers = e.target.value.replace(/\D/g, '');
                            field.onChange(onlyNumbers);
                          }}
                          maxLength={15}
                          state={fieldState.error ? "error" : fieldState.isDirty && !fieldState.error ? "success" : "default"}
                          showStateIcon={fieldState.isDirty}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>
                        <LabelWithCounter
                          label="E-mail:"
                          currentLength={field.value?.length || 0}
                          maxLength={150}
                          tooltip="Digite um e-mail válido no formato exemplo@dominio.com."
                        />
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="email" 
                          maxLength={150}
                          state={fieldState.error ? "error" : fieldState.isDirty && !fieldState.error ? "success" : "default"}
                          showStateIcon={fieldState.isDirty}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="telefone"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>
                      <LabelWithCounter
                        label="Telefone:"
                        currentLength={field.value?.replace(/\D/g, '').length || 0}
                        maxLength={10}
                        tooltip="Digite o telefone fixo com DDD no formato (99) 9999-9999."
                      />
                    </FormLabel>
                    <FormControl>
                      <Input 
                        {...field}
                        value={maskTelefone(field.value || '')}
                        placeholder="(99) 9999-9999"
                        onChange={(e) => {
                          const onlyNumbers = e.target.value.replace(/\D/g, '');
                          field.onChange(onlyNumbers);
                        }}
                        maxLength={14}
                        state={fieldState.error ? "error" : fieldState.isDirty && !fieldState.error ? "success" : "default"}
                        showStateIcon={fieldState.isDirty}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>

          {/* Aba: Endereço */}
          <TabsContent value="endereco" className="space-y-4 min-h-[400px]" tabIndex={-1}>
            <div className="space-y-4 rounded-lg p-4 border focus:outline-none" tabIndex={-1}>
              <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 4fr 1.2fr' }}>
                <FormField
                  control={form.control}
                  name="cep"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>
                        <LabelWithCounter
                          label="CEP:"
                          currentLength={field.value?.replace(/\D/g, '').length || 0}
                          maxLength={8}
                          tooltip="Digite o CEP no formato 99999-999. O endereço será preenchido automaticamente."
                        />
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="99999-999"
                          onChange={async (e) => {
                            const masked = maskCEP(e.target.value);
                            field.onChange(masked);
                            
                            const cepLimpo = masked.replace(/\D/g, '');
                            if (cepLimpo.length === 8) {
                              const endereco = await buscarCEP(masked);
                              if (endereco) {
                                form.setValue('endereco', endereco.endereco);
                                form.setValue('bairro', endereco.bairro);
                                form.setValue('cidade', endereco.cidade);
                                form.setValue('estado', endereco.estado);
                              }
                            }
                          }}
                          maxLength={9}
                          state={fieldState.error ? "error" : fieldState.isDirty && !fieldState.error ? "success" : "default"}
                          showStateIcon={fieldState.isDirty}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endereco"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>
                        <LabelWithCounter
                          label="Endereço:"
                          currentLength={field.value?.length || 0}
                          maxLength={150}
                          tooltip="Digite o nome da rua, avenida ou logradouro."
                        />
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          maxLength={150}
                          state={fieldState.error ? "error" : fieldState.isDirty && !fieldState.error ? "success" : "default"}
                          showStateIcon={fieldState.isDirty}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="numero"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>
                        <LabelWithCounter
                          label="Número:"
                          currentLength={field.value?.length || 0}
                          maxLength={10}
                          tooltip="Digite o número do endereço ou 'S/N' para sem número."
                        />
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          maxLength={10}
                          state={fieldState.error ? "error" : fieldState.isDirty && !fieldState.error ? "success" : "default"}
                          showStateIcon={fieldState.isDirty}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4" style={{ gridTemplateColumns: '1.5fr 3.7fr' }}>
                <FormField
                  control={form.control}
                  name="complemento"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>
                        <LabelWithCounter
                          label="Complemento:"
                          currentLength={field.value?.length || 0}
                          maxLength={50}
                          tooltip="Digite informações adicionais como apartamento, bloco, sala, etc."
                        />
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          maxLength={50}
                          state={fieldState.error ? "error" : fieldState.isDirty && !fieldState.error ? "success" : "default"}
                          showStateIcon={fieldState.isDirty}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bairro"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>
                        <LabelWithCounter
                          label="Bairro:"
                          currentLength={field.value?.length || 0}
                          maxLength={80}
                          tooltip="Digite o nome do bairro."
                        />
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          maxLength={80}
                          state={fieldState.error ? "error" : fieldState.isDirty && !fieldState.error ? "success" : "default"}
                          showStateIcon={fieldState.isDirty}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4" style={{ gridTemplateColumns: '4fr 1.2fr' }}>
                <FormField
                  control={form.control}
                  name="cidade"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>
                        <LabelWithCounter
                          label="Cidade:"
                          currentLength={field.value?.length || 0}
                          maxLength={100}
                          tooltip="Digite o nome da cidade."
                        />
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          maxLength={100}
                          state={fieldState.error ? "error" : fieldState.isDirty && !fieldState.error ? "success" : "default"}
                          showStateIcon={fieldState.isDirty}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estado"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>
                        <LabelWithCounter
                          label="Estado:"
                          currentLength={0}
                          maxLength={2}
                          tooltip="Selecione o estado (UF) correspondente ao endereço."
                        />
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger
                            state={fieldState.error ? "error" : fieldState.isDirty && !fieldState.error && field.value ? "success" : "default"}
                          >
                            <SelectValue placeholder="Selecione o estado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {estadosBrasil.map((estado) => (
                            <SelectItem key={estado.sigla} value={estado.sigla}>
                              {estado.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </TabsContent>

          {/* Aba: Observações */}
          <TabsContent value="observacoes" className="space-y-4 min-h-[400px]" tabIndex={-1}>
            <div className="space-y-4 rounded-lg p-6 border focus:outline-none" tabIndex={-1}>
              <FormField
                control={form.control}
                name="observacoes"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>
                      <LabelWithCounter
                        label="Observações:"
                        currentLength={field.value?.length || 0}
                        maxLength={2000}
                        tooltip="Digite observações ou informações adicionais relevantes sobre o cliente."
                      />
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        rows={8} 
                        placeholder="Digite observações adicionais..."
                        maxLength={2000}
                        state={fieldState.error ? "error" : fieldState.isDirty && !fieldState.error && field.value ? "success" : "default"}
                        showStateIcon={fieldState.isDirty && !!field.value}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>

          {/* Aba: Histórico */}
          <TabsContent value="historico" className="space-y-4 min-h-[400px]" tabIndex={-1}>
            <div className="space-y-4 rounded-lg p-6 border focus:outline-none" tabIndex={-1}>
              {cliente?.id ? (
                <HistoricoAlteracoes clienteId={cliente.id} />
              ) : (
                <div className="flex items-center justify-center min-h-[300px]">
                  <p className="text-muted-foreground text-center">
                    O histórico de alterações estará disponível após salvar o cliente.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Botões de ação */}
        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="outline" onClick={onClose || onSuccess}>
            Cancelar
          </Button>
          <Button type="submit">
            {cliente ? "Salvar Alterações" : "Salvar Cliente"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
