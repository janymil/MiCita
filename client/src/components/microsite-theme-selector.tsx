import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Palette, X } from 'lucide-react';
import { useMicrositeTheme, MicrositeTheme } from '@/contexts/MicrositeThemeContext';
import { micrositeThemes } from '@/lib/microsite-themes';

interface MicrositeThemeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

const MicrositeThemeSelector: React.FC<MicrositeThemeSelectorProps> = ({ isOpen, onClose }) => {
  const { theme: currentTheme, setTheme } = useMicrositeTheme();

  if (!isOpen) return null;

  const handleThemeSelect = (theme: MicrositeTheme) => {
    setTheme(theme);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[80vh] overflow-y-auto bg-white">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <Palette className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Cambiar Apariencia</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(Object.entries(micrositeThemes) as [MicrositeTheme, typeof micrositeThemes[MicrositeTheme]][]).map(([themeKey, themeConfig]) => (
              <div key={themeKey} className="relative">
                <Card 
                  className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
                    currentTheme === themeKey ? 'ring-4 ring-blue-500 ring-offset-2' : 'hover:shadow-lg'
                  }`}
                  onClick={() => handleThemeSelect(themeKey)}
                >
                  <CardContent className="p-6">
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{themeConfig.name}</h3>
                        {currentTheme === themeKey && (
                          <Badge className="bg-blue-500 text-white">Actual</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{themeConfig.description}</p>
                    </div>

                    {/* Theme Preview */}
                    <div className={`miniature-preview h-32 rounded-lg p-3 ${themeConfig.background} relative overflow-hidden`}>
                      {/* Miniature Header */}
                      <div className={`h-4 rounded mb-2 ${themeConfig.header} opacity-80`}></div>
                      
                      {/* Miniature Cards */}
                      <div className="grid grid-cols-2 gap-1">
                        <div className={`h-8 rounded ${themeConfig.card} opacity-90`}></div>
                        <div className={`h-8 rounded ${themeConfig.card} opacity-90`}></div>
                      </div>
                      
                      {/* Miniature Button */}
                      <div className={`h-3 w-16 rounded mt-2 ${themeConfig.button} opacity-90`}></div>
                      
                      {/* Theme-specific effects */}
                      {themeKey === 'brutalist' && (
                        <div className="absolute top-2 right-2 w-4 h-4 bg-yellow-400 border-2 border-black"></div>
                      )}
                      {themeKey === 'retro-futurism' && (
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 to-purple-600/10"></div>
                      )}
                      {themeKey === 'bento-grid' && (
                        <div className="absolute bottom-1 right-1 w-3 h-3 bg-orange-300 rounded-full"></div>
                      )}
                    </div>

                    <Button
                      className={`w-full mt-4 ${
                        currentTheme === themeKey 
                          ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleThemeSelect(themeKey);
                      }}
                    >
                      {currentTheme === themeKey ? 'Tema Activo' : 'Aplicar Tema'}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-700">
              💡 <strong>Tip:</strong> Cada tema ofrece una experiencia visual única. El tema se guarda automáticamente y se aplicará en futuras visitas.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default MicrositeThemeSelector;