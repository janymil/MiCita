import { useState, useEffect, useCallback } from 'react';

interface SearchSuggestion {
  type: 'business' | 'category' | 'location' | 'query';
  value: string;
  label: string;
  count?: number;
}

interface UseSearchSuggestionsProps {
  query: string;
  limit?: number;
  minLength?: number;
  debounceMs?: number;
}

export function useSearchSuggestions({
  query,
  limit = 5,
  minLength = 2,
  debounceMs = 300
}: UseSearchSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < minLength) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(searchQuery)}&limit=${limit}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }

      const data = await response.json();
      
      // Transform the simple string array into structured suggestions
      const structuredSuggestions: SearchSuggestion[] = data.map((suggestion: string) => ({
        type: 'query' as const,
        value: suggestion,
        label: suggestion
      }));

      setSuggestions(structuredSuggestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch suggestions');
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [limit, minLength]);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      fetchSuggestions(query.trim());
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [query, fetchSuggestions, debounceMs]);

  return {
    suggestions,
    isLoading,
    error,
    clearSuggestions: () => setSuggestions([])
  };
}