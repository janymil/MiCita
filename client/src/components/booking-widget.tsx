import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, User, Phone as PhoneIcon, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDatePeruvian, formatDateISO } from "@/lib/utils";

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
        description: `Tu cita para ${data.bookingDetails?.service} el ${formatDatePeruvian(data.bookingDetails?.date)} a las ${data.bookingDetails?.time} ha sido confirmada.`,
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
    <Card className="w-full max-w-lg mx-auto shadow-xl border-0 bg-white">
      <CardHeader className="pb-6">
        <CardTitle className="flex items-center text-2xl font-bold text-gray-900">
          <Calendar className="w-6 h-6 mr-3 text-red-600" />
          Reservar Cita
        </CardTitle>

        {/* Modern Step Indicator */}
        <div className="flex items-center justify-between mt-6 relative">
          <div className="absolute top-4 left-0 w-full h-0.5 bg-gray-200">
            <div 
              className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-500 ease-out"
              style={{ width: `${((step - 1) / 2) * 100}%` }}
            />
          </div>

          {[1, 2, 3].map((stepNumber) => (
            <div key={stepNumber} className="flex flex-col items-center relative z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                step >= stepNumber 
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg' 
                  : 'bg-white border-2 border-gray-300 text-gray-400'
              }`}>
                {stepNumber}
              </div>
              <span className={`text-xs mt-2 font-medium ${
                step >= stepNumber ? 'text-red-600' : 'text-gray-400'
              }`}>
                {stepNumber === 1 ? 'Servicio' : stepNumber === 2 ? 'Fecha & Hora' : 'Datos'}
              </span>
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-6 px-6 pb-6">
        {/* Step 1: Service Selection */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Selecciona un Servicio</h3>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger className="h-14 border-2 border-gray-200 hover:border-red-300 focus:border-red-500 focus:ring-red-500/20">
                  <SelectValue placeholder="¿Qué servicio necesitas?" className="text-gray-500" />
                </SelectTrigger>
                <SelectContent className="border-0 shadow-lg">
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id.toString()} className="py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900">{service.name}</span>
                        <span className="text-sm text-gray-500">S/ {service.price} • {service.duration} min</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedService && (
              <div className="p-6 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border border-red-100">
                <h4 className="font-bold text-lg text-gray-900 mb-3">{selectedServiceData?.name}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-medium text-gray-700">Duración: {selectedServiceData?.duration} minutos</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-red-600">S/ {selectedServiceData?.price}</span>
                  </div>
                </div>
              </div>
            )}

            <Button 
              onClick={handleNext}
              disabled={!selectedService}
              className="w-full h-12 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continuar
            </Button>
          </div>
        )}

        {/* Step 2: Date and Time Selection */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Selecciona Fecha y Hora</h3>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-5 w-5 text-red-600" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={minDateStr}
                  max={maxDateStr}
                  className="h-14 pl-12 border-2 border-gray-200 hover:border-red-300 focus:border-red-500 focus:ring-red-500/20 rounded-xl"
                />
              </div>
            </div>

            {selectedDate && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">Horarios Disponibles</h4>
                {loadingSlots ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                    <p className="text-sm text-gray-600 mt-3">Buscando horarios disponibles...</p>
                  </div>
                ) : availableSlots && availableSlots.length > 0 ? (
                  <div>
                    <div className="grid grid-cols-3 gap-3">
                      {availableSlots.map((slot: AvailableSlot) => (
                        <Button
                          key={slot.time}
                          variant={selectedTime === slot.time ? "default" : "outline"}
                          size="sm"
                          disabled={!slot.available}
                          onClick={() => setSelectedTime(slot.time)}
                          className={`h-12 text-sm font-medium relative rounded-xl transition-all duration-200 ${
                            selectedTime === slot.time 
                              ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg' 
                              : slot.available 
                                ? 'border-2 border-gray-200 hover:border-red-300 hover:bg-red-50' 
                                : 'opacity-40 cursor-not-allowed border-gray-100'
                          }`}
                          title={!slot.available ? 'Horario no disponible' : `Disponible para ${selectedServiceData?.name} (${selectedServiceData?.duration} min)`}
                        >
                          <Clock className="w-4 h-4 mr-2" />
                          {slot.time}
                          {!slot.available && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                          )}
                        </Button>
                      ))}
                    </div>
                    <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span className="flex items-center">
                          <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                          Disponible
                        </span>
                        <span className="flex items-center">
                          <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                          Ocupado
                        </span>
                        <span className="font-medium">Duración: {selectedServiceData?.duration} min</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-xl">
                    <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      No hay horarios disponibles para esta fecha
                    </p>
                    <p className="text-xs text-gray-500">
                      Por favor selecciona otra fecha o verifica los horarios de atención
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                onClick={handleBack} 
                className="flex-1 h-12 border-2 border-gray-200 hover:bg-gray-50 rounded-xl font-medium"
              >
                Atrás
              </Button>
              <Button 
                onClick={handleNext}
                disabled={!selectedDate || !selectedTime}
                className="flex-1 h-12 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuar
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Customer Information */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Información de Contacto</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700 mb-2 block">Nombre Completo *</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-4 h-5 w-5 text-red-600" />
                    <Input
                      id="name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Tu nombre completo"
                      className="h-14 pl-12 border-2 border-gray-200 hover:border-red-300 focus:border-red-500 focus:ring-red-500/20 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone" className="text-sm font-medium text-gray-700 mb-2 block">Teléfono *</Label>
                  <div className="relative">
                    <PhoneIcon className="absolute left-4 top-4 h-5 w-5 text-red-600" />
                    <Input
                      id="phone"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+51 999 999 999"
                      className="h-14 pl-12 border-2 border-gray-200 hover:border-red-300 focus:border-red-500 focus:ring-red-500/20 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700 mb-2 block">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-4 h-5 w-5 text-red-600" />
                    <Input
                      id="email"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="tu@email.com"
                      className="h-14 pl-12 border-2 border-gray-200 hover:border-red-300 focus:border-red-500 focus:ring-red-500/20 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes" className="text-sm font-medium text-gray-700 mb-2 block">Notas Adicionales (Opcional)</Label>
                  <textarea
                    id="notes"
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder="Alguna información adicional que quieras compartir..."
                    className="min-h-[100px] w-full rounded-xl border-2 border-gray-200 hover:border-red-300 focus:border-red-500 focus:ring-red-500/20 px-4 py-3 text-sm resize-none"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Modern Booking Summary */}
            <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
              <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                Resumen de tu Reserva
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-blue-100">
                  <span className="text-sm font-medium text-gray-600">Servicio:</span>
                  <span className="text-sm font-bold text-gray-900">{selectedServiceData?.name}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-blue-100">
                  <span className="text-sm font-medium text-gray-600">Fecha:</span>
                  <span className="text-sm font-bold text-gray-900">{formatDatePeruvian(selectedDate)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-blue-100">
                  <span className="text-sm font-medium text-gray-600">Hora:</span>
                  <span className="text-sm font-bold text-gray-900">{selectedTime}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-blue-100">
                  <span className="text-sm font-medium text-gray-600">Duración:</span>
                  <span className="text-sm font-bold text-gray-900">{selectedServiceData?.duration} min</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium text-gray-600">Precio:</span>
                  <span className="text-lg font-bold text-red-600">S/ {selectedServiceData?.price}</span>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                onClick={handleBack} 
                className="flex-1 h-12 border-2 border-gray-200 hover:bg-gray-50 rounded-xl font-medium"
              >
                Atrás
              </Button>
              <Button 
                onClick={handleBooking}
                disabled={!customerName || !customerPhone || !customerEmail || createAppointment.isPending || checkAvailability.isPending}
                className="flex-1 h-12 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createAppointment.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Confirmando...
                  </>
                ) : checkAvailability.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Verificando...
                  </>
                ) : (
                  "Confirmar Reserva"
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}