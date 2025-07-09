import { useState, useEffect } from 'react';
import { X, Save, MapPin, Phone, Globe, Star, Tag, Building } from 'lucide-react';

interface Business {
  id?: number;
  name: string;
  address: string;
  category: string;
  phone?: string;
  website?: string;
  rating: number;
  reviewCount: number;
  priceLevel: number;
  description?: string;
  latitude: number;
  longitude: number;
  verifiedStatus: string;
  businessStatus: string;
  qualityScore?: number;
  dataFreshnessScore?: number;
  phoneFormatted?: string;
  coordinatesValidated?: boolean;
}

interface BusinessFormProps {
  business?: Business | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (business: Business) => void;
}

export default function BusinessForm({ business, isOpen, onClose, onSave }: BusinessFormProps) {
  const [formData, setFormData] = useState<Business>({
    name: '',
    address: '',
    category: 'servicios',
    phone: '',
    website: '',
    rating: 0,
    reviewCount: 0,
    priceLevel: 0,
    description: '',
    latitude: -12.0464,
    longitude: -77.0428,
    verifiedStatus: 'unverified',
    businessStatus: 'unknown'
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const categories = [
    { value: 'belleza', label: 'Belleza' },
    { value: 'fitness', label: 'Fitness' },
    { value: 'gastronomia', label: 'Gastronomía' },
    { value: 'salud', label: 'Salud' },
    { value: 'automotriz', label: 'Automotriz' },
    { value: 'servicios', label: 'Servicios' }
  ];

  const verificationStatuses = [
    { value: 'unverified', label: 'Unverified' },
    { value: 'scraped', label: 'Scraped' },
    { value: 'verified', label: 'Verified' },
    { value: 'claimed', label: 'Claimed' }
  ];

  const businessStatuses = [
    { value: 'unknown', label: 'Unknown' },
    { value: 'operational', label: 'Operational' },
    { value: 'temporarily_closed', label: 'Temporarily Closed' },
    { value: 'permanently_closed', label: 'Permanently Closed' }
  ];

  useEffect(() => {
    if (business) {
      setFormData({
        ...business,
        phone: business.phone || '',
        website: business.website || '',
        description: business.description || ''
      });
    } else {
      setFormData({
        name: '',
        address: '',
        category: 'servicios',
        phone: '',
        website: '',
        rating: 0,
        reviewCount: 0,
        priceLevel: 0,
        description: '',
        latitude: -12.0464,
        longitude: -77.0428,
        verifiedStatus: 'unverified',
        businessStatus: 'unknown'
      });
    }
    setErrors({});
  }, [business, isOpen]);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Business name is required';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    if (formData.rating < 0 || formData.rating > 5) {
      newErrors.rating = 'Rating must be between 0 and 5';
    }

    if (formData.reviewCount < 0) {
      newErrors.reviewCount = 'Review count cannot be negative';
    }

    if (formData.priceLevel < 0 || formData.priceLevel > 4) {
      newErrors.priceLevel = 'Price level must be between 0 and 4';
    }

    if (formData.latitude < -18.5 || formData.latitude > 0) {
      newErrors.latitude = 'Latitude must be valid for Peru';
    }

    if (formData.longitude < -82 || formData.longitude > -68) {
      newErrors.longitude = 'Longitude must be valid for Peru';
    }

    if (formData.website && !formData.website.match(/^https?:\/\/.+/)) {
      newErrors.website = 'Website must be a valid URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      const token = localStorage.getItem('adminToken');
      const url = business?.id 
        ? `/api/admin/businesses/${business.id}`
        : '/api/admin/businesses';
      
      const method = business?.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const savedBusiness = await response.json();
        onSave(savedBusiness);
        onClose();
      } else {
        const errorData = await response.json();
        setErrors({ general: errorData.error || 'Failed to save business' });
      }
    } catch (error) {
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof Business, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {business?.id ? 'Edit Business' : 'Add New Business'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {errors.general && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {errors.general}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Building className="w-5 h-5 mr-2" />
                Basic Information
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter business name"
                />
                {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter business description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  Address *
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  rows={2}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.address ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter full address"
                />
                {errors.address && <p className="text-red-600 text-sm mt-1">{errors.address}</p>}
              </div>
            </div>

            {/* Contact and Location */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Phone className="w-5 h-5 mr-2" />
                Contact & Location
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+51 999 999 999"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Globe className="w-4 h-4 mr-1" />
                  Website
                </label>
                <input
                  type="url"
                  value={formData.website || ''}
                  onChange={(e) => handleChange('website', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.website ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="https://example.com"
                />
                {errors.website && <p className="text-red-600 text-sm mt-1">{errors.website}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.latitude}
                    onChange={(e) => handleChange('latitude', parseFloat(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.latitude ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.latitude && <p className="text-red-600 text-sm mt-1">{errors.latitude}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.longitude}
                    onChange={(e) => handleChange('longitude', parseFloat(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.longitude ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.longitude && <p className="text-red-600 text-sm mt-1">{errors.longitude}</p>}
                </div>
              </div>
            </div>

            {/* Business Metrics */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Star className="w-5 h-5 mr-2" />
                Business Metrics
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rating (0-5)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={formData.rating}
                    onChange={(e) => handleChange('rating', parseFloat(e.target.value) || 0)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.rating ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.rating && <p className="text-red-600 text-sm mt-1">{errors.rating}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Review Count
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.reviewCount}
                    onChange={(e) => handleChange('reviewCount', parseInt(e.target.value) || 0)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.reviewCount ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.reviewCount && <p className="text-red-600 text-sm mt-1">{errors.reviewCount}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price Level (0-4)
                </label>
                <select
                  value={formData.priceLevel}
                  onChange={(e) => handleChange('priceLevel', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={0}>Free / Unknown</option>
                  <option value={1}>$ (Inexpensive)</option>
                  <option value={2}>$$ (Moderate)</option>
                  <option value={3}>$$$ (Expensive)</option>
                  <option value={4}>$$$$ (Very Expensive)</option>
                </select>
              </div>
            </div>

            {/* Status Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Tag className="w-5 h-5 mr-2" />
                Status Information
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Verification Status
                </label>
                <select
                  value={formData.verifiedStatus}
                  onChange={(e) => handleChange('verifiedStatus', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {verificationStatuses.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Status
                </label>
                <select
                  value={formData.businessStatus}
                  onChange={(e) => handleChange('businessStatus', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {businessStatuses.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              {business?.id && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quality Score
                    </label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-600">
                      {business.qualityScore || 0}%
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data Freshness
                    </label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-600">
                      {business.dataFreshnessScore || 0}%
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {business?.id ? 'Update Business' : 'Create Business'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}