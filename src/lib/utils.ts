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
