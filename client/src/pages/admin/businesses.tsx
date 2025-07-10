import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useDebounce } from '@/hooks/use-debounce';
import AdminNav from '@/components/admin/AdminNav';
import BusinessForm from '@/components/admin/BusinessForm';
import { 
  Search, Filter, ChevronDown, ChevronUp, MoreVertical,
  Download, Trash2, Edit, Eye, Star, MapPin, Phone,
  Globe, CheckCircle, XCircle, AlertCircle, RefreshCw,
  ChevronLeft, ChevronRight, Settings, ArrowUpDown
} from 'lucide-react';

// Types
interface Business {
  id: number;
  placeId: string;
  name: string;
  address: string;
  category: string;
  subcategory?: string;
  phone?: string;
  website?: string;
  email?: string;
  rating: string | number;
  reviewCount: number;
  qualityScore: number;
  verifiedStatus: string;
  businessStatus: string;
  district?: string;
  createdAt: string;
  lastUpdated: string;
  isActive?: boolean;
}

interface FilterState {
  search: string;
  category: string;
  subcategory: string;
  status: string;
  minRating: string;
  maxRating: string;
  minReviews: string;
  maxReviews: string;
  district: string;
  isActive: string;
}

interface SortState {
  field: string;
  direction: 'asc' | 'desc';
}

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

