import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Keyboard, RotateCcw, Save, Globe, User } from "lucide-react";
import { toast } from "@/utils/toastHelper";
import { z } from "zod";
import { useKeyboardShortcuts, type ShortcutConfig } from "@/hooks/useKeyboardShortcuts";
import { supabase } from "@/integrations/supabase/client";

// Schema de validação para atalhos
const shortcutSchema = z.object({
  ctrl: z.boolean(),
  shift: z.boolean(),
  alt: z.boolean(),
  key: z.string().min(1, "Tecla é obrigatória").max(1, "Use apenas uma tecla")
});

// Lista de teclas proibidas que causam conflitos com o navegador
const FORBIDDEN_COMBINATIONS = [
  { ctrl: true, shift: true, alt: false, key: "I" }, // DevTools
  { ctrl: true, shift: true, alt: false, key: "J" }, // DevTools Console
  { ctrl: true, shift: true, alt: false, key: "C" }, // DevTools no Chrome
  { ctrl: true, shift: false, alt: false, key: "T" }, // Nova aba
  { ctrl: true, shift: false, alt: false, key: "W" }, // Fechar aba
  { ctrl: true, shift: false, alt: false, key: "N" }, // Nova janela
  { ctrl: true, shift: false, alt: false, key: "P" }, // Imprimir
];

