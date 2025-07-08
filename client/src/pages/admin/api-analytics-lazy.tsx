import { lazy, Suspense } from "react";

const APIAnalyticsContent = lazy(() => import("./api-analytics"));

function APIAnalyticsLazy() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando API Analytics...</p>
        </div>
      </div>
    }>
      <APIAnalyticsContent />
    </Suspense>
  );
}

export default APIAnalyticsLazy;