import React from 'react';
import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

// Enhanced Micrositio Skeleton Loader
export const MicrositeSkeletonLoader: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header Skeleton */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Skeleton className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-200 to-gray-300" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48 bg-gradient-to-r from-gray-200 to-gray-300" />
                <Skeleton className="h-4 w-32 bg-gradient-to-r from-gray-200 to-gray-300" />
                <Skeleton className="h-5 w-20 rounded-full bg-gradient-to-r from-gray-200 to-gray-300" />
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Skeleton className="h-8 w-20 rounded-lg bg-gradient-to-r from-green-200 to-green-300" />
              <Skeleton className="h-8 w-28 rounded-lg bg-gradient-to-r from-red-200 to-red-300" />
            </div>
          </div>
        </div>
      </header>

      {/* Cover Image Skeleton */}
      <div className="h-64 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer" />
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Skeleton */}
          <div className="lg:col-span-2 space-y-8">
            {/* About Section */}
            <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-shadow duration-300">
              <Skeleton className="h-6 w-40 mb-4 bg-gradient-to-r from-gray-200 to-gray-300" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full bg-gradient-to-r from-gray-200 to-gray-300" />
                <Skeleton className="h-4 w-5/6 bg-gradient-to-r from-gray-200 to-gray-300" />
                <Skeleton className="h-4 w-4/5 bg-gradient-to-r from-gray-200 to-gray-300" />
              </div>
            </div>

            {/* Services Section */}
            <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-shadow duration-300">
              <Skeleton className="h-6 w-36 mb-4 bg-gradient-to-r from-gray-200 to-gray-300" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="border border-gray-200/50 rounded-lg p-4 bg-white/50 backdrop-blur-sm">
                    <div className="flex justify-between items-start mb-2">
                      <Skeleton className="h-5 w-32 bg-gradient-to-r from-gray-200 to-gray-300" />
                      <Skeleton className="h-5 w-16 bg-gradient-to-r from-red-200 to-red-300" />
                    </div>
                    <Skeleton className="h-4 w-full mb-2 bg-gradient-to-r from-gray-200 to-gray-300" />
                    <Skeleton className="h-4 w-20 bg-gradient-to-r from-gray-200 to-gray-300" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar Skeleton */}
          <div className="space-y-6">
            {/* Contact Info */}
            <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-shadow duration-300">
              <Skeleton className="h-6 w-40 mb-4 bg-gradient-to-r from-gray-200 to-gray-300" />
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <Skeleton className="w-4 h-4 bg-gradient-to-r from-gray-200 to-gray-300" />
                    <Skeleton className="h-4 w-36 bg-gradient-to-r from-gray-200 to-gray-300" />
                  </div>
                ))}
              </div>
            </div>

            {/* Hours */}
            <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-shadow duration-300">
              <Skeleton className="h-6 w-20 mb-4 bg-gradient-to-r from-gray-200 to-gray-300" />
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex justify-between">
                    <Skeleton className="h-4 w-16 bg-gradient-to-r from-gray-200 to-gray-300" />
                    <Skeleton className="h-4 w-24 bg-gradient-to-r from-gray-200 to-gray-300" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { Skeleton }
