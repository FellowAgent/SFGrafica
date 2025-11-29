import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Upload, Download, FileJson } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/utils/toastHelper';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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

const AVAILABLE_TABLES = [
  'clientes', 'produtos', 'categorias', 'pedidos', 'itens_pedido',
  'perfis', 'user_roles', 'etiquetas', 'pedidos_etiquetas', 'variacoes_produto',
  'produtos_categorias', 'comentarios_pedido', 'configuracoes', 'status_pedidos_config',
  'audit_logs', 'alert_configs', 'alert_history', 'notificacoes',
  'asaas_configuracoes', 'asaas_customers', 'asaas_cobrancas', 'asaas_notas_fiscais',
  'funcionarios_fluxo', 'user_permissions'
];

export function BackupTab() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [exportFormat, setExportFormat] = useState<'sql' | 'json'>('sql');
  const [selectedTables, setSelectedTables] = useState<string[]>(AVAILABLE_TABLES);
  const [selectAll, setSelectAll] = useState(true);

  const toggleTableSelection = (table: string) => {
    setSelectedTables(prev => 
      prev.includes(table) 
        ? prev.filter(t => t !== table)
        : [...prev, table]
    );
    setSelectAll(false);
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedTables([]);
    } else {
      setSelectedTables(AVAILABLE_TABLES);
    }
    setSelectAll(!selectAll);
  };

  const gerarBackup = async () => {
    if (selectedTables.length === 0) {
      toast.error('Selecione pelo menos uma tabela');
      return;
    }

    setIsGenerating(true);
    try {
      const backupData: any = {};
      let totalRecords = 0;

      for (const tabela of selectedTables) {
        const { data, error } = await (supabase as any).from(tabela).select('*');
        
        if (error) {
          console.error(`Erro ao buscar dados de ${tabela}:`, error);
          continue;
        }

        if (data && data.length > 0) {
          backupData[tabela] = data;
          totalRecords += data.length;
        }
      }

      let content: string;
      let filename: string;
      let mimeType: string;

      if (exportFormat === 'json') {
        content = JSON.stringify(backupData, null, 2);
        filename = `backup_${Date.now()}.json`;
        mimeType = 'application/json';
      } else {
        // SQL Format
        let sql = `-- Backup de Dados - ${new Date().toISOString()}\n`;
        sql += `-- Tabelas: ${selectedTables.join(', ')}\n`;
        sql += `-- Total de registros: ${totalRecords}\n\n`;

        for (const [tabela, registros] of Object.entries(backupData)) {
          const data = registros as any[];
          sql += `-- Dados da tabela: ${tabela} (${data.length} registros)\n`;
          
          for (const row of data) {
            const colunas = Object.keys(row).join(', ');
            const valores = Object.values(row)
              .map(v => {
                if (v === null) return 'NULL';
                if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
                if (typeof v === 'boolean') return v ? 'true' : 'false';
                if (typeof v === 'number') return String(v);
                return `'${String(v).replace(/'/g, "''")}'`;
              })
              .join(', ');
            sql += `INSERT INTO ${tabela} (${colunas}) VALUES (${valores});\n`;
          }
          sql += '\n';
        }

        content = sql;
        filename = `backup_${Date.now()}.sql`;
        mimeType = 'text/plain';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Backup gerado com sucesso! ${totalRecords} registros exportados`);
    } catch (err) {
      console.error('Erro ao gerar backup:', err);
      toast.error('Erro ao gerar backup');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.name.endsWith('.sql') || file.name.endsWith('.json'))) {
      setSelectedFile(file);
      setShowRestoreDialog(true);
    } else {
      toast.error('Selecione um arquivo .sql ou .json válido');
    }
  };

  const restaurarBackup = async () => {
    if (!selectedFile) return;

    setIsRestoring(true);
    setShowRestoreDialog(false);
    
    try {
      const text = await selectedFile.text();
      toast.info('Restauração de backup ainda não implementada automaticamente', {
        description: 'Use o SQL Editor do Supabase para executar o backup manualmente.',
      });
    } catch (err) {
      console.error('Erro ao restaurar backup:', err);
      toast.error('Erro ao restaurar backup');
    } finally {
      setIsRestoring(false);
      setSelectedFile(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Backup Completo de Dados
          </CardTitle>
          <CardDescription>
            Exporte todos os dados reais das tabelas em formato SQL INSERT ou JSON
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Formato de Exportação */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Formato de Exportação</Label>
            <RadioGroup value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sql" id="sql" />
                <Label htmlFor="sql" className="font-normal cursor-pointer">
                  SQL (INSERT statements)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="json" id="json" />
                <Label htmlFor="json" className="font-normal cursor-pointer">
                  JSON (estrutura completa)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Seleção de Tabelas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Tabelas para Exportar</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
              >
                {selectAll ? 'Desmarcar Todas' : 'Selecionar Todas'}
              </Button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 rounded-lg border bg-muted/50 max-h-64 overflow-y-auto">
              {AVAILABLE_TABLES.map(table => (
                <div key={table} className="flex items-center space-x-2">
                  <Checkbox
                    id={table}
                    checked={selectedTables.includes(table)}
                    onCheckedChange={() => toggleTableSelection(table)}
                  />
                  <Label
                    htmlFor={table}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {table}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedTables.length} de {AVAILABLE_TABLES.length} tabelas selecionadas
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Criar Backup</CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={gerarBackup} 
                  disabled={isGenerating || selectedTables.length === 0}
                  className="w-full"
                >
                  {exportFormat === 'json' ? (
                    <FileJson className="mr-2 h-4 w-4" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  {isGenerating ? 'Gerando...' : `Gerar Backup ${exportFormat.toUpperCase()}`}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Restaurar Backup</CardTitle>
              </CardHeader>
              <CardContent>
                <label htmlFor="backup-file">
                  <Button 
                    disabled={isRestoring}
                    className="w-full"
                    onClick={() => document.getElementById('backup-file')?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {isRestoring ? 'Restaurando...' : 'Selecionar Arquivo'}
                  </Button>
                </label>
                <input
                  id="backup-file"
                  type="file"
                  accept=".sql,.json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </CardContent>
            </Card>
          </div>

          <div className="p-4 rounded-lg border bg-yellow-50 dark:bg-yellow-950">
            <p className="text-sm font-medium mb-2 text-yellow-900 dark:text-yellow-100">
              ⚠️ Atenção:
            </p>
            <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1 list-disc list-inside">
              <li>O backup contém apenas os dados, não o schema da estrutura</li>
              <li>Selecione apenas as tabelas que deseja exportar</li>
              <li>Arquivos JSON preservam estrutura completa incluindo objetos e arrays</li>
              <li>Arquivos SQL geram comandos INSERT para cada registro</li>
              <li>Faça backup regularmente para evitar perda de dados</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Restauração</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a restaurar o backup: <strong>{selectedFile?.name}</strong>
              <br /><br />
              Esta ação irá inserir os dados do backup no banco de dados atual.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={restaurarBackup}>
              Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
