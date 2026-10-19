import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, Play, Pause, RefreshCw, Database, BarChart3, Settings, Download, Upload, Trash2, CheckCircle, XCircle, Clock, TrendingUp, MapPin, Building, Phone, Globe, Mail } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ScrapingJob {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime: string;
  endTime?: string;
  results?: any;
  error?: string;
  config: any;
}

interface ScrapingStats {
  totals: {
    apify: number;
    osm: number;
    combined: number;
  };
  categories: {
    apify: Array<{ category: string; count: number }>;
    osm: Array<{ category: string; count: number }>;
  };
  quality: {
    apify: {
      totalBusinesses: number;
      withPhone: number;
      withWebsite: number;
      withEmail: number;
      withRating: number;
    };
    osm: {
      totalBusinesses: number;
      withPhone: number;
      withWebsite: number;
      withEmail: number;
      withHours: number;
    };
  };
}

export default function AdminScrapingPage() {
  const { toast } = useToast();
  const [selectedScraper, setSelectedScraper] = useState("");
  const [scrapingConfig, setScrapingConfig] = useState({
    maxResults: 1000,
    enhanced: false,
    category: "",
    district: "",
    searchTerms: ""
  });

  // Custom query function with admin auth
  const adminQueryFn = async ({ queryKey }: any) => {
    const token = sessionStorage.getItem('adminToken');
    const res = await fetch(queryKey[0] as string, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) {
      throw new Error(`${res.status}: ${await res.text()}`);
    }
    return await res.json();
  };

  // Fetch scraping jobs
  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ["/api/admin/scraping/jobs"],
    queryFn: adminQueryFn,
    refetchInterval: 5000 // Refresh every 5 seconds for live updates
  });

  // Fetch scraping statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/admin/scraping/stats"],
    queryFn: adminQueryFn
  });

  // Fetch available scrapers
  const { data: scrapers, isLoading: scrapersLoading } = useQuery({
    queryKey: ["/api/admin/scraping/scrapers"],
    queryFn: adminQueryFn
  });

  // Start scraping job mutation
  const startScrapingMutation = useMutation({
    mutationFn: async (config: any) => {
      const token = sessionStorage.getItem('adminToken');
      const response = await fetch("/api/admin/scraping/start", {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${await response.text()}`);
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Scraping Started",
        description: `Job ${data.jobId} started successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scraping/jobs"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to start scraping: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleStartScraping = () => {
    if (!selectedScraper) {
      toast({
        title: "Error",
        description: "Please select a scraper first",
        variant: "destructive",
      });
      return;
    }

    const scraper = scrapers?.scrapers.find((s: any) => s.id === selectedScraper);
    if (!scraper) return;

    const config = {
      type: scraper.type,
      category: scrapingConfig.category || scraper.category,
      district: scrapingConfig.district,
      maxResults: scrapingConfig.maxResults,
      enhanced: scrapingConfig.enhanced,
      searchTerms: scrapingConfig.searchTerms ? scrapingConfig.searchTerms.split(",").map(s => s.trim()) : undefined
    };

    startScrapingMutation.mutate(config);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "secondary",
      running: "default", 
      completed: "default",
      failed: "destructive"
    } as const;
    
    const icons = {
      pending: <Clock className="w-3 h-3" />,
      running: <RefreshCw className="w-3 h-3 animate-spin" />,
      completed: <CheckCircle className="w-3 h-3" />,
      failed: <XCircle className="w-3 h-3" />
    };

    return (
      <Badge variant={variants[status as keyof typeof variants]} className="flex items-center gap-1">
        {icons[status as keyof typeof icons]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDuration = (start: string, end?: string) => {
    const startTime = new Date(start);
    const endTime = end ? new Date(end) : new Date();
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
    
    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.round(duration / 60)}m`;
    return `${Math.round(duration / 3600)}h`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Scraping Management</h1>
          <p className="text-muted-foreground">Manage and monitor your business data scraping operations</p>
        </div>
        <Button 
          onClick={handleStartScraping}
          disabled={!selectedScraper || startScrapingMutation.isPending}
          className="flex items-center gap-2"
        >
          <Play className="w-4 h-4" />
          Start Scraping
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="scrapers">Scrapers</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Statistics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Businesses</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? "..." : stats?.totals.combined.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Apify: {stats?.totals.apify.toLocaleString()} | OSM: {stats?.totals.osm.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Data Quality</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? "..." : Math.round(((stats?.quality.apify.withPhone + stats?.quality.osm.withPhone) / stats?.totals.combined) * 100)}%
                </div>
                <p className="text-xs text-muted-foreground">Businesses with phone numbers</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {jobsLoading ? "..." : jobs?.jobs.filter((j: ScrapingJob) => j.status === 'running').length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Currently running scrapers</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Jobs */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Jobs</CardTitle>
              <CardDescription>Latest scraping job activity</CardDescription>
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <div className="text-center py-8">Loading jobs...</div>
              ) : (
                <div className="space-y-4">
                  {jobs?.jobs.slice(0, 5).map((job: ScrapingJob) => (
                    <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div>
                          <p className="font-medium">{job.type.charAt(0).toUpperCase() + job.type.slice(1)} Scraper</p>
                          <p className="text-sm text-muted-foreground">
                            Started {new Date(job.startTime).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        {job.status === 'running' && (
                          <Progress value={job.progress} className="w-24" />
                        )}
                        {getStatusBadge(job.status)}
                        <span className="text-sm text-muted-foreground">
                          {formatDuration(job.startTime, job.endTime)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Scraping Jobs</CardTitle>
              <CardDescription>Monitor and manage all scraping operations</CardDescription>
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <div className="text-center py-8">Loading jobs...</div>
              ) : (
                <div className="space-y-4">
                  {jobs?.jobs.map((job: ScrapingJob) => (
                    <Card key={job.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-semibold">{job.id}</h4>
                              {getStatusBadge(job.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Type: {job.type} | Started: {new Date(job.startTime).toLocaleString()}
                            </p>
                            {job.status === 'running' && (
                              <Progress value={job.progress} className="w-full" />
                            )}
                            {job.error && (
                              <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{job.error}</AlertDescription>
                              </Alert>
                            )}
                            {job.results && (
                              <div className="text-sm space-y-1">
                                <p>Results: {job.results.summary?.businessesFound || 0} businesses found</p>
                                {job.results.summary?.errors > 0 && (
                                  <p className="text-destructive">Errors: {job.results.summary.errors}</p>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{job.progress}%</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDuration(job.startTime, job.endTime)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scrapers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Available Scrapers</CardTitle>
              <CardDescription>Configure and launch scraping operations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scraper-select">Select Scraper</Label>
                  <Select value={selectedScraper} onValueChange={setSelectedScraper}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a scraper..." />
                    </SelectTrigger>
                    <SelectContent>
                      {scrapers?.scrapers.map((scraper: any) => (
                        <SelectItem key={scraper.id} value={scraper.id}>
                          {scraper.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-results">Max Results</Label>
                  <Input
                    id="max-results"
                    type="number"
                    value={scrapingConfig.maxResults}
                    onChange={(e) => setScrapingConfig(prev => ({ ...prev, maxResults: parseInt(e.target.value) }))}
                    placeholder="1000"
                  />
                </div>
              </div>

              {selectedScraper && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-semibold">Scraper Configuration</h4>
                  
                  {selectedScraper.includes('category') && (
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Input
                        id="category"
                        value={scrapingConfig.category}
                        onChange={(e) => setScrapingConfig(prev => ({ ...prev, category: e.target.value }))}
                        placeholder="e.g., belleza, gastronomia"
                      />
                    </div>
                  )}

                  {selectedScraper.includes('district') && (
                    <div className="space-y-2">
                      <Label htmlFor="district">District</Label>
                      <Input
                        id="district"
                        value={scrapingConfig.district}
                        onChange={(e) => setScrapingConfig(prev => ({ ...prev, district: e.target.value }))}
                        placeholder="e.g., Miraflores, San Isidro"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="search-terms">Search Terms (comma-separated)</Label>
                    <Textarea
                      id="search-terms"
                      value={scrapingConfig.searchTerms}
                      onChange={(e) => setScrapingConfig(prev => ({ ...prev, searchTerms: e.target.value }))}
                      placeholder="salon, peluqueria, barberia"
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enhanced"
                      checked={scrapingConfig.enhanced}
                      onCheckedChange={(checked) => setScrapingConfig(prev => ({ ...prev, enhanced: checked }))}
                    />
                    <Label htmlFor="enhanced">Enhanced scraping (includes contact enrichment)</Label>
                  </div>
                </div>
              )}

              {selectedScraper && scrapers?.scrapers && (
                <Card>
                  <CardContent className="pt-6">
                    {(() => {
                      const scraper = scrapers.scrapers.find((s: any) => s.id === selectedScraper);
                      return scraper ? (
                        <div className="space-y-2">
                          <h4 className="font-semibold">{scraper.name}</h4>
                          <p className="text-sm text-muted-foreground">{scraper.description}</p>
                          <div className="flex items-center justify-between text-sm">
                            <span>Estimated Cost: <strong>{scraper.estimatedCost}</strong></span>
                            <span>Expected Results: <strong>{scraper.expectedResults}</strong></span>
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Category Distribution</CardTitle>
                <CardDescription>Business categories across data sources</CardDescription>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="text-center py-8">Loading analytics...</div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Apify Data</h4>
                      {stats?.categories.apify.slice(0, 5).map((cat: any) => (
                        <div key={cat.category} className="flex justify-between items-center py-1">
                          <span className="text-sm">{cat.category}</span>
                          <Badge variant="outline">{cat.count.toLocaleString()}</Badge>
                        </div>
                      ))}
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">OpenStreetMap Data</h4>
                      {stats?.categories.osm.slice(0, 5).map((cat: any) => (
                        <div key={cat.category} className="flex justify-between items-center py-1">
                          <span className="text-sm">{cat.category}</span>
                          <Badge variant="outline">{cat.count.toLocaleString()}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Data Quality Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Data Quality</CardTitle>
                <CardDescription>Contact information coverage</CardDescription>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="text-center py-8">Loading quality metrics...</div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        Apify Data Quality
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Phone className="w-3 h-3" />
                            <span className="text-sm">Phone Numbers</span>
                          </div>
                          <span className="text-sm font-medium">
                            {Math.round((stats?.quality.apify.withPhone / stats?.quality.apify.totalBusinesses) * 100)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Globe className="w-3 h-3" />
                            <span className="text-sm">Websites</span>
                          </div>
                          <span className="text-sm font-medium">
                            {Math.round((stats?.quality.apify.withWebsite / stats?.quality.apify.totalBusinesses) * 100)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Mail className="w-3 h-3" />
                            <span className="text-sm">Email Addresses</span>
                          </div>
                          <span className="text-sm font-medium">
                            {Math.round((stats?.quality.apify.withEmail / stats?.quality.apify.totalBusinesses) * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        OpenStreetMap Quality
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Phone className="w-3 h-3" />
                            <span className="text-sm">Phone Numbers</span>
                          </div>
                          <span className="text-sm font-medium">
                            {Math.round((stats?.quality.osm.withPhone / stats?.quality.osm.totalBusinesses) * 100)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Globe className="w-3 h-3" />
                            <span className="text-sm">Websites</span>
                          </div>
                          <span className="text-sm font-medium">
                            {Math.round((stats?.quality.osm.withWebsite / stats?.quality.osm.totalBusinesses) * 100)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            <span className="text-sm">Opening Hours</span>
                          </div>
                          <span className="text-sm font-medium">
                            {Math.round((stats?.quality.osm.withHours / stats?.quality.osm.totalBusinesses) * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Scraping Settings</CardTitle>
              <CardDescription>Configure global scraping parameters and data management</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Advanced settings for data management and scraping optimization. Changes here affect all future scraping operations.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Data Management</h4>
                  <Button variant="outline" className="w-full justify-start">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove Duplicate Businesses
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Update Business Categories
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Validate Contact Information
                  </Button>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Data Export</h4>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    Export Apify Businesses (CSV)
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    Export OpenStreetMap Data (CSV)
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Upload className="w-4 h-4 mr-2" />
                    Import Business Data
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}