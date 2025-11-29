import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/utils/toastHelper';
import { ArrowLeft, Eye, EyeOff, Upload, CheckCircle2, XCircle, User, Info, Loader2 } from 'lucide-react';
import { useUsuarios, type UsuarioRole } from '@/hooks/useUsuarios';
import { supabase } from '@/integrations/supabase';
import { PermissoesTab } from '@/components/configuracoes/PermissoesTab';
import { useUserProfile } from '@/hooks/useUserProfile';

export default function EditarUsuario() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { usuarios, loading: loadingUsuarios, fetchUsuarios } = useUsuarios();

  // Form fields
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [nomeExibicao, setNomeExibicao] = useState('');
  const [celular, setCelular] = useState('');
  const [email, setEmail] = useState('');
  const [emailOriginal, setEmailOriginal] = useState(''); // Guardar email original para comparação
  const [permissao, setPermissao] = useState<UsuarioRole>('vendedor');
  const [senha, setSenha] = useState('');
  const [confirmacaoSenha, setConfirmacaoSenha] = useState('');
  
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      if (!id) return;

      try {
        setCarregando(true);
        const usuario = usuarios.find(u => u.id === id);
        
        if (!usuario) {
          toast.error('Usuário não encontrado');
          navigate('/configuracoes?tab=usuarios');
          return;
        }

        // Split name into first and last name
        const nomeParts = usuario.nome.split(' ');
        const primeiroNome = nomeParts[0] || '';
        const ultimoNome = nomeParts.slice(1).join(' ') || '';

        setNome(primeiroNome);
        setSobrenome(ultimoNome);
        setEmail(usuario.email || '');
        setEmailOriginal(usuario.email || ''); // Guardar email original
        setPermissao(usuario.role);

        // Load additional data from perfis table (celular, avatar, username)
        const { data: perfil, error: perfilError } = await supabase
          .from('perfis')
          .select('avatar_url, username, celular')
          .eq('id', id)
          .single();

        console.log('Perfil carregado:', perfil);
        console.log('Avatar URL do perfil:', perfil?.avatar_url);

        setNomeExibicao(perfil?.username || usuario.nome);
        setCelular(perfil?.celular || '');

        if (perfil?.avatar_url) {
          // Add cache buster to force reload
          const urlWithCacheBuster = `${perfil.avatar_url}?t=${Date.now()}`;
          setAvatarUrl(urlWithCacheBuster);
        } else {
          setAvatarUrl(''); // Clear if no avatar
        }

      } catch (error) {
        console.error('Erro ao carregar usuário:', error);
        toast.error('Erro ao carregar dados do usuário');
      } finally {
        setCarregando(false);
      }
    };

    if (!loadingUsuarios) {
      loadUserData();
    }
  }, [id, usuarios, loadingUsuarios, navigate]);

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

  // Password validation (opcional)
  const validarSenha = (senha: string) => {
    if (senha.length === 0) {
      return {
        tamanhoMinimo: true,
        contemNumero: true,
        contemLetra: true,
        semNumerosSequenciais: true,
        semLetrasRepetidas: true,
        senhasIguais: confirmacaoSenha.length === 0 || senha === confirmacaoSenha,
      };
    }
    return {
      tamanhoMinimo: senha.length >= 8,
      contemNumero: /\d/.test(senha),
      contemLetra: /[a-zA-Z]/.test(senha),
      semNumerosSequenciais: !/(\d)\1{2,}/.test(senha) && !/012|123|234|345|456|567|678|789|890/.test(senha),
      semLetrasRepetidas: !/([a-zA-Z])\1{2,}/i.test(senha),
      senhasIguais: confirmacaoSenha.length === 0 || senha === confirmacaoSenha,
    };
  };

  const validacao = validarSenha(senha);
  const senhaValida = Object.values(validacao).every(v => v);

  // Avatar upload with resize
  const handleUploadAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Create canvas for resizing
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          // Calculate new dimensions maintaining aspect ratio
          const maxSize = 400; // Max dimension for avatar
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Draw resized image
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob
          canvas.toBlob((blob) => {
            if (blob) {
              const resizedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              setAvatarFile(resizedFile);
              setAvatarUrl(canvas.toDataURL('image/jpeg', 0.9));
            }
          }, 'image/jpeg', 0.9);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome || !sobrenome || !nomeExibicao || !email || !celular) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (!emailValido) {
      toast.error('E-mail inválido');
      return;
    }

    if (senha && !senhaValida) {
      toast.error('A senha não atende aos requisitos de segurança');
      return;
    }

    if (senha && senha !== confirmacaoSenha) {
      toast.error('As senhas não coincidem');
      return;
    }

    try {
      setSalvando(true);
      
      let finalAvatarUrl = avatarUrl; // Keep existing URL by default

      // Upload new avatar if a file was selected
      if (avatarFile && id) {
        // List and delete all old avatars from this user's folder
        const { data: fileList } = await supabase.storage
          .from('avatars')
          .list(id);

        if (fileList && fileList.length > 0) {
          const filesToDelete = fileList.map(file => `${id}/${file.name}`);
          console.log('Deletando avatars antigos:', filesToDelete);
          await supabase.storage.from('avatars').remove(filesToDelete);
        }

        // Upload new avatar with fixed name (user id + extension)
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${id}/avatar.${fileExt}`;
        
        console.log('Iniciando upload do avatar:', fileName);
        
        const { error: uploadError, data } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, { upsert: true });

        if (uploadError) {
          console.error('Erro ao fazer upload do avatar:', uploadError);
          toast.error('Erro ao fazer upload da foto');
          throw uploadError;
        }

        console.log('Upload concluído com sucesso:', data);

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);
        
        finalAvatarUrl = urlData.publicUrl;
        console.log('URL pública gerada:', finalAvatarUrl);
      }
      
      console.log('Atualizando perfil com dados:', {
        nome: `${nome} ${sobrenome}`,
        email,
        avatar_url: finalAvatarUrl
      });
      
      // Update perfil
      const { error: perfilError } = await supabase
        .from('perfis')
        .update({
          nome: `${nome} ${sobrenome}`,
          username: nomeExibicao,
          email,
          celular,
          avatar_url: finalAvatarUrl,
        })
        .eq('id', id);

      if (perfilError) {
        console.error('Erro ao atualizar perfil:', perfilError);
        toast.error('Erro ao atualizar perfil');
        throw perfilError;
      }

      console.log('Perfil atualizado com sucesso');

      // Update role if changed
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: permissao })
        .eq('user_id', id);

      if (roleError) {
        console.error('Erro ao atualizar role:', roleError);
        throw roleError;
      }

      // Update email and/or password using edge function if changed
      if (email !== emailOriginal || senha) {
        const { data: updateData, error: updateError } = await supabase.functions.invoke('update-user', {
          body: {
            userId: id,
            email: email !== emailOriginal ? email : undefined,
            password: senha || undefined,
          }
        });

        if (updateError) {
          console.error('Erro ao atualizar usuário:', updateError);
          toast.error('Erro ao atualizar credenciais do usuário');
          throw updateError;
        }

        if (updateData?.error) {
          console.error('Erro retornado pela função:', updateData.error);
          toast.error(updateData.error);
          throw new Error(updateData.error);
        }

        if (email !== emailOriginal) {
          toast.success('Email atualizado com sucesso! O usuário pode fazer login imediatamente com o novo email.');
        }
      }

      // Recarregar lista de usuários
      await fetchUsuarios();

      toast.success('Usuário atualizado com sucesso!');
      
      // Force avatar reload with cache buster
      if (avatarFile && finalAvatarUrl) {
        const urlWithCacheBuster = `${finalAvatarUrl}?t=${Date.now()}`;
        setAvatarUrl(urlWithCacheBuster);
        setAvatarFile(null);
      }
      
      setTimeout(() => {
        navigate('/configuracoes?tab=usuarios');
      }, 1500);
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      toast.error('Erro ao atualizar usuário');
    } finally {
      setSalvando(false);
    }
  };

  if (carregando || loadingUsuarios) {
    return (
      <>
        <Sidebar type="loja" />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

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
                <h1 className="text-3xl font-bold">Editar Usuário</h1>
                <p className="text-muted-foreground">Atualize os dados do usuário</p>
              </div>
            </div>

        <Tabs defaultValue="dados" className="space-y-6">
          <TabsList>
            <TabsTrigger value="dados">Dados do Usuário</TabsTrigger>
            <TabsTrigger value="permissoes">Permissões</TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Profile Picture */}
              <Card>
            <CardHeader>
              <CardTitle>Foto de Perfil</CardTitle>
              <CardDescription>Atualize a foto do usuário</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarUrl} className="object-cover" />
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
              <CardTitle>Alterar Senha</CardTitle>
              <CardDescription>Deixe em branco para manter a senha atual</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="senha">Nova senha</Label>
                <div className="relative">
                  <Input
                    id="senha"
                    type={mostrarSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
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
                <Label htmlFor="confirmacaoSenha">Confirmação da nova senha</Label>
                <div className="relative">
                  <Input
                    id="confirmacaoSenha"
                    type={mostrarConfirmacao ? 'text' : 'password'}
                    value={confirmacaoSenha}
                    onChange={(e) => setConfirmacaoSenha(e.target.value)}
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

              {senha.length > 0 && (
                <>
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
                </>
              )}
            </CardContent>
          </Card>

            </form>
          </TabsContent>

          <TabsContent value="permissoes">
            {id && <PermissoesTab userId={id} />}
          </TabsContent>
        </Tabs>
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
            disabled={salvando || !emailValido || (senha.length > 0 && (!senhaValida || senha !== confirmacaoSenha))}
          >
            {salvando ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </div>
      </div>
    </>
  );
}
