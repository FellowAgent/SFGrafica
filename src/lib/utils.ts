import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const isValidUUID = (str: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

export const isValidNumeroPedido = (str: string): boolean => {
  return /^\d+$/.test(str);
};

export const isValidPedidoIdentifier = (str: string): boolean => {
  return isValidUUID(str) || isValidNumeroPedido(str);
};

export const gerarCodigoEntrega = (vendedorNome: string, numeroPedido: string): string => {
  const nomeCompleto = vendedorNome || '';
  const partesNome = nomeCompleto.trim().split(' ').filter(p => p.length > 0);
  
  if (partesNome.length === 0) return 'N/A';
  
  // Pega primeira letra do primeiro nome e primeira letra do último nome
  const iniciais = partesNome.length === 1 
    ? partesNome[0].charAt(0).toUpperCase()
    : `${partesNome[0].charAt(0)}${partesNome[partesNome.length - 1].charAt(0)}`.toUpperCase();
  
  // Gera 3 dígitos sequenciais baseado no número do pedido
  const numeroSequencial = String(parseInt(numeroPedido, 10) % 1000).padStart(3, '0');
  
  return `${iniciais}-${numeroSequencial}`;
};
