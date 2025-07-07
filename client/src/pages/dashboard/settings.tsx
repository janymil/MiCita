import React, { useState } from "react";
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
  Users,
  Globe,
  MapPin,
  Phone,
  Mail,
  Clock,
  Save,
  Link,
  Image,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Camera,
  Calendar,
  MessageSquare,
  ExternalLink,
  Upload,
  Eye,
  Edit3,
  AlertTriangle,
  Plus
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard-layout";
import { BUSINESS_CATEGORIES, DEFAULT_BUSINESS_HOURS, PERUVIAN_CITIES } from "@/lib/constants";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

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

const micrositeSchema = z.object({
  // Identidad y Acceso
  customUrl: z.string().optional(),
  professionalTitle: z.string().optional(),
  publicDescription: z.string().optional(),
  
  // Imágenes de Marca
  profileImage: z.string().optional(),
  coverImage: z.string().optional(),
  
  // Información de Contacto Extendida
  publicEmail: z.string().email("Email inválido").optional().or(z.literal("")),
  publicPhone: z.string().optional(),
  streetAddress: z.string().optional(),
  district: z.string().optional(),
  region: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  
  // Redes Sociales
  facebookUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  instagramUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  tiktokUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  youtubeUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  
  // Funcionalidades
  enablePublicBooking: z.boolean(),
  enableContactForm: z.boolean(),
  enableGallery: z.boolean(),
  
  // Horario de Apertura (Notas)
  scheduleNotes: z.string().optional(),
});

