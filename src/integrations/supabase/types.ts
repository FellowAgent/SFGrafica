export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      alert_configs: {
        Row: {
          acao: string | null
          ativo: boolean | null
          created_at: string | null
          created_by: string | null
          descricao: string | null
          id: string
          nome: string
          notificar_usuarios: string[] | null
          severidade: string | null
          tabela: string | null
          threshold_count: number | null
          threshold_minutes: number | null
          tipo_alerta: string
          updated_at: string | null
          usuarios_monitorados: string[] | null
        }
        Insert: {
          acao?: string | null
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          notificar_usuarios?: string[] | null
          severidade?: string | null
          tabela?: string | null
          threshold_count?: number | null
          threshold_minutes?: number | null
          tipo_alerta: string
          updated_at?: string | null
          usuarios_monitorados?: string[] | null
        }
        Update: {
          acao?: string | null
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          notificar_usuarios?: string[] | null
          severidade?: string | null
          tabela?: string | null
          threshold_count?: number | null
          threshold_minutes?: number | null
          tipo_alerta?: string
          updated_at?: string | null
          usuarios_monitorados?: string[] | null
        }
        Relationships: []
      }
      alert_history: {
        Row: {
          alert_config_id: string | null
          contagem_acoes: number
          detalhes: Json
          disparado_em: string | null
          id: string
          notas: string | null
          periodo_minutos: number
          resolvido: boolean | null
          resolvido_em: string | null
          resolvido_por: string | null
          usuarios_envolvidos: Json | null
        }
        Insert: {
          alert_config_id?: string | null
          contagem_acoes: number
          detalhes: Json
          disparado_em?: string | null
          id?: string
          notas?: string | null
          periodo_minutos: number
          resolvido?: boolean | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          usuarios_envolvidos?: Json | null
        }
        Update: {
          alert_config_id?: string | null
          contagem_acoes?: number
          detalhes?: Json
          disparado_em?: string | null
          id?: string
          notas?: string | null
          periodo_minutos?: number
          resolvido?: boolean | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          usuarios_envolvidos?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_history_alert_config_id_fkey"
            columns: ["alert_config_id"]
            isOneToOne: false
            referencedRelation: "alert_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      asaas_cobrancas: {
        Row: {
          asaas_payment_id: string
          bank_slip_url: string | null
          billing_type: string
          confirmed_date: string | null
          created_at: string | null
          customer_id: string
          due_date: string
          external_reference: string | null
          id: string
          invoice_url: string | null
          payment_date: string | null
          pedido_id: string | null
          pix_copy_paste: string | null
          pix_qrcode: string | null
          status: string
          updated_at: string | null
          value: number
          webhook_events: Json | null
        }
        Insert: {
          asaas_payment_id: string
          bank_slip_url?: string | null
          billing_type: string
          confirmed_date?: string | null
          created_at?: string | null
          customer_id: string
          due_date: string
          external_reference?: string | null
          id?: string
          invoice_url?: string | null
          payment_date?: string | null
          pedido_id?: string | null
          pix_copy_paste?: string | null
          pix_qrcode?: string | null
          status: string
          updated_at?: string | null
          value: number
          webhook_events?: Json | null
        }
        Update: {
          asaas_payment_id?: string
          bank_slip_url?: string | null
          billing_type?: string
          confirmed_date?: string | null
          created_at?: string | null
          customer_id?: string
          due_date?: string
          external_reference?: string | null
          id?: string
          invoice_url?: string | null
          payment_date?: string | null
          pedido_id?: string | null
          pix_copy_paste?: string | null
          pix_qrcode?: string | null
          status?: string
          updated_at?: string | null
          value?: number
          webhook_events?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "asaas_cobrancas_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      asaas_configuracoes: {
        Row: {
          aliquota_iss: number | null
          api_key: string | null
          auto_emit_nf: boolean | null
          created_at: string | null
          empresa_cnpj: string | null
          enabled: boolean | null
          environment: string | null
          id: string
          inscricao_municipal: string | null
          natureza_operacao: string | null
          nf_enabled: boolean | null
          regime_tributario: string | null
          updated_at: string | null
          webhook_token: string | null
        }
        Insert: {
          aliquota_iss?: number | null
          api_key?: string | null
          auto_emit_nf?: boolean | null
          created_at?: string | null
          empresa_cnpj?: string | null
          enabled?: boolean | null
          environment?: string | null
          id?: string
          inscricao_municipal?: string | null
          natureza_operacao?: string | null
          nf_enabled?: boolean | null
          regime_tributario?: string | null
          updated_at?: string | null
          webhook_token?: string | null
        }
        Update: {
          aliquota_iss?: number | null
          api_key?: string | null
          auto_emit_nf?: boolean | null
          created_at?: string | null
          empresa_cnpj?: string | null
          enabled?: boolean | null
          environment?: string | null
          id?: string
          inscricao_municipal?: string | null
          natureza_operacao?: string | null
          nf_enabled?: boolean | null
          regime_tributario?: string | null
          updated_at?: string | null
          webhook_token?: string | null
        }
        Relationships: []
      }
      asaas_customers: {
        Row: {
          asaas_customer_id: string
          cliente_id: string | null
          created_at: string | null
          id: string
          synced_at: string | null
          updated_at: string | null
        }
        Insert: {
          asaas_customer_id: string
          cliente_id?: string | null
          created_at?: string | null
          id?: string
          synced_at?: string | null
          updated_at?: string | null
        }
        Update: {
          asaas_customer_id?: string
          cliente_id?: string | null
          created_at?: string | null
          id?: string
          synced_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asaas_customers_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      asaas_notas_fiscais: {
        Row: {
          asaas_payment_id: string
          created_at: string | null
          emitted_at: string | null
          error_message: string | null
          id: string
          numero: string | null
          pdf_url: string | null
          pedido_id: string | null
          serie: string | null
          status: string
          tipo: string
          updated_at: string | null
          xml_url: string | null
        }
        Insert: {
          asaas_payment_id: string
          created_at?: string | null
          emitted_at?: string | null
          error_message?: string | null
          id?: string
          numero?: string | null
          pdf_url?: string | null
          pedido_id?: string | null
          serie?: string | null
          status: string
          tipo: string
          updated_at?: string | null
          xml_url?: string | null
        }
        Update: {
          asaas_payment_id?: string
          created_at?: string | null
          emitted_at?: string | null
          error_message?: string | null
          id?: string
          numero?: string | null
          pdf_url?: string | null
          pedido_id?: string | null
          serie?: string | null
          status?: string
          tipo?: string
          updated_at?: string | null
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asaas_notas_fiscais_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      asaas_webhook_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_type: string
          id: string
          payload: Json
          processed: boolean | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          payload: Json
          processed?: boolean | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean | null
        }
        Relationships: []
      }
      atributos_variacao: {
        Row: {
          created_at: string | null
          id: string
          nivel: number | null
          nome: string
          ordem: number | null
          pai_id: string | null
          template_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          nivel?: number | null
          nome: string
          ordem?: number | null
          pai_id?: string | null
          template_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nivel?: number | null
          nome?: string
          ordem?: number | null
          pai_id?: string | null
          template_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atributos_variacao_pai_id_fkey"
            columns: ["pai_id"]
            isOneToOne: false
            referencedRelation: "atributos_variacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atributos_variacao_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates_variacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          acao: Database["public"]["Enums"]["audit_action"]
          campos_alterados: string[] | null
          created_at: string | null
          dados_anteriores: Json | null
          dados_novos: Json | null
          id: string
          ip_address: string | null
          registro_id: string
          tabela: string
          timestamp: string
          user_agent: string | null
          usuario_id: string | null
          usuario_nome: string | null
        }
        Insert: {
          acao: Database["public"]["Enums"]["audit_action"]
          campos_alterados?: string[] | null
          created_at?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          ip_address?: string | null
          registro_id: string
          tabela: string
          timestamp?: string
          user_agent?: string | null
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Update: {
          acao?: Database["public"]["Enums"]["audit_action"]
          campos_alterados?: string[] | null
          created_at?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          ip_address?: string | null
          registro_id?: string
          tabela?: string
          timestamp?: string
          user_agent?: string | null
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Relationships: []
      }
      categorias: {
        Row: {
          ativo: boolean | null
          categoria_pai_id: string | null
          created_at: string | null
          descricao: string | null
          id: string
          nivel: number | null
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          categoria_pai_id?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nivel?: number | null
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          categoria_pai_id?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nivel?: number | null
          nome?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categorias_categoria_pai_id_fkey"
            columns: ["categoria_pai_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          ativo: boolean | null
          avatar_url: string | null
          bairro: string | null
          celular: string
          cep: string | null
          cidade: string | null
          complemento: string | null
          cpf_cnpj: string
          created_at: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          numero: string | null
          observacoes: string | null
          telefone: string | null
          tipo: Database["public"]["Enums"]["tipo_cliente"] | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          avatar_url?: string | null
          bairro?: string | null
          celular: string
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf_cnpj: string
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome: string
          numero?: string | null
          observacoes?: string | null
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["tipo_cliente"] | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          avatar_url?: string | null
          bairro?: string | null
          celular?: string
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf_cnpj?: string
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          numero?: string | null
          observacoes?: string | null
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["tipo_cliente"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      comentarios_pedido: {
        Row: {
          comentario: string
          created_at: string | null
          id: string
          pedido_id: string
          usuario_id: string | null
        }
        Insert: {
          comentario: string
          created_at?: string | null
          id?: string
          pedido_id: string
          usuario_id?: string | null
        }
        Update: {
          comentario?: string
          created_at?: string | null
          id?: string
          pedido_id?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comentarios_pedido_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comentarios_pedido_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes: {
        Row: {
          chave: string
          created_at: string | null
          descricao: string | null
          id: string
          tipo: string | null
          updated_at: string | null
          valor: string | null
        }
        Insert: {
          chave: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          tipo?: string | null
          updated_at?: string | null
          valor?: string | null
        }
        Update: {
          chave?: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          tipo?: string | null
          updated_at?: string | null
          valor?: string | null
        }
        Relationships: []
      }
      deployment_targets: {
        Row: {
          created_at: string | null
          current_version: string | null
          description: string | null
          id: string
          last_sync_at: string | null
          name: string
          status: string | null
          supabase_url: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_version?: string | null
          description?: string | null
          id?: string
          last_sync_at?: string | null
          name: string
          status?: string | null
          supabase_url: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_version?: string | null
          description?: string | null
          id?: string
          last_sync_at?: string | null
          name?: string
          status?: string | null
          supabase_url?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      etiquetas: {
        Row: {
          cor: string
          created_at: string | null
          id: string
          nome: string
        }
        Insert: {
          cor: string
          created_at?: string | null
          id?: string
          nome: string
        }
        Update: {
          cor?: string
          created_at?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      funcionarios_fluxo: {
        Row: {
          ativo: boolean
          created_at: string | null
          id: string
          ordem: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string | null
          id?: string
          ordem?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string | null
          id?: string
          ordem?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      itens_pedido: {
        Row: {
          created_at: string | null
          desconto: number | null
          id: string
          observacoes: string | null
          pedido_id: string
          preco_unitario: number
          produto_id: string | null
          quantidade: number
          subtotal: number
          unidade_medida: string | null
          variacao_id: string | null
        }
        Insert: {
          created_at?: string | null
          desconto?: number | null
          id?: string
          observacoes?: string | null
          pedido_id: string
          preco_unitario: number
          produto_id?: string | null
          quantidade: number
          subtotal: number
          unidade_medida?: string | null
          variacao_id?: string | null
        }
        Update: {
          created_at?: string | null
          desconto?: number | null
          id?: string
          observacoes?: string | null
          pedido_id?: string
          preco_unitario?: number
          produto_id?: string | null
          quantidade?: number
          subtotal?: number
          unidade_medida?: string | null
          variacao_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itens_pedido_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_pedido_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_pedido_variacao_id_fkey"
            columns: ["variacao_id"]
            isOneToOne: false
            referencedRelation: "variacoes_produto"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_backups: {
        Row: {
          backup_location: string
          backup_type: string | null
          can_restore: boolean | null
          created_at: string | null
          created_by: string | null
          data_checksum: string | null
          id: string
          migration_id: string | null
          notes: string | null
          schema_checksum: string | null
          size_bytes: number | null
        }
        Insert: {
          backup_location: string
          backup_type?: string | null
          can_restore?: boolean | null
          created_at?: string | null
          created_by?: string | null
          data_checksum?: string | null
          id?: string
          migration_id?: string | null
          notes?: string | null
          schema_checksum?: string | null
          size_bytes?: number | null
        }
        Update: {
          backup_location?: string
          backup_type?: string | null
          can_restore?: boolean | null
          created_at?: string | null
          created_by?: string | null
          data_checksum?: string | null
          id?: string
          migration_id?: string | null
          notes?: string | null
          schema_checksum?: string | null
          size_bytes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "migration_backups_migration_id_fkey"
            columns: ["migration_id"]
            isOneToOne: false
            referencedRelation: "migration_history"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_history: {
        Row: {
          backup_id: string | null
          can_rollback: boolean | null
          checksum_after: string | null
          checksum_before: string | null
          created_at: string | null
          dry_run_passed: boolean | null
          duration_ms: number | null
          error_message: string | null
          executed_at: string | null
          executed_by: string | null
          file_name: string | null
          id: string
          method: string
          migration_name: string
          operations_failed: number | null
          operations_successful: number | null
          operations_total: number | null
          rollback_at: string | null
          rollback_executed: boolean | null
          rollback_sql: string | null
          schema_version_after: string | null
          schema_version_before: string | null
          sql_content: string
          status: string
          updated_at: string | null
        }
        Insert: {
          backup_id?: string | null
          can_rollback?: boolean | null
          checksum_after?: string | null
          checksum_before?: string | null
          created_at?: string | null
          dry_run_passed?: boolean | null
          duration_ms?: number | null
          error_message?: string | null
          executed_at?: string | null
          executed_by?: string | null
          file_name?: string | null
          id?: string
          method: string
          migration_name: string
          operations_failed?: number | null
          operations_successful?: number | null
          operations_total?: number | null
          rollback_at?: string | null
          rollback_executed?: boolean | null
          rollback_sql?: string | null
          schema_version_after?: string | null
          schema_version_before?: string | null
          sql_content: string
          status: string
          updated_at?: string | null
        }
        Update: {
          backup_id?: string | null
          can_rollback?: boolean | null
          checksum_after?: string | null
          checksum_before?: string | null
          created_at?: string | null
          dry_run_passed?: boolean | null
          duration_ms?: number | null
          error_message?: string | null
          executed_at?: string | null
          executed_by?: string | null
          file_name?: string | null
          id?: string
          method?: string
          migration_name?: string
          operations_failed?: number | null
          operations_successful?: number | null
          operations_total?: number | null
          rollback_at?: string | null
          rollback_executed?: boolean | null
          rollback_sql?: string | null
          schema_version_after?: string | null
          schema_version_before?: string | null
          sql_content?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "migration_history_backup_id_fkey"
            columns: ["backup_id"]
            isOneToOne: false
            referencedRelation: "migration_backups"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_safety_config: {
        Row: {
          allow_destructive_ops: boolean | null
          auto_rollback_on_error: boolean | null
          backup_retention_days: number | null
          created_at: string | null
          id: string
          max_affected_rows: number | null
          require_backup: boolean | null
          require_double_confirmation: boolean | null
          require_dry_run: boolean | null
          updated_at: string | null
        }
        Insert: {
          allow_destructive_ops?: boolean | null
          auto_rollback_on_error?: boolean | null
          backup_retention_days?: number | null
          created_at?: string | null
          id?: string
          max_affected_rows?: number | null
          require_backup?: boolean | null
          require_double_confirmation?: boolean | null
          require_dry_run?: boolean | null
          updated_at?: string | null
        }
        Update: {
          allow_destructive_ops?: boolean | null
          auto_rollback_on_error?: boolean | null
          backup_retention_days?: number | null
          created_at?: string | null
          id?: string
          max_affected_rows?: number | null
          require_backup?: boolean | null
          require_double_confirmation?: boolean | null
          require_dry_run?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          created_at: string | null
          id: string
          lida: boolean | null
          link: string | null
          mensagem: string
          tipo: string
          titulo: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          lida?: boolean | null
          link?: string | null
          mensagem: string
          tipo: string
          titulo: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          lida?: boolean | null
          link?: string | null
          mensagem?: string
          tipo?: string
          titulo?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      opcoes_variacao: {
        Row: {
          ativo: boolean | null
          atributo_id: string
          codigo_barras: string | null
          created_at: string | null
          estoque: number | null
          id: string
          imagem_url: string | null
          nome: string
          ordem: number | null
          sku: string | null
          updated_at: string | null
          valor_adicional: number | null
        }
        Insert: {
          ativo?: boolean | null
          atributo_id: string
          codigo_barras?: string | null
          created_at?: string | null
          estoque?: number | null
          id?: string
          imagem_url?: string | null
          nome: string
          ordem?: number | null
          sku?: string | null
          updated_at?: string | null
          valor_adicional?: number | null
        }
        Update: {
          ativo?: boolean | null
          atributo_id?: string
          codigo_barras?: string | null
          created_at?: string | null
          estoque?: number | null
          id?: string
          imagem_url?: string | null
          nome?: string
          ordem?: number | null
          sku?: string | null
          updated_at?: string | null
          valor_adicional?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "opcoes_variacao_atributo_id_fkey"
            columns: ["atributo_id"]
            isOneToOne: false
            referencedRelation: "atributos_variacao"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          cliente_id: string | null
          codigo_retirada: string | null
          created_at: string | null
          data_entrega: string | null
          desconto_total: number | null
          gerar_nf: boolean | null
          id: string
          meio_pagamento: string | null
          numero_pedido: string
          observacoes: string | null
          pago: boolean | null
          prazo_entrega: string | null
          status: string | null
          tipo_retirada: Database["public"]["Enums"]["tipo_retirada"] | null
          total: number | null
          unidade_prazo: Database["public"]["Enums"]["unidade_prazo"] | null
          updated_at: string | null
          valor_final: number | null
          vendedor_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          codigo_retirada?: string | null
          created_at?: string | null
          data_entrega?: string | null
          desconto_total?: number | null
          gerar_nf?: boolean | null
          id?: string
          meio_pagamento?: string | null
          numero_pedido: string
          observacoes?: string | null
          pago?: boolean | null
          prazo_entrega?: string | null
          status?: string | null
          tipo_retirada?: Database["public"]["Enums"]["tipo_retirada"] | null
          total?: number | null
          unidade_prazo?: Database["public"]["Enums"]["unidade_prazo"] | null
          updated_at?: string | null
          valor_final?: number | null
          vendedor_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          codigo_retirada?: string | null
          created_at?: string | null
          data_entrega?: string | null
          desconto_total?: number | null
          gerar_nf?: boolean | null
          id?: string
          meio_pagamento?: string | null
          numero_pedido?: string
          observacoes?: string | null
          pago?: boolean | null
          prazo_entrega?: string | null
          status?: string | null
          tipo_retirada?: Database["public"]["Enums"]["tipo_retirada"] | null
          total?: number | null
          unidade_prazo?: Database["public"]["Enums"]["unidade_prazo"] | null
          updated_at?: string | null
          valor_final?: number | null
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_etiquetas: {
        Row: {
          etiqueta_id: string
          pedido_id: string
        }
        Insert: {
          etiqueta_id: string
          pedido_id: string
        }
        Update: {
          etiqueta_id?: string
          pedido_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_etiquetas_etiqueta_id_fkey"
            columns: ["etiqueta_id"]
            isOneToOne: false
            referencedRelation: "etiquetas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_etiquetas_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis: {
        Row: {
          ativo: boolean | null
          avatar_url: string | null
          celular: string | null
          created_at: string | null
          email: string | null
          id: string
          mostrar_filtros_clientes: boolean | null
          nome: string
          nome_exibicao_pedidos: string | null
          preferencia_visualizacao_clientes: string | null
          preferencias_pedidos_tab: Json | null
          preferencias_variacoes: Json | null
          relatorios_layout: Json | null
          tema: string | null
          updated_at: string | null
          username: string
        }
        Insert: {
          ativo?: boolean | null
          avatar_url?: string | null
          celular?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          mostrar_filtros_clientes?: boolean | null
          nome: string
          nome_exibicao_pedidos?: string | null
          preferencia_visualizacao_clientes?: string | null
          preferencias_pedidos_tab?: Json | null
          preferencias_variacoes?: Json | null
          relatorios_layout?: Json | null
          tema?: string | null
          updated_at?: string | null
          username: string
        }
        Update: {
          ativo?: boolean | null
          avatar_url?: string | null
          celular?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          mostrar_filtros_clientes?: boolean | null
          nome?: string
          nome_exibicao_pedidos?: string | null
          preferencia_visualizacao_clientes?: string | null
          preferencias_pedidos_tab?: Json | null
          preferencias_variacoes?: Json | null
          relatorios_layout?: Json | null
          tema?: string | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      produtos: {
        Row: {
          arte_final_acabamentos: string | null
          ativo: boolean | null
          categoria_id: string | null
          cest: string | null
          cfop: string | null
          codigo_barras: string | null
          codigo_servico: string | null
          cofins_aliquota: number | null
          cofins_cst: string | null
          created_at: string | null
          custo: number | null
          desconto: number | null
          descricao: string | null
          descricao_complementar: string | null
          descricao_curta: string | null
          estoque: number | null
          estoque_minimo: number | null
          icms_aliquota: number | null
          icms_cst: string | null
          id: string
          imagem_url: string | null
          imagens: string[] | null
          iss_aliquota: number | null
          material: string | null
          medidas: string | null
          ncm: string | null
          nome: string
          observacoes: string | null
          origem: string | null
          pis_aliquota: number | null
          pis_cst: string | null
          preco: number | null
          quantidade: string | null
          tags: string[] | null
          tipo_desconto: string | null
          unidade_medida: string | null
          updated_at: string | null
        }
        Insert: {
          arte_final_acabamentos?: string | null
          ativo?: boolean | null
          categoria_id?: string | null
          cest?: string | null
          cfop?: string | null
          codigo_barras?: string | null
          codigo_servico?: string | null
          cofins_aliquota?: number | null
          cofins_cst?: string | null
          created_at?: string | null
          custo?: number | null
          desconto?: number | null
          descricao?: string | null
          descricao_complementar?: string | null
          descricao_curta?: string | null
          estoque?: number | null
          estoque_minimo?: number | null
          icms_aliquota?: number | null
          icms_cst?: string | null
          id?: string
          imagem_url?: string | null
          imagens?: string[] | null
          iss_aliquota?: number | null
          material?: string | null
          medidas?: string | null
          ncm?: string | null
          nome: string
          observacoes?: string | null
          origem?: string | null
          pis_aliquota?: number | null
          pis_cst?: string | null
          preco?: number | null
          quantidade?: string | null
          tags?: string[] | null
          tipo_desconto?: string | null
          unidade_medida?: string | null
          updated_at?: string | null
        }
        Update: {
          arte_final_acabamentos?: string | null
          ativo?: boolean | null
          categoria_id?: string | null
          cest?: string | null
          cfop?: string | null
          codigo_barras?: string | null
          codigo_servico?: string | null
          cofins_aliquota?: number | null
          cofins_cst?: string | null
          created_at?: string | null
          custo?: number | null
          desconto?: number | null
          descricao?: string | null
          descricao_complementar?: string | null
          descricao_curta?: string | null
          estoque?: number | null
          estoque_minimo?: number | null
          icms_aliquota?: number | null
          icms_cst?: string | null
          id?: string
          imagem_url?: string | null
          imagens?: string[] | null
          iss_aliquota?: number | null
          material?: string | null
          medidas?: string | null
          ncm?: string | null
          nome?: string
          observacoes?: string | null
          origem?: string | null
          pis_aliquota?: number | null
          pis_cst?: string | null
          preco?: number | null
          quantidade?: string | null
          tags?: string[] | null
          tipo_desconto?: string | null
          unidade_medida?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos_categorias: {
        Row: {
          categoria_id: string
          created_at: string | null
          id: string
          produto_id: string
        }
        Insert: {
          categoria_id: string
          created_at?: string | null
          id?: string
          produto_id: string
        }
        Update: {
          categoria_id?: string
          created_at?: string | null
          id?: string
          produto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_categorias_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_categorias_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      schema_drift_logs: {
        Row: {
          actual_checksum: string | null
          detected_at: string | null
          differences: Json | null
          expected_checksum: string | null
          expected_version: string | null
          id: string
          notes: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          actual_checksum?: string | null
          detected_at?: string | null
          differences?: Json | null
          expected_checksum?: string | null
          expected_version?: string | null
          id?: string
          notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          actual_checksum?: string | null
          detected_at?: string | null
          differences?: Json | null
          expected_checksum?: string | null
          expected_version?: string | null
          id?: string
          notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: []
      }
      schema_versions: {
        Row: {
          applied_at: string | null
          applied_by: string | null
          checksum: string
          created_at: string | null
          description: string | null
          id: string
          is_current: boolean | null
          schema_snapshot: Json | null
          updated_at: string | null
          version: string
        }
        Insert: {
          applied_at?: string | null
          applied_by?: string | null
          checksum: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_current?: boolean | null
          schema_snapshot?: Json | null
          updated_at?: string | null
          version: string
        }
        Update: {
          applied_at?: string | null
          applied_by?: string | null
          checksum?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_current?: boolean | null
          schema_snapshot?: Json | null
          updated_at?: string | null
          version?: string
        }
        Relationships: []
      }
      status_pedidos_config: {
        Row: {
          ativo: boolean | null
          cor: string
          created_at: string | null
          id: string
          nome: string
          ordem: number | null
          text_color: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cor: string
          created_at?: string | null
          id?: string
          nome: string
          ordem?: number | null
          text_color?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cor?: string
          created_at?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          text_color?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      supabase_config: {
        Row: {
          config_source: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          project_id: string
          supabase_url: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          config_source?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          project_id: string
          supabase_url: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          config_source?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          project_id?: string
          supabase_url?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      templates_variacoes: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          ordem: number | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      unidades_medida: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          ordem: number
          sigla: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          ordem?: number
          sigla: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          sigla?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          created_at: string | null
          enabled: boolean
          id: string
          permission_key: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean
          id?: string
          permission_key: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean
          id?: string
          permission_key?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      variacoes_produto: {
        Row: {
          ativo: boolean | null
          codigo_barras: string | null
          created_at: string | null
          estoque: number | null
          id: string
          imagem_url: string | null
          nome: string
          opcao_variacao_id: string | null
          produto_id: string
          sku: string | null
          template_id: string | null
          updated_at: string | null
          valor_adicional: number | null
        }
        Insert: {
          ativo?: boolean | null
          codigo_barras?: string | null
          created_at?: string | null
          estoque?: number | null
          id?: string
          imagem_url?: string | null
          nome: string
          opcao_variacao_id?: string | null
          produto_id: string
          sku?: string | null
          template_id?: string | null
          updated_at?: string | null
          valor_adicional?: number | null
        }
        Update: {
          ativo?: boolean | null
          codigo_barras?: string | null
          created_at?: string | null
          estoque?: number | null
          id?: string
          imagem_url?: string | null
          nome?: string
          opcao_variacao_id?: string | null
          produto_id?: string
          sku?: string | null
          template_id?: string | null
          updated_at?: string | null
          valor_adicional?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "variacoes_produto_opcao_variacao_id_fkey"
            columns: ["opcao_variacao_id"]
            isOneToOne: false
            referencedRelation: "opcoes_variacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variacoes_produto_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variacoes_produto_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates_variacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      variacoes_produtos: {
        Row: {
          ativo: boolean | null
          codigo_barras: string | null
          combinacao: Json
          created_at: string | null
          estoque_atual: number | null
          id: string
          imagem_url: string | null
          nome: string
          preco_venda: number | null
          sku: string | null
          template_id: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          codigo_barras?: string | null
          combinacao: Json
          created_at?: string | null
          estoque_atual?: number | null
          id?: string
          imagem_url?: string | null
          nome: string
          preco_venda?: number | null
          sku?: string | null
          template_id: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          codigo_barras?: string | null
          combinacao?: Json
          created_at?: string | null
          estoque_atual?: number | null
          id?: string
          imagem_url?: string | null
          nome?: string
          preco_venda?: number | null
          sku?: string | null
          template_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "variacoes_produtos_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates_variacoes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_master_role: { Args: { p_user_id: string }; Returns: undefined }
      create_master_user: {
        Args: { p_email: string; p_password: string }
        Returns: string
      }
      exec_sql: { Args: { sql_query: string }; Returns: Json }
      exec_sql_query: { Args: { sql_query: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "master" | "financeiro" | "vendedor"
      audit_action: "INSERT" | "UPDATE" | "DELETE"
      tipo_cliente: "Pessoa Física" | "Pessoa Jurídica"
      tipo_retirada: "balcao" | "entrega"
      unidade_prazo: "imediatamente" | "minutos" | "horas" | "dias" | "semanas"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["master", "financeiro", "vendedor"],
      audit_action: ["INSERT", "UPDATE", "DELETE"],
      tipo_cliente: ["Pessoa Física", "Pessoa Jurídica"],
      tipo_retirada: ["balcao", "entrega"],
      unidade_prazo: ["imediatamente", "minutos", "horas", "dias", "semanas"],
    },
  },
} as const
