import { cn } from "@/lib/utils";
import { Clock, TrendingUp } from "lucide-react";

interface PopularTimesProps {
  data?: {
    [day: string]: {
      hours: { hour: number; percentage: number }[];
      busyText?: string;
    }
  };
  currentDay?: string;
  currentHour?: number;
  currentPopularity?: number;
}

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function PopularTimes({ 
  data, 
  currentDay = new Date().getDay().toString(),
  currentHour = new Date().getHours(),
  currentPopularity
}: PopularTimesProps) {
  if (!data) return null;

  const dayData = data[currentDay];
  if (!dayData) return null;

  return (
    <div className="bg-white rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
          <Clock className="w-5 h-5 text-gray-600" />
          <span>Horarios populares</span>
        </h3>
        
        {currentPopularity !== undefined && (
          <div className="flex items-center space-x-2 text-sm">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span className="font-medium">Ahora: {currentPopularity}% ocupado</span>
          </div>
        )}
      </div>

      {/* Current Day Graph */}
      <div className="space-y-2">
        <div className="text-sm text-gray-600">
          {DAYS[parseInt(currentDay)]} {dayData.busyText && `• ${dayData.busyText}`}
        </div>
        
        <div className="flex items-end space-x-1 h-20">
          {dayData.hours.map((hourData, index) => {
            const isCurrentHour = hourData.hour === currentHour;
            const height = (hourData.percentage / 100) * 80; // Max height 80px
            
            return (
              <div
                key={hourData.hour}
                className="flex-1 flex flex-col items-center"
              >
                <div className="w-full relative">
                  <div
                    className={cn(
                      "w-full rounded-t transition-all duration-300",
                      isCurrentHour ? "bg-blue-500" : "bg-gray-300",
                      "hover:opacity-80"
                    )}
                    style={{ height: `${height}px` }}
                  />
                  
                  {/* Show percentage on hover */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity whitespace-nowrap">
                    {hourData.percentage}%
                  </div>
                </div>
                
                {/* Hour label - show every 3 hours */}
                {hourData.hour % 3 === 0 && (
                  <span className="text-xs text-gray-500 mt-1">
                    {hourData.hour}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
          <span>6 AM</span>
          <span>12 PM</span>
          <span>6 PM</span>
          <span>12 AM</span>
        </div>
      </div>

      {/* Weekly Overview */}
      <div className="border-t pt-4">
        <div className="text-sm font-medium text-gray-700 mb-2">Vista semanal</div>
        <div className="grid grid-cols-7 gap-1 text-xs">
          {DAYS.map((day, index) => {
            const dayData = data[index.toString()];
            const avgBusyness = dayData 
              ? dayData.hours.reduce((sum, h) => sum + h.percentage, 0) / dayData.hours.length
              : 0;
            
            return (
              <div
                key={day}
                className={cn(
                  "text-center p-2 rounded cursor-pointer transition-colors",
                  index.toString() === currentDay 
                    ? "bg-blue-100 text-blue-700 font-medium" 
                    : "bg-gray-50 hover:bg-gray-100"
                )}
              >
                <div>{day.slice(0, 3)}</div>
                <div className={cn(
                  "text-xs mt-1",
                  avgBusyness > 60 ? "text-red-500" : 
                  avgBusyness > 30 ? "text-yellow-500" : 
                  "text-green-500"
                )}>
                  {avgBusyness > 60 ? "Ocupado" : 
                   avgBusyness > 30 ? "Normal" : 
                   "Tranquilo"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}