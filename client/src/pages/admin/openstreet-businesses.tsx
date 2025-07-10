import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useDebounce } from '@/hooks/use-debounce';
import AdminNav from '@/components/admin/AdminNav';
import { 
  Search, Filter, ChevronDown, ChevronUp, MoreVertical,
  Download, Trash2, Edit, Eye, Star, MapPin, Phone,
  Globe, CheckCircle, XCircle, AlertCircle, RefreshCw,
  ChevronLeft, ChevronRight, Settings, ArrowUpDown,
  Map, Building, Accessibility, Clock
} from 'lucide-react';

// Types
interface OpenStreetBusiness {
  id: number;
  osmId: string;
  osmType?: string;
  name: string;
  amenity?: string;
  shop?: string;
  address?: string;
  houseNumber?: string;
  street?: string;
  city?: string;
  district?: string;
  postcode?: string;
  phone?: string;
  website?: string;
  email?: string;
  openingHours?: string;
  latitude?: string;
  longitude?: string;
  operator?: string;
  brand?: string;
  cuisine?: string;
  wheelchair?: string;
  category?: string;
  subcategory?: string;
  tags?: any;
  createdAt: string;
  updatedAt: string;
}

interface FilterState {
  search: string;
  category: string;
  amenity: string;
  district: string;
  hasPhone: string;
  hasWebsite: string;
  wheelchair: string;
  osmType: string;
}

interface SortState {
  field: string;
  direction: 'asc' | 'desc';
}

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

