import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useMemo, memo } from "react";
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  BarChart3, 
  Settings,
  Bell,
  HelpCircle,
  Building2,
  ChevronDown,
  LogOut,
  Menu,
  ShoppingBag,
  FileText
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/ThemeToggle";
import userProfile from "@/assets/user-profile.jpg";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/integrations/supabase";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserAvatar } from "@/hooks/useUserAvatar";
import { useUserProfile } from "@/hooks/useUserProfile";
import { NotificationsPanel } from "@/components/layout/NotificationsPanel";

interface SubMenuItem {
  name: string;
  path: string;
}

interface MenuItem {
  name: string;
  icon: any;
  path: string;
  submenu?: SubMenuItem[];
}

interface SidebarProps {
  type: "master" | "loja";
}

// Componente de navegação memoizado para prevenir re-renders desnecessários
const NavigationItems = memo(({ 
  items, 
  location, 
  navigate, 
  isMobile, 
  setMobileMenuOpen 
}: { 
  items: MenuItem[]; 
  location: any; 
  navigate: any; 
  isMobile: boolean; 
  setMobileMenuOpen: (open: boolean) => void;
}) => {
  return (
    <>
      {items.map((item) => {
        const isActive = location.pathname === item.path || 
          (item.submenu && item.submenu.some((sub) => location.pathname === sub.path));
        const Icon = item.icon;
        const hasSubmenu = item.submenu && item.submenu.length > 0;
        
        if (hasSubmenu) {
          return (
            <DropdownMenu key={item.path}>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium text-sm whitespace-nowrap cursor-pointer transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                  <ChevronDown className="h-3 w-3 ml-1" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[var(--radix-dropdown-menu-trigger-width)] bg-popover p-1">
                {item.submenu && item.submenu.map((subItem) => (
                  <DropdownMenuItem
                    key={subItem.path}
                    onClick={() => {
                      navigate(subItem.path);
                      if (isMobile) setMobileMenuOpen(false);
                    }}
                    className={cn(
                      "cursor-pointer mb-0.5 last:mb-0",
                      location.pathname === subItem.path && "bg-accent text-accent-foreground font-medium"
                    )}
                  >
                    {subItem.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }
        
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => isMobile && setMobileMenuOpen(false)}
            className={cn(
              "flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </>
  );
});

NavigationItems.displayName = "NavigationItems";

const Sidebar = ({ type }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();
  const { isMaster } = useUserRole();
  const { avatarUrl } = useUserAvatar();
  const { nome } = useUserProfile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  // Memoizar valores derivados para evitar recalcular a cada render
  const userName = useMemo(
    () => nome || user?.email?.split('@')[0] || 'Usuário',
    [nome, user?.email]
  );

  const userInitials = useMemo(
    () => userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
    [userName]
  );

  // Memoizar items para evitar recriá-los a cada render
  const masterItems = useMemo<MenuItem[]>(() => [
    { name: "Dashboard", icon: LayoutDashboard, path: "/master/dashboard" },
    { name: "Clientes", icon: Building2, path: "/master/clientes" },
    { name: "Configurações", icon: Settings, path: "/master/configuracoes" },
  ], []);

  const lojaItems = useMemo<MenuItem[]>(() => [
    { name: "Início", icon: LayoutDashboard, path: "/inicio" },
    { name: "Clientes", icon: Users, path: "/clientes" },
    { 
      name: "Produtos", 
      icon: Package, 
      path: "/produtos",
      submenu: [
        { name: "Produtos", path: "/produtos" },
        { name: "Categorias", path: "/produtos/categorias" },
        { name: "Variações", path: "/produtos/variacoes" },
      ]
    },
    { name: "Pedidos", icon: ShoppingBag, path: "/pedidos" },
    { name: "Relatórios", icon: FileText, path: "/relatorios" },
  ], []);

  const items = type === "master" ? masterItems : lojaItems;

  return (
    <header className="w-full bg-background border-b border-border shadow-fellow-sm sticky top-0 z-[200]">
      <div className="h-16 px-3 md:px-6 flex items-center justify-between gap-2 md:gap-6">
        {/* Mobile Menu */}
        {isMobile && (
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <nav className="flex flex-col gap-1 p-4">
                <NavigationItems 
                  items={items} 
                  location={location} 
                  navigate={navigate}
                  isMobile={isMobile}
                  setMobileMenuOpen={setMobileMenuOpen}
                />
              </nav>
            </SheetContent>
          </Sheet>
        )}

        {/* Desktop Navigation */}
        {!isMobile && (
          <nav className="grid grid-flow-col auto-cols-max gap-1">
            <NavigationItems 
              items={items} 
              location={location} 
              navigate={navigate}
              isMobile={isMobile}
              setMobileMenuOpen={setMobileMenuOpen}
            />
          </nav>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 md:gap-3 ml-auto">
          {/* Notifications */}
          <div className="hidden sm:flex">
            <NotificationsPanel />
          </div>

          {/* Help - Hidden on mobile */}
          <Button variant="ghost" size="icon" className="rounded-lg hidden md:flex">
            <HelpCircle className="h-5 w-5" />
          </Button>

          {/* Settings */}
          <Link to={type === "master" ? "/master/configuracoes" : "/configuracoes"}>
            <Button variant="ghost" size="icon" className="rounded-lg">
              <Settings className="h-5 w-5" />
            </Button>
          </Link>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
                <span className="text-sm font-medium text-foreground hidden md:block">{userName}</span>
                <Avatar className="w-8 h-8 md:w-9 md:h-9">
                  <AvatarImage src={avatarUrl} alt={userName} />
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-popover">
              <DropdownMenuItem onClick={() => navigate("/minha-conta")} className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Minha Conta</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

// Memoizar o Sidebar inteiro para prevenir re-renders quando props não mudarem
export default memo(Sidebar);
