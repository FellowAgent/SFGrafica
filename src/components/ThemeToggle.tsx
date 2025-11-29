import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/integrations/supabase";

const ThemeToggle = () => {
  const { user } = useSupabaseAuth();
  const [theme, setTheme] = useState<"light" | "dark">("dark"); // Padrão: dark

  // Carrega tema do perfil do usuário
  useEffect(() => {
    const loadTheme = async () => {
      // Verificar se há sessão ativa antes de fazer requisição
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session && user?.id) {
        // Se está logado, busca do banco de dados
        try {
          const { data: perfil, error } = await supabase
            .from('perfis')
            .select('tema')
            .eq('id', user.id)
            .single();

          // Ignorar erros 406 (sem permissão) - usar localStorage como fallback
          if (error && error.code !== 'PGRST301') {
            console.error('Erro ao carregar tema:', error);
          }

          if (perfil?.tema) {
            setTheme((perfil.tema as "light" | "dark") || "dark");
            return;
          }
        } catch (error: any) {
          // Ignorar erros 406 (Not Acceptable - sem permissão RLS)
          if (error?.status !== 406) {
            console.error('Erro ao carregar tema:', error);
          }
        }
      }
      
      // Fallback para localStorage (padrão: dark)
      const localTheme = localStorage.getItem("theme") as "light" | "dark" | null;
      setTheme(localTheme || "dark");
    };

    loadTheme();
  }, [user?.id]);

  const toggleTheme = async () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    
    // Aplica o tema visualmente
    const root = window.document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(newTheme === "dark" ? "dark" : "light");
    
    // Salva no localStorage como backup
    localStorage.setItem("theme", newTheme);
    
    // Se está logado, salva no banco de dados
    if (user?.id) {
      try {
        const { error } = await supabase
          .from('perfis')
          .update({ tema: newTheme })
          .eq('id', user.id);
        
        // Ignorar erros 406 (sem permissão) - o tema já foi salvo no localStorage
        if (error && error.code !== 'PGRST301') {
          console.error('Erro ao salvar tema:', error);
        }
      } catch (error: any) {
        // Ignorar erros 406 (Not Acceptable - sem permissão RLS)
        if (error?.status !== 406) {
          console.error('Erro ao salvar tema:', error);
        }
      }
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="rounded-lg"
    >
      {theme === "light" ? (
        <Moon className="h-5 w-5" />
      ) : (
        <Sun className="h-5 w-5" />
      )}
    </Button>
  );
};

export default ThemeToggle;
