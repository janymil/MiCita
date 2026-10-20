import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Clock, User, Phone as PhoneIcon, Mail, X, ArrowLeft, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDatePeruvian, formatDateISO } from "@/lib/utils";

interface BookingWidgetProps {
  services: Array<{
    id: number;
    name: string;
    price: string | null;
    duration: number | null;
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
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  // Reset form when modal opens
  const handleModalOpen = () => {
    setSelectedService("");
    setSelectedDate("");
    setSelectedTime("");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setCustomerNotes("");
    setStep(1);
    setIsModalOpen(true);
    // Decoupled analytics hook: the public microsite listens for this to count
    // a "book click" without the widget knowing anything about tracking.
    try {
      window.dispatchEvent(new CustomEvent("micita:book-click"));
    } catch {
      // ignore
    }
  };

  // Get selected service details
  const selectedServiceData = services.find(s => s.id.toString() === selectedService);

  // Fetch available time slots for selected date
  const { data: availableSlots, isLoading: loadingSlots } = useQuery({
    queryKey: [`/api/appointments/availability/${businessId}`, selectedDate, selectedService],
    enabled: Boolean(selectedDate && selectedService),
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
      const depositRequired = Boolean(data.deposit?.required && data.deposit?.status === "pending");
      toast({
        title: depositRequired ? "Reserva creada — falta el depósito" : "¡Reserva exitosa!",
        description: depositRequired
          ? `Deja un depósito de S/ ${Number(data.deposit.amount).toFixed(2)} para confirmar tu cita.`
          : `Tu cita para ${data.bookingDetails?.service} el ${formatDatePeruvian(data.bookingDetails?.date)} a las ${data.bookingDetails?.time} ha sido confirmada.`,
      });

      // Reset form and close modal
      setSelectedService("");
      setSelectedDate("");
      setSelectedTime("");
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setCustomerNotes("");
      setStep(1);
      setIsModalOpen(false);

      // Invalidate availability cache
      queryClient.invalidateQueries({ queryKey: [`/api/appointments/availability/${businessId}`] });

      // The manage page owns the deposit payment step (online or in person).
      if (depositRequired && data.manageUrl) {
        window.location.href = data.manageUrl;
      }
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
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogTrigger asChild>
        <Button 
          onClick={handleModalOpen}
          className="w-full h-14 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
        >
          <Calendar className="w-6 h-6 mr-3" />
          Reservar Cita
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 bg-white rounded-2xl shadow-2xl">
        {/* Header with gradient background - Fixed */}
        <DialogHeader className="px-6 py-8 bg-gradient-to-r from-red-500 to-red-600 text-white relative overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <DialogTitle className="text-2xl font-bold flex items-center">
              <Calendar className="w-7 h-7 mr-3" />
              Reservar Cita
            </DialogTitle>
            <p className="text-red-100 mt-2">Agenda tu cita en 3 simples pasos</p>
          </div>
          
          {/* Modern Step Indicator */}
          <div className="flex items-center justify-center mt-6 space-x-4 relative z-10">
            {[
              { number: 1, label: 'Servicio', icon: <Calendar className="w-4 h-4" /> },
              { number: 2, label: 'Fecha & Hora', icon: <Clock className="w-4 h-4" /> },
              { number: 3, label: 'Datos', icon: <User className="w-4 h-4" /> }
            ].map(({ number, label, icon }, index) => (
              <div key={number} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                    step >= number 
                      ? 'bg-white text-red-600 shadow-lg' 
                      : 'bg-white/20 text-white/60 border-2 border-white/30'
                  }`}>
                    {step > number ? <Check className="w-5 h-5" /> : icon}
                  </div>
                  <span className={`text-xs mt-2 font-medium ${
                    step >= number ? 'text-white' : 'text-white/60'
                  }`}>
                    {label}
                  </span>
                </div>
                {index < 2 && (
                  <div className={`w-8 h-1 mx-4 rounded transition-all duration-300 ${
                    step > number + 1 ? 'bg-white' : 'bg-white/30'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </DialogHeader>

        {/* Content area with scroll - Flexible */}
        <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
            {/* Step 1: Service Selection */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Selecciona un Servicio</h3>
                  <p className="text-gray-600 mb-6">¿Qué servicio necesitas hoy?</p>
                  
                  <div className="grid gap-4">
                    {services.map((service) => (
                      <div
                        key={service.id}
                        onClick={() => setSelectedService(service.id.toString())}
                        className={`p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                          selectedService === service.id.toString()
                            ? 'border-red-500 bg-red-50 shadow-lg'
                            : 'border-gray-200 hover:border-red-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-lg text-gray-900">{service.name}</h4>
                            <div className="flex items-center space-x-4 mt-2">
                              <span className="flex items-center text-gray-600">
                                <Clock className="w-4 h-4 mr-1" />
                                {service.duration} min
                              </span>
                              <span className="font-bold text-red-600 text-lg">
                                S/ {service.price}
                              </span>
                            </div>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            selectedService === service.id.toString()
                              ? 'border-red-500 bg-red-500'
                              : 'border-gray-300'
                          }`}>
                            {selectedService === service.id.toString() && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Date and Time Selection */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Selecciona Fecha y Hora</h3>
                  <p className="text-gray-600 mb-6">Escoge el día y horario que mejor te convenga</p>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Date Selection */}
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">Fecha</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3.5 h-5 w-5 text-red-600" />
                        <Input
                          type="date"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          min={minDateStr}
                          max={maxDateStr}
                          className="h-12 pl-12 border-2 border-gray-200 hover:border-red-300 focus:border-red-500 focus:ring-red-500/20 rounded-xl"
                        />
                      </div>
                    </div>

                    {/* Service Summary */}
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <h4 className="font-semibold text-gray-900 mb-2">Servicio Seleccionado</h4>
                      <p className="font-medium text-red-600">{selectedServiceData?.name}</p>
                      <p className="text-sm text-gray-600">{selectedServiceData?.duration} min • S/ {selectedServiceData?.price}</p>
                    </div>
                  </div>

                  {/* Time Slots */}
                  {selectedDate && (
                    <div className="mt-6">
                      <Label className="text-sm font-medium text-gray-700 mb-3 block">Horarios Disponibles</Label>
                      {loadingSlots ? (
                        <div className="text-center py-12">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                          <p className="text-sm text-gray-600 mt-3">Buscando horarios disponibles...</p>
                        </div>
                      ) : availableSlots && availableSlots.length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                          {availableSlots.map((slot: AvailableSlot) => (
                            <Button
                              key={slot.time}
                              variant={selectedTime === slot.time ? "default" : "outline"}
                              disabled={!slot.available}
                              onClick={() => setSelectedTime(slot.time)}
                              className={`h-12 text-sm font-medium transition-all duration-200 ${
                                selectedTime === slot.time 
                                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-md' 
                                  : slot.available 
                                    ? 'border-gray-200 hover:border-red-300 hover:bg-red-50' 
                                    : 'opacity-40 cursor-not-allowed'
                              }`}
                            >
                              {slot.time}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p>No hay horarios disponibles para esta fecha</p>
                          <a
                            className="mt-3 inline-block text-sm font-semibold text-red-600 underline"
                            href={`/lista/${businessId}?serviceId=${selectedService}&date=${selectedDate}`}
                          >
                            Avísame si se libera un cupo
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Customer Information */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Tus Datos</h3>
                  <p className="text-gray-600 mb-6">Completa tus datos para confirmar la reserva</p>

                  {/* Booking Summary */}
                  <div className="p-6 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-100 mb-6">
                    <h4 className="font-bold text-gray-900 mb-3">Resumen de tu cita</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Servicio:</span>
                        <span className="font-medium text-gray-900">{selectedServiceData?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Fecha:</span>
                        <span className="font-medium text-gray-900">{selectedDate && formatDatePeruvian(selectedDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Hora:</span>
                        <span className="font-medium text-gray-900">{selectedTime}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-gray-600">Total:</span>
                        <span className="font-bold text-red-600 text-lg">S/ {selectedServiceData?.price}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        <User className="w-4 h-4 inline mr-1" />
                        Nombre Completo *
                      </Label>
                      <Input
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Tu nombre completo"
                        className="h-12 border-2 border-gray-200 hover:border-red-300 focus:border-red-500 focus:ring-red-500/20 rounded-xl"
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          <PhoneIcon className="w-4 h-4 inline mr-1" />
                          Teléfono *
                        </Label>
                        <Input
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="+51 987 654 321"
                          className="h-12 border-2 border-gray-200 hover:border-red-300 focus:border-red-500 focus:ring-red-500/20 rounded-xl"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          <Mail className="w-4 h-4 inline mr-1" />
                          Email *
                        </Label>
                        <Input
                          type="email"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          placeholder="tu@email.com"
                          className="h-12 border-2 border-gray-200 hover:border-red-300 focus:border-red-500 focus:ring-red-500/20 rounded-xl"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        Comentarios adicionales (opcional)
                      </Label>
                      <textarea
                        value={customerNotes}
                        onChange={(e) => setCustomerNotes(e.target.value)}
                        placeholder="¿Algo que debamos saber?"
                        rows={3}
                        className="w-full p-3 border-2 border-gray-200 hover:border-red-300 focus:border-red-500 focus:ring-red-500/20 rounded-xl resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
        </div>

        {/* Footer with navigation buttons - Fixed at bottom */}
        <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between flex-shrink-0">
          <div className="flex space-x-3">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={handleBack}
                className="h-12 px-6 border-2 border-gray-200 hover:border-gray-300"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Atrás
              </Button>
            )}
          </div>

          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="h-12 px-6"
            >
              Cancelar
            </Button>

            {step < 3 ? (
              <Button
                onClick={handleNext}
                disabled={
                  (step === 1 && !selectedService) ||
                  (step === 2 && (!selectedDate || !selectedTime))
                }
                className="h-12 px-8 bg-red-500 hover:bg-red-600 text-white font-semibold"
              >
                Continuar
              </Button>
            ) : (
              <Button
                onClick={handleBooking}
                disabled={
                  !selectedService || !selectedDate || !selectedTime || 
                  !customerName || !customerPhone || !customerEmail ||
                  createAppointment.isPending
                }
                className="h-12 px-8 bg-green-500 hover:bg-green-600 text-white font-semibold"
              >
                {createAppointment.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Confirmando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Confirmar Reserva
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}