export default function AdminBusinesses() {
  const [, setLocation] = useLocation();
  
  // Data state
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: '',
    subcategory: '',
    status: '',
    minRating: '',
    maxRating: '',
    minReviews: '',
    maxReviews: '',
    district: '',
    isActive: ''
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
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Options for filters
  const [filterOptions, setFilterOptions] = useState<{
    categories: string[];
    subcategories: { [key: string]: string[] };
    statuses: string[];
    districts: string[];
  }>({
    categories: [],
    subcategories: {},
    statuses: [],
    districts: []
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
  }, [debouncedSearch, filters.category, filters.subcategory, filters.status, 
      filters.minRating, filters.maxRating, filters.minReviews, filters.maxReviews,
      filters.district, filters.isActive, currentPage, itemsPerPage, sort]);
  
  const fetchFilterOptions = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/v2/businesses/filter-options', {
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
      if (filters.subcategory) params.append('subcategory', filters.subcategory);
      if (filters.status) params.append('status', filters.status);
      if (filters.minRating) params.append('minRating', filters.minRating);
      if (filters.maxRating) params.append('maxRating', filters.maxRating);
      if (filters.minReviews) params.append('minReviews', filters.minReviews);
      if (filters.maxReviews) params.append('maxReviews', filters.maxReviews);
      if (filters.district) params.append('district', filters.district);
      if (filters.isActive) params.append('isActive', filters.isActive);
      
      const response = await fetch(`/api/admin/v2/businesses?${params}`, {
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
    
    // Clear subcategory when category changes
    if (key === 'category') {
      setFilters(prev => ({ ...prev, subcategory: '' }));
    }
  };
  
  const handleSort = (field: string) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };
  
  const handleSelectAll = () => {
    if (selectedIds.size === businesses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(businesses.map(b => b.id)));
    }
  };
  
  const handleSelect = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };
  
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} businesses? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/v2/businesses/bulk', {
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
      alert('Failed to delete businesses. Please try again.');
    }
  };
  
  const handleBulkUpdate = async (updates: Partial<Business>) => {
    if (selectedIds.size === 0) return;
    
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/v2/businesses/bulk', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          ids: Array.from(selectedIds),
          updates 
        })
      });
      
      if (!response.ok) throw new Error('Failed to update businesses');
      
      setSelectedIds(new Set());
      fetchBusinesses();
    } catch (error) {
      console.error('Error updating businesses:', error);
      alert('Failed to update businesses. Please try again.');
    }
  };
  
  const handleExport = async (format: 'csv' | 'json' = 'csv') => {
    try {
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({ format });
      
      // Add current filters to export
      if (filters.search) params.append('search', filters.search);
      if (filters.category) params.append('category', filters.category);
      if (filters.subcategory) params.append('subcategory', filters.subcategory);
      if (filters.status) params.append('status', filters.status);
      if (selectedIds.size > 0) {
        params.append('ids', Array.from(selectedIds).join(','));
      }
      
      const response = await fetch(`/api/admin/v2/businesses/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to export businesses');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `businesses-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting businesses:', error);
      alert('Failed to export businesses. Please try again.');
    }
  };
  
  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      subcategory: '',
      status: '',
      minRating: '',
      maxRating: '',
      minReviews: '',
      maxReviews: '',
      district: '',
      isActive: ''
    });
    setSort({ field: 'createdAt', direction: 'desc' });
    setCurrentPage(1);
  };
  
  // Computed values
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const hasActiveFilters = Object.values(filters).some(v => v !== '');
  
  const subcategoryOptions = filters.category 
    ? filterOptions.subcategories[filters.category] || [] 
    : [];
  
  // Helper functions
  const formatRating = (rating: string | number) => {
    const val = typeof rating === 'string' ? parseFloat(rating) : rating;
    return isNaN(val) ? '0.0' : val.toFixed(1);
  };
  
  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: any }> = {
      verified: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      unverified: { color: 'bg-gray-100 text-gray-800', icon: XCircle },
      claimed: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      unclaimed: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle }
    };
    
    const badge = badges[status] || badges.unverified;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {status}
      </span>
    );
  };
  
  const getQualityBadge = (score: number) => {
    let color = 'bg-red-100 text-red-800';
    if (score >= 80) color = 'bg-green-100 text-green-800';
    else if (score >= 60) color = 'bg-yellow-100 text-yellow-800';
    else if (score >= 40) color = 'bg-orange-100 text-orange-800';
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        {score}%
      </span>
    );
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Business Management</h1>
                <p className="mt-1 text-sm text-gray-500">
                  {totalCount.toLocaleString()} total businesses
                  {hasActiveFilters && ' (filtered)'}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => fetchBusinesses()}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </button>
                
                <button
                  onClick={() => handleExport('csv')}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </button>
                
                <button
                  onClick={() => setIsCreating(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Add Business
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6">
            {/* Search Bar */}
            <div className="flex gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Search businesses by name, address, phone..."
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center px-4 py-2 border rounded-lg font-medium ${
                  showFilters || hasActiveFilters
                    ? 'border-blue-500 text-blue-700 bg-blue-50'
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                }`}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
                {hasActiveFilters && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white">
                    {Object.values(filters).filter(v => v !== '').length}
                  </span>
                )}
                {showFilters ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
              </button>
            </div>
            
            {/* Filter Panel */}
            {showFilters && (
              <div className="border-t pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={filters.category}
                      onChange={(e) => handleFilterChange('category', e.target.value)}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Categories</option>
                      {filterOptions.categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Subcategory */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subcategory
                    </label>
                    <select
                      value={filters.subcategory}
                      onChange={(e) => handleFilterChange('subcategory', e.target.value)}
                      disabled={!filters.category}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    >
                      <option value="">All Subcategories</option>
                      {subcategoryOptions.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={filters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Statuses</option>
                      {filterOptions.statuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* District */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      District
                    </label>
                    <select
                      value={filters.district}
                      onChange={(e) => handleFilterChange('district', e.target.value)}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Districts</option>
                      {filterOptions.districts.map(district => (
                        <option key={district} value={district}>{district}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Rating Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rating Range
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        value={filters.minRating}
                        onChange={(e) => handleFilterChange('minRating', e.target.value)}
                        placeholder="Min"
                        className="w-1/2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                      <input
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        value={filters.maxRating}
                        onChange={(e) => handleFilterChange('maxRating', e.target.value)}
                        placeholder="Max"
                        className="w-1/2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  {/* Review Count Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Review Count
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        value={filters.minReviews}
                        onChange={(e) => handleFilterChange('minReviews', e.target.value)}
                        placeholder="Min"
                        className="w-1/2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                      <input
                        type="number"
                        min="0"
                        value={filters.maxReviews}
                        onChange={(e) => handleFilterChange('maxReviews', e.target.value)}
                        placeholder="Max"
                        className="w-1/2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  {/* Active Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Active Status
                    </label>
                    <select
                      value={filters.isActive}
                      onChange={(e) => handleFilterChange('isActive', e.target.value)}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All</option>
                      <option value="true">Active Only</option>
                      <option value="false">Inactive Only</option>
                    </select>
                  </div>
                </div>
                
                {/* Filter Actions */}
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={clearFilters}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Clear all filters
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-800">
                {selectedIds.size} businesses selected
              </span>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleBulkUpdate({ verifiedStatus: 'verified' })}
                  className="text-sm px-3 py-1 bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Mark Verified
                </button>
                <button
                  onClick={() => handleBulkUpdate({ isActive: false })}
                  className="text-sm px-3 py-1 bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Deactivate
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="text-sm px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete Selected
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-sm px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading businesses...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-600">{error}</p>
              <button
                onClick={fetchBusinesses}
                className="mt-4 text-blue-600 hover:text-blue-800"
              >
                Try Again
              </button>
            </div>
          ) : businesses.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600">No businesses found</p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-4 text-blue-600 hover:text-blue-800"
                >
                  Clear Filters
                </button>
              )}
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
                          checked={selectedIds.size === businesses.length}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center gap-1">
                          Business
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('category')}
                      >
                        <div className="flex items-center gap-1">
                          Category
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('rating')}
                      >
                        <div className="flex items-center gap-1">
                          Rating
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('qualityScore')}
                      >
                        <div className="flex items-center gap-1">
                          Quality
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {businesses.map((business) => (
                      <tr key={business.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(business.id)}
                            onChange={() => handleSelect(business.id)}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">{business.name}</div>
                            <div className="text-gray-500 flex items-center mt-1">
                              <MapPin className="w-3 h-3 mr-1" />
                              {business.address}
                            </div>
                            {business.district && (
                              <div className="text-xs text-gray-400 mt-1">
                                {business.district}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {business.category}
                            </span>
                            {business.subcategory && (
                              <div className="text-xs text-gray-500 mt-1">
                                {business.subcategory}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm space-y-1">
                            {business.phone && (
                              <div className="flex items-center text-gray-600">
                                <Phone className="w-3 h-3 mr-1" />
                                {business.phone}
                              </div>
                            )}
                            {business.website && (
                              <div className="flex items-center text-gray-600">
                                <Globe className="w-3 h-3 mr-1" />
                                <a 
                                  href={business.website} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="hover:text-blue-600"
                                >
                                  Website
                                </a>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-sm">
                            <Star className="w-4 h-4 text-yellow-400 mr-1" />
                            <span className="font-medium">{formatRating(business.rating)}</span>
                            <span className="text-gray-500 ml-1">({business.reviewCount})</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {getQualityBadge(business.qualityScore)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {getStatusBadge(business.verifiedStatus)}
                            {business.isActive === false && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Inactive
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => window.open(`/business/${business.id}`, '_blank')}
                              className="text-gray-400 hover:text-gray-600"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingBusiness(business)}
                              className="text-gray-400 hover:text-gray-600"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm('Are you sure you want to delete this business?')) {
                                  try {
                                    const token = localStorage.getItem('adminToken');
                                    const response = await fetch(`/api/admin/v2/businesses/${business.id}`, {
                                      method: 'DELETE',
                                      headers: {
                                        'Authorization': `Bearer ${token}`
                                      }
                                    });
                                    
                                    if (response.ok) {
                                      fetchBusinesses();
                                    }
                                  } catch (error) {
                                    console.error('Error deleting business:', error);
                                  }
                                }
                              }}
                              className="text-gray-400 hover:text-red-600"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-gray-700">
                      Showing{' '}
                      <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
                      {' '}to{' '}
                      <span className="font-medium">
                        {Math.min(currentPage * itemsPerPage, totalCount)}
                      </span>
                      {' '}of{' '}
                      <span className="font-medium">{totalCount}</span>
                      {' '}results
                    </p>
                    
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-700">Show</label>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="border-gray-300 rounded-md text-sm"
                      >
                        {ITEMS_PER_PAGE_OPTIONS.map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                      <span className="text-sm text-gray-700">per page</span>
                    </div>
                  </div>
                  
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      
                      {/* Page numbers */}
                      {(() => {
                        const pages = [];
                        const maxVisible = 5;
                        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                        let end = Math.min(totalPages, start + maxVisible - 1);
                        
                        if (end - start + 1 < maxVisible) {
                          start = Math.max(1, end - maxVisible + 1);
                        }
                        
                        if (start > 1) {
                          pages.push(
                            <button
                              key={1}
                              onClick={() => setCurrentPage(1)}
                              className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                              1
                            </button>
                          );
                          if (start > 2) {
                            pages.push(
                              <span key="dots1" className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                ...
                              </span>
                            );
                          }
                        }
                        
                        for (let i = start; i <= end; i++) {
                          pages.push(
                            <button
                              key={i}
                              onClick={() => setCurrentPage(i)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                i === currentPage
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {i}
                            </button>
                          );
                        }
                        
                        if (end < totalPages) {
                          if (end < totalPages - 1) {
                            pages.push(
                              <span key="dots2" className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                ...
                              </span>
                            );
                          }
                          pages.push(
                            <button
                              key={totalPages}
                              onClick={() => setCurrentPage(totalPages)}
                              className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                              {totalPages}
                            </button>
                          );
                        }
                        
                        return pages;
                      })()}
                      
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Business Form Modal */}
      {(editingBusiness || isCreating) && (
        <BusinessForm
          business={editingBusiness || undefined}
          isOpen={true}
          onClose={() => {
            setEditingBusiness(null);
            setIsCreating(false);
          }}
          onSave={() => {
            setEditingBusiness(null);
            setIsCreating(false);
            fetchBusinesses();
          }}
        />
      )}
    </div>
  );
}