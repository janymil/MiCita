import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, User, Phone as PhoneIcon, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BookingWidgetProps {
  services: Array<{
    id: number;
    name: string;
    price: string;
    duration: number;
  }>;
  businessId: number;
  workingHours?: any;
  blockedDates?: any[];
  blockedHours?: any[];
}

interface AvailableSlot {
  time: string;
  available: boolean;
}

export default function BookingWidget({ services, businessId, workingHours, blockedDates, blockedHours }: BookingWidgetProps) {
  const [selectedService, setSelectedService] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [step, setStep] = useState(1); // 1: Service, 2: Date/Time, 3: Customer Info
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get selected service details
  const selectedServiceData = services.find(s => s.id.toString() === selectedService);

  // Fetch available time slots for selected date
  const { data: availableSlots, isLoading: loadingSlots } = useQuery({
    queryKey: [`/api/appointments/availability/${businessId}`, selectedDate, selectedService],
    enabled: !!selectedDate && !!selectedService,
    queryFn: async () => {
      const response = await fetch(`/api/appointments/availability/${businessId}?date=${selectedDate}&serviceId=${selectedService}`);
      return response.json();
    }
  });

  // Real-time availability check mutation
  const checkAvailability = useMutation({
    mutationFn: async ({ serviceId, date, time }: { serviceId: string, date: string, time: string }) => {
      const response = await fetch('/api/appointments/check-availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId,
          serviceId: parseInt(serviceId),
          date,
          time
        }),
      });
      return response.json();
    }
  });

  // Enhanced appointment creation with conflict handling
  const createAppointment = useMutation({
    mutationFn: async (appointmentData: any) => {
      const response = await fetch('/api/appointments/public', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointmentData),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        if (response.status === 409) {
          // Conflict detected
          throw new Error(`${result.message}\n\nCitas en conflicto: ${result.conflicts?.length || 0}`);
        }
        throw new Error(result.message || 'Error creating appointment');
      }
      
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "¡Reserva exitosa!",
        description: `Tu cita para ${data.bookingDetails?.service} el ${data.bookingDetails?.date} a las ${data.bookingDetails?.time} ha sido confirmada.`,
      });
      
      // Reset form
      setSelectedService("");
      setSelectedDate("");
      setSelectedTime("");
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setCustomerNotes("");
      setStep(1);
      
      // Invalidate availability cache
      queryClient.invalidateQueries({ queryKey: [`/api/appointments/availability/${businessId}`] });
    },
    onError: (error: any) => {
      const isConflict = error.message.includes('conflicto');
      toast({
        title: isConflict ? "Conflicto de horario" : "Error en la reserva",
        description: error.message,
        variant: "destructive"
      });
      
      // If there's a conflict, refresh availability
      if (isConflict) {
        queryClient.invalidateQueries({ queryKey: [`/api/appointments/availability/${businessId}`] });
      }
    }
  });

  const handleNext = () => {
    if (step === 1 && selectedService) {
      setStep(2);
    } else if (step === 2 && selectedDate && selectedTime) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleBooking = async () => {
    if (!selectedService || !selectedDate || !selectedTime || !customerName || !customerPhone || !customerEmail) {
      toast({
        title: "Información incompleta",
        description: "Por favor completa todos los campos para hacer la reserva.",
        variant: "destructive"
      });
      return;
    }

    // Real-time availability check before booking
    try {
      const availabilityCheck = await checkAvailability.mutateAsync({
        serviceId: selectedService,
        date: selectedDate,
        time: selectedTime
      });

      if (!availabilityCheck.available) {
        toast({
          title: "Horario ya no disponible",
          description: "Este horario fue reservado por otro cliente. Por favor selecciona otro horario.",
          variant: "destructive"
        });
        
        // Refresh availability data
        queryClient.invalidateQueries({ queryKey: [`/api/appointments/availability/${businessId}`] });
        return;
      }
    } catch (error) {
      toast({
        title: "Error verificando disponibilidad",
        description: "Por favor intenta nuevamente.",
        variant: "destructive"
      });
      return;
    }

    const appointmentData = {
      businessId,
      serviceId: parseInt(selectedService),
      date: selectedDate,
      time: selectedTime,
      clientName: customerName,
      clientPhone: customerPhone,
      clientEmail: customerEmail,
      clientNotes: customerNotes
    };

    createAppointment.mutate(appointmentData);
  };

  // Generate minimum date (today + 1 day)
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  // Generate maximum date (3 months from now)
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 3);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          Reservar Cita
        </CardTitle>
        <div className="flex space-x-2 mt-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${step >= 1 ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
            1
          </div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${step >= 2 ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
            2
          </div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${step >= 3 ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
            3
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step 1: Service Selection */}
        {step === 1 && (
          <>
            <div>
              <Label htmlFor="service">Selecciona un Servicio</Label>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger>
                  <SelectValue placeholder="¿Qué servicio necesitas?" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id.toString()}>
                      <div className="flex flex-col">
                        <span className="font-medium">{service.name}</span>
                        <span className="text-sm text-gray-500">S/ {service.price} • {service.duration} min</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedService && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium">{selectedServiceData?.name}</h4>
                <p className="text-sm text-gray-600">Duración: {selectedServiceData?.duration} minutos</p>
                <p className="text-sm text-gray-600">Precio: S/ {selectedServiceData?.price}</p>
              </div>
            )}
            
            <Button 
              onClick={handleNext}
              disabled={!selectedService}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              Continuar
            </Button>
          </>
        )}

        {/* Step 2: Date and Time Selection */}
        {step === 2 && (
          <>
            <div>
              <Label htmlFor="date">Fecha</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={minDateStr}
                max={maxDateStr}
              />
            </div>

            {selectedDate && (
              <div>
                <Label htmlFor="time">Horarios Disponibles</Label>
                {loadingSlots ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 mx-auto"></div>
                    <p className="text-sm text-gray-600 mt-2">Buscando horarios disponibles...</p>
                  </div>
                ) : availableSlots && availableSlots.length > 0 ? (
                  <div>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {availableSlots.map((slot: AvailableSlot) => (
                        <Button
                          key={slot.time}
                          variant={selectedTime === slot.time ? "default" : "outline"}
                          size="sm"
                          disabled={!slot.available}
                          onClick={() => setSelectedTime(slot.time)}
                          className={`text-xs relative ${selectedTime === slot.time ? 'bg-red-600 hover:bg-red-700' : ''} ${!slot.available ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-50'}`}
                          title={!slot.available ? 'Horario no disponible' : `Disponible para ${selectedServiceData?.name} (${selectedServiceData?.duration} min)`}
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          {slot.time}
                          {!slot.available && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                          )}
                        </Button>
                      ))}
                    </div>
                    <div className="mt-3 text-xs text-gray-500 flex items-center justify-between">
                      <span>
                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                        Disponible
                      </span>
                      <span>
                        <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-1"></span>
                        Ocupado
                      </span>
                      <span>Duración: {selectedServiceData?.duration} min</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      No hay horarios disponibles para esta fecha.
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Por favor selecciona otra fecha o verifica los horarios de atención.
                    </p>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Atrás
              </Button>
              <Button 
                onClick={handleNext}
                disabled={!selectedDate || !selectedTime}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                Continuar
              </Button>
            </div>
          </>
        )}

        {/* Step 3: Customer Information */}
        {step === 3 && (
          <>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre Completo *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Tu nombre completo"
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="phone">Teléfono *</Label>
                <div className="relative">
                  <PhoneIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+51 999 999 999"
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notas Adicionales (Opcional)</Label>
                <textarea
                  id="notes"
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  placeholder="Alguna información adicional que quieras compartir..."
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  rows={3}
                />
              </div>
            </div>

            {/* Booking Summary */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Resumen de tu Reserva</h4>
              <div className="text-sm space-y-1">
                <p><span className="font-medium">Servicio:</span> {selectedServiceData?.name}</p>
                <p><span className="font-medium">Fecha:</span> {selectedDate}</p>
                <p><span className="font-medium">Hora:</span> {selectedTime}</p>
                <p><span className="font-medium">Duración:</span> {selectedServiceData?.duration} min</p>
                <p><span className="font-medium">Precio:</span> S/ {selectedServiceData?.price}</p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Atrás
              </Button>
              <Button 
                onClick={handleBooking}
                disabled={!customerName || !customerPhone || !customerEmail || createAppointment.isPending || checkAvailability.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {createAppointment.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Confirmando...
                  </>
                ) : checkAvailability.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Verificando...
                  </>
                ) : (
                  "Confirmar Reserva"
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
