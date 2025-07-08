import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AppointmentFormDialog from "@/components/appointment-form-dialog";
import EditAppointmentDialog from "@/components/edit-appointment-dialog";
import { ChevronLeft, ChevronRight, MapPin, RefreshCw, Calendar as CalendarIcon, Clock } from "lucide-react";
import { insertAppointmentSchema, type Appointment, type Service, type Client } from "@shared/schema";
import { z } from "zod";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay, startOfWeek, endOfWeek, startOfDay, endOfDay, addWeeks, subWeeks, addDays, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { formatDatePeruvian, formatDateTimePeruvian } from "@/lib/utils";



function CalendarContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Fetch current business
  const { data: businesses } = useQuery({
    queryKey: ["/api/dashboard/businesses"],
    enabled: !!user,
  });

  const currentBusiness = businesses?.[0];

  // Fetch appointments
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: [`/api/dashboard/businesses/${currentBusiness?.id}/appointments`],
    enabled: !!currentBusiness?.id,
  });

  // Fetch services
  const { data: services = [] } = useQuery({
    queryKey: [`/api/dashboard/businesses/${currentBusiness?.id}/services`],
    enabled: !!currentBusiness?.id,
  });

  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: [`/api/dashboard/businesses/${currentBusiness?.id}/clients`],
    enabled: !!currentBusiness?.id,
  });





  // Calendar navigation
  const previousPeriod = () => {
    if (view === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (view === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else if (view === 'day') setCurrentDate(subDays(currentDate, 1));
  };

  const nextPeriod = () => {
    if (view === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (view === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else if (view === 'day') setCurrentDate(addDays(currentDate, 1));
  };

  const goToToday = () => setCurrentDate(new Date());

  // Generate calendar days based on view
  const getDaysToShow = () => {
    if (view === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

      // Add padding days to start from Monday
      const startPadding = getDay(monthStart) === 0 ? 6 : getDay(monthStart) - 1;
      const paddingDays = Array.from({ length: startPadding }, (_, i) => {
        const date = new Date(monthStart);
        date.setDate(date.getDate() - (startPadding - i));
        return date;
      });

      return [...paddingDays, ...calendarDays];
    } else if (view === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    } else {
      return [currentDate];
    }
  };

  const allDays = getDaysToShow();

  // Get appointments for a specific date
  const getAppointmentsForDate = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return appointments.filter((apt: Appointment) => apt.date === dateString);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmada';
      case 'pending': return 'Pendiente';
      case 'completed': return 'Completada';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendario de Citas</h1>
          <p className="text-gray-600">Gestiona tus citas de manera visual y organizada</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border rounded-lg">
            <Button
              variant={view === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('month')}
              className={view === 'month' ? 'bg-purple-600 text-white' : ''}
            >
              <MapPin className="w-4 h-4 mr-1" />
              Mes
            </Button>
            <Button
              variant={view === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('week')}
              className={view === 'week' ? 'bg-purple-600 text-white' : ''}
            >
              Semana
            </Button>
            <Button
              variant={view === 'day' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('day')}
              className={view === 'day' ? 'bg-purple-600 text-white' : ''}
            >
              Día
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={goToToday}>
            <CalendarIcon className="w-4 h-4 mr-1" />
            Hoy
          </Button>

          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Navigation */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={previousPeriod}>
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <h2 className="text-xl font-semibold">
              {view === 'month' && format(currentDate, 'MMMM yyyy', { locale: es })}
              {view === 'week' && `Semana del ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM', { locale: es })} - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM yyyy', { locale: es })}`}
              {view === 'day' && format(currentDate, 'EEEE, d MMMM yyyy', { locale: es })}
            </h2>

            <Button variant="ghost" size="sm" onClick={nextPeriod}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Calendar Grid */}
          <div className={`grid gap-px bg-gray-200 rounded-lg overflow-hidden ${
            view === 'month' ? 'grid-cols-7' : 
            view === 'week' ? 'grid-cols-7' : 
            'grid-cols-1'
          }`}>
            {/* Day headers */}
            {(view === 'month' || view === 'week') && ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
              <div key={day} className="bg-gray-50 p-2 text-center text-sm font-medium text-gray-600">
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {allDays.map((date, index) => {
              const dayAppointments = getAppointmentsForDate(date);
              const isCurrentMonth = isSameMonth(date, currentDate);
              const isToday = isSameDay(date, new Date());

              return (
                <div
                  key={index}
                  className={`bg-white p-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                    view === 'month' ? 'min-h-[120px]' : 
                    view === 'week' ? 'min-h-[200px]' : 
                    'min-h-[400px]'
                  } ${
                    view === 'month' && !isCurrentMonth ? 'opacity-40' : ''
                  } ${isToday ? 'ring-2 ring-purple-600' : ''}`}
                  onClick={() => {
                    setSelectedDate(date);
                    setIsDialogOpen(true);
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`font-medium ${
                      view === 'day' ? 'text-lg' : 'text-sm'
                    } ${
                      isToday ? 'text-purple-600' : 
                      view === 'month' && !isCurrentMonth ? 'text-gray-400' : 
                      'text-gray-900'
                    }`}>
                      {view === 'day' ? format(date, 'EEEE, d MMMM', { locale: es }) : format(date, 'd')}
                    </span>
                    {dayAppointments.length > 0 && (
                      <span className="text-xs text-gray-500">{dayAppointments.length}</span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {dayAppointments.slice(0, view === 'day' ? 10 : view === 'week' ? 5 : 3).map((appointment: Appointment) => {
                      const service = services.find((s: Service) => s.id === appointment.serviceId);
                      const client = clients.find((c: Client) => c.id === appointment.clientId);

                      // Use client name and service name from the found records
                      const clientName = client?.name || `Cliente ID: ${appointment.clientId}`;
                      const serviceName = service?.name || `Servicio ID: ${appointment.serviceId}`;

                      return (
                        <div 
                          key={appointment.id} 
                          className="text-xs p-2 bg-blue-50 rounded cursor-pointer hover:bg-blue-100 transition-colors border border-blue-200"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent day click
                            setEditingAppointment(appointment);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <div className="flex items-center gap-1 mb-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span className="font-medium">{appointment.time}</span>
                          </div>
                          <Badge variant="secondary" className={`text-xs px-1 py-0 ${getStatusColor(appointment.status)}`}>
                            {getStatusText(appointment.status)}
                          </Badge>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-gray-600">👤</span>
                            <span className="truncate">{clientName}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-600">✂️</span>
                            <span className="truncate font-medium">{serviceName}</span>
                          </div>
                        </div>
                      );
                    })}

                    {view !== 'day' && dayAppointments.length > (view === 'week' ? 5 : 3) && (
                      <div className="text-xs text-gray-500">
                        +{dayAppointments.length - (view === 'week' ? 5 : 3)} más
                      </div>
                    )}

                    {dayAppointments.length === 0 && (view !== 'month' || isCurrentMonth) && (
                      <div className="text-xs text-gray-400 text-center mt-4">
                        Sin citas
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Unified Appointment Creation Dialog */}
      <AppointmentFormDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        businessId={currentBusiness?.id || 1}
        initialDate={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined}
        title="Nueva Cita"
      />

      {/* Edit Appointment Dialog */}
      {editingAppointment && (
        <EditAppointmentDialog
          appointment={editingAppointment}
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setEditingAppointment(null);
          }}
          businessId={currentBusiness?.id || 1}
        />
      )}
    </div>
  );
}

export default function CalendarPage() {
  return (
    <DashboardLayout>
       <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Calendario</h1>
          <div className="text-sm text-gray-600">
            {formatDatePeruvian(new Date())}
          </div>
        </div>
      <CalendarContent />
    </DashboardLayout>
  );
}