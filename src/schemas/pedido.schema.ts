import { z } from "zod";

export const clienteSchema = z.object({
  id: z.string(),
  nome: z.string().trim().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  celular: z.string().trim().min(1, "Celular é obrigatório"),
  cpf: z.string().trim().min(1, "CPF/CNPJ é obrigatório"),
  email: z.string().trim().email("Email inválido").max(255, "Email muito longo"),
});

export const produtoItemSchema = z.object({
  id: z.string(),
  produtoSelecionado: z.object({
    id: z.string(),
    nome: z.string(),
    codigo: z.string(),
    preco: z.number(),
  }).nullable(),
  buscaProduto: z.string(),
  quantidade: z.string(),
  medida: z.string(),
  material: z.string(),
  acabamento: z.string(),
  preco: z.string(),
  desconto: z.string(),
});

export const novoPedidoSchema = z.object({
  cliente: clienteSchema,
  produtos: z.array(produtoItemSchema).min(1, "Adicione pelo menos um produto"),
  tipoRetirada: z.enum(["balcao", "entrega"]),
  prazoEntrega: z.string().optional(),
  unidadePrazo: z.enum(["imediatamente", "minutos", "horas", "dias", "semanas"]),
  codigoRetirada: z.string().optional(),
  observacoes: z.string().max(1000, "Observações muito longas").optional(),
});

export type ClienteType = z.infer<typeof clienteSchema>;
export type ProdutoItemType = z.infer<typeof produtoItemSchema>;
export type NovoPedidoType = z.infer<typeof novoPedidoSchema>;
