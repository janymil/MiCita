import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BookingWidgetProps {
  services: Array<{
    id: number;
    name: string;
    price: string;
    duration: number;
  }>;
  businessId: number;
}

export default function BookingWidget({ services, businessId }: BookingWidgetProps) {
  const [selectedService, setSelectedService] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const { toast } = useToast();

  const timeSlots = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00"
  ];

  const handleBooking = () => {
    if (!selectedService || !selectedDate || !selectedTime) {
      toast({
        title: "Información incompleta",
        description: "Por favor completa todos los campos para hacer la reserva.",
        variant: "destructive"
      });
      return;
    }

    // TODO: Implement actual booking logic
    toast({
      title: "¡Reserva exitosa!",
      description: "Tu cita ha sido programada. Recibirás una confirmación por email.",
    });

    // Reset form
    setSelectedService("");
    setSelectedDate("");
    setSelectedTime("");
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          Reservar Cita
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="service">Servicio</Label>
          <Select value={selectedService} onValueChange={setSelectedService}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un servicio" />
            </SelectTrigger>
            <SelectContent>
              {services.map((service) => (
                <SelectItem key={service.id} value={service.id.toString()}>
                  {service.name} - S/ {service.price} ({service.duration} min)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="date">Fecha</Label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div>
          <Label htmlFor="time">Hora</Label>
          <Select value={selectedTime} onValueChange={setSelectedTime}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una hora" />
            </SelectTrigger>
            <SelectContent>
              {timeSlots.map((time) => (
                <SelectItem key={time} value={time}>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    {time}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={handleBooking}
          className="w-full bg-red-600 hover:bg-red-700"
        >
          Reservar Ahora
        </Button>
      </CardContent>
    </Card>
  );
}
