import { useState, useEffect, useRef } from 'react';
import { Search, Mic, MapPin, X, Clock, TrendingUp } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';

interface ModernSearchBarProps {
  value: string;
  location: string;
  onSearch: (query: string, location: string) => void;
  onLocationChange: (location: string) => void;
  isLoading?: boolean;
  className?: string;
}

interface RecentSearch {
  query: string;
  location: string;
  timestamp: number;
}

interface TrendingSearch {
  query: string;
  category: string;
}

const TRENDING_SEARCHES: TrendingSearch[] = [
  { query: "Barbería cerca de mí", category: "belleza" },
  { query: "Spa con descuento", category: "belleza" },
  { query: "Gimnasio 24 horas", category: "fitness" },
  { query: "Restaurante romántico", category: "gastronomia" },
];

export default function ModernSearchBar({
  value,
  location,
  onSearch,
  onLocationChange,
  isLoading = false,
  className
}: ModernSearchBarProps) {
  const [query, setQuery] = useState(value);
  const [isListening, setIsListening] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [isSticky, setIsSticky] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Handle scroll for sticky effect
  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Tu navegador no soporta búsqueda por voz');
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      handleSearch(transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
      alert('Error en la búsqueda por voz');
    };

    recognition.start();
  };

  const handleSearch = (searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    if (finalQuery.trim()) {
      // Save to recent searches
      const newSearch: RecentSearch = {
        query: finalQuery,
        location,
        timestamp: Date.now()
      };
      
      const updated = [newSearch, ...recentSearches.filter(
        s => s.query !== finalQuery || s.location !== location
      )].slice(0, 5);
      
      setRecentSearches(updated);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
      
      onSearch(finalQuery, location);
      setShowSuggestions(false);
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  return (
    <div
      ref={searchRef}
      className={cn(
        "relative transition-all duration-300",
        isSticky && "fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg shadow-lg px-4 py-3",
        className
      )}
    >
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="max-w-4xl mx-auto"
      >
        <div className="flex gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              <Input
                type="text"
                placeholder="Buscar servicios, negocios..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                className={cn(
                  "pl-12 pr-20 h-12 text-base rounded-full border-gray-200",
                  "focus:ring-2 focus:ring-red-500 focus:border-transparent",
                  "transition-all duration-200"
                )}
              />
              
              {/* Voice Search Button */}
              <button
                onClick={handleVoiceSearch}
                className={cn(
                  "absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full",
                  "hover:bg-gray-100 transition-colors",
                  isListening && "bg-red-100 animate-pulse"
                )}
              >
                <Mic className={cn(
                  "w-5 h-5",
                  isListening ? "text-red-500" : "text-gray-400"
                )} />
              </button>
            </div>

            {/* Suggestions Dropdown */}
            <AnimatePresence>
              {showSuggestions && (query || recentSearches.length > 0 || TRENDING_SEARCHES.length > 0) && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50"
                >
                  {/* Recent Searches */}
                  {recentSearches.length > 0 && (
                    <div className="p-4 border-b border-gray-100">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-gray-700 flex items-center">
                          <Clock className="w-4 h-4 mr-2" />
                          Búsquedas recientes
                        </h4>
                        <button
                          onClick={clearRecentSearches}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Limpiar
                        </button>
                      </div>
                      <div className="space-y-2">
                        {recentSearches.map((search, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setQuery(search.query);
                              onLocationChange(search.location);
                              handleSearch(search.query);
                            }}
                            className="flex items-center justify-between w-full text-left p-2 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <span className="text-sm text-gray-700">{search.query}</span>
                            <span className="text-xs text-gray-500">{search.location}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trending Searches */}
                  <div className="p-4">
                    <h4 className="text-sm font-medium text-gray-700 flex items-center mb-3">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Tendencias
                    </h4>
                    <div className="space-y-2">
                      {TRENDING_SEARCHES.map((trend, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setQuery(trend.query);
                            handleSearch(trend.query);
                          }}
                          className="flex items-center justify-between w-full text-left p-2 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-sm text-gray-700">{trend.query}</span>
                          <span className="text-xs text-gray-500 capitalize">{trend.category}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Location Selector */}
          <div className="flex items-center bg-gray-50 rounded-full px-4 min-w-[200px]">
            <MapPin className="text-gray-400 mr-2 w-5 h-5" />
            <select
              value={location}
              onChange={(e) => onLocationChange(e.target.value)}
              className="bg-transparent border-0 focus:outline-none text-sm"
            >
              <option value="">Todas las ciudades</option>
              <option value="Lima">Lima</option>
              <option value="Arequipa">Arequipa</option>
              <option value="Cusco">Cusco</option>
              <option value="Trujillo">Trujillo</option>
            </select>
          </div>

          {/* Search Button */}
          <Button
            onClick={() => handleSearch()}
            disabled={isLoading}
            className={cn(
              "h-12 px-6 rounded-full bg-red-600 hover:bg-red-700",
              "transition-all duration-200 shadow-lg hover:shadow-xl"
            )}
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            ) : (
              <>
                <Search className="w-5 h-5" />
                <span className="ml-2 hidden sm:inline">Buscar</span>
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}