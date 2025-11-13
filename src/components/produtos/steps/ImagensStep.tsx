import { UseFormReturn } from "react-hook-form";
import { MultiImageUpload } from "../MultiImageUpload";
import { useState, useEffect } from "react";

interface ImagensStepProps {
  form: UseFormReturn<any>;
}

interface ImageFile {
  id: string;
  file?: File;
  url: string;
  preview: string;
}

export function ImagensStep({ form }: ImagensStepProps) {
  const [images, setImages] = useState<ImageFile[]>([]);

  // Sincronizar com o valor do formulário e auto-save
  useEffect(() => {
    const imagemUrl = form.getValues("imagem_url");
    if (imagemUrl && images.length === 0) {
      setImages([{
        id: '1',
        url: imagemUrl,
        preview: imagemUrl,
      }]);
    }
  }, []);

  // Auto-save das imagens
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (images.length > 0) {
        localStorage.setItem('produto-form-images-autosave', JSON.stringify(images));
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [images]);

  // Restaurar imagens salvas
  useEffect(() => {
    const savedImages = localStorage.getItem('produto-form-images-autosave');
    if (savedImages && images.length === 0) {
      try {
        const parsed = JSON.parse(savedImages);
        setImages(parsed);
        if (parsed.length > 0) {
          form.setValue("imagem_url", parsed[0].preview);
        }
      } catch (error) {
        console.error('Erro ao restaurar imagens:', error);
      }
    }
  }, []);

  const handleImagesChange = (newImages: ImageFile[]) => {
    setImages(newImages);
    
    // Atualiza o campo imagem_url com a primeira imagem
    if (newImages.length > 0) {
      form.setValue("imagem_url", newImages[0].preview);
    } else {
      form.setValue("imagem_url", "");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Imagens do Produto</h3>
        <p className="text-sm text-muted-foreground">
          Adicione até 5 imagens do produto. Arraste para reordenar. Formato recomendado: 1500x1500px
        </p>
      </div>

      <MultiImageUpload
        images={images}
        onChange={handleImagesChange}
        maxImages={5}
      />
    </div>
  );
}
