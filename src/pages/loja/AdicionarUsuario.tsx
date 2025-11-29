import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Eye, EyeOff, Upload, CheckCircle2, XCircle, User, Info } from 'lucide-react';
import { useUsuarios, type UsuarioRole } from '@/hooks/useUsuarios';

export default function AdicionarUsuario() {
  const navigate = useNavigate();
  const { createUsuario } = useUsuarios();

  // Form fields
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [nomeExibicao, setNomeExibicao] = useState('');
  const [celular, setCelular] = useState('');
  const [email, setEmail] = useState('');
  const [permissao, setPermissao] = useState<UsuarioRole>('vendedor');
  const [senha, setSenha] = useState('');
  const [confirmacaoSenha, setConfirmacaoSenha] = useState('');
  
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Email validation
  const validarEmail = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const emailValido = email.length === 0 || validarEmail(email);

  // Phone formatting
  const formatarCelular = (valor: string): string => {
    const apenasNumeros = valor.replace(/\D/g, '');
    if (apenasNumeros.length <= 2) {
      return apenasNumeros;
    }
    if (apenasNumeros.length <= 7) {
      return `(${apenasNumeros.slice(0, 2)}) ${apenasNumeros.slice(2)}`;
    }
    return `(${apenasNumeros.slice(0, 2)}) ${apenasNumeros.slice(2, 7)}-${apenasNumeros.slice(7, 11)}`;
  };

  const handleCelularChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatarCelular(e.target.value);
    setCelular(formatted);
  };

  // Password validation
  const validarSenha = (senha: string) => {
    return {
      tamanhoMinimo: senha.length > 0 && senha.length >= 8,
      contemNumero: senha.length > 0 && /\d/.test(senha),
      contemLetra: senha.length > 0 && /[a-zA-Z]/.test(senha),
      semNumerosSequenciais: senha.length > 0 && (!/(\d)\1{2,}/.test(senha) && !/012|123|234|345|456|567|678|789|890/.test(senha)),
      semLetrasRepetidas: senha.length > 0 && !/([a-zA-Z])\1{2,}/i.test(senha),
      senhasIguais: senha.length > 0 && confirmacaoSenha.length > 0 && senha === confirmacaoSenha,
    };
  };

  const validacao = validarSenha(senha);
  const senhaValida = senha.length > 0 && Object.values(validacao).every(v => v);

  // Avatar upload
  const handleUploadAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome || !sobrenome || !nomeExibicao || !email || !senha || !celular) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    if (!emailValido) {
      toast({
        title: "Erro",
        description: "E-mail inválido",
        variant: "destructive"
      });
      return;
    }

    if (!senhaValida) {
      toast({
        title: "Erro",
        description: "A senha não atende aos requisitos de segurança",
        variant: "destructive"
      });
      return;
    }

    if (senha !== confirmacaoSenha) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive"
      });
      return;
    }

    try {
      setSalvando(true);
      
      // Generate username from email (part before @)
      const username = email.split('@')[0]
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9_-]/g, '') // Remove invalid chars
        .replace(/\s+/g, '_'); // Replace spaces with underscore

      await createUsuario({
        nome: `${nome} ${sobrenome}`,
        username,
        email,
        senha,
        role: permissao,
        celular,
        nomeExibicao,
      });

      toast({
        title: "Sucesso",
        description: "Usuário criado com sucesso!",
        variant: "success"
      });
      navigate('/configuracoes?tab=usuarios');
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      // O erro já é tratado no hook useUsuarios
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <Sidebar type="loja" />
      <div className="min-h-screen bg-background pb-24 w-full">
        <main className="p-4 md:p-8 pb-32 w-full">
          <div className="max-w-[1800px] mx-auto space-y-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/configuracoes?tab=usuarios')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Adicionar Usuário</h1>
                <p className="text-muted-foreground">Preencha os dados do novo usuário</p>
              </div>
            </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Picture */}
          <Card>
            <CardHeader>
              <CardTitle>Foto de Perfil</CardTitle>
              <CardDescription>Adicione uma foto para o usuário</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="text-2xl bg-muted">
                  {avatarUrl && nome && sobrenome ? (
                    `${nome.charAt(0)}${sobrenome.charAt(0)}`
                  ) : (
                    <User className="h-12 w-12 text-muted-foreground" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div>
                <Input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUploadAvatar}
                />
                <Label htmlFor="avatar" className="cursor-pointer">
                  <Button type="button" variant="outline" asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Escolher Foto
                    </span>
                  </Button>
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="permissao" className="flex items-center h-6">
                    Permissão *
                  </Label>
                  <Select value={permissao} onValueChange={(value) => setPermissao(value as UsuarioRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="master">Master</SelectItem>
                      <SelectItem value="financeiro">Financeiro</SelectItem>
                      <SelectItem value="vendedor">Vendedor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail/Nome do Usuário *</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={!emailValido ? 'border-destructive' : ''}
                      required
                    />
                    {email.length > 0 && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {emailValido ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                    )}
                  </div>
                  {!emailValido && email.length > 0 && (
                    <p className="text-xs text-destructive">E-mail inválido</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sobrenome">Sobrenome *</Label>
                  <Input
                    id="sobrenome"
                    value={sobrenome}
                    onChange={(e) => setSobrenome(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <TooltipProvider>
                    <div className="flex items-center gap-2 h-6">
                      <Label htmlFor="nomeExibicao">
                        Nome de exibição nos Pedidos * <span className="text-muted-foreground">({nomeExibicao.length}/16)</span>
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Nome exibido nos cartões de pedidos</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                  <Input
                    id="nomeExibicao"
                    value={nomeExibicao}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length <= 16) {
                        setNomeExibicao(value);
                      }
                    }}
                    maxLength={16}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="celular">Celular *</Label>
                <Input
                  id="celular"
                  value={celular}
                  onChange={handleCelularChange}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Password */}
          <Card>
            <CardHeader>
              <CardTitle>Senha de Acesso</CardTitle>
              <CardDescription>Defina uma senha segura para o usuário</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="senha">Nova senha *</Label>
                <div className="relative">
                  <Input
                    id="senha"
                    type={mostrarSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                  >
                    {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmacaoSenha">Confirmação da nova senha *</Label>
                <div className="relative">
                  <Input
                    id="confirmacaoSenha"
                    type={mostrarConfirmacao ? 'text' : 'password'}
                    value={confirmacaoSenha}
                    onChange={(e) => setConfirmacaoSenha(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setMostrarConfirmacao(!mostrarConfirmacao)}
                  >
                    {mostrarConfirmacao ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-medium">Requisitos da senha:</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    {validacao.tamanhoMinimo ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span className={validacao.tamanhoMinimo ? 'text-green-600' : 'text-destructive'}>
                      Deve conter no mínimo 8 caracteres
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {validacao.contemNumero ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span className={validacao.contemNumero ? 'text-green-600' : 'text-destructive'}>
                      Deve conter no mínimo um número
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {validacao.contemLetra ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span className={validacao.contemLetra ? 'text-green-600' : 'text-destructive'}>
                      Deve conter no mínimo uma letra
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {validacao.semNumerosSequenciais ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span className={validacao.semNumerosSequenciais ? 'text-green-600' : 'text-destructive'}>
                      Não pode conter 3 ou mais números sequenciais e/ou repetidos
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {validacao.semLetrasRepetidas ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span className={validacao.semLetrasRepetidas ? 'text-green-600' : 'text-destructive'}>
                      Não pode conter 3 ou mais letras repetidas
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {validacao.senhasIguais ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span className={validacao.senhasIguais ? 'text-green-600' : 'text-destructive'}>
                      As senhas informadas precisam ser iguais
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </form>
        </div>
      </main>

      {/* Fixed Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 z-50">
        <div className="max-w-[1800px] mx-auto flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/configuracoes?tab=usuarios')}
            disabled={salvando}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={salvando || !senhaValida || !emailValido}
          >
            {salvando ? 'Criando...' : 'Criar Usuário'}
          </Button>
        </div>
      </div>
      </div>
    </>
  );
}
