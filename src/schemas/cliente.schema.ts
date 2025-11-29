import { z } from "zod";

// Função para validar CPF
const validarCPF = (cpf: string): boolean => {
  const cpfLimpo = cpf.replace(/\D/g, '');
  if (cpfLimpo.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpfLimpo)) return false;
  
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpfLimpo.charAt(i)) * (10 - i);
  }
  let resto = 11 - (soma % 11);
  const digito1 = resto >= 10 ? 0 : resto;
  
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpfLimpo.charAt(i)) * (11 - i);
  }
  resto = 11 - (soma % 11);
  const digito2 = resto >= 10 ? 0 : resto;
  
  return parseInt(cpfLimpo.charAt(9)) === digito1 && parseInt(cpfLimpo.charAt(10)) === digito2;
};

// Função para validar CNPJ
const validarCNPJ = (cnpj: string): boolean => {
  const cnpjLimpo = cnpj.replace(/\D/g, '');
  if (cnpjLimpo.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpjLimpo)) return false;
  
  let tamanho = cnpjLimpo.length - 2;
  let numeros = cnpjLimpo.substring(0, tamanho);
  const digitos = cnpjLimpo.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;
  
  tamanho = tamanho + 1;
  numeros = cnpjLimpo.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  return resultado === parseInt(digitos.charAt(1));
};

export const clienteSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório").max(150, "Nome deve ter no máximo 150 caracteres"),
  tipo: z.enum(["Pessoa Física", "Pessoa Jurídica"]),
  cpf_cnpj: z.string().trim().min(1, "CPF/CNPJ é obrigatório").max(18, "CPF/CNPJ inválido"),
  celular: z.string().trim().min(1, "Celular é obrigatório").max(16, "Celular inválido").refine(
    (val) => {
      const limpo = val.replace(/\D/g, '');
      return limpo.length === 11;
    },
    { message: "Celular inválido. Digite 11 dígitos com DDD (ex: 11 99999-9999)" }
  ),
  email: z.string().trim().email("Email inválido. Digite um email no formato exemplo@dominio.com").max(150, "Email deve ter no máximo 150 caracteres").optional().or(z.literal('')),
  telefone: z.string().trim().max(15, "Telefone inválido").optional().or(z.literal('')).refine(
    (val) => {
      if (!val || val === '') return true;
      const limpo = val.replace(/\D/g, '');
      return limpo.length === 0 || limpo.length === 10;
    },
    { message: "Telefone inválido. Digite 10 dígitos com DDD (ex: 11 9999-9999)" }
  ),
  endereco: z.string().trim().max(150, "Endereço deve ter no máximo 150 caracteres").optional(),
  numero: z.string().trim().max(10, "Número deve ter no máximo 10 caracteres").optional(),
  complemento: z.string().trim().max(50, "Complemento deve ter no máximo 50 caracteres").optional(),
  bairro: z.string().trim().max(80, "Bairro deve ter no máximo 80 caracteres").optional(),
  cidade: z.string().trim().max(100, "Cidade deve ter no máximo 100 caracteres").optional(),
  estado: z.string().trim().max(2, "Estado inválido").optional(),
  cep: z.string().trim().max(9, "CEP inválido. Digite no formato 99999-999").optional().refine(
    (val) => {
      if (!val || val === '') return true;
      const limpo = val.replace(/\D/g, '');
      return limpo.length === 0 || limpo.length === 8;
    },
    { message: "CEP inválido. Digite 8 dígitos no formato 99999-999" }
  ),
  observacoes: z.string().trim().max(2000, "Observações devem ter no máximo 2000 caracteres").optional(),
  ativo: z.boolean().default(true),
  avatar_url: z.string().optional().nullable(),
}).refine(
  (data) => {
    const limpo = data.cpf_cnpj.replace(/\D/g, '');
    if (data.tipo === "Pessoa Física") {
      return limpo.length === 11 && validarCPF(data.cpf_cnpj);
    } else if (data.tipo === "Pessoa Jurídica") {
      return limpo.length === 14 && validarCNPJ(data.cpf_cnpj);
    }
    return false;
  },
  (data) => {
    const limpo = data.cpf_cnpj.replace(/\D/g, '');
    if (data.tipo === "Pessoa Física") {
      if (limpo.length !== 11) {
        return { 
          message: "CPF deve ter 11 dígitos", 
          path: ["cpf_cnpj"] 
        };
      }
      return { 
        message: "CPF inválido. Verifique os dígitos digitados", 
        path: ["cpf_cnpj"] 
      };
    } else {
      if (limpo.length !== 14) {
        return { 
          message: "CNPJ deve ter 14 dígitos", 
          path: ["cpf_cnpj"] 
        };
      }
      return { 
        message: "CNPJ inválido. Verifique os dígitos digitados", 
        path: ["cpf_cnpj"] 
      };
    }
  }
);

export const clienteUpdateSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório").max(150, "Nome deve ter no máximo 150 caracteres").optional(),
  tipo: z.enum(["Pessoa Física", "Pessoa Jurídica"]).optional(),
  cpf_cnpj: z.string().trim().min(1, "CPF/CNPJ é obrigatório").max(18, "CPF/CNPJ inválido").optional(),
  celular: z.string().trim().min(1, "Celular é obrigatório").max(16, "Celular inválido").optional(),
  email: z.string().trim().email("Email inválido").max(150, "Email deve ter no máximo 150 caracteres").optional().or(z.literal('')),
  telefone: z.string().trim().max(15, "Telefone inválido").optional().or(z.literal('')),
  endereco: z.string().trim().max(150, "Endereço deve ter no máximo 150 caracteres").optional(),
  numero: z.string().trim().max(10, "Número deve ter no máximo 10 caracteres").optional(),
  complemento: z.string().trim().max(50, "Complemento deve ter no máximo 50 caracteres").optional(),
  bairro: z.string().trim().max(80, "Bairro deve ter no máximo 80 caracteres").optional(),
  cidade: z.string().trim().max(100, "Cidade deve ter no máximo 100 caracteres").optional(),
  estado: z.string().trim().max(2, "Estado inválido").optional(),
  cep: z.string().trim().max(9, "CEP inválido").optional(),
  observacoes: z.string().trim().max(2000, "Observações devem ter no máximo 2000 caracteres").optional(),
  ativo: z.boolean().optional(),
  avatar_url: z.string().optional().nullable(),
});

export type ClienteInput = z.infer<typeof clienteSchema>;
export type ClienteUpdateInput = z.infer<typeof clienteUpdateSchema>;
