export type AsaasBillingType = 'BOLETO' | 'PIX' | 'CREDIT_CARD' | 'UNDEFINED';

export type AsaasPaymentStatus = 
  | 'PENDING' 
  | 'RECEIVED' 
  | 'CONFIRMED' 
  | 'OVERDUE' 
  | 'REFUNDED' 
  | 'RECEIVED_IN_CASH' 
  | 'REFUND_REQUESTED'
  | 'CANCELED';

export type AsaasEnvironment = 'sandbox' | 'production';

export interface AsaasConfig {
  id: string;
  api_key: string | null;
  environment: AsaasEnvironment;
  webhook_token: string;
  auto_emit_nf: boolean;
  nf_enabled: boolean;
  empresa_cnpj: string | null;
  inscricao_municipal: string | null;
  regime_tributario: string | null;
  natureza_operacao: string | null;
  aliquota_iss: number | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface AsaasCobranca {
  id: string;
  pedido_id: string;
  asaas_payment_id: string;
  customer_id: string;
  billing_type: AsaasBillingType;
  status: AsaasPaymentStatus;
  value: number;
  due_date: string;
  invoice_url?: string;
  bank_slip_url?: string;
  pix_qrcode?: string;
  pix_copy_paste?: string;
  payment_date?: string;
  confirmed_date?: string;
  external_reference?: string;
  webhook_events: any[];
  created_at: string;
  updated_at: string;
}

export interface AsaasCustomer {
  id: string;
  cliente_id: string;
  asaas_customer_id: string;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface AsaasNotaFiscal {
  id: string;
  pedido_id: string;
  asaas_payment_id: string;
  tipo: 'NFE' | 'NFSE';
  numero?: string;
  serie?: string;
  xml_url?: string;
  pdf_url?: string;
  status: string;
  error_message?: string;
  emitted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentInput {
  pedidoId: string;
  billingType: AsaasBillingType;
  dueDate: string;
  description?: string;
  externalReference?: string;
  creditCard?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  creditCardHolderInfo?: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    phone: string;
  };
  installmentCount?: number;
}

export interface AsaasConfigFormData {
  api_key: string;
  environment: AsaasEnvironment;
  enabled: boolean;
  auto_emit_nf: boolean;
  nf_enabled: boolean;
  empresa_cnpj?: string;
  inscricao_municipal?: string;
  regime_tributario?: string;
  natureza_operacao?: string;
  aliquota_iss?: number;
}
