import { AlertTriangle, CheckCircle2, XCircle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ValidationResult, ValidationIssue } from '@/types/schema-validation';

interface SchemaValidationResultsProps {
  validation: ValidationResult;
  onClose: () => void;
}

export function SchemaValidationResults({ validation, onClose }: SchemaValidationResultsProps) {
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getSeverityBadgeVariant = (severity: string): "default" | "destructive" | "secondary" => {
    switch (severity) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'info':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const groupedIssues = validation.issues.reduce((acc, issue) => {
    if (!acc[issue.category]) {
      acc[issue.category] = [];
    }
    acc[issue.category].push(issue);
    return acc;
  }, {} as Record<string, ValidationIssue[]>);

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {validation.isValid ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          )}
          Resultado da Validação do Schema
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 rounded-lg border bg-red-50 dark:bg-red-950/20">
            <p className="text-xs text-muted-foreground">Erros Críticos</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {validation.summary.errors}
            </p>
          </div>
          <div className="p-3 rounded-lg border bg-yellow-50 dark:bg-yellow-950/20">
            <p className="text-xs text-muted-foreground">Avisos</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {validation.summary.warnings}
            </p>
          </div>
          <div className="p-3 rounded-lg border bg-blue-50 dark:bg-blue-950/20">
            <p className="text-xs text-muted-foreground">Informações</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {validation.summary.infos}
            </p>
          </div>
        </div>

        {/* Overall Status */}
        {validation.isValid ? (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-900 dark:text-green-100">
              Schema Válido
            </AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300">
              Nenhum problema crítico foi detectado. O schema pode ser exportado com segurança.
              {validation.summary.warnings > 0 && (
                <span className="block mt-2">
                  Existem {validation.summary.warnings} aviso(s) que você pode querer revisar.
                </span>
              )}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Problemas Detectados</AlertTitle>
            <AlertDescription>
              Foram encontrados {validation.summary.errors} erro(s) crítico(s) que podem causar
              problemas na importação do schema. Recomendamos corrigir esses problemas antes de exportar.
            </AlertDescription>
          </Alert>
        )}

        {/* Issues by Category */}
        {validation.issues.length > 0 && (
          <ScrollArea className="h-[400px] rounded-md border p-4">
            <div className="space-y-4">
              {Object.entries(groupedIssues).map(([category, issues]) => (
                <div key={category} className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Badge variant="outline">{category}</Badge>
                    <span className="text-muted-foreground">({issues.length})</span>
                  </h4>
                  <div className="space-y-2 ml-2">
                    {issues.map((issue, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg border bg-muted/50 space-y-2"
                      >
                        <div className="flex items-start gap-2">
                          {getSeverityIcon(issue.severity)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={getSeverityBadgeVariant(issue.severity)} className="text-xs">
                                {issue.severity.toUpperCase()}
                              </Badge>
                              <p className="text-sm font-medium">{issue.message}</p>
                            </div>
                            {issue.details && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {issue.details}
                              </p>
                            )}
                            {issue.affectedObjects && issue.affectedObjects.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-muted-foreground">
                                  Objetos Afetados:
                                </p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {issue.affectedObjects.map((obj, objIdx) => (
                                    <Badge key={objIdx} variant="secondary" className="text-xs">
                                      {obj}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
