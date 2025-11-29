import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileCheck } from 'lucide-react';
import { toast } from '@/utils/toastHelper';
import { sqlAnalyzer, type ValidationResult } from '@/utils/sqlAnalyzer';
import { PreviewModal } from './PreviewModal';

export function ImportOption1() {
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [sqlContent, setSqlContent] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.sql')) {
      toast.error('Selecione um arquivo .sql válido');
      return;
    }

    setFile(selectedFile);
    setIsValidating(true);

    try {
      const content = await selectedFile.text();
      setSqlContent(content);

      // Analyze and validate
      const parsed = sqlAnalyzer.parseSQL(content);
      const validationResult = sqlAnalyzer.validateSQL(parsed);
      
      setValidation(validationResult);
      setShowPreview(true);

      if (validationResult.isValid) {
        toast.success('SQL validado com sucesso!', {
          description: `${validationResult.summary.totalOperations} operações detectadas`,
        });
      } else {
        toast.error('Erros encontrados no SQL', {
          description: `${validationResult.errors.length} erros críticos`,
        });
      }
    } catch (err) {
      console.error('Erro ao validar SQL:', err);
      toast.error('Erro ao ler arquivo');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <>
      <Card className="border-green-200 dark:border-green-900">
        <CardHeader className="bg-green-50 dark:bg-green-950/20">
          <CardTitle className="flex items-center gap-2">
            🛡️ Opção 1: Validação + Instruções
            <span className="text-xs font-normal px-2 py-1 rounded-full bg-green-600 text-white">
              Recomendada
            </span>
          </CardTitle>
          <CardDescription>
            Mais segura - Valida o SQL e fornece instruções para execução manual no Supabase
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="p-4 rounded-lg border bg-muted/50">
            <p className="text-sm font-medium mb-2">✅ Validações automáticas:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Sintaxe SQL</li>
              <li>Detecção de comandos perigosos</li>
              <li>Preview das mudanças</li>
              <li>Comparação com schema atual</li>
            </ul>
          </div>

          <div className="space-y-2">
            <label htmlFor="option1-file">
              <Button 
                disabled={isValidating}
                className="w-full"
                onClick={() => document.getElementById('option1-file')?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                {isValidating ? 'Validando...' : file ? file.name : 'Selecionar Arquivo .sql'}
              </Button>
            </label>
            <input
              id="option1-file"
              type="file"
              accept=".sql"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {validation && (
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <FileCheck className="h-5 w-5 text-green-500" />
                <span className="font-semibold">Arquivo validado</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {validation.summary.totalOperations} operações detectadas
              </p>
              <Button onClick={() => setShowPreview(true)} variant="outline" className="w-full">
                Ver Preview
              </Button>
            </div>
          )}

          <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950">
            <p className="text-sm font-medium mb-2 text-blue-900 dark:text-blue-100">
              💡 Como funciona:
            </p>
            <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
              <li>Upload do arquivo .sql</li>
              <li>Validação automática do SQL</li>
              <li>Preview das mudanças detectadas</li>
              <li>Copie SQL ou abra SQL Editor do Supabase</li>
              <li>Execute manualmente</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <PreviewModal
        open={showPreview}
        onOpenChange={setShowPreview}
        validation={validation}
        sqlContent={sqlContent}
      />
    </>
  );
}
