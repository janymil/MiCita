import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Calendar, Clock, User, CreditCard } from "lucide-react";

const appointmentSchema = z.object({
  clientId: z.string().min(1, "Selecciona un cliente"),
  serviceId: z.string().min(1, "Selecciona un servicio"),
  date: z.string().min(1, "Selecciona una fecha"),
  time: z.string().min(1, "Selecciona una hora"),
  notes: z.string().optional(),
});

type AppointmentForm = z.infer<typeof appointmentSchema>;

interface AppointmentFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: number;
  initialDate?: string;
  title?: string;
}

// Generate time slots from 8:00 to 20:00
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 8; hour <= 20; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(timeString);
    }
  }
  return slots;
};

export default function AppointmentFormDialog({
  isOpen,
  onClose,
  businessId,
  initialDate,
  title = "Nueva Cita"
}: AppointmentFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedServicePrice, setSelectedServicePrice] = useState<string>("");

  const form = useForm<AppointmentForm>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      clientId: "",
      serviceId: "",
      date: initialDate || "",
      time: "",
      notes: "",
    },
  });

  // Reset form when dialog opens with initial date
  useEffect(() => {
    if (isOpen && initialDate) {
      form.setValue('date', initialDate);
    }
  }, [isOpen, initialDate, form]);

  // Fetch business data
  const { data: clients } = useQuery({
    queryKey: [`/api/dashboard/businesses/${businessId}/clients`],
    enabled: isOpen
  });

  const { data: services } = useQuery({
    queryKey: [`/api/dashboard/businesses/${businessId}/services`],
    enabled: isOpen
  });

  // Watch for service selection to update price display
  const selectedServiceId = form.watch("serviceId");
  useEffect(() => {
    if (selectedServiceId && services) {
      const service = services.find((s: any) => s.id.toString() === selectedServiceId);
      setSelectedServicePrice(service?.price || "");
    } else {
      setSelectedServicePrice("");
    }
  }, [selectedServiceId, services]);

  const createAppointment = useMutation({
    mutationFn: async (appointmentData: AppointmentForm) => {
      // Get the selected service to determine duration and price
      const selectedService = services?.find((s: any) => s.id.toString() === appointmentData.serviceId);
      
      const payload = {
        clientId: parseInt(appointmentData.clientId),
        serviceId: parseInt(appointmentData.serviceId),
        date: appointmentData.date,
        time: appointmentData.time,
        duration: selectedService?.duration || 60,
        price: selectedService?.price || "0",
        notes: appointmentData.notes || "",
        status: "confirmed" // Business-created appointments are confirmed by default
      };

      return apiRequest(`/api/dashboard/businesses/${businessId}/appointments`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast({
        title: "Cita creada",
        description: "La cita ha sido creada exitosamente."
      });
      
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${businessId}/appointments`] });
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear la cita",
        description: error.message || "Ha ocurrido un error inesperado.",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: AppointmentForm) => {
    createAppointment.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    setSelectedServicePrice("");
    onClose();
  };

  const timeSlots = generateTimeSlots();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients?.map((client: any) => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          {client.name} ({client.phone})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="serviceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Servicio</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un servicio" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {services?.map((service: any) => (
                        <SelectItem key={service.id} value={service.id.toString()}>
                          {service.name} - S/ {service.price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedServicePrice && (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-800">Precio del servicio:</span>
                  <span className="text-lg font-bold text-green-700">S/ {selectedServicePrice}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          type="date"
                          className="pl-10"
                          min={new Date().toISOString().split('T')[0]}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Hora" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (opcional)</FormLabel>
                  <FormControl>
                    <textarea
                      placeholder="Notas adicionales sobre la cita..."
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createAppointment.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {createAppointment.isPending ? "Creando..." : "Crear Cita"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}