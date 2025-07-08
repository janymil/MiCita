import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, Phone as PhoneIcon, Mail, Star, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface EnhancedBookingWidgetProps {
  services: Array<{
    id: number;
    name: string;
    price: string;
    duration: number;
    description?: string;
  }>;
  businessId: number;
  workingHours?: any;
  blockedDates?: any[];
  blockedHours?: any[];
}

interface AvailableSlot {
  time: string;
  available: boolean;
  isOptimal?: boolean;
  conflictReason?: string;
}

export default function EnhancedBookingWidget({ 
  services, 
  businessId, 
  workingHours, 
  blockedDates, 
  blockedHours 
}: EnhancedBookingWidgetProps) {
  const [selectedService, setSelectedService] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [step, setStep] = useState(1);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get selected service details
  const selectedServiceData = services.find(s => s.id.toString() === selectedService);

  // Fetch enhanced availability with AI-powered recommendations
  const { data: enhancedSlots, isLoading: loadingSlots } = useQuery({
    queryKey: [`/api/appointments/enhanced-availability/${businessId}`, selectedDate, selectedService],
    enabled: !!selectedDate && !!selectedService,
    queryFn: async () => {
      const response = await fetch(
        `/api/appointments/enhanced-availability/${businessId}?date=${selectedDate}&serviceId=${selectedService}`
      );
      
      if (!response.ok) {
        throw new Error('Error loading availability');
      }
      
      return response.json();
    }
  });

  // Enhanced booking mutation with real-time conflict detection
  const bookingMutation = useMutation({
    mutationFn: async (appointmentData: any) => {
      const response = await fetch(`/api/appointments/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointmentData),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        if (response.status === 409) {
          throw new Error(`${result.message}\n\nConflictos detectados: ${result.conflicts?.length || 0}`);
        }
        throw new Error(result.message || 'Error creating appointment');
      }
      
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "¡Reserva confirmada! ✅",
        description: `Tu cita para ${selectedServiceData?.name} el ${selectedDate} a las ${selectedTime} ha sido confirmada. Te enviaremos un recordatorio.`,
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

  const handleBooking = () => {
    if (!customerName || !customerPhone || !customerEmail) {
      toast({
        title: "Información incompleta",
        description: "Por favor completa todos los campos requeridos.",
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

    bookingMutation.mutate(appointmentData);
  };

  const isStepValid = (stepNumber: number) => {
    switch (stepNumber) {
      case 1: return !!selectedService;
      case 2: return !!selectedDate && !!selectedTime;
      case 3: return !!customerName && !!customerPhone && !!customerEmail;
      default: return false;
    }
  };

  const getNextAvailableDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const renderStepProgress = () => (
    <div className="flex items-center justify-center mb-6">
      {[1, 2, 3].map(stepNum => (
        <div key={stepNum} className="flex items-center">
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
            ${step >= stepNum 
              ? 'bg-red-600 text-white' 
              : 'bg-gray-200 text-gray-600'
            }
          `}>
            {isStepValid(stepNum) ? <CheckCircle2 className="w-4 h-4" /> : stepNum}
          </div>
          {stepNum < 3 && (
            <div className={`w-12 h-1 mx-2 ${step > stepNum ? 'bg-red-600' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50">
        <CardTitle className="flex items-center text-xl">
          <Calendar className="w-6 h-6 mr-2 text-red-600" />
          Reserva tu Cita Online
        </CardTitle>
        <p className="text-gray-600">Sistema inteligente de reservas con confirmación inmediata</p>
      </CardHeader>
      
      <CardContent className="p-6">
        {renderStepProgress()}
        
        <AnimatePresence mode="wait">
          {/* Step 1: Service Selection */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-4"
            >
              <div>
                <Label className="text-lg font-medium">Selecciona un Servicio</Label>
                <p className="text-sm text-gray-600 mb-4">Elige el servicio que necesitas</p>
              </div>
              
              <div className="grid gap-4">
                {services.map(service => (
                  <div
                    key={service.id}
                    className={`
                      p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md
                      ${selectedService === service.id.toString() 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-gray-200 hover:border-gray-300'
                      }
                    `}
                    onClick={() => setSelectedService(service.id.toString())}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{service.name}</h3>
                        {service.description && (
                          <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                        )}
                        <div className="flex items-center mt-2 space-x-4">
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {service.duration} min
                          </Badge>
                          <span className="text-lg font-bold text-red-600">
                            S/ {service.price}
                          </span>
                        </div>
                      </div>
                      
                      {selectedService === service.id.toString() && (
                        <CheckCircle2 className="w-6 h-6 text-red-600 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 2: Date and Time Selection */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-6"
            >
              <div>
                <Label className="text-lg font-medium">Fecha y Hora</Label>
                <p className="text-sm text-gray-600">
                  Para {selectedServiceData?.name} ({selectedServiceData?.duration} min)
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="date">Fecha</Label>
                  <Input
                    id="date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Horarios Disponibles</Label>
                  {loadingSlots ? (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {[...Array(9)].map((_, i) => (
                        <div key={i} className="h-10 bg-gray-200 rounded animate-pulse" />
                      ))}
                    </div>
                  ) : enhancedSlots?.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2 mt-2 max-h-40 overflow-y-auto">
                      {enhancedSlots.map((slot: AvailableSlot) => (
                        <Button
                          key={slot.time}
                          variant={selectedTime === slot.time ? "default" : 
                                   slot.available ? "outline" : "secondary"}
                          size="sm"
                          disabled={!slot.available}
                          onClick={() => setSelectedTime(slot.time)}
                          className={`
                            text-xs relative
                            ${slot.isOptimal ? 'ring-2 ring-green-400' : ''}
                            ${!slot.available ? 'opacity-50' : ''}
                          `}
                        >
                          {slot.time}
                          {slot.isOptimal && (
                            <Star className="w-3 h-3 ml-1 text-yellow-500" />
                          )}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center">
                        <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                        <p className="text-sm text-yellow-800">
                          No hay horarios disponibles para esta fecha. 
                          <Button 
                            variant="link" 
                            className="p-0 h-auto text-yellow-800 underline"
                            onClick={() => setSelectedDate(getNextAvailableDate())}
                          >
                            Prueba mañana
                          </Button>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Customer Information */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-6"
            >
              <div>
                <Label className="text-lg font-medium">Información de Contacto</Label>
                <p className="text-sm text-gray-600">
                  Para confirmar tu reserva y enviarte recordatorios
                </p>
              </div>

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
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
          >
            Anterior
          </Button>
          
          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!isStepValid(step)}
              className="bg-red-600 hover:bg-red-700"
            >
              Siguiente
            </Button>
          ) : (
            <Button
              onClick={handleBooking}
              disabled={!isStepValid(3) || bookingMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {bookingMutation.isPending ? "Confirmando..." : "Confirmar Reserva"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}