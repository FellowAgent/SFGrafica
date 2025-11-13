import { useState, useEffect } from "react";
import { Database, Cloud, Server, Wifi, WifiOff } from "lucide-react";
import { supabase } from "@/integrations/supabase";
import { cn } from "@/lib/utils";

export function DatabaseStatusIndicator() {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  const isCloud = import.meta.env.VITE_SUPABASE_URL?.includes('supabase.co');

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const checkConnection = async () => {
    try {
      const { error } = await supabase.from('perfis').select('id', { count: 'exact', head: true });
      setIsOnline(!error);
    } catch {
      setIsOnline(false);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div
        className={cn(
          "group relative flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg transition-all duration-300 cursor-pointer",
          "backdrop-blur-md border",
          isOnline === null || isChecking
            ? "bg-muted/80 border-muted-foreground/20"
            : isOnline
            ? "bg-green-500/10 border-green-500/30 hover:bg-green-500/20"
            : "bg-destructive/10 border-destructive/30 hover:bg-destructive/20"
        )}
      >
        {/* Status Icon with pulse animation */}
        <div className="relative">
          <div
            className={cn(
              "w-3 h-3 rounded-full transition-all duration-300",
              isOnline === null || isChecking
                ? "bg-muted-foreground animate-pulse"
                : isOnline
                ? "bg-green-500 animate-pulse"
                : "bg-destructive"
            )}
          />
          {isOnline && (
            <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-500 animate-ping opacity-75" />
          )}
        </div>

        {/* Database Icon */}
        <Database
          className={cn(
            "w-4 h-4 transition-colors",
            isOnline === null || isChecking
              ? "text-muted-foreground"
              : isOnline
              ? "text-green-600 dark:text-green-400"
              : "text-destructive"
          )}
        />

        {/* Status Text */}
        <div className="flex flex-col">
          <span
            className={cn(
              "text-xs font-semibold leading-none transition-colors",
              isOnline === null || isChecking
                ? "text-muted-foreground"
                : isOnline
                ? "text-green-700 dark:text-green-300"
                : "text-destructive"
            )}
          >
            {isChecking ? "Verificando..." : isOnline ? "Online" : "Offline"}
          </span>
          <span className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
            {isCloud ? (
              <>
                <Cloud className="w-3 h-3" />
                Supabase Cloud
              </>
            ) : (
              <>
                <Server className="w-3 h-3" />
                Self-Hosted
              </>
            )}
          </span>
        </div>

        {/* Connection Icon */}
        {isOnline !== null && !isChecking && (
          <div className="ml-1">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-green-600 dark:text-green-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-destructive" />
            )}
          </div>
        )}

        {/* Tooltip on hover */}
        <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-popover text-popover-foreground text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap border">
          <div className="space-y-1">
            <div className="font-semibold">Status do Banco de Dados</div>
            <div className="text-muted-foreground">
              {isChecking
                ? "Verificando conexão..."
                : isOnline
                ? "Conexão estabelecida"
                : "Sem conexão com o banco"}
            </div>
            <div className="pt-1 border-t border-border text-muted-foreground">
              Tipo: {isCloud ? "Supabase Cloud" : "Self-Hosted"}
            </div>
          </div>
          {/* Arrow */}
          <div className="absolute top-full right-4 -mt-1 w-2 h-2 bg-popover border-r border-b border-border rotate-45" />
        </div>
      </div>
    </div>
  );
}
