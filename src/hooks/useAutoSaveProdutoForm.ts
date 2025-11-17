import { useEffect, useRef } from 'react';
import { UseFormWatch, UseFormSetValue } from 'react-hook-form';

interface AutoSaveOptions {
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
  formId: string;
  enabled?: boolean;
}

export function useAutoSaveProdutoForm({ watch, setValue, formId, enabled = true }: AutoSaveOptions) {
  const storageKey = `produto-form-autosave-${formId}`;
  const isRestoringRef = useRef(false);

  // Restaurar dados salvos ao montar
  useEffect(() => {
    if (!enabled) return;

    const savedData = localStorage.getItem(storageKey);
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        isRestoringRef.current = true;
        
        Object.keys(parsedData).forEach((key) => {
          setValue(key, parsedData[key], { shouldValidate: false });
        });
        
        setTimeout(() => {
          isRestoringRef.current = false;
        }, 100);
      } catch (error) {
        console.error('Erro ao restaurar dados do formulário:', error);
        localStorage.removeItem(storageKey);
      }
    }
  }, [storageKey, setValue, enabled]);

  // Salvar dados automaticamente
  useEffect(() => {
    if (!enabled) return;

    const subscription = watch((formData) => {
      if (isRestoringRef.current) return;
      
      try {
        localStorage.setItem(storageKey, JSON.stringify(formData));
      } catch (error) {
        console.error('Erro ao salvar dados do formulário:', error);
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, storageKey, enabled]);

  // Função para limpar dados salvos
  const clearSavedData = () => {
    localStorage.removeItem(storageKey);
  };

  return { clearSavedData };
}