export const AtalhosTab = () => {
  const { 
    shortcuts, 
    loading, 
    isPersonalized,
    saveGlobalShortcuts,
    saveUserShortcuts,
    resetToGlobal
  } = useKeyboardShortcuts();
  
  const [isCapturing, setIsCapturing] = useState<string | null>(null);
  const [capturedKeys, setCapturedKeys] = useState<ShortcutConfig>({
    ctrl: false,
    shift: false,
    alt: false,
    key: ""
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isMaster, setIsMaster] = useState(false);
  const [saveAsPersonal, setSaveAsPersonal] = useState(false);

  // Verificar se o usuário é MASTER
  useEffect(() => {
    const checkMasterRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'master')
        .single();

      setIsMaster(!!roles);
    };
    
    checkMasterRole();
  }, []);

  // Listener para capturar teclas
  useEffect(() => {
    if (!isCapturing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const key = e.key.toUpperCase();
      
      // Ignorar teclas modificadoras sozinhas
      if (["CONTROL", "SHIFT", "ALT", "META"].includes(key)) {
        return;
      }

      // Só aceitar letras A-Z
      if (!/^[A-Z]$/.test(key)) {
        toast.error("Use apenas letras de A-Z");
        return;
      }

      const newShortcut: ShortcutConfig = {
        ctrl: e.ctrlKey || e.metaKey,
        shift: e.shiftKey,
        alt: e.altKey,
        key: key
      };

      // Validar com zod
      const validation = shortcutSchema.safeParse(newShortcut);
      if (!validation.success) {
        toast.error("Atalho inválido: " + validation.error.errors[0].message);
        return;
      }

      // Verificar se não requer modificadores
      if (!newShortcut.ctrl && !newShortcut.shift && !newShortcut.alt) {
        toast.error("Use pelo menos Ctrl, Shift ou Alt");
        return;
      }

      // Verificar conflitos com navegador
      const isForbidden = FORBIDDEN_COMBINATIONS.some(
        forbidden => 
          forbidden.ctrl === newShortcut.ctrl &&
          forbidden.shift === newShortcut.shift &&
          forbidden.alt === newShortcut.alt &&
          forbidden.key === newShortcut.key
      );

      if (isForbidden) {
        toast.warning("Este atalho pode conflitar com o navegador. Tente outra combinação.");
      }

      setCapturedKeys(newShortcut);
      setIsCapturing(null);
      setHasUnsavedChanges(true);
      
      toast.success("Atalho capturado! Clique em Salvar para aplicar.");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCapturing]);

  const handleSave = async () => {
    try {
      const shortcutToSave = capturedKeys.key ? capturedKeys : shortcuts.toggleSettingsGear;
      
      const newShortcuts = {
        ...shortcuts,
        toggleSettingsGear: {
          ctrl: shortcutToSave.ctrl,
          shift: shortcutToSave.shift,
          alt: shortcutToSave.alt,
          key: shortcutToSave.key
        }
      };

      let result;
      if (saveAsPersonal) {
        // Salvar como personalizado do usuário
        result = await saveUserShortcuts(newShortcuts);
        if (result.success) {
          toast.success("Atalhos personalizados salvos! Recarregue a página para aplicar.");
        }
      } else {
        // Salvar como global (apenas MASTER)
        result = await saveGlobalShortcuts(newShortcuts);
        if (result.success) {
          toast.success("Atalhos globais salvos! Todos os usuários serão afetados.");
        }
      }

      if (!result.success) {
        throw new Error(result.error || 'Erro ao salvar');
      }

      setHasUnsavedChanges(false);
      setCapturedKeys({ ctrl: false, shift: false, alt: false, key: "" });
    } catch (error: any) {
      toast.error("Erro ao salvar atalhos: " + error.message);
      console.error(error);
    }
  };

  const handleReset = async () => {
    try {
      const result = await resetToGlobal();
      if (result.success) {
        setCapturedKeys({
          ctrl: false,
          shift: false,
          alt: false,
          key: ""
        });
        setHasUnsavedChanges(false);
        toast.success("Atalhos restaurados para as configurações globais! Recarregue a página.");
      } else {
        throw new Error(result.error || 'Erro ao resetar');
      }
    } catch (error: any) {
      toast.error("Erro ao restaurar atalhos: " + error.message);
      console.error(error);
    }
  };

  const formatShortcut = (shortcut: ShortcutConfig) => {
    const parts = [];
    if (shortcut.ctrl) parts.push("Ctrl");
    if (shortcut.shift) parts.push("Shift");
    if (shortcut.alt) parts.push("Alt");
    if (shortcut.key) parts.push(shortcut.key);
    return parts.join(" + ");
  };

  const currentShortcut = capturedKeys.key ? capturedKeys : shortcuts.toggleSettingsGear;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Carregando configurações...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Atalhos de Teclado
          </CardTitle>
          <CardDescription>
            Configure atalhos personalizados para ações rápidas no sistema
            {isPersonalized && (
              <span className="block mt-1 text-blue-600 dark:text-blue-400">
                ✨ Você está usando atalhos personalizados
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Atalho: Alternar Engrenagem de Configurações */}
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <Label className="text-base font-semibold">
                  Alternar Engrenagem de Configurações
                </Label>
                <p className="text-sm text-muted-foreground">
                  Exibe ou oculta o ícone de configurações na tela de login
                </p>
              </div>
              
              <div className="flex gap-2">
                <Badge 
                  variant="secondary" 
                  className="h-8 px-3 font-mono text-sm cursor-pointer hover:bg-secondary/80"
                  onClick={() => setIsCapturing("toggleSettingsGear")}
                >
                  {formatShortcut(currentShortcut)}
                </Badge>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCapturing("toggleSettingsGear")}
                className="gap-2"
              >
                <Keyboard className="h-4 w-4" />
                {isCapturing === "toggleSettingsGear" ? "Pressione as teclas..." : "Redefinir Atalho"}
              </Button>
            </div>

            {isCapturing === "toggleSettingsGear" && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 animate-pulse">
                <p className="text-sm font-medium text-primary">
                  🎹 Aguardando... Pressione a combinação de teclas desejada
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Use Ctrl/Cmd, Shift ou Alt + uma letra (A-Z)
                </p>
              </div>
            )}
          </div>

          {/* Dicas de uso */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-sm">💡 Dicas:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Use combinações com Ctrl, Shift ou Alt para evitar conflitos</li>
              <li>Evite atalhos comuns do navegador (Ctrl+T, Ctrl+W, etc.)</li>
              <li>Atalhos como Ctrl+Shift+C podem abrir o DevTools em alguns navegadores</li>
              <li>Recomendado: Use Ctrl+Alt+[Letra] para maior compatibilidade</li>
            </ul>
          </div>

          {/* Opções de salvamento */}
          {hasUnsavedChanges && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <Label className="text-sm font-semibold">Como deseja salvar?</Label>
              <div className="flex flex-col gap-2">
                {isMaster && (
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-md hover:bg-background border border-transparent hover:border-border transition-colors">
                    <input
                      type="radio"
                      name="saveType"
                      checked={!saveAsPersonal}
                      onChange={() => setSaveAsPersonal(false)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-primary" />
                        <span className="font-medium">Salvar Globalmente</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Todos os usuários do sistema usarão este atalho
                      </p>
                    </div>
                  </label>
                )}
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-md hover:bg-background border border-transparent hover:border-border transition-colors">
                  <input
                    type="radio"
                    name="saveType"
                    checked={saveAsPersonal}
                    onChange={() => setSaveAsPersonal(true)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">Salvar Apenas para Mim</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Personalizar apenas para a sua conta
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={!hasUnsavedChanges}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Salvar Alterações
            </Button>
            
            {isPersonalized && (
              <Button
                variant="outline"
                onClick={handleReset}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Restaurar para Global
              </Button>
            )}
          </div>

          {hasUnsavedChanges && (
            <p className="text-sm text-amber-600 dark:text-amber-500">
              ⚠️ Você tem alterações não salvas
            </p>
          )}
        </CardContent>
      </Card>

      {/* Card de informações adicionais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Atalhos Disponíveis no Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Alternar engrenagem de configurações</span>
              <Badge variant="outline" className="font-mono">
                {formatShortcut(shortcuts.toggleSettingsGear)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground pt-2">
              Mais atalhos podem ser adicionados no futuro conforme novas funcionalidades.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
