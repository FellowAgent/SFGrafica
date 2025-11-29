import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, User, Edit, Plus, Trash } from "lucide-react";

interface AuditLog {
  id: string;
  acao: 'INSERT' | 'UPDATE' | 'DELETE';
  usuario_nome: string | null;
  timestamp: string;
  campos_alterados: string[] | null;
  dados_anteriores: any;
  dados_novos: any;
}

interface HistoricoAlteracoesProps {
  clienteId: string;
}

const traduzirCampo = (campo: string): string => {
  const traducoes: Record<string, string> = {
    nome: 'Nome',
    cpf_cnpj: 'CPF/CNPJ',
    email: 'E-mail',
    celular: 'Celular',
    telefone: 'Telefone',
    endereco: 'Endereço',
    numero: 'Número',
    complemento: 'Complemento',
    bairro: 'Bairro',
    cidade: 'Cidade',
    estado: 'Estado',
    cep: 'CEP',
    tipo: 'Tipo de Pessoa',
    ativo: 'Status',
    observacoes: 'Observações',
    avatar_url: 'Avatar',
  };
  return traducoes[campo] || campo;
};

const getAcaoIcon = (acao: string) => {
  switch (acao) {
    case 'INSERT':
      return <Plus className="h-4 w-4" />;
    case 'UPDATE':
      return <Edit className="h-4 w-4" />;
    case 'DELETE':
      return <Trash className="h-4 w-4" />;
    default:
      return <Edit className="h-4 w-4" />;
  }
};

const getAcaoBadgeVariant = (acao: string): "default" | "secondary" | "destructive" => {
  switch (acao) {
    case 'INSERT':
      return 'default';
    case 'UPDATE':
      return 'secondary';
    case 'DELETE':
      return 'destructive';
    default:
      return 'secondary';
  }
};

export function HistoricoAlteracoes({ clienteId }: HistoricoAlteracoesProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistorico();
  }, [clienteId]);

  const fetchHistorico = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('tabela', 'clientes')
        .eq('registro_id', clienteId)
        .order('timestamp', { ascending: false });

      if (error) throw error;

      setLogs(data || []);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico de Alterações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico de Alterações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma alteração registrada ainda
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Histórico de Alterações
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {logs.map((log) => (
              <div
                key={log.id}
                className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={getAcaoBadgeVariant(log.acao)} className="gap-1">
                      {getAcaoIcon(log.acao)}
                      {log.acao === 'INSERT' && 'Criado'}
                      {log.acao === 'UPDATE' && 'Editado'}
                      {log.acao === 'DELETE' && 'Excluído'}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(log.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {log.usuario_nome || 'Usuário desconhecido'}
                  </span>
                </div>

                {log.acao === 'UPDATE' && log.campos_alterados && log.campos_alterados.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Campos alterados:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {log.campos_alterados
                        .filter(campo => campo !== 'updated_at')
                        .map((campo) => (
                          <Badge key={campo} variant="outline" className="text-xs">
                            {traduzirCampo(campo)}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}