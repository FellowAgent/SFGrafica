/**
 * Hook Simplificado de Upload de Imagens
 * 
 * Usa o sistema de upload garantido com Service Role Key.
 * Interface simples e direta para upload de imagens de produtos.
 */

import { useState, useCallback } from 'react';
import { 
  guaranteedUpload, 
  guaranteedDelete, 
  resizeImageForUpload,
  isUploadAvailable,
  moveImagesToProduct,
  deleteProductImages,
  cleanOrphanImages,
  ensureBucketExists,
  getOrCreateSessionId,
  resetSessionId,
  GuaranteedUploadResult 
} from '@/utils/guaranteedUpload';

/**
 * Resultado de upload de uma imagem
 */
export interface SimpleUploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
  originalFile?: File;
}

/**
 * Dados de uma imagem no componente
 */
export interface SimpleImageData {
  id: string;
  url: string;
  preview: string;
  path?: string;
  isPrincipal: boolean;
  order: number;
  isUploading?: boolean;
  uploadError?: string;
}

/**
 * Retorno do hook
 */
export interface UseSimpleImageUploadReturn {
  // Estado
  isUploading: boolean;
  progress: number;
  isAvailable: boolean;
  
  // Funções de upload
  uploadSingleImage: (file: File, produtoId?: string, ordem?: number) => Promise<SimpleUploadResult>;
  uploadMultipleImages: (files: File[], produtoId?: string, startOrdem?: number) => Promise<SimpleUploadResult[]>;
  processAndUpload: (file: File, produtoId?: string, ordem?: number) => Promise<SimpleUploadResult>;
  
  // Funções de gerenciamento
  deleteImage: (url: string) => Promise<boolean>;
  deleteAllProductImages: (produtoId: string) => Promise<{ deleted: number; errors: string[] }>;
  moveToProduct: (tempUrls: string[], produtoId: string) => Promise<{ newUrls: string[]; errors: string[] }>;
  cleanOrphans: (maxAgeHours?: number) => Promise<{ deleted: number; errors: string[] }>;
  
  // Utilitários
  checkBucket: () => Promise<{ exists: boolean; isPublic: boolean; error?: string }>;
  getSessionId: () => string;
  resetSession: () => void;
}

/**
 * Hook para upload simplificado de imagens
 */
export function useSimpleImageUpload(): UseSimpleImageUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  /**
   * Faz upload de uma única imagem
   */
  const uploadSingleImage = useCallback(async (
    file: File, 
    produtoId?: string,
    ordem: number = 1
  ): Promise<SimpleUploadResult> => {
    console.log(`📤 Iniciando upload de: ${file.name} (ordem: ${ordem})`);
    
    try {
      const result = await guaranteedUpload(file, produtoId, ordem, file.name);
      
      return {
        success: result.success,
        url: result.url,
        path: result.path,
        error: result.error,
        originalFile: file,
      };
    } catch (error: any) {
      console.error('❌ Erro no upload:', error);
      return {
        success: false,
        error: error.message,
        originalFile: file,
      };
    }
  }, []);

  /**
   * Processa (redimensiona) e faz upload de uma imagem
   */
  const processAndUpload = useCallback(async (
    file: File,
    produtoId?: string,
    ordem: number = 1
  ): Promise<SimpleUploadResult> => {
    console.log(`🔄 Processando e fazendo upload de: ${file.name} (ordem: ${ordem})`);
    
    try {
      // 1. Redimensionar imagem
      console.log('📐 Redimensionando imagem...');
      const resizedBlob = await resizeImageForUpload(file, 1500, 1500, 0.9);
      console.log(`✅ Imagem redimensionada: ${resizedBlob.size} bytes`);

      // 2. Fazer upload
      const result = await guaranteedUpload(resizedBlob, produtoId, ordem, file.name);
      
      return {
        success: result.success,
        url: result.url,
        path: result.path,
        error: result.error,
        originalFile: file,
      };
    } catch (error: any) {
      console.error('❌ Erro no processamento/upload:', error);
      return {
        success: false,
        error: error.message,
        originalFile: file,
      };
    }
  }, []);

  /**
   * Faz upload de múltiplas imagens
   */
  const uploadMultipleImages = useCallback(async (
    files: File[],
    produtoId?: string,
    startOrdem: number = 1
  ): Promise<SimpleUploadResult[]> => {
    if (files.length === 0) {
      return [];
    }

    setIsUploading(true);
    setProgress(0);

    const results: SimpleUploadResult[] = [];
    const total = files.length;

    console.log(`📤 Iniciando upload de ${total} imagens...`);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ordem = startOrdem + i;
      
      console.log(`📤 [${i + 1}/${total}] Processando: ${file.name} (ordem: ${ordem})`);
      
      const result = await processAndUpload(file, produtoId, ordem);
      results.push(result);
      
      // Atualizar progresso
      const currentProgress = Math.round(((i + 1) / total) * 100);
      setProgress(currentProgress);
      
      if (result.success) {
        console.log(`✅ [${i + 1}/${total}] Upload concluído: ${file.name}`);
      } else {
        console.error(`❌ [${i + 1}/${total}] Falha: ${file.name} - ${result.error}`);
      }
    }

    setIsUploading(false);
    setProgress(100);

    // Resumo
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    console.log('='.repeat(50));
    console.log(`📊 RESUMO: ${successCount} sucesso, ${failCount} falhas`);
    console.log('='.repeat(50));

    return results;
  }, [processAndUpload]);

  /**
   * Deleta uma imagem
   */
  const deleteImage = useCallback(async (url: string): Promise<boolean> => {
    console.log(`🗑️ Deletando imagem: ${url.substring(0, 80)}...`);
    return await guaranteedDelete(url);
  }, []);

  /**
   * Deleta todas as imagens de um produto
   */
  const deleteAllProductImages = useCallback(async (produtoId: string) => {
    console.log(`🗑️ Deletando todas as imagens do produto: ${produtoId}`);
    return await deleteProductImages(produtoId);
  }, []);

  /**
   * Move imagens temporárias para a pasta do produto
   */
  const moveToProduct = useCallback(async (tempUrls: string[], produtoId: string) => {
    console.log(`📦 Movendo ${tempUrls.length} imagens para produto: ${produtoId}`);
    return await moveImagesToProduct(tempUrls, produtoId);
  }, []);

  /**
   * Limpa imagens órfãs
   */
  const cleanOrphans = useCallback(async (maxAgeHours: number = 24) => {
    console.log(`🧹 Limpando imagens órfãs (mais de ${maxAgeHours}h)`);
    return await cleanOrphanImages(maxAgeHours);
  }, []);

  /**
   * Verifica se o bucket está configurado
   */
  const checkBucket = useCallback(async () => {
    return await ensureBucketExists();
  }, []);

  /**
   * Obtém o session ID atual
   */
  const getSessionId = useCallback(() => {
    return getOrCreateSessionId();
  }, []);

  /**
   * Reseta o session ID
   */
  const resetSession = useCallback(() => {
    resetSessionId();
  }, []);

  return {
    isUploading,
    progress,
    isAvailable: isUploadAvailable(),
    uploadSingleImage,
    uploadMultipleImages,
    deleteImage,
    deleteAllProductImages,
    moveToProduct,
    cleanOrphans,
    processAndUpload,
    checkBucket,
    getSessionId,
    resetSession,
  };
}

/**
 * Gera um ID único para imagens
 */
export function generateImageId(): string {
  return `img-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Valida se um arquivo é uma imagem válida
 */
export function isValidImageFile(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  return validTypes.includes(file.type.toLowerCase());
}

/**
 * Formata tamanho de arquivo para exibição
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
