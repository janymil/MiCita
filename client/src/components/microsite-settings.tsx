import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Globe,
  MapPin,
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
  Save,
  Users,
  Settings,
  Link,
  Plus,
  Trash2,
  AlertTriangle,
  Clock
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

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
  
  // Blocked dates and hours
  blockedDates: z.array(z.object({
    startDate: z.string(),
    endDate: z.string(),
    reason: z.string().optional(),
  })).optional(),
  blockedHours: z.array(z.object({
    date: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    reason: z.string().optional(),
  })).optional(),
});

type MicrositeForm = z.infer<typeof micrositeSchema>;

interface MicrositeSettingsProps {
  currentBusiness: any;
}

export function MicrositeSettings({ currentBusiness }: MicrositeSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Blocked dates state
  const [blockDateStart, setBlockDateStart] = useState("");
  const [blockDateEnd, setBlockDateEnd] = useState("");
  const [blockDateReason, setBlockDateReason] = useState("");
  const [blockedDates, setBlockedDates] = useState<Array<{startDate: string, endDate: string, reason?: string}>>([]);
  
  // Blocked hours state
  const [blockHourDate, setBlockHourDate] = useState("");
  const [blockHourStart, setBlockHourStart] = useState("");
  const [blockHourEnd, setBlockHourEnd] = useState("");
  const [blockHourReason, setBlockHourReason] = useState("");
  const [blockedHours, setBlockedHours] = useState<Array<{date: string, startTime: string, endTime: string, reason?: string}>>([]);

  const { data: currentBusinessSettings } = useQuery({
    queryKey: [`/api/dashboard/businesses/${currentBusiness?.id}/settings`],
    enabled: Boolean(currentBusiness?.id),
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true,
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

  // Set form values when settings load
  React.useEffect(() => {
    if (currentBusinessSettings) {
      // Always set values to match current settings from server
      const settings = currentBusinessSettings as any;
      micrositeForm.setValue("customUrl", settings.customUrl || "");
      micrositeForm.setValue("professionalTitle", settings.professionalTitle || "");
      micrositeForm.setValue("publicDescription", settings.publicDescription || "");
      micrositeForm.setValue("profileImage", settings.profileImage || "");
      micrositeForm.setValue("coverImage", settings.coverImage || "");
      micrositeForm.setValue("publicEmail", settings.publicEmail || "");
      micrositeForm.setValue("publicPhone", settings.publicPhone || "");
      micrositeForm.setValue("streetAddress", settings.streetAddress || "");
      micrositeForm.setValue("district", settings.district || "");
      micrositeForm.setValue("region", settings.region || "");
      micrositeForm.setValue("postalCode", settings.postalCode || "");
      micrositeForm.setValue("country", settings.country || "Perú");
      micrositeForm.setValue("facebookUrl", settings.facebookUrl || "");
      micrositeForm.setValue("instagramUrl", settings.instagramUrl || "");
      micrositeForm.setValue("tiktokUrl", settings.tiktokUrl || "");
      micrositeForm.setValue("youtubeUrl", settings.youtubeUrl || "");
      micrositeForm.setValue("enablePublicBooking", settings.enablePublicBooking ?? true);
      micrositeForm.setValue("enableContactForm", settings.enableContactForm ?? true);
      micrositeForm.setValue("enableGallery", settings.enableGallery ?? true);
      micrositeForm.setValue("scheduleNotes", settings.scheduleNotes || "");
    }
  }, [currentBusinessSettings]);

  // Update blocked dates and hours when settings change
  React.useEffect(() => {
    if (currentBusinessSettings) {
      const settings = currentBusinessSettings as any;
      if (settings.blockedDates) {
        setBlockedDates(settings.blockedDates);
      }
      if (settings.blockedHours) {
        setBlockedHours(settings.blockedHours);
      }
    }
  }, [currentBusinessSettings]);

  const updateMicrositeSettingsMutation = useMutation({
    mutationFn: async (data: MicrositeForm) => {
      console.log("🔄 Sending data to API:", data);
      
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
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${currentBusiness?.id}/settings`] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/businesses"] });
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
    updateMicrositeSettingsMutation.mutate(data);
  };

  // Blocked dates handlers
  const addBlockedDate = () => {
    if (blockDateStart && blockDateEnd) {
      const newBlockedDate = {
        startDate: blockDateStart,
        endDate: blockDateEnd,
        reason: blockDateReason || undefined
      };
      setBlockedDates(prev => [...prev, newBlockedDate]);
      setBlockDateStart("");
      setBlockDateEnd("");
      setBlockDateReason("");
    }
  };

  const removeBlockedDate = (index: number) => {
    setBlockedDates(prev => prev.filter((_, i) => i !== index));
  };

  // Blocked hours handlers
  const addBlockedHour = () => {
    if (blockHourDate && blockHourStart && blockHourEnd) {
      const newBlockedHour = {
        date: blockHourDate,
        startTime: blockHourStart,
        endTime: blockHourEnd,
        reason: blockHourReason || undefined
      };
      setBlockedHours(prev => [...prev, newBlockedHour]);
      setBlockHourDate("");
      setBlockHourStart("");
      setBlockHourEnd("");
      setBlockHourReason("");
    }
  };

  const removeBlockedHour = (index: number) => {
    setBlockedHours(prev => prev.filter((_, i) => i !== index));
  };

  const saveBlockedDatesAndHours = () => {
    const currentData = micrositeForm.getValues();
    const updatedData = {
      ...currentData,
      blockedDates,
      blockedHours
    };
    updateMicrositeSettingsMutation.mutate(updatedData);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={micrositeForm.handleSubmit(onMicrositeSubmit)} className="space-y-6">
        {/* Micrositio URL y Información Básica */}
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
                    placeholder="tunegocio" 
                    {...micrositeForm.register("customUrl")}
                    className="rounded-l-none"
                  />
                </div>
                {micrositeForm.watch("customUrl") && micrositeForm.watch("customUrl")?.trim() !== '' ? (
                  <div className="flex items-center space-x-2 mt-2">
                    <p className="text-xs text-green-600">
                      ✓ Tu micrositio: /{micrositeForm.watch("customUrl") || ""}
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
                    Ingresa una URL personalizada para activar tu micrositio
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
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center border overflow-hidden mb-2 relative group cursor-pointer"
                    onClick={() => document.getElementById('profileImageInput')?.click()}
                  >
                    {micrositeForm.watch("profileImage") ? (
                      <img 
                        src={`${micrositeForm.watch("profileImage")}?t=${Date.now()}`} 
                        alt="Perfil" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <Camera className="w-6 h-6 text-gray-400" />
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                      <Upload className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <input
                    id="profileImageInput"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const formData = new FormData();
                        formData.append('image', file);
                        
                        try {
                          const response = await fetch('/api/upload', {
                            method: 'POST',
                            body: formData
                          });
                          
                          if (response.ok) {
                            const data = await response.json();
                            micrositeForm.setValue('profileImage', window.location.origin + data.url);
                            queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${currentBusiness?.id}/settings`] });
                          } else {
                            toast({
                              title: "Error",
                              description: "No se pudo subir la imagen",
                              variant: "destructive"
                            });
                          }
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: "Error al subir la imagen",
                            variant: "destructive"
                          });
                        }
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <Input 
                      type="url" 
                      placeholder="https://ejemplo.com/imagen.jpg" 
                      {...micrositeForm.register("profileImage")}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('profileImageInput')?.click()}
                    >
                      <Upload className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Sube una imagen o ingresa una URL</p>
                </div>
              </div>

              <div>
                <Label className="text-base font-medium">Imagen de Portada</Label>
                <div className="mt-2">
                  <div className="w-full h-40 bg-gray-100 rounded-lg border flex items-center justify-center overflow-hidden mb-2 relative group cursor-pointer"
                    onClick={() => document.getElementById('coverImageInput')?.click()}
                  >
                    {micrositeForm.watch("coverImage") ? (
                      <img 
                        src={`${micrositeForm.watch("coverImage")}?t=${Date.now()}`} 
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
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                      <Upload className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <input
                    id="coverImageInput"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const formData = new FormData();
                        formData.append('image', file);
                        
                        try {
                          const response = await fetch('/api/upload', {
                            method: 'POST',
                            body: formData
                          });
                          
                          if (response.ok) {
                            const data = await response.json();
                            micrositeForm.setValue('coverImage', window.location.origin + data.url);
                            queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${currentBusiness?.id}/settings`] });
                          } else {
                            toast({
                              title: "Error",
                              description: "No se pudo subir la imagen",
                              variant: "destructive"
                            });
                          }
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: "Error al subir la imagen",
                            variant: "destructive"
                          });
                        }
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <Input 
                      type="url" 
                      placeholder="https://ejemplo.com/portada.jpg" 
                      {...micrositeForm.register("coverImage")}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('coverImageInput')?.click()}
                    >
                      <Upload className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Sube una imagen o ingresa una URL - Recomendado 1200x400px</p>
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
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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
                      description: "Primero ingresa y guarda una URL personalizada para ver la vista previa.",
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <Input 
                  type="date" 
                  placeholder="Fecha inicio"
                  className="flex-1"
                  id="blockDateStart"
                  value={blockDateStart}
                  onChange={(e) => setBlockDateStart(e.target.value)}
                />
                <Input 
                  type="date" 
                  placeholder="Fecha fin"
                  className="flex-1"
                  id="blockDateEnd"
                  value={blockDateEnd}
                  onChange={(e) => setBlockDateEnd(e.target.value)}
                />
                <Input 
                  placeholder="Motivo (opcional)"
                  className="flex-1"
                  id="blockDateReason"
                  value={blockDateReason}
                  onChange={(e) => setBlockDateReason(e.target.value)}
                />
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={addBlockedDate}
                  disabled={!blockDateStart || !blockDateEnd}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Bloquear
                </Button>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 min-h-[100px]">
                {blockedDates.length > 0 ? (
                  <div className="space-y-2">
                    {blockedDates.map((dateRange, index) => (
                      <div key={index} className="flex items-center justify-between bg-white p-3 rounded border">
                        <div>
                          <p className="font-medium">
                            {dateRange.startDate === dateRange.endDate 
                              ? `${new Date(dateRange.startDate).toLocaleDateString()}`
                              : `${new Date(dateRange.startDate).toLocaleDateString()} - ${new Date(dateRange.endDate).toLocaleDateString()}`
                            }
                          </p>
                          {dateRange.reason && (
                            <p className="text-sm text-gray-600">{dateRange.reason}</p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeBlockedDate(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 text-center">
                      No hay fechas bloqueadas configuradas
                    </p>
                    <p className="text-xs text-gray-500 text-center mt-2">
                      Las fechas bloqueadas no estarán disponibles para reservas
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div>
            <Label className="text-base font-medium mb-3 block">Horas Específicas Bloqueadas</Label>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <Input 
                  type="date" 
                  placeholder="Fecha" 
                  value={blockHourDate}
                  onChange={(e) => setBlockHourDate(e.target.value)}
                />
                <Input 
                  type="time" 
                  placeholder="Hora inicio"
                  value={blockHourStart}
                  onChange={(e) => setBlockHourStart(e.target.value)}
                />
                <Input 
                  type="time" 
                  placeholder="Hora fin"
                  value={blockHourEnd}
                  onChange={(e) => setBlockHourEnd(e.target.value)}
                />
                <Input 
                  placeholder="Motivo (opcional)"
                  value={blockHourReason}
                  onChange={(e) => setBlockHourReason(e.target.value)}
                />
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={addBlockedHour}
                  disabled={!blockHourDate || !blockHourStart || !blockHourEnd}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Bloquear
                </Button>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 min-h-[100px]">
                {blockedHours.length > 0 ? (
                  <div className="space-y-2">
                    {blockedHours.map((hourRange, index) => (
                      <div key={index} className="flex items-center justify-between bg-white p-3 rounded border">
                        <div>
                          <p className="font-medium">
                            {new Date(hourRange.date).toLocaleDateString()} - {hourRange.startTime} a {hourRange.endTime}
                          </p>
                          {hourRange.reason && (
                            <p className="text-sm text-gray-600">{hourRange.reason}</p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeBlockedHour(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 text-center">
                      No hay horarios específicos bloqueados
                    </p>
                    <p className="text-xs text-gray-500 text-center mt-2">
                      Bloquea horarios específicos en días particulares
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button 
              className="bg-red-600 hover:bg-red-700"
              onClick={saveBlockedDatesAndHours}
              disabled={updateMicrositeSettingsMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {updateMicrositeSettingsMutation.isPending ? "Guardando..." : "Guardar Configuración de Bloqueos"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
