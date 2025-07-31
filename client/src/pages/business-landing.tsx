import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  TrendingUp, 
  Users, 
  Calendar, 
  BarChart, 
  Star, 
  Shield, 
  Smartphone,
  Clock,
  MapPin,
  CheckCircle,
  ArrowRight,
  Building2,
  Camera,
  MessageCircle,
  CreditCard,
  Zap
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
      text: "Desde que uso BuscarPerú, mis reservas aumentaron 300%. La plataforma es súper fácil de usar.",
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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 peru-gradient rounded-xl flex items-center justify-center">
                <Search className="text-white w-5 h-5" />
              </div>
              <span className="text-2xl font-bold text-gray-900">BuscarPerú</span>
              <Badge variant="secondary" className="ml-2">Business</Badge>
            </Link>

            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900">Características</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900">Precios</a>
              <a href="#testimonials" className="text-gray-600 hover:text-gray-900">Testimonios</a>
            </nav>

            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="ghost">Iniciar sesión</Button>
              </Link>
              <Link href="/registro">
                <Button className="bg-red-600 hover:bg-red-700">
                  Empezar gratis
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-6 bg-red-100 text-red-700 border-red-200">
                🚀 Más de 5,000 negocios confían en nosotros
              </Badge>
              
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                Potencia tu negocio con 
                <span className="bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 bg-clip-text text-transparent"> herramientas inteligentes</span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Sistema completo de gestión empresarial diseñado específicamente para el mercado peruano. 
                Aumenta tus ventas, organiza tus citas y haz crecer tu negocio.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/registro">
                  <Button size="lg" className="bg-red-600 hover:bg-red-700 text-lg px-8 py-6">
                    Comenzar gratis <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                  Ver demo <Star className="ml-2 w-5 h-5" />
                </Button>
              </div>

              <div className="flex items-center space-x-8 mt-12">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-gray-600">Sin permanencia</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-gray-600">Configuración en 5 min</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-gray-600">Soporte 24/7</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-8 transform rotate-2">
                <div className="bg-gray-50 rounded-xl p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Dashboard</h3>
                        <p className="text-sm text-gray-500">Vista general</p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-700">En línea</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-gray-900">127</div>
                      <div className="text-sm text-gray-500">Citas hoy</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">S/ 3,450</div>
                      <div className="text-sm text-gray-500">Ingresos</div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">Cita con María G. - 15:30</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Cliente nuevo registrado</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm">Recordatorio enviado</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-700">Características</Badge>
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Todo lo que necesitas para hacer crecer tu negocio
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Herramientas profesionales diseñadas específicamente para emprendedores peruanos
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="relative group hover:shadow-xl transition-all duration-300 border-gray-100">
                <CardHeader>
                  <div className="w-14 h-14 bg-gradient-to-br from-red-100 to-orange-100 rounded-xl flex items-center justify-center text-red-600 mb-4 group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">5,000+</div>
              <div className="text-gray-400">Negocios activos</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">50,000+</div>
              <div className="text-gray-400">Citas gestionadas</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">98%</div>
              <div className="text-gray-400">Satisfacción del cliente</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">24/7</div>
              <div className="text-gray-400">Soporte disponible</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-green-100 text-green-700">Testimonios</Badge>
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Lo que dicen nuestros clientes
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-white border-gray-100">
                <CardContent className="p-8">
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-6 italic">"{testimonial.text}"</p>
                  <div className="flex items-center">
                    <img 
                      src={testimonial.avatar} 
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full mr-4"
                    />
                    <div>
                      <div className="font-semibold">{testimonial.name}</div>
                      <div className="text-gray-500 text-sm">{testimonial.business}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-100 text-purple-700">Precios</Badge>
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Planes diseñados para cada etapa de tu negocio
            </h2>
            <p className="text-xl text-gray-600">
              Comienza gratis y escala según tus necesidades
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`relative border-2 ${
                  plan.popular 
                    ? 'border-red-200 shadow-xl scale-105' 
                    : 'border-gray-200'
                } ${
                  activePlan === plan.id ? 'ring-2 ring-red-500' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-red-600 text-white px-4 py-1">
                      Más popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-8">
                  <h3 className="text-2xl font-bold">{plan.name}</h3>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-gray-500 ml-1">{plan.duration}</span>
                  </div>
                  <p className="text-gray-600 mt-2">{plan.description}</p>
                </CardHeader>
                
                <CardContent>
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center space-x-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    className={`w-full ${
                      plan.popular 
                        ? 'bg-red-600 hover:bg-red-700' 
                        : 'bg-gray-900 hover:bg-gray-800'
                    }`}
                    onClick={() => setActivePlan(plan.id)}
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
      <section className="py-20 bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500">
        <div className="max-w-4xl mx-auto px-4 text-center text-white">
          <h2 className="text-4xl font-bold mb-6">
            ¿Listo para hacer crecer tu negocio?
          </h2>
          <p className="text-xl mb-8 text-white/90">
            Únete a miles de emprendedores peruanos que ya confían en BuscarPerú
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/registro">
              <Button size="lg" className="bg-white text-red-600 hover:bg-gray-100 text-lg px-8 py-6">
                Empezar gratis ahora
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="lg" 
              className="border-white text-white hover:bg-white hover:text-red-600 text-lg px-8 py-6"
            >
              Agendar demostración
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                  <Search className="text-white w-4 h-4" />
                </div>
                <span className="text-xl font-bold">BuscarPerú</span>
              </div>
              <p className="text-gray-400">
                Potencia tu negocio con herramientas profesionales diseñadas para el mercado peruano.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Producto</h4>
              <ul className="space-y-2 text-gray-400">
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
            <p className="text-gray-400">&copy; 2025 BuscarPerú. Todos los derechos reservados.</p>
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