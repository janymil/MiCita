import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Mail,
  Phone,
  UserPlus,
  Calendar,
  Download
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import DashboardLayout from "@/components/dashboard-layout";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const clientSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().min(9, "El teléfono debe tener al menos 9 dígitos").optional().or(z.literal("")),
  notes: z.string().optional(),
});

type ClientForm = z.infer<typeof clientSchema>;

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clients, isLoading } = useQuery({
    queryKey: ["/api/dashboard/businesses/1/clients"],
  });

  const form = useForm<ClientForm>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ClientForm) => {
      const endpoint = editingClient
        ? `/api/dashboard/clients/${editingClient.id}`
        : "/api/dashboard/businesses/1/clients";
      const method = editingClient ? "PUT" : "POST";
      
      return apiRequest(method, endpoint, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/businesses/1/clients"] });
      setIsDialogOpen(false);
      setEditingClient(null);
      form.reset();
      toast({
        title: editingClient ? "Cliente actualizado" : "Cliente creado",
        description: editingClient 
          ? "Los datos del cliente han sido actualizados."
          : "El cliente ha sido agregado exitosamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo guardar el cliente. Inténtalo nuevamente.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/dashboard/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/businesses/1/clients"] });
      toast({
        title: "Cliente eliminado",
        description: "El cliente ha sido eliminado exitosamente.",
      });
    },
  });

  const onSubmit = (data: ClientForm) => {
    createMutation.mutate(data);
  };

  const handleEdit = (client: any) => {
    setEditingClient(client);
    form.reset({
      name: client.name,
      email: client.email || "",
      phone: client.phone || "",
      notes: client.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleNewClient = () => {
    setEditingClient(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const filteredClients = clients?.filter((client: any) =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.includes(searchTerm)
  ) || [];

  const exportClients = () => {
    if (!clients || clients.length === 0) return;
    
    const csvContent = [
      ["Nombre", "Email", "Teléfono", "Notas", "Fecha de Registro"],
      ...clients.map((client: any) => [
        client.name,
        client.email || "",
        client.phone || "",
        client.notes || "",
        new Date(client.createdAt).toLocaleDateString()
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clientes.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Clientes</h1>
            <p className="text-gray-600">Administra tu base de datos de clientes</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={exportClients}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleNewClient} className="bg-red-600 hover:bg-red-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Cliente
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingClient ? "Editar Cliente" : "Nuevo Cliente"}
                  </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre completo *</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: María González" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="maria@ejemplo.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Teléfono</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="987654321"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notas</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Información adicional del cliente..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={createMutation.isPending}
                        className="flex-1 bg-red-600 hover:bg-red-700"
                      >
                        {createMutation.isPending
                          ? "Guardando..."
                          : editingClient
                          ? "Actualizar"
                          : "Crear Cliente"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search and Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          <div className="lg:col-span-2">
            <Label htmlFor="search">Buscar clientes</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Buscar por nombre, email o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{clients?.length || 0}</p>
                  <p className="text-sm text-gray-600">Total Clientes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <UserPlus className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">
                    {clients?.filter((c: any) => {
                      const thisMonth = new Date();
                      thisMonth.setDate(1);
                      return new Date(c.createdAt) >= thisMonth;
                    }).length || 0}
                  </p>
                  <p className="text-sm text-gray-600">Este Mes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Clients List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Clientes ({filteredClients.length})
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
            ) : filteredClients.length > 0 ? (
              <div className="space-y-4">
                {filteredClients.map((client: any) => (
                  <div key={client.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold">
                          {client.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{client.name}</div>
                        <div className="text-sm text-gray-600 space-y-1">
                          {client.email && (
                            <div className="flex items-center">
                              <Mail className="w-4 h-4 mr-1" />
                              {client.email}
                            </div>
                          )}
                          {client.phone && (
                            <div className="flex items-center">
                              <Phone className="w-4 h-4 mr-1" />
                              {client.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="text-sm text-gray-500 text-right">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(client.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(client)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
                            <AlertDialogDescription>
                              ¿Estás seguro que deseas eliminar a <strong>{client.name}</strong>? 
                              Esta acción no se puede deshacer y se perderán todos los datos relacionados con este cliente, incluyendo sus citas.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(client.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Users className="mx-auto h-12 w-12 mb-4" />
                <h3 className="text-lg font-medium mb-2">No hay clientes</h3>
                <p className="mb-4">
                  {searchTerm
                    ? "No se encontraron clientes con ese criterio de búsqueda"
                    : "Aún no tienes clientes registrados"}
                </p>
                <Button
                  onClick={handleNewClient}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Primer Cliente
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
