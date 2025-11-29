import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail, RefreshCw, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase';
import { toast } from '@/utils/toastHelper';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UsuarioEmailPendente {
  id: string;
  email: string;
  nome: string;
  avatar_url?: string;
  email_confirmed_at: string | null;
  created_at: string;
  last_sign_in_at: string | null;
}

export function EmailsPendentesTab() {
  const [usuarios, setUsuarios] = useState<UsuarioEmailPendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [enviandoEmail, setEnviandoEmail] = useState<string | null>(null);

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const carregarUsuarios = async () => {
    try {
      setLoading(true);

      // Buscar todos os perfis
      const { data: perfis, error: perfisError } = await supabase
        .from('perfis')
        .select('id, nome, email, avatar_url')
        .order('nome');

      if (perfisError) throw perfisError;

      // Buscar informações de auth para cada usuário
      const usuariosComStatus: UsuarioEmailPendente[] = [];

      for (const perfil of perfis || []) {
        // Usar função invoke para buscar dados do auth.users
        const { data: authData, error: authError } = await supabase.auth.admin.getUserById(perfil.id);

        if (!authError && authData) {
          usuariosComStatus.push({
            id: perfil.id,
            email: perfil.email || authData.user.email || '',
            nome: perfil.nome,
            avatar_url: perfil.avatar_url,
            email_confirmed_at: authData.user.email_confirmed_at || null,
            created_at: authData.user.created_at,
            last_sign_in_at: authData.user.last_sign_in_at || null,
          });
        }
      }

      setUsuarios(usuariosComStatus);
    } catch (error: any) {
      console.error('Erro ao carregar usuários:', error);
      toast.error('Erro ao carregar lista de usuários');
    } finally {
      setLoading(false);
    }
  };

  const reenviarEmailConfirmacao = async (email: string, userId: string) => {
    try {
      setEnviandoEmail(userId);

      // Usar edge function ou método direto do Supabase
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) throw error;

      toast.success(`Email de confirmação reenviado para ${email}`);
    } catch (error: any) {
      console.error('Erro ao reenviar email:', error);
      toast.error('Erro ao reenviar email de confirmação');
    } finally {
      setEnviandoEmail(null);
    }
  };

  const usuariosPendentes = usuarios.filter(u => !u.email_confirmed_at);
  const usuariosConfirmados = usuarios.filter(u => u.email_confirmed_at);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              Emails Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{usuariosPendentes.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Aguardando confirmação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Emails Confirmados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{usuariosConfirmados.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Email verificado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-500" />
              Total de Usuários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{usuarios.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Cadastrados no sistema
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Emails Pendentes */}
      {usuariosPendentes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Usuários com Email Pendente de Confirmação
            </CardTitle>
            <CardDescription>
              Estes usuários precisam confirmar seus emails antes de fazer login
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {usuariosPendentes.map((usuario) => (
                <div
                  key={usuario.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={usuario.avatar_url} />
                      <AvatarFallback>
                        {usuario.nome
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{usuario.nome}</p>
                        <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                          <Clock className="h-3 w-3 mr-1" />
                          Pendente
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{usuario.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Cadastrado em {format(new Date(usuario.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => reenviarEmailConfirmacao(usuario.email, usuario.id)}
                    disabled={enviandoEmail === usuario.id}
                  >
                    {enviandoEmail === usuario.id ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Reenviar Email
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Emails Confirmados */}
      {usuariosConfirmados.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Usuários com Email Confirmado
            </CardTitle>
            <CardDescription>
              Estes usuários podem fazer login normalmente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {usuariosConfirmados.map((usuario) => (
                <div
                  key={usuario.id}
                  className="flex items-center gap-4 p-3 border rounded-lg bg-card"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={usuario.avatar_url} />
                    <AvatarFallback>
                      {usuario.nome
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{usuario.nome}</p>
                      <Badge variant="outline" className="border-green-500 text-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Confirmado
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{usuario.email}</p>
                    {usuario.email_confirmed_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Confirmado em {format(new Date(usuario.email_confirmed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {usuarios.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum usuário encontrado</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
