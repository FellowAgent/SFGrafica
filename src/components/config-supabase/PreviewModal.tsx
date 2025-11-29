import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, ExternalLink, Download, ChevronRight } from 'lucide-react';
import { toast } from '@/utils/toastHelper';
import type { ValidationResult } from '@/utils/sqlAnalyzer';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';

interface PreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  validation: ValidationResult | null;
  sqlContent: string;
}

export function PreviewModal({ open, onOpenChange, validation, sqlContent }: PreviewModalProps) {
  const [showSafe, setShowSafe] = useState(false);
  const [showWarnings, setShowWarnings] = useState(true);
  const [showCritical, setShowCritical] = useState(true);

  if (!validation) return null;

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  const copySql = () => {
    navigator.clipboard.writeText(sqlContent);
    toast.success('SQL copiado para área de transferência!');
  };

  const openSqlEditor = () => {
    if (projectId) {
      window.open(`https://supabase.com/dashboard/project/${projectId}/sql/new`, '_blank');
      toast.info('SQL Editor aberto em nova aba');
    } else {
      toast.error('Project ID não configurado');
    }
  };

  const downloadSql = () => {
    const blob = new Blob([sqlContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `validated_schema_${Date.now()}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('SQL baixado com sucesso!');
  };

  const getDangerBadge = () => {
    if (validation.dangerLevel === 'safe') {
      return <Badge className="bg-green-100 text-green-800 border-green-300">🟢 SEGURO</Badge>;
    } else if (validation.dangerLevel === 'medium') {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">🟡 ATENÇÃO</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800 border-red-300">🔴 PERIGO</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>🔍 Preview das Mudanças</DialogTitle>
          <DialogDescription>
            Análise detalhada das operações SQL que serão executadas
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {/* Summary */}
            <div className="p-4 rounded-lg border bg-card">
              <h3 className="font-semibold mb-3 flex items-center justify-between">
                📊 Resumo
                {getDangerBadge()}
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Total de operações:</span>
                  <span className="ml-2 font-semibold">{validation.summary.totalOperations}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Operações destrutivas:</span>
                  <span className="ml-2 font-semibold">{validation.summary.destructiveOperations}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Tabelas afetadas:</span>
                  <span className="ml-2 font-semibold">{validation.summary.affectedTables.length}</span>
                  {validation.summary.affectedTables.length > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({validation.summary.affectedTables.join(', ')})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Errors */}
            {validation.errors.length > 0 && (
              <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20">
                <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                  ❌ ERROS CRÍTICOS ({validation.errors.length})
                </h3>
                <ul className="space-y-1 text-sm text-red-700 dark:text-red-300">
                  {validation.errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Safe Operations */}
            {validation.operations.safe.length > 0 && (
              <Collapsible open={showSafe} onOpenChange={setShowSafe}>
                <div className="p-4 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20">
                  <CollapsibleTrigger className="w-full">
                    <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center justify-between">
                      <span>✅ OPERAÇÕES SEGURAS ({validation.operations.safe.length})</span>
                      <ChevronRight className={`h-4 w-4 transition-transform ${showSafe ? 'rotate-90' : ''}`} />
                    </h3>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ul className="space-y-1 text-sm text-green-700 dark:text-green-300 mt-2">
                      {validation.operations.safe.slice(0, 10).map((op, idx) => (
                        <li key={idx} className="font-mono text-xs">
                          • {op.type}: {op.tableName || op.content.substring(0, 60)}...
                        </li>
                      ))}
                      {validation.operations.safe.length > 10 && (
                        <li className="text-xs italic">... e mais {validation.operations.safe.length - 10} operações</li>
                      )}
                    </ul>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )}

            {/* Warnings */}
            {validation.operations.warnings.length > 0 && (
              <Collapsible open={showWarnings} onOpenChange={setShowWarnings}>
                <div className="p-4 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
                  <CollapsibleTrigger className="w-full">
                    <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2 flex items-center justify-between">
                      <span>⚠️ OPERAÇÕES QUE REQUEREM ATENÇÃO ({validation.operations.warnings.length})</span>
                      <ChevronRight className={`h-4 w-4 transition-transform ${showWarnings ? 'rotate-90' : ''}`} />
                    </h3>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ul className="space-y-1 text-sm text-yellow-700 dark:text-yellow-300 mt-2">
                      {validation.operations.warnings.map((op, idx) => (
                        <li key={idx} className="font-mono text-xs">
                          • {op.type}: {op.tableName || op.content.substring(0, 60)}...
                        </li>
                      ))}
                    </ul>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )}

            {/* Critical */}
            {validation.operations.critical.length > 0 && (
              <Collapsible open={showCritical} onOpenChange={setShowCritical}>
                <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20">
                  <CollapsibleTrigger className="w-full">
                    <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2 flex items-center justify-between">
                      <span>❌ OPERAÇÕES BLOQUEADAS ({validation.operations.critical.length})</span>
                      <ChevronRight className={`h-4 w-4 transition-transform ${showCritical ? 'rotate-90' : ''}`} />
                    </h3>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ul className="space-y-1 text-sm text-red-700 dark:text-red-300 mt-2">
                      {validation.operations.critical.map((op, idx) => (
                        <li key={idx} className="font-mono text-xs">
                          • {op.type}: {op.content.substring(0, 60)}...
                        </li>
                      ))}
                    </ul>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={copySql} variant="outline" className="flex-1">
            <Copy className="mr-2 h-4 w-4" />
            Copiar SQL
          </Button>
          <Button onClick={openSqlEditor} variant="outline" className="flex-1">
            <ExternalLink className="mr-2 h-4 w-4" />
            Abrir SQL Editor
          </Button>
          <Button onClick={downloadSql} className="flex-1">
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
