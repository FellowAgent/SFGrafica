import { useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "@/utils/toastHelper";

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  clienteId?: string;
  onAvatarChange: (url: string | null) => void;
}

export function AvatarUpload({ currentAvatarUrl, clienteId, onAvatarChange }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl || null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }

    // Validar tamanho (máx 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB');
      return;
    }

    setUploading(true);

    try {
      // Criar preview local
      const localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);

      // Se já existe avatar, deletar o antigo
      if (currentAvatarUrl && clienteId) {
        const oldPath = currentAvatarUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('clientes-avatars')
            .remove([`${clienteId}/${oldPath}`]);
        }
      }

      // Upload do novo arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = clienteId ? `${clienteId}/${fileName}` : `temp/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('clientes-avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('clientes-avatars')
        .getPublicUrl(filePath);

      setPreviewUrl(publicUrl);
      onAvatarChange(publicUrl);
      toast.success('Avatar atualizado com sucesso!');

    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload do avatar');
      setPreviewUrl(currentAvatarUrl || null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!currentAvatarUrl || !clienteId) {
      setPreviewUrl(null);
      onAvatarChange(null);
      return;
    }

    try {
      const path = currentAvatarUrl.split('/').pop();
      if (path) {
        await supabase.storage
          .from('clientes-avatars')
          .remove([`${clienteId}/${path}`]);
      }

      setPreviewUrl(null);
      onAvatarChange(null);
      toast.success('Avatar removido com sucesso!');
    } catch (error) {
      console.error('Erro ao remover avatar:', error);
      toast.error('Erro ao remover avatar');
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <Avatar className="h-32 w-32 border-4 border-border">
          <AvatarImage src={previewUrl || undefined} alt="Avatar do cliente" />
          <AvatarFallback className="bg-muted text-4xl">
            <Camera className="h-12 w-12 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
        
        {previewUrl && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-8 w-8 rounded-full"
            onClick={handleRemoveAvatar}
            disabled={uploading}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => document.getElementById('avatar-upload')?.click()}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Camera className="mr-2 h-4 w-4" />
              {previewUrl ? 'Alterar Foto' : 'Adicionar Foto'}
            </>
          )}
        </Button>
      </div>

      <input
        id="avatar-upload"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
        disabled={uploading}
      />
    </div>
  );
}