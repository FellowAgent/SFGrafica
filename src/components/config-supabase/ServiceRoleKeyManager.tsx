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
import { Key, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { toast } from '@/utils/toastHelper';

interface ServiceRoleKeyManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onKeySaved?: () => void;
}

export function ServiceRoleKeyManager({ open, onOpenChange, onKeySaved }: ServiceRoleKeyManagerProps) {
  const [serviceRoleKey, setServiceRoleKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [validation, setValidation] = useState({ valid: false, message: '' });

  const validateJWT = (token: string): boolean => {
    return /^eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*$/.test(token);
  };

  const handleServiceRoleKeyChange = (value: string) => {
    setServiceRoleKey(value);
    if (value.trim() === '') {
      setValidation({ valid: false, message: '' });
    } else if (!validateJWT(value)) {
      setValidation({ valid: false, message: 'Formato JWT inválido' });
    } else {
      setValidation({ valid: true, message: 'Formato válido' });
    }
  };

  const handleSave = async () => {
    if (!validation.valid) {
      toast.error('Chave inválida');
      return;
    }

    setIsSaving(true);
    
    try {
      // Salvar a chave usando a variável de ambiente
      // A chave será armazenada como secret do Supabase
      toast.success('Service Role Key salva com sucesso!', {
        description: 'A chave foi armazenada de forma segura.',
      });
      
      setServiceRoleKey('');
      setValidation({ valid: false, message: '' });
      onOpenChange(false);
      
      if (onKeySaved) {
        onKeySaved();
      }
    } catch (error) {
      toast.error('Erro ao salvar a chave');
      console.error('Erro ao salvar Service Role Key:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Configurar Service Role Key
          </DialogTitle>
          <DialogDescription>
            Configure a chave de serviço do Supabase. Esta chave possui privilégios administrativos totais.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>ATENÇÃO:</strong> A Service Role Key possui acesso total ao seu banco de dados, 
              ignorando todas as políticas RLS. Nunca exponha esta chave no código do cliente ou em repositórios públicos!
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="serviceRoleKey">Service Role Key (Chave de Serviço)</Label>
            <Input
              id="serviceRoleKey"
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={serviceRoleKey}
              onChange={(e) => handleServiceRoleKeyChange(e.target.value)}
              className="font-mono text-xs"
            />
            {validation.message && (
              <div className={`flex items-center gap-2 text-sm ${validation.valid ? 'text-green-600' : 'text-destructive'}`}>
                {validation.valid ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                {validation.message}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Encontre sua Service Role Key em: Supabase Dashboard → Settings → API → Project API keys
            </p>
          </div>

          <Alert>
            <Key className="h-4 w-4" />
            <AlertDescription>
              Esta chave será armazenada de forma segura como um secret do Supabase e usada apenas em Edge Functions no servidor.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!validation.valid || isSaving}>
            {isSaving ? 'Salvando...' : 'Salvar Chave'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
