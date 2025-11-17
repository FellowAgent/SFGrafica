import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConnectionTab } from '@/components/config-supabase/ConnectionTab';
import { ImportTab } from '@/components/config-supabase/ImportTab';
import { ExportTab } from '@/components/config-supabase/ExportTab';
import { BackupTab } from '@/components/config-supabase/BackupTab';
import { DangerTab } from '@/components/config-supabase/DangerTab';
import { MigrationHistoryTab } from '@/components/config-supabase/MigrationHistoryTab';
import { SchemaComparator } from '@/components/config-supabase/SchemaComparator';
import { SchemaComparatorAdvanced } from '@/components/config-supabase/SchemaComparatorAdvanced';
import { SchemaStatusTab } from '@/components/config-supabase/SchemaStatusTab';
import { MigrationSafetyTab } from '@/components/config-supabase/MigrationSafetyTab';
import { DeploymentManagerTab } from '@/components/config-supabase/DeploymentManagerTab';
import { Settings, Upload, Download, Database, AlertTriangle, History, GitCompare, Activity, Cloud, Shield } from 'lucide-react';

export default function ConfigSupabase() {
  return (
    <div className="container mx-auto p-6 space-y-6 bg-background">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Configuração do Supabase</h1>
        <p className="text-muted-foreground">
          Gerencie conexões, importe/exporte schemas e faça backup dos dados
        </p>
      </div>

      <Tabs defaultValue="connection" className="w-full">
        <TabsList className="grid w-full grid-cols-10">
          <TabsTrigger value="connection" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Conexão
          </TabsTrigger>
          <TabsTrigger value="status" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Status
          </TabsTrigger>
          <TabsTrigger value="safety" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Segurança
          </TabsTrigger>
          <TabsTrigger value="deploy" className="flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            Deploy
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Importar
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </TabsTrigger>
          <TabsTrigger value="backup" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Backup
          </TabsTrigger>
          <TabsTrigger value="comparator" className="flex items-center gap-2">
            <GitCompare className="h-4 w-4" />
            Comparador
          </TabsTrigger>
          <TabsTrigger value="danger" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Perigo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connection" className="mt-6">
          <ConnectionTab />
        </TabsContent>

        <TabsContent value="status" className="mt-6">
          <SchemaStatusTab />
        </TabsContent>

        <TabsContent value="safety" className="mt-6">
          <MigrationSafetyTab />
        </TabsContent>

        <TabsContent value="deploy" className="mt-6">
          <DeploymentManagerTab />
        </TabsContent>

        <TabsContent value="import" className="mt-6">
          <ImportTab />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <MigrationHistoryTab />
        </TabsContent>

        <TabsContent value="export" className="mt-6">
          <ExportTab />
        </TabsContent>

        <TabsContent value="backup" className="mt-6">
          <BackupTab />
        </TabsContent>

        <TabsContent value="comparator" className="mt-6">
          <Tabs defaultValue="advanced">
            <TabsList>
              <TabsTrigger value="advanced">Avançado (Versões)</TabsTrigger>
              <TabsTrigger value="simple">Simples (Arquivo)</TabsTrigger>
            </TabsList>
            <TabsContent value="advanced" className="mt-4">
              <SchemaComparatorAdvanced />
            </TabsContent>
            <TabsContent value="simple" className="mt-4">
              <SchemaComparator />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="danger" className="mt-6">
          <DangerTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
