import { useState, useEffect, useRef } from 'react';
import { Search, Mic, MapPin, X, Clock, TrendingUp, ChevronDown } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';
import { PERUVIAN_CITIES, CITY_DISTRICTS } from "@/lib/constants";

interface ModernSearchBarProps {
  value: string;
  location: string;
  onSearch: (query: string, location: string, district?: string) => void;
  onLocationChange: (location: string) => void;
  isLoading?: boolean;
  className?: string;
  showDistrictFilter?: boolean;
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
  className,
  showDistrictFilter = false
}: ModernSearchBarProps) {
  const [query, setQuery] = useState(value);
  const [isListening, setIsListening] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [isSticky, setIsSticky] = useState(false);
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  
  // Get available districts for selected city
  const availableDistricts = selectedCity && CITY_DISTRICTS[selectedCity] ? CITY_DISTRICTS[selectedCity] : [];

  // Initialize city from location prop
  useEffect(() => {
    if (location) {
      // Check if location matches any of our cities
      const matchedCity = PERUVIAN_CITIES.find(city => 
        location.toLowerCase().includes(city.toLowerCase())
      );
      if (matchedCity) {
        setSelectedCity(matchedCity);
      }
    }
  }, [location]);

  // Reset district when city changes
  useEffect(() => {
    if (selectedCity && !CITY_DISTRICTS[selectedCity]) {
      setSelectedDistrict("");
    } else if (selectedDistrict && selectedCity && CITY_DISTRICTS[selectedCity]) {
      // Check if current district is valid for selected city
      if (!CITY_DISTRICTS[selectedCity].includes(selectedDistrict)) {
        setSelectedDistrict("");
      }
    }
  }, [selectedCity, selectedDistrict]);

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
      // Construct location string
      const locationString = selectedCity ? 
        (selectedDistrict ? `${selectedDistrict}, ${selectedCity}` : selectedCity) : 
        location;
      
      // Save to recent searches
      const newSearch: RecentSearch = {
        query: finalQuery,
        location: locationString,
        timestamp: Date.now()
      };
      
      const updated = [newSearch, ...recentSearches.filter(
        s => s.query !== finalQuery || s.location !== locationString
      )].slice(0, 5);
      
      setRecentSearches(updated);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
      
      onSearch(finalQuery, locationString, selectedDistrict);
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

          {/* Enhanced Location Selector */}
          <div className="flex items-center gap-2 bg-gray-50 rounded-full px-4 min-w-[280px]">
            <MapPin className="text-gray-400 w-5 h-5 flex-shrink-0" />
            
            {/* City Selector */}
            <Select 
              value={selectedCity || "all"} 
              onValueChange={(value) => {
                const newCity = value === "all" ? "" : value;
                setSelectedCity(newCity);
                setSelectedDistrict(""); // Reset district when city changes
                onLocationChange(newCity);
              }}
            >
              <SelectTrigger className="border-0 bg-transparent focus:ring-0 focus:ring-offset-0 p-0 h-auto text-sm">
                <SelectValue placeholder="Ciudad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las ciudades</SelectItem>
                {PERUVIAN_CITIES.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* District Selector - Only show if city is selected and has districts */}
            {selectedCity && availableDistricts.length > 0 && (
              <>
                <span className="text-gray-300">|</span>
                <Select 
                  value={selectedDistrict || "all"} 
                  onValueChange={(value) => {
                    const newDistrict = value === "all" ? "" : value;
                    setSelectedDistrict(newDistrict);
                  }}
                >
                  <SelectTrigger className="border-0 bg-transparent focus:ring-0 focus:ring-offset-0 p-0 h-auto text-sm">
                    <SelectValue placeholder="Distrito" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los distritos</SelectItem>
                    {availableDistricts.map((district) => (
                      <SelectItem key={district} value={district}>
                        {district}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
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