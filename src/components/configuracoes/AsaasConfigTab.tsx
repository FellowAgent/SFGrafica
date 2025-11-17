import { useState, useEffect } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAsaasConfig } from "@/hooks/useAsaasConfig";
import { Loader2, Copy, Check, AlertCircle, Key, Webhook, FileText, TestTube } from "lucide-react";
import { toast } from "@/utils/toastHelper";
import type { AsaasConfigFormData } from "@/types/asaas";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function AsaasConfigTab() {
  const { isMaster, loading: roleLoading } = useUserRole();
  const { config, loading, saving, saveConfig, testConnection } = useAsaasConfig();
  const [copied, setCopied] = useState(false);
  
  const [formData, setFormData] = useState<AsaasConfigFormData>({
    api_key: '',
    environment: 'sandbox',
    enabled: false,
    auto_emit_nf: false,
    nf_enabled: false,
    empresa_cnpj: '',
    inscricao_municipal: '',
    regime_tributario: '',
    natureza_operacao: '',
    aliquota_iss: 0,
  });

  useEffect(() => {
    if (config) {
      setFormData({
        api_key: config.api_key || '',
        environment: config.environment,
        enabled: config.enabled,
        auto_emit_nf: config.auto_emit_nf,
        nf_enabled: config.nf_enabled,
        empresa_cnpj: config.empresa_cnpj || '',
        inscricao_municipal: config.inscricao_municipal || '',
        regime_tributario: config.regime_tributario || '',
        natureza_operacao: config.natureza_operacao || '',
        aliquota_iss: config.aliquota_iss || 0,
      });
    }
  }, [config]);

  const handleSave = async () => {
    const success = await saveConfig(formData);
    if (success) {
      toast.success('Configurações salvas!');
    }
  };

  const handleTest = async () => {
    await testConnection();
  };

  const copyWebhookUrl = () => {
    const webhookUrl = `https://odlfkrnrkvruvqxseusr.supabase.co/functions/v1/asaas-webhook`;
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success('URL copiada!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (roleLoading || loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isMaster) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Apenas usuários Master podem acessar as configurações da API Asaas.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configurações da API */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <CardTitle>Configurações da API Asaas</CardTitle>
          </div>
          <CardDescription>
            Configure suas credenciais da API Asaas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api_key">API Key *</Label>
            <Input
              id="api_key"
              type="password"
              placeholder="Insira sua chave de API do Asaas"
              value={formData.api_key}
              onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
            />
            <p className="text-sm text-muted-foreground">
              Obtenha sua API Key no painel do Asaas em: Configurações → Integrações → API Key
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="environment">Ambiente</Label>
            <Select
              value={formData.environment}
              onValueChange={(value: 'sandbox' | 'production') => 
                setFormData({ ...formData, environment: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sandbox">Sandbox (Testes)</SelectItem>
                <SelectItem value="production">Produção</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Use Sandbox para testes e Produção para cobranças reais
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enabled">Habilitar Asaas</Label>
              <p className="text-sm text-muted-foreground">
                Ativar integração com Asaas para pagamentos
              </p>
            </div>
            <Switch
              id="enabled"
              checked={formData.enabled}
              onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar Configurações
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={!formData.api_key}>
              <TestTube className="h-4 w-4 mr-2" />
              Testar Conexão
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configurações de Webhook */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-primary" />
            <CardTitle>Configuração de Webhook</CardTitle>
          </div>
          <CardDescription>
            Configure o webhook no painel do Asaas para receber notificações de pagamento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>URL do Webhook</Label>
            <div className="flex gap-2">
              <Input
                value="https://odlfkrnrkvruvqxseusr.supabase.co/functions/v1/asaas-webhook"
                readOnly
                className="font-mono text-sm"
              />
              <Button variant="outline" size="icon" onClick={copyWebhookUrl}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {config?.webhook_token && (
            <div className="space-y-2">
              <Label>Token do Webhook</Label>
              <Input
                value={config.webhook_token}
                readOnly
                className="font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground">
                Use este token para validar a autenticidade dos webhooks
              </p>
            </div>
          )}

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Configure no painel do Asaas:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Acesse: Configurações → Integrações → Webhooks</li>
                  <li>Cole a URL do webhook acima</li>
                  <li>Selecione os eventos: PAYMENT_RECEIVED, PAYMENT_CONFIRMED, PAYMENT_OVERDUE</li>
                  <li>Ative o webhook</li>
                </ol>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Configurações de Nota Fiscal */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle>Configurações de Nota Fiscal</CardTitle>
          </div>
          <CardDescription>
            Configure a emissão automática de notas fiscais via Asaas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="nf_enabled">Habilitar Emissão de NF</Label>
              <p className="text-sm text-muted-foreground">
                Permitir emissão de notas fiscais
              </p>
            </div>
            <Switch
              id="nf_enabled"
              checked={formData.nf_enabled}
              onCheckedChange={(checked) => setFormData({ ...formData, nf_enabled: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto_emit_nf">Emissão Automática</Label>
              <p className="text-sm text-muted-foreground">
                Emitir NF automaticamente ao confirmar pagamento
              </p>
            </div>
            <Switch
              id="auto_emit_nf"
              checked={formData.auto_emit_nf}
              onCheckedChange={(checked) => setFormData({ ...formData, auto_emit_nf: checked })}
              disabled={!formData.nf_enabled}
            />
          </div>

          {formData.nf_enabled && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="empresa_cnpj">CNPJ da Empresa</Label>
                  <Input
                    id="empresa_cnpj"
                    placeholder="00.000.000/0000-00"
                    value={formData.empresa_cnpj}
                    onChange={(e) => setFormData({ ...formData, empresa_cnpj: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inscricao_municipal">Inscrição Municipal</Label>
                  <Input
                    id="inscricao_municipal"
                    placeholder="Inscrição Municipal"
                    value={formData.inscricao_municipal}
                    onChange={(e) => setFormData({ ...formData, inscricao_municipal: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="regime_tributario">Regime Tributário</Label>
                  <Select
                    value={formData.regime_tributario}
                    onValueChange={(value) => setFormData({ ...formData, regime_tributario: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                      <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                      <SelectItem value="lucro_real">Lucro Real</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aliquota_iss">Alíquota ISS (%)</Label>
                  <Input
                    id="aliquota_iss"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="5.00"
                    value={formData.aliquota_iss}
                    onChange={(e) => setFormData({ ...formData, aliquota_iss: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="natureza_operacao">Natureza da Operação</Label>
                <Input
                  id="natureza_operacao"
                  placeholder="Ex: Venda de mercadoria"
                  value={formData.natureza_operacao}
                  onChange={(e) => setFormData({ ...formData, natureza_operacao: e.target.value })}
                />
              </div>
            </>
          )}

          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Salvar Configurações de NF
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