export default function AdminOpenStreetBusinesses() {
  const [, setLocation] = useLocation();
  
  // Data state
  const [businesses, setBusinesses] = useState<OpenStreetBusiness[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: '',
    amenity: '',
    district: '',
    hasPhone: '',
    hasWebsite: '',
    wheelchair: '',
    osmType: ''
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Sort state
  const [sort, setSort] = useState<SortState>({
    field: 'createdAt',
    direction: 'desc'
  });
  
  // UI state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<OpenStreetBusiness | null>(null);
  
  // Options for filters
  const [filterOptions, setFilterOptions] = useState<{
    categories: string[];
    amenities: string[];
    districts: string[];
    osmTypes: string[];
  }>({
    categories: [],
    amenities: [],
    districts: [],
    osmTypes: []
  });
  
  // Debounced search value
  const debouncedSearch = useDebounce(filters.search, 500);
  
  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      setLocation('/admin/login');
    }
  }, [setLocation]);
  
  // Fetch filter options
  useEffect(() => {
    fetchFilterOptions();
  }, []);
  
  // Fetch businesses when filters, pagination, or sort changes
  useEffect(() => {
    fetchBusinesses();
  }, [debouncedSearch, filters.category, filters.amenity, filters.district, 
      filters.hasPhone, filters.hasWebsite, filters.wheelchair, filters.osmType,
      currentPage, itemsPerPage, sort]);
  
  const fetchFilterOptions = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/openstreet/filter-options', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch filter options');
      
      const data = await response.json();
      setFilterOptions(data);
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };
  
  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        sortField: sort.field,
        sortDirection: sort.direction
      });
      
      // Add filters
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (filters.category) params.append('category', filters.category);
      if (filters.amenity) params.append('amenity', filters.amenity);
      if (filters.district) params.append('district', filters.district);
      if (filters.hasPhone) params.append('hasPhone', filters.hasPhone);
      if (filters.hasWebsite) params.append('hasWebsite', filters.hasWebsite);
      if (filters.wheelchair) params.append('wheelchair', filters.wheelchair);
      if (filters.osmType) params.append('osmType', filters.osmType);
      
      const response = await fetch(`/api/admin/openstreet/businesses?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch businesses');
      
      const data = await response.json();
      setBusinesses(data.businesses || []);
      setTotalCount(data.total || 0);
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
      console.error('Error fetching businesses:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Handlers
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };
  
  const handleSort = (field: string) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(businesses.map(b => b.id)));
    } else {
      setSelectedIds(new Set());
    }
  };
  
  const handleSelectOne = (id: number, checked: boolean) => {
    const newSelectedIds = new Set(selectedIds);
    if (checked) {
      newSelectedIds.add(id);
    } else {
      newSelectedIds.delete(id);
    }
    setSelectedIds(newSelectedIds);
  };
  
  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} selected businesses?`)) return;
    
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/openstreet/businesses/bulk', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });
      
      if (!response.ok) throw new Error('Failed to delete businesses');
      
      setSelectedIds(new Set());
      fetchBusinesses();
    } catch (error) {
      console.error('Error deleting businesses:', error);
      alert('Failed to delete businesses');
    }
  };
  
  const handleExport = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams();
      
      // Add current filters to export
      if (filters.search) params.append('search', filters.search);
      if (filters.category) params.append('category', filters.category);
      if (filters.amenity) params.append('amenity', filters.amenity);
      if (filters.district) params.append('district', filters.district);
      
      if (selectedIds.size > 0) {
        params.append('ids', Array.from(selectedIds).join(','));
      }
      
      const response = await fetch(`/api/admin/openstreet/businesses/export?${params}&format=csv`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to export');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `openstreet-businesses-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Failed to export businesses');
    }
  };
  
  // Calculated values
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalCount);
  
  const getOsmTypeIcon = (type?: string) => {
    switch(type) {
      case 'node': return '📍';
      case 'way': return '🛤️';
      case 'relation': return '🔗';
      default: return '📍';
    }
  };
  
  const getWheelchairBadge = (wheelchair?: string) => {
    switch(wheelchair) {
      case 'yes': return { color: 'bg-green-100 text-green-800', text: 'Accessible' };
      case 'limited': return { color: 'bg-yellow-100 text-yellow-800', text: 'Limited' };
      case 'no': return { color: 'bg-red-100 text-red-800', text: 'Not Accessible' };
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNav />
      
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">OpenStreet Business Management</h1>
          <p className="mt-2 text-gray-600">
            Manage businesses from OpenStreetMap data source
          </p>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Map className="h-10 w-10 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total OpenStreet</p>
                <p className="text-2xl font-semibold text-gray-900">{totalCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Phone className="h-10 w-10 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">With Phone</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {businesses.filter(b => b.phone).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Globe className="h-10 w-10 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">With Website</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {businesses.filter(b => b.website).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Accessibility className="h-10 w-10 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Accessible</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {businesses.filter(b => b.wheelchair === 'yes').length}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Actions Bar */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              {/* Search */}
              <div className="w-full sm:w-96">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Search by name, address, or OSM ID..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-4 py-2 rounded-md flex items-center gap-2 ${
                    showFilters ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                  } hover:bg-gray-200`}
                >
                  <Filter className="h-4 w-4" />
                  Filters
                  {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                
                {selectedIds.size > 0 && (
                  <>
                    <button
                      onClick={handleBulkDelete}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete ({selectedIds.size})
                    </button>
                  </>
                )}
                
                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export
                </button>
                
                <button
                  onClick={fetchBusinesses}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
                >
                  <RefreshCw className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={filters.category}
                      onChange={(e) => handleFilterChange('category', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Categories</option>
                      {filterOptions.categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amenity Type
                    </label>
                    <select
                      value={filters.amenity}
                      onChange={(e) => handleFilterChange('amenity', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Amenities</option>
                      {filterOptions.amenities.map(amenity => (
                        <option key={amenity} value={amenity}>{amenity}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      District
                    </label>
                    <select
                      value={filters.district}
                      onChange={(e) => handleFilterChange('district', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Districts</option>
                      {filterOptions.districts.map(district => (
                        <option key={district} value={district}>{district}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      OSM Type
                    </label>
                    <select
                      value={filters.osmType}
                      onChange={(e) => handleFilterChange('osmType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Types</option>
                      {filterOptions.osmTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Has Phone
                    </label>
                    <select
                      value={filters.hasPhone}
                      onChange={(e) => handleFilterChange('hasPhone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Has Website
                    </label>
                    <select
                      value={filters.hasWebsite}
                      onChange={(e) => handleFilterChange('hasWebsite', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Wheelchair Access
                    </label>
                    <select
                      value={filters.wheelchair}
                      onChange={(e) => handleFilterChange('wheelchair', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All</option>
                      <option value="yes">Accessible</option>
                      <option value="limited">Limited</option>
                      <option value="no">Not Accessible</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="mt-2 text-gray-600">Loading businesses...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
              <p className="mt-2 text-red-600">{error}</p>
            </div>
          ) : businesses.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600">No businesses found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === businesses.length && businesses.length > 0}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center gap-1">
                          Business Info
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type & Access
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('createdAt')}
                      >
                        <div className="flex items-center gap-1">
                          Added
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {businesses.map((business) => {
                      const wheelchairBadge = getWheelchairBadge(business.wheelchair);
                      
                      return (
                        <tr key={business.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(business.id)}
                              onChange={(e) => handleSelectOne(business.id, e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{getOsmTypeIcon(business.osmType)}</span>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {business.name || 'Unnamed Business'}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    OSM ID: {business.osmId}
                                  </p>
                                </div>
                              </div>
                              <div className="mt-1 flex items-center gap-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  OpenStreet
                                </span>
                                {business.amenity && (
                                  <span className="text-xs text-gray-500">{business.amenity}</span>
                                )}
                                {business.shop && (
                                  <span className="text-xs text-gray-500">{business.shop}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="text-gray-900">
                              {business.address || business.street || 'No address'}
                            </div>
                            {business.district && (
                              <div className="text-xs text-gray-500">{business.district}</div>
                            )}
                            {business.city && (
                              <div className="text-xs text-gray-500">{business.city}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="space-y-1">
                              {business.phone && (
                                <div className="flex items-center gap-1 text-gray-600">
                                  <Phone className="h-3 w-3" />
                                  <span className="text-xs">{business.phone}</span>
                                </div>
                              )}
                              {business.website && (
                                <div className="flex items-center gap-1 text-gray-600">
                                  <Globe className="h-3 w-3" />
                                  <span className="text-xs truncate max-w-[150px]">{business.website}</span>
                                </div>
                              )}
                              {business.openingHours && (
                                <div className="flex items-center gap-1 text-gray-600">
                                  <Clock className="h-3 w-3" />
                                  <span className="text-xs">Hours available</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="space-y-1">
                              <span className="text-xs text-gray-500">
                                {business.category || 'No category'}
                              </span>
                              {wheelchairBadge && (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${wheelchairBadge.color}`}>
                                  <Accessibility className="h-3 w-3 mr-1" />
                                  {wheelchairBadge.text}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(business.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => window.open(`https://www.openstreetmap.org/${business.osmType}/${business.osmId}`, '_blank')}
                                className="text-gray-400 hover:text-gray-600"
                                title="View on OpenStreetMap"
                              >
                                <Map className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setEditingBusiness(business)}
                                className="text-gray-400 hover:text-gray-600"
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {startIndex} to {endIndex} of {totalCount} businesses
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                    >
                      {ITEMS_PER_PAGE_OPTIONS.map(option => (
                        <option key={option} value={option}>{option} per page</option>
                      ))}
                    </select>
                    
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className={`p-2 rounded-md ${
                          currentPage === 1 
                            ? 'text-gray-300 cursor-not-allowed' 
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      
                      <span className="px-4 py-2 text-sm text-gray-600">
                        Page {currentPage} of {totalPages}
                      </span>
                      
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className={`p-2 rounded-md ${
                          currentPage === totalPages 
                            ? 'text-gray-300 cursor-not-allowed' 
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}