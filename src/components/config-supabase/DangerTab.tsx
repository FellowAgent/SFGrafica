import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/utils/toastHelper';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';

export function DangerTab() {
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showReduceDialog, setShowReduceDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [reduceConfirmText, setReduceConfirmText] = useState('');
  const [isClearing, setIsClearing] = useState(false);
  const [isReducing, setIsReducing] = useState(false);

  const limparTodosBancoDados = async () => {
    if (confirmText !== 'LIMPAR TUDO') {
      toast.error('Texto de confirmação incorreto');
      return;
    }

    setIsClearing(true);
    setShowClearDialog(false);

    try {
      const tabelas = [
        'itens_pedido',
        'pedidos_etiquetas',
        'comentarios_pedido',
        'pedidos',
        'variacoes_produto',
        'produtos_categorias',
        'produtos',
        'categorias',
        'clientes',
        'etiquetas',
        'asaas_cobrancas',
        'asaas_customers',
        'asaas_notas_fiscais',
        'asaas_webhook_logs',
        'audit_logs',
        'alert_history',
        'notificacoes',
      ];

      for (const tabela of tabelas) {
        const { error } = await (supabase as any).from(tabela).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) console.error(`Erro ao limpar ${tabela}:`, error);
      }

      toast.success('Todos os dados foram removidos!');
    } catch (err) {
      console.error('Erro ao limpar banco de dados:', err);
      toast.error('Erro ao limpar dados');
    } finally {
      setIsClearing(false);
      setConfirmText('');
    }
  };

  const reduzirDadosPara100 = async () => {
    if (reduceConfirmText !== 'REDUZIR PARA 100') {
      toast.error('Texto de confirmação incorreto');
      return;
    }

    setIsReducing(true);
    setShowReduceDialog(false);

    try {
      toast.info('Iniciando redução de dados...');

      // Passo 1: Identificar pedidos a manter (100 mais recentes)
      const { data: pedidosManter, error: errorPedidos } = await supabase
        .from('pedidos')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(100);

      if (errorPedidos) throw errorPedidos;

      const pedidosIds = pedidosManter?.map(p => p.id) || [];

      // Deletar dependências dos pedidos que NÃO serão mantidos
      await supabase.from('itens_pedido').delete().not('pedido_id', 'in', `(${pedidosIds.map(id => `'${id}'`).join(',')})`);
      await supabase.from('comentarios_pedido').delete().not('pedido_id', 'in', `(${pedidosIds.map(id => `'${id}'`).join(',')})`);
      await supabase.from('pedidos_etiquetas').delete().not('pedido_id', 'in', `(${pedidosIds.map(id => `'${id}'`).join(',')})`);
      await supabase.from('asaas_cobrancas').delete().not('pedido_id', 'in', `(${pedidosIds.map(id => `'${id}'`).join(',')})`);
      await supabase.from('asaas_notas_fiscais').delete().not('pedido_id', 'in', `(${pedidosIds.map(id => `'${id}'`).join(',')})`);

      // Deletar pedidos extras
      await supabase.from('pedidos').delete().not('id', 'in', `(${pedidosIds.map(id => `'${id}'`).join(',')})`);

      toast.info('Pedidos reduzidos para 100. Processando clientes...');

      // Passo 2: Identificar clientes a manter
      const { data: clientesEmUso } = await supabase
        .from('pedidos')
        .select('cliente_id')
        .not('cliente_id', 'is', null);

      const clientesUsadosIds = [...new Set(clientesEmUso?.map(p => p.cliente_id) || [])];
      const quantidadeClientesUsados = clientesUsadosIds.length;

      // Buscar clientes aleatórios para completar 100
      const { data: clientesAleatorios } = await supabase
        .from('clientes')
        .select('id')
        .not('id', 'in', `(${clientesUsadosIds.map(id => `'${id}'`).join(',')})`)
        .limit(Math.max(0, 100 - quantidadeClientesUsados));

      const clientesManterIds = [
        ...clientesUsadosIds,
        ...(clientesAleatorios?.map(c => c.id) || [])
      ];

      // Deletar asaas_customers primeiro
      await supabase.from('asaas_customers').delete().not('cliente_id', 'in', `(${clientesManterIds.map(id => `'${id}'`).join(',')})`);

      // Deletar clientes extras
      await supabase.from('clientes').delete().not('id', 'in', `(${clientesManterIds.map(id => `'${id}'`).join(',')})`);

      toast.info('Clientes reduzidos para 100. Processando produtos...');

      // Passo 3: Identificar produtos a manter
      const { data: produtosEmUso } = await supabase
        .from('itens_pedido')
        .select('produto_id')
        .not('produto_id', 'is', null);

      const produtosUsadosIds = [...new Set(produtosEmUso?.map(i => i.produto_id) || [])];
      const quantidadeProdutosUsados = produtosUsadosIds.length;

      // Buscar produtos aleatórios para completar 100
      const { data: produtosAleatorios } = await supabase
        .from('produtos')
        .select('id')
        .not('id', 'in', `(${produtosUsadosIds.map(id => `'${id}'`).join(',')})`)
        .limit(Math.max(0, 100 - quantidadeProdutosUsados));

      const produtosManterIds = [
        ...produtosUsadosIds,
        ...(produtosAleatorios?.map(p => p.id) || [])
      ];

      // Deletar dependências dos produtos
      await supabase.from('variacoes_produto').delete().not('produto_id', 'in', `(${produtosManterIds.map(id => `'${id}'`).join(',')})`);
      await supabase.from('produtos_categorias').delete().not('produto_id', 'in', `(${produtosManterIds.map(id => `'${id}'`).join(',')})`);

      // Deletar produtos extras
      await supabase.from('produtos').delete().not('id', 'in', `(${produtosManterIds.map(id => `'${id}'`).join(',')})`);

      // Verificar totais finais
      const { count: totalPedidos } = await supabase.from('pedidos').select('*', { count: 'exact', head: true });
      const { count: totalClientes } = await supabase.from('clientes').select('*', { count: 'exact', head: true });
      const { count: totalProdutos } = await supabase.from('produtos').select('*', { count: 'exact', head: true });

      toast.success(
        `Dados reduzidos com sucesso!\n` +
        `Pedidos: ${totalPedidos}\n` +
        `Clientes: ${totalClientes}\n` +
        `Produtos: ${totalProdutos}`,
        { duration: 5000 }
      );
    } catch (err) {
      console.error('Erro ao reduzir dados:', err);
      toast.error('Erro ao reduzir dados. Verifique o console para detalhes.');
    } finally {
      setIsReducing(false);
      setReduceConfirmText('');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader className="bg-red-50 dark:bg-red-950/20">
          <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
            Zona de Perigo
          </CardTitle>
          <CardDescription>
            Operações irreversíveis que podem causar perda de dados
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="p-4 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20">
            <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">
              Limpar Todos os Dados
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mb-4">
              Esta ação irá remover TODOS os dados de TODAS as tabelas do banco de dados.
              Esta operação NÃO pode ser desfeita!
            </p>
            <Button
              variant="destructive"
              onClick={() => setShowClearDialog(true)}
              disabled={isClearing}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              {isClearing ? 'Limpando...' : 'Limpar Todos os Dados'}
            </Button>
          </div>

          <div className="p-4 rounded-lg border border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20">
            <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">
              Reduzir para 100 Registros
            </h3>
            <p className="text-sm text-orange-700 dark:text-orange-300 mb-4">
              Esta ação irá reduzir os dados para apenas 100 pedidos, 100 clientes e 100 produtos.
              Os 100 pedidos mais recentes serão mantidos. Esta operação NÃO pode ser desfeita!
            </p>
            <Button
              variant="outline"
              className="border-orange-600 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/50"
              onClick={() => setShowReduceDialog(true)}
              disabled={isReducing}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              {isReducing ? 'Reduzindo...' : 'Reduzir para 100 Registros'}
            </Button>
          </div>

          <div className="p-4 rounded-lg border bg-muted/50">
            <p className="text-sm font-medium mb-2">⚠️ Antes de continuar:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Faça um backup completo dos dados</li>
              <li>Certifique-se de que esta é realmente a ação desejada</li>
              <li>Esta operação não pode ser desfeita</li>
              <li>Todos os usuários serão afetados</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 dark:text-red-400">
              ⚠️ ATENÇÃO: Operação Irreversível
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Você está prestes a <strong>REMOVER TODOS OS DADOS</strong> do banco de dados.
              </p>
              <p>
                Esta ação irá deletar permanentemente:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Todos os pedidos e itens</li>
                <li>Todos os clientes</li>
                <li>Todos os produtos e categorias</li>
                <li>Todas as cobranças e notas fiscais</li>
                <li>Todos os logs e históricos</li>
              </ul>
              <p className="font-semibold text-red-600 dark:text-red-400">
                Esta operação NÃO pode ser desfeita!
              </p>
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Digite <strong>LIMPAR TUDO</strong> para confirmar:
                </p>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="LIMPAR TUDO"
                  className="font-mono"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmText('')}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={limparTodosBancoDados}
              disabled={confirmText !== 'LIMPAR TUDO'}
              className="bg-red-600 hover:bg-red-700"
            >
              Limpar Tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showReduceDialog} onOpenChange={setShowReduceDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-orange-600 dark:text-orange-400">
              ⚠️ ATENÇÃO: Operação Irreversível
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Você está prestes a <strong>REDUZIR OS DADOS</strong> para apenas 100 registros de cada tipo.
              </p>
              <p>
                Esta ação irá:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Manter apenas os 100 pedidos mais recentes</li>
                <li>Reduzir clientes para 100 (priorizando os vinculados aos pedidos mantidos)</li>
                <li>Reduzir produtos para 100 (priorizando os vinculados aos pedidos mantidos)</li>
                <li>Deletar todos os registros relacionados aos itens removidos</li>
              </ul>
              <p className="font-semibold text-orange-600 dark:text-orange-400">
                Esta operação NÃO pode ser desfeita!
              </p>
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Digite <strong>REDUZIR PARA 100</strong> para confirmar:
                </p>
                <Input
                  value={reduceConfirmText}
                  onChange={(e) => setReduceConfirmText(e.target.value)}
                  placeholder="REDUZIR PARA 100"
                  className="font-mono"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setReduceConfirmText('')}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={reduzirDadosPara100}
              disabled={reduceConfirmText !== 'REDUZIR PARA 100'}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Reduzir Dados
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
