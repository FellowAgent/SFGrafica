import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, duration, ...props }, index) {
        return (
          <Toast 
            key={id} 
            {...props} 
            showIcon={true} 
            showProgress={true} 
            duration={duration || 4000}
            className={index > 0 ? "animate-toast-stack-slide" : ""}
            style={{
              marginBottom: index === toasts.length - 1 ? 0 : '8px'
            }}
          >
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
