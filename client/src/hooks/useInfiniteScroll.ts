import { useState, useEffect, useCallback } from 'react';

interface UseInfiniteScrollProps {
  hasMore: boolean;
  onLoadMore: () => void;
  isLoading: boolean;
  threshold?: number;
}

export function useInfiniteScroll({
  hasMore,
  onLoadMore,
  isLoading,
  threshold = 1000
}: UseInfiniteScrollProps) {
  const [isFetching, setIsFetching] = useState(false);

  const handleScroll = useCallback(() => {
    const scrollTop = document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;
    
    const scrolledToBottom = scrollTop + clientHeight >= scrollHeight - threshold;
    
    if (scrolledToBottom && hasMore && !isLoading && !isFetching) {
      setIsFetching(true);
      onLoadMore();
    }
  }, [hasMore, isLoading, isFetching, onLoadMore, threshold]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    if (!isLoading) {
      setIsFetching(false);
    }
  }, [isLoading]);

  return { isFetching };
}