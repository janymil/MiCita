import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft, ChevronRight, MapPin, RefreshCw, Calendar as CalendarIcon, Clock } from "lucide-react";
import { insertAppointmentSchema, type Appointment, type Service, type Client } from "@shared/schema";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay } from "date-fns";
import { es } from "date-fns/locale";

type AppointmentForm = z.infer<typeof insertAppointmentSchema>;

const appointmentSchema = insertAppointmentSchema.extend({
  clientName: z.string().optional(),
  serviceName: z.string().optional(),
});

export default function CalendarPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch current business
  const { data: businesses } = useQuery({
    queryKey: ["/api/dashboard/businesses"],
    enabled: !!user,
  });

  const currentBusiness = businesses?.[0];

  // Fetch appointments
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ["/api/dashboard/businesses", currentBusiness?.id, "appointments"],
    enabled: !!currentBusiness?.id,
  });

  // Fetch services
  const { data: services = [] } = useQuery({
    queryKey: ["/api/dashboard/businesses", currentBusiness?.id, "services"],
    enabled: !!currentBusiness?.id,
  });

  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ["/api/dashboard/businesses", currentBusiness?.id, "clients"],
    enabled: !!currentBusiness?.id,
  });

  const form = useForm<AppointmentForm>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      clientId: 0,
      serviceId: 0,
      date: "",
      time: "",
      status: "pending",
      notes: "",
    },
  });

  const createAppointmentMutation = useMutation({
    mutationFn: async (data: AppointmentForm) => {
      return apiRequest(`/api/dashboard/businesses/${currentBusiness?.id}/appointments`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/dashboard/businesses", currentBusiness?.id, "appointments"],
      });
      setIsDialogOpen(false);
      form.reset();
    },
  });

  const onSubmit = (data: AppointmentForm) => {
    createAppointmentMutation.mutate(data);
  };

  // Calendar navigation
  const previousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Generate calendar days
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

  const allDays = [...paddingDays, ...calendarDays];

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
            <Button variant="ghost" size="sm" onClick={previousMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <h2 className="text-xl font-semibold">
              {format(currentDate, 'MMMM yyyy', { locale: es })}
            </h2>
            
            <Button variant="ghost" size="sm" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
            {/* Day headers */}
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
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
                  className={`bg-white min-h-[120px] p-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                    !isCurrentMonth ? 'opacity-40' : ''
                  } ${isToday ? 'ring-2 ring-purple-600' : ''}`}
                  onClick={() => {
                    setSelectedDate(date);
                    form.setValue('date', format(date, 'yyyy-MM-dd'));
                    setIsDialogOpen(true);
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-sm font-medium ${
                      isToday ? 'text-purple-600' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                    }`}>
                      {format(date, 'd')}
                    </span>
                    {dayAppointments.length > 0 && (
                      <span className="text-xs text-gray-500">{dayAppointments.length}</span>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    {dayAppointments.slice(0, 3).map((appointment: Appointment) => {
                      const service = services.find((s: Service) => s.id === appointment.serviceId);
                      const client = clients.find((c: Client) => c.id === appointment.clientId);
                      
                      return (
                        <div key={appointment.id} className="text-xs">
                          <div className="flex items-center gap-1 mb-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span className="font-medium">{appointment.time}</span>
                          </div>
                          <Badge variant="secondary" className={`text-xs px-1 py-0 ${getStatusColor(appointment.status)}`}>
                            {getStatusText(appointment.status)}
                          </Badge>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-gray-600">👤</span>
                            <span className="truncate">{client?.name || 'Cliente de Ejemplo'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-600">✂️</span>
                            <span className="truncate">{service?.name || 'Corte Mujer'}</span>
                          </div>
                        </div>
                      );
                    })}
                    
                    {dayAppointments.length > 3 && (
                      <div className="text-xs text-gray-500">
                        +{dayAppointments.length - 3} más
                      </div>
                    )}
                    
                    {dayAppointments.length === 0 && isCurrentMonth && (
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

      {/* Create Appointment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nueva Cita</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Fecha</Label>
                <Input
                  id="date"
                  type="date"
                  {...form.register("date")}
                />
              </div>
              
              <div>
                <Label htmlFor="time">Hora</Label>
                <Input
                  id="time"
                  type="time"
                  {...form.register("time")}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="clientId">Cliente</Label>
              <Select onValueChange={(value) => form.setValue("clientId", parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client: Client) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="serviceId">Servicio</Label>
              <Select onValueChange={(value) => form.setValue("serviceId", parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar servicio" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service: Service) => (
                    <SelectItem key={service.id} value={service.id.toString()}>
                      {service.name} - S/ {service.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="status">Estado</Label>
              <Select onValueChange={(value) => form.setValue("status", value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="confirmed">Confirmada</SelectItem>
                  <SelectItem value="completed">Completada</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                placeholder="Notas adicionales..."
                {...form.register("notes")}
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createAppointmentMutation.isPending}>
                {createAppointmentMutation.isPending ? "Guardando..." : "Guardar Cita"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}