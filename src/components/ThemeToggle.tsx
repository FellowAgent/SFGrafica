import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/integrations/supabase";

const ThemeToggle = () => {
  const { user } = useSupabaseAuth();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Carrega tema do perfil do usuário
  useEffect(() => {
    const loadTheme = async () => {
      if (user?.id) {
        // Se está logado, busca do banco de dados
        try {
          const { data: perfil } = await supabase
            .from('perfis')
            .select('tema')
            .eq('id', user.id)
            .single();

          setTheme((perfil?.tema as "light" | "dark") || "light");
        } catch (error) {
          console.error('Erro ao carregar tema:', error);
        }
      } else {
        // Se não está logado, usa localStorage como fallback
        const localTheme = localStorage.getItem("theme") as "light" | "dark" | null;
        setTheme(localTheme || "light");
      }
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
        await supabase
          .from('perfis')
          .update({ tema: newTheme })
          .eq('id', user.id);
      } catch (error) {
        console.error('Erro ao salvar tema:', error);
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
