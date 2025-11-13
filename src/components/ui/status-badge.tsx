import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useStatusConfigContext } from "@/contexts/StatusConfigContext";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { status: statusConfig } = useStatusConfigContext();
  
  // Buscar o status configurado
  const statusItem = statusConfig.find(s => s.nome.toLowerCase() === status.toLowerCase());
  
  // Cores de fallback caso o status não esteja configurado
  const getDefaultStatusClasses = () => {
    const statusLower = status.toLowerCase();
    
    switch (statusLower) {
      case 'finalizado':
      case 'entregue':
        return { bg: '#dcfce7', text: '#16a34a' };
      case 'produção':
      case 'producao':
      case 'em produção':
        return { bg: '#fef3c7', text: '#f59e0b' };
      case 'novo':
      case 'aguardando':
      case 'novo pedido':
        return { bg: '#dbeafe', text: '#3b82f6' };
      case 'entrega':
        return { bg: '#ffedd5', text: '#f97316' };
      case 'cancelado':
        return { bg: '#fee2e2', text: '#dc2626' };
      case 'encaminhar':
        return { bg: '#f5f5dc', text: '#92400e' };
      default:
        return { bg: 'hsl(var(--secondary))', text: 'hsl(var(--secondary-foreground))' };
    }
  };

  const colors = statusItem 
    ? { bg: statusItem.cor, text: statusItem.text_color }
    : getDefaultStatusClasses();

  return (
    <Badge 
      className={cn(
        "justify-center px-4 py-1.5 text-xs font-medium border-0 whitespace-nowrap",
        className
      )}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        borderRadius: '6px'
      }}
    >
      {status}
    </Badge>
  );
}
