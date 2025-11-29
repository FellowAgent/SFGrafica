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

interface AnonKeyManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onKeySaved?: () => void;
}

export function AnonKeyManager({ open, onOpenChange, onKeySaved }: AnonKeyManagerProps) {
  const [anonKey, setAnonKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [validation, setValidation] = useState({ valid: false, message: '' });

  const validateJWT = (token: string): boolean => {
    return /^eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*$/.test(token);
  };

  const handleAnonKeyChange = (value: string) => {
    setAnonKey(value);
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
      // A Anon Key é armazenada como variável de ambiente VITE_SUPABASE_PUBLISHABLE_KEY
      // O usuário precisa atualizar o arquivo .env manualmente ou usar o EnvGenerator
      toast.success('Anon Key validada!', {
        description: 'Lembre-se de atualizar a variável VITE_SUPABASE_PUBLISHABLE_KEY no arquivo .env',
      });
      
      setAnonKey('');
      setValidation({ valid: false, message: '' });
      onOpenChange(false);
      
      if (onKeySaved) {
        onKeySaved();
      }
    } catch (error) {
      toast.error('Erro ao processar a chave');
      console.error('Erro ao processar Anon Key:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Configurar Anon Key
          </DialogTitle>
          <DialogDescription>
            Configure a chave anônima (pública) do Supabase. Esta chave é usada para autenticação do lado do cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              A Anon Key é segura para exposição pública, mas deve ser protegida por RLS (Row Level Security) no Supabase.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="anonKey">Anon Key (Chave Anônima)</Label>
            <Input
              id="anonKey"
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={anonKey}
              onChange={(e) => handleAnonKeyChange(e.target.value)}
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
              Encontre sua Anon Key em: Supabase Dashboard → Settings → API → Project API keys
            </p>
          </div>
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
