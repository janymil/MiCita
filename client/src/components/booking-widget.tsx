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

  // Create appointment mutation
  const createAppointment = useMutation({
    mutationFn: async (appointmentData: any) => {
      const response = await fetch('/api/appointments/public', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointmentData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error creating appointment');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "¡Reserva exitosa!",
        description: "Tu cita ha sido programada. Recibirás una confirmación por email.",
      });
      
      // Reset form
      setSelectedService("");
      setSelectedDate("");
      setSelectedTime("");
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setStep(1);
      
      // Invalidate availability cache
      queryClient.invalidateQueries({ queryKey: [`/api/appointments/availability/${businessId}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error en la reserva",
        description: error.message,
        variant: "destructive"
      });
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

  const handleBooking = () => {
    if (!selectedService || !selectedDate || !selectedTime || !customerName || !customerPhone || !customerEmail) {
      toast({
        title: "Información incompleta",
        description: "Por favor completa todos los campos para hacer la reserva.",
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
      status: 'pending',
      notes: `Reserva online - ${selectedServiceData?.name}`
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
                    <p className="text-sm text-gray-600 mt-2">Buscando horarios...</p>
                  </div>
                ) : availableSlots && availableSlots.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {availableSlots.map((slot: AvailableSlot) => (
                      <Button
                        key={slot.time}
                        variant={selectedTime === slot.time ? "default" : "outline"}
                        size="sm"
                        disabled={!slot.available}
                        onClick={() => setSelectedTime(slot.time)}
                        className={`text-xs ${selectedTime === slot.time ? 'bg-red-600 hover:bg-red-700' : ''} ${!slot.available ? 'opacity-50' : ''}`}
                      >
                        <Clock className="w-3 h-3 mr-1" />
                        {slot.time}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 py-4 text-center">
                    No hay horarios disponibles para esta fecha. Por favor selecciona otra fecha.
                  </p>
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
                disabled={!customerName || !customerPhone || !customerEmail || createAppointment.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {createAppointment.isPending ? "Reservando..." : "Confirmar Reserva"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
