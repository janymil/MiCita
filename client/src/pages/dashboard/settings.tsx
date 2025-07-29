import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Settings,
  Building2,
  Palette,
  Bell,
  Globe,
  Clock,
  Save
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard-layout";
import { DEFAULT_BUSINESS_HOURS, PERUVIAN_CITIES } from "@/lib/constants";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/theme-context";
import { MicrositeSettings } from "@/components/microsite-settings";
import { AppearanceSettings } from "@/components/appearance-settings";

const businessSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  description: z.string().optional(),
  category: z.string().min(1, "Selecciona una categoría"),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().min(1, "Selecciona una ciudad"),
  website: z.string().url("URL inválida").optional().or(z.literal("")),
});

type BusinessForm = z.infer<typeof businessSchema>;

const createBusinessSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  category: z.string().min(1, "Selecciona una categoría"),
  description: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().min(1, "Selecciona una ciudad"),
  website: z.string().url("URL inválida").optional().or(z.literal("")),
});

type CreateBusinessForm = z.infer<typeof createBusinessSchema>;

const hoursSchema = z.object({
  monday: z.object({
    open: z.string(),
    close: z.string(),
    closed: z.boolean(),
  }),
  tuesday: z.object({
    open: z.string(),
    close: z.string(),
    closed: z.boolean(),
  }),
  wednesday: z.object({
    open: z.string(),
    close: z.string(),
    closed: z.boolean(),
  }),
  thursday: z.object({
    open: z.string(),
    close: z.string(),
    closed: z.boolean(),
  }),
  friday: z.object({
    open: z.string(),
    close: z.string(),
    closed: z.boolean(),
  }),
  saturday: z.object({
    open: z.string(),
    close: z.string(),
    closed: z.boolean(),
  }),
  sunday: z.object({
    open: z.string(),
    close: z.string(),
    closed: z.boolean(),
  }),
});

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("business");
  const [showCreateBusinessModal, setShowCreateBusinessModal] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: businesses, isLoading } = useQuery({
    queryKey: ["/api/dashboard/businesses"],
  });

  const currentBusiness = Array.isArray(businesses) ? businesses[0] : null;

  const { data: businessSettings } = useQuery({
    queryKey: [`/api/dashboard/businesses/${currentBusiness?.id}/settings`],
    enabled: Boolean(currentBusiness?.id),
  });

  // Fetch categories dynamically
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const response = await fetch('/api/categories');
      if (!response.ok) return [];
      return response.json();
    },
  });

  const businessForm = useForm<BusinessForm>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      phone: "",
      email: "",
      address: "",
      city: "Lima",
      website: "",
    },
  });

  // Update form when business data loads
  React.useEffect(() => {
    if (currentBusiness) {
      businessForm.reset({
        name: currentBusiness.name || "",
        description: currentBusiness.description || "",
        category: currentBusiness.category || "",
        phone: currentBusiness.phone || "",
        email: currentBusiness.email || "",
        address: currentBusiness.address || "",
        city: currentBusiness.city || "Lima",
        website: currentBusiness.website || "",
      });
    }
  }, [currentBusiness, businessForm]);

  const createBusinessForm = useForm<CreateBusinessForm>({
    resolver: zodResolver(createBusinessSchema),
    defaultValues: {
      name: "",
      category: "",
      description: "",
      phone: "",
      email: "",
      address: "",
      city: "Lima",
      website: "",
    },
  });

  const hoursForm = useForm({
    resolver: zodResolver(hoursSchema),
    defaultValues: currentBusiness?.hours || DEFAULT_BUSINESS_HOURS,
  });

  // Load current business hours from both sources
  React.useEffect(() => {
    // Priority 1: Check businessSettings.workingHours (microsite source)
    if (businessSettings && (businessSettings as any)?.workingHours) {
      const workingHours = (businessSettings as any).workingHours;
      Object.keys(workingHours).forEach((day) => {
        if (workingHours[day]) {
          hoursForm.setValue(day as any, {
            open: workingHours[day].start || "09:00",
            close: workingHours[day].end || "17:00", 
            closed: !workingHours[day].enabled
          });
        }
      });
    }
    // Priority 2: Fallback to currentBusiness.businessHours (legacy)
    else if (currentBusiness?.businessHours) {
      const hours = currentBusiness.businessHours;
      Object.keys(hours).forEach((day) => {
        if (hours[day]) {
          hoursForm.setValue(day as any, {
            open: hours[day].open || "09:00",
            close: hours[day].close || "17:00", 
            closed: hours[day].closed || false
          });
        }
      });
    }
  }, [currentBusiness, businessSettings, hoursForm]);

  const updateBusinessMutation = useMutation({
    mutationFn: async (data: BusinessForm) => {
      return apiRequest("PUT", `/api/dashboard/businesses/${currentBusiness?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/businesses"] });
      toast({
        title: "Información actualizada",
        description: "Los datos de tu negocio han sido actualizados exitosamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la información. Inténtalo nuevamente.",
        variant: "destructive",
      });
    },
  });

  const updateHoursMutation = useMutation({
    mutationFn: async (data: any) => {
      // Convert the hours format for settings (microsite compatibility)
      const workingHours = Object.keys(data).reduce((acc, day) => {
        acc[day] = {
          enabled: !data[day].closed,
          start: data[day].open,
          end: data[day].close
        };
        return acc;
      }, {} as any);

      // Save to BOTH locations to keep business hours and microsite in sync
      await Promise.all([
        // Save to business table (for Hours tab)
        apiRequest("PUT", `/api/dashboard/businesses/${currentBusiness?.id}`, { hours: data }),
        // Save to settings table (for microsite display)
        apiRequest("PUT", `/api/dashboard/businesses/${currentBusiness?.id}/settings`, { workingHours })
      ]);
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/businesses"] });
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${currentBusiness?.id}/settings`] });
      toast({
        title: "Horarios actualizados",
        description: "Los horarios de atención han sido actualizados en toda la plataforma.",
      });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PUT", `/api/dashboard/businesses/${currentBusiness?.id}/settings`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/businesses/1/settings"] });
      toast({
        title: "Configuración guardada",
        description: "Las preferencias han sido actualizadas.",
      });
    },
  });

  const createBusinessMutation = useMutation({
    mutationFn: async (data: CreateBusinessForm) => {
      // Don't generate slug automatically - it will be set when configuring micrositio
      return apiRequest("POST", "/api/dashboard/businesses", {
        ...data,
        country: "Perú",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/businesses"] });
      toast({
        title: "Negocio creado",
        description: "Tu negocio ha sido creado exitosamente. Ahora configura tu micrositio.",
      });
      setShowCreateBusinessModal(false);
      createBusinessForm.reset();
      // Switch to micrositio tab to configure the URL
      setActiveTab("microsite");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear el negocio. Inténtalo nuevamente.",
        variant: "destructive",
      });
    },
  });

  const onBusinessSubmit = (data: BusinessForm) => {
    updateBusinessMutation.mutate(data);
  };

  const onHoursSubmit = (data: any) => {
    updateHoursMutation.mutate(data);
  };

  const onCreateBusinessSubmit = (data: CreateBusinessForm) => {
    if (currentBusiness) {
      // If there's already a business, show a warning and don't allow creation
      toast({
        title: "Ya tienes un negocio",
        description: `Ya tienes un negocio registrado: "${currentBusiness.name}". Solo puedes tener un negocio por cuenta.`,
        variant: "destructive",
      });
      setShowCreateBusinessModal(false);
      return;
    }
    createBusinessMutation.mutate(data);
  };

  const days = [
    { key: "monday", label: "Lunes" },
    { key: "tuesday", label: "Martes" },
    { key: "wednesday", label: "Miércoles" },
    { key: "thursday", label: "Jueves" },
    { key: "friday", label: "Viernes" },
    { key: "saturday", label: "Sábado" },
    { key: "sunday", label: "Domingo" },
  ];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!currentBusiness) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-8 text-center">
              <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay negocio configurado
              </h3>
              <p className="text-gray-600 mb-6">
                Primero necesitas crear un negocio para acceder a la configuración
              </p>
              <Button 
                className="bg-red-600 hover:bg-red-700"
                onClick={() => {
                  console.log("Button clicked, opening modal");
                  setShowCreateBusinessModal(true);
                }}
              >
                Crear Mi Negocio
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
          <p className="text-gray-600">
            Administra la información y preferencias de tu negocio
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="business" className="flex items-center">
              <Building2 className="w-4 h-4 mr-2" />
              Negocio
            </TabsTrigger>
            <TabsTrigger value="microsite" className="flex items-center">
              <Globe className="w-4 h-4 mr-2" />
              Micrositio
            </TabsTrigger>
            <TabsTrigger value="hours" className="flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              Horarios
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center">
              <Palette className="w-4 h-4 mr-2" />
              Apariencia
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center">
              <Bell className="w-4 h-4 mr-2" />
              Notificaciones
            </TabsTrigger>
          </TabsList>

          {/* Business Information */}
          <TabsContent value="business" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building2 className="w-5 h-5 mr-2" />
                  Información del Negocio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...businessForm}>
                  <form onSubmit={businessForm.handleSubmit(onBusinessSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={businessForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre del Negocio *</FormLabel>
                            <FormControl>
                              <Input placeholder="Ej: Spa Relajante Lima" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={businessForm.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Categoría *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona una categoría" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categories.map((category: any) => (
                                  <SelectItem key={category.id} value={category.id}>
                                    {category.name}
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
                      control={businessForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descripción</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe tu negocio..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={businessForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Teléfono</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="+51 987 654 321"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={businessForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="info@tunegocio.pe"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={businessForm.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dirección</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Av. Larco 345, Miraflores"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={businessForm.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ciudad *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona una ciudad" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {PERUVIAN_CITIES.map((city) => (
                                  <SelectItem key={city} value={city}>
                                    {city}
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
                      control={businessForm.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sitio Web</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://www.tunegocio.pe"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-4">
                      <Button
                        type="submit"
                        disabled={updateBusinessMutation.isPending}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {updateBusinessMutation.isPending ? "Guardando..." : "Guardar Cambios"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowCreateBusinessModal(true)}
                      >
                        <Building2 className="w-4 h-4 mr-2" />
                        Crear Nuevo Negocio
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Microsite Configuration */}
          <TabsContent value="microsite" className="space-y-6">
            <MicrositeSettings currentBusiness={currentBusiness} />
          </TabsContent>

          {/* Business Hours */}
          <TabsContent value="hours" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  Horarios de Atención
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={hoursForm.handleSubmit(onHoursSubmit)} className="space-y-4">
                  {days.map((day) => {
                    const dayHours = hoursForm.watch(day.key as any);
                    const isClosed = dayHours?.closed;
                    
                    return (
                      <div key={day.key} className="flex items-center space-x-4 p-4 border rounded-lg">
                        <div className="w-24">
                          <Label className="text-sm font-medium">{day.label}</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="time"
                            value={dayHours?.open || "09:00"}
                            onChange={(e) => hoursForm.setValue(`${day.key}.open` as any, e.target.value)}
                            className="w-32"
                            disabled={isClosed}
                          />
                          <span className="text-gray-500">-</span>
                          <Input
                            type="time"
                            value={dayHours?.close || "17:00"}
                            onChange={(e) => hoursForm.setValue(`${day.key}.close` as any, e.target.value)}
                            className="w-32"
                            disabled={isClosed}
                          />
                        </div>
                        <div className="flex items-center space-x-2 bg-gray-50 p-2 rounded-md">
                          <Switch 
                            checked={!isClosed}
                            onCheckedChange={(checked) => hoursForm.setValue(`${day.key}.closed` as any, !checked)}
                          />
                          <Label className={`text-sm font-medium transition-colors ${isClosed ? 'text-red-600' : 'text-green-600'}`}>
                            {isClosed ? 'Cerrado' : 'Abierto'}
                          </Label>
                        </div>
                      </div>
                    );
                  })}
                  <Button 
                    type="submit"
                    className="bg-red-600 hover:bg-red-700"
                    disabled={updateHoursMutation.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateHoursMutation.isPending ? "Guardando..." : "Guardar Horarios"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance */}
          <TabsContent value="appearance" className="space-y-6">
            <AppearanceSettings />
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="w-5 h-5 mr-2" />
                  Preferencias de Notificaciones
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <Label className="text-base font-medium">Notificaciones por Email</Label>
                      <p className="text-sm text-gray-600">
                        Recibir notificaciones de nuevas citas y recordatorios
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <Label className="text-base font-medium">Recordatorios de Citas</Label>
                      <p className="text-sm text-gray-600">
                        Enviar recordatorios automáticos a los clientes
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <Label className="text-base font-medium">Notificaciones SMS</Label>
                      <p className="text-sm text-gray-600">
                        Recibir SMS para citas urgentes (próximamente)
                      </p>
                    </div>
                    <Switch />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <Label className="text-base font-medium">Reportes Semanales</Label>
                      <p className="text-sm text-gray-600">
                        Resumen semanal de tu negocio por email
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>

                <Button
                  onClick={() => updateSettingsMutation.mutate({})}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Preferencias
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create Business Modal - Available for both new and existing businesses */}
        <Dialog open={showCreateBusinessModal} onOpenChange={setShowCreateBusinessModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Tu Negocio</DialogTitle>
              <DialogDescription>
                {currentBusiness ? 
                  "Ya tienes un negocio registrado. Solo puedes tener un negocio por cuenta." :
                  "Completa la información para registrar tu negocio en nuestra plataforma"
                }
              </DialogDescription>
            </DialogHeader>

            <Form {...createBusinessForm}>
              <form onSubmit={createBusinessForm.handleSubmit(onCreateBusinessSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={createBusinessForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre del Negocio *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Spa Relajante Lima" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createBusinessForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoría *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona una categoría" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category: any) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
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
                  control={createBusinessForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe tu negocio y los servicios que ofreces..."
                          {...field}
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={createBusinessForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="+51 987 654 321"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createBusinessForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="info@tunegocio.pe"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={createBusinessForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dirección</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Av. Larco 345, Miraflores"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createBusinessForm.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ciudad *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona una ciudad" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PERUVIAN_CITIES.map((city) => (
                              <SelectItem key={city} value={city}>
                                {city}
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
                  control={createBusinessForm.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sitio Web</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://www.tunegocio.pe"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateBusinessModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createBusinessMutation.isPending}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {createBusinessMutation.isPending ? "Creando..." : "Crear Negocio"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}