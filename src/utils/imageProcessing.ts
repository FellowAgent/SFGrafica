/**
 * Utilitários para processamento de imagens
 */

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ProcessedImage {
  blob: Blob;
  url: string;
  dimensions: ImageDimensions;
  originalSize: number;
  processedSize: number;
}

/**
 * Redimensiona e compacta uma imagem antes do upload
 * Usa compressão adaptativa para garantir redução de tamanho
 * Sempre converte para JPEG para melhor compressão
 * 
 * @param file - Arquivo de imagem
 * @param maxWidth - Largura máxima (padrão: 1500px)
 * @param maxHeight - Altura máxima (padrão: 1500px)
 * @param targetMaxSizeMB - Tamanho máximo desejado em MB (padrão: 2MB)
 */
export const resizeImage = async (
  file: File,
  maxWidth: number = 1500,
  maxHeight: number = 1500,
  targetMaxSizeMB: number = 2
): Promise<ProcessedImage> => {
  const originalSize = file.size;
  const originalSizeMB = originalSize / (1024 * 1024);
  
  console.log(`📊 Processando imagem: ${file.name}`);
  console.log(`   Tamanho original: ${originalSizeMB.toFixed(2)}MB`);

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = async () => {
      let width = img.width;
      let height = img.height;

      console.log(`📐 Dimensões originais: ${width}x${height}`);

      // Calcular novas dimensões mantendo proporção
      const needsResize = width > maxWidth || height > maxHeight;
      
      if (needsResize) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
        console.log(`📐 Novas dimensões: ${width}x${height}`);
      }

      // Criar canvas para redimensionar
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Falha ao criar contexto do canvas'));
        return;
      }

      // Melhorar qualidade do redimensionamento
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Estratégia de compressão adaptativa
      // Tentar diferentes níveis de qualidade até atingir tamanho aceitável
      const tryCompress = async (quality: number): Promise<Blob | null> => {
        return new Promise((res) => {
          canvas.toBlob(
            (blob) => res(blob),
            'image/jpeg',
            quality
          );
        });
      };

      let finalBlob: Blob | null = null;
      const qualityLevels = [0.85, 0.75, 0.65, 0.55, 0.45];
      
      for (const quality of qualityLevels) {
        const blob = await tryCompress(quality);
        if (!blob) continue;
        
        const sizeMB = blob.size / (1024 * 1024);
        console.log(`   🔄 Qualidade ${(quality * 100).toFixed(0)}%: ${sizeMB.toFixed(2)}MB`);
        
        finalBlob = blob;
        
        // Aceitar se:
        // 1. Está abaixo do tamanho alvo, OU
        // 2. É menor que o arquivo original, OU
        // 3. É a última tentativa
        if (sizeMB <= targetMaxSizeMB || sizeMB < originalSizeMB || quality === qualityLevels[qualityLevels.length - 1]) {
          console.log(`   ✅ Aceito com qualidade ${(quality * 100).toFixed(0)}%`);
          break;
        }
      }

      if (!finalBlob) {
        reject(new Error('Falha ao processar imagem'));
        return;
      }

      // Garantir tipo MIME correto
      const correctedBlob = await ensureCorrectMimeType(finalBlob, 'image/jpeg');
      const finalSizeMB = correctedBlob.size / (1024 * 1024);
      const reduction = originalSize > 0 ? ((originalSize - correctedBlob.size) / originalSize * 100) : 0;
      
      console.log(`✅ Imagem final: ${finalSizeMB.toFixed(2)}MB (${reduction > 0 ? 'redução' : 'aumento'} de ${Math.abs(reduction).toFixed(1)}%)`);
      
      resolve({
        blob: correctedBlob,
        url: URL.createObjectURL(correctedBlob),
        dimensions: { width, height },
        originalSize,
        processedSize: correctedBlob.size,
      });
      
      // Limpar objeto URL
      URL.revokeObjectURL(img.src);
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Falha ao carregar imagem'));
    };

    img.src = URL.createObjectURL(file);
  });
};

/**
 * Garante que um blob tenha o tipo MIME correto
 * Se o blob não tiver tipo MIME correto ou estiver vazio, recria com tipo explícito
 * @param blob - Blob a ser verificado/corrigido
 * @param expectedType - Tipo MIME esperado (padrão: 'image/jpeg')
 * @returns Blob garantidamente com tipo MIME correto
 */
export async function ensureCorrectMimeType(
  blob: Blob,
  expectedType: string = 'image/jpeg'
): Promise<Blob> {
  // Verificar se o blob já tem o tipo correto
  if (blob.type === expectedType) {
    console.log(`✅ Blob já tem tipo MIME correto: ${blob.type}`);
    return blob;
  }

  // Se o tipo está incorreto ou vazio, recriar o blob
  if (!blob.type || blob.type !== expectedType) {
    console.warn(`⚠️ Blob tem tipo MIME incorreto: "${blob.type}" (esperado: "${expectedType}")`);
    console.log('🔧 Corrigindo tipo MIME do blob...');

    try {
      // Converter blob para ArrayBuffer
      const arrayBuffer = await blob.arrayBuffer();

      // Criar novo blob com tipo MIME correto
      const correctedBlob = new Blob([arrayBuffer], { type: expectedType });

      console.log(`✅ Blob corrigido: tipo MIME agora é "${correctedBlob.type}"`);
      console.log(`   Tamanho: ${correctedBlob.size} bytes (original: ${blob.size} bytes)`);

      return correctedBlob;
    } catch (error) {
      console.error('❌ Erro ao corrigir tipo MIME do blob:', error);
      // Em caso de erro, retornar blob original (melhor que falhar completamente)
      return blob;
    }
  }

  return blob;
}

/**
 * Formata tamanho de arquivo para exibição
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Valida tipo de arquivo
 */
export const isValidImageType = (file: File): boolean => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  return validTypes.includes(file.type);
};

/**
 * Obtém dimensões de uma imagem
 */
export const getImageDimensions = (file: File): Promise<ImageDimensions> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      reject(new Error('Falha ao carregar dimensões da imagem'));
    };
    img.src = URL.createObjectURL(file);
  });
};
