import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, Check } from 'lucide-react';

interface SchemaComparison {
  added: string[];
  removed: string[];
  modified: string[];
  identical: string[];
}

interface ComparisonTableProps {
  comparison: SchemaComparison;
}

export function SchemaComparisonResults({ comparison }: ComparisonTableProps) {
  const totalDifferences = comparison.added.length + comparison.removed.length + comparison.modified.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Resultados da Comparação</span>
          <Badge variant={totalDifferences > 0 ? 'destructive' : 'default'}>
            {totalDifferences > 0 ? `${totalDifferences} Diferenças` : 'Schemas Idênticos'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tabelas Adicionadas */}
        {comparison.added.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium flex items-center gap-2 text-green-700 dark:text-green-400">
              <Plus className="h-4 w-4" />
              Tabelas Adicionadas ({comparison.added.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 rounded-lg border bg-green-50 dark:bg-green-950/20">
              {comparison.added.map(table => (
                <Badge key={table} variant="outline" className="justify-start border-green-600 text-green-700 dark:text-green-400">
                  + {table}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Tabelas Removidas */}
        {comparison.removed.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium flex items-center gap-2 text-red-700 dark:text-red-400">
              <Minus className="h-4 w-4" />
              Tabelas Removidas ({comparison.removed.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 rounded-lg border bg-red-50 dark:bg-red-950/20">
              {comparison.removed.map(table => (
                <Badge key={table} variant="outline" className="justify-start border-red-600 text-red-700 dark:text-red-400">
                  - {table}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Tabelas Modificadas */}
        {comparison.modified.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
              Tabelas Modificadas ({comparison.modified.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 rounded-lg border bg-yellow-50 dark:bg-yellow-950/20">
              {comparison.modified.map(table => (
                <Badge key={table} variant="outline" className="justify-start border-yellow-600 text-yellow-700 dark:text-yellow-400">
                  ~ {table}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Tabelas Idênticas */}
        {comparison.identical.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Check className="h-4 w-4" />
              Tabelas Idênticas ({comparison.identical.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 rounded-lg border bg-muted/50 max-h-40 overflow-y-auto">
              {comparison.identical.map(table => (
                <Badge key={table} variant="outline" className="justify-start">
                  {table}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Resumo */}
        <div className="p-4 rounded-lg border bg-muted/50">
          <p className="text-sm font-medium mb-2">📊 Resumo da Comparação:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>✅ Tabelas idênticas: <strong>{comparison.identical.length}</strong></li>
            <li className="text-green-700 dark:text-green-400">➕ Tabelas adicionadas: <strong>{comparison.added.length}</strong></li>
            <li className="text-red-700 dark:text-red-400">➖ Tabelas removidas: <strong>{comparison.removed.length}</strong></li>
            <li className="text-yellow-700 dark:text-yellow-400">🔄 Tabelas modificadas: <strong>{comparison.modified.length}</strong></li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
