import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar, Clock, Plus, Users } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface ModernCalendarProps {
  businessId: number;
  onCreateAppointment: (date: string, time: string) => void;
  onEditAppointment: (appointment: any) => void;
}

interface CalendarAppointment {
  id: number;
  date: string;
  time: string;
  clientName: string;
  serviceName: string;
  status: string;
  price: string;
  duration: number;
}

export default function ModernCalendar({ businessId, onCreateAppointment, onEditAppointment }: ModernCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

  // Fetch appointments for current month
  const { data: appointments = [], isLoading, refetch } = useQuery({
    queryKey: [`/api/dashboard/businesses/${businessId}/appointments/calendar`, currentDate.getFullYear(), currentDate.getMonth()],
    queryFn: async () => {
      const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');
      const response = await fetch(`/api/dashboard/businesses/${businessId}/appointments?startDate=${startDate}&endDate=${endDate}`);
      
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.map((apt: any) => ({
        id: apt.id,
        date: apt.date,
        time: apt.time,
        clientName: apt.clientName || `Cliente #${apt.clientId}`,
        serviceName: apt.serviceName || `Servicio #${apt.serviceId}`,
        status: apt.status,
        price: apt.price,
        duration: apt.duration
      }));
    }
  });

  // Auto-refresh every 30 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000);
    return () => clearInterval(interval);
  }, [refetch]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getAppointmentsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return appointments.filter(apt => apt.date === dateStr);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      confirmed: 'bg-green-100 text-green-800 border-green-200',
      completed: 'bg-blue-100 text-blue-800 border-blue-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
      rescheduled: 'bg-purple-100 text-purple-800 border-purple-200',
      no_show: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
  };

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
  ];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-48"></div>
            <div className="grid grid-cols-7 gap-2">
              {[...Array(35)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-100 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Calendario de Citas
              </CardTitle>
              <div className="flex space-x-1">
                <Button
                  variant={viewMode === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('month')}
                >
                  Mes
                </Button>
                <Button
                  variant={viewMode === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('week')}
                >
                  Semana
                </Button>
                <Button
                  variant={viewMode === 'day' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('day')}
                >
                  Día
                </Button>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <h2 className="text-lg font-semibold min-w-[200px] text-center">
                  {format(currentDate, 'MMMM yyyy', { locale: es })}
                </h2>
                <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              
              <Button 
                onClick={() => setCurrentDate(new Date())}
                variant="outline"
                size="sm"
              >
                Hoy
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-6">
          {viewMode === 'month' && (
            <>
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                  <div key={day} className="p-2 text-center font-medium text-gray-500 text-sm">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map(day => {
                  const dayAppointments = getAppointmentsForDate(day);
                  const isToday = isSameDay(day, new Date());
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  
                  return (
                    <div
                      key={day.toISOString()}
                      className={`
                        min-h-[120px] p-2 border rounded-lg cursor-pointer transition-all hover:bg-gray-50
                        ${isToday ? 'bg-blue-50 border-blue-200' : 'border-gray-200'}
                        ${isSelected ? 'ring-2 ring-blue-500' : ''}
                        ${!isSameMonth(day, currentDate) ? 'opacity-50' : ''}
                      `}
                      onClick={() => setSelectedDate(day)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                          {format(day, 'd')}
                        </span>
                        {dayAppointments.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {dayAppointments.length}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-1 max-h-[80px] overflow-y-auto">
                        {dayAppointments.slice(0, 3).map(appointment => (
                          <div
                            key={appointment.id}
                            className={`text-xs p-1 rounded border cursor-pointer hover:shadow-sm ${getStatusColor(appointment.status)}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditAppointment(appointment);
                            }}
                          >
                            <div className="font-medium truncate">{appointment.time}</div>
                            <div className="truncate">{appointment.clientName}</div>
                          </div>
                        ))}
                        {dayAppointments.length > 3 && (
                          <div className="text-xs text-gray-500 text-center">
                            +{dayAppointments.length - 3} más
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Quick Add Appointment */}
          {selectedDate && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-3">
                Crear cita para {format(selectedDate, 'dd/MM/yyyy', { locale: es })}
              </h3>
              <div className="grid grid-cols-6 gap-2">
                {timeSlots.map(time => {
                  const hasAppointment = getAppointmentsForDate(selectedDate).some(apt => apt.time === time);
                  return (
                    <Button
                      key={time}
                      variant={hasAppointment ? "secondary" : "outline"}
                      size="sm"
                      disabled={hasAppointment}
                      onClick={() => onCreateAppointment(format(selectedDate, 'yyyy-MM-dd'), time)}
                      className="text-xs"
                    >
                      {time}
                      {hasAppointment && (
                        <span className="ml-1 w-2 h-2 bg-red-500 rounded-full"></span>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-blue-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Citas</p>
                <p className="text-2xl font-bold">{appointments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-green-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Confirmadas</p>
                <p className="text-2xl font-bold">{appointments.filter(a => a.status === 'confirmed').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-yellow-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Pendientes</p>
                <p className="text-2xl font-bold">{appointments.filter(a => a.status === 'pending').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Plus className="w-8 h-8 text-purple-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Ingresos</p>
                <p className="text-2xl font-bold">
                  S/ {appointments.filter(a => a.status === 'completed').reduce((sum, a) => sum + parseFloat(a.price || '0'), 0).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}