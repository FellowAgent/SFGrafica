import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GitCompare, Upload, AlertCircle } from 'lucide-react';
import { toast } from '@/utils/toastHelper';
import { supabase } from '@/integrations/supabase/client';
import { SchemaComparisonResults } from './SchemaComparisonResults';

interface SchemaComparison {
  added: string[];
  removed: string[];
  modified: string[];
  identical: string[];
}

export function SchemaComparator() {
  const [isComparing, setIsComparing] = useState(false);
  const [currentSchema, setCurrentSchema] = useState<string>('');
  const [uploadedSchema, setUploadedSchema] = useState<string>('');
  const [comparison, setComparison] = useState<SchemaComparison | null>(null);

  const loadCurrentSchema = async () => {
    setIsComparing(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-schema');

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao carregar schema atual');

      setCurrentSchema(data.sql);
      toast.success('Schema atual carregado');
    } catch (err) {
      console.error('Erro ao carregar schema:', err);
      toast.error('Erro ao carregar schema atual');
    } finally {
      setIsComparing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.sql')) {
      toast.error('Selecione um arquivo .sql válido');
      return;
    }

    try {
      const text = await file.text();
      setUploadedSchema(text);
      toast.success(`Arquivo ${file.name} carregado`);
    } catch (err) {
      console.error('Erro ao ler arquivo:', err);
      toast.error('Erro ao ler arquivo');
    }
  };

  const compareSchemas = () => {
    if (!currentSchema || !uploadedSchema) {
      toast.error('Carregue ambos os schemas antes de comparar');
      return;
    }

    setIsComparing(true);

    try {
      // Extrair tabelas do schema atual
      const currentTables = extractTables(currentSchema);
      const uploadedTables = extractTables(uploadedSchema);

      const added = uploadedTables.filter(t => !currentTables.includes(t));
      const removed = currentTables.filter(t => !uploadedTables.includes(t));
      const identical = currentTables.filter(t => uploadedTables.includes(t));
      
      // Para simplificar, vamos considerar "modified" como tabelas que existem em ambos
      // mas podem ter diferenças de estrutura (análise completa requereria parsing SQL)
      const modified: string[] = [];

      setComparison({ added, removed, modified, identical });
      
      toast.success('Comparação concluída', {
        description: `${added.length} adições, ${removed.length} remoções`
      });
    } catch (err) {
      console.error('Erro ao comparar schemas:', err);
      toast.error('Erro ao comparar schemas');
    } finally {
      setIsComparing(false);
    }
  };

  const extractTables = (sql: string): string[] => {
    const tableRegex = /CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?([a-zA-Z_][a-zA-Z0-9_]*)/gi;
    const matches = sql.matchAll(tableRegex);
    return Array.from(matches, m => m[1]);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Comparador de Schemas
          </CardTitle>
          <CardDescription>
            Compare o schema atual do banco com outro arquivo SQL para detectar diferenças
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Carregar Schemas */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Schema Atual (Banco)</CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={loadCurrentSchema} 
                  disabled={isComparing}
                  className="w-full"
                  variant={currentSchema ? 'outline' : 'default'}
                >
                  {currentSchema ? '✓ Carregado' : 'Carregar Schema Atual'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Schema para Comparar</CardTitle>
              </CardHeader>
              <CardContent>
                <label htmlFor="schema-file">
                  <Button 
                    className="w-full"
                    variant={uploadedSchema ? 'outline' : 'default'}
                    onClick={() => document.getElementById('schema-file')?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {uploadedSchema ? '✓ Arquivo Carregado' : 'Selecionar Arquivo SQL'}
                  </Button>
                </label>
                <input
                  id="schema-file"
                  type="file"
                  accept=".sql"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </CardContent>
            </Card>
          </div>

          {/* Botão Comparar */}
          <Button 
            onClick={compareSchemas}
            disabled={!currentSchema || !uploadedSchema || isComparing}
            className="w-full"
            size="lg"
          >
            <GitCompare className="mr-2 h-4 w-4" />
            {isComparing ? 'Comparando...' : 'Comparar Schemas'}
          </Button>

          {/* Avisos */}
          <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950">
            <p className="text-sm font-medium mb-2 text-blue-900 dark:text-blue-100 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Como usar:
            </p>
            <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
              <li>Clique em "Carregar Schema Atual" para obter o schema do banco em produção</li>
              <li>Faça upload de um arquivo .sql de outro ambiente (ex: local, staging)</li>
              <li>Clique em "Comparar Schemas" para ver as diferenças</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Resultados da Comparação */}
      {comparison && (
        <SchemaComparisonResults comparison={comparison} />
      )}
    </div>
  );
}