type CreateBusinessForm = z.infer<typeof createBusinessSchema>;
type MicrositeForm = z.infer<typeof micrositeSchema>;

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

  const { data: businessSettings } = useQuery({
    queryKey: ["/api/dashboard/businesses/1/settings"],
    enabled: !!businesses && businesses.length > 0,
  });

  const currentBusiness = businesses?.[0];

  const businessForm = useForm<BusinessForm>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      name: currentBusiness?.name || "",
      description: currentBusiness?.description || "",
      category: currentBusiness?.category || "",
      phone: currentBusiness?.phone || "",
      email: currentBusiness?.email || "",
      address: currentBusiness?.address || "",
      city: currentBusiness?.city || "Lima",
      website: currentBusiness?.website || "",
    },
  });

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

  const { data: currentBusinessSettings } = useQuery({
    queryKey: ["/api/dashboard/businesses", currentBusiness?.id, "settings"],
    enabled: !!currentBusiness?.id,
  });

  const micrositeForm = useForm<MicrositeForm>({
    resolver: zodResolver(micrositeSchema),
    defaultValues: {
      customUrl: "",
      professionalTitle: "",
      publicDescription: "",
      profileImage: "",
      coverImage: "",
      publicEmail: "",
      publicPhone: "",
      streetAddress: "",
      district: "",
      region: "",
      postalCode: "",
      country: "Perú",
      facebookUrl: "",
      instagramUrl: "",
      tiktokUrl: "",
      youtubeUrl: "",
      enablePublicBooking: true,
      enableContactForm: true,
      enableGallery: true,
      scheduleNotes: "",
    },
    mode: "onChange"
  });

  // Reset form when settings data loads - DEBUGGING VERSION
  React.useEffect(() => {
    console.log("🔍 Effect triggered. currentBusinessSettings:", currentBusinessSettings);
    console.log("🔍 Form current values:", micrositeForm.getValues());
    
    if (currentBusinessSettings && Object.keys(currentBusinessSettings).length > 0) {
      console.log("✅ LOADING SETTINGS - customUrl:", currentBusinessSettings.customUrl);
      
      const formData = {
        customUrl: currentBusinessSettings.customUrl || "",
        professionalTitle: currentBusinessSettings.professionalTitle || "",
        publicDescription: currentBusinessSettings.publicDescription || "",
        profileImage: currentBusinessSettings.profileImage || "",
        coverImage: currentBusinessSettings.coverImage || "",
        publicEmail: currentBusinessSettings.publicEmail || "",
        publicPhone: currentBusinessSettings.publicPhone || "",
        streetAddress: currentBusinessSettings.streetAddress || "",
        district: currentBusinessSettings.district || "",
        region: currentBusinessSettings.region || "",
        postalCode: currentBusinessSettings.postalCode || "",
        country: currentBusinessSettings.country || "Perú",
        facebookUrl: currentBusinessSettings.facebookUrl || "",
        instagramUrl: currentBusinessSettings.instagramUrl || "",
        tiktokUrl: currentBusinessSettings.tiktokUrl || "",
        youtubeUrl: currentBusinessSettings.youtubeUrl || "",
        enablePublicBooking: currentBusinessSettings.enablePublicBooking ?? true,
        enableContactForm: currentBusinessSettings.enableContactForm ?? true,
        enableGallery: currentBusinessSettings.enableGallery ?? true,
        scheduleNotes: currentBusinessSettings.scheduleNotes || "",
      };
      
      console.log("✅ SETTING FORM DATA:", formData);
      
      // Force reset the form completely
      micrositeForm.reset(formData);
      
      // Force set the customUrl directly
      setTimeout(() => {
        console.log("✅ FORCE SETTING customUrl:", currentBusinessSettings.customUrl);
        micrositeForm.setValue("customUrl", currentBusinessSettings.customUrl || "", { shouldValidate: true });
        console.log("✅ Form values after force set:", micrositeForm.getValues());
      }, 100);
    }
  }, [currentBusinessSettings]);

  const updateMicrositeSettingsMutation = useMutation({
    mutationFn: async (data: MicrositeForm) => {
      console.log("🔄 Sending data to API:", data);
      
      // Send all data, including empty strings for proper updates
      const response = await fetch(`/api/dashboard/businesses/${currentBusiness?.id}/settings`, {
        method: "PUT",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuración guardada",
        description: "Los cambios del micrositio se han guardado correctamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/businesses", currentBusiness?.id, "settings"] });
    },
    onError: (error) => {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Hubo un problema al guardar la configuración.",
        variant: "destructive",
      });
    },
  });

  const onMicrositeSubmit = (data: MicrositeForm) => {
    console.log("✅ Submitting micrositio data:", data);
    
    // Always submit the data, even if customUrl is empty - let the server handle it
    updateMicrositeSettingsMutation.mutate(data);
  };

  const hoursForm = useForm({
    resolver: zodResolver(hoursSchema),
    defaultValues: currentBusiness?.hours || DEFAULT_BUSINESS_HOURS,
  });

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
      return apiRequest("PUT", `/api/dashboard/businesses/${currentBusiness?.id}`, { hours: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/businesses"] });
      toast({
        title: "Horarios actualizados",
        description: "Los horarios de atención han sido actualizados.",
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
      // Generate slug from name
      const slug = data.name.toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      return apiRequest("POST", "/api/dashboard/businesses", {
        ...data,
        slug,
        country: "Perú",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/businesses"] });
      toast({
        title: "Negocio creado",
        description: "Tu negocio ha sido creado exitosamente.",
      });
      setShowCreateBusinessModal(false);
      createBusinessForm.reset();
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

          {/* Create Business Modal */}
          <Dialog open={showCreateBusinessModal} onOpenChange={setShowCreateBusinessModal}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crear Tu Negocio</DialogTitle>
                <DialogDescription>
                  Completa la información para registrar tu negocio en nuestra plataforma
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
                              {BUSINESS_CATEGORIES.map((category) => (
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
                                {BUSINESS_CATEGORIES.map((category) => (
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

                    <Button
                      type="submit"
                      disabled={updateBusinessMutation.isPending}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateBusinessMutation.isPending ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Microsite Configuration */}
          <TabsContent value="microsite" className="space-y-6">
            <form onSubmit={micrositeForm.handleSubmit(onMicrositeSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Link className="w-5 h-5 mr-2" />
                  Tu Micrositio Público
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Así se muestra tu información a los clientes. Haz clic en editar para modificarla.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>URL del Micrositio</Label>
                    <div className="flex mt-2">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                        {window.location.host}/
                      </span>
                      <Input 
                        placeholder="barberianicolas" 
                        {...micrositeForm.register("customUrl")}
                        className="rounded-l-none"
                        value={micrositeForm.watch("customUrl")}
                        onChange={(e) => micrositeForm.setValue("customUrl", e.target.value)}
                      />
                    </div>
                    {micrositeForm.watch("customUrl") && micrositeForm.watch("customUrl").trim() !== '' ? (
                      <div className="flex items-center space-x-2 mt-2">
                        <p className="text-xs text-green-600">
                          ✓ Tu micrositio: /{micrositeForm.watch("customUrl")}
                        </p>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const customUrl = micrositeForm.watch("customUrl");
                            if (customUrl && customUrl.trim() !== '') {
                              const url = `/${customUrl}`;
                              window.open(url, '_blank');
                            } else {
                              toast({
                                title: "Error",
                                description: "Primero configura la URL del negocio.",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Vista Previa
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 mt-2">
                        Configura tu URL personalizada para ver la vista previa
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>Título Profesional</Label>
                    <Input 
                      placeholder="Ej: Barbería" 
                      {...micrositeForm.register("professionalTitle")}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div>
                  <Label>Descripción Pública</Label>
                  <Textarea
                    placeholder="Descripción que verán tus clientes en tu micrositio público..."
                    rows={4}
                    {...micrositeForm.register("publicDescription")}
                    className="mt-2"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Imágenes de Marca */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Image className="w-5 h-5 mr-2 text-purple-600" />
                  Imágenes de Marca
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-base font-medium">Imagen de Perfil</Label>
                    <div className="mt-2">
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center border overflow-hidden mb-2">
                        {micrositeForm.watch("profileImage") ? (
                          <img 
                            src={micrositeForm.watch("profileImage")} 
                            alt="Perfil" 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <Camera className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <Input 
                        type="url" 
                        placeholder="https://ejemplo.com/imagen.jpg" 
                        {...micrositeForm.register("profileImage")}
                      />
                      <p className="text-xs text-gray-500 mt-1">URL de imagen de perfil</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-base font-medium">Imagen de Portada</Label>
                    <div className="mt-2">
                      <div className="w-full h-24 bg-gray-100 rounded-lg border flex items-center justify-center overflow-hidden mb-2">
                        {micrositeForm.watch("coverImage") ? (
                          <img 
                            src={micrositeForm.watch("coverImage")} 
                            alt="Portada" 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="text-center">
                            <Camera className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                            <span className="text-sm text-gray-500">Imagen de portada</span>
                          </div>
                        )}
                      </div>
                      <Input 
                        type="url" 
                        placeholder="https://ejemplo.com/portada.jpg" 
                        {...micrositeForm.register("coverImage")}
                      />
                      <p className="text-xs text-gray-500 mt-1">URL de imagen de portada - Recomendado 1200x400px</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Información de Contacto */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-purple-600" />
                  Información de Contacto y Ubicación
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Email Público</Label>
                    <Input 
                      type="email" 
                      placeholder="contacto@negocio.com" 
                      {...micrositeForm.register("publicEmail")}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>Teléfono Público</Label>
                    <Input 
                      placeholder="+51 987 654 321" 
                      {...micrositeForm.register("publicPhone")}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div>
                  <Label>Calle y Número</Label>
                  <Input 
                    placeholder="Av. Larco 345" 
                    {...micrositeForm.register("streetAddress")}
                    className="mt-2"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label>Ciudad / Distrito</Label>
                    <Input 
                      placeholder="Miraflores" 
                      {...micrositeForm.register("district")}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>Referencia / Región</Label>
                    <Input 
                      placeholder="Cerca al parque Kennedy" 
                      {...micrositeForm.register("region")}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>Código Postal</Label>
                    <Input 
                      placeholder="15074" 
                      {...micrositeForm.register("postalCode")}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div>
                  <Label>País</Label>
                  <Input 
                    {...micrositeForm.register("country")}
                    disabled 
                    className="mt-2"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Redes Sociales */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2 text-purple-600" />
                  Redes Sociales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="flex items-center">
                      <Facebook className="w-4 h-4 mr-2 text-blue-600" />
                      Facebook
                    </Label>
                    <Input 
                      placeholder="https://facebook.com/tu-negocio" 
                      {...micrositeForm.register("facebookUrl")}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="flex items-center">
                      <Instagram className="w-4 h-4 mr-2 text-pink-600" />
                      Instagram
                    </Label>
                    <Input 
                      placeholder="https://instagram.com/tu-negocio" 
                      {...micrositeForm.register("instagramUrl")}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="flex items-center">
                      <Twitter className="w-4 h-4 mr-2 text-black" />
                      TikTok
                    </Label>
                    <Input 
                      placeholder="https://tiktok.com/@tu-negocio" 
                      {...micrositeForm.register("tiktokUrl")}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="flex items-center">
                      <Youtube className="w-4 h-4 mr-2 text-red-600" />
                      YouTube
                    </Label>
                    <Input 
                      placeholder="https://youtube.com/@tu-negocio" 
                      {...micrositeForm.register("youtubeUrl")}
                      className="mt-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Funcionalidades */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="w-5 h-5 mr-2 text-purple-600" />
                  Funcionalidades
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-3 text-blue-600" />
                      <div>
                        <Label className="text-base font-medium">Reservas Públicas</Label>
                        <p className="text-sm text-gray-600">
                          Permite que los clientes reserven citas desde tu micrositio
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={micrositeForm.watch("enablePublicBooking")}
                      onCheckedChange={(checked) => micrositeForm.setValue("enablePublicBooking", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center">
                      <MessageSquare className="w-4 h-4 mr-3 text-blue-600" />
                      <div>
                        <Label className="text-base font-medium">Formulario de Contacto</Label>
                        <p className="text-sm text-gray-600">
                          Formulario para que los clientes te envíen mensajes
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={micrositeForm.watch("enableContactForm")}
                      onCheckedChange={(checked) => micrositeForm.setValue("enableContactForm", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center">
                      <Camera className="w-4 h-4 mr-3 text-blue-600" />
                      <div>
                        <Label className="text-base font-medium">Galería de Trabajos</Label>
                        <p className="text-sm text-gray-600">
                          Muestra tus trabajos y servicios en una galería
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={micrositeForm.watch("enableGallery")}
                      onCheckedChange={(checked) => micrositeForm.setValue("enableGallery", checked)}
                    />
                  </div>
                </div>

                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <Label className="text-base font-medium">Notas de Horario</Label>
                  <p className="text-sm text-gray-600 mb-2">
                    Información adicional sobre horarios especiales o días festivos
                  </p>
                  <Textarea
                    placeholder="Ej: Martes a Domingo, 9.00 - 22.00. Atendemos con cita previa los lunes."
                    rows={3}
                    {...micrositeForm.register("scheduleNotes")}
                    className="mt-2"
                  />
                </div>
              </CardContent>
            </Card>


            
            {/* Save Button */}
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <Button 
                    variant="outline" 
                    className="flex items-center"
                    onClick={() => {
                      const customUrl = micrositeForm.getValues("customUrl");
                      if (customUrl && customUrl.trim() !== '') {
                        window.open(`/${customUrl}`, '_blank');
                      } else {
                        toast({
                          title: "URL no configurada",
                          description: "Primero guarda una URL personalizada para ver la vista previa.",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Vista Previa del Micrositio
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-red-600 hover:bg-red-700"
                    onClick={micrositeForm.handleSubmit(onMicrositeSubmit)}
                    disabled={updateMicrositeSettingsMutation.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateMicrositeSettingsMutation.isPending ? "Guardando..." : "Guardar Configuración"}
                  </Button>
                </div>
              </CardContent>
            </Card>
            </form>
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
                <div className="space-y-4">
                  {days.map((day) => (
                    <div key={day.key} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <div className="w-24">
                        <Label className="text-sm font-medium">{day.label}</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="time"
                          defaultValue="09:00"
                          className="w-32"
                        />
                        <span className="text-gray-500">-</span>
                        <Input
                          type="time"
                          defaultValue="17:00"
                          className="w-32"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch defaultChecked={day.key !== 'sunday'} />
                        <Label className="text-sm text-gray-600">Abierto</Label>
                      </div>
                    </div>
                  ))}
                  <Button className="bg-red-600 hover:bg-red-700">
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Horarios
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Blocked Dates and Hours */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
                  Fechas y Horas Bloqueadas
                </CardTitle>
                <p className="text-sm text-gray-600 mt-2">
                  Configura días y horarios cuando no estarás disponible para citas
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-base font-medium mb-3 block">Fechas Bloqueadas</Label>
                  <div className="space-y-3">
                    <div className="flex space-x-2">
                      <Input 
                        type="date" 
                        placeholder="Seleccionar fecha"
                        className="flex-1"
                        id="blockDate"
                      />
                      <Button type="button" variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Bloquear Fecha
                      </Button>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 min-h-[100px]">
                      <p className="text-sm text-gray-600 text-center">
                        No hay fechas bloqueadas configuradas
                      </p>
                      <p className="text-xs text-gray-500 text-center mt-2">
                        Las fechas bloqueadas no estarán disponibles para reservas
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-base font-medium mb-3 block">Horas Específicas Bloqueadas</Label>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <Input type="date" placeholder="Fecha" />
                      <Input type="time" placeholder="Hora inicio" />
                      <Input type="time" placeholder="Hora fin" />
                    </div>
                    <Button type="button" variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Bloquear Horario
                    </Button>
                    <div className="bg-gray-50 rounded-lg p-4 min-h-[100px]">
                      <p className="text-sm text-gray-600 text-center">
                        No hay horarios específicos bloqueados
                      </p>
                      <p className="text-xs text-gray-500 text-center mt-2">
                        Bloquea horarios específicos en días particulares
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button className="bg-red-600 hover:bg-red-700">
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Configuración de Bloqueos
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  Horarios de Atención
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...hoursForm}>
                  <form onSubmit={hoursForm.handleSubmit(onHoursSubmit)} className="space-y-4">
                    {days.map((day) => (
                      <div key={day.key} className="flex items-center space-x-4 p-4 border rounded-lg">
                        <div className="w-24">
                          <Label className="font-medium">{day.label}</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Input
                            type="time"
                            {...hoursForm.register(`${day.key}.open` as any)}
                            disabled={hoursForm.watch(`${day.key}.closed` as any)}
                            className="w-32"
                          />
                          <span className="text-gray-500">-</span>
                          <Input
                            type="time"
                            {...hoursForm.register(`${day.key}.close` as any)}
                            disabled={hoursForm.watch(`${day.key}.closed` as any)}
                            className="w-32"
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={!hoursForm.watch(`${day.key}.closed` as any)}
                            onCheckedChange={(checked) => 
                              hoursForm.setValue(`${day.key}.closed` as any, !checked)
                            }
                          />
                          <Label className="text-sm text-gray-600">Abierto</Label>
                        </div>
                      </div>
                    ))}

                    <Button
                      type="submit"
                      disabled={updateHoursMutation.isPending}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateHoursMutation.isPending ? "Guardando..." : "Guardar Horarios"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance */}
          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Palette className="w-5 h-5 mr-2" />
                  Personalización del Micrositio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-base font-medium">Tema del Micrositio</Label>
                  <p className="text-sm text-gray-600 mb-4">
                    Personaliza la apariencia de tu micrositio público
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <div className="w-full h-20 bg-gradient-to-br from-red-500 to-yellow-500 rounded mb-3"></div>
                      <p className="font-medium">Clásico Peruano</p>
                      <p className="text-sm text-gray-600">Colores tradicionales</p>
                    </div>

                    <div className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <div className="w-full h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded mb-3"></div>
                      <p className="font-medium">Moderno</p>
                      <p className="text-sm text-gray-600">Diseño contemporáneo</p>
                    </div>

                    <div className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <div className="w-full h-20 bg-gradient-to-br from-green-500 to-blue-500 rounded mb-3"></div>
                      <p className="font-medium">Natural</p>
                      <p className="text-sm text-gray-600">Colores naturales</p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="primary-color" className="text-base font-medium">
                    Color Principal
                  </Label>
                  <p className="text-sm text-gray-600 mb-4">
                    Color principal para botones y elementos destacados
                  </p>
                  <Input
                    type="color"
                    id="primary-color"
                    defaultValue="#dc2626"
                    className="w-20 h-12"
                  />
                </div>

                <Button className="bg-red-600 hover:bg-red-700">
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Personalización
                </Button>
              </CardContent>
            </Card>
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
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Notificaciones por Email</Label>
                      <p className="text-sm text-gray-600">
                        Recibir notificaciones de nuevas citas y recordatorios
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Recordatorios de Citas</Label>
                      <p className="text-sm text-gray-600">
                        Enviar recordatorios automáticos a los clientes
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Notificaciones SMS</Label>
                      <p className="text-sm text-gray-600">
                        Recibir SMS para citas urgentes (próximamente)
                      </p>
                    </div>
                    <Switch />
                  </div>

                  <div className="flex items-center justify-between">
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


      </div>
    </DashboardLayout>
  );
}