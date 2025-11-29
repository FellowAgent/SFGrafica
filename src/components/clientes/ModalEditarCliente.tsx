import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ClienteForm } from "./ClienteForm";
import { supabase } from "@/integrations/supabase";
import { Loader2 } from "lucide-react";

interface ModalEditarClienteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente?: any;
  onSalvar?: (cliente: any) => void;
}

export const ModalEditarCliente = ({ open, onOpenChange, cliente, onSalvar }: ModalEditarClienteProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  
  const handleSuccess = async () => {
    setIsUpdating(true);
    
    try {
      // Buscar o cliente atualizado diretamente do banco de dados
      if (cliente?.id) {
        const { data: clienteAtualizado, error } = await supabase
          .from("clientes")
          .select("*")
          .eq("id", cliente.id)
          .single();
        
        if (error) {
          console.error("Erro ao buscar cliente atualizado:", error);
          throw error;
        }
        
        if (clienteAtualizado && onSalvar) {
          // Chamar o callback com os dados atualizados
          onSalvar(clienteAtualizado);
        }
      }
      
      // Pequeno delay para feedback visual antes de fechar
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Fechar o modal
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao atualizar dados:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader tabIndex={-1}>
          <DialogTitle className="text-2xl">
            {cliente ? "Editar Cliente" : "Novo Cliente"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {cliente ? "Formulário para editar informações do cliente" : "Formulário para cadastrar novo cliente"}
          </DialogDescription>
        </DialogHeader>
        
        {isUpdating && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground font-medium">Atualizando dados do cliente...</p>
            </div>
          </div>
        )}
        
        <ClienteForm 
          cliente={cliente}
          onSuccess={handleSuccess}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
};
