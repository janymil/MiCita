import React from 'react';
import { Search, MapPin, Building, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchSuggestion {
  type: 'business' | 'category' | 'location' | 'query';
  value: string;
  label: string;
  count?: number;
}

interface SearchSuggestionsProps {
  suggestions: SearchSuggestion[];
  isLoading: boolean;
  isVisible: boolean;
  onSuggestionClick: (suggestion: SearchSuggestion) => void;
  onClose: () => void;
  className?: string;
}

const getSuggestionIcon = (type: string) => {
  switch (type) {
    case 'business':
      return <Building className="w-4 h-4" />;
    case 'category':
      return <TrendingUp className="w-4 h-4" />;
    case 'location':
      return <MapPin className="w-4 h-4" />;
    default:
      return <Search className="w-4 h-4" />;
  }
};

const getSuggestionBadge = (type: string) => {
  switch (type) {
    case 'business':
      return <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Negocio</span>;
    case 'category':
      return <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Categoría</span>;
    case 'location':
      return <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Ubicación</span>;
    default:
      return null;
  }
};

export default function SearchSuggestions({
  suggestions,
  isLoading,
  isVisible,
  onSuggestionClick,
  onClose,
  className
}: SearchSuggestionsProps) {
  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-10"
        onClick={onClose}
      />
      
      {/* Suggestions dropdown */}
      <div className={cn(
        "absolute top-full left-0 right-0 z-20 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto",
        className
      )}>
        {isLoading ? (
          <div className="p-4 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">Buscando sugerencias...</p>
          </div>
        ) : suggestions.length > 0 ? (
          <div className="py-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => onSuggestionClick(suggestion)}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between group transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-gray-400 group-hover:text-gray-600">
                    {getSuggestionIcon(suggestion.type)}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{suggestion.label}</div>
                    {suggestion.count && (
                      <div className="text-xs text-gray-500">
                        {suggestion.count} resultados
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {getSuggestionBadge(suggestion.type)}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-gray-500">
            <Search className="w-6 h-6 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No hay sugerencias disponibles</p>
          </div>
        )}
      </div>
    </>
  );
}