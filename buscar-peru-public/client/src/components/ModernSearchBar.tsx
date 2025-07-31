import { useState, useEffect } from 'react';
import { Search, Mic, MapPin } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PERUVIAN_CITIES, CITY_DISTRICTS } from "@/lib/constants";

interface ModernSearchBarProps {
  value: string;
  location: string;
  onSearch: (query: string, location: string, district?: string) => void;
  onLocationChange: (location: string) => void;
  isLoading?: boolean;
  className?: string;
}

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
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  
  // Get available districts for selected city
  const availableDistricts = selectedCity && CITY_DISTRICTS[selectedCity] ? CITY_DISTRICTS[selectedCity] : [];

  // Initialize city from location prop
  useEffect(() => {
    if (location) {
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
      if (!CITY_DISTRICTS[selectedCity].includes(selectedDistrict)) {
        setSelectedDistrict("");
      }
    }
  }, [selectedCity, selectedDistrict]);

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
      const locationString = selectedCity ? 
        (selectedDistrict ? `${selectedDistrict}, ${selectedCity}` : selectedCity) : 
        location;
      
      onSearch(finalQuery, locationString, selectedDistrict);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <div className="max-w-4xl mx-auto">
        <div className="flex gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              <Input
                type="text"
                placeholder="Buscar servicios, negocios..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
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
          </div>

          {/* Location Selector */}
          <div className="flex items-center gap-2 bg-gray-50 rounded-full px-4 min-w-[280px]">
            <MapPin className="text-gray-400 w-5 h-5 flex-shrink-0" />
            
            {/* City Selector */}
            <Select 
              value={selectedCity || "all"} 
              onValueChange={(value) => {
                const newCity = value === "all" ? "" : value;
                setSelectedCity(newCity);
                setSelectedDistrict("");
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

            {/* District Selector */}
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
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Search className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}