import React, { useState, useEffect, useMemo } from 'react';
import api from './api';
import {
  Wrench, LogOut, Plus, User, Phone, MapPin, Package, CheckCircle,
  Clock, Loader, AlertTriangle, X, Upload, FileText, Camera,
  Calendar, Home, ClipboardList, RefreshCw, Search, Filter,
  ChevronRight, Info, Wifi, Mail, ChevronLeft
} from 'lucide-react';

// Import utilities
import { getErrorMessage, formatDate, formatDateTime, formatCurrency, formatPhone, generateSecurePassword, isDevelopment } from './utils/helpers';
import { validatePhone, validateEmail, validatePassword, validateName, validateAddress, validatePhotoFile, validateDocumentFile } from './utils/validation';
import { TOAST, FILE_UPLOAD, PAGINATION, TASK_STATUS } from './utils/constants';
import { useDebounce } from './hooks/useDebounce';

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
    const duration = TOAST[`${type.toUpperCase()}_DURATION`] || TOAST.SUCCESS_DURATION;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, type]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <X className="w-5 h-5 text-red-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />
  };

  // Defense layer: Ensure message is always a string
  const safeMessage = typeof message === 'string' ? message : getErrorMessage(message);

  return (
    <div className={`toast toast-${type}`}>
      <div className="flex items-center gap-3">
        {icons[type]}
        <p className="flex-1 text-sm text-gray-700">{safeMessage}</p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close notification">
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
// CONFIRM DIALOG COMPONENT
// ============================================

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'danger' }) => {
  if (!isOpen) return null;

  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="relative inline-block px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="sm:flex sm:items-start">
            <div className={`flex items-center justify-center flex-shrink-0 w-12 h-12 mx-auto rounded-full sm:mx-0 sm:h-10 sm:w-10 ${
              variant === 'danger' ? 'bg-red-100' : 'bg-blue-100'
            }`}>
              <AlertTriangle className={`w-6 h-6 ${variant === 'danger' ? 'text-red-600' : 'text-blue-600'}`} />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
              <h3 className="text-lg font-medium leading-6 text-gray-900">{title}</h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">{message}</p>
              </div>
            </div>
          </div>
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-2">
            <Button
              type="button"
              variant={variant}
              onClick={handleConfirm}
              className="w-full sm:w-auto"
            >
              {confirmText}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="w-full sm:w-auto mt-3 sm:mt-0"
            >
              {cancelText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

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
  const [plans, setPlans] = useState([]);

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
      const [profileRes, tasksRes, plansRes] = await Promise.allSettled([
        api.get('/api/engineer/me'),
        api.get('/api/engineer/tasks'),
        api.get('/api/plans')
      ]);

      if (profileRes.status === 'fulfilled') setEngineer(profileRes.value.data);
      if (tasksRes.status === 'fulfilled') setTasks(tasksRes.value.data.tasks || []);
      if (plansRes.status === 'fulfilled') setPlans(plansRes.value.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast(getErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    // Defense layer 1: Convert error objects to strings
    const safeMessage = typeof message === 'string' ? message : getErrorMessage(message);
    setToast({ message: safeMessage, type });
  };

  const handleLogin = async (mobile, password) => {
    try {
      const response = await api.post('/api/engineer/login', { mobile, password });
      localStorage.setItem('engineer_token', response.data.access_token);
      setIsAuthenticated(true);
      await fetchEngineerData();
      showToast('Login successful!', 'success');
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
      throw error;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('engineer_token');
    setIsAuthenticated(false);
    setEngineer(null);
    setTasks([]);
    setPlans([]);
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
              className="flex items-center gap-2 text-red-600 hover:text-red-700 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
              aria-label="Logout"
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
              aria-label="Go to Home"
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
              aria-label="Go to Add Customer"
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
              aria-label={`Go to Tasks (${tasks.length} tasks)`}
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
          <HomeTab engineer={engineer} tasks={tasks} onRefresh={fetchEngineerData} setActiveTab={setActiveTab} />
        )}
        {activeTab === 'add-customer' && (
          <AddCustomerTab showToast={showToast} onSuccess={fetchEngineerData} plans={plans} />
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

    // Validate mobile
    const mobileValidation = validatePhone(mobile);
    if (!mobileValidation.valid) {
      setError(mobileValidation.error);
      return;
    }

    setLoading(true);

    try {
      await onLogin(mobile, password);
    } catch (err) {
      setError(getErrorMessage(err));
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
              pattern="[0-9]{10}"
              title="Please enter a valid 10-digit mobile number"
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
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
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

        {/* Only show demo credentials in development */}
        {isDevelopment() && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900 font-medium mb-2">📝 Demo Credentials:</p>
            <p className="text-xs text-blue-800">Mobile: 9876543210</p>
            <p className="text-xs text-blue-800">Password: ravi123</p>
            <p className="text-xs text-blue-700 mt-2">
              (Created via migrate_add_engineers.py)
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

// ============================================
// HOME TAB
// ============================================

const HomeTab = ({ engineer, tasks, onRefresh, setActiveTab }) => {
  const pendingTasks = tasks.filter(t => t.status === TASK_STATUS.PENDING);
  const scheduledTasks = tasks.filter(t => t.status === TASK_STATUS.SCHEDULED);
  const completedTasks = tasks.filter(t => t.status === TASK_STATUS.COMPLETED);

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
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                {formatPhone(engineer.mobile)}
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
          <button
            onClick={() => setActiveTab('add-customer')}
            className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-left transition-colors"
            aria-label="Add New Customer"
          >
            <Plus className="w-6 h-6 text-blue-600 mb-2" />
            <p className="font-medium text-gray-900">Add New Customer</p>
            <p className="text-sm text-gray-600">Register new connection</p>
          </button>
          <button
            onClick={onRefresh}
            className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-left transition-colors"
            aria-label="Refresh Tasks"
          >
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
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <User className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{task.name}</p>
                      <p className="text-sm text-gray-500">{formatPhone(task.mobile)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{task.address}</span>
                  </p>
                </div>
                <Badge variant={
                  task.status === TASK_STATUS.COMPLETED ? 'success' :
                  task.status === TASK_STATUS.SCHEDULED ? 'info' : 'warning'
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

// File is too long, continuing in next write...

// ============================================
// ADD CUSTOMER TAB
// ============================================

const AddCustomerTab = ({ showToast, onSuccess, plans }) => {
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
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
    if (!file) return;

    // Validate file
    const validation = validatePhotoFile(file);
    if (!validation.valid) {
      showToast(validation.error, 'error');
      return;
    }

    setUserPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleDocChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file
    const validation = validateDocumentFile(file);
    if (!validation.valid) {
      showToast(validation.error, 'error');
      return;
    }

    setKycDocument(file);
    setDocPreview(file.name);
  };

  const handleGeneratePassword = () => {
    const password = generateSecurePassword(12);
    setFormData({ ...formData, password });
    showToast('Secure password generated!', 'success');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all fields
    const nameValidation = validateName(formData.name);
    if (!nameValidation.valid) {
      showToast(nameValidation.error, 'error');
      return;
    }

    const mobileValidation = validatePhone(formData.mobile);
    if (!mobileValidation.valid) {
      showToast(mobileValidation.error, 'error');
      return;
    }

    if (formData.email) {
      const emailValidation = validateEmail(formData.email);
      if (!emailValidation.valid) {
        showToast(emailValidation.error, 'error');
        return;
      }
    }

    const addressValidation = validateAddress(formData.address);
    if (!addressValidation.valid) {
      showToast(addressValidation.error, 'error');
      return;
    }

    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.valid) {
      showToast(passwordValidation.error, 'error');
      return;
    }

    setLoading(true);

    try {
      const submitData = new FormData();
      submitData.append('name', formData.name.trim());
      submitData.append('mobile', formData.mobile);
      submitData.append('address', formData.address.trim());
      submitData.append('plan', formData.plan);
      submitData.append('password', formData.password);
      
      if (formData.email) {
        submitData.append('email', formData.email.trim());
      }

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

      const customerId = response.data.customer_id || 'N/A';
      showToast(`Customer added successfully! Customer ID: ${customerId}`, 'success');
      
      // Reset form
      setFormData({
        name: '',
        mobile: '',
        email: '',
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
      showToast(getErrorMessage(error), 'error');
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
                  minLength="2"
                  maxLength="100"
                  title="Name must be between 2 and 100 characters"
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
                  title="Please enter a valid 10-digit mobile number"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="label">Email (Optional)</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input"
                  placeholder="rajesh@example.com"
                  maxLength="100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Email for notifications and updates
                </p>
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
                  maxLength="500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.address.length}/500 characters
                </p>
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
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.name}>
                      {plan.name} - {formatCurrency(plan.price)}/month
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Plans are fetched from the backend
                </p>
              </div>

              <div>
                <label className="label">Login Password *</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="input"
                    placeholder="Customer portal password"
                    minLength="6"
                    maxLength="50"
                    title="Password must be at least 6 characters"
                    required
                  />
                  <Button type="button" variant="outline" onClick={handleGeneratePassword}>
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
              Customer Photo (Optional)
            </h3>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <label className="block">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      {userPhoto ? userPhoto.name : 'Click to upload photo'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      JPG, PNG, WebP (Max: 5MB)
                    </p>
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
                    aria-label="Remove photo"
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
              KYC Document (Optional)
            </h3>
            <div className="flex items-center gap-4">
              <label className="block flex-1">
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
              {kycDocument && (
                <button
                  type="button"
                  onClick={() => {
                    setKycDocument(null);
                    setDocPreview(null);
                  }}
                  className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 flex-shrink-0"
                  aria-label="Remove document"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
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
                  <li>• Strong password recommended for security</li>
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
                  email: '',
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

// Continuing with TasksTab in next command due to length...

// ============================================
// TASKS TAB
// ============================================

const TasksTab = ({ tasks, onRefresh, showToast }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date_newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  // Debounced search
  const debouncedSearchTerm = useDebounce(searchTerm);

  // Filter, sort, and paginate tasks
  const { filteredTasks, paginatedTasks, totalPages } = useMemo(() => {
    let filtered = [...tasks];

    // Search filter
    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(task =>
        task.name.toLowerCase().includes(term) ||
        task.mobile.includes(term) ||
        task.address.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (filterStatus === 'pending') {
      filtered = filtered.filter(t => t.status === TASK_STATUS.PENDING);
    } else if (filterStatus === 'scheduled') {
      filtered = filtered.filter(t => t.status === TASK_STATUS.SCHEDULED);
    } else if (filterStatus === 'completed') {
      filtered = filtered.filter(t => t.status === TASK_STATUS.COMPLETED);
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date_newest':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'date_oldest':
          return new Date(a.created_at) - new Date(b.created_at);
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

    // Pagination
    const itemsPerPage = PAGINATION.TASKS_PER_PAGE;
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginated = filtered.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );

    return { filteredTasks: filtered, paginatedTasks: paginated, totalPages };
  }, [tasks, debouncedSearchTerm, filterStatus, sortBy, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filterStatus, sortBy]);

  const handleUpdateStatus = (taskId, newStatus) => {
    setConfirmAction({
      taskId,
      newStatus,
      message: `Update task status to "${newStatus}"?`
    });
    setShowConfirm(true);
  };

  const executeStatusUpdate = async () => {
    if (!confirmAction) return;

    try {
      // Backend expects Form data, not JSON
      const formData = new FormData();
      formData.append('status', confirmAction.newStatus);

      await api.put(`/api/engineer/update-task/${confirmAction.taskId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      showToast('Task updated successfully!', 'success');
      onRefresh();
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Installation Tasks</h2>
          <p className="text-gray-600 mt-1">
            {filteredTasks.length} of {tasks.length} tasks
          </p>
        </div>
        <Button onClick={onRefresh}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
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
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Filter by status"
            >
              <option value="all">All Status ({tasks.length})</option>
              <option value="pending">
                Pending ({tasks.filter(t => t.status === TASK_STATUS.PENDING).length})
              </option>
              <option value="scheduled">
                Scheduled ({tasks.filter(t => t.status === TASK_STATUS.SCHEDULED).length})
              </option>
              <option value="completed">
                Completed ({tasks.filter(t => t.status === TASK_STATUS.COMPLETED).length})
              </option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Sort tasks"
            >
              <option value="date_newest">Newest First</option>
              <option value="date_oldest">Oldest First</option>
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
            </select>
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
            action={searchTerm && (
              <Button variant="outline" onClick={() => setSearchTerm('')}>
                Clear Search
              </Button>
            )}
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginatedTasks.map((task) => (
              <Card key={task.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{task.name}</h3>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {formatPhone(task.mobile)}
                      </p>
                    </div>
                  </div>
                  <Badge variant={
                    task.status === TASK_STATUS.COMPLETED ? 'success' :
                    task.status === TASK_STATUS.SCHEDULED ? 'info' : 'warning'
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
                    <span>Added: {formatDate(task.created_at)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                {task.status !== TASK_STATUS.COMPLETED && (
                  <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
                    {task.status === TASK_STATUS.PENDING && (
                      <Button
                        onClick={() => handleUpdateStatus(task.id, TASK_STATUS.SCHEDULED)}
                        variant="outline"
                        className="flex-1 text-sm min-h-[44px]"
                        aria-label={`Schedule installation for ${task.name}`}
                      >
                        <Calendar className="w-4 h-4 mr-1" />
                        Schedule
                      </Button>
                    )}
                    <Button
                      onClick={() => handleUpdateStatus(task.id, TASK_STATUS.COMPLETED)}
                      variant="success"
                      className="flex-1 text-sm min-h-[44px]"
                      aria-label={`Mark installation complete for ${task.name}`}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Complete
                    </Button>
                  </div>
                )}

                {task.status === TASK_STATUS.COMPLETED && (
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg">
              <div className="flex flex-1 justify-between sm:hidden">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{(currentPage - 1) * PAGINATION.TASKS_PER_PAGE + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * PAGINATION.TASKS_PER_PAGE, filteredTasks.length)}
                    </span>{' '}
                    of <span className="font-medium">{filteredTasks.length}</span> results
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  {[...Array(totalPages)].map((_, i) => {
                    const page = i + 1;
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors min-w-[44px] min-h-[44px] ${
                            currentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                          aria-label={`Go to page ${page}`}
                          aria-current={currentPage === page ? 'page' : undefined}
                        >
                          {page}
                        </button>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return <span key={page} className="px-2">...</span>;
                    }
                    return null;
                  })}
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
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
                {filteredTasks.filter(t => t.status === TASK_STATUS.PENDING).length}
              </p>
            </div>
            <div>
              <p className="text-blue-700">Scheduled</p>
              <p className="text-2xl font-bold text-blue-900">
                {filteredTasks.filter(t => t.status === TASK_STATUS.SCHEDULED).length}
              </p>
            </div>
            <div>
              <p className="text-green-700">Completed</p>
              <p className="text-2xl font-bold text-green-900">
                {filteredTasks.filter(t => t.status === TASK_STATUS.COMPLETED).length}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Confirm Dialog */}
      {showConfirm && confirmAction && (
        <ConfirmDialog
          isOpen={showConfirm}
          onClose={() => {
            setShowConfirm(false);
            setConfirmAction(null);
          }}
          onConfirm={executeStatusUpdate}
          title="Update Task Status"
          message={confirmAction.message}
          confirmText="Update"
          cancelText="Cancel"
          variant="primary"
        />
      )}
    </div>
  );
};

// ============================================
// EXPORT DEFAULT
// ============================================

export default App;
