export default function BusinessCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden animate-pulse">
      {/* Image skeleton */}
      <div className="relative h-48 bg-gray-200" />
      
      {/* Content skeleton */}
      <div className="p-6 space-y-4">
        {/* Category badge */}
        <div className="h-6 w-20 bg-gray-200 rounded-full" />
        
        {/* Title */}
        <div className="h-6 bg-gray-200 rounded w-3/4" />
        
        {/* Description */}
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-5/6" />
        </div>
        
        {/* Rating and location */}
        <div className="flex items-center space-x-4">
          <div className="h-4 w-16 bg-gray-200 rounded" />
          <div className="h-4 w-24 bg-gray-200 rounded" />
        </div>
        
        {/* Buttons */}
        <div className="flex space-x-3 pt-2">
          <div className="h-10 bg-gray-200 rounded-lg flex-1" />
          <div className="h-10 bg-gray-200 rounded-lg flex-1" />
        </div>
      </div>
    </div>
  );
}