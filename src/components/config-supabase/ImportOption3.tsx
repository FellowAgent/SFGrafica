import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Play } from 'lucide-react';
import { toast } from '@/utils/toastHelper';
import { sqlAnalyzer, type ValidationResult } from '@/utils/sqlAnalyzer';
import { sqlExecutor } from '@/utils/sqlExecutor';
import { PreviewModal } from './PreviewModal';
import { Progress } from '@/components/ui/progress';

export function ImportOption3() {
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [sqlContent, setSqlContent] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.sql')) {
      toast.error('Selecione um arquivo .sql válido');
      return;
    }

    setFile(selectedFile);
    setIsValidating(true);
    setProgress(0);

    try {
      const content = await selectedFile.text();
      setSqlContent(content);

      const parsed = sqlAnalyzer.parseSQL(content);
      const validationResult = sqlAnalyzer.validateSQL(parsed);
      
      setValidation(validationResult);

      if (validationResult.isValid) {
        toast.success('SQL validado com sucesso!');
      } else {
        toast.error('Erros encontrados no SQL');
      }
    } catch (err) {
      console.error('Erro ao validar SQL:', err);
      toast.error('Erro ao ler arquivo');
    } finally {
      setIsValidating(false);
    }
  };

  const handleExecute = async () => {
    if (!validation) return;

    setIsExecuting(true);
    setProgress(0);

    try {
      const results = await sqlExecutor.executeSafeOperations(
        validation.operations.safe,
        (prog) => {
          setProgress((prog.current / prog.total) * 100);
        }
      );

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      if (failCount === 0) {
        toast.success('Migração concluída com sucesso!', {
          description: `${successCount} operações executadas`,
        });
      } else {
        toast.warning('Migração parcialmente concluída', {
          description: `${successCount} sucessos, ${failCount} falhas`,
        });
      }

      // Show preview with warnings/critical operations
      if (validation.operations.warnings.length > 0 || validation.operations.critical.length > 0) {
        setShowPreview(true);
        toast.info('Algumas operações requerem atenção manual');
      }
    } catch (err) {
      console.error('Erro ao executar migração:', err);
      toast.error('Erro durante execução');
    } finally {
      setIsExecuting(false);
      setProgress(0);
    }
  };

  return (
    <>
      <Card className="border-blue-200 dark:border-blue-900">
        <CardHeader className="bg-blue-50 dark:bg-blue-950/20">
          <CardTitle className="flex items-center gap-2">
            🔄 Opção 3: Execução Inteligente
            <span className="text-xs font-normal px-2 py-1 rounded-full bg-blue-600 text-white">
              Balanceada
            </span>
          </CardTitle>
          <CardDescription>
            Executa operações seguras automaticamente e solicita confirmação para operações perigosas
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="p-4 rounded-lg border bg-muted/50">
            <p className="text-sm font-medium mb-2">🔄 O sistema irá:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>✅ Executar automaticamente: CREATEs, ALTERs ADD</li>
              <li>⚠️ Solicitar confirmação: DROPs, DELETEs</li>
              <li>📋 Gerar instruções: Operações bloqueadas</li>
            </ul>
          </div>

          <div className="space-y-2">
            <label htmlFor="option3-file">
              <Button 
                disabled={isValidating || isExecuting}
                className="w-full"
                onClick={() => document.getElementById('option3-file')?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                {isValidating ? 'Validando...' : file ? file.name : 'Selecionar Arquivo .sql'}
              </Button>
            </label>
            <input
              id="option3-file"
              type="file"
              accept=".sql"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {validation && !isExecuting && (
            <div className="space-y-3">
              <div className="p-4 rounded-lg border bg-card">
                <p className="text-sm font-medium mb-2">Resumo da validação:</p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="text-center p-2 rounded bg-green-50 dark:bg-green-950/20">
                    <div className="font-semibold text-green-700 dark:text-green-300">
                      {validation.operations.safe.length}
                    </div>
                    <div className="text-xs text-muted-foreground">Seguras</div>
                  </div>
                  <div className="text-center p-2 rounded bg-yellow-50 dark:bg-yellow-950/20">
                    <div className="font-semibold text-yellow-700 dark:text-yellow-300">
                      {validation.operations.warnings.length}
                    </div>
                    <div className="text-xs text-muted-foreground">Avisos</div>
                  </div>
                  <div className="text-center p-2 rounded bg-red-50 dark:bg-red-950/20">
                    <div className="font-semibold text-red-700 dark:text-red-300">
                      {validation.operations.critical.length}
                    </div>
                    <div className="text-xs text-muted-foreground">Críticas</div>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleExecute}
                disabled={!validation.isValid || validation.operations.safe.length === 0}
                className="w-full"
              >
                <Play className="mr-2 h-4 w-4" />
                Iniciar Migração Inteligente
              </Button>
            </div>
          )}

          {isExecuting && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Executando migração...</p>
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground text-center">{Math.round(progress)}%</p>
            </div>
          )}

          <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950">
            <p className="text-sm font-medium mb-2 text-blue-900 dark:text-blue-100">
              💡 Vantagens:
            </p>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
              <li>Combina segurança com automação</li>
              <li>Executa operações seguras sem intervenção</li>
              <li>Confirma operações perigosas antes de executar</li>
              <li>Ideal para a maioria dos casos de uso</li>
            </ul>
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
