import { UseFormReturn } from "react-hook-form";
import { SimpleImageUploader } from "../SimpleImageUploader";
import { SimpleImageData } from "@/hooks/useSimpleImageUpload";
import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";

interface ImagensStepProps {
  form: UseFormReturn<any>;
  images: SimpleImageData[];
  onImagesChange: (images: SimpleImageData[]) => void;
  produtoId?: string; // ID do produto para organizar uploads em pastas
}

export function ImagensStep({ form, images, onImagesChange, produtoId }: ImagensStepProps) {
  const hasLoadedFromForm = useRef(false);
  const previousProdutoId = useRef<string | null>(null);

  // Log do produtoId para debug
  console.log('📁 ImagensStep: produtoId =', produtoId || 'NOVO PRODUTO');

  // Carregar imagens quando o componente montar ou quando o produto mudar
  useEffect(() => {
    // Verificar se o produto mudou
    if (produtoId !== previousProdutoId.current) {
      console.log('🔄 Produto mudou, resetando flag de carregamento');
      hasLoadedFromForm.current = false;
      previousProdutoId.current = produtoId;
    }

    // Se já carregou do form ou já tem imagens no estado, não recarregar
    if (hasLoadedFromForm.current) {
      return;
    }

    // Se já tem imagens no estado (vindas de upload), não recarregar
    if (images.length > 0) {
      hasLoadedFromForm.current = true;
      return;
    }

    // Tentar carregar do formulário
    const loadImagesFromForm = () => {
      const imagensArray = form.getValues("imagens");
      const imagemUrl = form.getValues("imagem_url");
      
      console.log('🖼️ ImagensStep: Tentando carregar imagens do formulário...');
      console.log('   imagensArray:', imagensArray);
      console.log('   imagemUrl:', imagemUrl);
      
      // Filtrar URLs válidas (apenas URLs do Supabase Storage)
      const validImagensArray = imagensArray?.filter((url: string) => {
        const isBlob = url?.startsWith('blob:');
        const isValid = url && url.includes('produtos-imagens');
        if (isBlob) {
          console.warn('⚠️ Ignorando URL blob:', url.substring(0, 50) + '...');
          return false;
        }
        return isValid;
      }) || [];
      
      if (validImagensArray.length > 0) {
        console.log(`✅ Carregando ${validImagensArray.length} imagens do array`);
        const loadedImages: SimpleImageData[] = validImagensArray.map((url: string, index: number) => ({
          id: `loaded-${index}-${Date.now()}`,
          url,
          preview: url,
          isPrincipal: index === 0,
          order: index + 1,
        }));
        onImagesChange(loadedImages);
        hasLoadedFromForm.current = true;
        return true;
      } else if (imagemUrl && !imagemUrl.startsWith('blob:') && imagemUrl.includes('produtos-imagens')) {
        console.log('✅ Carregando imagem_url (formato antigo)');
        onImagesChange([{
          id: `loaded-0-${Date.now()}`,
          url: imagemUrl,
          preview: imagemUrl,
          isPrincipal: true,
          order: 1,
        }]);
        hasLoadedFromForm.current = true;
        return true;
      }
      
      return false;
    };

    // Tentar carregar imediatamente
    const loaded = loadImagesFromForm();
    
    // Se não carregou, tentar novamente após um pequeno delay (para dar tempo do form sincronizar)
    if (!loaded) {
      const timeoutId = setTimeout(() => {
        if (!hasLoadedFromForm.current && images.length === 0) {
          const retryLoaded = loadImagesFromForm();
          if (!retryLoaded) {
            console.log('ℹ️ Nenhuma imagem válida para carregar');
            hasLoadedFromForm.current = true;
          }
        }
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [form, onImagesChange, images.length, produtoId]);

  const handleImagesChange = (newImages: SimpleImageData[]) => {
    console.log('📸 ImagensStep: Imagens atualizadas:', newImages.length);
    onImagesChange(newImages);
  };

  return (
    <div className="space-y-6">
      {/* Componente de Upload */}
      <SimpleImageUploader
        images={images}
        onChange={handleImagesChange}
        produtoId={produtoId}
        maxImages={5}
        autoUpload={true}
      />

      {/* Resumo das imagens */}
      {images.length > 0 && (
        <div className="p-4 bg-muted/20 rounded-lg border border-dashed">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {images.length} {images.length === 1 ? 'imagem' : 'imagens'} • 
                {images.filter(img => img.url && !img.isUploading).length} salvas no servidor
              </span>
            </div>
            
            {images.some(img => img.uploadError) && (
              <Badge variant="destructive" className="text-xs">
                {images.filter(img => img.uploadError).length} com erro
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
