import { useEffect, useRef } from 'react';

interface Atributo {
  id: string;
  nome: string;
  opcoes: string[];
}

interface Variacao {
  id: string;
  combinacao: string;
  codigo: string;
  preco: string;
  estoque: string;
}

interface AutoSaveVariacoesOptions {
  atributos: Atributo[];
  variacoes: Variacao[];
  enabled?: boolean;
}

export function useAutoSaveVariacoes({ atributos, variacoes, enabled = true }: AutoSaveVariacoesOptions) {
  const storageKey = 'produto-form-variacoes-autosave';
  const isInitialMount = useRef(true);

  // Restaurar variações salvas
  const getRestoredData = () => {
    if (!enabled) return { atributos: [], variacoes: [] };

    const savedData = localStorage.getItem(storageKey);
    if (savedData) {
      try {
        return JSON.parse(savedData);
      } catch (error) {
        console.error('Erro ao restaurar variações:', error);
        localStorage.removeItem(storageKey);
      }
    }
    return { atributos: [], variacoes: [] };
  };

  // Salvar variações automaticamente
  useEffect(() => {
    if (!enabled) return;
    
    // Não salvar na montagem inicial
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify({ atributos, variacoes }));
    } catch (error) {
      console.error('Erro ao salvar variações:', error);
    }
  }, [atributos, variacoes, enabled]);

  // Função para limpar dados salvos
  const clearSavedData = () => {
    localStorage.removeItem(storageKey);
  };

  return { getRestoredData, clearSavedData };
}
