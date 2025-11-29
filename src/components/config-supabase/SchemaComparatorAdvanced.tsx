import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSchemaVersion } from '@/hooks/useSchemaVersion';
import { useSchemaDiff } from '@/hooks/useSchemaDiff';
import { toast } from '@/utils/toastHelper';
import { 
  GitCompare, 
  FileText, 
  Download, 
  AlertTriangle, 
  Plus,
  Minus,
  Edit,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export function SchemaComparatorAdvanced() {
  const { listVersions } = useSchemaVersion();
  const { comparing, diffResult, compareVersions, clearDiff } = useSchemaDiff();
  const [versions, setVersions] = useState<any[]>([]);
  const [selectedVersion1, setSelectedVersion1] = useState<string>('');
  const [selectedVersion2, setSelectedVersion2] = useState<string>('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['tables']));

  useEffect(() => {
    loadVersions();
  }, []);

  const loadVersions = async () => {
    const versionsList = await listVersions();
    setVersions(versionsList);

    // Auto-selecionar últimas 2 versões
    if (versionsList.length >= 2) {
      setSelectedVersion2(versionsList[0].version);
      setSelectedVersion1(versionsList[1].version);
    }
  };

  const handleCompare = async () => {
    if (!selectedVersion1 || !selectedVersion2) {
      toast.error('Selecione duas versões para comparar');
      return;
    }

    await compareVersions(selectedVersion1, selectedVersion2);
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const downloadMigrationSQL = () => {
    if (!diffResult?.migrationSQL) return;

    const blob = new Blob([diffResult.migrationSQL], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `migration-${selectedVersion1}-to-${selectedVersion2}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('SQL de migração baixado');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Comparador Avançado de Schemas</h2>
        <p className="text-muted-foreground">
          Compare versões e visualize diferenças detalhadas
        </p>
      </div>

      {/* Seleção de Versões */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Selecionar Versões
          </CardTitle>
          <CardDescription>
            Escolha duas versões para comparar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Versão Base (Antiga)</Label>
              <Select value={selectedVersion1} onValueChange={setSelectedVersion1}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma versão" />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((version) => (
                    <SelectItem key={version.id} value={version.version}>
                      {version.version}
                      {version.is_current && (
                        <Badge variant="default" className="ml-2 text-xs">Atual</Badge>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Versão de Comparação (Nova)</Label>
              <Select value={selectedVersion2} onValueChange={setSelectedVersion2}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma versão" />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((version) => (
                    <SelectItem key={version.id} value={version.version}>
                      {version.version}
                      {version.is_current && (
                        <Badge variant="default" className="ml-2 text-xs">Atual</Badge>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <Button 
              onClick={handleCompare}
              disabled={comparing || !selectedVersion1 || !selectedVersion2}
            >
              <GitCompare className="h-4 w-4 mr-2" />
              {comparing ? 'Comparando...' : 'Comparar Versões'}
            </Button>

            {diffResult && (
              <>
                <Button variant="outline" onClick={clearDiff}>
                  Limpar
                </Button>
                <Button variant="outline" onClick={downloadMigrationSQL}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar SQL
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {diffResult && (
        <>
          {/* Resumo */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo da Comparação</CardTitle>
              <CardDescription>
                Comparando {selectedVersion1} → {selectedVersion2}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className={`p-4 rounded-lg border ${getSeverityColor(diffResult.summary.severity)}`}>
                  <div className="text-sm font-medium">Total de Mudanças</div>
                  <div className="text-3xl font-bold mt-2">
                    {diffResult.summary.totalChanges}
                  </div>
                </div>

                <div className="p-4 rounded-lg border bg-card">
                  <div className="text-sm font-medium text-muted-foreground">Severidade</div>
                  <div className="text-2xl font-bold mt-2 capitalize">
                    {diffResult.summary.severity}
                  </div>
                </div>

                <div className="p-4 rounded-lg border bg-card">
                  <div className="text-sm font-medium text-muted-foreground">Categorias Afetadas</div>
                  <div className="text-2xl font-bold mt-2">
                    {Object.keys(diffResult.summary.byCategory).length}
                  </div>
                </div>
              </div>

              {diffResult.summary.severity === 'critical' && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Mudanças Críticas Detectadas!</AlertTitle>
                  <AlertDescription>
                    Esta comparação contém mudanças críticas como remoção de tabelas.
                    Revise cuidadosamente antes de aplicar.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Diferenças Detalhadas */}
          <Card>
            <CardHeader>
              <CardTitle>Diferenças Detalhadas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(diffResult.differences).map(([category, changes]: [string, any]) => {
                const totalChanges = (changes.added?.length || 0) + 
                                   (changes.removed?.length || 0) + 
                                   (changes.modified?.length || 0);
                
                if (totalChanges === 0) return null;

                const isExpanded = expandedCategories.has(category);

                return (
                  <Collapsible key={category} open={isExpanded}>
                    <div className="border rounded-lg">
                      <CollapsibleTrigger
                        onClick={() => toggleCategory(category)}
                        className="flex items-center justify-between w-full p-4 hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span className="font-medium capitalize">{category}</span>
                          <Badge variant="secondary">{totalChanges}</Badge>
                        </div>
                        <div className="flex gap-2">
                          {changes.added?.length > 0 && (
                            <Badge className="bg-green-600">
                              <Plus className="h-3 w-3 mr-1" />
                              {changes.added.length}
                            </Badge>
                          )}
                          {changes.removed?.length > 0 && (
                            <Badge variant="destructive">
                              <Minus className="h-3 w-3 mr-1" />
                              {changes.removed.length}
                            </Badge>
                          )}
                          {changes.modified?.length > 0 && (
                            <Badge className="bg-yellow-600">
                              <Edit className="h-3 w-3 mr-1" />
                              {changes.modified.length}
                            </Badge>
                          )}
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="border-t p-4 space-y-3">
                          {changes.added?.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Plus className="h-4 w-4 text-green-600" />
                                <span className="font-medium text-sm">Adicionados</span>
                              </div>
                              <div className="space-y-1 ml-6">
                                {changes.added.map((item: any, idx: number) => (
                                  <div key={idx} className="text-sm text-green-700 dark:text-green-400">
                                    + {item.name || item.key || JSON.stringify(item)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {changes.removed?.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Minus className="h-4 w-4 text-red-600" />
                                <span className="font-medium text-sm">Removidos</span>
                              </div>
                              <div className="space-y-1 ml-6">
                                {changes.removed.map((item: any, idx: number) => (
                                  <div key={idx} className="text-sm text-red-700 dark:text-red-400">
                                    - {item.name || item.key || JSON.stringify(item)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {changes.modified?.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Edit className="h-4 w-4 text-yellow-600" />
                                <span className="font-medium text-sm">Modificados</span>
                              </div>
                              <div className="space-y-1 ml-6">
                                {changes.modified.map((item: any, idx: number) => (
                                  <div key={idx} className="text-sm text-yellow-700 dark:text-yellow-400">
                                    ~ {item.name || item.key || JSON.stringify(item)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </CardContent>
          </Card>

          {/* SQL de Migração */}
          {diffResult.migrationSQL && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  SQL de Migração Gerado
                </CardTitle>
                <CardDescription>
                  SQL sugerido para aplicar as mudanças (revise antes de executar)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm">
                  <code>{diffResult.migrationSQL}</code>
                </pre>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!diffResult && !comparing && versions.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <GitCompare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Selecione duas versões e clique em "Comparar Versões"</p>
            </div>
          </CardContent>
        </Card>
      )}

      {versions.length === 0 && !comparing && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Nenhuma versão disponível</AlertTitle>
          <AlertDescription>
            Crie pelo menos duas versões de schema na aba "Status" para usar o comparador.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
