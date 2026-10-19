import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Calendar, Clock, User, Phone, Mail, CreditCard } from "lucide-react";
import { formatDateISO, formatDatePeruvian } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import type { ClientRecord, ServiceRecord } from "@/lib/api-types";

interface EditAppointmentDialogProps {
  appointment: any;
  isOpen: boolean;
  onClose: () => void;
  businessId: number;
}

const APPOINTMENT_STATUSES = [
  { value: "pending", label: "Pendiente", color: "bg-yellow-100 text-yellow-800" },
  { value: "confirmed", label: "Confirmada", color: "bg-blue-100 text-blue-800" },
  { value: "completed", label: "Completada", color: "bg-green-100 text-green-800" },
  { value: "cancelled", label: "Cancelada", color: "bg-red-100 text-red-800" },
  { value: "rescheduled", label: "Reprogramada", color: "bg-purple-100 text-purple-800" },
  { value: "no_show", label: "No Asistió", color: "bg-gray-100 text-gray-800" }
];

export default function EditAppointmentDialog({ 
  appointment, 
  isOpen, 
  onClose, 
  businessId 
}: EditAppointmentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState({
    clientId: appointment?.clientId || "",
    serviceId: appointment?.serviceId || "",
    date: appointment?.date || "",
    time: appointment?.time || "",
    status: appointment?.status || "pending",
    notes: appointment?.notes || "",
    clientNotes: appointment?.clientNotes || "",
    price: appointment?.price || ""
  });

  // Reset form when appointment changes
  useEffect(() => {
    if (appointment) {
      setFormData({
        clientId: appointment.clientId || "",
        serviceId: appointment.serviceId || "",
        date: appointment.date || "",
        time: appointment.time || "",
        status: appointment.status || "pending",
        notes: appointment.notes || "",
        clientNotes: appointment.clientNotes || "",
        price: appointment.price || ""
      });
    }
  }, [appointment]);

  // Fetch business data
  const { data: clients } = useQuery<ClientRecord[]>({
    queryKey: [`/api/dashboard/businesses/${businessId}/clients`],
    enabled: isOpen,
  });

  const { data: services } = useQuery<ServiceRecord[]>({
    queryKey: [`/api/dashboard/businesses/${businessId}/services`],
    enabled: isOpen
  });

  // Update mutation
  const updateAppointment = useMutation({
    mutationFn: async (appointmentData: any) => {
      const response = await apiRequest(
        'PUT',
        `/api/dashboard/businesses/${businessId}/appointments/${appointment.id}`,
        appointmentData
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Cita actualizada",
        description: "Los cambios se han guardado exitosamente."
      });

      queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${businessId}/appointments`] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete mutation
  const deleteAppointment = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        'DELETE',
        `/api/dashboard/businesses/${businessId}/appointments/${appointment.id}`
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Cita eliminada",
        description: "La cita ha sido eliminada exitosamente."
      });

      queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${businessId}/appointments`] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error al eliminar",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateAppointment.mutate(formData);
  };

  const handleDelete = () => {
    deleteAppointment.mutate();
  };

  const getStatusDisplay = (status: string) => {
    const statusInfo = APPOINTMENT_STATUSES.find(s => s.value === status);
    return statusInfo || { value: status, label: status, color: "bg-gray-100 text-gray-800" };
  };

  const clientName = clients?.find((c) => c.id === appointment?.clientId)?.name || "Cliente no encontrado";
  const serviceName = services?.find((s) => s.id === appointment?.serviceId)?.name || "Servicio no encontrado";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Cita</DialogTitle>
          <p className="text-sm text-gray-600">
            Modifica los detalles de la cita.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Cliente</Label>
              <Select 
                value={formData.clientId.toString()} 
                onValueChange={(value) => setFormData({...formData, clientId: parseInt(value)})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients?.map((client: any) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.name} ({client.phone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Servicio</Label>
              <Select 
                value={formData.serviceId.toString()} 
                onValueChange={(value) => setFormData({...formData, serviceId: parseInt(value)})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar servicio" />
                </SelectTrigger>
                <SelectContent>
                  {services?.map((service: any) => (
                    <SelectItem key={service.id} value={service.id.toString()}>
                      {service.name} - S/ {service.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Fecha</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="date"
                  type="date"
                  value={formData.date ? formData.date.split('T')[0] : ""}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="time">Hora</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({...formData, time: e.target.value})}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </div>

          {/* Status and Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Estado</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData({...formData, status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      <div className="flex items-center">
                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${status.color.split(' ')[0]}`}></span>
                        {status.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="price">Precio</Label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  className="pl-10"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="notes">Notas del Negocio</Label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Notas internas sobre la cita..."
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="clientNotes">Notas del Cliente</Label>
              <textarea
                id="clientNotes"
                value={formData.clientNotes}
                onChange={(e) => setFormData({...formData, clientNotes: e.target.value})}
                placeholder="Notas del cliente al hacer la reserva..."
                className="flex min-h-[60px] w-full rounded-md border border-input bg-gray-50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                rows={2}
                readOnly
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deleteAppointment.isPending}
                >
                  {deleteAppointment.isPending ? "Eliminando..." : "Eliminar Cita"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar cita?</AlertDialogTitle>
                  <AlertDialogDescription>
                    ¿Estás seguro que deseas eliminar esta cita de <strong>{clientName}</strong>? 
                    Esta acción no se puede deshacer y se perderá toda la información relacionada.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={updateAppointment.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {updateAppointment.isPending ? "Guardando..." : "Actualizar Cita"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}