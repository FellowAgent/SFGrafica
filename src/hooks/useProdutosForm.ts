import { useState, useCallback } from "react";

export interface ProdutoItem {
  id: string;
  produtoSelecionado: {
    id: string;
    nome: string;
    codigo: string;
    preco: number;
  } | null;
  buscaProduto: string;
  mostrarSugestoesProduto: boolean;
  quantidade: string;
  medida: string;
  material: string;
  acabamento: string;
  preco: string;
  desconto: string;
}

const criarProdutoVazio = (): ProdutoItem => ({
  id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
  produtoSelecionado: null,
  buscaProduto: "",
  mostrarSugestoesProduto: false,
  quantidade: "1",
  medida: "",
  material: "",
  acabamento: "",
  preco: "",
  desconto: "",
});

export function useProdutosForm() {
  const [produtos, setProdutos] = useState<ProdutoItem[]>([criarProdutoVazio()]);

  const adicionarProduto = useCallback(() => {
    setProdutos((prev) => [...prev, criarProdutoVazio()]);
  }, []);

  const removerProduto = useCallback((id: string) => {
    setProdutos((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const atualizarProduto = useCallback((id: string, campo: keyof ProdutoItem, valor: any) => {
    setProdutos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [campo]: valor } : p))
    );
  }, []);

  const limparProduto = useCallback((id: string) => {
    setProdutos((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              produtoSelecionado: null,
              buscaProduto: "",
              preco: "",
              quantidade: "",
              medida: "",
              material: "",
              acabamento: "",
              desconto: "",
            }
          : p
      )
    );
  }, []);

  const fecharTodosDropdowns = useCallback(() => {
    setProdutos((prev) =>
      prev.map((p) => ({ ...p, mostrarSugestoesProduto: false }))
    );
  }, []);

  return {
    produtos,
    adicionarProduto,
    removerProduto,
    atualizarProduto,
    limparProduto,
    fecharTodosDropdowns,
  };
}
