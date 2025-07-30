import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard-layout";
import { 
  Users, 
  MessageSquare, 
  HandHeart, 
  Calendar, 
  TrendingUp, 
  Plus,
  Heart,
  MessageCircle,
  Eye,
  MapPin,
  Clock,
  User,
  Building2,
  Briefcase,
  Target,
  DollarSign,
  CalendarDays,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  UserPlus,
  Check,
  X,
  Star
} from "lucide-react";

// Schema for networking post form
const networkingPostSchema = z.object({
  title: z.string().min(5, "El título debe tener al menos 5 caracteres"),
  content: z.string().min(20, "El contenido debe tener al menos 20 caracteres"),
  postType: z.enum(["opportunity", "collaboration", "referral", "announcement", "question"]),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  targetAudience: z.enum(["all", "connections", "specific_categories"]).default("all"),
});

// Schema for collaboration project form
const collaborationProjectSchema = z.object({
  title: z.string().min(5, "El título debe tener al menos 5 caracteres"),
  description: z.string().min(20, "La descripción debe tener al menos 20 caracteres"),
  projectType: z.enum(["joint_marketing", "cross_promotion", "shared_services", "event_collaboration"]),
  requiredSkills: z.array(z.string()).default([]),
  budget: z.string().optional(),
  timeline: z.string().optional(),
  maxParticipants: z.number().min(1).max(50).default(10),
});

// Schema for networking event form
const networkingEventSchema = z.object({
  title: z.string().min(5, "El título debe tener al menos 5 caracteres"),
  description: z.string().min(20, "La descripción debe tener al menos 20 caracteres"),
  eventType: z.enum(["workshop", "meetup", "webinar", "conference", "social"]),
  venue: z.string().optional(),
  address: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  maxAttendees: z.number().optional(),
  ticketPrice: z.string().default("0"),
  tags: z.array(z.string()).default([]),
});

