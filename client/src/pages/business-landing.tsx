import { useState } from "react";
import { Link } from "wouter";
import { MicitaLogo, AndeanSun } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Users,
  Calendar,
  BarChart,
  Star,
  Smartphone,
  Clock,
  MapPin,
  CheckCircle,
  ArrowRight,
  Building2,
  Camera,
  MessageCircle,
  CreditCard,
  Zap,
  CalendarCheck,
  Compass
} from "lucide-react";

export default function BusinessLandingPage() {
  const [activePlan, setActivePlan] = useState("starter");

  const features = [
    {
      icon: <Calendar className="w-6 h-6" />,
      title: "Sistema de Citas",
      description: "Agenda inteligente con recordatorios automáticos y gestión de horarios"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Gestión de Clientes",
      description: "Base de datos completa con historial y preferencias de cada cliente"
    },
    {
      icon: <BarChart className="w-6 h-6" />,
      title: "Analytics Avanzados",
      description: "Reportes detallados de ventas, clientes y rendimiento del negocio"
    },
    {
      icon: <Smartphone className="w-6 h-6" />,
      title: "Micrositio Web",
      description: "Página web profesional con tu dominio personalizado y reservas online"
    },
    {
      icon: <Camera className="w-6 h-6" />,
      title: "Galería Visual",
      description: "Muestra tu trabajo con fotos profesionales y portfolio digital"
    },
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: "Comunicación",
      description: "Chat integrado, notificaciones y seguimiento de clientes"
    }
  ];

  const testimonials = [
    {
      name: "María González",
      business: "Spa Luna Bella",
      rating: 5,
      text: "Desde que uso Mi Cita, mis reservas aumentaron 300%. La plataforma es súper fácil de usar.",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=64&h=64&fit=crop&crop=face"
    },
    {
      name: "Carlos Mendoza",
      business: "Barbería Clásica",
      rating: 5,
      text: "Perfecto para mi barbería. Mis clientes pueden reservar online y yo gestiono todo desde un lugar.",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&crop=face"
    },
    {
      name: "Ana Paredes",
      business: "Estudio de Uñas AP",
      rating: 5,
      text: "La mejor inversión para mi negocio. Ahora tengo más clientes y mejor organización.",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=64&h=64&fit=crop&crop=face"
    }
  ];

  const plans = [
    {
      id: "starter",
      name: "Starter",
      price: "Gratis",
      duration: "para siempre",
      description: "Perfecto para empezar",
      features: [
        "Perfil básico del negocio",
        "Hasta 50 citas mensuales",
        "Gestión de 100 clientes",
        "Galería de hasta 10 fotos",
        "Soporte por email"
      ],
      cta: "Comenzar gratis",
      popular: false
    },
    {
      id: "professional",
      name: "Professional",
      price: "S/ 29",
      duration: "por mes",
      description: "Para negocios en crecimiento",
      features: [
        "Todo lo del plan Starter",
        "Citas ilimitadas",
        "Clientes ilimitados",
        "Micrositio web personalizado",
        "Analytics avanzados",
        "Galería ilimitada",
        "Recordatorios automáticos",
        "Soporte prioritario"
      ],
      cta: "Elegir Professional",
      popular: true
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: "S/ 79",
      duration: "por mes",
      description: "Para múltiples ubicaciones",
      features: [
        "Todo lo del plan Professional",
        "Múltiples ubicaciones",
        "API personalizada",
        "Integraciones avanzadas",
        "White-label disponible",
        "Manager de cuenta dedicado",
        "Capacitación personalizada"
      ],
      cta: "Contactar ventas",
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-brand-hero dark:bg-gray-900">
      {/* Header */}
      <header className="border-b border-[hsl(36_55%_90%)] dark:border-gray-800 bg-[hsl(40_74%_96%/0.9)] dark:bg-gray-900/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MicitaLogo size="md" showTagline />
              <Badge variant="secondary" className="ml-1 bg-[hsl(38_85%_92%)] text-[#8A5A08] border-[hsl(35_80%_80%)] font-hand text-sm">
                Para Negocios
              </Badge>
            </div>

            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-[hsl(var(--brand-tinta-soft))] hover:text-[hsl(var(--brand-manta))] transition-colors font-medium">Características</a>
              <a href="#pricing" className="text-[hsl(var(--brand-tinta-soft))] hover:text-[hsl(var(--brand-manta))] transition-colors font-medium">Precios</a>
              <a href="#testimonials" className="text-[hsl(var(--brand-tinta-soft))] hover:text-[hsl(var(--brand-manta))] transition-colors font-medium">Testimonios</a>
              <Link href="/buscar" className="text-[hsl(var(--brand-tinta-soft))] hover:text-[hsl(var(--brand-manta))] transition-colors font-medium inline-flex items-center gap-1.5">
                <Compass className="w-4 h-4" /> Explorar negocios
              </Link>
            </nav>

            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <Link href="/login">
                <Button variant="ghost">Iniciar sesión</Button>
              </Link>
              <Link href="/registro">
                <Button className="brand-btn-primary border-0">
                  Empezar gratis
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 bg-chakana">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-6 bg-[hsl(38_85%_92%)] text-[#8A5A08] border-[hsl(35_80%_80%)] px-4 py-2">
                <Zap className="w-4 h-4 mr-2" />
                Prueba gratuita de 30 días
              </Badge>

              <h1 className="font-display text-5xl lg:text-6xl font-bold text-[hsl(var(--brand-tinta))] mb-6 leading-tight">
                Haz crecer tu
                <span className="text-[hsl(var(--brand-manta))]"> negocio</span> con
                <span className="text-brand-gradient"> MiCita</span>
              </h1>
              <AndeanSun className="mb-6" />
              
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                La plataforma todo-en-uno para gestionar tu negocio de servicios. 
                Agenda citas, gestiona clientes y acepta pagos desde un solo lugar.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Link href="/registro">
                  <Button size="lg" className="bg-red-600 hover:bg-red-700 h-14 px-8 text-lg">
                    Comenzar gratis
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Button variant="outline" size="lg" className="h-14 px-8 text-lg">
                  Ver demo en vivo
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">15K+</div>
                  <div className="text-gray-600 dark:text-gray-300">Negocios activos</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">500K+</div>
                  <div className="text-gray-600 dark:text-gray-300">Citas gestionadas</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">4.9/5</div>
                  <div className="text-gray-600 dark:text-gray-300">Satisfacción</div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-3xl p-8 shadow-2xl">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Citas de hoy</h3>
                    <Badge className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">12 confirmadas</Badge>
                  </div>
                  
                  <div className="space-y-3">
                    {[
                      { name: "María García", service: "Corte + Peinado", time: "10:00 AM" },
                      { name: "Carlos López", service: "Barba + Bigote", time: "11:30 AM" },
                      { name: "Ana Morales", service: "Tratamiento facial", time: "2:00 PM" }
                    ].map((appointment, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{appointment.name}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">{appointment.service}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900 dark:text-white">{appointment.time}</div>
                          <div className="text-xs text-green-600">Confirmada</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 bg-white dark:bg-gray-700 rounded-xl p-4 shadow-lg">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">+43% este mes</span>
                </div>
              </div>
              
              <div className="absolute -bottom-4 -left-4 bg-white dark:bg-gray-700 rounded-xl p-4 shadow-lg">
                <div className="flex items-center space-x-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">4.9 puntuación</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Todo lo que necesitas para gestionar tu negocio
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Herramientas profesionales diseñadas específicamente para negocios de servicios en Perú
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-xl flex items-center justify-center text-red-600 dark:text-red-400 mb-4">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Lo que dicen nuestros clientes
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Miles de negocios ya confían en Mi Cita
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-500 fill-current" />
                    ))}
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-300 mb-6 italic">
                    "{testimonial.text}"
                  </p>
                  
                  <div className="flex items-center">
                    <img 
                      src={testimonial.avatar} 
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full mr-4"
                    />
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">{testimonial.name}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">{testimonial.business}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Planes diseñados para crecer contigo
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Comienza gratis y escala según las necesidades de tu negocio
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`relative border-2 ${
                  plan.popular
                    ? 'border-[hsl(var(--brand-manta))] shadow-brand scale-105'
                    : 'border-[hsl(36_55%_90%)] dark:border-gray-600'
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-brand-gradient text-white border-0 shadow-brand">
                    Más popular
                  </Badge>
                )}
                
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">{plan.price}</span>
                    <span className="text-gray-600 dark:text-gray-300">/{plan.duration}</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mt-2">{plan.description}</p>
                </CardHeader>
                
                <CardContent>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0" />
                        <span className="text-gray-600 dark:text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    onClick={() => {
                      // Starter → crear cuenta; planes pagos → registrarse y
                      // activar la suscripción desde Finanzas → Mi plan.
                      window.location.href =
                        plan.id === "starter"
                          ? "/registro"
                          : `/registro?plan=${encodeURIComponent(plan.id)}&next=${encodeURIComponent("/dashboard/finanzas")}`;
                    }}
                    className={`w-full h-12 ${
                      plan.popular
                        ? 'brand-btn-primary border-0'
                        : 'bg-[hsl(var(--brand-tinta))] hover:bg-[hsl(var(--brand-manta-deep))] text-white'
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 px-4 bg-brand-gradient overflow-hidden">
        <div className="absolute inset-0 bg-chakana-light" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            ¿Listo para transformar tu negocio?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Únete a miles de empresarios exitosos. Comienza tu prueba gratuita hoy 
            y ve la diferencia en tu primera semana.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link href="/registro">
              <Button size="lg" className="bg-white text-[hsl(var(--brand-manta))] hover:bg-[hsl(40_74%_96%)] h-14 px-8 text-lg font-semibold shadow-lg">
                Empezar prueba gratuita
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="lg" 
              className="border-white text-white hover:bg-white hover:text-red-600 h-14 px-8 text-lg"
            >
              Hablar con ventas
            </Button>
          </div>

          <p className="text-white/80 text-sm">
            ✓ Sin compromisos ✓ Soporte en español ✓ Configuración gratuita
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-white py-12 px-4" style={{ backgroundColor: "hsl(var(--brand-tinta))" }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-brand-gradient rounded-lg flex items-center justify-center shadow-brand">
                  <CalendarCheck className="text-white w-4 h-4" />
                </div>
                <span className="font-display text-xl font-bold">Mi<span className="text-brand-gradient">Cita</span></span>
              </div>
              <p className="text-[hsl(40_20%_70%)]">
                Potencia tu negocio con herramientas profesionales diseñadas para el mercado peruano.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Producto</h4>
              <ul className="space-y-2 text-[hsl(40_20%_70%)]">
                <li><a href="#features" className="hover:text-white">Características</a></li>
                <li><a href="#pricing" className="hover:text-white">Precios</a></li>
                <li><a href="#" className="hover:text-white">Integraciones</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Soporte</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Centro de ayuda</a></li>
                <li><a href="#" className="hover:text-white">Contacto</a></li>
                <li><a href="#" className="hover:text-white">Estado del servicio</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Acerca de</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Carreras</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400">&copy; 2025 Mi Cita. Todos los derechos reservados.</p>
            <div className="flex items-center space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-white">Términos</a>
              <a href="#" className="text-gray-400 hover:text-white">Privacidad</a>
              <a href="#" className="text-gray-400 hover:text-white">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}