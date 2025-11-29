import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Shield } from 'lucide-react';
import { toast } from '@/utils/toastHelper';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { SchemaValidationResults } from './SchemaValidationResults';
import type { ValidationResult } from '@/types/schema-validation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

const EXPORT_COMPONENTS = {
  extensions: 'Extensões PostgreSQL',
  enums: 'Tipos Customizados (ENUMs)',
  sequences: 'Sequences',
  tables: 'Tabelas (estrutura)',
  constraints: 'Constraints',
  views: 'Views',
  functions: 'Funções do Banco',
  triggers: 'Triggers',
  indexes: 'Índices',
  rls_policies: 'Políticas RLS (Tabelas)',
  storage_policies: 'Políticas RLS (Storage)',
  storage_buckets: 'Configuração de Buckets',
  roles: 'Roles Customizadas',
  grants: 'GRANTs (Permissões)',
  default_privileges: 'Default Privileges',
  ownership: 'Ownership (Proprietários)',
  comments: 'Comments (Documentação)'
};

// Tabelas de configuração e dados mestres que podem ser exportadas
const DATA_EXPORT_TABLES = {
  etiquetas: 'Etiquetas',
  status_pedidos_config: 'Status de Pedidos',
  configuracoes: 'Configurações Gerais',
  alert_configs: 'Configurações de Alertas',
  categorias: 'Categorias de Produtos',
  asaas_configuracoes: 'Configurações Asaas'
};

