import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { BusinessSettings } from "@shared/schema";
import { apiFetch } from "@/lib/auth-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Clock,
  MessageCircle,
  Share2,
  Edit,
  X,
  Star
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
  websiteUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  whatsappNumber: z.string().optional(),
  
  // Business Hours
  mondayHours: z.string().optional(),
  tuesdayHours: z.string().optional(),
  wednesdayHours: z.string().optional(),
  thursdayHours: z.string().optional(),
  fridayHours: z.string().optional(),
  saturdayHours: z.string().optional(),
  sundayHours: z.string().optional(),
  
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
  
  // Active tab state
  const [activeSection, setActiveSection] = useState("basic");
  
  // Gallery management state
  const [galleryImages, setGalleryImages] = useState<Array<{id: string, imageUrl: string, title?: string}>>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  
  // Blocked dates and hours state
  const [blockDateStart, setBlockDateStart] = useState("");
  const [blockDateEnd, setBlockDateEnd] = useState("");
  const [blockDateReason, setBlockDateReason] = useState("");
  const [blockedDates, setBlockedDates] = useState<Array<{startDate: string, endDate: string, reason?: string}>>([]);
  
  const [blockHourDate, setBlockHourDate] = useState("");
  const [blockHourStart, setBlockHourStart] = useState("");
  const [blockHourEnd, setBlockHourEnd] = useState("");
  const [blockHourReason, setBlockHourReason] = useState("");
  const [blockedHours, setBlockedHours] = useState<Array<{date: string, startTime: string, endTime: string, reason?: string}>>([]);

  const { data: currentBusinessSettings } = useQuery<BusinessSettings>({
    queryKey: [`/api/dashboard/businesses/${currentBusiness?.id}/settings`],
    enabled: Boolean(currentBusiness?.id),
    staleTime: 0,
    refetchOnMount: true,
  });

  const micrositeForm = useForm<MicrositeForm>({
    resolver: zodResolver(micrositeSchema),
    defaultValues: {
      enablePublicBooking: false,
      enableContactForm: true,
      enableGallery: true,
      country: "Perú",
    },
  });

  const updateMicrositeSettingsMutation = useMutation({
    mutationFn: async (data: MicrositeForm) => {
      const response = await apiFetch(`/api/dashboard/businesses/${currentBusiness.id}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          gallery: galleryImages,
          blockedDates,
          blockedHours,
        }),
      });
      if (!response.ok) throw new Error("Failed to update settings");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuración guardada",
        description: "Tu micrositio ha sido actualizado correctamente.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${currentBusiness?.id}/settings`] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración.",
        variant: "destructive",
      });
    },
  });

  const onMicrositeSubmit = (data: MicrositeForm) => {
    updateMicrositeSettingsMutation.mutate(data);
  };

  // Gallery Management Functions
  const handleImageUpload = async (files: FileList) => {
    if (!files.length) return;
    
    setUploadingImages(true);
    
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('businessId', currentBusiness.id);
        
        const response = await apiFetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) throw new Error('Upload failed');
        
        return await response.json();
      });
      
      const uploadResults = await Promise.all(uploadPromises);
      
      const newImages = uploadResults.map(result => ({
        id: `img_${Date.now()}_${Math.random()}`,
        imageUrl: result.url,
        title: ''
      }));
      
      setGalleryImages(prev => [...prev, ...newImages]);
      
      toast({
        title: "Imágenes subidas",
        description: `${uploadResults.length} imagen(es) agregada(s) a la galería.`,
      });
    } catch (error) {
      toast({
        title: "Error al subir imágenes",
        description: "No se pudieron subir las imágenes. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setUploadingImages(false);
    }
  };

  const removeGalleryImage = (imageId: string) => {
    setGalleryImages(prev => prev.filter(img => img.id !== imageId));
  };

  const updateImageTitle = (imageId: string, title: string) => {
    setGalleryImages(prev => 
      prev.map(img => 
        img.id === imageId ? { ...img, title } : img
      )
    );
  };

  // Blocked dates functions
  const addBlockedDate = () => {
    if (blockDateStart && blockDateEnd) {
      setBlockedDates(prev => [...prev, {
        startDate: blockDateStart,
        endDate: blockDateEnd,
        reason: blockDateReason || undefined
      }]);
      setBlockDateStart("");
      setBlockDateEnd("");
      setBlockDateReason("");
    }
  };

  const removeBlockedDate = (index: number) => {
    setBlockedDates(prev => prev.filter((_, i) => i !== index));
  };

  const addBlockedHour = () => {
    if (blockHourDate && blockHourStart && blockHourEnd) {
      setBlockedHours(prev => [...prev, {
        date: blockHourDate,
        startTime: blockHourStart,
        endTime: blockHourEnd,
        reason: blockHourReason || undefined
      }]);
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
    updateMicrositeSettingsMutation.mutate({
      ...micrositeForm.getValues(),
      blockedDates,
      blockedHours,
    });
  };

  useEffect(() => {
    if (currentBusinessSettings) {
      try {
        const settings = currentBusinessSettings;
        
        micrositeForm.reset({
          customUrl: settings.customUrl || "",
          professionalTitle: settings.professionalTitle || "",
          publicDescription: settings.publicDescription || "",
          profileImage: settings.profileImage || "",
          coverImage: settings.coverImage || "",
          publicEmail: settings.publicEmail || "",
          publicPhone: settings.publicPhone || "",
          streetAddress: settings.streetAddress || "",
          district: settings.district || "",
          region: settings.region || "",
          postalCode: settings.postalCode || "",
          country: settings.country || "Perú",
          facebookUrl: settings.facebookUrl || "",
          instagramUrl: settings.instagramUrl || "",
          tiktokUrl: settings.tiktokUrl || "",
          youtubeUrl: settings.youtubeUrl || "",
          websiteUrl: settings.websiteUrl || "",
          whatsappNumber: settings.whatsappNumber || "",
          mondayHours: settings.mondayHours || "",
          tuesdayHours: settings.tuesdayHours || "",
          wednesdayHours: settings.wednesdayHours || "",
          thursdayHours: settings.thursdayHours || "",
          fridayHours: settings.fridayHours || "",
          saturdayHours: settings.saturdayHours || "",
          sundayHours: settings.sundayHours || "",
          enablePublicBooking: settings.enablePublicBooking || false,
          enableContactForm: settings.enableContactForm !== false,
          enableGallery: settings.enableGallery !== false,
          scheduleNotes: settings.scheduleNotes || "",
        });

        if (settings.gallery) {
          setGalleryImages(settings.gallery);
        }

        if (settings.blockedDates) {
          setBlockedDates(settings.blockedDates);
        }

        if (settings.blockedHours) {
          setBlockedHours(settings.blockedHours);
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    }
  }, [currentBusinessSettings, micrositeForm]);

  return (
    <div className="space-y-6">
      <form onSubmit={micrositeForm.handleSubmit(onMicrositeSubmit)} className="space-y-6">
        
        {/* Enhanced Header with Quick Actions */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center text-xl">
                  <Globe className="w-6 h-6 mr-3 text-blue-600" />
                  🚀 Constructor de Micrositio
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Crea tu página web profesional sin complicaciones
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const customUrl = micrositeForm.getValues("customUrl");
                    if (customUrl && customUrl.trim() !== '') {
                      window.open(`/${customUrl}`, '_blank');
                    } else {
                      toast({
                        title: "URL no configurada",
                        description: "Primero ingresa y guarda una URL personalizada.",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Vista Previa
                </Button>
                <Button 
                  type="submit"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  disabled={updateMicrositeSettingsMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateMicrositeSettingsMutation.isPending ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Tabbed Interface */}
        <Tabs value={activeSection} onValueChange={setActiveSection} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 bg-gray-100">
            <TabsTrigger value="basic" className="flex items-center text-xs">
              <Link className="w-4 h-4 mr-1" />
              Básico
            </TabsTrigger>
            <TabsTrigger value="branding" className="flex items-center text-xs">
              <Image className="w-4 h-4 mr-1" />
              Marca
            </TabsTrigger>
            <TabsTrigger value="contact" className="flex items-center text-xs">
              <MapPin className="w-4 h-4 mr-1" />
              Contacto
            </TabsTrigger>
            <TabsTrigger value="social" className="flex items-center text-xs">
              <Users className="w-4 h-4 mr-1" />
              Social
            </TabsTrigger>
            <TabsTrigger value="gallery" className="flex items-center text-xs">
              <Camera className="w-4 h-4 mr-1" />
              Galería
            </TabsTrigger>
            <TabsTrigger value="features" className="flex items-center text-xs">
              <Settings className="w-4 h-4 mr-1" />
              Funciones
            </TabsTrigger>
            <TabsTrigger value="hours" className="flex items-center text-xs">
              <Clock className="w-4 h-4 mr-1" />
              Horarios
            </TabsTrigger>
          </TabsList>

          {/* Basic Information Tab */}
          <TabsContent value="basic" className="space-y-6">
            <Card className="shadow-lg border-blue-200">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
                <CardTitle className="flex items-center text-blue-800">
                  <Link className="w-5 h-5 mr-2" />
                  📝 Información Básica
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div>
                  <Label className="text-base font-semibold">URL del Micrositio</Label>
                  <p className="text-sm text-gray-600 mb-2">Esta será la dirección web de tu negocio</p>
                  <div className="flex mt-2">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm font-medium">
                      {window.location.host}/
                    </span>
                    <Input 
                      placeholder="mi-negocio" 
                      {...micrositeForm.register("customUrl")}
                      className="rounded-l-none border-l-0 focus:border-blue-500"
                    />
                  </div>
                  {micrositeForm.watch("customUrl") && (
                    <p className="text-xs text-green-600 mt-2 flex items-center">
                      ✓ Tu micrositio: <code className="ml-1 bg-green-50 px-2 py-1 rounded">/{micrositeForm.watch("customUrl")}</code>
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-base font-semibold">Título Profesional</Label>
                  <p className="text-sm text-gray-600 mb-2">Ej: "Especialista en Belleza" o "Chef Profesional"</p>
                  <Input 
                    placeholder="Tu especialidad o profesión"
                    {...micrositeForm.register("professionalTitle")}
                    className="focus:border-blue-500"
                  />
                </div>

                <div>
                  <Label className="text-base font-semibold">Descripción Pública</Label>
                  <p className="text-sm text-gray-600 mb-2">Describe tu negocio para tus clientes (máx. 500 caracteres)</p>
                  <Textarea 
                    placeholder="Cuéntanos sobre tu negocio, servicios y lo que te hace especial..."
                    rows={4}
                    {...micrositeForm.register("publicDescription")}
                    className="focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {micrositeForm.watch("publicDescription")?.length || 0}/500 caracteres
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Add other tabs here... */}

        </Tabs>
      </form>
    </div>
  );
}
