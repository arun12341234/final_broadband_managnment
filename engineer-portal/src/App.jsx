import React, { useState, useEffect } from 'react';
import api from './api';
import {
  Wrench, LogOut, Plus, User, Phone, MapPin, Package, CheckCircle,
  Clock, Loader, AlertTriangle, X, Upload, FileText, Camera,
  Calendar, Home, ClipboardList, RefreshCw, Search, Filter,
  ChevronRight, Info, Wifi, Mail
} from 'lucide-react';

// ============================================
// UTILITY COMPONENTS
// ============================================

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = 'primary', disabled = false, className = '', type = 'button' }) => {
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const Badge = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
};

const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <X className="w-5 h-5 text-red-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />
  };

  return (
    <div className={`toast toast-${type}`}>
      <div className="flex items-center gap-3">
        {icons[type]}
        <p className="flex-1 text-sm text-gray-700">{message}</p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-12">
    <Loader className="w-8 h-8 text-blue-600 animate-spin" />
  </div>
);

const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="text-center py-12">
    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
      <Icon className="w-8 h-8 text-gray-400" />
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600 mb-6">{description}</p>
    {action}
  </div>
);

// ============================================
// MAIN APP COMPONENT
// ============================================

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [toast, setToast] = useState(null);
  const [engineer, setEngineer] = useState(null);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('engineer_token');
    if (token) {
      setIsAuthenticated(true);
      fetchEngineerData();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchEngineerData = async () => {
    try {
      const [profileRes, tasksRes] = await Promise.all([
        api.get('/api/engineer/me'),
        api.get('/api/engineer/tasks')
      ]);

      setEngineer(profileRes.data);
      setTasks(tasksRes.data.tasks || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const handleLogin = async (mobile, password) => {
    try {
      const response = await api.post('/api/engineer/login', { mobile, password });
      localStorage.setItem('engineer_token', response.data.access_token);
      setIsAuthenticated(true);
      await fetchEngineerData();
      showToast('Login successful!', 'success');
    } catch (error) {
      showToast(error.response?.data?.detail || 'Login failed', 'error');
      throw error;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('engineer_token');
    setIsAuthenticated(false);
    setEngineer(null);
    setTasks([]);
    setActiveTab('home');
  };

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Wrench className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">4You Broadband</h1>
                <p className="text-xs text-gray-500">Engineer Portal</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-red-600 hover:text-red-700"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'home'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Home className="w-4 h-4 inline mr-2" />
              Home
            </button>
            <button
              onClick={() => setActiveTab('add-customer')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'add-customer'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Add Customer
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'tasks'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <ClipboardList className="w-4 h-4 inline mr-2" />
              Tasks ({tasks.length})
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'home' && (
          <HomeTab engineer={engineer} tasks={tasks} onRefresh={fetchEngineerData} />
        )}
        {activeTab === 'add-customer' && (
          <AddCustomerTab showToast={showToast} onSuccess={fetchEngineerData} />
        )}
        {activeTab === 'tasks' && (
          <TasksTab tasks={tasks} onRefresh={fetchEngineerData} showToast={showToast} />
        )}
      </main>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

// ============================================
// LOGIN SCREEN
// ============================================

const LoginScreen = ({ onLogin }) => {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onLogin(mobile, password);
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Wrench className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">4You Broadband</h2>
          <p className="text-gray-600 mt-2">Engineer Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="label">Mobile Number</label>
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="input"
              placeholder="9876543210"
              maxLength="10"
              required
            />
          </div>

          <div>
            <label className="label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader className="w-4 h-4 animate-spin" />
                Logging in...
              </span>
            ) : (
              'Login'
            )}
          </Button>
        </form>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900 font-medium mb-2">📝 Demo Credentials:</p>
          <p className="text-xs text-blue-800">Mobile: 9876543210</p>
          <p className="text-xs text-blue-800">Password: ravi123</p>
          <p className="text-xs text-blue-700 mt-2">
            (Created via migrate_add_engineers.py)
          </p>
        </div>
      </Card>
    </div>
  );
};

// ============================================
// HOME TAB
// ============================================

const HomeTab = ({ engineer, tasks, onRefresh }) => {
  const pendingTasks = tasks.filter(t => t.status === 'Pending Installation');
  const scheduledTasks = tasks.filter(t => t.status === 'Installation Scheduled');
  const completedTasks = tasks.filter(t => t.status === 'Completed');

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Welcome, {engineer.name}! 👋</h2>
            <p className="mt-2 text-blue-100">
              {engineer.specialization || 'Field Engineer'}
            </p>
            <div className="mt-4 flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                {engineer.mobile}
              </div>
              {engineer.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {engineer.email}
                </div>
              )}
            </div>
          </div>
          <div className="hidden md:block">
            <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Wrench className="w-12 h-12" />
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-3xl font-bold text-yellow-600">{pendingTasks.length}</p>
            </div>
            <Clock className="w-12 h-12 text-yellow-600 opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Scheduled</p>
              <p className="text-3xl font-bold text-blue-600">{scheduledTasks.length}</p>
            </div>
            <Calendar className="w-12 h-12 text-blue-600 opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-3xl font-bold text-green-600">{completedTasks.length}</p>
            </div>
            <CheckCircle className="w-12 h-12 text-green-600 opacity-20" />
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-left transition-colors">
            <Plus className="w-6 h-6 text-blue-600 mb-2" />
            <p className="font-medium text-gray-900">Add New Customer</p>
            <p className="text-sm text-gray-600">Register new connection</p>
          </button>
          <button onClick={onRefresh} className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-left transition-colors">
            <RefreshCw className="w-6 h-6 text-green-600 mb-2" />
            <p className="font-medium text-gray-900">Refresh Tasks</p>
            <p className="text-sm text-gray-600">Get latest updates</p>
          </button>
        </div>
      </Card>

      {/* Recent Tasks */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Tasks</h3>
        {tasks.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No tasks yet"
            description="New installation tasks will appear here"
          />
        ) : (
          <div className="space-y-3">
            {tasks.slice(0, 5).map((task) => (
              <div key={task.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <User className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{task.name}</p>
                      <p className="text-sm text-gray-500">{task.mobile}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {task.address}
                  </p>
                </div>
                <Badge variant={
                  task.status === 'Completed' ? 'success' :
                  task.status === 'Installation Scheduled' ? 'info' : 'warning'
                }>
                  {task.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

// ============================================
// ADD CUSTOMER TAB - CONTINUED IN NEXT MESSAGE
// ============================================

// ============================================
// ADD CUSTOMER TAB
// ============================================

const AddCustomerTab = ({ showToast, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    address: '',
    plan: '',
    password: ''
  });
  const [userPhoto, setUserPhoto] = useState(null);
  const [kycDocument, setKycDocument] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [docPreview, setDocPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('Photo size must be less than 5MB', 'error');
        return;
      }
      setUserPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleDocChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showToast('Document size must be less than 10MB', 'error');
        return;
      }
      setKycDocument(file);
      setDocPreview(file.name);
    }
  };

  const generatePassword = () => {
    const password = Math.random().toString(36).slice(-8);
    setFormData({ ...formData, password });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('mobile', formData.mobile);
      submitData.append('address', formData.address);
      submitData.append('plan', formData.plan);
      submitData.append('password', formData.password);
      
      if (userPhoto) {
        submitData.append('user_photo', userPhoto);
      }
      if (kycDocument) {
        submitData.append('kyc_document', kycDocument);
      }

      const response = await api.post('/api/engineer/add-customer', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      showToast(response.data.message, 'success');
      
      // Reset form
      setFormData({
        name: '',
        mobile: '',
        address: '',
        plan: '',
        password: ''
      });
      setUserPhoto(null);
      setKycDocument(null);
      setPhotoPreview(null);
      setDocPreview(null);

      if (onSuccess) onSuccess();
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to add customer', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Add New Customer</h2>
          <p className="text-gray-600 mt-1">Register a new broadband connection</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="input"
                  placeholder="Rajesh Kumar"
                  required
                />
              </div>

              <div>
                <label className="label">Mobile Number *</label>
                <input
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  className="input"
                  placeholder="9876543210"
                  maxLength="10"
                  pattern="[0-9]{10}"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="label">Complete Address *</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows="3"
                  className="input"
                  placeholder="House no., Street, Area, Pincode"
                  required
                />
              </div>
            </div>
          </div>

          {/* Plan Selection */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Plan Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Select Plan *</label>
                <select
                  name="plan"
                  value={formData.plan}
                  onChange={handleChange}
                  className="input"
                  required
                >
                  <option value="">Choose a plan</option>
                  <option value="Basic 50 Mbps">Basic 50 Mbps - ₹500/month</option>
                  <option value="Standard 100 Mbps">Standard 100 Mbps - ₹800/month</option>
                  <option value="Premium 300 Mbps">Premium 300 Mbps - ₹1200/month</option>
                  <option value="Ultra 500 Mbps">Ultra 500 Mbps - ₹2000/month</option>
                </select>
              </div>

              <div>
                <label className="label">Login Password *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="input"
                    placeholder="Customer portal password"
                    required
                  />
                  <Button type="button" variant="outline" onClick={generatePassword}>
                    Generate
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Customer will use this to login to customer portal
                </p>
              </div>
            </div>
          </div>

          {/* Photo Upload */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-600" />
              Customer Photo
            </h3>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <label className="block">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      {userPhoto ? userPhoto.name : 'Click to upload photo'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Max size: 5MB</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              </div>
              {photoPreview && (
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setUserPhoto(null);
                      setPhotoPreview(null);
                    }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Document Upload */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              KYC Document
            </h3>
            <label className="block">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  {docPreview || 'Upload Aadhaar / ID Proof'}
                </p>
                <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG (Max: 10MB)</p>
              </div>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleDocChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Important Notes:</p>
                <ul className="space-y-1 text-xs">
                  <li>• All fields marked with * are mandatory</li>
                  <li>• Ensure mobile number is correct (used for login)</li>
                  <li>• Photo and documents help in verification</li>
                  <li>• Customer will receive login credentials after approval</li>
                  <li>• Installation will be marked as "Pending" after submission</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setFormData({
                  name: '',
                  mobile: '',
                  address: '',
                  plan: '',
                  password: ''
                });
                setUserPhoto(null);
                setKycDocument(null);
                setPhotoPreview(null);
                setDocPreview(null);
              }}
              className="flex-1"
            >
              Reset Form
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader className="w-4 h-4 animate-spin" />
                  Adding Customer...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Customer
                </span>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

// ============================================
// TASKS TAB
// ============================================

const TasksTab = ({ tasks, onRefresh, showToast }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedTask, setSelectedTask] = useState(null);

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = 
      task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.mobile.includes(searchTerm) ||
      task.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filterStatus === 'all' ||
      (filterStatus === 'pending' && task.status === 'Pending Installation') ||
      (filterStatus === 'scheduled' && task.status === 'Installation Scheduled') ||
      (filterStatus === 'completed' && task.status === 'Completed');
    
    return matchesSearch && matchesFilter;
  });

  const handleUpdateStatus = async (taskId, newStatus) => {
    if (!window.confirm(`Update task status to "${newStatus}"?`)) return;

    try {
      const formData = new FormData();
      formData.append('status', newStatus);

      await api.put(`/api/engineer/update-task/${taskId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      showToast('Task updated successfully!', 'success');
      onRefresh();
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to update task', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Installation Tasks</h2>
          <p className="text-gray-600 mt-1">{tasks.length} total tasks</p>
        </div>
        <Button onClick={onRefresh}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, mobile, or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                filterStatus === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({tasks.length})
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                filterStatus === 'pending'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending ({tasks.filter(t => t.status === 'Pending Installation').length})
            </button>
            <button
              onClick={() => setFilterStatus('scheduled')}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                filterStatus === 'scheduled'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Scheduled ({tasks.filter(t => t.status === 'Installation Scheduled').length})
            </button>
            <button
              onClick={() => setFilterStatus('completed')}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                filterStatus === 'completed'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Completed ({tasks.filter(t => t.status === 'Completed').length})
            </button>
          </div>
        </div>
      </Card>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <Card className="p-12">
          <EmptyState
            icon={ClipboardList}
            title="No tasks found"
            description={searchTerm ? "Try adjusting your search" : "New installation tasks will appear here"}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTasks.map((task) => (
            <Card key={task.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{task.name}</h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {task.mobile}
                    </p>
                  </div>
                </div>
                <Badge variant={
                  task.status === 'Completed' ? 'success' :
                  task.status === 'Installation Scheduled' ? 'info' : 'warning'
                }>
                  {task.status}
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-2 text-sm text-gray-700">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">{task.address}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Wifi className="w-4 h-4 text-gray-400" />
                  <span>{task.plan}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  <span>Added: {task.created_at}</span>
                </div>
              </div>

              {/* Action Buttons */}
              {task.status !== 'Completed' && (
                <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
                  {task.status === 'Pending Installation' && (
                    <Button
                      onClick={() => handleUpdateStatus(task.id, 'Installation Scheduled')}
                      variant="outline"
                      className="flex-1 text-sm"
                    >
                      <Calendar className="w-4 h-4 mr-1" />
                      Schedule
                    </Button>
                  )}
                  <Button
                    onClick={() => handleUpdateStatus(task.id, 'Completed')}
                    variant="success"
                    className="flex-1 text-sm"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Complete
                  </Button>
                </div>
              )}

              {task.status === 'Completed' && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium">Installation Completed</span>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Summary Card */}
      {filteredTasks.length > 0 && (
        <Card className="p-6 bg-blue-50 border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-3">Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-blue-700">Total Tasks</p>
              <p className="text-2xl font-bold text-blue-900">{filteredTasks.length}</p>
            </div>
            <div>
              <p className="text-yellow-700">Pending</p>
              <p className="text-2xl font-bold text-yellow-900">
                {filteredTasks.filter(t => t.status === 'Pending Installation').length}
              </p>
            </div>
            <div>
              <p className="text-blue-700">Scheduled</p>
              <p className="text-2xl font-bold text-blue-900">
                {filteredTasks.filter(t => t.status === 'Installation Scheduled').length}
              </p>
            </div>
            <div>
              <p className="text-green-700">Completed</p>
              <p className="text-2xl font-bold text-green-900">
                {filteredTasks.filter(t => t.status === 'Completed').length}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

// ============================================
// EXPORT DEFAULT
// ============================================

export default App;