export default function NetworkingPage() {
  const [selectedTab, setSelectedTab] = useState("feed");
  const [newPostOpen, setNewPostOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newEventOpen, setNewEventOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user's businesses first
  const { data: businesses } = useQuery({
    queryKey: ["/api/dashboard/businesses"],
  });

  // Use the first business (in a real app, should handle multiple businesses)
  const businessId = businesses?.[0]?.id;

  // Fetch networking stats
  const { data: networkingStats } = useQuery({
    queryKey: ["/api/networking/stats", businessId],
    queryFn: () => apiRequest(`/api/networking/stats/${businessId}`),
    enabled: !!businessId,
  });

  // Fetch networking posts
  const { data: networkingPosts = [], isLoading: postsLoading } = useQuery({
    queryKey: ["/api/networking/posts"],
    queryFn: () => apiRequest("/api/networking/posts"),
  });

  // Fetch collaboration projects
  const { data: collaborationProjects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/networking/collaborations"],
    queryFn: () => apiRequest("/api/networking/collaborations"),
  });

  // Fetch networking events
  const { data: networkingEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/networking/events"],
    queryFn: () => apiRequest("/api/networking/events"),
  });

  // Fetch business connections
  const { data: connections = [] } = useQuery({
    queryKey: ["/api/networking/connections", businessId],
    queryFn: () => apiRequest(`/api/networking/connections/${businessId}`),
    enabled: !!businessId,
  });

  // Fetch connection requests
  const { data: connectionRequests = [] } = useQuery({
    queryKey: ["/api/networking/connections", businessId, "requests"],
    queryFn: () => apiRequest(`/api/networking/connections/${businessId}/requests`),
    enabled: !!businessId,
  });

  // Fetch suggested connections
  const { data: suggestions = [] } = useQuery({
    queryKey: ["/api/networking/suggestions", businessId],
    queryFn: () => apiRequest(`/api/networking/suggestions/${businessId}`),
    enabled: !!businessId,
  });

  // Create networking post mutation
  const createPostMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/networking/posts", {
      method: "POST",
      body: JSON.stringify({ ...data, businessId }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/networking/posts"] });
      setNewPostOpen(false);
      toast({ title: "Publicación creada exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al crear la publicación", variant: "destructive" });
    },
  });

  // Create collaboration project mutation
  const createProjectMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/networking/collaborations", {
      method: "POST",
      body: JSON.stringify({ ...data, creatorId: businessId }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/networking/collaborations"] });
      setNewProjectOpen(false);
      toast({ title: "Proyecto de colaboración creado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al crear el proyecto", variant: "destructive" });
    },
  });

  // Create networking event mutation
  const createEventMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/networking/events", {
      method: "POST",
      body: JSON.stringify({ ...data, organizerId: businessId }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/networking/events"] });
      setNewEventOpen(false);
      toast({ title: "Evento de networking creado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al crear el evento", variant: "destructive" });
    },
  });

  // Create connection request mutation
  const createConnectionMutation = useMutation({
    mutationFn: (recipientId: number) => apiRequest("/api/networking/connections", {
      method: "POST",
      body: JSON.stringify({
        requesterId: MOCK_BUSINESS_ID,
        recipientId,
        connectionType: "general",
        message: "Me gustaría conectar contigo para oportunidades de colaboración."
      }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/networking/suggestions", MOCK_BUSINESS_ID] });
      toast({ title: "Solicitud de conexión enviada" });
    },
    onError: () => {
      toast({ title: "Error al enviar solicitud de conexión", variant: "destructive" });
    },
  });

  // Like post mutation
  const likePostMutation = useMutation({
    mutationFn: (postId: number) => apiRequest(`/api/networking/posts/${postId}/likes`, {
      method: "POST",
      body: JSON.stringify({ businessId: MOCK_BUSINESS_ID }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/networking/posts"] });
    },
  });

  // Forms
  const postForm = useForm<z.infer<typeof networkingPostSchema>>({
    resolver: zodResolver(networkingPostSchema),
    defaultValues: {
      title: "",
      content: "",
      postType: "opportunity",
      category: "",
      tags: [],
      targetAudience: "all",
    },
  });

  const projectForm = useForm<z.infer<typeof collaborationProjectSchema>>({
    resolver: zodResolver(collaborationProjectSchema),
    defaultValues: {
      title: "",
      description: "",
      projectType: "joint_marketing",
      requiredSkills: [],
      budget: "",
      timeline: "",
      maxParticipants: 10,
    },
  });

  const eventForm = useForm<z.infer<typeof networkingEventSchema>>({
    resolver: zodResolver(networkingEventSchema),
    defaultValues: {
      title: "",
      description: "",
      eventType: "meetup",
      venue: "",
      address: "",
      startDate: "",
      endDate: "",
      maxAttendees: undefined,
      ticketPrice: "0",
      tags: [],
    },
  });

  const handleCreatePost = (data: z.infer<typeof networkingPostSchema>) => {
    createPostMutation.mutate(data);
  };

  const handleCreateProject = (data: z.infer<typeof collaborationProjectSchema>) => {
    createProjectMutation.mutate(data);
  };

  const handleCreateEvent = (data: z.infer<typeof networkingEventSchema>) => {
    createEventMutation.mutate(data);
  };

  const getPostTypeLabel = (type: string) => {
    const labels = {
      opportunity: "Oportunidad",
      collaboration: "Colaboración",
      referral: "Referencia",
      announcement: "Anuncio",
      question: "Pregunta"
    };
    return labels[type] || type;
  };

  const getPostTypeColor = (type: string) => {
    const colors = {
      opportunity: "bg-green-100 text-green-800",
      collaboration: "bg-blue-100 text-blue-800",
      referral: "bg-purple-100 text-purple-800",
      announcement: "bg-yellow-100 text-yellow-800",
      question: "bg-gray-100 text-gray-800"
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  const getProjectTypeLabel = (type: string) => {
    const labels = {
      joint_marketing: "Marketing Conjunto",
      cross_promotion: "Promoción Cruzada",
      shared_services: "Servicios Compartidos",
      event_collaboration: "Colaboración en Eventos"
    };
    return labels[type] || type;
  };

  const getEventTypeLabel = (type: string) => {
    const labels = {
      workshop: "Taller",
      meetup: "Encuentro",
      webinar: "Webinar",
      conference: "Conferencia",
      social: "Social"
    };
    return labels[type] || type;
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Red de Negocios</h1>
          <p className="text-gray-600">
            Conecta con otros empresarios, encuentra oportunidades de colaboración y haz crecer tu red de contactos
          </p>
        </div>

        {/* Stats Cards */}
        {networkingStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Conexiones</p>
                    <p className="text-2xl font-bold text-gray-900">{networkingStats.connectionCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <MessageSquare className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Publicaciones</p>
                    <p className="text-2xl font-bold text-gray-900">{networkingStats.postsCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <HandHeart className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Colaboraciones</p>
                    <p className="text-2xl font-bold text-gray-900">{networkingStats.collaborationsCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Eventos</p>
                    <p className="text-2xl font-bold text-gray-900">{networkingStats.eventsOrganized}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="feed">Feed</TabsTrigger>
            <TabsTrigger value="connections">Conexiones</TabsTrigger>
            <TabsTrigger value="collaborations">Colaboraciones</TabsTrigger>
            <TabsTrigger value="events">Eventos</TabsTrigger>
            <TabsTrigger value="referrals">Referencias</TabsTrigger>
          </TabsList>

          {/* Feed Tab */}
          <TabsContent value="feed" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Feed de Networking</h2>
              <Dialog open={newPostOpen} onOpenChange={setNewPostOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Publicación
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Crear Nueva Publicación</DialogTitle>
                  </DialogHeader>
                  <Form {...postForm}>
                    <form onSubmit={postForm.handleSubmit(handleCreatePost)} className="space-y-4">
                      <FormField
                        control={postForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Título</FormLabel>
                            <FormControl>
                              <Input placeholder="Título de la publicación" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={postForm.control}
                        name="content"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contenido</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Describe tu oportunidad, pregunta o anuncio..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={postForm.control}
                        name="postType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Publicación</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona el tipo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="opportunity">Oportunidad</SelectItem>
                                <SelectItem value="collaboration">Colaboración</SelectItem>
                                <SelectItem value="referral">Referencia</SelectItem>
                                <SelectItem value="announcement">Anuncio</SelectItem>
                                <SelectItem value="question">Pregunta</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setNewPostOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={createPostMutation.isPending}>
                          {createPostMutation.isPending ? "Creando..." : "Crear Publicación"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Posts List */}
            <div className="space-y-4">
              {postsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-4">Cargando publicaciones...</p>
                </div>
              ) : networkingPosts.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No hay publicaciones aún</h3>
                    <p className="text-gray-600 mb-4">Sé el primero en compartir una oportunidad o pregunta</p>
                    <Button onClick={() => setNewPostOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Primera Publicación
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                networkingPosts.map((post: any) => (
                  <Card key={post.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{post.businessName}</h3>
                            <p className="text-sm text-gray-500">{post.businessCategory}</p>
                          </div>
                        </div>
                        <Badge className={getPostTypeColor(post.postType)}>
                          {getPostTypeLabel(post.postType)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <h4 className="font-semibold text-gray-900 mb-2">{post.title}</h4>
                      <p className="text-gray-700 mb-4">{post.content}</p>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center space-x-4">
                          <button
                            onClick={() => likePostMutation.mutate(post.id)}
                            className="flex items-center space-x-1 hover:text-red-600"
                          >
                            <Heart className="h-4 w-4" />
                            <span>{post.likeCount}</span>
                          </button>
                          <div className="flex items-center space-x-1">
                            <MessageCircle className="h-4 w-4" />
                            <span>{post.commentCount}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Eye className="h-4 w-4" />
                            <span>{post.viewCount}</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Connections Tab */}
          <TabsContent value="connections" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Current Connections */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Mis Conexiones ({connections.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {connections.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No tienes conexiones aún</p>
                  ) : (
                    <div className="space-y-3">
                      {connections.map((connection: any) => (
                        <div key={connection.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">Conexión #{connection.id}</p>
                              <p className="text-sm text-gray-500">{connection.connectionType}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-green-600">
                            Conectado
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Suggested Connections */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <UserPlus className="h-5 w-5 mr-2" />
                    Conexiones Sugeridas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {suggestions.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No hay sugerencias disponibles</p>
                  ) : (
                    <div className="space-y-3">
                      {suggestions.map((suggestion: any) => (
                        <div key={suggestion.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{suggestion.name}</p>
                              <p className="text-sm text-gray-500">{suggestion.category}</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => createConnectionMutation.mutate(suggestion.id)}
                            disabled={createConnectionMutation.isPending}
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            Conectar
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Connection Requests */}
            {connectionRequests.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    Solicitudes de Conexión ({connectionRequests.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {connectionRequests.map((request: any) => (
                      <div key={request.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-yellow-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">Solicitud #{request.id}</p>
                            <p className="text-sm text-gray-500">{request.message}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <X className="h-4 w-4" />
                          </Button>
                          <Button size="sm">
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Collaborations Tab */}
          <TabsContent value="collaborations" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Proyectos de Colaboración</h2>
              <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Proyecto
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Crear Proyecto de Colaboración</DialogTitle>
                  </DialogHeader>
                  <Form {...projectForm}>
                    <form onSubmit={projectForm.handleSubmit(handleCreateProject)} className="space-y-4">
                      <FormField
                        control={projectForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Título del Proyecto</FormLabel>
                            <FormControl>
                              <Input placeholder="Título del proyecto" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={projectForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descripción</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Describe el proyecto de colaboración..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={projectForm.control}
                        name="projectType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Proyecto</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona el tipo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="joint_marketing">Marketing Conjunto</SelectItem>
                                <SelectItem value="cross_promotion">Promoción Cruzada</SelectItem>
                                <SelectItem value="shared_services">Servicios Compartidos</SelectItem>
                                <SelectItem value="event_collaboration">Colaboración en Eventos</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setNewProjectOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={createProjectMutation.isPending}>
                          {createProjectMutation.isPending ? "Creando..." : "Crear Proyecto"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Projects List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {projectsLoading ? (
                <div className="col-span-2 text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-4">Cargando proyectos...</p>
                </div>
              ) : collaborationProjects.length === 0 ? (
                <Card className="col-span-2">
                  <CardContent className="p-12 text-center">
                    <Briefcase className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No hay proyectos de colaboración</h3>
                    <p className="text-gray-600 mb-4">Crea un proyecto para colaborar con otros negocios</p>
                    <Button onClick={() => setNewProjectOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Primer Proyecto
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                collaborationProjects.map((project: any) => (
                  <Card key={project.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{project.title}</CardTitle>
                          <p className="text-sm text-gray-500 mt-1">
                            Por {project.creatorName} • {getProjectTypeLabel(project.projectType)}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-blue-600">
                          {project.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 mb-4">{project.description}</p>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <Users className="h-4 w-4" />
                            <span>{project.currentParticipants}/{project.maxParticipants}</span>
                          </div>
                          {project.budget && (
                            <div className="flex items-center space-x-1">
                              <DollarSign className="h-4 w-4" />
                              <span>S/ {project.budget}</span>
                            </div>
                          )}
                        </div>
                        <Button size="sm" variant="outline">
                          Ver Detalles
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Eventos de Networking</h2>
              <Dialog open={newEventOpen} onOpenChange={setNewEventOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Evento
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Crear Evento de Networking</DialogTitle>
                  </DialogHeader>
                  <Form {...eventForm}>
                    <form onSubmit={eventForm.handleSubmit(handleCreateEvent)} className="space-y-4">
                      <FormField
                        control={eventForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Título del Evento</FormLabel>
                            <FormControl>
                              <Input placeholder="Título del evento" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={eventForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descripción</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Describe el evento..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={eventForm.control}
                        name="eventType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Evento</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona el tipo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="workshop">Taller</SelectItem>
                                <SelectItem value="meetup">Encuentro</SelectItem>
                                <SelectItem value="webinar">Webinar</SelectItem>
                                <SelectItem value="conference">Conferencia</SelectItem>
                                <SelectItem value="social">Social</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={eventForm.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fecha de Inicio</FormLabel>
                            <FormControl>
                              <Input type="datetime-local" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setNewEventOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={createEventMutation.isPending}>
                          {createEventMutation.isPending ? "Creando..." : "Crear Evento"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Events List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {eventsLoading ? (
                <div className="col-span-2 text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-4">Cargando eventos...</p>
                </div>
              ) : networkingEvents.length === 0 ? (
                <Card className="col-span-2">
                  <CardContent className="p-12 text-center">
                    <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No hay eventos programados</h3>
                    <p className="text-gray-600 mb-4">Organiza un evento para conectar con otros empresarios</p>
                    <Button onClick={() => setNewEventOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Primer Evento
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                networkingEvents.map((event: any) => (
                  <Card key={event.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{event.title}</CardTitle>
                          <p className="text-sm text-gray-500 mt-1">
                            Por {event.organizerName} • {getEventTypeLabel(event.eventType)}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-green-600">
                          {event.ticketPrice === "0" ? "Gratis" : `S/ ${event.ticketPrice}`}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 mb-4">{event.description}</p>
                      <div className="space-y-2 text-sm text-gray-500">
                        <div className="flex items-center space-x-2">
                          <CalendarDays className="h-4 w-4" />
                          <span>{new Date(event.startDate).toLocaleDateString()}</span>
                        </div>
                        {event.venue && (
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4" />
                            <span>{event.venue}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4" />
                          <span>{event.currentAttendees} registrados</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-4">
                        <div className="flex items-center space-x-2">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm text-gray-600">
                            {event.currentAttendees > 0 ? `${event.currentAttendees} asistentes` : "Sin asistentes"}
                          </span>
                        </div>
                        <Button size="sm" variant="outline">
                          Ver Detalles
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Referrals Tab */}
          <TabsContent value="referrals" className="space-y-6">
            <div className="text-center py-12">
              <HandHeart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Sistema de Referencias</h2>
              <p className="text-gray-600 mb-6">
                Refiere clientes a otros negocios y recibe referencias de tu red de contactos
              </p>
              <Button size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Crear Nueva Referencia
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}