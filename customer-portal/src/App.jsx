import React, { useState, useEffect } from 'react';
import api from './api';
import {
  Wifi, LogOut, CreditCard, FileText, User, Phone, Mail, MapPin,
  Calendar, DollarSign, CheckCircle, AlertTriangle, X, Loader,
  Download, ArrowRight, Clock, Zap, Database, TrendingUp,
  Home, Receipt, Settings, RefreshCw, Info, ExternalLink
} from 'lucide-react';

// ============================================
// UTILITY FUNCTIONS
// ============================================

const formatErrorMessage = (error) => {
  // Handle Pydantic validation errors (array of error objects)
  if (Array.isArray(error)) {
    return error.map(err => err.msg || JSON.stringify(err)).join(', ');
  }

  // Handle error objects
  if (typeof error === 'object' && error !== null) {
    // If it has a message property
    if (error.message) return error.message;
    // If it has a msg property (Pydantic)
    if (error.msg) return error.msg;
    // If it has a detail property
    if (error.detail) {
      if (typeof error.detail === 'string') return error.detail;
      return formatErrorMessage(error.detail);
    }
    // Last resort - stringify
    return JSON.stringify(error);
  }

  // Already a string
  return String(error || 'An error occurred');
};

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
    primary: 'bg-orange-600 hover:bg-orange-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    outline: 'border-2 border-orange-600 text-orange-600 hover:bg-orange-50'
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
    <Loader className="w-8 h-8 text-orange-600 animate-spin" />
  </div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-4">
        <div className="fixed inset-0 bg-black opacity-50" onClick={onClose}></div>
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto my-4">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between z-10">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 pr-4">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
          <div className="p-4 sm:p-6">
            {children}
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
  const [userData, setUserData] = useState(null);
  const [bills, setBills] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('customer_token');
    if (token) {
      setIsAuthenticated(true);
      fetchUserData();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserData = async () => {
    try {
      const [profileRes, billsRes] = await Promise.all([
        api.get('/api/customer/me'),
        api.get('/api/customer/bills')
      ]);

      setUserData(profileRes.data);
      
      // Handle different response formats - ensure bills is always an array
      const billsData = billsRes.data;
      if (Array.isArray(billsData)) {
        setBills(billsData);
      } else if (billsData && Array.isArray(billsData.bills)) {
        setBills(billsData.bills);
      } else {
        setBills([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setBills([]);
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
      const response = await api.post('/api/customer/login', { mobile, password });
      localStorage.setItem('customer_token', response.data.access_token);
      setIsAuthenticated(true);
      await fetchUserData();
      showToast('Welcome back!', 'success');
    } catch (error) {
      const errorMsg = error.response?.data?.detail
        ? formatErrorMessage(error.response.data.detail)
        : 'Login failed';
      showToast(errorMsg, 'error');
      throw error;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('customer_token');
    setIsAuthenticated(false);
    setUserData(null);
    setBills([]);
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
      <header className="bg-gradient-to-r from-orange-500 to-orange-600 text-white sticky top-0 z-10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <Wifi className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold">4You Broadband</h1>
                <p className="text-xs text-orange-100">Customer Portal</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 hover:bg-white hover:bg-opacity-20 px-3 py-2 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-gray-200 sticky top-16 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'home'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Home className="w-4 h-4 inline mr-2" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('bills')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'bills'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Receipt className="w-4 h-4 inline mr-2" />
              My Bills
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'profile'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Profile
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'home' && (
          <DashboardTab 
            userData={userData} 
            bills={bills}
            onRefresh={fetchUserData} 
            showToast={showToast}
          />
        )}
        {activeTab === 'bills' && (
          <BillsTab 
            bills={bills}
            userData={userData}
            onRefresh={fetchUserData} 
            showToast={showToast}
          />
        )}
        {activeTab === 'profile' && (
          <ProfileTab userData={userData} />
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
      const errorMsg = err.response?.data?.detail
        ? formatErrorMessage(err.response.data.detail)
        : 'Login failed. Please check your credentials.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo Card */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4 shadow-lg">
            <Wifi className="w-10 h-10 text-orange-600" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">4You Broadband</h1>
          <p className="text-orange-100">Customer Portal</p>
        </div>

        {/* Login Card */}
        <Card className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Login</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="label">Mobile Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="input pl-10"
                  placeholder="9876543210"
                  maxLength="10"
                  required
                />
              </div>
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

          <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-900 font-medium mb-2">📱 First Time Login?</p>
            <p className="text-xs text-orange-800">Use your registered mobile number and the password provided by our engineer during installation.</p>
          </div>
        </Card>

        {/* Help Text */}
        <div className="text-center mt-6">
          <p className="text-white text-sm">
            Need help? Contact: <strong>1800-123-4567</strong>
          </p>
        </div>
      </div>
    </div>
  );
};

// ============================================
// DASHBOARD TAB
// ============================================

const DashboardTab = ({ userData, bills, onRefresh, showToast }) => {
  // Safety check for bills
  const safeBills = Array.isArray(bills) ? bills : [];
  
  const planExpiryDate = new Date(userData.plan_expiry_date);
  const today = new Date();
  const daysUntilExpiry = Math.ceil((planExpiryDate - today) / (1000 * 60 * 60 * 24));
  const isExpiringSoon = daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  const isExpired = daysUntilExpiry < 0;

  const pendingBills = safeBills.filter(b => b.payment_status === 'Pending');
  const totalPending = pendingBills.reduce((sum, bill) => sum + bill.amount, 0);

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg p-4 sm:p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-bold mb-2">Welcome, {userData.name}! 👋</h2>
            <p className="text-sm sm:text-base text-orange-100">Customer ID: {userData.cs_id}</p>
          </div>
          <Button variant="outline" onClick={onRefresh} className="bg-white bg-opacity-20 border-white text-white hover:bg-white hover:bg-opacity-30 w-full sm:w-auto flex-shrink-0">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Alert Messages */}
      {isExpired && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-red-900">Plan Expired</h4>
            <p className="text-sm text-red-700 mt-1">
              Your plan expired on {userData.plan_expiry_date}. Please renew to continue service.
            </p>
          </div>
        </div>
      )}

      {isExpiringSoon && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-yellow-900">Plan Expiring Soon</h4>
            <p className="text-sm text-yellow-700 mt-1">
              Your plan will expire in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}. Renew now to avoid service interruption.
            </p>
          </div>
        </div>
      )}

      {userData.payment_status === 'Pending' && (
        <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg flex items-start gap-3">
          <Clock className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-orange-900">Payment Pending</h4>
            <p className="text-sm text-orange-700 mt-1">
              Payment due by {userData.payment_due_date}. Pay now to keep your service active.
            </p>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs sm:text-sm text-gray-600">Plan Status</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                {userData.is_plan_active ? 'Active' : 'Expired'}
              </p>
            </div>
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
              userData.is_plan_active ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {userData.is_plan_active ? (
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
              )}
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs sm:text-sm text-gray-600">Days Remaining</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                {daysUntilExpiry > 0 ? daysUntilExpiry : 0}
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-600">Pending Amount</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 truncate">
                ₹{(userData.old_pending_amount || 0).toLocaleString()}
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Current Plan Details */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Current Plan</h3>
          <Badge variant={userData.is_plan_active ? 'success' : 'danger'}>
            {userData.status}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Wifi className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Plan Name</p>
                <p className="font-medium text-gray-900">Premium Unlimited</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Speed</p>
                <p className="font-medium text-gray-900">300 Mbps</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Database className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Data Limit</p>
                <p className="font-medium text-gray-900">Unlimited</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Plan Start Date</p>
                <p className="font-medium text-gray-900">{userData.plan_start_date}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Plan Expiry Date</p>
                <p className="font-medium text-gray-900">{userData.plan_expiry_date}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <DollarSign className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Payment Status</p>
                <Badge variant={
                  userData.payment_status === 'Pending' ? 'warning' :
                  userData.payment_status === 'VerifiedByCash' ? 'success' : 'info'
                }>
                  {userData.payment_status}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Recent Bills */}
      {safeBills.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Bills</h3>
          <div className="space-y-3">
            {safeBills.slice(0, 3).map((bill, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    bill.payment_status === 'Pending' ? 'bg-yellow-100' : 'bg-green-100'
                  }`}>
                    <Receipt className={`w-5 h-5 ${
                      bill.payment_status === 'Pending' ? 'text-yellow-600' : 'text-green-600'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">₹{bill.amount}</p>
                    <p className="text-sm text-gray-500">Due: {bill.due_date}</p>
                  </div>
                </div>
                <Badge variant={bill.payment_status === 'Pending' ? 'warning' : 'success'}>
                  {bill.payment_status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <button className="p-4 sm:p-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg text-left">
          <CreditCard className="w-6 h-6 sm:w-8 sm:h-8 mb-2" />
          <p className="font-semibold text-base sm:text-lg">Pay Bill</p>
          <p className="text-xs sm:text-sm text-orange-100 mt-1">Make a payment now</p>
        </button>
        <button className="p-4 sm:p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg text-left">
          <FileText className="w-6 h-6 sm:w-8 sm:h-8 mb-2" />
          <p className="font-semibold text-base sm:text-lg">View Bills</p>
          <p className="text-xs sm:text-sm text-blue-100 mt-1">Download invoices</p>
        </button>
      </div>
    </div>
  );
};

// ============================================
// BILLS TAB
// ============================================

const BillsTab = ({ bills, userData, onRefresh, showToast }) => {
  // Safety check for bills
  const safeBills = Array.isArray(bills) ? bills : [];
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);

  const handlePayBill = (bill) => {
    setSelectedBill(bill);
    setShowPaymentModal(true);
  };

  const handleDownloadInvoice = async (billId) => {
    try {
      showToast('Downloading invoice...', 'info');
      const response = await api.get(`/api/customer/download-invoice/${billId}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${billId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      showToast('Invoice downloaded successfully!', 'success');
    } catch (error) {
      showToast('Failed to download invoice', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">My Bills</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">{safeBills.length} total bills</p>
        </div>
        <Button onClick={onRefresh} className="w-full sm:w-auto">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="p-4 sm:p-6 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-orange-700">Total Bills</p>
              <p className="text-2xl sm:text-3xl font-bold text-orange-900 mt-1">{safeBills.length}</p>
            </div>
            <Receipt className="w-10 h-10 sm:w-12 sm:h-12 text-orange-600 opacity-50" />
          </div>
        </Card>

        <Card className="p-4 sm:p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-yellow-700">Pending</p>
              <p className="text-2xl sm:text-3xl font-bold text-yellow-900 mt-1">
                {safeBills.filter(b => b.payment_status === 'Pending').length}
              </p>
            </div>
            <Clock className="w-10 h-10 sm:w-12 sm:h-12 text-yellow-600 opacity-50" />
          </div>
        </Card>

        <Card className="p-4 sm:p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-green-700">Paid</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-900 mt-1">
                {safeBills.filter(b => b.payment_status !== 'Pending').length}
              </p>
            </div>
            <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-green-600 opacity-50" />
          </div>
        </Card>
      </div>

      {/* Bills List */}
      {safeBills.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No bills yet</h3>
          <p className="text-gray-600">Your billing history will appear here</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {safeBills.map((bill, index) => (
            <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    bill.payment_status === 'Pending' ? 'bg-yellow-100' :
                    bill.payment_status === 'VerifiedByCash' ? 'bg-green-100' : 'bg-blue-100'
                  }`}>
                    <Receipt className={`w-6 h-6 ${
                      bill.payment_status === 'Pending' ? 'text-yellow-600' :
                      bill.payment_status === 'VerifiedByCash' ? 'text-green-600' : 'text-blue-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900 text-lg">₹{bill.amount}</h3>
                      <Badge variant={
                        bill.payment_status === 'Pending' ? 'warning' :
                        bill.payment_status === 'VerifiedByCash' ? 'success' : 'info'
                      }>
                        {bill.payment_status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Due: {bill.due_date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        <span>Period: {bill.billing_period || 'Current Month'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  {bill.payment_status === 'Pending' && (
                    <Button onClick={() => handlePayBill(bill)} className="whitespace-nowrap w-full sm:w-auto">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Pay Now
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => handleDownloadInvoice(bill.id)}
                    className="whitespace-nowrap w-full sm:w-auto"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Invoice
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedBill && (
        <PaymentModal
          bill={selectedBill}
          userData={userData}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedBill(null);
          }}
          onSuccess={() => {
            setShowPaymentModal(false);
            setSelectedBill(null);
            onRefresh();
            showToast('Payment submitted successfully!', 'success');
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
};

// ============================================
// PAYMENT MODAL
// ============================================

const PaymentModal = ({ bill, userData, onClose, onSuccess, showToast }) => {
  const [paymentMethod, setPaymentMethod] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!paymentMethod) {
      showToast('Please select a payment method', 'warning');
      return;
    }

    setLoading(true);

    try {
      await api.post('/api/customer/pay-bill', {
        amount: bill.amount,
        payment_method: paymentMethod
      });

      onSuccess();
    } catch (error) {
      const errorMsg = error.response?.data?.detail
        ? formatErrorMessage(error.response.data.detail)
        : 'Payment failed';
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Make Payment">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Bill Summary */}
        <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
          <h4 className="font-semibold text-orange-900 mb-3">Payment Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-700">Customer ID:</span>
              <span className="font-medium text-gray-900">{userData.cs_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Customer Name:</span>
              <span className="font-medium text-gray-900">{userData.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Billing Period:</span>
              <span className="font-medium text-gray-900">{bill.billing_period || 'Current Month'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Due Date:</span>
              <span className="font-medium text-gray-900">{bill.due_date}</span>
            </div>
            <div className="border-t border-orange-300 pt-2 mt-2 flex justify-between text-base">
              <span className="font-semibold text-gray-900">Total Amount:</span>
              <span className="font-bold text-orange-600 text-xl">₹{bill.amount}</span>
            </div>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Select Payment Method</h4>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setPaymentMethod('UPI')}
              className={`payment-method ${paymentMethod === 'UPI' ? 'selected' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Phone className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">UPI Payment</p>
                  <p className="text-xs text-gray-600">Google Pay, PhonePe, Paytm</p>
                </div>
              </div>
              {paymentMethod === 'UPI' && (
                <CheckCircle className="w-5 h-5 text-orange-600" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('Card')}
              className={`payment-method ${paymentMethod === 'Card' ? 'selected' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">Card Payment</p>
                  <p className="text-xs text-gray-600">Credit / Debit Card</p>
                </div>
              </div>
              {paymentMethod === 'Card' && (
                <CheckCircle className="w-5 h-5 text-orange-600" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('NetBanking')}
              className={`payment-method ${paymentMethod === 'NetBanking' ? 'selected' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <ExternalLink className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">Net Banking</p>
                  <p className="text-xs text-gray-600">All major banks</p>
                </div>
              </div>
              {paymentMethod === 'NetBanking' && (
                <CheckCircle className="w-5 h-5 text-orange-600" />
              )}
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Payment Information:</p>
              <ul className="space-y-1 text-xs">
                <li>• Payment will be verified within 24 hours</li>
                <li>• You will receive a confirmation SMS</li>
                <li>• Keep your transaction ID for reference</li>
                <li>• For cash payment, visit our office</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !paymentMethod} className="flex-1">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader className="w-4 h-4 animate-spin" />
                Processing...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Pay ₹{bill.amount}
                <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ============================================
// PROFILE TAB
// ============================================

const ProfileTab = ({ userData }) => {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Profile Header */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white text-2xl sm:text-3xl font-bold flex-shrink-0">
            {userData.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{userData.name}</h2>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Customer ID: {userData.cs_id}</p>
            <Badge variant={userData.is_plan_active ? 'success' : 'danger'} className="mt-2">
              {userData.status}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Contact Information */}
      <Card className="p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
          Contact Information
        </h3>
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-600">Mobile Number</p>
              <p className="font-medium text-sm sm:text-base text-gray-900">{userData.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-600">Email Address</p>
              <p className="font-medium text-sm sm:text-base text-gray-900 break-all">{userData.email || 'Not provided'}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-600">Address</p>
              <p className="font-medium text-sm sm:text-base text-gray-900">{userData.address}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Account Details */}
      <Card className="p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
          Account Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Account Created</p>
            <p className="font-medium text-gray-900">{userData.created_at}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Last Renewal</p>
            <p className="font-medium text-gray-900">{userData.last_renewal_date || 'N/A'}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Plan Start Date</p>
            <p className="font-medium text-gray-900">{userData.plan_start_date}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Plan Expiry Date</p>
            <p className="font-medium text-gray-900">{userData.plan_expiry_date}</p>
          </div>
        </div>
      </Card>

      {/* Support Information */}
      <Card className="p-6 bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
        <h3 className="text-lg font-semibold text-orange-900 mb-4">Need Help?</h3>
        <div className="space-y-3 text-sm">
          <p className="text-orange-800">
            <strong>Customer Support:</strong> 1800-123-4567
          </p>
          <p className="text-orange-800">
            <strong>Email:</strong> support@4you.in
          </p>
          <p className="text-orange-800">
            <strong>Hours:</strong> Monday - Saturday, 9 AM - 6 PM
          </p>
        </div>
      </Card>
    </div>
  );
};

// ============================================
// EXPORT DEFAULT
// ============================================

export default App;