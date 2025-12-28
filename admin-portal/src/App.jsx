import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Users, Settings, Shield, Package, Mail, Send, MessageCircle,
  Phone, Calendar, DollarSign, AlertCircle, CheckCircle, XCircle,
  Clock, TrendingUp, User, Edit2, Trash2, Plus, X, Eye, EyeOff,
  Upload, File, Download, LogOut, Search, Filter, ChevronLeft,
  ChevronRight, FileText, BarChart3, Image as ImageIcon, Loader2,
  Wifi, RefreshCw, Bell
} from 'lucide-react';

const API_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

const UserAvatar = ({ user, size = 'md', onClick }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-24 h-24 text-2xl'
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold text-white ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''} ${!user.photo ? getAvatarColor(user.name) : ''}`}
      onClick={onClick}
      style={user.photo ? {
        backgroundImage: `url(${user.photo.startsWith('http') ? user.photo : API_URL + user.photo})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      } : {}}
    >
      {!user.photo && getInitials(user.name)}
    </div>
  );
};

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-lg border border-gray-200 ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

const Input = ({ label, error, ...props }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <input
      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${error ? 'border-red-500' : 'border-gray-300'}`}
      {...props}
    />
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
);

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
        
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
        
        <div className={`inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle ${sizeClasses[size]} w-full`}>
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">{title}</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="mt-2 max-h-[70vh] overflow-y-auto">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PhotoUpload = ({ currentPhoto, onPhotoChange }) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentPhoto);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Only JPG, PNG, GIF, WEBP files are allowed');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/api/upload/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const photoUrl = response.data.photo_url;
      setPreview(API_URL + photoUrl);
      onPhotoChange(photoUrl);
    } catch (error) {
      alert('Failed to upload photo: ' + (error.response?.data?.detail || error.message));
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!preview) return;
    
    try {
      await api.delete('/api/upload/photo', {
        params: { photo_url: currentPhoto }
      });
      setPreview(null);
      onPhotoChange(null);
    } catch (error) {
      console.error('Failed to delete photo:', error);
    }
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo</label>
      <div className="flex items-center space-x-4">
        <div className="relative">
          {preview ? (
            <img src={preview} alt="Preview" className="w-24 h-24 rounded-full object-cover border-2 border-gray-300" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-gray-400" />
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
        </div>
        <div className="flex flex-col space-y-2">
          <label className="px-4 py-2 bg-indigo-600 text-white rounded-lg cursor-pointer hover:bg-indigo-700 text-sm font-medium inline-flex items-center">
            <Upload className="w-4 h-4 mr-2" />
            Upload Photo
            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={uploading} />
          </label>
          {preview && (
            <button
              type="button"
              onClick={handleRemove}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
            >
              Remove
            </button>
          )}
          <p className="text-xs text-gray-500">Max 5MB, JPG/PNG/GIF</p>
        </div>
      </div>
    </div>
  );
};

const DocumentUpload = ({ currentDocuments = [], onDocumentsChange }) => {
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState(currentDocuments);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (files.length > 10) {
      alert('Maximum 10 files allowed');
      return;
    }

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} exceeds 10MB limit`);
        return;
      }
    }

    setUploading(true);
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    formData.append('document_types', files.map(() => 'General Document').join(','));

    try {
      const response = await api.post('/api/upload/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const newDocuments = [...documents, ...response.data.documents];
      setDocuments(newDocuments);
      onDocumentsChange(newDocuments);
    } catch (error) {
      alert('Failed to upload documents: ' + (error.response?.data?.detail || error.message));
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (doc) => {
    try {
      await api.delete(`/api/upload/document/${doc.id}`, {
        params: { document_url: doc.url }
      });
      const updatedDocs = documents.filter(d => d.id !== doc.id);
      setDocuments(updatedDocs);
      onDocumentsChange(updatedDocs);
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">Documents (Aadhaar, etc.)</label>
      
      <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-500 transition-colors">
        <div className="text-center">
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Click to upload documents</p>
          <p className="text-xs text-gray-500">Max 10 files, 10MB each</p>
        </div>
        <input
          type="file"
          className="hidden"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          onChange={handleFileChange}
          disabled={uploading}
        />
      </label>

      {uploading && (
        <div className="mt-2 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-indigo-600 animate-spin mr-2" />
          <span className="text-sm text-gray-600">Uploading...</span>
        </div>
      )}

      {documents.length > 0 && (
        <div className="mt-4 space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <File className="w-5 h-5 text-indigo-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                  <p className="text-xs text-gray-500">{doc.type} • {(doc.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <a  
                  href={API_URL + doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-800"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => handleRemove(doc)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ChangePasswordModal = ({ isOpen, onClose, onSuccess }) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/change-password', {
        old_password: oldPassword,
        new_password: newPassword
      });
      
      onSuccess();
      onClose();
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Change Password" size="sm">
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Old Password</label>
          <div className="relative">
            <input
              type={showOld ? 'text' : 'password'}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              required
            />
            <button
              type="button"
              onClick={() => setShowOld(!showOld)}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
            >
              {showOld ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
            >
              {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50"
          >
            {loading ? 'Changing...' : 'Change Password'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
};




const AvatarModal = ({ user, isOpen, onClose }) => {
  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={user.name} size="md">
      <div className="space-y-4">
        <div className="flex justify-center">
          <UserAvatar user={user} size="xl" />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Customer ID</p>
            <p className="text-lg font-semibold text-gray-900">{user.cs_id}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Status</p>
            <Badge variant={user.status === 'Active' ? 'success' : 'danger'}>{user.status}</Badge>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Phone</p>
            <p className="text-lg text-gray-900">{user.phone}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Email</p>
            <p className="text-sm text-gray-900 break-all">{user.email}</p>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">Address</p>
          <p className="text-gray-900">{user.address}</p>
        </div>

        <div className="flex space-x-2 pt-4">
          <a  
            href={`tel:${user.phone}`}
            className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Phone className="w-4 h-4 mr-2" />
            Call
          </a>
          <a  
            href={`https://wa.me/91${user.phone.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            WhatsApp
          </a>
        </div>
      </div>
    </Modal>
  );
};

const UserFormModal = ({ isOpen, onClose, user, plans, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    user_password: '',
    address: '',
    cs_id: '',
    photo: null,
    documents: [],
    status: 'Active',
    plan_start_date: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        email: user.email || '',
        user_password: '',
        address: user.address || '',
        cs_id: user.cs_id || '',
        photo: user.photo || null,
        documents: user.documents || [],
        status: user.status || 'Active',
        plan_start_date: user.plan_start_date || new Date().toISOString().split('T')[0]
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        email: '',
        user_password: '',
        address: '',
        cs_id: '',
        photo: null,
        documents: [],
        status: 'Active',
        plan_start_date: new Date().toISOString().split('T')[0]
      });
    }
    setErrors({});
  }, [user, isOpen]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: null });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) newErrors.phone = 'Invalid phone number';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email';
    if (!formData.cs_id.trim()) newErrors.cs_id = 'Customer ID is required';
    if (!user && !formData.user_password.trim()) newErrors.user_password = 'Password is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (user) {
        await api.put(`/api/users/${user.id}`, formData);
      } else {
        await api.post('/api/users', formData);
      }
      onSuccess();
      onClose();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={user ? 'Edit User' : 'Add New User'} size="lg">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Full Name *"
            name="name"
            value={formData.name}
            onChange={handleChange}
            error={errors.name}
          />
          
          <Input
            label="Customer ID *"
            name="cs_id"
            value={formData.cs_id}
            onChange={handleChange}
            error={errors.cs_id}
            disabled={!!user}
          />

          <Input
            label="Phone Number *"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            error={errors.phone}
            placeholder="10-digit number"
          />

          <Input
            label="Email Address *"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
          />

          <Input
            label={user ? "Password (leave blank to keep current)" : "Password *"}
            name="user_password"
            type="password"
            value={formData.user_password}
            onChange={handleChange}
            error={errors.user_password}
          />

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
              <option value="Churned">Churned</option>
              <option value="Expired">Expired</option>
            </select>
          </div>

          <Input
            label="Plan Start Date *"
            name="plan_start_date"
            type="date"
            value={formData.plan_start_date}
            onChange={handleChange}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            rows="2"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${errors.address ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.address && <p className="mt-1 text-xs text-red-500">{errors.address}</p>}
        </div>

        <PhotoUpload
          currentPhoto={formData.photo}
          onPhotoChange={(photo) => setFormData({ ...formData, photo })}
        />

        <DocumentUpload
          currentDocuments={formData.documents}
          onDocumentsChange={(docs) => setFormData({ ...formData, documents: docs })}
        />

        <div className="flex space-x-3 mt-6">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50"
          >
            {loading ? 'Saving...' : (user ? 'Update User' : 'Create User')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
};

const BillingAdjustmentModal = ({ isOpen, onClose, user, plans, onSuccess }) => {
  const [formData, setFormData] = useState({
    broadband_plan_id: '',
    payment_status: 'Pending',
    old_pending_amount: 0,
    payment_due_date: '',
    plan_start_date: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        broadband_plan_id: user.broadband_plan_id || '',
        payment_status: user.payment_status || 'Pending',
        old_pending_amount: user.old_pending_amount || 0,
        payment_due_date: user.payment_due_date === 'Paid' ? '' : (user.payment_due_date || ''),
        plan_start_date: user.plan_start_date || ''
      });
    }
  }, [user, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        payment_due_date: formData.payment_status === 'Pending' ? formData.payment_due_date : 'Paid'
      };

      await api.put(`/api/users/${user.id}/billing`, payload);
      onSuccess();
      onClose();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to update billing');
    } finally {
      setLoading(false);
    }
  };

  const selectedPlan = plans.find(p => p.id === formData.broadband_plan_id);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Billing Adjustment" size="md">
      <form onSubmit={handleSubmit}>
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm font-medium text-blue-900">Customer: {user?.name}</p>
          <p className="text-sm text-blue-700">CS ID: {user?.cs_id}</p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Broadband Plan</label>
          <select
            value={formData.broadband_plan_id}
            onChange={(e) => setFormData({ ...formData, broadband_plan_id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            required
          >
            <option value="">Select Plan</option>
            {plans.map(plan => (
              <option key={plan.id} value={plan.id}>
                {plan.name} - ₹{plan.price}/month ({plan.speed})
              </option>
            ))}
          </select>
        </div>

        {selectedPlan && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-900">Plan Details:</p>
            <p className="text-sm text-gray-600">Speed: {selectedPlan.speed}</p>
            <p className="text-sm text-gray-600">Price: ₹{selectedPlan.price}/month</p>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
          <select
            value={formData.payment_status}
            onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            required
          >
            <option value="Pending">⏳ Pending</option>
            <option value="VerifiedByCash">💵 Verified by Cash</option>
            <option value="VerifiedByUpi">📱 Verified by UPI</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Old Pending Amount (₹)</label>
          <input
            type="number"
            value={formData.old_pending_amount}
            onChange={(e) => setFormData({ ...formData, old_pending_amount: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            min="0"
          />
        </div>

        {formData.payment_status === 'Pending' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Due Date</label>
            <input
              type="date"
              value={formData.payment_due_date}
              onChange={(e) => setFormData({ ...formData, payment_due_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Plan Start Date</label>
          <input
            type="date"
            value={formData.plan_start_date}
            onChange={(e) => setFormData({ ...formData, plan_start_date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Billing Changes'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
};

const PlanRenewalModal = ({ isOpen, onClose, user, onSuccess }) => {
  const [months, setMonths] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleRenew = async () => {
    setLoading(true);
    try {
      await api.post(`/api/users/${user.id}/renew`, { months });
      onSuccess();
      onClose();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to renew plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Renew Plan" size="sm">
      <div className="space-y-4">
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm font-medium text-yellow-900">Customer: {user?.name}</p>
          <p className="text-sm text-yellow-700">Current Expiry: {user?.plan_expiry_date}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Renew for (months)</label>
          <select
            value={months}
            onChange={(e) => setMonths(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
              <option key={m} value={m}>{m} {m === 1 ? 'Month' : 'Months'}</option>
            ))}
          </select>
        </div>

        <div className="p-3 bg-green-50 rounded-lg">
          <p className="text-sm font-medium text-green-900">After renewal:</p>
          <p className="text-sm text-green-700">
            Plan will be extended by {months} {months === 1 ? 'month' : 'months'}
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleRenew}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
          >
            {loading ? 'Renewing...' : 'Renew Plan'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
};

const PlanFormModal = ({ isOpen, onClose, plan, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    speed: '',
    data_limit: '',
    commitment: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name || '',
        price: plan.price || '',
        speed: plan.speed || '',
        data_limit: plan.data_limit || '',
        commitment: plan.commitment || ''
      });
    } else {
      setFormData({
        name: '',
        price: '',
        speed: '',
        data_limit: '',
        commitment: ''
      });
    }
  }, [plan, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (plan) {
        await api.put(`/api/plans/${plan.id}`, formData);
      } else {
        await api.post('/api/plans', formData);
      }
      onSuccess();
      onClose();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to save plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={plan ? 'Edit Plan' : 'Add New Plan'} size="md">
      <form onSubmit={handleSubmit}>
        <Input
          label="Plan Name *"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />

        <Input
          label="Monthly Price (₹) *"
          type="number"
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
          required
          min="0"
        />

        <Input
          label="Speed *"
          value={formData.speed}
          onChange={(e) => setFormData({ ...formData, speed: e.target.value })}
          placeholder="e.g., 100 Mbps"
          required
        />

        <Input
          label="Data Limit *"
          value={formData.data_limit}
          onChange={(e) => setFormData({ ...formData, data_limit: e.target.value })}
          placeholder="e.g., Unlimited"
          required
        />

        <Input
          label="Commitment *"
          value={formData.commitment}
          onChange={(e) => setFormData({ ...formData, commitment: e.target.value })}
          placeholder="e.g., 6 Months"
          required
        />

        <div className="flex space-x-3 mt-6">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50"
          >
            {loading ? 'Saving...' : (plan ? 'Update Plan' : 'Create Plan')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
};






const DashboardOverview = ({ users, plans }) => {
  const stats = {
    totalUsers: users.length,
    pendingPayments: users.filter(u => u.payment_status === 'Pending').length,
    monthlyRevenue: users
      .filter(u => u.payment_status === 'VerifiedByCash' || u.payment_status === 'VerifiedByUpi')
      .reduce((sum, u) => {
        const plan = plans.find(p => p.id === u.broadband_plan_id);
        return sum + (plan?.price || 0);
      }, 0),
    totalPendingCollection: users
      .filter(u => u.payment_status === 'Pending')
      .reduce((sum, u) => {
        const plan = plans.find(p => p.id === u.broadband_plan_id);
        return sum + (plan?.price || 0) + (u.old_pending_amount || 0);
      }, 0),
    totalOldDebt: users.reduce((sum, u) => sum + (u.old_pending_amount || 0), 0)
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Dashboard Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalUsers}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Pending Payments</p>
              <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.pendingPayments}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Monthly Revenue</p>
              <p className="text-3xl font-bold text-green-600 mt-1">₹{stats.monthlyRevenue.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Pending Collection</p>
              <p className="text-3xl font-bold text-red-600 mt-1">₹{stats.totalPendingCollection.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Old Debt</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">₹{stats.totalOldDebt.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {users.slice(0, 5).map(user => {
              const plan = plans.find(p => p.id === user.broadband_plan_id);
              return (
                <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <UserAvatar user={user} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{plan?.name || 'No Plan'}</p>
                    </div>
                  </div>
                  <Badge variant={user.payment_status === 'Pending' ? 'warning' : 'success'}>
                    {user.payment_status}
                  </Badge>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Available Plans</h3>
          <div className="space-y-3">
            {plans.slice(0, 5).map(plan => (
              <div key={plan.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{plan.name}</p>
                  <p className="text-xs text-gray-500">{plan.speed} • {plan.data_limit}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-indigo-600">₹{plan.price}</p>
                  <p className="text-xs text-gray-500">/month</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

const EditableAmountCell = ({ value, userId, onUpdate }) => {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(value);

  const handleSave = async () => {
    try {
      await api.put(`/api/users/${userId}/old-pending`, {
        old_pending_amount: parseInt(amount) || 0
      });
      onUpdate();
      setEditing(false);
    } catch (error) {
      alert('Failed to update amount');
    }
  };

  if (editing) {
    return (
      <div className="flex items-center space-x-1">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-20 px-2 py-1 text-sm border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500"
          min="0"
        />
        <button onClick={handleSave} className="text-green-600 hover:text-green-800">
          <CheckCircle className="w-4 h-4" />
        </button>
        <button onClick={() => { setEditing(false); setAmount(value); }} className="text-red-600 hover:text-red-800">
          <XCircle className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setEditing(true)}>
      <span className="text-sm font-medium text-gray-900">₹{value}</span>
      <Edit2 className="w-3 h-3 text-gray-400 hover:text-indigo-600" />
    </div>
  );
};

const UsersTab = ({ users, plans, setUsers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [billingModalOpen, setBillingModalOpen] = useState(false);
  const [renewalModalOpen, setRenewalModalOpen] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const itemsPerPage = 10;

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone.includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.cs_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = paymentFilter === 'All' || user.payment_status === paymentFilter;
    
    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const fetchUsers = async () => {
    try {
      const response = await api.get('/api/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await api.delete(`/api/users/${userId}`);
      fetchUsers();
    } catch (error) {
      alert('Failed to delete user');
    }
  };

  const handleGenerateInvoice = async (userId) => {
    try {
      const response = await api.post(`/api/invoice/generate/${userId}`, {}, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${userId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Failed to generate invoice');
    }
  };

  const handleExportUsers = async () => {
    try {
      const response = await api.get('/api/export/users', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `users_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Failed to export users');
    }
  };

  const getPaymentStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return <Badge variant="warning">⏳ Pending</Badge>;
      case 'VerifiedByCash':
        return <Badge variant="success">💵 Cash</Badge>;
      case 'VerifiedByUpi':
        return <Badge variant="info">📱 UPI</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getExpiryBadge = (user) => {
    if (!user.is_plan_active) {
      return <Badge variant="danger">Expired</Badge>;
    }

    if (!user.plan_expiry_date) {
      return <Badge variant="info">Active</Badge>;
    }

    const today = new Date();
    const expiry = new Date(user.plan_expiry_date);
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry <= 0) {
      return <Badge variant="danger">Expired</Badge>;
    } else if (daysUntilExpiry <= 7) {
      return <Badge variant="warning">Expires in {daysUntilExpiry}d</Badge>;
    } else {
      return <Badge variant="success">Active</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
        <div className="flex space-x-2">
          <button 
            onClick={handleExportUsers}
            className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center hover:bg-green-700 shadow-sm transition-all text-sm"
          >
            <FileText className="w-4 h-4 mr-2" /> Export Excel
          </button>
          <button 
            onClick={() => { setSelectedUser(null); setModalOpen(true); }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center hover:bg-indigo-700 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 mr-2" /> Add User
          </button>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, phone, email, CS ID, or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="All">All Payments</option>
              <option value="Pending">Pending</option>
              <option value="VerifiedByCash">Verified (Cash)</option>
              <option value="VerifiedByUpi">Verified (UPI)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">Payment</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">Old Pending</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedUsers.map((user) => {
                const plan = plans.find(p => p.id === user.broadband_plan_id);
                return (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-3">
                        <UserAvatar 
                          user={user} 
                          size="md" 
                          onClick={() => { setSelectedUser(user); setAvatarModalOpen(true); }}
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-500">CS: {user.cs_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-900">{user.phone}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{plan?.name || 'N/A'}</p>
                      <p className="text-xs text-gray-500">₹{plan?.price || 0}/mo</p>
                    </td>
                    <td className="px-4 py-3">
                      {getPaymentStatusBadge(user.payment_status)}
                    </td>
                    <td className="px-4 py-3">
                      <EditableAmountCell 
                        value={user.old_pending_amount || 0}
                        userId={user.id}
                        onUpdate={fetchUsers}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {getExpiryBadge(user)}
                      {!user.is_plan_active && (
                        <button
                          onClick={() => { setSelectedUser(user); setRenewalModalOpen(true); }}
                          className="ml-2 text-xs font-bold text-green-600 hover:text-green-800 border border-green-300 hover:border-green-500 px-2 py-1 rounded transition-all"
                        >
                          RENEW
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center space-x-1">
                        <button 
                          onClick={() => { setSelectedUser(user); setModalOpen(true); }}
                          className="text-indigo-600 hover:text-indigo-800 text-[10px] font-bold border border-indigo-200 hover:border-indigo-400 px-2 py-1 rounded transition-all"
                          title="Edit User"
                        >
                          EDIT
                        </button>
                        <button 
                          onClick={() => { setSelectedUser(user); setBillingModalOpen(true); }}
                          className="text-blue-600 hover:text-blue-800 text-[10px] font-bold border border-blue-200 hover:border-blue-400 px-2 py-1 rounded transition-all"
                          title="Update Billing"
                        >
                          BILLING
                        </button>
                        <button 
                          onClick={() => handleGenerateInvoice(user.id)}
                          className="text-purple-600 hover:text-purple-800 text-[10px] font-bold border border-purple-200 hover:border-purple-400 px-2 py-1 rounded transition-all"
                          title="Generate Invoice"
                        >
                          INVOICE
                        </button>
                        <button 
                          onClick={() => handleDelete(user.id)}
                          className="text-red-600 hover:text-red-800 text-[10px] font-bold border border-red-200 hover:border-red-400 px-2 py-1 rounded transition-all"
                          title="Delete User"
                        >
                          DELETE
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
            <p className="text-sm text-gray-500">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-4 py-1 border border-gray-300 rounded-lg bg-white">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      <UserFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        user={selectedUser}
        plans={plans}
        onSuccess={fetchUsers}
      />

      <BillingAdjustmentModal
        isOpen={billingModalOpen}
        onClose={() => setBillingModalOpen(false)}
        user={selectedUser}
        plans={plans}
        onSuccess={fetchUsers}
      />

      <PlanRenewalModal
        isOpen={renewalModalOpen}
        onClose={() => setRenewalModalOpen(false)}
        user={selectedUser}
        onSuccess={fetchUsers}
      />

      <AvatarModal
        isOpen={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
        user={selectedUser}
      />
    </div>
  );
};

const PlansTab = ({ plans, setPlans }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const fetchPlans = async () => {
    try {
      const response = await api.get('/api/plans');
      setPlans(response.data);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    }
  };

  const handleDelete = async (planId) => {
    if (!window.confirm('Are you sure you want to delete this plan?')) return;

    try {
      await api.delete(`/api/plans/${planId}`);
      fetchPlans();
    } catch (error) {
      alert('Failed to delete plan');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Broadband Plans & Pricing</h2>
        <button 
          onClick={() => { setSelectedPlan(null); setModalOpen(true); }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center hover:bg-indigo-700 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4 mr-2" /> Add New Plan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card key={plan.id} className="p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-indigo-100 rounded-lg">
                <Package className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => { setSelectedPlan(plan); setModalOpen(true); }}
                  className="text-indigo-600 hover:text-indigo-800"
                  title="Edit Plan"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(plan.id)}
                  className="text-red-600 hover:text-red-800"
                  title="Delete Plan"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
            
            <div className="mb-4">
              <span className="text-3xl font-bold text-indigo-600">₹{plan.price}</span>
              <span className="text-gray-500 text-sm">/month</span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center text-gray-600">
                <TrendingUp className="w-4 h-4 mr-2 text-green-500" />
                <span><strong>Speed:</strong> {plan.speed}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <DollarSign className="w-4 h-4 mr-2 text-blue-500" />
                <span><strong>Data:</strong> {plan.data_limit}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <Calendar className="w-4 h-4 mr-2 text-purple-500" />
                <span><strong>Commitment:</strong> {plan.commitment}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <PlanFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        plan={selectedPlan}
        onSuccess={fetchPlans}
      />
    </div>
  );
};

const NotificationsTab = () => {
  const [testing, setTesting] = useState(false);
  const [sending, setSending] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [result, setResult] = useState(null);

  const handleTestEmail = async () => {
    if (!testEmail) {
      alert('Please enter an email address');
      return;
    }

    setTesting(true);
    try {
      await api.post('/api/notifications/test-email', null, {
        params: { email: testEmail }
      });
      alert('✅ Test email sent successfully!');
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to send test email');
    } finally {
      setTesting(false);
    }
  };

  const handleSendAllNotifications = async () => {
    if (!window.confirm('Send all pending notifications now?')) {
      return;
    }

    setSending(true);
    try {
      const response = await api.post('/api/notifications/send-all');
      setResult(response.data.results);
      alert('✅ Notifications sent successfully!');
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to send notifications');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">📧 Email Notification Management</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">🧪 Test Email Service</h3>
          <p className="text-sm text-gray-600 mb-4">
            Send a test email to verify SMTP configuration
          </p>
          <div className="flex space-x-2">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Enter test email address"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <button
              onClick={handleTestEmail}
              disabled={testing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              {testing ? 'Sending...' : 'Send Test'}
            </button>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">📤 Send All Notifications</h3>
          <p className="text-sm text-gray-600 mb-4">
            Manually trigger all pending notifications
          </p>
          <button
            onClick={handleSendAllNotifications}
            disabled={sending}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
          >
            {sending ? 'Sending...' : '📧 Send All Notifications Now'}
          </button>
        </Card>
      </div>

      {result && (
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Notification Results</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm font-medium text-yellow-800">Plan Expiry Warnings</p>
              <p className="text-2xl font-bold text-yellow-900">
                {result.expiry_warnings?.sent || 0}
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-800">Payment Reminders</p>
              <p className="text-2xl font-bold text-blue-900">
                {result.payment_reminders?.sent || 0}
              </p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm font-medium text-red-800">Expired Notifications</p>
              <p className="text-2xl font-bold text-red-900">
                {result.expired_notifications?.sent || 0}
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <h3 className="text-lg font-bold text-gray-800 mb-3">⚙️ Notification Schedule</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-center">
            <Clock className="w-4 h-4 mr-2 text-indigo-600" />
            <strong>10:00 AM Daily:</strong> Automatic notifications sent
          </li>
          <li className="flex items-center">
            <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
            <strong>Plan Expiry:</strong> 24 hours before expiration
          </li>
          <li className="flex items-center">
            <DollarSign className="w-4 h-4 mr-2 text-blue-600" />
            <strong>Payment Due:</strong> 24 hours before due date
          </li>
        </ul>
      </Card>
    </div>
  );
};

const AdminPortalContent = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');

  useEffect(() => {
    fetchData();
    fetchAdminInfo();
  }, []);

  const fetchAdminInfo = async () => {
    try {
      const response = await api.get('/api/auth/me');
      setAdminEmail(response.data.email);
    } catch (error) {
      console.error('Failed to fetch admin info:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, plansRes] = await Promise.all([
        api.get('/api/users'),
        api.get('/api/plans')
      ]);
      setUsers(usersRes.data);
      setPlans(plansRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      if (error.response?.status === 401) {
        onLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'dashboard', name: 'Dashboard Overview', icon: BarChart3 },
    { id: 'users', name: 'User Management', icon: Users },
    { id: 'plans', name: 'Plans & Pricing', icon: Package },
    { id: 'notifications', name: 'Email Notifications', icon: Mail },
  ];

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview users={users} plans={plans} />;
      case 'users':
        return <UsersTab users={users} plans={plans} setUsers={setUsers} />;
      case 'plans':
        return <PlansTab plans={plans} setPlans={setPlans} />;
      case 'notifications':
        return <NotificationsTab />;
      default:
        return <DashboardOverview users={users} plans={plans} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-600 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">4You Broadband</h1>
                <p className="text-sm text-gray-500">ISP Management Portal</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{adminEmail}</p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>
              <button
                onClick={() => setPasswordModalOpen(true)}
                className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Change Password"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={onLogout}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </div>

      <ChangePasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        onSuccess={() => alert('Password changed successfully!')}
      />
    </div>
  );
};

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    try {
      const formData = new URLSearchParams();
      formData.append('username', loginForm.email);
      formData.append('password', loginForm.password);

      const response = await api.post('/api/admin/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      
      localStorage.setItem('admin_token', response.data.access_token);
      setIsAuthenticated(true);
    } catch (error) {
      setLoginError(error.response?.data?.detail || 'Invalid credentials');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setIsAuthenticated(false);
    setLoginForm({ email: '', password: '' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700">
        <Loader2 className="w-12 h-12 text-white animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700 p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="inline-block p-3 bg-indigo-100 rounded-full mb-4">
              <Shield className="w-12 h-12 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">4You Broadband</h1>
            <p className="text-gray-500 mt-2">ISP Management Portal</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {loginError}
              </div>
            )}

            <Input
              label="Email Address"
              type="email"
              value={loginForm.email}
              onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
              required
              placeholder="admin@4you.in"
            />

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors"
            >
              Sign In
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Admin credentials from .env file</p>
          </div>
        </Card>
      </div>
    );
  }

  return <AdminPortalContent onLogout={handleLogout} />;
};

export default App;
