import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/contexts/theme-context";
import {
    Book,
    Calendar,
    DollarSign,
    Globe,
    HelpCircle,
    LayoutDashboard,
    Network,
    Package,
    Search,
    Star,
    Users
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

interface FAQItem {
    question: string;
    answer: string;
    category: string;
}

interface FeatureSection {
    title: string;
    icon: any;
    description: string;
    features: string[];
}

const faqData: FAQItem[] = [
    {
        question: "¿Cómo crear mi primera cita?",
        answer: "Ve a la sección 'Citas' desde el menú lateral, haz clic en 'Nueva Cita' y completa los datos del cliente, fecha, hora y servicio.",
        category: "Citas"
    },
    {
        question: "¿Cómo configurar mis servicios?",
        answer: "En la sección 'Servicios' puedes agregar, editar y eliminar servicios. Define el nombre, duración, precio y descripción de cada servicio.",
        category: "Servicios"
    },
    {
        question: "¿Cómo funciona el micrositio?",
        answer: "El micrositio es tu página web personalizada donde los clientes pueden ver tus servicios y agendar citas. Configúralo en la sección 'Micrositio'.",
        category: "Micrositio"
    },
    {
        question: "¿Cómo ver mis ganancias?",
        answer: "En la sección 'Finanzas' encontrarás reportes detallados de tus ingresos, gastos y ganancias por período.",
        category: "Finanzas"
    },
    {
        question: "¿Cómo gestionar las reseñas?",
        answer: "Las reseñas de clientes aparecen automáticamente en la sección 'Reseñas'. Puedes responder y gestionar la reputación de tu negocio.",
        category: "Reseñas"
    },
    {
        question: "¿Qué es el networking?",
        answer: "La función de networking te permite conectar con otros profesionales de tu área y colaborar en proyectos conjuntos.",
        category: "Networking"
    },
    {
        question: "¿Cómo exportar mis datos?",
        answer: "Puedes exportar reportes desde cada sección usando los botones de exportación disponibles en las tablas y gráficos.",
        category: "General"
    },
    {
        question: "¿Cómo cambiar mi información personal?",
        answer: "Ve a 'Configuración' para actualizar tu perfil, información de contacto y preferencias de la aplicación.",
        category: "Configuración"
    }
];

const featureSections: FeatureSection[] = [
    {
        title: "Dashboard",
        icon: LayoutDashboard,
        description: "Panel principal con resumen de tu negocio",
        features: [
            "Vista general de citas del día",
            "Resumen de ingresos",
            "Métricas de clientes activos",
            "Gráficos de rendimiento",
            "Notificaciones importantes"
        ]
    },
    {
        title: "Gestión de Citas",
        icon: Calendar,
        description: "Sistema completo para administrar tus citas",
        features: [
            "Crear, editar y cancelar citas",
            "Calendario visual interactivo",
            "Notificaciones automáticas",
            "Estados de cita (pendiente, confirmada, completada)",
            "Historial completo de citas"
        ]
    },
    {
        title: "Gestión de Clientes",
        icon: Users,
        description: "Base de datos completa de tus clientes",
        features: [
            "Perfiles detallados de clientes",
            "Historial de servicios",
            "Información de contacto",
            "Notas y preferencias",
            "Búsqueda y filtros avanzados"
        ]
    },
    {
        title: "Servicios",
        icon: Package,
        description: "Catálogo de servicios que ofreces",
        features: [
            "Crear y editar servicios",
            "Definir precios y duraciones",
            "Categorización de servicios",
            "Descripciones detalladas",
            "Control de disponibilidad"
        ]
    },
    {
        title: "Finanzas",
        icon: DollarSign,
        description: "Control financiero de tu negocio",
        features: [
            "Reportes de ingresos y gastos",
            "Gráficos de tendencias",
            "Análisis por períodos",
            "Exportación de datos",
            "Métricas de rentabilidad"
        ]
    },
    {
        title: "Reseñas",
        icon: Star,
        description: "Gestión de la reputación online",
        features: [
            "Visualización de reseñas",
            "Respuesta a comentarios",
            "Calificación promedio",
            "Análisis de sentimientos",
            "Mejora de la reputación"
        ]
    },
    {
        title: "Micrositio",
        icon: Globe,
        description: "Tu página web personalizada",
        features: [
            "Diseño personalizable",
            "Agendamiento online",
            "Galería de trabajos",
            "Información de contacto",
            "SEO optimizado"
        ]
    },
    {
        title: "Networking",
        icon: Network,
        description: "Conexiones profesionales",
        features: [
            "Red de profesionales",
            "Colaboraciones",
            "Referencias cruzadas",
            "Eventos del sector",
            "Oportunidades de negocio"
        ]
    }
];

export default function Documentation() {
    const { isDark } = useTheme();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("Todos");

    const categories = ["Todos", ...Array.from(new Set(faqData.map(faq => faq.category)))];

    const filteredFAQs = faqData.filter(faq => {
        const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
            faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === "Todos" || faq.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const filteredFeatures = featureSections.filter(section =>
        section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        section.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        section.features.some(feature => feature.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <DashboardLayout>
            <div className="min-h-screen theme-bg">
                {/* Header */}
                <div className="theme-card border-b theme-border">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <div className="text-center">
                            <div className="flex items-center justify-center mb-4">
                                <Book className="h-12 w-12 theme-primary mr-4" />
                                <h1 className="text-4xl font-bold theme-text-primary">
                                    Documentación y Ayuda
                                </h1>
                            </div>
                            <p className="text-lg theme-text-secondary max-w-2xl mx-auto">
                                Aprende a utilizar todas las funciones de tu plataforma de gestión de citas y
                                encuentra respuestas a las preguntas más frecuentes.
                            </p>
                        </div>

                        {/* Search */}
                        <div className="mt-8 max-w-2xl mx-auto">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 theme-text-secondary h-5 w-5" />
                                <Input
                                    type="text"
                                    placeholder="Buscar en la documentación..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 py-3 text-lg"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Quick Links */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold theme-text-primary mb-6">Acceso Rápido</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Link href="/dashboard">
                                <Button variant="outline" className="h-20 flex-col space-y-2 w-full">
                                    <LayoutDashboard className="h-6 w-6" />
                                    <span>Dashboard</span>
                                </Button>
                            </Link>
                            <Link href="/dashboard/citas">
                                <Button variant="outline" className="h-20 flex-col space-y-2 w-full">
                                    <Calendar className="h-6 w-6" />
                                    <span>Citas</span>
                                </Button>
                            </Link>
                            <Link href="/dashboard/micrositio">
                                <Button variant="outline" className="h-20 flex-col space-y-2 w-full">
                                    <Globe className="h-6 w-6" />
                                    <span>Micrositio</span>
                                </Button>
                            </Link>
                            <Link href="/dashboard/configuracion">
                                <Button variant="outline" className="h-20 flex-col space-y-2 w-full">
                                    <HelpCircle className="h-6 w-6" />
                                    <span>Soporte</span>
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Features Documentation */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold theme-text-primary mb-6">Funcionalidades</h2>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {filteredFeatures.map((section, index) => (
                                <div key={index} className="theme-card p-6 rounded-lg border theme-border">
                                    <div className="flex items-center mb-4">
                                        <section.icon className="h-8 w-8 theme-primary mr-3" />
                                        <h3 className="text-xl font-semibold theme-text-primary">{section.title}</h3>
                                    </div>
                                    <p className="theme-text-secondary mb-4">{section.description}</p>
                                    <ul className="space-y-2">
                                        {section.features.map((feature, featureIndex) => (
                                            <li key={featureIndex} className="flex items-start">
                                                <div className="w-2 h-2 theme-primary rounded-full mt-2 mr-3 flex-shrink-0"></div>
                                                <span className="theme-text-secondary text-sm">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* FAQ Section */}
                    <div>
                        <h2 className="text-2xl font-bold theme-text-primary mb-6">Preguntas Frecuentes</h2>

                        {/* Category Filter */}
                        <div className="mb-6">
                            <div className="flex flex-wrap gap-2">
                                {categories.map(category => (
                                    <Button
                                        key={category}
                                        variant={selectedCategory === category ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setSelectedCategory(category)}
                                        className="mb-2"
                                    >
                                        {category}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* FAQ Items */}
                        <div className="space-y-4">
                            {filteredFAQs.map((faq, index) => (
                                <div key={index} className="theme-card p-6 rounded-lg border theme-border">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-semibold theme-text-primary mb-2">
                                                {faq.question}
                                            </h3>
                                            <p className="theme-text-secondary leading-relaxed">
                                                {faq.answer}
                                            </p>
                                            <span className="inline-block mt-3 px-3 py-1 text-xs font-medium theme-primary-text theme-primary-bg rounded-full">
                                                {faq.category}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {filteredFAQs.length === 0 && (
                            <div className="text-center py-12">
                                <HelpCircle className="h-12 w-12 theme-text-secondary mx-auto mb-4" />
                                <h3 className="text-lg font-medium theme-text-primary mb-2">
                                    No se encontraron resultados
                                </h3>
                                <p className="theme-text-secondary">
                                    Intenta con diferentes términos de búsqueda o categorías.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Contact Support */}
                    <div className="mt-12 theme-card p-8 rounded-lg border theme-border text-center">
                        <HelpCircle className="h-12 w-12 theme-primary mx-auto mb-4" />
                        <h3 className="text-xl font-semibold theme-text-primary mb-2">
                            ¿No encuentras lo que buscas?
                        </h3>
                        <p className="theme-text-secondary mb-6">
                            Nuestro equipo de soporte está aquí para ayudarte con cualquier pregunta.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button variant="default">
                                Contactar Soporte
                            </Button>
                            <Button variant="outline">
                                Solicitar Función
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
