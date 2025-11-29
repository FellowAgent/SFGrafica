/**
 * Helper para facilitar o uso do sistema de toast modernizado
 * Compatível com sintaxe antiga do Sonner
 */
import { toast as modernToast } from "@/hooks/use-toast";

interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
}

const getDefaultDuration = () => {
  const saved = localStorage.getItem('toastDuration');
  return saved ? parseInt(saved) : 4000;
};

export const toast = {
  success: (message: string | ToastOptions, options?: ToastOptions) => {
    if (typeof message === "string") {
      modernToast({ 
        title: options?.title || "Sucesso", 
        description: options?.description || message, 
        variant: "success",
        duration: options?.duration || getDefaultDuration()
      });
    } else {
      modernToast({ 
        title: message.title || "Sucesso", 
        description: message.description, 
        variant: "success",
        duration: message.duration || getDefaultDuration()
      });
    }
  },
  
  error: (message: string | ToastOptions, options?: ToastOptions) => {
    if (typeof message === "string") {
      modernToast({ 
        title: options?.title || "Erro", 
        description: options?.description || message, 
        variant: "destructive",
        duration: options?.duration || getDefaultDuration()
      });
    } else {
      modernToast({ 
        title: message.title || "Erro", 
        description: message.description, 
        variant: "destructive",
        duration: message.duration || getDefaultDuration()
      });
    }
  },
  
  info: (message: string | ToastOptions, options?: ToastOptions) => {
    if (typeof message === "string") {
      modernToast({ 
        title: options?.title || "Informação", 
        description: options?.description || message, 
        variant: "info",
        duration: options?.duration || getDefaultDuration()
      });
    } else {
      modernToast({ 
        title: message.title || "Informação", 
        description: message.description, 
        variant: "info",
        duration: message.duration || getDefaultDuration()
      });
    }
  },
  
  warning: (message: string | ToastOptions, options?: ToastOptions) => {
    if (typeof message === "string") {
      modernToast({ 
        title: options?.title || "Aviso", 
        description: options?.description || message, 
        variant: "warning",
        duration: options?.duration || getDefaultDuration()
      });
    } else {
      modernToast({ 
        title: message.title || "Aviso", 
        description: message.description, 
        variant: "warning",
        duration: message.duration || getDefaultDuration()
      });
    }
  }
};
