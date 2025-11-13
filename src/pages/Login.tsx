import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { DatabaseStatusIndicator } from "@/components/DatabaseStatusIndicator";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase";
import { toast } from "@/utils/toastHelper";

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingUsers, setCheckingUsers] = useState(true);
  const [hasUsers, setHasUsers] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    acceptTerms: false,
  });

  // Password validation
  const validarSenha = (senha: string) => {
    return {
      tamanhoMinimo: senha.length > 0 && senha.length >= 8,
      contemNumero: senha.length > 0 && /\d/.test(senha),
      contemLetra: senha.length > 0 && /[a-zA-Z]/.test(senha),
      semNumerosSequenciais: senha.length > 0 && (!/(\d)\1{2,}/.test(senha) && !/012|123|234|345|456|567|678|789|890/.test(senha)),
      semLetrasRepetidas: senha.length > 0 && !/([a-zA-Z])\1{2,}/i.test(senha),
    };
  };

  const validacao = validarSenha(formData.password);
  const senhaValida = formData.password.length > 0 && Object.values(validacao).every(v => v);

  useEffect(() => {
    checkExistingUsers();
  }, []);

  const checkExistingUsers = async () => {
    try {
      console.log('🔍 Verificando usuários existentes...');
      
      // Método 1: Tentar via Edge Function (mais robusto para self-hosted)
      try {
        console.log('📡 Tentando via Edge Function check-users...');
        const { data, error } = await supabase.functions.invoke('check-users');
        
        if (error) {
          console.warn('⚠️ Edge Function retornou erro:', error);
        }
        
        if (!error && data && typeof data.hasUsers === 'boolean') {
          console.log('✅ Verificação via Edge Function bem-sucedida:', data);
          setHasUsers(data.hasUsers);
          return;
        }
        
        console.log('⚠️ Edge Function não retornou resultado válido, usando fallback...');
      } catch (funcError) {
        console.warn('⚠️ Erro ao invocar Edge Function, usando fallback:', funcError);
      }

      // Método 2: Fallback - query direta (funciona com RLS policy)
      console.log('📊 Tentando verificação via query direta...');
      const { count, error } = await supabase
        .from('perfis')
        .select('id', { count: 'exact', head: true });

      if (error) {
        console.error('❌ Erro ao verificar perfis via query:', error);
        // Em caso de erro em self-hosted, assumir que não há usuários (modo setup)
        console.log('🔧 Assumindo modo de configuração inicial (sem usuários)');
        setHasUsers(false);
        return;
      }

      const userCount = count || 0;
      console.log(`✅ Verificação via query direta: ${userCount} usuário(s) encontrado(s)`);
      setHasUsers(userCount > 0);
    } catch (error) {
      console.error('❌ Erro geral ao verificar usuários:', error);
      // Em caso de erro inesperado, assumir modo setup (mais seguro para instalação)
      console.log('🔧 Modo de configuração inicial ativado (erro de verificação)');
      setHasUsers(false);
    } finally {
      setCheckingUsers(false);
    }
  };

  const handleCreateMaster = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!senhaValida) {
      toast.error('A senha não atende aos requisitos de segurança');
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            nome: 'Master',
            username: 'master',
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Erro ao criar usuario master');

      // @ts-ignore - RPC function exists but not in types
      const { error: roleError } = await supabase.rpc('assign_master_role', {
        p_user_id: authData.user.id,
      });

      if (roleError) throw roleError;

      toast.success('Usuario MASTER criado com sucesso!');

      setHasUsers(true);
      setFormData({ email: '', password: '', acceptTerms: false });

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (!signInError && signInData?.user) {
        navigate('/loja/inicio');
      } else if (signInError) {
        toast.info('Faça login com as credenciais criadas após confirmar o e-mail.');
      }
    } catch (error: any) {
      console.error('Erro ao criar usuario master:', error);
      if (error?.message?.includes('Master user already exists')) {
        toast.error('Ja existe um usuario MASTER cadastrado. Faça login.');
      } else {
        toast.error(error?.message || 'Erro ao criar usuario master');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      navigate("/loja/inicio");
    } catch (error: any) {
      console.error('Erro ao fazer login:', error);
      toast.error('Usuário ou senha incorretos. Por favor, verifique suas credenciais ou entre em contato com o administrador do sistema.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingUsers) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Carregando sistema...</p>
        </div>
      </div>
    );
  }

  const isInitialSetup = !hasUsers;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
      {/* Theme Toggle - fixed top right */}
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      {/* Database Status Indicator - fixed bottom right */}
      <DatabaseStatusIndicator />
      
      <div className="w-full max-w-md animate-fade-in">
        <div className="bg-card shadow-fellow-xl rounded-3xl p-8 space-y-8 border border-border">
          {/* Logo */}
          <div className="text-center space-y-4">
            <div className="flex justify-center mb-4">
              <img 
                src={logo}
                alt="Fellow CRM" 
                className="h-16 object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold text-foreground">
              {!hasUsers ? 'Configuração Inicial' : 'Acessar Conta'}
            </h1>
            <p className="text-muted-foreground">
              {!hasUsers 
                ? 'Configure o primeiro usuário do sistema' 
                : 'Entre com suas credenciais para continuar'
              }
            </p>
            {!hasUsers && (
              <p className="text-destructive text-sm font-semibold">
                Cadastre o usuário MASTER.
              </p>
            )}
          </div>

          {/* Form */}
          <form onSubmit={isInitialSetup ? handleCreateMaster : handleLogin} autoComplete="off" className="space-y-6">
            <div className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">E-mail:</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                  autoComplete="off"
                  className="h-12 rounded-xl"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Senha:</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                    autoComplete="new-password"
                    className="h-12 pr-12 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                
                {/* Password Requirements - only show during initial setup */}
                {isInitialSetup && formData.password.length > 0 && (
                  <div className="mt-3 p-4 bg-muted/50 rounded-xl space-y-3">
                    <p className="text-sm font-medium text-foreground">Requisitos da senha:</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        {validacao.tamanhoMinimo ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                        )}
                        <span className={validacao.tamanhoMinimo ? 'text-green-600' : 'text-destructive'}>
                          Deve conter no mínimo 8 caracteres
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {validacao.contemNumero ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                        )}
                        <span className={validacao.contemNumero ? 'text-green-600' : 'text-destructive'}>
                          Deve conter no mínimo um número
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {validacao.contemLetra ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                        )}
                        <span className={validacao.contemLetra ? 'text-green-600' : 'text-destructive'}>
                          Deve conter no mínimo uma letra
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {validacao.semNumerosSequenciais ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                        )}
                        <span className={validacao.semNumerosSequenciais ? 'text-green-600' : 'text-destructive'}>
                          Não pode conter 3 ou mais números sequenciais e/ou repetidos
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {validacao.semLetrasRepetidas ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                        )}
                        <span className={validacao.semLetrasRepetidas ? 'text-green-600' : 'text-destructive'}>
                          Não pode conter 3 ou mais letras repetidas
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Terms */}
              {isInitialSetup && (
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="terms"
                    checked={formData.acceptTerms}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, acceptTerms: checked as boolean })
                    }
                  />
                  <label
                    htmlFor="terms"
                    className="text-sm text-muted-foreground leading-tight cursor-pointer"
                  >
                    Aceito os{" "}
                    <a href="#" className="text-primary hover:text-accent transition-colors">
                      Termos da LGPD
                    </a>{" "}
                    e{" "}
                    <a href="#" className="text-primary hover:text-accent transition-colors">
                      Politica de Privacidade
                    </a>
                  </label>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 bg-accent text-accent-foreground hover:bg-accent/90 font-semibold transition-smooth rounded-xl shadow-md hover:shadow-lg"
              disabled={(isInitialSetup && (!formData.acceptTerms || !senhaValida)) || loading}
            >
              {loading ? (isInitialSetup ? "Cadastrando..." : "Entrando...") : (isInitialSetup ? "Cadastrar" : "Entrar")}
            </Button>

            {/* Links */}
            <div className="space-y-3 text-center text-sm">
              {hasUsers ? (
                <>
                  <a
                    href="#"
                    className="block text-muted-foreground hover:text-accent transition-colors"
                  >
                    Esqueci minha senha
                  </a>
                  <div className="pt-4 border-t border-border">
                    <p className="text-muted-foreground">
                      Precisa de acesso? Fale com o administrador do sistema.
                    </p>
                  </div>
                </>
              ) : (
                <div className="pt-4 border-t border-border">
                  <p className="text-muted-foreground">
                    Vamos criar o primeiro acesso MASTER do sistema.
                  </p>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;

