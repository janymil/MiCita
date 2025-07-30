import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CITY_DISTRICTS, PERUVIAN_CITIES } from "@/lib/constants";
import { apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Building2, Facebook, Globe, Instagram, Loader2, MapPin, Save, Sparkles } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { z } from "zod";

const createBusinessSchema = z.object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    category: z.string().min(1, "Selecciona una categoría"),
    description: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email("Email inválido").optional().or(z.literal("")),
    address: z.string().optional(),
    district: z.string().optional(),
    referencia: z.string().optional(),
    city: z.string().min(1, "Selecciona una ciudad"),
    website: z.string().url("URL inválida").optional().or(z.literal("")),
    // Auto-fill source URLs
    facebookUrl: z.string().url("URL inválida").optional().or(z.literal("")),
    instagramUrl: z.string().url("URL inválida").optional().or(z.literal("")),
    googleMapsUrl: z.string().url("URL inválida").optional().or(z.literal("")),
});

type CreateBusinessForm = z.infer<typeof createBusinessSchema>;

export default function CreateBusinessPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [, setLocation] = useLocation();

    // Auto-fill state management
    const [isAutoFilling, setIsAutoFilling] = useState(false);
    const [autoFillJobId, setAutoFillJobId] = useState<string | null>(null);
    const [autoFillProgress, setAutoFillProgress] = useState(0);
    const [showAutoFillSection, setShowAutoFillSection] = useState(false);

    // Fetch categories dynamically
    const { data: categories = [] } = useQuery({
        queryKey: ["/api/categories"],
        queryFn: async () => {
            const response = await fetch('/api/categories');
            if (!response.ok) return [];
            return response.json();
        },
    });

    const form = useForm<CreateBusinessForm>({
        resolver: zodResolver(createBusinessSchema),
        defaultValues: {
            name: "",
            category: "",
            description: "",
            phone: "",
            email: "",
            address: "",
            district: "",
            referencia: "",
            city: "Lima",
            website: "",
            // Auto-fill URLs
            facebookUrl: "",
            instagramUrl: "",
            googleMapsUrl: "",
        },
    });

    const createBusinessMutation = useMutation({
        mutationFn: async (data: CreateBusinessForm) => {
            return apiRequest("POST", "/api/dashboard/businesses", {
                ...data,
                country: "Perú",
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/dashboard/businesses"] });
            toast({
                title: "¡Negocio creado exitosamente!",
                description: "Tu negocio ha sido registrado. Ahora puedes configurar tu micrositio y empezar a recibir clientes.",
            });
            form.reset();
            // Redirect to micrositio configuration
            setLocation("/dashboard/micrositio");
        },
        onError: (error: any) => {
            console.error('Business creation error:', error);
            toast({
                title: "Error al crear negocio",
                description: error?.message || "No se pudo crear el negocio. Inténtalo nuevamente.",
                variant: "destructive",
            });
        },
    });

    // Auto-fill mutation - exactly matches micrositio auto-setup implementation
    const autoFillMutation = useMutation({
        mutationFn: async (sources: { facebookUrl?: string; instagramUrl?: string; googleMapsUrl?: string }) => {
            const response = await fetch('/api/scraping/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    businessId: 'temp-create-business',
                    businessName: form.getValues('name') || 'Mi Negocio',
                    facebookUrl: sources.facebookUrl,
                    instagramUrl: sources.instagramUrl,
                    googleMapsUrl: sources.googleMapsUrl, // This is correct - routes file maps it properly
                    websiteUrl: undefined,
                    category: 'Negocio',
                })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to start scraping');
            }
            return response.json();
        },
        onSuccess: (data) => {
            setAutoFillJobId(data.jobId);
            setIsAutoFilling(true);
            setAutoFillProgress(0);
            pollAutoFillStatus(data.jobId);
        },
        onError: (error) => {
            toast({
                title: "Error en auto-completado",
                description: "No se pudo iniciar el proceso de auto-completado",
                variant: "destructive"
            });
        }
    });    // Poll auto-fill status
    const pollAutoFillStatus = (jobId: string) => {
        const interval = setInterval(async () => {
            try {
                const response = await fetch(`/api/scraping/status/${jobId}`);
                const result = await response.json();

                if (result.success) {
                    setAutoFillProgress(result.data.progress);

                    if (result.data.status === 'completed') {
                        clearInterval(interval);
                        // Get results and auto-fill form
                        const resultsResponse = await fetch(`/api/scraping/results/${jobId}`);
                        const resultsData = await resultsResponse.json();

                        if (resultsData.success) {
                            applyAutoFillData(resultsData.data.processedData);
                        }

                        setIsAutoFilling(false);
                        setAutoFillJobId(null);
                        setAutoFillProgress(0);
                    } else if (result.data.status === 'failed') {
                        clearInterval(interval);
                        setIsAutoFilling(false);
                        toast({
                            title: "Error en auto-completado",
                            description: "El proceso de auto-completado falló",
                            variant: "destructive"
                        });
                    }
                }
            } catch (error) {
                clearInterval(interval);
                setIsAutoFilling(false);
            }
        }, 2000);
    };

    // Apply scraped data to form
    const applyAutoFillData = (scrapedData: any) => {
        if (scrapedData) {
            if (scrapedData.name && !form.getValues('name')) {
                form.setValue('name', scrapedData.name);
            }
            if (scrapedData.description && !form.getValues('description')) {
                form.setValue('description', scrapedData.description);
            }
            if (scrapedData.phone && !form.getValues('phone')) {
                form.setValue('phone', scrapedData.phone);
            }
            if (scrapedData.email && !form.getValues('email')) {
                form.setValue('email', scrapedData.email);
            }
            if (scrapedData.address && !form.getValues('address')) {
                form.setValue('address', scrapedData.address);
            }
            if (scrapedData.website && !form.getValues('website')) {
                form.setValue('website', scrapedData.website);
            }

            toast({
                title: "¡Datos completados automáticamente!",
                description: "Se han llenado los campos con información encontrada en redes sociales",
            });
        }
    };

    // Handle auto-fill
    const handleAutoFill = () => {
        const facebookUrl = form.getValues('facebookUrl')?.trim();
        const instagramUrl = form.getValues('instagramUrl')?.trim();
        const googleMapsUrl = form.getValues('googleMapsUrl')?.trim();

        if (!facebookUrl && !instagramUrl && !googleMapsUrl) {
            toast({
                title: "URLs requeridas",
                description: "Ingresa al menos una URL de Facebook, Instagram o Google Maps",
                variant: "destructive"
            });
            return;
        }

        console.log('Starting auto-fill with URLs:', { facebookUrl, instagramUrl, googleMapsUrl });
        autoFillMutation.mutate({ facebookUrl, instagramUrl, googleMapsUrl });
    }; const onSubmit = (data: CreateBusinessForm) => {
        createBusinessMutation.mutate(data);
    };

    return (
        <DashboardLayout>
            <div className="p-6 max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Button
                        variant="outline"
                        onClick={() => setLocation("/dashboard/configuracion")}
                        className="mb-4"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver a Configuración
                    </Button>

                    <div className="text-center">
                        <Building2 className="mx-auto h-16 w-16 text-red-600 mb-4" />
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Crear Tu Negocio</h1>
                        <p className="text-gray-600 text-lg">
                            Completa la información para registrar tu negocio en nuestra plataforma
                        </p>
                    </div>
                </div>

                {/* Auto-Fill Section */}
                <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Sparkles className="w-5 h-5 mr-2 text-blue-600" />
                            Auto-Completado Inteligente
                        </CardTitle>
                        <p className="text-gray-600">
                            Completa automáticamente tu información desde Facebook, Instagram o Google Maps
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label className="flex items-center">
                                        <Facebook className="w-4 h-4 mr-2 text-blue-600" />
                                        Facebook
                                    </Label>
                                    <Input
                                        placeholder="https://facebook.com/tu-negocio"
                                        value={form.watch('facebookUrl')}
                                        onChange={(e) => form.setValue('facebookUrl', e.target.value)}
                                        disabled={isAutoFilling}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center">
                                        <Instagram className="w-4 h-4 mr-2 text-pink-600" />
                                        Instagram
                                    </Label>
                                    <Input
                                        placeholder="https://instagram.com/tu-negocio"
                                        value={form.watch('instagramUrl')}
                                        onChange={(e) => form.setValue('instagramUrl', e.target.value)}
                                        disabled={isAutoFilling}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center">
                                        <Globe className="w-4 h-4 mr-2 text-green-600" />
                                        Google Maps
                                    </Label>
                                    <Input
                                        placeholder="https://maps.google.com/..."
                                        value={form.watch('googleMapsUrl')}
                                        onChange={(e) => form.setValue('googleMapsUrl', e.target.value)}
                                        disabled={isAutoFilling}
                                    />
                                </div>
                            </div>

                            {isAutoFilling && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Procesando información...</span>
                                        <span className="text-sm font-medium">{autoFillProgress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${autoFillProgress}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}

                            <Button
                                type="button"
                                onClick={handleAutoFill}
                                disabled={isAutoFilling || autoFillMutation.isPending}
                                className="w-full bg-blue-600 hover:bg-blue-700"
                            >
                                {isAutoFilling ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Completando Automáticamente...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        Completar Automáticamente
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Form */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Building2 className="w-5 h-5 mr-2" />
                            Información del Negocio
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                {/* Name and Category */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nombre del Negocio *</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Ej: Spa Relajante Lima"
                                                        {...field}
                                                        className="text-lg"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="category"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Categoría *</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="text-lg">
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

                                {/* Description */}
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Descripción del Negocio</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Describe tu negocio, los servicios que ofreces y qué te hace especial..."
                                                    {...field}
                                                    rows={4}
                                                    className="text-base"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Contact Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="phone"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Teléfono</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="+51 987 654 321"
                                                        {...field}
                                                        className="text-lg"
                                                    />
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
                                                <FormLabel>Email del Negocio</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="email"
                                                        placeholder="info@tunegocio.pe"
                                                        {...field}
                                                        className="text-lg"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Location - Peru Address Format */}
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-2 mb-4">
                                        <MapPin className="w-5 h-5 text-red-600" />
                                        <h3 className="text-lg font-semibold text-gray-900">Ubicación</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField
                                            control={form.control}
                                            name="city"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Ciudad *</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="text-lg">
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

                                        <FormField
                                            control={form.control}
                                            name="district"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Distrito</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="text-lg">
                                                                <SelectValue placeholder="Selecciona un distrito" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {(CITY_DISTRICTS[form.watch("city") as keyof typeof CITY_DISTRICTS] || []).map((district) => (
                                                                <SelectItem key={district} value={district}>
                                                                    {district}
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
                                        name="address"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Dirección</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Ej: Av. Larco 345"
                                                        {...field}
                                                        className="text-lg"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="referencia"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Referencia</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Ej: Al lado del Parque Central, frente a la iglesia"
                                                        {...field}
                                                        className="text-lg"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Website */}
                                <FormField
                                    control={form.control}
                                    name="website"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Sitio Web (Opcional)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="https://www.tunegocio.pe"
                                                    {...field}
                                                    className="text-lg"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Submit Button */}
                                <div className="flex justify-end space-x-4 pt-6">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setLocation("/dashboard/configuracion")}
                                        disabled={createBusinessMutation.isPending}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={createBusinessMutation.isPending}
                                        className="bg-red-600 hover:bg-red-700 text-lg px-8 py-3"
                                    >
                                        <Save className="w-5 h-5 mr-2" />
                                        {createBusinessMutation.isPending ? "Creando Negocio..." : "Crear Mi Negocio"}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>

                {/* Info Box */}
                <div className="mt-8 p-6 bg-blue-50 rounded-lg">
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">
                        ¿Qué sucede después de crear tu negocio?
                    </h3>
                    <ul className="text-blue-800 space-y-2">
                        <li>• Tu negocio aparecerá en los resultados de búsqueda</li>
                        <li>• Podrás configurar tu micrositio personalizado</li>
                        <li>• Los clientes podrán encontrarte y contactarte</li>
                        <li>• Tendrás acceso a todas las herramientas del dashboard</li>
                    </ul>
                </div>
            </div>
        </DashboardLayout>
    );
}
