import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Shield, AlertTriangle, CheckCircle2, XCircle, Settings } from 'lucide-react';
import { useSafeMigration } from '@/hooks/useSafeMigration';
import { Separator } from '@/components/ui/separator';

export function MigrationSafetyTab() {
  const { safetyConfig, loading, loadSafetyConfig, updateSafetyConfig } = useSafeMigration();
  const [editMode, setEditMode] = useState(false);
  const [localConfig, setLocalConfig] = useState(safetyConfig);

  useEffect(() => {
    loadSafetyConfig();
  }, []);

  useEffect(() => {
    setLocalConfig(safetyConfig);
  }, [safetyConfig]);

  const handleSave = async () => {
    if (!localConfig) return;
    
    await updateSafetyConfig({
      require_backup: localConfig.require_backup,
      require_dry_run: localConfig.require_dry_run,
      allow_destructive_ops: localConfig.allow_destructive_ops,
      require_double_confirmation: localConfig.require_double_confirmation,
      max_affected_rows: localConfig.max_affected_rows,
      backup_retention_days: localConfig.backup_retention_days,
      auto_rollback_on_error: localConfig.auto_rollback_on_error,
    });
    
    setEditMode(false);
  };

  const handleCancel = () => {
    setLocalConfig(safetyConfig);
    setEditMode(false);
  };

  if (!safetyConfig || !localConfig) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Configurações de Segurança
            </h2>
            <p className="text-muted-foreground mt-1">
              Carregando configurações...
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getProtectionLevel = () => {
    const score = 
      (localConfig.require_backup ? 20 : 0) +
      (localConfig.require_dry_run ? 20 : 0) +
      (!localConfig.allow_destructive_ops ? 20 : 0) +
      (localConfig.require_double_confirmation ? 20 : 0) +
      (localConfig.auto_rollback_on_error ? 20 : 0);

    if (score >= 90) return { level: 'Máximo', color: 'text-green-600', icon: CheckCircle2 };
    if (score >= 60) return { level: 'Alto', color: 'text-blue-600', icon: Shield };
    if (score >= 40) return { level: 'Médio', color: 'text-yellow-600', icon: AlertTriangle };
    return { level: 'Baixo', color: 'text-red-600', icon: XCircle };
  };

  const protection = getProtectionLevel();
  const ProtectionIcon = protection.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Configurações de Segurança
          </h2>
          <p className="text-muted-foreground mt-1">
            Configure o nível de proteção para migrações de banco de dados
          </p>
        </div>
        {!editMode ? (
          <Button onClick={() => setEditMode(true)} variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Editar
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={handleCancel} variant="outline" size="sm">
              Cancelar
            </Button>
            <Button onClick={handleSave} size="sm" disabled={loading}>
              Salvar Alterações
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ProtectionIcon className={`h-5 w-5 ${protection.color}`} />
            Nível de Proteção: {protection.level}
          </CardTitle>
          <CardDescription>
            Status atual das proteções configuradas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="require_backup">Exigir Backup Pré-Migração</Label>
              <p className="text-sm text-muted-foreground">
                Cria backup automático antes de executar qualquer migração
              </p>
            </div>
            <Switch
              id="require_backup"
              checked={localConfig.require_backup}
              onCheckedChange={(checked) => 
                setLocalConfig({ ...localConfig, require_backup: checked })
              }
              disabled={!editMode}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="require_dry_run">Exigir Dry-Run</Label>
              <p className="text-sm text-muted-foreground">
                Testa a migração em schema temporário antes da execução
              </p>
            </div>
            <Switch
              id="require_dry_run"
              checked={localConfig.require_dry_run}
              onCheckedChange={(checked) => 
                setLocalConfig({ ...localConfig, require_dry_run: checked })
              }
              disabled={!editMode}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto_rollback">Rollback Automático em Erros</Label>
              <p className="text-sm text-muted-foreground">
                Reverte automaticamente a migração se houver qualquer erro
              </p>
            </div>
            <Switch
              id="auto_rollback"
              checked={localConfig.auto_rollback_on_error}
              onCheckedChange={(checked) => 
                setLocalConfig({ ...localConfig, auto_rollback_on_error: checked })
              }
              disabled={!editMode}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="require_confirmation">Exigir Confirmação Dupla</Label>
              <p className="text-sm text-muted-foreground">
                Requer digitação de "CONFIRMAR" para operações críticas
              </p>
            </div>
            <Switch
              id="require_confirmation"
              checked={localConfig.require_double_confirmation}
              onCheckedChange={(checked) => 
                setLocalConfig({ ...localConfig, require_double_confirmation: checked })
              }
              disabled={!editMode}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allow_destructive">Permitir Operações Destrutivas</Label>
              <p className="text-sm text-muted-foreground">
                Permite DROP TABLE, TRUNCATE e DELETE sem WHERE (não recomendado)
              </p>
            </div>
            <Switch
              id="allow_destructive"
              checked={localConfig.allow_destructive_ops}
              onCheckedChange={(checked) => 
                setLocalConfig({ ...localConfig, allow_destructive_ops: checked })
              }
              disabled={!editMode}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="max_rows">Máximo de Linhas Afetadas</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Bloqueia migrações que afetam mais linhas que o limite configurado
            </p>
            <Input
              id="max_rows"
              type="number"
              value={localConfig.max_affected_rows}
              onChange={(e) => 
                setLocalConfig({ ...localConfig, max_affected_rows: parseInt(e.target.value) || 0 })
              }
              disabled={!editMode}
              className="max-w-xs"
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="retention">Retenção de Backups (dias)</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Por quantos dias os backups devem ser mantidos
            </p>
            <Input
              id="retention"
              type="number"
              value={localConfig.backup_retention_days}
              onChange={(e) => 
                setLocalConfig({ ...localConfig, backup_retention_days: parseInt(e.target.value) || 0 })
              }
              disabled={!editMode}
              className="max-w-xs"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-yellow-500/50 bg-yellow-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-700">
            <AlertTriangle className="h-5 w-5" />
            Recomendações de Segurança
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>✅ Mantenha "Exigir Backup" sempre ativado</p>
          <p>✅ Mantenha "Exigir Dry-Run" sempre ativado</p>
          <p>✅ Mantenha "Rollback Automático" sempre ativado</p>
          <p>⚠️ Nunca ative "Permitir Operações Destrutivas" em produção</p>
          <p>✅ Configure um limite razoável para linhas afetadas</p>
        </CardContent>
      </Card>
    </div>
  );
}
