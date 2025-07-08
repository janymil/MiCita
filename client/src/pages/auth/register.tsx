import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, Search, UserPlus, AlertCircle, Building2, User, CheckCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/auth-context";
import { authApi, type RegisterData } from "@/lib/auth";
import { BUSINESS_CATEGORIES, PERUVIAN_CITIES } from "@/lib/constants";
import { apiRequest } from "@/lib/queryClient";

const userSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

const businessSchema = z.object({
  name: z.string().min(2, "El nombre del negocio debe tener al menos 2 caracteres"),
  category: z.string().min(1, "Selecciona una categoría"),
  description: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().min(1, "Selecciona una ciudad"),
  website: z.string().url("URL inválida").optional().or(z.literal("")),
});

type UserForm = z.infer<typeof userSchema>;
type BusinessForm = z.infer<typeof businessSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [currentStep, setCurrentStep] = useState("user");
  const [userData, setUserData] = useState<RegisterData | null>(null);
  const { login } = useAuth();

  const userForm = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const businessForm = useForm<BusinessForm>({
    resolver: zodResolver(businessSchema),
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

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      return authApi.register(data);
    },
    onSuccess: (user) => {
      setUserData({
        name: user.name,
        email: user.email,
        password: "", // Don't store password
      });
      login(user);
      setCurrentStep("business");
    },
    onError: (error: any) => {
      setError(error.message || "Error al crear la cuenta");
    },
  });

  const createBusinessMutation = useMutation({
    mutationFn: async (data: BusinessForm) => {
      // Generate slug from name
      const slug = data.name.toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      return apiRequest("POST", "/api/dashboard/businesses", {
        ...data,
        slug,
      });
    },
    onSuccess: () => {
      setCurrentStep("success");
    },
    onError: (error: any) => {
      setError("Error al crear el negocio. Inténtalo nuevamente.");
    },
  });

  const onUserSubmit = (data: UserForm) => {
    setError("");
    const { confirmPassword, ...registerData } = data;
    registerMutation.mutate(registerData);
  };

  const onBusinessSubmit = (data: BusinessForm) => {
    setError("");
    createBusinessMutation.mutate(data);
  };

  const skipBusinessSetup = () => {
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2">
            <div className="w-12 h-12 peru-gradient rounded-xl flex items-center justify-center">
              <Search className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-bold text-gray-900">Mi Cita</span>
          </Link>
          <p className="text-gray-600 mt-2">
            Únete a la plataforma líder de gestión empresarial en Perú
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">
              {currentStep === "user" && "Crear Cuenta"}
              {currentStep === "business" && "Configurar tu Negocio"}
              {currentStep === "success" && "¡Bienvenido a Mi Cita!"}
            </CardTitle>
            {currentStep !== "success" && (
              <div className="flex items-center justify-center mt-4">
                <div className="flex items-center space-x-4">
                  <div className={`flex items-center ${currentStep === "user" ? "text-red-600" : "text-green-600"}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      currentStep === "user" ? "bg-red-100" : "bg-green-100"
                    }`}>
                      {currentStep === "user" ? (
                        <User className="w-4 h-4" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                    </div>
                    <span className="ml-2 text-sm font-medium">Cuenta</span>
                  </div>
                  <div className="w-8 h-px bg-gray-300"></div>
                  <div className={`flex items-center ${
                    currentStep === "business" ? "text-red-600" : 
                    currentStep === "success" ? "text-green-600" : "text-gray-400"
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      currentStep === "business" ? "bg-red-100" : 
                      currentStep === "success" ? "bg-green-100" : "bg-gray-100"
                    }`}>
                      {currentStep === "success" ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <Building2 className="w-4 h-4" />
                      )}
                    </div>
                    <span className="ml-2 text-sm font-medium">Negocio</span>
                  </div>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {error && (
              <Alert className="mb-6 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* User Registration Step */}
            {currentStep === "user" && (
              <Form {...userForm}>
                <form onSubmit={userForm.handleSubmit(onUserSubmit)} className="space-y-6">
                  <FormField
                    control={userForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre completo</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Tu nombre completo"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={userForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="tu@email.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={userForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contraseña</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Tu contraseña"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4 text-gray-400" />
                              ) : (
                                <Eye className="h-4 w-4 text-gray-400" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={userForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar contraseña</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirma tu contraseña"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-4 w-4 text-gray-400" />
                              ) : (
                                <Eye className="h-4 w-4 text-gray-400" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={registerMutation.isPending}
                    className="w-full bg-red-600 hover:bg-red-700"
                  >
                    {registerMutation.isPending ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creando cuenta...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Crear Cuenta
                      </div>
                    )}
                  </Button>
                </form>
              </Form>
            )}

            {/* Business Setup Step */}
            {currentStep === "business" && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    ¡Cuenta creada exitosamente!
                  </h3>
                  <p className="text-gray-600">
                    Ahora configura tu negocio para comenzar a recibir clientes
                  </p>
                </div>

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
                            <Input
                              placeholder="Describe brevemente tu negocio..."
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
                            <FormLabel>Email del Negocio</FormLabel>
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
                          <FormLabel>Sitio Web (opcional)</FormLabel>
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
                        type="button"
                        variant="outline"
                        onClick={skipBusinessSetup}
                        className="flex-1"
                      >
                        Configurar Después
                      </Button>
                      <Button
                        type="submit"
                        disabled={createBusinessMutation.isPending}
                        className="flex-1 bg-red-600 hover:bg-red-700"
                      >
                        {createBusinessMutation.isPending ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Creando negocio...
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <Building2 className="w-4 h-4 mr-2" />
                            Crear Negocio
                          </div>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            )}

            {/* Success Step */}
            {currentStep === "success" && (
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    ¡Todo configurado!
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Tu cuenta y negocio han sido creados exitosamente. 
                    Ya puedes comenzar a gestionar tu negocio y recibir clientes.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6 text-left">
                  <h4 className="font-medium text-gray-900 mb-4">¿Qué sigue?</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                      Configura tus servicios y precios
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                      Personaliza los horarios de atención
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                      Agrega fotos a tu galería
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                      Comienza a recibir citas de clientes
                    </li>
                  </ul>
                </div>

                <Button
                  onClick={() => setLocation("/dashboard")}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  Ir al Dashboard
                </Button>
              </div>
            )}

            {currentStep === "user" && (
              <>
                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">o</span>
                    </div>
                  </div>

                  <div className="mt-6 text-center">
                    <p className="text-gray-600">
                      ¿Ya tienes una cuenta?{" "}
                      <Link href="/login" className="text-red-600 hover:text-red-500 font-medium">
                        Inicia sesión aquí
                      </Link>
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Benefits */}
        {currentStep === "user" && (
          <Card className="mt-6 bg-gradient-to-br from-red-50 to-yellow-50 border-red-200">
            <CardContent className="p-6">
              <h3 className="font-medium text-red-900 mb-4 text-center">
                ¿Por qué elegir Mi Cita?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Building2 className="w-4 h-4 text-red-600" />
                  </div>
                  <p className="text-red-800 font-medium">Micrositio Profesional</p>
                  <p className="text-red-700">Página web automática para tu negocio</p>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <UserPlus className="w-4 h-4 text-red-600" />
                  </div>
                  <p className="text-red-800 font-medium">Gestión Completa</p>
                  <p className="text-red-700">Citas, clientes y servicios en un lugar</p>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Search className="w-4 h-4 text-red-600" />
                  </div>
                  <p className="text-red-800 font-medium">Mayor Visibilidad</p>
                  <p className="text-red-700">Aparece en búsquedas de toda Lima</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center mt-8">
          <Link href="/" className="text-gray-600 hover:text-gray-900">
            ← Volver a búsqueda
          </Link>
        </div>
      </div>
    </div>
  );
}
