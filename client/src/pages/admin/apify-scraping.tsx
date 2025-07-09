import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  Pause, 
  CheckCircle, 
  XCircle, 
  Clock, 
  MapPin, 
  Building, 
  TrendingUp,
  AlertTriangle,
  Zap,
  Database
} from 'lucide-react';

interface WaveConfig {
  id: string;
  name: string;
  districts: string[];
  cities: string[];
  categories: string[];
  priority: number;
  maxBusinesses: number;
  estimatedCredits: number;
  progress?: {
    status: 'pending' | 'running' | 'completed' | 'failed';
    businessesFound: number;
    businessesProcessed: number;
    creditsUsed: number;
    errors: string[];
    startTime?: string;
    endTime?: string;
  };
}

interface SummaryStats {
  totalWaves: number;
  completedWaves: number;
  totalBusinessesFound: number;
  totalBusinessesProcessed: number;
  totalErrors: number;
  estimatedCreditsUsed: number;
}

export default function ApifyScrapingDashboard() {
  const [waves, setWaves] = useState<WaveConfig[]>([]);
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedWave, setSelectedWave] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<any>(null);

  // Fetch waves data
  const fetchWaves = async () => {
    try {
      const response = await fetch('/api/apify/waves');
      const data = await response.json();
      setWaves(data.waves);
      setSummary(data.summary);
    } catch (error) {
      console.error('Error fetching waves:', error);
    }
  };

  // Test API status
  const testApiStatus = async () => {
    try {
      const response = await fetch('/api/test-apis');
      const data = await response.json();
      setApiStatus(data);
    } catch (error) {
      console.error('Error testing API:', error);
    }
  };

  // Execute a single wave
  const executeWave = async (waveId: string) => {
    setIsLoading(true);
    setSelectedWave(waveId);
    
    try {
      const response = await fetch(`/api/apify/waves/${waveId}/execute`, {
        method: 'POST'
      });
      
      if (response.ok) {
        // Start polling for updates
        const pollInterval = setInterval(async () => {
          await fetchWaves();
          
          // Stop polling when wave is completed or failed
          const currentWave = waves.find(w => w.id === waveId);
          if (currentWave?.progress?.status === 'completed' || 
              currentWave?.progress?.status === 'failed') {
            clearInterval(pollInterval);
            setIsLoading(false);
            setSelectedWave(null);
          }
        }, 5000);
      }
    } catch (error) {
      console.error('Error executing wave:', error);
      setIsLoading(false);
      setSelectedWave(null);
    }
  };

  // Execute all waves
  const executeAllWaves = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/apify/waves/execute-all', {
        method: 'POST'
      });
      
      if (response.ok) {
        // Start polling for updates
        const pollInterval = setInterval(async () => {
          await fetchWaves();
        }, 10000);
        
        // Stop polling after reasonable time
        setTimeout(() => {
          clearInterval(pollInterval);
          setIsLoading(false);
        }, 4 * 60 * 60 * 1000); // 4 hours
      }
    } catch (error) {
      console.error('Error executing all waves:', error);
      setIsLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    fetchWaves();
    testApiStatus();
  }, []);

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className=\"bg-green-500 text-white\"><CheckCircle className=\"w-3 h-3 mr-1\" />Completado</Badge>;
      case 'running':
        return <Badge className=\"bg-blue-500 text-white\"><Clock className=\"w-3 h-3 mr-1\" />Ejecutando</Badge>;
      case 'failed':
        return <Badge className=\"bg-red-500 text-white\"><XCircle className=\"w-3 h-3 mr-1\" />Fallido</Badge>;
      default:
        return <Badge variant=\"outline\"><Pause className=\"w-3 h-3 mr-1\" />Pendiente</Badge>;
    }
  };

  // Get progress percentage
  const getProgressPercentage = (wave: WaveConfig) => {
    if (!wave.progress) return 0;
    const { businessesFound, businessesProcessed } = wave.progress;
    if (businessesFound === 0) return 0;
    return Math.round((businessesProcessed / businessesFound) * 100);
  };

  // Week 1 waves
  const week1Waves = waves.filter(w => w.id.includes('wave-1') || w.id.includes('wave-2'));
  const otherWaves = waves.filter(w => !w.id.includes('wave-1') && !w.id.includes('wave-2'));

  return (
    <div className=\"max-w-7xl mx-auto p-6 space-y-6\">
      <div className=\"flex items-center justify-between\">
        <div>
          <h1 className=\"text-3xl font-bold text-gray-900\">Apify Business Scraping</h1>
          <p className=\"text-gray-600 mt-2\">Sistema de scraping por olas para 10,000+ negocios en Perú</p>
        </div>
        <Button 
          onClick={executeAllWaves} 
          disabled={isLoading}
          className=\"bg-blue-600 hover:bg-blue-700\"
        >
          {isLoading ? 'Ejecutando...' : 'Ejecutar Todas las Olas'}
        </Button>
      </div>

      {/* API Status */}
      {apiStatus && (
        <Alert className={apiStatus.apify?.status === 'working' ? 'border-green-500' : 'border-red-500'}>
          <AlertTriangle className=\"h-4 w-4\" />
          <AlertDescription>
            <strong>Estado API:</strong> {apiStatus.apify?.status === 'working' ? 'Funcionando' : 'Error'} - {apiStatus.apify?.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Stats */}
      {summary && (
        <div className=\"grid grid-cols-2 md:grid-cols-4 gap-4\">
          <Card>
            <CardContent className=\"p-4\">
              <div className=\"flex items-center space-x-2\">
                <Database className=\"w-5 h-5 text-blue-600\" />
                <div>
                  <p className=\"text-sm text-gray-600\">Negocios Encontrados</p>
                  <p className=\"text-2xl font-bold\">{summary.totalBusinessesFound.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className=\"p-4\">
              <div className=\"flex items-center space-x-2\">
                <CheckCircle className=\"w-5 h-5 text-green-600\" />
                <div>
                  <p className=\"text-sm text-gray-600\">Negocios Procesados</p>
                  <p className=\"text-2xl font-bold\">{summary.totalBusinessesProcessed.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className=\"p-4\">
              <div className=\"flex items-center space-x-2\">
                <Zap className=\"w-5 h-5 text-yellow-600\" />
                <div>
                  <p className=\"text-sm text-gray-600\">Créditos Usados</p>
                  <p className=\"text-2xl font-bold\">{summary.estimatedCreditsUsed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className=\"p-4\">
              <div className=\"flex items-center space-x-2\">
                <TrendingUp className=\"w-5 h-5 text-purple-600\" />
                <div>
                  <p className=\"text-sm text-gray-600\">Olas Completadas</p>
                  <p className=\"text-2xl font-bold\">{summary.completedWaves}/{summary.totalWaves}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Week 1 Focus */}
      <Card className=\"border-blue-200 bg-blue-50\">
        <CardHeader>
          <CardTitle className=\"text-blue-900\">Semana 1: Distritos Premium y Centros de Negocio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className=\"grid gap-4\">
            {week1Waves.map((wave) => (
              <div key={wave.id} className=\"bg-white p-4 rounded-lg border\">
                <div className=\"flex items-center justify-between mb-3\">
                  <div className=\"flex items-center space-x-3\">
                    <h3 className=\"font-semibold text-lg\">{wave.name}</h3>
                    {getStatusBadge(wave.progress?.status || 'pending')}
                  </div>
                  <Button
                    onClick={() => executeWave(wave.id)}
                    disabled={isLoading || wave.progress?.status === 'running'}
                    size=\"sm\"
                    className=\"bg-blue-600 hover:bg-blue-700\"
                  >
                    {isLoading && selectedWave === wave.id ? (
                      <>
                        <Clock className=\"w-4 h-4 mr-2 animate-spin\" />
                        Ejecutando...
                      </>
                    ) : (
                      <>
                        <Play className=\"w-4 h-4 mr-2\" />
                        Ejecutar
                      </>
                    )}
                  </Button>
                </div>
                
                <div className=\"grid grid-cols-2 md:grid-cols-4 gap-4 mb-4\">
                  <div className=\"flex items-center space-x-2\">
                    <MapPin className=\"w-4 h-4 text-gray-500\" />
                    <span className=\"text-sm text-gray-600\">{wave.cities.join(', ')}</span>
                  </div>
                  <div className=\"flex items-center space-x-2\">
                    <Building className=\"w-4 h-4 text-gray-500\" />
                    <span className=\"text-sm text-gray-600\">{wave.districts.length} distritos</span>
                  </div>
                  <div className=\"flex items-center space-x-2\">
                    <TrendingUp className=\"w-4 h-4 text-gray-500\" />
                    <span className=\"text-sm text-gray-600\">Meta: {wave.maxBusinesses.toLocaleString()}</span>
                  </div>
                  <div className=\"flex items-center space-x-2\">
                    <Zap className=\"w-4 h-4 text-gray-500\" />
                    <span className=\"text-sm text-gray-600\">{wave.estimatedCredits} créditos</span>
                  </div>
                </div>
                
                {wave.progress && (
                  <div className=\"space-y-2\">
                    <div className=\"flex justify-between text-sm\">
                      <span>Progreso: {wave.progress.businessesProcessed}/{wave.progress.businessesFound}</span>
                      <span>{getProgressPercentage(wave)}%</span>
                    </div>
                    <Progress value={getProgressPercentage(wave)} className=\"h-2\" />
                    {wave.progress.errors.length > 0 && (
                      <div className=\"text-red-600 text-sm\">
                        {wave.progress.errors.length} errores encontrados
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Other Waves */}
      <Card>
        <CardHeader>
          <CardTitle>Olas Restantes (Semanas 2-4)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className=\"grid gap-4\">
            {otherWaves.map((wave) => (
              <div key={wave.id} className=\"border rounded-lg p-4\">
                <div className=\"flex items-center justify-between mb-2\">
                  <h3 className=\"font-semibold\">{wave.name}</h3>
                  {getStatusBadge(wave.progress?.status || 'pending')}
                </div>
                
                <div className=\"grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600\">
                  <div>📍 {wave.cities.join(', ')}</div>
                  <div>🏢 {wave.districts.length || 'Todos'} distritos</div>
                  <div>🎯 {wave.maxBusinesses.toLocaleString()} negocios</div>
                  <div>⚡ {wave.estimatedCredits} créditos</div>
                </div>
                
                {wave.progress && (
                  <div className=\"mt-3\">
                    <Progress value={getProgressPercentage(wave)} className=\"h-2\" />
                    <div className=\"flex justify-between text-sm mt-1\">
                      <span>{wave.progress.businessesProcessed} procesados</span>
                      <span>{getProgressPercentage(wave)}%</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}