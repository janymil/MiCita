import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Calendar,
  Clock,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  CheckCircle,
  User
} from "lucide-react";
import DashboardLayout from "@/components/dashboard-layout";
import { APPOINTMENT_STATUSES } from "@/lib/constants";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import EditAppointmentDialog from "@/components/edit-appointment-dialog";
import AppointmentFormDialog from "@/components/appointment-form-dialog";

export default function Appointments() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // TODO: Get businessId from user session or context
  const businessId = 1;

  const { data: appointments, isLoading } = useQuery({
    queryKey: [`/api/dashboard/businesses/${businessId}/appointments`],
  });

  const { data: clients } = useQuery({
    queryKey: [`/api/dashboard/businesses/${businessId}/clients`],
  });

  const { data: services } = useQuery({
    queryKey: [`/api/dashboard/businesses/${businessId}/services`],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest(`/api/dashboard/businesses/${businessId}/appointments/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${businessId}/appointments`] });
      toast({
        title: "Estado actualizado",
        description: "El estado de la cita ha sido actualizado.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/dashboard/businesses/${businessId}/appointments/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${businessId}/appointments`] });
      toast({
        title: "Cita eliminada",
        description: "La cita ha sido eliminada exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al eliminar",
        description: error.message || "No se pudo eliminar la cita. Intenta nuevamente.",
        variant: "destructive",
      });
    },
  });

  const filteredAppointments = appointments?.filter((appointment: any) => {
    const matchesSearch = !searchTerm || 
      clients?.find((c: any) => c.id === appointment.clientId)?.name
        ?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || statusFilter === "all" || appointment.status === statusFilter;
    const matchesDate = !dateFilter || new Date(appointment.date).toISOString().split('T')[0] === dateFilter;
    return matchesSearch && matchesStatus && matchesDate;
  }) || [];

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Citas</h1>
            <p className="text-gray-600">Organiza y administra las citas de tu negocio</p>
          </div>
          
          <Button 
            onClick={() => setIsDialogOpen(true)}
            className="bg-red-600 hover:bg-red-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Cita
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Buscar citas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="status">Estado</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    {Object.entries(APPOINTMENT_STATUSES).map(([key, status]) => (
                      <SelectItem key={key} value={key}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="date">Fecha</Label>
                <Input
                  id="date"
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setDateFilter("");
                  }}
                  className="w-full"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Limpiar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appointments List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Citas ({filteredAppointments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center space-x-4 p-4 border rounded-lg">
                    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                      <div className="h-3 bg-gray-200 rounded w-24"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredAppointments.length > 0 ? (
              <div className="space-y-4">
                {filteredAppointments.map((appointment: any) => {
                  const client = clients?.find((c: any) => c.id === appointment.clientId);
                  const service = services?.find((s: any) => s.id === appointment.serviceId);
                  const status = APPOINTMENT_STATUSES[appointment.status as keyof typeof APPOINTMENT_STATUSES];
                  
                  return (
                    <div key={appointment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {client?.name || `Cliente #${appointment.clientId}`}
                          </div>
                          <div className="text-sm text-gray-600">
                            {service?.name || `Servicio #${appointment.serviceId}`}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {appointment.date} a las {appointment.time}
                          </div>
                          {appointment.clientNotes && (
                            <div className="text-xs text-gray-500 mt-1 max-w-md">
                              <strong>Nota del cliente:</strong> {appointment.clientNotes}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <Badge className={status?.color}>
                          {status?.label}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingAppointment(appointment);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        
                        <div className="text-lg font-semibold text-red-600">
                          S/ {appointment.price}
                        </div>

                        <div className="flex items-center space-x-2">
                          {appointment.status === "pending" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateStatusMutation.mutate({
                                id: appointment.id,
                                status: "confirmed"
                              })}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (confirm("¿Estás seguro que deseas eliminar esta cita? Esta acción no se puede deshacer.")) {
                                deleteMutation.mutate(appointment.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="mx-auto h-12 w-12 mb-4" />
                <h3 className="text-lg font-medium mb-2">No hay citas</h3>
                <p className="mb-4">Aún no tienes citas programadas</p>
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Primera Cita
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Unified Appointment Creation Dialog */}
      <AppointmentFormDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        businessId={businessId}
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
          businessId={businessId}
        />
      )}
    </DashboardLayout>
  );
}