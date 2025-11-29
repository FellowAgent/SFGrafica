import { useEffect, useRef, useState, useCallback } from 'react';
import { UseFormWatch, UseFormSetValue } from 'react-hook-form';

interface AutoSaveOptions {
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
  formId: string;
  enabled?: boolean;
  onRestored?: () => void;
}

interface SavedFormData {
  formData: Record<string, any>;
  images?: any[];
  timestamp: number;
}

// Função utilitária para obter dados salvos (pode ser usada antes de criar o form)
export function getSavedFormData(formId: string): Record<string, any> | null {
  console.log('🔍 [getSavedFormData] Iniciando busca para formId:', formId);
  
  // Validar formId
  if (!formId || formId === 'undefined' || formId === 'null') {
    console.log('⚠️ [getSavedFormData] formId inválido:', formId);
    return null;
  }
  
  const storageKey = `produto-form-autosave-${formId}`;
  console.log('🔍 [getSavedFormData] Chave de busca:', storageKey);
  
  try {
    const saved = localStorage.getItem(storageKey);
    console.log('🔍 [getSavedFormData] Dados brutos encontrados:', saved ? 'SIM' : 'NÃO');
    
    if (saved) {
      const parsed: SavedFormData = JSON.parse(saved);
      const formData = parsed.formData || parsed;
      const timestamp = parsed.timestamp || 0;
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 horas
      const age = now - timestamp;
      
      console.log('🔍 [getSavedFormData] Timestamp dos dados:', new Date(timestamp).toISOString());
      console.log('🔍 [getSavedFormData] Idade dos dados (ms):', age);
      console.log('🔍 [getSavedFormData] Dados recentes (<24h):', age < maxAge);
      
      // Só retornar se os dados forem recentes
      if (age < maxAge) {
        console.log('✅ [getSavedFormData] Dados válidos encontrados!');
        console.log('✅ [getSavedFormData] Nome salvo:', formData?.nome);
        console.log('✅ [getSavedFormData] Campos:', Object.keys(formData || {}).join(', '));
        return formData;
      } else {
        // Limpar dados antigos
        localStorage.removeItem(storageKey);
        console.log('🗑️ [getSavedFormData] Dados antigos removidos do localStorage');
      }
    } else {
      console.log('❌ [getSavedFormData] Nenhum dado encontrado no localStorage');
      // Listar todas as chaves do localStorage para debug
      const allKeys = Object.keys(localStorage).filter(k => k.includes('produto-form'));
      console.log('🔍 [getSavedFormData] Chaves existentes no localStorage:', allKeys);
    }
  } catch (error) {
    console.error('❌ [getSavedFormData] Erro ao ler dados salvos:', error);
  }
  return null;
}

// Função para obter imagens salvas
export function getSavedImagesData(formId: string): any[] | null {
  const imagesKey = `produto-form-images-${formId}`;
  try {
    const saved = localStorage.getItem(imagesKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.images || null;
    }
  } catch (error) {
    console.error('Erro ao ler imagens salvas:', error);
  }
  return null;
}

export function useAutoSaveProdutoForm({ watch, setValue, formId, enabled = true, onRestored }: AutoSaveOptions) {
  const storageKey = `produto-form-autosave-${formId}`;
  const imagesKey = `produto-form-images-${formId}`;
  const isRestoringRef = useRef(false);
  const hasNotifiedRef = useRef(false);
  const onRestoredRef = useRef(onRestored);
  const [hasSavedData, setHasSavedData] = useState(false);
  const [wasRestored, setWasRestored] = useState(false);

  // Manter ref atualizada
  useEffect(() => {
    onRestoredRef.current = onRestored;
  }, [onRestored]);

  // Verificar se há dados salvos e notificar (apenas uma vez)
  useEffect(() => {
    if (!enabled || hasNotifiedRef.current) return;
    
    const savedData = localStorage.getItem(storageKey);
    if (savedData) {
      setHasSavedData(true);
      setWasRestored(true);
      hasNotifiedRef.current = true;
      
      // Notificar que dados foram restaurados
      setTimeout(() => {
        onRestoredRef.current?.();
      }, 500);
      
      console.log('✅ Dados do formulário foram usados do localStorage');
    }
  }, [storageKey, enabled]);

  // Salvar dados automaticamente
  useEffect(() => {
    if (!enabled) return;

    const subscription = watch((formData) => {
      if (isRestoringRef.current) return;
      
      try {
        const dataToSave: SavedFormData = {
          formData,
          timestamp: Date.now()
        };
        localStorage.setItem(storageKey, JSON.stringify(dataToSave));
      } catch (error) {
        console.error('Erro ao salvar dados do formulário:', error);
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, storageKey, enabled]);

  // Função para salvar imagens
  const saveImages = useCallback((images: any[]) => {
    if (!enabled) return;
    try {
      localStorage.setItem(imagesKey, JSON.stringify({
        images,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Erro ao salvar imagens:', error);
    }
  }, [imagesKey, enabled]);

  // Função para recuperar imagens salvas
  const getSavedImages = useCallback((): any[] | null => {
    if (!enabled) return null;
    try {
      const saved = localStorage.getItem(imagesKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.images || null;
      }
    } catch (error) {
      console.error('Erro ao recuperar imagens:', error);
    }
    return null;
  }, [imagesKey, enabled]);

  // Função para limpar dados salvos
  const clearSavedData = useCallback(() => {
    localStorage.removeItem(storageKey);
    localStorage.removeItem(imagesKey);
    setHasSavedData(false);
    hasNotifiedRef.current = false;
  }, [storageKey, imagesKey]);

  // Função para verificar se há dados salvos recentes (menos de 24h)
  const hasRecentSavedData = useCallback((): boolean => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: SavedFormData = JSON.parse(saved);
        const timestamp = parsed.timestamp || 0;
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 horas
        return (now - timestamp) < maxAge;
      }
    } catch {
      return false;
    }
    return false;
  }, [storageKey]);

  return { 
    clearSavedData, 
    hasSavedData, 
    wasRestored,
    saveImages,
    getSavedImages,
    hasRecentSavedData
  };
}
