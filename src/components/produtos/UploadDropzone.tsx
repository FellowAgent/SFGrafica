import { useDropzone } from 'react-dropzone';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCallback } from 'react';
import { toast } from '@/utils/toastHelper';

interface UploadDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles: number;
  currentCount: number;
  disabled?: boolean;
}

export function UploadDropzone({ onFilesSelected, maxFiles, currentCount, disabled }: UploadDropzoneProps) {
  const remainingSlots = maxFiles - currentCount;

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      toast.error('Alguns arquivos foram rejeitados. Use apenas JPG, PNG ou WEBP.');
      return;
    }

    if (acceptedFiles.length > remainingSlots) {
      toast.error(`Você pode adicionar no máximo ${remainingSlots} imagem(ns)`);
      return;
    }

    onFilesSelected(acceptedFiles);
  }, [onFilesSelected, remainingSlots]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp']
    },
    maxFiles: remainingSlots,
    disabled: disabled || remainingSlots === 0,
    multiple: true,
  });

  if (remainingSlots === 0) return null;

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200",
        isDragActive 
          ? "border-primary bg-primary/5 scale-[1.02]" 
          : "border-border hover:border-primary/50 hover:bg-accent/5",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-3">
        {isDragActive ? (
          <>
            <Upload className="h-10 w-10 text-primary animate-bounce" />
            <p className="text-sm font-medium text-primary">
              Solte as imagens aqui...
            </p>
          </>
        ) : (
          <>
            <div className="relative">
              <ImageIcon className="h-10 w-10 text-muted-foreground" />
              <Upload className="h-5 w-5 text-muted-foreground absolute -bottom-1 -right-1" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground mb-1">
                Arraste imagens ou clique para selecionar
              </p>
              <p className="text-xs text-muted-foreground">
                Suporta upload múltiplo • JPG, PNG ou WEBP • Max 1500x1500px
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {remainingSlots} {remainingSlots === 1 ? 'espaço disponível' : 'espaços disponíveis'}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
