import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Upload, Eye, EyeOff, Check, X, Info, ArrowLeft } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase";
import { toast } from "@/utils/toastHelper";
import userProfile from "@/assets/user-profile.jpg";
import { useUserAvatar } from "@/hooks/useUserAvatar";

const MinhaConta = () => {
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();
  const { role } = useUserRole();
  const { refreshAvatar } = useUserAvatar();
  
  // Estados do formulário
  const [nome, setNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [nomeExibicao, setNomeExibicao] = useState("");
  const [nomeExibicaoPedidos, setNomeExibicaoPedidos] = useState("");
  const [celular, setCelular] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  
  // Estados da senha
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacaoSenha, setConfirmacaoSenha] = useState("");
  const [mostrarSenhaAtual, setMostrarSenhaAtual] = useState(false);
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  
  // Estados de loading
  const [salvando, setSalvando] = useState(false);
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  useEffect(() => {
    if (user) {
      // Carregar dados do perfil
      carregarPerfil();
    }
  }, [user]);

  const carregarPerfil = async () => {
    try {
      const { data, error } = await supabase
        .from("perfis")
        .select("*")
        .eq("id", user?.id)
        .single();

      if (error) throw error;

      if (data) {
        const nomeCompleto = data.nome?.split(" ") || [];
        setNome(nomeCompleto[0] || "");
        setSobrenome(nomeCompleto.slice(1).join(" ") || "");
        setNomeExibicao(data.username || "");
        setNomeExibicaoPedidos(data.nome_exibicao_pedidos || "");
        setEmail(data.email || "");
        setCelular(data.celular || "");
        
        // Load avatar with cache buster
        if (data.avatar_url) {
          const urlWithCacheBuster = `${data.avatar_url}?t=${Date.now()}`;
          setAvatarUrl(urlWithCacheBuster);
        }
      }
    } catch (error: any) {
      console.error("Erro ao carregar perfil:", error);
      toast.error("Erro ao carregar dados do perfil");
    }
  };

  const formatarCelular = (valor: string) => {
    // Remove tudo que não é número
    const numeros = valor.replace(/\D/g, "");
    
    // Aplica a máscara (XX) XXXXX-XXXX
    if (numeros.length <= 2) {
      return numeros;
    } else if (numeros.length <= 7) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
    } else if (numeros.length <= 11) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`;
    }
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`;
  };

  const validarEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  // Validações de senha
  const validarSenha = () => {
    const validacoes = {
      tamanhoMinimo: novaSenha.length >= 8,
      temNumero: /\d/.test(novaSenha),
      temLetra: /[a-zA-Z]/.test(novaSenha),
      semNumerosSequenciais: !/(\d)\1{2,}/.test(novaSenha) && !/012|123|234|345|456|567|678|789/.test(novaSenha),
      semLetrasRepetidas: !/([a-zA-Z])\1{2,}/.test(novaSenha),
      senhasIguais: novaSenha === confirmacaoSenha && novaSenha.length > 0,
    };

    return validacoes;
  };

  const validacoes = validarSenha();
  const senhaValida = Object.values(validacoes).every(v => v === true);

  const handleAtualizarPerfil = async () => {
    if (!nome || !sobrenome || !nomeExibicao || !nomeExibicaoPedidos || !email || !celular) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (!validarEmail(email)) {
      toast.error("E-mail inválido");
      return;
    }

    setSalvando(true);
    try {
      // Guardar email antigo
      const emailAntigo = user?.email;

      // Atualizar tabela perfis
      const { error: perfilError } = await supabase
        .from("perfis")
        .update({
          nome: `${nome} ${sobrenome}`.trim(),
          username: nomeExibicao,
          nome_exibicao_pedidos: nomeExibicaoPedidos,
          email: email,
          celular: celular,
        })
        .eq("id", user?.id);

      if (perfilError) throw perfilError;

      // Se o email mudou, atualizar também no auth.users
      if (email !== emailAntigo) {
        const { error: authError } = await supabase.auth.updateUser({
          email: email
        });

        if (authError) {
          console.error("Erro ao atualizar email:", authError);
          toast.error("Email atualizado no perfil, mas houve erro ao atualizar no sistema de autenticação.");
        } else {
          toast.info("Perfil atualizado! IMPORTANTE: Você precisa confirmar o novo email antes de poder fazer login com ele. Verifique sua caixa de entrada.", {
            duration: 8000,
          });
        }
      } else {
        toast.success("Perfil atualizado com sucesso!");
      }

      await carregarPerfil();
    } catch (error: any) {
      console.error("Erro ao atualizar perfil:", error);
      toast.error("Erro ao atualizar perfil");
    } finally {
      setSalvando(false);
    }
  };

  const handleAtualizarSenha = async () => {
    if (!senhaValida) {
      toast.error("A senha não atende aos requisitos");
      return;
    }

    setSalvandoSenha(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: novaSenha
      });

      if (error) throw error;

      toast.success("Senha atualizada com sucesso!");
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmacaoSenha("");
    } catch (error: any) {
      console.error("Erro ao atualizar senha:", error);
      toast.error("Erro ao atualizar senha");
    } finally {
      setSalvandoSenha(false);
    }
  };

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    try {
      // Resize image before upload
      const reader = new FileReader();
      reader.onload = async (event) => {
        const img = new Image();
        img.onload = async () => {
          // Create canvas for resizing
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          // Calculate new dimensions maintaining aspect ratio
          const maxSize = 400;
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
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob
          canvas.toBlob(async (blob) => {
            if (!blob) return;

            const resizedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            // Delete old avatars
            const { data: fileList } = await supabase.storage
              .from('avatars')
              .list(user.id);

            if (fileList && fileList.length > 0) {
              const filesToDelete = fileList.map(f => `${user.id}/${f.name}`);
              await supabase.storage.from('avatars').remove(filesToDelete);
            }

            // Upload new avatar
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/avatar.${fileExt}`;

            const { error: uploadError } = await supabase.storage
              .from('avatars')
              .upload(fileName, resizedFile, { upsert: true });

            if (uploadError) {
              console.error('Erro ao fazer upload:', uploadError);
              toast.error('Erro ao fazer upload da foto');
              return;
            }

            // Get public URL
            const { data: urlData } = supabase.storage
              .from('avatars')
              .getPublicUrl(fileName);

            const publicUrl = urlData.publicUrl;

            // Update profile
            const { error: updateError } = await supabase
              .from('perfis')
              .update({ avatar_url: publicUrl })
              .eq('id', user.id);

            if (updateError) {
              console.error('Erro ao atualizar perfil:', updateError);
              toast.error('Erro ao atualizar perfil');
              return;
            }

            // Atualizar cache do avatar
            await refreshAvatar();

            // Update local state with cache buster
            setAvatarUrl(`${publicUrl}?t=${Date.now()}`);
            toast.success('Foto de perfil atualizada!');
          }, 'image/jpeg', 0.9);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload da foto');
    }
  };

  const getRoleName = () => {
    const roleStr = role as string;
    switch (roleStr) {
      case "master":
        return "Master";
      case "financeiro":
        return "Financeiro";
      case "vendedor":
        return "Vendedor";
      default:
        return "Vendedor";
    }
  };

  const userInitials = `${nome[0] || ""}${sobrenome[0] || ""}`.toUpperCase();

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
                onClick={() => navigate('/configuracoes')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Minha Conta</h1>
                <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
              </div>
            </div>

          {/* Foto de Perfil */}
          <Card>
            <CardHeader>
              <CardTitle>Foto de Perfil</CardTitle>
              <CardDescription>Adicione uma foto para personalizar seu perfil</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src={avatarUrl} alt={`${nome} ${sobrenome}`} className="object-cover" />
                <AvatarFallback className="text-2xl">{userInitials}</AvatarFallback>
              </Avatar>
              <div>
                <input
                  type="file"
                  id="avatar-upload"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUploadAvatar}
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById("avatar-upload")?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Escolher Foto
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  JPG, PNG ou GIF. Máximo 2MB.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Informações Pessoais */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>Atualize suas informações de perfil</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="permissao">Permissão</Label>
                  <Input
                    id="permissao"
                    value={getRoleName()}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Nome do Usuário</Label>
                  <Input
                    id="username"
                    value={nomeExibicao}
                    disabled
                    className="bg-muted"
                  />
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
                  <div className="flex items-center gap-2">
                    <Label htmlFor="nomeExibicao">Nome de exibição nos Pedidos *</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Nome exibido nos cartões de pedidos</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="nomeExibicao"
                    value={nomeExibicaoPedidos}
                    onChange={(e) => setNomeExibicaoPedidos(e.target.value)}
                    placeholder="Como você quer ser chamado"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="celular">Celular *</Label>
                  <Input
                    id="celular"
                    value={celular}
                    onChange={(e) => setCelular(formatarCelular(e.target.value))}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail *</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className={email && !validarEmail(email) ? "border-destructive" : ""}
                      required
                    />
                    {email && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {validarEmail(email) ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                    )}
                  </div>
                  {email && !validarEmail(email) && (
                    <p className="text-xs text-destructive">E-mail inválido</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleAtualizarPerfil} disabled={salvando}>
                  {salvando ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Redefinição de Senha */}
          <Card>
            <CardHeader>
              <CardTitle>Redefinir Senha</CardTitle>
              <CardDescription>Altere sua senha de acesso</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="senhaAtual">Senha atual</Label>
                <div className="relative">
                  <Input
                    id="senhaAtual"
                    type={mostrarSenhaAtual ? "text" : "password"}
                    value={senhaAtual}
                    onChange={(e) => setSenhaAtual(e.target.value)}
                    placeholder="Digite sua senha atual"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenhaAtual(!mostrarSenhaAtual)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {mostrarSenhaAtual ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="novaSenha">Nova senha</Label>
                <div className="relative">
                  <Input
                    id="novaSenha"
                    type={mostrarNovaSenha ? "text" : "password"}
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    placeholder="Digite sua nova senha"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarNovaSenha(!mostrarNovaSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {mostrarNovaSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmacaoSenha">Confirmação da nova senha</Label>
                <div className="relative">
                  <Input
                    id="confirmacaoSenha"
                    type={mostrarConfirmacao ? "text" : "password"}
                    value={confirmacaoSenha}
                    onChange={(e) => setConfirmacaoSenha(e.target.value)}
                    placeholder="Confirme sua nova senha"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarConfirmacao(!mostrarConfirmacao)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {mostrarConfirmacao ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {novaSenha && (
                <div className="space-y-2 p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Requisitos da senha:</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      {validacoes.tamanhoMinimo ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-destructive" />
                      )}
                      <span className={validacoes.tamanhoMinimo ? "text-green-500" : "text-destructive"}>
                        Deve conter no mínimo 8 caracteres
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {validacoes.temNumero ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-destructive" />
                      )}
                      <span className={validacoes.temNumero ? "text-green-500" : "text-destructive"}>
                        Deve conter no mínimo um número
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {validacoes.temLetra ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-destructive" />
                      )}
                      <span className={validacoes.temLetra ? "text-green-500" : "text-destructive"}>
                        Deve conter no mínimo uma letra
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {validacoes.semNumerosSequenciais ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-destructive" />
                      )}
                      <span className={validacoes.semNumerosSequenciais ? "text-green-500" : "text-destructive"}>
                        Não pode conter 3 ou mais números sequenciais e/ou repetidos
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {validacoes.semLetrasRepetidas ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-destructive" />
                      )}
                      <span className={validacoes.semLetrasRepetidas ? "text-green-500" : "text-destructive"}>
                        Não pode conter 3 ou mais letras repetidas
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {validacoes.senhasIguais ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-destructive" />
                      )}
                      <span className={validacoes.senhasIguais ? "text-green-500" : "text-destructive"}>
                        As senhas informadas precisam ser iguais
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button 
                  onClick={handleAtualizarSenha} 
                  disabled={salvandoSenha || !senhaValida || !senhaAtual}
                >
                  {salvandoSenha ? "Salvando..." : "Atualizar Senha"}
                </Button>
              </div>
            </CardContent>
          </Card>
          </div>
        </main>
      </div>
    </>
  );
};

export default MinhaConta;