export function ExportTab() {
  const [isExporting, setIsExporting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [selectedComponents, setSelectedComponents] = useState<string[]>(Object.keys(EXPORT_COMPONENTS));
  const [selectAll, setSelectAll] = useState(true);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [exportData, setExportData] = useState(false);
  const [selectedDataTables, setSelectedDataTables] = useState<string[]>([]);
  const [selectAllDataTables, setSelectAllDataTables] = useState(false);

  const toggleComponent = (component: string) => {
    setSelectedComponents(prev => 
      prev.includes(component)
        ? prev.filter(c => c !== component)
        : [...prev, component]
    );
    setSelectAll(false);
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedComponents([]);
    } else {
      setSelectedComponents(Object.keys(EXPORT_COMPONENTS));
    }
    setSelectAll(!selectAll);
  };

  const toggleDataTable = (table: string) => {
    setSelectedDataTables(prev => 
      prev.includes(table)
        ? prev.filter(t => t !== table)
        : [...prev, table]
    );
    setSelectAllDataTables(false);
  };

  const toggleSelectAllDataTables = () => {
    if (selectAllDataTables) {
      setSelectedDataTables([]);
    } else {
      setSelectedDataTables(Object.keys(DATA_EXPORT_TABLES));
    }
    setSelectAllDataTables(!selectAllDataTables);
  };

  const validarSchema = async () => {
    setIsValidating(true);
    setValidationResult(null);
    
    try {
      console.log('Validando schema...');
      
      const { data, error } = await supabase.functions.invoke('export-schema', {
        body: { 
          components: selectedComponents,
          validateOnly: true 
        }
      });

      if (error) {
        console.error('Erro na validação:', error);
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao validar schema');
      }

      setValidationResult(data.validation);

      if (data.validation.isValid) {
        toast.success('Validação concluída!', {
          description: 'Nenhum problema crítico foi detectado no schema.'
        });
      } else {
        toast.warning('Problemas detectados', {
          description: `${data.validation.summary.errors} erro(s), ${data.validation.summary.warnings} aviso(s)`
        });
      }
    } catch (err) {
      console.error('Erro ao validar schema:', err);
      toast.error('Erro ao validar schema', {
        description: err instanceof Error ? err.message : 'Erro desconhecido'
      });
    } finally {
      setIsValidating(false);
    }
  };

  const exportarSchema = async () => {
    if (selectedComponents.length === 0) {
      toast.error('Selecione pelo menos um componente para exportar');
      return;
    }

    setIsExporting(true);
    
    try {
      console.log('Solicitando exportação seletiva de schema...', selectedComponents);
      
      // Chamar a edge function com os componentes selecionados
      const { data, error } = await supabase.functions.invoke('export-schema', {
        body: { 
          components: selectedComponents,
          exportData,
          dataTableNames: selectedDataTables
        }
      });

      if (error) {
        console.error('Erro na Edge Function:', error);
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao gerar schema');
      }

      console.log('Schema gerado:', data.metadata);

      // Salvar resultado da validação se ainda não tiver
      if (data.validation && !validationResult) {
        setValidationResult(data.validation);
      }

      // Fazer download do SQL gerado
      const blob = new Blob([data.sql], { type: 'text/plain; charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `schema_seletivo_${new Date().toISOString().split('T')[0]}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Schema exportado com sucesso!', {
        description: data.metadata.data_tables_count > 0 
          ? `${data.metadata.tables_count} tabelas, ${data.metadata.data_tables_count} tabelas com dados (${data.metadata.total_records} registros)`
          : `${data.metadata.tables_count} tabelas, ${data.metadata.functions_count} funções, ${data.metadata.policies_count} políticas`
      });
    } catch (err) {
      console.error('Erro ao exportar schema:', err);
      toast.error('Erro ao exportar schema', {
        description: err instanceof Error ? err.message : 'Erro desconhecido'
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Exportar Schema (Estrutura do Banco)
          </CardTitle>
          <CardDescription>
            Exportação seletiva do schema - escolha quais componentes incluir no arquivo SQL
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Seleção de Componentes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Componentes para Exportar</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
              >
                {selectAll ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-lg border bg-muted/50">
              {Object.entries(EXPORT_COMPONENTS).map(([key, label]) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={key}
                    checked={selectedComponents.includes(key)}
                    onCheckedChange={() => toggleComponent(key)}
                  />
                  <Label
                    htmlFor={key}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {label}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedComponents.length} de {Object.keys(EXPORT_COMPONENTS).length} componentes selecionados
            </p>
          </div>

          {/* Data Export Section */}
          <div className="space-y-3 p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="export-data"
                  checked={exportData}
                  onCheckedChange={(checked) => setExportData(checked as boolean)}
                />
                <Label htmlFor="export-data" className="text-sm font-medium cursor-pointer">
                  Exportar dados das tabelas selecionadas
                </Label>
              </div>
              {exportData && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAllDataTables}
                >
                  {selectAllDataTables ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </Button>
              )}
            </div>

            {exportData && (
              <>
                <Alert className="bg-blue-100 dark:bg-blue-900/30 border-blue-300">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-900 dark:text-blue-100">
                    Backup de Dados
                  </AlertTitle>
                  <AlertDescription className="text-blue-700 dark:text-blue-300">
                    Selecione as tabelas de configuração e dados mestres para incluir no backup.
                    Os dados serão exportados como SQL INSERT statements.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-lg border bg-background">
                  {Object.entries(DATA_EXPORT_TABLES).map(([key, label]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`data-${key}`}
                        checked={selectedDataTables.includes(key)}
                        onCheckedChange={() => toggleDataTable(key)}
                      />
                      <Label
                        htmlFor={`data-${key}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {label}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedDataTables.length} de {Object.keys(DATA_EXPORT_TABLES).length} tabelas selecionadas para backup de dados
                </p>
              </>
            )}
          </div>

          {/* Validation Results */}
          {validationResult && (
            <SchemaValidationResults 
              validation={validationResult}
              onClose={() => setValidationResult(null)}
            />
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={validarSchema} 
              disabled={isValidating || selectedComponents.length === 0}
              variant="outline"
            >
              <Shield className="mr-2 h-4 w-4" />
              {isValidating ? 'Validando...' : 'Validar Schema'}
            </Button>

            <Button 
              onClick={exportarSchema} 
              disabled={isExporting || selectedComponents.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? 'Exportando...' : 'Exportar Schema'}
            </Button>
          </div>

          <div className="p-4 rounded-lg border bg-muted/50">
            <p className="text-sm font-medium mb-2">📋 Componentes Disponíveis:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li><strong>Extensões PostgreSQL:</strong> uuid-ossp, pg_trgm, etc.</li>
              <li><strong>Tipos Customizados:</strong> ENUMs e tipos personalizados</li>
              <li><strong>Sequences:</strong> Geradores de números sequenciais</li>
              <li><strong>Tabelas:</strong> Estrutura completa com colunas e tipos</li>
              <li><strong>Constraints:</strong> PRIMARY KEY, FOREIGN KEY, CHECK, UNIQUE</li>
              <li><strong>Views:</strong> Views e Materialized Views</li>
              <li><strong>Funções:</strong> Funções do PostgreSQL/PL-pgSQL</li>
              <li><strong>Triggers:</strong> Gatilhos automáticos</li>
              <li><strong>Índices:</strong> Índices para otimização de performance</li>
              <li><strong>Políticas RLS (Tabelas):</strong> Row Level Security das tabelas públicas</li>
              <li><strong>Políticas RLS (Storage):</strong> Segurança do storage.objects</li>
              <li><strong>Storage Buckets:</strong> Instruções para configurar buckets</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950">
            <p className="text-sm font-medium mb-2 text-blue-900 dark:text-blue-100">
              💡 Dicas de Exportação:
            </p>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li><strong>Schema seletivo:</strong> Escolha apenas os componentes necessários para criar schemas parciais.</li>
              <li><strong>Backup completo:</strong> Selecione todos os componentes + dados para backup total do sistema.</li>
              <li><strong>Validação:</strong> Use "Validar Schema" antes de exportar para detectar problemas.</li>
              <li><strong>Dados mestres:</strong> Exporte dados de configurações para migrar settings entre ambientes.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
