/**
 * Utilitários para máscaras de entrada de dados
 */

/**
 * Formata valor monetário (R$) em tempo real
 * Formato brasileiro: 1.234,56
 * Limite: 10 dígitos (99.999.999,99)
 */
export const formatCurrency = (value: string): string => {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '');
  
  // Limita a 10 dígitos (99.999.999,99)
  const limited = numbers.slice(0, 10);
  
  if (!limited) return '';
  
  // Converte para centavos
  const cents = parseInt(limited);
  const reais = cents / 100;
  
  return reais.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Formata valor monetário exibindo o símbolo do Real
 * Aceita string ou número como entrada
 */
export const formatCurrencyWithSymbol = (value: string | number | null | undefined): string => {
  const numericValue = parseCurrencyToNumber(value);

  return `R$ ${numericValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Converte valor formatado brasileiro para número
 */
export const parseCurrencyToNumber = (formattedValue: string | number | null | undefined): number => {
  if (formattedValue === null || formattedValue === undefined) return 0;
  
  if (typeof formattedValue === 'number') {
    if (Number.isNaN(formattedValue)) {
      return 0;
    }
    return Math.min(Math.max(Number(formattedValue.toFixed(2)), 0), 99999999.99);
  }
  
  if (!formattedValue) return 0;
  
  // Remove tudo exceto números
  const numbers = formattedValue.replace(/\D/g, '');
  
  if (!numbers) return 0;
  
  // Limita a 10 dígitos (99.999.999,99)
  const limited = numbers.slice(0, 10);
  
  // Divide por 100 para obter o valor em reais
  const result = parseInt(limited) / 100;
  
  // Garante que não exceda o limite máximo
  return Math.min(result, 99999999.99);
};

/**
 * Formata porcentagem
 * Suporta até 3 dígitos inteiros e 2 decimais (999,99)
 */
export const formatPercentage = (value: string | number): string => {
  if (typeof value === 'number') {
    if (Number.isNaN(value)) {
      return '';
    }
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' %';
  }

  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '');
  
  // Limita a 5 dígitos (3 inteiros + 2 decimais)
  const limited = numbers.slice(0, 5);
  
  if (!limited) return '';
  
  // Converte para decimal
  const cents = parseInt(limited);
  const percentage = cents / 100;
  
  return percentage.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' %';
};

/**
 * Converte percentual formatado para número decimal
 */
export const parsePercentageToNumber = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined) return 0;

  if (typeof value === 'number') {
    return Number.isNaN(value) ? 0 : Number(value.toFixed(2));
  }

  const numbers = value.replace(/\D/g, '').slice(0, 5);

  if (!numbers) return 0;

  const cents = parseInt(numbers, 10);
  return Math.min(cents / 100, 999.99);
};

/**
 * Formata entrada numérica (apenas números)
 */
export const formatNumeric = (value: string, maxLength: number): string => {
  return value.replace(/\D/g, '').slice(0, maxLength);
};

/**
 * Limita texto ao tamanho máximo
 */
export const limitText = (value: string, maxLength: number): string => {
  return value.slice(0, maxLength);
};

/**
 * Extrai valor numérico de string formatada (moeda/porcentagem)
 */
export const extractNumericValue = (formattedValue: string): number => {
  const numbers = formattedValue.replace(/\D/g, '');
  return numbers ? parseInt(numbers) / 100 : 0;
};

/**
 * Formata número para exibição em Real Brasileiro (R$)
 * Uso: formatBRL(1234.56) => "R$ 1.234,56"
 */
export const formatBRL = (value: number | string | null | undefined): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (numValue === null || numValue === undefined || isNaN(numValue)) {
    return 'R$ 0,00';
  }
  
  return numValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Formata número de celular para formato brasileiro (99) 99999-9999
 * Suporta também telefone fixo (99) 9999-9999
 */
export const formatCelular = (celular: string | null | undefined): string => {
  if (!celular) return "";
  
  // Remove all non-numeric characters
  const digits = celular.replace(/\D/g, "");
  
  // Format as (99) 99999-9999
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  
  // If it's 10 digits, format as (99) 9999-9999
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  
  // Return as-is if it doesn't match expected lengths
  return celular;
};
