import { toast } from "@/hooks/use-toast";

export type ToastType = "success" | "error" | "warning" | "info" | "default";

interface CustomToastOptions {
  title?: string;
  description?: string;
  duration?: number;
}

export function useCustomToast() {
  const showToast = (type: ToastType, options: CustomToastOptions) => {
    const { title, description, duration = 5000 } = options;

    toast({
      title,
      description,
      variant: type === "error" ? "destructive" : type,
      duration,
    });
  };

  return {
    success: (options: CustomToastOptions) => showToast("success", options),
    error: (options: CustomToastOptions) => showToast("error", options),
    warning: (options: CustomToastOptions) => showToast("warning", options),
    info: (options: CustomToastOptions) => showToast("info", options),
    default: (options: CustomToastOptions) => showToast("default", options),
  };
}
