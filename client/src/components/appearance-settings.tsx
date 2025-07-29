import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Palette, Sun, Moon, Check, Save } from "lucide-react";
import { useTheme } from "@/contexts/theme-context";
import { ColorPicker } from "@/components/color-picker";
import { themes, type ThemeId } from "@/lib/themes";
import { useToast } from "@/hooks/use-toast";

export function AppearanceSettings() {
  const { toast } = useToast();
  const { currentTheme, setTheme, isDark, toggleTheme, primaryColor, setPrimaryColor } = useTheme();

  // Local state for appearance settings (only affects CRM dashboard)
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>(currentTheme);
  const [tempPrimaryColor, setTempPrimaryColor] = useState(primaryColor);
  const [savedTheme, setSavedTheme] = useState<ThemeId>(currentTheme);
  const [savedPrimaryColor, setSavedPrimaryColor] = useState(primaryColor);

  // Theme options from lib
  const themeOptions = Object.entries(themes).map(([key, theme]) => ({
    id: key,
    name: theme.name,
    description: theme.description,
    gradient: theme.gradient,
    primaryColor: theme.primaryColor
  }));

  const saveAppearanceMutation = useMutation({
    mutationFn: async (data: { theme: string; primaryColor: string; isDarkMode: boolean }) => {
      const response = await fetch('/api/user/preferences', {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          dashboardTheme: data.theme,
          primaryColor: data.primaryColor,
          isDarkMode: data.isDarkMode,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save appearance settings");
      }

      return response.json();
    },
    onSuccess: () => {
      // Update saved state to match current selections
      setSavedTheme(selectedTheme);
      setSavedPrimaryColor(tempPrimaryColor);
      
      toast({
        title: "Configuración guardada",
        description: "La personalización de apariencia del dashboard se ha guardado correctamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración. Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
  });

  // Check if there are unsaved changes (compare current selections with last saved values)
  const hasUnsavedChanges = selectedTheme !== savedTheme || tempPrimaryColor !== savedPrimaryColor;

  const handleSaveAppearance = () => {
    // Apply theme changes immediately for instant visual feedback
    setTheme(selectedTheme);
    setPrimaryColor(tempPrimaryColor);
    
    // Save to backend
    saveAppearanceMutation.mutate({
      theme: selectedTheme,
      primaryColor: tempPrimaryColor,
      isDarkMode: isDark,
    });
  };

  // Apply theme changes immediately when user makes selections (live preview)
  const handleThemeChange = (themeId: string) => {
    const typedThemeId = themeId as ThemeId;
    setSelectedTheme(typedThemeId);
    const selectedThemeData = themes[typedThemeId];
    
    // Apply theme immediately for live preview
    setTheme(typedThemeId);
    
    // Also update the primary color to match the theme's primary color
    if (selectedThemeData?.primaryColor) {
      setTempPrimaryColor(selectedThemeData.primaryColor);
      setPrimaryColor(selectedThemeData.primaryColor);
    }
  };

  const handleColorChange = (color: string) => {
    setTempPrimaryColor(color);
    // Apply immediately for live preview  
    setPrimaryColor(color);
  };

  // Initialize saved state when component mounts
  useEffect(() => {
    setSavedTheme(currentTheme);
    setSavedPrimaryColor(primaryColor);
    setSelectedTheme(currentTheme);
    setTempPrimaryColor(primaryColor);
  }, [currentTheme, primaryColor]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Palette className="w-5 h-5 mr-2" />
          Apariencia del Dashboard
        </CardTitle>
        <p className="text-sm text-gray-600">
          Personaliza la apariencia de tu panel de administración (no afecta el micrositio público)
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Dark/Light Mode Toggle */}
        <div className="flex items-center justify-between p-4 border theme-border rounded-lg">
          <div>
            <Label className="text-base font-medium">Modo Oscuro</Label>
            <p className="text-sm theme-text-secondary">
              Activa el modo oscuro para una experiencia visual más cómoda en el dashboard
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Sun className="h-4 w-4 theme-text-secondary" />
            <Switch
              checked={isDark}
              onCheckedChange={toggleTheme}
            />
            <Moon className="h-4 w-4 theme-text-secondary" />
          </div>
        </div>

        <div>
          <Label className="text-base font-medium">Tema del Dashboard</Label>
          <p className="text-sm theme-text-secondary mb-4">
            Personaliza la apariencia de tu panel de administración
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {themeOptions.map((theme) => (
              <div
                key={theme.id}
                onClick={() => handleThemeChange(theme.id)}
                className={`p-4 border rounded-lg cursor-pointer hover:theme-nav-hover transition-all theme-border ${
                  selectedTheme === theme.id ? 'ring-2 ring-blue-500 theme-nav-active' : ''
                }`}
              >
                <div className={`w-full h-20 bg-gradient-to-br ${theme.gradient} rounded mb-3`}></div>
                <p className="font-medium theme-text-primary">{theme.name}</p>
                <p className="text-sm theme-text-secondary">{theme.description}</p>
                {selectedTheme === theme.id && (
                  <div className="mt-2 flex items-center text-blue-600 text-sm">
                    <Check className="w-4 h-4 mr-1" />
                    Seleccionado
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <ColorPicker
            color={tempPrimaryColor}
            onChange={handleColorChange}
            label="Color Principal del Dashboard"
          />
          <p className="text-sm theme-text-secondary mt-2">
            Color principal para botones y elementos destacados del dashboard
          </p>
        </div>

        <Button 
          onClick={handleSaveAppearance}
          disabled={saveAppearanceMutation.isPending || !hasUnsavedChanges}
          className={`transition-all ${
            hasUnsavedChanges 
              ? "theme-primary text-white hover:opacity-90" 
              : "bg-gray-400 cursor-not-allowed text-gray-600"
          }`}
        >
          <Save className="w-4 h-4 mr-2" />
          {saveAppearanceMutation.isPending 
            ? "Guardando..." 
            : hasUnsavedChanges 
              ? "Guardar Cambios" 
              : "Sin Cambios"
          }
        </Button>
      </CardContent>
    </Card>
  );
}
