import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  Star,
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
  ChevronDown,
  ChevronUp,
  ImagePlus,
  X,
  MessageCircle,
  Share2,
  Edit,
  Sparkles
} from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { AutoSetupTab } from "./auto-setup-tab";

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
  enableReviews: z.boolean(),
  
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

  // Enhanced UI State
  const [activeSection, setActiveSection] = useState("basic");
  const [sectionStates, setSectionStates] = useState({
    basic: true,
    branding: false,
    contact: false,
    social: false,
    features: false,
    gallery: false,
    hours: false
  });

  // Gallery Management State
  const [galleryImages, setGalleryImages] = useState<Array<{id: string, imageUrl: string, title?: string}>>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

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

  // Section toggle helper
  const toggleSection = (section: keyof typeof sectionStates) => {
    setSectionStates(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

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
      enableReviews: true,
      scheduleNotes: "",
    },
    mode: "onChange"
  });

  // Watch form values for real-time updates
  const watchedProfileImage = useWatch({
    control: micrositeForm.control,
    name: "profileImage"
  });

  const watchedCoverImage = useWatch({
    control: micrositeForm.control,
    name: "coverImage"
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
      micrositeForm.setValue("enableReviews", settings.enableReviews ?? true);
      micrositeForm.setValue("scheduleNotes", settings.scheduleNotes || "");
      
      // Load gallery images if available
      if (settings.galleryImages) {
        setGalleryImages(settings.galleryImages);
      }
    }
  }, [currentBusinessSettings]);

  // Gallery Management Functions
  const handleImageUpload = async (files: FileList) => {
    if (!files.length) return;
    
    setUploadingImages(true);
    
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('businessId', currentBusiness.id);
        
        const response = await fetch('/api/upload/gallery', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) throw new Error('Upload failed');
        
        return await response.json();
      });
      
      const uploadResults = await Promise.all(uploadPromises);
      
      // Add new images to gallery
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
    
    // Include gallery images and blocked dates/hours in the submission
    const submissionData = {
      ...data,
      galleryImages: galleryImages,
      blockedDates: blockedDates,
      blockedHours: blockedHours,
    };
    
    updateMicrositeSettingsMutation.mutate(submissionData);
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
          <TabsList className="grid w-full grid-cols-8 bg-gray-100">
            <TabsTrigger value="auto-setup" className="flex items-center text-xs">
              <Sparkles className="w-4 h-4 mr-1" />
              🤖 Auto
            </TabsTrigger>
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
            <TabsTrigger value="blocked" className="flex items-center text-xs">
              <AlertTriangle className="w-4 h-4 mr-1" />
              Bloqueos
            </TabsTrigger>
          </TabsList>

          {/* Auto-Setup Tab */}
          <TabsContent value="auto-setup" className="space-y-6">
            <AutoSetupTab 
              businessId={currentBusiness?.id} 
              onDataFetched={(data) => {
                // Apply scraped data to form
                if (data.name) micrositeForm.setValue("professionalTitle", data.name);
                if (data.description) micrositeForm.setValue("publicDescription", data.description);
                if (data.phone) micrositeForm.setValue("publicPhone", data.phone);
                if (data.email) micrositeForm.setValue("publicEmail", data.email);
                if (data.address) micrositeForm.setValue("streetAddress", data.address);
                if (data.profileImage) micrositeForm.setValue("profileImage", data.profileImage);
                if (data.coverImage) micrositeForm.setValue("coverImage", data.coverImage);
                if (data.galleryImages) setGalleryImages(data.galleryImages);
                if (data.facebookUrl) micrositeForm.setValue("facebookUrl", data.facebookUrl);
                if (data.instagramUrl) micrositeForm.setValue("instagramUrl", data.instagramUrl);
                
                // Apply working hours if available
                if (data.hours) {
                  const convertedHours: any = {};
                  Object.entries(data.hours).forEach(([day, schedule]: [string, any]) => {
                    if (schedule && typeof schedule === 'object') {
                      convertedHours[day.toLowerCase()] = {
                        enabled: schedule.enabled !== false,
                        start: schedule.start || "09:00",
                        end: schedule.end || "17:00"
                      };
                    }
                  });
                  micrositeForm.setValue("workingHours", convertedHours);
                }
                
                // Trigger form submission to save data
                const formData = micrositeForm.getValues();
                updateMicrositeSettingsMutation.mutate({
                  ...formData,
                  galleryImages: data.galleryImages || galleryImages
                });
              }}
            />
          </TabsContent>

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

          {/* Branding Tab */}
          <TabsContent value="branding" className="space-y-6">
            <Card className="shadow-lg border-purple-200">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100">
                <CardTitle className="flex items-center text-purple-800">
                  <Image className="w-5 h-5 mr-2" />
                  🎨 Marca e Imágenes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-base font-semibold">Logo/Imagen de Perfil</Label>
                    <p className="text-sm text-gray-600 mb-2">Imagen que representa tu negocio</p>
                    <Input 
                      placeholder="URL de tu logo"
                      {...micrositeForm.register("profileImage")}
                      className="focus:border-purple-500"
                    />
                    {watchedProfileImage && watchedProfileImage.trim() !== "" && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                        <p className="text-sm text-gray-600 mb-2">Vista previa:</p>
                        <img 
                          src={watchedProfileImage} 
                          alt="Vista previa del logo" 
                          className="w-20 h-20 rounded-full object-cover border-2 border-purple-200 shadow-sm"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling!.textContent = 'Error al cargar la imagen. Verifica la URL.';
                          }}
                          onLoad={(e) => {
                            const errorMsg = e.currentTarget.nextElementSibling as HTMLElement;
                            if (errorMsg) errorMsg.textContent = '';
                          }}
                        />
                        <p className="text-xs text-red-500 mt-1"></p>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="text-base font-semibold">Imagen de Portada</Label>
                    <p className="text-sm text-gray-600 mb-2">Imagen principal de tu micrositio</p>
                    <Input 
                      placeholder="URL de imagen de portada"
                      {...micrositeForm.register("coverImage")}
                      className="focus:border-purple-500"
                    />
                    {watchedCoverImage && watchedCoverImage.trim() !== "" && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                        <p className="text-sm text-gray-600 mb-2">Vista previa:</p>
                        <img 
                          src={watchedCoverImage} 
                          alt="Vista previa de portada" 
                          className="w-full h-28 object-cover rounded-lg border-2 border-purple-200 shadow-sm"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling!.textContent = 'Error al cargar la imagen. Verifica la URL.';
                          }}
                          onLoad={(e) => {
                            const errorMsg = e.currentTarget.nextElementSibling as HTMLElement;
                            if (errorMsg) errorMsg.textContent = '';
                          }}
                        />
                        <p className="text-xs text-red-500 mt-1"></p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-2">💡 Consejos para mejores imágenes:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• <strong>Logo:</strong> Usa imágenes cuadradas (1:1) de al menos 200x200px</li>
                    <li>• <strong>Portada:</strong> Usa imágenes horizontales (16:9) de al menos 800x450px</li>
                    <li>• Formatos recomendados: JPG, PNG, WebP</li>
                    <li>• Las imágenes deben estar alojadas en URLs públicas (ej: imgur, cloudinary)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact Information Tab */}
          <TabsContent value="contact" className="space-y-6">
            <Card className="shadow-lg border-green-200">
              <CardHeader className="bg-gradient-to-r from-green-50 to-green-100">
                <CardTitle className="flex items-center text-green-800">
                  <MapPin className="w-5 h-5 mr-2" />
                  📍 Información de Contacto
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-base font-semibold">Email Público</Label>
                    <p className="text-sm text-gray-600 mb-2">Email de contacto para tus clientes</p>
                    <Input 
                      type="email" 
                      placeholder="contacto@tunegocio.com" 
                      {...micrositeForm.register("publicEmail")}
                      className="focus:border-green-500"
                    />
                  </div>

                  <div>
                    <Label className="text-base font-semibold">Teléfono Público</Label>
                    <p className="text-sm text-gray-600 mb-2">Número de contacto para tus clientes</p>
                    <Input 
                      placeholder="+51 987 654 321" 
                      {...micrositeForm.register("publicPhone")}
                      className="focus:border-green-500"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-base font-semibold">Dirección Completa</Label>
                  <p className="text-sm text-gray-600 mb-2">Dirección física de tu negocio</p>
                  <Input 
                    placeholder="Av. Larco 345, Miraflores" 
                    {...micrositeForm.register("streetAddress")}
                    className="focus:border-green-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label className="text-base font-semibold">Distrito</Label>
                    <Input 
                      placeholder="Miraflores" 
                      {...micrositeForm.register("district")}
                      className="focus:border-green-500"
                    />
                  </div>

                  <div>
                    <Label className="text-base font-semibold">Referencia</Label>
                    <Input 
                      placeholder="Cerca al parque Kennedy" 
                      {...micrositeForm.register("region")}
                      className="focus:border-green-500"
                    />
                  </div>

                  <div>
                    <Label className="text-base font-semibold">Código Postal</Label>
                    <Input 
                      placeholder="15074" 
                      {...micrositeForm.register("postalCode")}
                      className="focus:border-green-500"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-base font-semibold">País</Label>
                  <Input 
                    {...micrositeForm.register("country")}
                    disabled 
                    className="bg-gray-50 focus:border-green-500"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Social Media Tab */}
          <TabsContent value="social" className="space-y-6">
            <Card className="shadow-lg border-pink-200">
              <CardHeader className="bg-gradient-to-r from-pink-50 to-pink-100">
                <CardTitle className="flex items-center text-pink-800">
                  <Users className="w-5 h-5 mr-2" />
                  🌐 Redes Sociales
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="flex items-center text-base font-semibold">
                      <Facebook className="w-5 h-5 mr-2 text-blue-600" />
                      Facebook
                    </Label>
                    <p className="text-sm text-gray-600 mb-2">Página de Facebook de tu negocio</p>
                    <Input 
                      placeholder="https://facebook.com/tu-negocio" 
                      {...micrositeForm.register("facebookUrl")}
                      className="focus:border-pink-500"
                    />
                  </div>

                  <div>
                    <Label className="flex items-center text-base font-semibold">
                      <Instagram className="w-5 h-5 mr-2 text-pink-600" />
                      Instagram
                    </Label>
                    <p className="text-sm text-gray-600 mb-2">Perfil de Instagram de tu negocio</p>
                    <Input 
                      placeholder="https://instagram.com/tu-negocio" 
                      {...micrositeForm.register("instagramUrl")}
                      className="focus:border-pink-500"
                    />
                  </div>

                  <div>
                    <Label className="flex items-center text-base font-semibold">
                      <Twitter className="w-5 h-5 mr-2 text-black" />
                      TikTok
                    </Label>
                    <p className="text-sm text-gray-600 mb-2">Perfil de TikTok de tu negocio</p>
                    <Input 
                      placeholder="https://tiktok.com/@tu-negocio" 
                      {...micrositeForm.register("tiktokUrl")}
                      className="focus:border-pink-500"
                    />
                  </div>

                  <div>
                    <Label className="flex items-center text-base font-semibold">
                      <Youtube className="w-5 h-5 mr-2 text-red-600" />
                      YouTube
                    </Label>
                    <p className="text-sm text-gray-600 mb-2">Canal de YouTube de tu negocio</p>
                    <Input 
                      placeholder="https://youtube.com/@tu-negocio" 
                      {...micrositeForm.register("youtubeUrl")}
                      className="focus:border-pink-500"
                    />
                  </div>

                  <div>
                    <Label className="flex items-center text-base font-semibold">
                      <Link className="w-5 h-5 mr-2 text-blue-600" />
                      Sitio Web
                    </Label>
                    <p className="text-sm text-gray-600 mb-2">Tu página web principal</p>
                    <Input 
                      placeholder="https://www.tu-negocio.com" 
                      {...micrositeForm.register("websiteUrl")}
                      className="focus:border-pink-500"
                    />
                  </div>

                  <div>
                    <Label className="flex items-center text-base font-semibold">
                      <MessageCircle className="w-5 h-5 mr-2 text-green-600" />
                      WhatsApp Business
                    </Label>
                    <p className="text-sm text-gray-600 mb-2">Número de WhatsApp para clientes</p>
                    <Input 
                      placeholder="+51987654321" 
                      {...micrositeForm.register("whatsappNumber")}
                      className="focus:border-pink-500"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Gallery Tab */}
          <TabsContent value="gallery" className="space-y-6">
            <Card className="shadow-lg border-orange-200">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100">
                <CardTitle className="flex items-center text-orange-800">
                  <Camera className="w-5 h-5 mr-2" />
                  📸 Galería de Imágenes
                </CardTitle>
                <p className="text-sm text-orange-700 mt-1">
                  Muestra las mejores fotos de tu negocio, productos o servicios
                </p>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Gallery Upload Section */}
                <div className="border-2 border-dashed border-orange-300 rounded-lg p-8 text-center bg-orange-50 hover:bg-orange-100 transition-colors">
                  <div className="space-y-4">
                    <div className="mx-auto w-16 h-16 bg-orange-200 rounded-full flex items-center justify-center">
                      <Upload className="w-8 h-8 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-orange-800">Agregar Imágenes a tu Galería</p>
                      <p className="text-orange-600 mt-1">Arrastra y suelta imágenes o haz clic para seleccionar</p>
                    </div>
                    <div className="flex items-center justify-center gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="border-orange-400 text-orange-700 hover:bg-orange-100"
                        onClick={() => document.getElementById('galleryImageInput')?.click()}
                        disabled={uploadingImages}
                      >
                        {uploadingImages ? (
                          <>
                            <div className="animate-spin w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full mr-2"></div>
                            Subiendo...
                          </>
                        ) : (
                          <>
                            <Camera className="w-4 h-4 mr-2" />
                            Seleccionar Imágenes
                          </>
                        )}
                      </Button>
                      <input
                        id="galleryImageInput"
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = e.target.files;
                          if (files) {
                            handleImageUpload(files);
                          }
                        }}
                      />
                    </div>
                    <p className="text-xs text-orange-600">
                      Formatos soportados: JPG, PNG, WebP • Máx. 5MB por imagen
                    </p>
                  </div>
                </div>

                {/* Gallery Preview */}
                {galleryImages.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-800">
                        Imágenes de tu Galería ({galleryImages.length})
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {galleryImages.map((image, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-orange-200">
                            <img
                              src={image.imageUrl}
                              alt={image.title || `Imagen ${index + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          </div>
                          
                          {/* Image Overlay */}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  const newTitle = prompt('Título de la imagen:', image.title);
                                  if (newTitle !== null) {
                                    updateImageTitle(image.id, newTitle);
                                  }
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                className="h-8 w-8 p-0"
                                onClick={() => removeGalleryImage(image.id)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Image Title */}
                          {image.title && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-2 rounded-b-lg">
                              {image.title}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {galleryImages.length === 0 && (
                  <div className="text-center py-8">
                    <Camera className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">Tu galería está vacía</p>
                    <p className="text-sm text-gray-400">Agrega imágenes para mostrar tu trabajo</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="space-y-6">
            <Card className="shadow-lg border-indigo-200">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-indigo-100">
                <CardTitle className="flex items-center text-indigo-800">
                  <Settings className="w-5 h-5 mr-2" />
                  ⚙️ Funcionalidades
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                    <div className="flex items-center">
                      <Calendar className="w-5 h-5 mr-3 text-indigo-600" />
                      <div>
                        <Label className="text-base font-semibold text-indigo-800">Reservas Públicas</Label>
                        <p className="text-sm text-indigo-600">
                          Permite que los clientes reserven citas desde tu micrositio
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={micrositeForm.watch("enablePublicBooking")}
                      onCheckedChange={(checked) => micrositeForm.setValue("enablePublicBooking", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                    <div className="flex items-center">
                      <MessageSquare className="w-5 h-5 mr-3 text-indigo-600" />
                      <div>
                        <Label className="text-base font-semibold text-indigo-800">Formulario de Contacto</Label>
                        <p className="text-sm text-indigo-600">
                          Formulario para que los clientes te envíen mensajes
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={micrositeForm.watch("enableContactForm")}
                      onCheckedChange={(checked) => micrositeForm.setValue("enableContactForm", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                    <div className="flex items-center">
                      <Camera className="w-5 h-5 mr-3 text-indigo-600" />
                      <div>
                        <Label className="text-base font-semibold text-indigo-800">Galería de Trabajos</Label>
                        <p className="text-sm text-indigo-600">
                          Muestra tus trabajos y servicios en una galería
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={micrositeForm.watch("enableGallery")}
                      onCheckedChange={(checked) => micrositeForm.setValue("enableGallery", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center">
                      <Star className="w-5 h-5 mr-3 text-yellow-600" />
                      <div>
                        <Label className="text-base font-semibold text-yellow-800">Sistema de Reseñas</Label>
                        <p className="text-sm text-yellow-600">
                          Permite que los clientes dejen reseñas en tu micrositio
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={micrositeForm.watch("enableReviews")}
                      onCheckedChange={(checked) => micrositeForm.setValue("enableReviews", checked)}
                    />
                  </div>
                </div>

                <div className="bg-indigo-100 p-4 rounded-lg">
                  <Label className="text-base font-semibold text-indigo-800">Notas de Horario</Label>
                  <p className="text-sm text-indigo-700 mb-3">
                    Información adicional sobre horarios especiales o días festivos
                  </p>
                  <Textarea
                    placeholder="Ej: Atendemos con cita previa los lunes. Horarios especiales en días festivos."
                    rows={3}
                    {...micrositeForm.register("scheduleNotes")}
                    className="bg-white focus:border-indigo-500"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Blocked Dates and Hours Tab */}
          <TabsContent value="blocked" className="space-y-6">
            <Card className="shadow-lg border-red-200">
              <CardHeader className="bg-gradient-to-r from-red-50 to-red-100">
                <CardTitle className="flex items-center text-red-800">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  ⚠️ Fechas y Horas Bloqueadas
                </CardTitle>
                <p className="text-sm text-red-700 mt-2">
                  Configura días y horarios cuando no estarás disponible para citas
                </p>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div>
                  <Label className="text-base font-semibold mb-3 block text-red-800">Fechas Bloqueadas</Label>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <Input 
                        type="date" 
                        placeholder="Fecha inicio"
                        className="flex-1 focus:border-red-500"
                        id="blockDateStart"
                        value={blockDateStart}
                        onChange={(e) => setBlockDateStart(e.target.value)}
                      />
                      <Input 
                        type="date" 
                        placeholder="Fecha fin"
                        className="flex-1 focus:border-red-500"
                        id="blockDateEnd"
                        value={blockDateEnd}
                        onChange={(e) => setBlockDateEnd(e.target.value)}
                      />
                      <Input 
                        placeholder="Motivo (opcional)"
                        className="flex-1 focus:border-red-500"
                        id="blockDateReason"
                        value={blockDateReason}
                        onChange={(e) => setBlockDateReason(e.target.value)}
                      />
                      <Button 
                        type="button" 
                        variant="outline"
                        className="border-red-400 text-red-700 hover:bg-red-50"
                        onClick={addBlockedDate}
                        disabled={!blockDateStart || !blockDateEnd}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Bloquear
                      </Button>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4 min-h-[100px]">
                      {blockedDates.length > 0 ? (
                        <div className="space-y-2">
                          {blockedDates.map((dateRange, index) => (
                            <div key={index} className="flex items-center justify-between bg-white p-3 rounded border border-red-200">
                              <div>
                                <p className="font-medium text-red-800">
                                  {dateRange.startDate === dateRange.endDate 
                                    ? `${new Date(dateRange.startDate).toLocaleDateString()}`
                                    : `${new Date(dateRange.startDate).toLocaleDateString()} - ${new Date(dateRange.endDate).toLocaleDateString()}`
                                  }
                                </p>
                                {dateRange.reason && (
                                  <p className="text-sm text-red-600">{dateRange.reason}</p>
                                )}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-red-400 text-red-700 hover:bg-red-50"
                                onClick={() => removeBlockedDate(index)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-red-600 text-center">
                            No hay fechas bloqueadas configuradas
                          </p>
                          <p className="text-xs text-red-500 text-center mt-2">
                            Las fechas bloqueadas no estarán disponibles para reservas
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-base font-semibold mb-3 block text-red-800">Horas Específicas Bloqueadas</Label>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                      <Input 
                        type="date" 
                        placeholder="Fecha" 
                        className="focus:border-red-500"
                        value={blockHourDate}
                        onChange={(e) => setBlockHourDate(e.target.value)}
                      />
                      <Input 
                        type="time" 
                        placeholder="Hora inicio"
                        className="focus:border-red-500"
                        value={blockHourStart}
                        onChange={(e) => setBlockHourStart(e.target.value)}
                      />
                      <Input 
                        type="time" 
                        placeholder="Hora fin"
                        className="focus:border-red-500"
                        value={blockHourEnd}
                        onChange={(e) => setBlockHourEnd(e.target.value)}
                      />
                      <Input 
                        placeholder="Motivo (opcional)"
                        className="focus:border-red-500"
                        value={blockHourReason}
                        onChange={(e) => setBlockHourReason(e.target.value)}
                      />
                      <Button 
                        type="button" 
                        variant="outline"
                        className="border-red-400 text-red-700 hover:bg-red-50"
                        onClick={addBlockedHour}
                        disabled={!blockHourDate || !blockHourStart || !blockHourEnd}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Bloquear
                      </Button>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4 min-h-[100px]">
                      {blockedHours.length > 0 ? (
                        <div className="space-y-2">
                          {blockedHours.map((hourRange, index) => (
                            <div key={index} className="flex items-center justify-between bg-white p-3 rounded border border-red-200">
                              <div>
                                <p className="font-medium text-red-800">
                                  {new Date(hourRange.date).toLocaleDateString()} - {hourRange.startTime} a {hourRange.endTime}
                                </p>
                                {hourRange.reason && (
                                  <p className="text-sm text-red-600">{hourRange.reason}</p>
                                )}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-red-400 text-red-700 hover:bg-red-50"
                                onClick={() => removeBlockedHour(index)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-red-600 text-center">
                            No hay horarios específicos bloqueados
                          </p>
                          <p className="text-xs text-red-500 text-center mt-2">
                            Bloquea horarios específicos en días particulares
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-red-200">
                  <Button 
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={saveBlockedDatesAndHours}
                    disabled={updateMicrositeSettingsMutation.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateMicrositeSettingsMutation.isPending ? "Guardando..." : "Guardar Configuración de Bloqueos"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </form>
    </div>
  );
}
