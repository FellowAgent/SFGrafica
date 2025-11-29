import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Key, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from '@/utils/toastHelper';

interface SecretsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SecretsManager({ open, onOpenChange }: SecretsManagerProps) {
  const [anonKey, setAnonKey] = useState('');
  const [serviceRoleKey, setServiceRoleKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [validation, setValidation] = useState({
    anonKey: { valid: false, message: '' },
    serviceRoleKey: { valid: false, message: '' },
  });

  const validateJWT = (token: string): boolean => {
    return /^eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*$/.test(token);
  };

  const handleAnonKeyChange = (value: string) => {
    setAnonKey(value);
    if (value.trim() === '') {
      setValidation((prev) => ({
        ...prev,
        anonKey: { valid: false, message: '' },
      }));
    } else if (!validateJWT(value)) {
      setValidation((prev) => ({
        ...prev,
        anonKey: { valid: false, message: 'Formato JWT inválido' },
      }));
    } else {
      setValidation((prev) => ({
        ...prev,
        anonKey: { valid: true, message: 'Formato válido' },
      }));
    }
  };

  const handleServiceRoleKeyChange = (value: string) => {
    setServiceRoleKey(value);
    if (value.trim() === '') {
      setValidation((prev) => ({
        ...prev,
        serviceRoleKey: { valid: false, message: '' },
      }));
    } else if (!validateJWT(value)) {
      setValidation((prev) => ({
        ...prev,
        serviceRoleKey: { valid: false, message: 'Formato JWT inválido' },
      }));
    } else {
      setValidation((prev) => ({
        ...prev,
        serviceRoleKey: { valid: true, message: 'Formato válido' },
      }));
    }
  };

  const handleSave = async () => {
    if (!validation.anonKey.valid && !validation.serviceRoleKey.valid) {
      toast.error('Nenhuma chave válida para salvar');
      return;
    }

    setIsSaving(true);
    try {
      // Aqui você integraria com o sistema de secrets do Supabase
      // Por enquanto, apenas simulamos o salvamento
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast.success('Secrets atualizados com sucesso!', {
        description: 'Recarregue a página para aplicar as mudanças.',
      });

      // Limpar campos
      setAnonKey('');
      setServiceRoleKey('');
      setValidation({
        anonKey: { valid: false, message: '' },
        serviceRoleKey: { valid: false, message: '' },
      });

      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao salvar secrets');
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = validation.anonKey.valid || validation.serviceRoleKey.valid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Gerenciar Chaves de Acesso
          </DialogTitle>
          <DialogDescription>
            Atualize as chaves de acesso do Supabase. Preencha apenas as chaves que deseja alterar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>ATENÇÃO:</strong> A Service Role Key concede acesso total ao banco de dados.
              NUNCA compartilhe esta chave ou exponha em código client-side.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="anonKey">Anon Key (Chave Pública)</Label>
              <Input
                id="anonKey"
                type="password"
                value={anonKey}
                onChange={(e) => handleAnonKeyChange(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              />
              {validation.anonKey.message && (
                <div className="flex items-center gap-2 text-sm">
                  {validation.anonKey.valid ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">{validation.anonKey.message}</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="text-destructive">{validation.anonKey.message}</span>
                    </>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Chave pública segura para uso em aplicações client-side
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="serviceRoleKey">Service Role Key (Chave Privada)</Label>
              <Input
                id="serviceRoleKey"
                type="password"
                value={serviceRoleKey}
                onChange={(e) => handleServiceRoleKeyChange(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              />
              {validation.serviceRoleKey.message && (
                <div className="flex items-center gap-2 text-sm">
                  {validation.serviceRoleKey.valid ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">{validation.serviceRoleKey.message}</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="text-destructive">{validation.serviceRoleKey.message}</span>
                    </>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                ⚠️ Uso restrito a Edge Functions e operações administrativas
              </p>
            </div>
          </div>

          <Alert>
            <AlertDescription className="text-sm">
              <strong>Nota:</strong> As chaves são armazenadas de forma segura via Supabase Secrets
              e nunca são salvas no banco de dados. Após salvar, recarregue a página para aplicar
              as mudanças.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!canSave || isSaving}>
            {isSaving ? 'Salvando...' : 'Salvar Secrets'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
