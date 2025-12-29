import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users, Wifi, DollarSign, Settings, LogOut, Plus, Edit2, Trash2,
  Search, Download, FileText, Bell, AlertTriangle, CheckCircle,
  Mail, MessageCircle, Database, Shield, XCircle, Filter,
  Calendar, TrendingUp, Activity, UserPlus, Package, Clock,
  CreditCard, Phone, MapPin, Globe, Zap, RefreshCw, Eye,
  ChevronLeft, ChevronRight, MoreVertical, X, Check, Loader,
  Home, BarChart3, FileSpreadsheet, Wrench, Send, Info, Menu, Upload
} from 'lucide-react';

// Import utilities and configurations
import { api, batchRequests } from './utils/api';
import { CONFIG, PAGINATION, TOAST, FILE_UPLOAD } from './constants';
import {
  validatePhone,
  validateEmail,
  validatePassword,
  validateCustomerId,
  validatePhotoFile,
  validateDocuments,
  validateAmount,
  sanitizeFilename
} from './utils/validation';
import {
  debounce,
  formatCurrency,
  formatDate,
  formatDateTime,
  getDaysUntilExpiry,
  isExpiringSoon,
  isExpired,
  getErrorMessage,
  downloadBlob
} from './utils/helpers';
import { useDebounce } from './hooks/useDebounce';
import ErrorBoundary from './components/ErrorBoundary';

// ============================================
// API CONFIGURATION
// ============================================
// API instance is now imported from ./utils/api with:
// - Environment-based baseURL
// - Request/response interceptors
// - Retry logic with exponential backoff
// - Timeout handling (30s default)
// - Better error handling

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
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
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

const Modal = ({ isOpen, onClose, title, children, size = 'max-w-2xl' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black opacity-50" onClick={onClose}></div>
        <div className={`relative bg-white rounded-lg shadow-xl ${size} w-full max-h-[90vh] overflow-y-auto`}>
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
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
    error: <XCircle className="w-5 h-5 text-red-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
    info: <Bell className="w-5 h-5 text-blue-500" />
  };

  const colors = {
    success: 'border-green-500',
    error: 'border-red-500',
    warning: 'border-yellow-500',
    info: 'border-blue-500'
  };

  return (
    <div className={`fixed bottom-4 right-4 max-w-sm bg-white rounded-lg shadow-lg border-l-4 ${colors[type]} p-4 z-50 animate-slide-in`}>
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

const Badge = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
    primary: 'bg-orange-100 text-orange-800'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
};

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-12">
    <Loader className="w-8 h-8 text-orange-600 animate-spin" />
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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toast, setToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [billingHistory, setBillingHistory] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      setIsAuthenticated(true);
      fetchAllData();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchAllData = async () => {
    try {
      const results = await Promise.allSettled([
        api.get('/api/users'),
        api.get('/api/plans'),
        api.get('/api/engineers'),
        api.get('/api/dashboard/stats'),
        api.get('/api/billing-history')
      ]);

      // Handle users
      if (results[0].status === 'fulfilled') {
        setUsers(results[0].value.data);
      } else {
        console.error('Failed to fetch users:', results[0].reason);
        showToast('Failed to load users', 'error');
      }

      // Handle plans
      if (results[1].status === 'fulfilled') {
        setPlans(results[1].value.data);
      } else {
        console.error('Failed to fetch plans:', results[1].reason);
        showToast('Failed to load plans', 'error');
      }

      // Handle engineers
      if (results[2].status === 'fulfilled') {
        setEngineers(results[2].value.data);
      } else {
        console.error('Failed to fetch engineers:', results[2].reason);
      }

      // Handle dashboard stats
      if (results[3].status === 'fulfilled') {
        setDashboardStats(results[3].value.data);
      } else {
        console.error('Failed to fetch stats:', results[3].reason);
      }

      // Handle billing history
      if (results[4].status === 'fulfilled') {
        setBillingHistory(results[4].value.data);
      } else {
        console.error('Failed to fetch billing history:', results[4].reason);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      showToast(getErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const handleLogin = async (email, password) => {
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await api.post('/api/admin/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      localStorage.setItem('admin_token', response.data.access_token);
      setIsAuthenticated(true);
      await fetchAllData();
      showToast('Login successful!', 'success');
    } catch (error) {
      showToast(error.response?.data?.detail || 'Login failed', 'error');
      throw error;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setIsAuthenticated(false);
    setActiveTab('dashboard');
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
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      <main className="flex-1 overflow-y-auto">
        {/* Mobile Header with Hamburger Menu */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <Menu className="w-6 h-6 text-gray-700" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
              <Wifi className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">4You Broadband</span>
          </div>
          <div className="w-10"></div> {/* Spacer for centering */}
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'dashboard' && (
            <DashboardTab 
              stats={dashboardStats} 
              users={users}
              plans={plans}
              onRefresh={fetchAllData}
              showToast={showToast}
            />
          )}
          {activeTab === 'users' && (
            <UsersTab 
              users={users} 
              plans={plans}
              onRefresh={fetchAllData}
              showToast={showToast}
            />
          )}
          {activeTab === 'plans' && (
            <PlansTab 
              plans={plans}
              onRefresh={fetchAllData}
              showToast={showToast}
            />
          )}
          {activeTab === 'engineers' && (
            <EngineersTab 
              engineers={engineers}
              onRefresh={fetchAllData}
              showToast={showToast}
            />
          )}
          {activeTab === 'billing' && (
            <BillingTab 
              billingHistory={billingHistory}
              users={users}
              plans={plans}
              onRefresh={fetchAllData}
              showToast={showToast}
            />
          )}
          {activeTab === 'notifications' && (
            <NotificationsTab 
              users={users}
              plans={plans}
              showToast={showToast} 
            />
          )}
          {activeTab === 'settings' && (
            <SettingsTab showToast={showToast} />
          )}
        </div>
      </main>
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
            <Wifi className="w-8 h-8 text-orange-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">4You Broadband</h2>
          <p className="text-gray-600 mt-2">Admin Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="admin@4you.in"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
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
          <p className="text-xs text-blue-800">Email: admin@4you.in</p>
          <p className="text-xs text-blue-800">Password: Check your .env file</p>
        </div>
      </Card>
    </div>
  );
};

// ============================================
// SIDEBAR COMPONENT
// ============================================

const Sidebar = ({ activeTab, setActiveTab, onLogout, sidebarOpen, setSidebarOpen }) => {
  const menuItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'users', icon: Users, label: 'User Management' },
    { id: 'plans', icon: Package, label: 'Plans' },
    { id: 'engineers', icon: Wrench, label: 'Engineers' },
    { id: 'billing', icon: FileText, label: 'Billing History' },
    { id: 'notifications', icon: Bell, label: 'Notifications' },
    { id: 'settings', icon: Settings, label: 'System Config' },
  ];

  const handleNavClick = (tabId) => {
    setActiveTab(tabId);
    setSidebarOpen(false); // Close sidebar on mobile after navigation
  };

  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed lg:relative inset-y-0 left-0 z-50
          w-64 bg-white border-r border-gray-200 flex flex-col
          transform transition-transform duration-300 ease-in-out lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
              <Wifi className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">4You Broadband</h1>
              <p className="text-xs text-gray-500">Admin Portal</p>
            </div>
          </div>
          {/* Close button for mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === item.id
                  ? 'bg-orange-50 text-orange-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};













// ============================================
// DASHBOARD TAB
// ============================================

const DashboardTab = ({ stats, users, plans, onRefresh, showToast }) => {
  if (!stats) return <LoadingSpinner />;

  const statCards = [
    {
      title: 'Total Users',
      value: stats.total_users,
      icon: Users,
      color: 'bg-blue-100 text-blue-600',
      bgColor: 'bg-blue-50',
      change: '+12%',
      changeType: 'increase'
    },
    {
      title: 'Active Connections',
      value: stats.active_users,
      icon: Activity,
      color: 'bg-green-100 text-green-600',
      bgColor: 'bg-green-50',
      change: '+5%',
      changeType: 'increase'
    },
    {
      title: 'Monthly Revenue',
      value: `₹${stats.monthly_revenue.toLocaleString()}`,
      icon: TrendingUp,
      color: 'bg-orange-100 text-orange-600',
      bgColor: 'bg-orange-50',
      change: '+8%',
      changeType: 'increase'
    },
    {
      title: 'Pending Payments',
      value: stats.pending_payments,
      icon: AlertTriangle,
      color: 'bg-red-100 text-red-600',
      bgColor: 'bg-red-50',
      change: '-3%',
      changeType: 'decrease'
    },
  ];

  const recentUsers = users.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's your overview.</p>
        </div>
        <Button onClick={onRefresh}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                <p className={`text-xs mt-3 flex items-center gap-1 ${
                  stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                }`}>
                  <TrendingUp className="w-3 h-3" />
                  {stat.change} from last month
                </p>
              </div>
              <div className={`w-14 h-14 ${stat.color} rounded-xl flex items-center justify-center`}>
                <stat.icon className="w-7 h-7" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Collection */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Financial Overview</h3>
            <DollarSign className="w-5 h-5 text-orange-600" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Monthly Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  ₹{stats.monthly_revenue.toLocaleString()}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Pending Collection</p>
                <p className="text-2xl font-bold text-orange-600">
                  ₹{stats.pending_collection.toLocaleString()}
                </p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Outstanding Debt</p>
                <p className="text-2xl font-bold text-red-600">
                  ₹{stats.total_old_debt.toLocaleString()}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-left transition-colors">
              <UserPlus className="w-6 h-6 text-blue-600 mb-2" />
              <p className="font-medium text-gray-900">Add User</p>
              <p className="text-xs text-gray-600">New customer</p>
            </button>
            <button className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-left transition-colors">
              <Package className="w-6 h-6 text-green-600 mb-2" />
              <p className="font-medium text-gray-900">Add Plan</p>
              <p className="text-xs text-gray-600">New package</p>
            </button>
            <button className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg text-left transition-colors">
              <Bell className="w-6 h-6 text-orange-600 mb-2" />
              <p className="font-medium text-gray-900">Send Alerts</p>
              <p className="text-xs text-gray-600">Notifications</p>
            </button>
            <button className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-left transition-colors">
              <FileSpreadsheet className="w-6 h-6 text-purple-600 mb-2" />
              <p className="font-medium text-gray-900">Export Data</p>
              <p className="text-xs text-gray-600">Download Excel</p>
            </button>
          </div>
        </Card>
      </div>

      {/* Recent Users Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Users</h3>
          <Button variant="outline" onClick={() => {}}>
            View All
          </Button>
        </div>
        
        {recentUsers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No users yet"
            description="Start by adding your first customer"
          />
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block lg:hidden space-y-4">
              {recentUsers.map((user) => {
                const plan = plans.find(p => p.id === user.broadband_plan_id);
                return (
                  <div key={user.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-xs text-gray-500">{user.cs_id}</div>
                      </div>
                      <Badge variant={user.is_plan_active ? 'success' : 'danger'}>
                        {user.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Phone:</span>
                        <p className="font-medium text-gray-900">{user.phone}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Plan:</span>
                        <p className="font-medium text-gray-900">{plan ? plan.name : 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Email:</span>
                        <p className="font-medium text-gray-900 truncate">{user.email}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Payment:</span>
                        <div className="mt-1">
                          <Badge variant={
                            user.payment_status === 'Pending' ? 'warning' :
                            user.payment_status === 'VerifiedByCash' ? 'success' :
                            user.payment_status === 'VerifiedByUpi' ? 'info' : 'default'
                          }>
                            {user.payment_status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentUsers.map((user) => {
                    const plan = plans.find(p => p.id === user.broadband_plan_id);
                    return (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.cs_id}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.phone}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {plan ? plan.name : 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {plan ? `₹${plan.price}` : ''}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={
                            user.payment_status === 'Pending' ? 'warning' :
                            user.payment_status === 'VerifiedByCash' ? 'success' :
                            user.payment_status === 'VerifiedByUpi' ? 'info' : 'default'
                          }>
                            {user.payment_status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={user.is_plan_active ? 'success' : 'danger'}>
                            {user.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

// ============================================
// HELPER COMPONENTS FOR USERS TAB
// ============================================

// User Avatar Component
const UserAvatar = ({ user, size = 'md', onClick }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  if (user.photo) {
    return (
      <img
        src={user.photo}
        alt={user.name}
        className={`${sizeClasses[size]} rounded-full object-cover ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-indigo-500' : ''}`}
        onClick={onClick}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} bg-orange-100 rounded-full flex items-center justify-center ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-indigo-500' : ''}`}
      onClick={onClick}
    >
      <Users className={`${iconSizes[size]} text-orange-600`} />
    </div>
  );
};

// Editable Amount Cell Component
const EditableAmountCell = ({ value, userId, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [amount, setAmount] = useState(value);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (amount === value) {
      setIsEditing(false);
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('old_pending_amount', amount);

      await api.put(`/api/users/${userId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      onUpdate();
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update amount:', error);
      setAmount(value);
    } finally {
      setLoading(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
          autoFocus
          onBlur={handleSave}
          onKeyPress={(e) => e.key === 'Enter' && handleSave()}
        />
      </div>
    );
  }

  return (
    <div
      className="text-sm font-medium text-gray-900 cursor-pointer hover:text-indigo-600"
      onClick={() => setIsEditing(true)}
      title="Click to edit"
    >
      ₹{value}
    </div>
  );
};

// Avatar Modal Component
const AvatarModal = ({ user, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{user.name}'s Profile Photo</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="flex justify-center">
          {user.photo ? (
            <img
              src={user.photo}
              alt={user.name}
              className="max-w-full max-h-96 rounded-lg object-contain"
            />
          ) : (
            <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center">
              <Users className="w-32 h-32 text-gray-400" />
            </div>
          )}
        </div>
        <div className="mt-4 text-center text-sm text-gray-600">
          <p>CS ID: {user.cs_id}</p>
          <p>Email: {user.email}</p>
        </div>
      </div>
    </div>
  );
};

// ============================================
// USERS TAB
// ============================================

const UsersTab = ({ users, plans, onRefresh, showToast }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Use debounced search for better performance
  const debouncedSearchTerm = useDebounce(searchTerm);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, paymentFilter]);

  // Memoize filtered users for performance
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch =
        user.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        user.phone.includes(debouncedSearchTerm) ||
        user.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        user.cs_id.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        user.address.toLowerCase().includes(debouncedSearchTerm.toLowerCase());

      const matchesFilter = paymentFilter === 'All' || user.payment_status === paymentFilter;

      return matchesSearch && matchesFilter;
    });
  }, [users, debouncedSearchTerm, paymentFilter]);

  // Memoize pagination calculations
  const { totalPages, paginatedUsers } = useMemo(() => {
    const total = Math.ceil(filteredUsers.length / PAGINATION.ITEMS_PER_PAGE);
    const paginated = filteredUsers.slice(
      (currentPage - 1) * PAGINATION.ITEMS_PER_PAGE,
      currentPage * PAGINATION.ITEMS_PER_PAGE
    );
    return { totalPages: total, paginatedUsers: paginated };
  }, [filteredUsers, currentPage]);

  const handleAddUser = () => {
    setShowAddModal(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleBilling = (user) => {
    setSelectedUser(user);
    setShowBillingModal(true);
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await api.delete(`/api/users/${userId}`);
      showToast('User deleted successfully', 'success');
      onRefresh();
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to delete user', 'error');
    }
  };

  const handleRenewPlan = async (user) => {
    if (!window.confirm(`Renew plan for ${user.name} for 1 month?`)) return;

    try {
      await api.post(`/api/users/${user.id}/renew`, { months: 1 });
      showToast('Plan renewed successfully', 'success');
      onRefresh();
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to renew plan', 'error');
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
      showToast('Invoice generated successfully', 'success');
    } catch (error) {
      showToast('Failed to generate invoice', 'error');
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
      showToast('Users exported successfully', 'success');
    } catch (error) {
      showToast('Failed to export users', 'error');
    }
  };

  const handleExportFinancialReport = async () => {
    try {
      const response = await api.get('/api/export/financial-report', {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `financial_report_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('Financial report exported successfully', 'success');
    } catch (error) {
      showToast('Failed to export financial report', 'error');
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
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-800">Broadband User List</h2>
        <div className="flex space-x-2 flex-wrap gap-2">
          <button
            onClick={handleExportUsers}
            className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center hover:bg-green-700 shadow-sm transition-all text-sm"
          >
            <FileText className="w-4 h-4 mr-2" /> Export to Excel
          </button>
          <button
            onClick={handleExportFinancialReport}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center hover:bg-blue-700 shadow-sm transition-all text-sm"
          >
            <BarChart3 className="w-4 h-4 mr-2" /> Financial Report
          </button>
          <button
            onClick={handleAddUser}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center hover:bg-indigo-700 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 mr-2" /> New Connection
          </button>
        </div>
      </div>

      {/* Filters */}
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

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">Payment</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">Old Pending</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">Due Date</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">Plan Status</th>
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
                          onClick={() => { setSelectedUser(user); setShowAvatarModal(true); }}
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
                        onUpdate={onRefresh}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-900">{user.payment_due_date}</p>
                      {user.plan_expiry_date && (
                        <p className="text-xs text-gray-500">Exp: {user.plan_expiry_date}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {getExpiryBadge(user)}
                      {!user.is_plan_active && (
                        <button
                          onClick={() => handleRenewPlan(user)}
                          className="ml-2 text-xs font-bold text-green-600 hover:text-green-800 border border-green-300 hover:border-green-500 px-2 py-1 rounded transition-all"
                        >
                          RENEW
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="text-indigo-600 hover:text-indigo-800 text-[10px] font-bold border border-indigo-200 hover:border-indigo-400 px-2 py-1 rounded transition-all"
                          title="Edit User"
                        >
                          EDIT
                        </button>
                        <button
                          onClick={() => handleBilling(user)}
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
                          onClick={() => handleDeleteUser(user.id)}
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

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {paginatedUsers.map((user) => {
                const plan = plans.find(p => p.id === user.broadband_plan_id);
                return (
                  <div key={user.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    {/* User Header */}
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Users className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-xs text-gray-500">{user.cs_id}</div>
                        </div>
                      </div>
                      <Badge variant={user.is_plan_active ? 'success' : 'danger'}>
                        {user.status}
                      </Badge>
                    </div>

                    {/* User Details Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                      <div>
                        <span className="text-gray-600 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> Phone:
                        </span>
                        <p className="font-medium text-gray-900">{user.phone}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Plan:</span>
                        <p className="font-medium text-gray-900">{plan ? plan.name : 'No Plan'}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-600 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> Email:
                        </span>
                        <p className="font-medium text-gray-900 text-xs truncate">{user.email}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Expires:</span>
                        <p className="font-medium text-gray-900 text-xs">{user.plan_expiry_date}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Payment:</span>
                        <div className="mt-1">
                          {getPaymentStatusBadge(user.payment_status)}
                        </div>
                      </div>
                      {user.old_pending_amount > 0 && (
                        <div className="col-span-2">
                          <p className="text-xs text-red-600 font-medium">
                            Pending: ₹{user.old_pending_amount} (Due: {user.payment_due_date})
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => handleBilling(user)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100"
                        title="Billing"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Bill</span>
                      </button>
                      <button
                        onClick={() => handleEditUser(user)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleRenewPlan(user)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
                        title="Renew"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Renew</span>
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="flex items-center justify-center px-3 py-2 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

        {/* Pagination */}
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

      {/* Modals */}
      {showAddModal && (
        <AddUserModal
          plans={plans}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            onRefresh();
            showToast('User added successfully', 'success');
          }}
          showToast={showToast}
        />
      )}

      {showEditModal && selectedUser && (
        <EditUserModal
          user={selectedUser}
          plans={plans}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedUser(null);
            onRefresh();
          }}
          showToast={showToast}
        />
      )}

      {showBillingModal && selectedUser && (
        <BillingModal
          user={selectedUser}
          plans={plans}
          onClose={() => {
            setShowBillingModal(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            setShowBillingModal(false);
            setSelectedUser(null);
            onRefresh();
            showToast('Billing updated successfully', 'success');
          }}
          showToast={showToast}
        />
      )}

      {showAvatarModal && selectedUser && (
        <AvatarModal
          user={selectedUser}
          onClose={() => {
            setShowAvatarModal(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
};





// ============================================
// ADD USER MODAL
// ============================================

const AddUserModal = ({ plans, onClose, onSuccess, showToast }) => {
  const [formData, setFormData] = useState({
    cs_id: '',
    name: '',
    phone: '',
    email: '',
    user_password: '',
    address: '',
    broadband_plan_id: '',
    plan_start_date: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [documents, setDocuments] = useState([]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file', 'error');
        return;
      }
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        showToast('Photo size must be less than 5MB', 'error');
        return;
      }
      setPhoto(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocumentsChange = (e) => {
    const files = Array.from(e.target.files);
    // Validate total number of files (max 5)
    if (files.length > 5) {
      showToast('Maximum 5 documents allowed', 'error');
      return;
    }
    // Validate each file size (10MB max per file)
    const oversizedFiles = files.filter(file => file.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      showToast('Each document must be less than 10MB', 'error');
      return;
    }
    setDocuments(files);
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
  };

  const removeDocument = (index) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const generateCSID = () => {
    const timestamp = Date.now().toString().slice(-4);
    setFormData({
      ...formData,
      cs_id: `CS_${timestamp}`
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Always use FormData to match backend expectations
      const submitData = new FormData();

      // Append form fields
      Object.keys(formData).forEach(key => {
        submitData.append(key, formData[key]);
      });

      // Append photo if exists
      if (photo) {
        submitData.append('photo', photo);
      }

      // Append documents if exist
      if (documents.length > 0) {
        documents.forEach((doc, index) => {
          submitData.append(`document_${index}`, doc);
        });
      }

      await api.post('/api/users', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      showToast('User added successfully!', 'success');
      onSuccess();
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to add user', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Add New User" size="max-w-3xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer ID *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                name="cs_id"
                value={formData.cs_id}
                onChange={handleChange}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="CS_1234"
                required
              />
              <Button type="button" variant="outline" onClick={generateCSID}>
                Generate
              </Button>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Rajesh Kumar"
              required
            />
          </div>

          {/* Mobile */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mobile Number *
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="9876543210"
              maxLength="10"
              pattern="[0-9]{10}"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="rajesh@example.com"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <input
              type="password"
              name="user_password"
              value={formData.user_password}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Minimum 6 characters"
              minLength="6"
              required
            />
          </div>

          {/* Plan */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Broadband Plan *
            </label>
            <select
              name="broadband_plan_id"
              value={formData.broadband_plan_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            >
              <option value="">Select a plan</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} - ₹{plan.price}/month ({plan.speed})
                </option>
              ))}
            </select>
          </div>

          {/* Plan Start Date */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plan Start Date *
            </label>
            <input
              type="date"
              name="plan_start_date"
              value={formData.plan_start_date}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          {/* Address */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address *
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Full address with area and pincode"
              required
            />
          </div>

          {/* Photo Upload */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Profile Photo <span className="text-gray-500 text-xs">(Optional)</span>
            </label>
            <div className="flex items-start gap-4">
              {photoPreview ? (
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-24 h-24 rounded-lg object-cover border-2 border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                  <Upload className="w-6 h-6 text-gray-400" />
                  <span className="text-xs text-gray-500 mt-1">Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              )}
              <div className="flex-1">
                <p className="text-sm text-gray-600">
                  Upload customer profile photo
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  JPG, PNG or GIF. Max size 5MB.
                </p>
                {photo && (
                  <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {photo.name} ({(photo.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Documents Upload */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Documents <span className="text-gray-500 text-xs">(Optional - Max 5 files)</span>
            </label>
            <div className="space-y-3">
              <label className="flex flex-col items-center justify-center w-full p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">Click to upload documents</span>
                <span className="text-xs text-gray-500 mt-1">
                  ID proof, address proof, etc. (PDF, JPG, PNG - Max 10MB each)
                </span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleDocumentsChange}
                  className="hidden"
                />
              </label>

              {/* Document List */}
              {documents.length > 0 && (
                <div className="space-y-2">
                  {documents.map((doc, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="w-5 h-5 text-orange-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {doc.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(doc.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDocument(index)}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                    {documents.length} document{documents.length > 1 ? 's' : ''} selected
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader className="w-4 h-4 animate-spin" />
                Adding...
              </span>
            ) : (
              'Add User'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ============================================
// EDIT USER MODAL
// ============================================

const EditUserModal = ({ user, plans, onClose, onSuccess, showToast }) => {
  const [formData, setFormData] = useState({
    name: user.name,
    phone: user.phone,
    email: user.email,
    address: user.address,
    status: user.status,
    broadband_plan_id: user.broadband_plan_id || '',
    user_password: '' // Optional - only update if filled
  });
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(user.photo || null);
  const [documents, setDocuments] = useState([]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file', 'error');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast('Photo size must be less than 5MB', 'error');
        return;
      }
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocumentsChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 5) {
      showToast('Maximum 5 documents allowed', 'error');
      return;
    }
    const oversizedFiles = files.filter(file => file.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      showToast('Each document must be less than 10MB', 'error');
      return;
    }
    setDocuments(files);
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
  };

  const removeDocument = (index) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const hasFiles = photo || documents.length > 0;

      // Filter out empty password
      const updateData = { ...formData };
      if (!updateData.user_password) {
        delete updateData.user_password;
      }

      if (hasFiles) {
        const submitData = new FormData();

        Object.keys(updateData).forEach(key => {
          submitData.append(key, updateData[key]);
        });

        if (photo) {
          submitData.append('photo', photo);
        }

        if (documents.length > 0) {
          documents.forEach((doc, index) => {
            submitData.append(`document_${index}`, doc);
          });
        }

        await api.put(`/api/users/${user.id}`, submitData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        await api.put(`/api/users/${user.id}`, updateData);
      }

      showToast('User updated successfully!', 'success');
      onSuccess();
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to update user', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Edit User" size="max-w-3xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* User Info Display */}
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-orange-700 font-medium">Customer ID:</span>
            <span className="font-bold text-orange-900">{user.cs_id}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          {/* Mobile */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mobile Number *
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="9876543210"
              maxLength="10"
              pattern="[0-9]{10}"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          {/* Password (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password <span className="text-gray-500 text-xs">(Optional - leave empty to keep current)</span>
            </label>
            <input
              type="password"
              name="user_password"
              value={formData.user_password}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Enter new password to update"
              minLength="6"
            />
          </div>

          {/* Plan */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Broadband Plan *
            </label>
            <select
              name="broadband_plan_id"
              value={formData.broadband_plan_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            >
              <option value="">Select a plan</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} - ₹{plan.price}/month ({plan.speed})
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status *
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
              <option value="Expired">Expired</option>
              <option value="Pending Installation">Pending Installation</option>
            </select>
          </div>

          {/* Address */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address *
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          {/* Photo Upload */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Profile Photo <span className="text-gray-500 text-xs">(Optional)</span>
            </label>
            <div className="flex items-start gap-4">
              {photoPreview ? (
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-24 h-24 rounded-lg object-cover border-2 border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                  <Upload className="w-6 h-6 text-gray-400" />
                  <span className="text-xs text-gray-500 mt-1">Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              )}
              <div className="flex-1">
                <p className="text-sm text-gray-600">
                  {photo ? 'New photo selected' : user.photo ? 'Update customer photo' : 'Upload customer photo'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  JPG, PNG or GIF. Max size 5MB.
                </p>
                {photo && (
                  <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {photo.name} ({(photo.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Documents Upload */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Add Documents <span className="text-gray-500 text-xs">(Optional - Max 5 files)</span>
            </label>
            <div className="space-y-3">
              <label className="flex flex-col items-center justify-center w-full p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">Click to upload new documents</span>
                <span className="text-xs text-gray-500 mt-1">
                  ID proof, address proof, etc. (PDF, JPG, PNG - Max 10MB each)
                </span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleDocumentsChange}
                  className="hidden"
                />
              </label>

              {documents.length > 0 && (
                <div className="space-y-2">
                  {documents.map((doc, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="w-5 h-5 text-orange-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {doc.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(doc.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDocument(index)}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                    {documents.length} new document{documents.length > 1 ? 's' : ''} selected
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader className="w-4 h-4 animate-spin" />
                Updating...
              </span>
            ) : (
              'Update User'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ============================================
// EDIT BILLING HISTORY MODAL
// ============================================

const EditBillingHistoryModal = ({ record, plans, onClose, onSuccess, showToast }) => {
  const [formData, setFormData] = useState({
    previous_payment_status: record.previous_payment_status || '',
    new_payment_status: record.new_payment_status || '',
    previous_old_pending_amount: record.previous_old_pending_amount || 0,
    new_old_pending_amount: record.new_old_pending_amount || 0,
    previous_payment_due_date: record.previous_payment_due_date || '',
    new_payment_due_date: record.new_payment_due_date || '',
    previous_plan_id: record.previous_plan_id || '',
    new_plan_id: record.new_plan_id || '',
    notes: record.notes || '',
    change_type: record.change_type || 'billing_update'
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update the billing history record
      await api.put(`/api/billing-history/${record.id}`, formData);
      onSuccess();
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Edit Billing History Record" size="max-w-3xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Record Info */}
        <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <History className="w-5 h-5 text-purple-600" />
            <h4 className="font-medium text-purple-900">Record Information</h4>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-purple-700">Date:</span>
              <span className="ml-2 font-medium text-purple-900">{formatDateTime(record.created_at)}</span>
            </div>
            <div>
              <span className="text-purple-700">Admin:</span>
              <span className="ml-2 font-medium text-purple-900">{record.admin_email}</span>
            </div>
          </div>
        </div>

        {/* Change Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Change Type
          </label>
          <select
            name="change_type"
            value={formData.change_type}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="billing_update">Billing Update</option>
            <option value="payment_status">Payment Status</option>
            <option value="plan_change">Plan Change</option>
            <option value="amount_adjustment">Amount Adjustment</option>
            <option value="renewal">Renewal</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Payment Status Section */}
          <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg">
            <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <ChevronRight className="w-4 h-4" />
              Payment Status Change
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Previous Status
                </label>
                <select
                  name="previous_payment_status"
                  value={formData.previous_payment_status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">None</option>
                  <option value="Pending">Pending</option>
                  <option value="VerifiedByCash">Verified By Cash</option>
                  <option value="VerifiedByUpi">Verified By UPI</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Status
                </label>
                <select
                  name="new_payment_status"
                  value={formData.new_payment_status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">None</option>
                  <option value="Pending">Pending</option>
                  <option value="VerifiedByCash">Verified By Cash</option>
                  <option value="VerifiedByUpi">Verified By UPI</option>
                </select>
              </div>
            </div>
          </div>

          {/* Pending Amount Section */}
          <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg">
            <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Pending Amount Change
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Previous Amount (₹)
                </label>
                <input
                  type="number"
                  name="previous_old_pending_amount"
                  value={formData.previous_old_pending_amount}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Amount (₹)
                </label>
                <input
                  type="number"
                  name="new_old_pending_amount"
                  value={formData.new_old_pending_amount}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Due Date Section */}
          <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg">
            <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Payment Due Date Change
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Previous Due Date
                </label>
                <input
                  type="date"
                  name="previous_payment_due_date"
                  value={formData.previous_payment_due_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Due Date
                </label>
                <input
                  type="date"
                  name="new_payment_due_date"
                  value={formData.new_payment_due_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Plan Change Section */}
          <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg">
            <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Wifi className="w-4 h-4" />
              Plan Change
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Previous Plan
                </label>
                <select
                  name="previous_plan_id"
                  value={formData.previous_plan_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">None</option>
                  {plans.map(plan => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - ₹{plan.price}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Plan
                </label>
                <select
                  name="new_plan_id"
                  value={formData.new_plan_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">None</option>
                  {plans.map(plan => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - ₹{plan.price}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Add any notes about this billing adjustment..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader className="w-4 h-4 animate-spin" />
                Saving...
              </span>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ============================================
// BILLING MODAL
// ============================================

const BillingModal = ({ user, plans, onClose, onSuccess, showToast }) => {
  const currentPlan = plans.find(p => p.id === user.broadband_plan_id);

  const [formData, setFormData] = useState({
    broadband_plan_id: user.broadband_plan_id,
    payment_status: user.payment_status,
    old_pending_amount: user.old_pending_amount,
    payment_due_date: user.payment_due_date,
    plan_start_date: user.plan_start_date
  });
  const [loading, setLoading] = useState(false);
  const [userBillingHistory, setUserBillingHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistorySection, setShowHistorySection] = useState(true);
  const [editingHistoryRecord, setEditingHistoryRecord] = useState(null);

  // Fetch billing history for this user
  useEffect(() => {
    fetchUserBillingHistory();
  }, [user.id]);

  const fetchUserBillingHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await api.get(`/api/billing-history`);
      // Filter history for this specific user
      const userHistory = response.data.filter(record => record.user_id === user.id);
      // Sort by created_at descending (newest first)
      userHistory.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setUserBillingHistory(userHistory);
    } catch (error) {
      console.error('Failed to fetch billing history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.put(`/api/users/${user.id}/billing`, formData);
      showToast('Billing updated successfully', 'success');
      // Refresh billing history
      await fetchUserBillingHistory();
      onSuccess();
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to update billing', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditHistoryRecord = (record) => {
    setEditingHistoryRecord(record);
  };

  const handleDeleteHistoryRecord = async (recordId) => {
    if (!window.confirm('Are you sure you want to delete this billing history record?')) return;

    try {
      await api.delete(`/api/billing-history/${recordId}`);
      showToast('Billing history record deleted successfully', 'success');
      await fetchUserBillingHistory();
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
    }
  };

  const selectedPlan = plans.find(p => p.id === formData.broadband_plan_id);
  const totalDue = selectedPlan ? selectedPlan.price + parseInt(formData.old_pending_amount) : 0;

  return (
    <Modal isOpen={true} onClose={onClose} title="Billing Adjustment" size="max-w-4xl">
      <div className="space-y-6">
        {/* User Info */}
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Customer Details</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-blue-700">Name:</span>
              <span className="ml-2 font-medium text-blue-900">{user.name}</span>
            </div>
            <div>
              <span className="text-blue-700">Customer ID:</span>
              <span className="ml-2 font-medium text-blue-900">{user.cs_id}</span>
            </div>
            <div>
              <span className="text-blue-700">Mobile:</span>
              <span className="ml-2 font-medium text-blue-900">{user.phone}</span>
            </div>
            <div>
              <span className="text-blue-700">Current Plan:</span>
              <span className="ml-2 font-medium text-blue-900">
                {currentPlan ? currentPlan.name : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Billing History Section */}
        <div className="border border-gray-200 rounded-lg">
          <div
            className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-t-lg cursor-pointer flex items-center justify-between"
            onClick={() => setShowHistorySection(!showHistorySection)}
          >
            <div className="flex items-center gap-2">
              <History className="w-5 h-5" />
              <h4 className="font-medium">Billing History ({userBillingHistory.length} records)</h4>
            </div>
            <ChevronRight className={`w-5 h-5 transition-transform ${showHistorySection ? 'rotate-90' : ''}`} />
          </div>

          {showHistorySection && (
            <div className="p-4 max-h-96 overflow-y-auto">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="w-6 h-6 animate-spin text-purple-600" />
                  <span className="ml-2 text-gray-600">Loading history...</span>
                </div>
              ) : userBillingHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No billing history found for this customer</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userBillingHistory.map((record, index) => (
                    <div
                      key={record.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="default">{record.change_type || 'billing_update'}</Badge>
                            <span className="text-xs text-gray-500">
                              {formatDateTime(record.created_at)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600">
                            Admin: {record.admin_email}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditHistoryRecord(record)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title="Edit record"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteHistoryRecord(record.id)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="Delete record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {/* Payment Status Change */}
                        {record.previous_payment_status && record.new_payment_status && (
                          <div className="bg-gray-50 p-2 rounded">
                            <span className="text-gray-600 text-xs font-medium">Payment Status:</span>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="warning" className="text-xs">{record.previous_payment_status}</Badge>
                              <ChevronRight className="w-3 h-3 text-gray-400" />
                              <Badge variant="success" className="text-xs">{record.new_payment_status}</Badge>
                            </div>
                          </div>
                        )}

                        {/* Pending Amount Change */}
                        {(record.previous_old_pending_amount !== null || record.new_old_pending_amount !== null) && (
                          <div className="bg-gray-50 p-2 rounded">
                            <span className="text-gray-600 text-xs font-medium">Pending Amount:</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-medium text-gray-900">
                                ₹{record.previous_old_pending_amount || 0}
                              </span>
                              <ChevronRight className="w-3 h-3 text-gray-400" />
                              <span className="text-xs font-medium text-orange-600">
                                ₹{record.new_old_pending_amount || 0}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Due Date Change */}
                        {record.previous_payment_due_date && record.new_payment_due_date && (
                          <div className="bg-gray-50 p-2 rounded">
                            <span className="text-gray-600 text-xs font-medium">Due Date:</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-900">{formatDate(record.previous_payment_due_date)}</span>
                              <ChevronRight className="w-3 h-3 text-gray-400" />
                              <span className="text-xs font-medium text-orange-600">{formatDate(record.new_payment_due_date)}</span>
                            </div>
                          </div>
                        )}

                        {/* Plan Change */}
                        {record.previous_plan_name && record.new_plan_name && (
                          <div className="bg-gray-50 p-2 rounded">
                            <span className="text-gray-600 text-xs font-medium">Plan:</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-900">{record.previous_plan_name}</span>
                              <ChevronRight className="w-3 h-3 text-gray-400" />
                              <span className="text-xs font-medium text-blue-600">{record.new_plan_name}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {record.notes && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <span className="text-xs text-gray-600">Notes: </span>
                          <span className="text-xs text-gray-900">{record.notes}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Current Billing Adjustment Form */}
        <div className="border-t-4 border-orange-500 pt-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-orange-600" />
            New Billing Adjustment
          </h3>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Plan Selection */}
              <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Broadband Plan
            </label>
            <select
              name="broadband_plan_id"
              value={formData.broadband_plan_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            >
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} - ₹{plan.price}/month ({plan.speed} - {plan.data_limit})
                </option>
              ))}
            </select>
          </div>

          {/* Payment Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Status
            </label>
            <select
              name="payment_status"
              value={formData.payment_status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            >
              <option value="Pending">Pending</option>
              <option value="VerifiedByCash">Verified By Cash</option>
              <option value="VerifiedByUpi">Verified By UPI</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {formData.payment_status === 'Pending' && '⏳ Customer has not paid yet'}
              {formData.payment_status === 'VerifiedByCash' && '💵 Cash payment received'}
              {formData.payment_status === 'VerifiedByUpi' && '💳 Online payment received'}
            </p>
          </div>

          {/* Old Pending Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Old Pending Amount (₹)
            </label>
            <input
              type="number"
              name="old_pending_amount"
              value={formData.old_pending_amount}
              onChange={handleChange}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Previous outstanding balance
            </p>
          </div>

          {/* Payment Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Due Date
            </label>
            <input
              type="date"
              name="payment_due_date"
              value={formData.payment_due_date}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          {/* Plan Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plan Start Date
            </label>
            <input
              type="date"
              name="plan_start_date"
              value={formData.plan_start_date}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Total Calculation */}
        <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
          <h4 className="font-medium text-orange-900 mb-3">Bill Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-orange-700">Plan Price:</span>
              <span className="font-medium text-orange-900">
                ₹{selectedPlan ? selectedPlan.price.toLocaleString() : 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-700">Old Pending:</span>
              <span className="font-medium text-orange-900">
                ₹{parseInt(formData.old_pending_amount).toLocaleString()}
              </span>
            </div>
            <div className="border-t border-orange-300 pt-2 flex justify-between text-base">
              <span className="font-semibold text-orange-900">Total Due:</span>
              <span className="font-bold text-orange-900">
                ₹{totalDue.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Billing Status Guide:</p>
              <ul className="space-y-1 text-xs">
                <li>• <strong>Pending:</strong> Customer hasn't paid yet (will receive reminders)</li>
                <li>• <strong>VerifiedByCash:</strong> Cash received at office/from engineer</li>
                <li>• <strong>VerifiedByUpi:</strong> Online payment verified (UPI/Card/Net Banking)</li>
              </ul>
            </div>
          </div>
        </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader className="w-4 h-4 animate-spin" />
                    Updating...
                  </span>
                ) : (
                  'Update Billing'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Edit History Record Modal */}
      {editingHistoryRecord && (
        <EditBillingHistoryModal
          record={editingHistoryRecord}
          plans={plans}
          onClose={() => setEditingHistoryRecord(null)}
          onSuccess={() => {
            setEditingHistoryRecord(null);
            fetchUserBillingHistory();
            showToast('Billing history updated successfully', 'success');
          }}
          showToast={showToast}
        />
      )}
    </Modal>
  );
};

// ============================================
// PLANS TAB
// ============================================

const PlansTab = ({ plans, onRefresh, showToast }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const handleEditPlan = (plan) => {
    setSelectedPlan(plan);
    setShowEditModal(true);
  };

  const handleDeletePlan = async (planId) => {
    if (!window.confirm('Are you sure you want to delete this plan?')) return;

    try {
      await api.delete(`/api/plans/${planId}`);
      showToast('Plan deleted successfully', 'success');
      onRefresh();
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to delete plan', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Broadband Plans</h1>
          <p className="text-gray-600 mt-1">{plans.length} active plans</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Plan
          </Button>
        </div>
      </div>

      {/* Plans Grid */}
      {plans.length === 0 ? (
        <Card className="p-12">
          <EmptyState
            icon={Package}
            title="No plans yet"
            description="Create your first broadband plan to get started"
            action={<Button onClick={() => setShowAddModal(true)}>Add Plan</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card key={plan.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Wifi className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                    <p className="text-sm text-gray-500">{plan.commitment}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditPlan(plan)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeletePlan(plan.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {/* Price */}
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">₹{plan.price}</span>
                  <span className="text-gray-500">/month</span>
                </div>

                {/* Features */}
                <div className="space-y-2 pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-sm">
                    <Zap className="w-4 h-4 text-orange-600" />
                    <span className="text-gray-700">Speed: <strong>{plan.speed}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Database className="w-4 h-4 text-orange-600" />
                    <span className="text-gray-700">Data: <strong>{plan.data_limit}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <span className="text-gray-700">Commitment: <strong>{plan.commitment}</strong></span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddPlanModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            onRefresh();
            showToast('Plan added successfully', 'success');
          }}
          showToast={showToast}
        />
      )}

      {showEditModal && selectedPlan && (
        <EditPlanModal
          plan={selectedPlan}
          onClose={() => {
            setShowEditModal(false);
            setSelectedPlan(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedPlan(null);
            onRefresh();
            showToast('Plan updated successfully', 'success');
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
};





// ============================================
// ADD PLAN MODAL
// ============================================

const AddPlanModal = ({ onClose, onSuccess, showToast }) => {
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    speed: '',
    data_limit: '',
    commitment: 'Monthly'
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        price: parseFloat(formData.price)
      };
      await api.post('/api/plans', submitData);
      onSuccess();
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to add plan', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Add New Plan">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Plan Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plan Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Premium Unlimited"
              required
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price (₹/month) *
            </label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="999"
              required
            />
          </div>

          {/* Speed */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Speed *
            </label>
            <input
              type="text"
              name="speed"
              value={formData.speed}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="100 Mbps"
              required
            />
          </div>

          {/* Data Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Limit *
            </label>
            <input
              type="text"
              name="data_limit"
              value={formData.data_limit}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Unlimited or 500 GB"
              required
            />
          </div>

          {/* Commitment */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Commitment Period *
            </label>
            <select
              name="commitment"
              value={formData.commitment}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            >
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly (3 months)</option>
              <option value="Half-Yearly">Half-Yearly (6 months)</option>
              <option value="Yearly">Yearly (12 months)</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader className="w-4 h-4 animate-spin" />
                Adding...
              </span>
            ) : (
              'Add Plan'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ============================================
// EDIT PLAN MODAL
// ============================================

const EditPlanModal = ({ plan, onClose, onSuccess, showToast }) => {
  const [formData, setFormData] = useState({
    name: plan.name,
    price: plan.price,
    speed: plan.speed,
    data_limit: plan.data_limit,
    commitment: plan.commitment
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        price: parseFloat(formData.price)
      };
      await api.put(`/api/plans/${plan.id}`, submitData);
      onSuccess();
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to update plan', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Edit Plan">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plan Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price (₹/month) *
            </label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Speed *
            </label>
            <input
              type="text"
              name="speed"
              value={formData.speed}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Limit *
            </label>
            <input
              type="text"
              name="data_limit"
              value={formData.data_limit}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Commitment Period *
            </label>
            <select
              name="commitment"
              value={formData.commitment}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            >
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly (3 months)</option>
              <option value="Half-Yearly">Half-Yearly (6 months)</option>
              <option value="Yearly">Yearly (12 months)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader className="w-4 h-4 animate-spin" />
                Updating...
              </span>
            ) : (
              'Update Plan'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ============================================
// ENGINEERS TAB
// ============================================

const EngineersTab = ({ engineers, onRefresh, showToast }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEngineer, setSelectedEngineer] = useState(null);

  const handleEditEngineer = (engineer) => {
    setSelectedEngineer(engineer);
    setShowEditModal(true);
  };

  const handleDeleteEngineer = async (engineerId) => {
    if (!window.confirm('Are you sure you want to delete this engineer?')) return;

    try {
      await api.delete(`/api/engineers/${engineerId}`);
      showToast('Engineer deleted successfully', 'success');
      onRefresh();
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to delete engineer', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Field Engineers</h1>
          <p className="text-gray-600 mt-1">{engineers.length} total engineers</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Engineer
          </Button>
        </div>
      </div>

      {/* Engineers Grid */}
      {engineers.length === 0 ? (
        <Card className="p-12">
          <EmptyState
            icon={Wrench}
            title="No engineers yet"
            description="Add your first field engineer to manage installations"
            action={<Button onClick={() => setShowAddModal(true)}>Add Engineer</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {engineers.map((engineer) => (
            <Card key={engineer.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Wrench className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{engineer.name}</h3>
                    <Badge variant={engineer.status === 'Active' ? 'success' : 'danger'}>
                      {engineer.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditEngineer(engineer)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteEngineer(engineer.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{engineer.mobile}</span>
                </div>
                {engineer.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">{engineer.email}</span>
                  </div>
                )}
                {engineer.specialization && (
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">{engineer.specialization}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">Joined: {engineer.joining_date}</span>
                </div>
                {engineer.emergency_contact && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">Emergency: {engineer.emergency_contact}</span>
                  </div>
                )}
                {engineer.address && (
                  <div className="flex items-start gap-2 pt-2 border-t border-gray-200">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                    <span className="text-gray-700 text-xs">{engineer.address}</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddEngineerModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            onRefresh();
            showToast('Engineer added successfully', 'success');
          }}
          showToast={showToast}
        />
      )}

      {showEditModal && selectedEngineer && (
        <EditEngineerModal
          engineer={selectedEngineer}
          onClose={() => {
            setShowEditModal(false);
            setSelectedEngineer(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedEngineer(null);
            onRefresh();
            showToast('Engineer updated successfully', 'success');
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
};

// ============================================
// ADD ENGINEER MODAL
// ============================================

const AddEngineerModal = ({ onClose, onSuccess, showToast }) => {
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    password: '',
    email: '',
    specialization: '',
    status: 'Active',
    joining_date: new Date().toISOString().split('T')[0],
    emergency_contact: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/api/engineers', formData);
      onSuccess();
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to add engineer', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Add New Engineer" size="max-w-3xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Ravi Kumar"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mobile Number *
            </label>
            <input
              type="tel"
              name="mobile"
              value={formData.mobile}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="9876543210"
              maxLength="10"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Minimum 6 characters"
              minLength="6"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email (Optional)
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="ravi@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Specialization
            </label>
            <input
              type="text"
              name="specialization"
              value={formData.specialization}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Fiber Optic Installation"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status *
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="On Leave">On Leave</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Joining Date *
            </label>
            <input
              type="date"
              name="joining_date"
              value={formData.joining_date}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Emergency Contact
            </label>
            <input
              type="tel"
              name="emergency_contact"
              value={formData.emergency_contact}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="9876543211"
              maxLength="10"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Full address"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader className="w-4 h-4 animate-spin" />
                Adding...
              </span>
            ) : (
              'Add Engineer'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ============================================
// EDIT ENGINEER MODAL
// ============================================

const EditEngineerModal = ({ engineer, onClose, onSuccess, showToast }) => {
  const [formData, setFormData] = useState({
    name: engineer.name,
    mobile: engineer.mobile,
    email: engineer.email || '',
    specialization: engineer.specialization || '',
    status: engineer.status,
    joining_date: engineer.joining_date,
    emergency_contact: engineer.emergency_contact || '',
    address: engineer.address || ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.put(`/api/engineers/${engineer.id}`, formData);
      onSuccess();
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to update engineer', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Edit Engineer" size="max-w-3xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mobile Number *
            </label>
            <input
              type="tel"
              name="mobile"
              value={formData.mobile}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              maxLength="10"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Specialization
            </label>
            <input
              type="text"
              name="specialization"
              value={formData.specialization}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status *
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="On Leave">On Leave</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Joining Date *
            </label>
            <input
              type="date"
              name="joining_date"
              value={formData.joining_date}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Emergency Contact
            </label>
            <input
              type="tel"
              name="emergency_contact"
              value={formData.emergency_contact}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              maxLength="10"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader className="w-4 h-4 animate-spin" />
                Updating...
              </span>
            ) : (
              'Update Engineer'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};




// ============================================
// BILLING TAB
// ============================================

const BillingTab = ({ billingHistory, users, plans, onRefresh, showToast }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month
  const [changeTypeFilter, setChangeTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('date_desc'); // date_desc, date_asc, customer

  // Debounced search
  const debouncedSearchTerm = useDebounce(searchTerm);

  // Create user and plan lookup maps for O(1) access instead of O(n) find()
  const userMap = useMemo(() => {
    return users.reduce((map, user) => {
      map[user.id] = user;
      return map;
    }, {});
  }, [users]);

  const planMap = useMemo(() => {
    return plans.reduce((map, plan) => {
      map[plan.id] = plan;
      return map;
    }, {});
  }, [plans]);

  // Helper function to get change type label
  const getChangeTypeLabel = (changeType) => {
    const labels = {
      payment_status: 'Payment Status',
      plan_change: 'Plan Change',
      amount_adjustment: 'Amount Adjustment',
      renewal: 'Plan Renewal',
    };
    return labels[changeType] || changeType;
  };

  // Filter by date range
  const filterByDate = useCallback((record) => {
    if (dateFilter === 'all') return true;

    const recordDate = new Date(record.changed_at);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (dateFilter) {
      case 'today':
        return recordDate >= today;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return recordDate >= weekAgo;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return recordDate >= monthAgo;
      default:
        return true;
    }
  }, [dateFilter]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, dateFilter, changeTypeFilter]);

  // Memoized filtered and sorted history
  const { filteredHistory, statistics } = useMemo(() => {
    let filtered = billingHistory.filter(record => {
      const user = userMap[record.user_id];
      const matchesSearch =
        (user && user.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
        (user && user.cs_id.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
        record.admin_email.toLowerCase().includes(debouncedSearchTerm.toLowerCase());

      const matchesChangeType = changeTypeFilter === 'all' || record.change_type === changeTypeFilter;
      const matchesDate = filterByDate(record);

      return matchesSearch && matchesChangeType && matchesDate;
    });

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'date_desc') {
        return new Date(b.changed_at) - new Date(a.changed_at);
      } else if (sortBy === 'date_asc') {
        return new Date(a.changed_at) - new Date(b.changed_at);
      } else if (sortBy === 'customer') {
        const userA = userMap[a.user_id];
        const userB = userMap[b.user_id];
        const nameA = userA ? userA.name : '';
        const nameB = userB ? userB.name : '';
        return nameA.localeCompare(nameB);
      }
      return 0;
    });

    // Calculate statistics
    const stats = {
      total: filtered.length,
      today: filtered.filter(r => {
        const recordDate = new Date(r.changed_at);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return recordDate >= today;
      }).length,
      paymentChanges: filtered.filter(r => r.change_type === 'payment_status').length,
      planChanges: filtered.filter(r => r.change_type === 'plan_change').length,
    };

    return { filteredHistory: filtered, statistics: stats };
  }, [billingHistory, userMap, debouncedSearchTerm, changeTypeFilter, dateFilter, filterByDate, sortBy]);

  // Pagination
  const { totalPages, paginatedHistory } = useMemo(() => {
    const total = Math.ceil(filteredHistory.length / PAGINATION.ITEMS_PER_PAGE);
    const paginated = filteredHistory.slice(
      (currentPage - 1) * PAGINATION.ITEMS_PER_PAGE,
      currentPage * PAGINATION.ITEMS_PER_PAGE
    );
    return { totalPages: total, paginatedHistory: paginated };
  }, [filteredHistory, currentPage]);

  // Export billing history
  const handleExportBillingHistory = async () => {
    try {
      const response = await api.get('/api/export/billing-history', {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `billing_history_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('Billing history exported successfully', 'success');
    } catch (error) {
      showToast('Failed to export billing history', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Billing History</h1>
          <p className="text-gray-600 mt-1">{billingHistory.length} total records</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="success" onClick={handleExportBillingHistory}>
            <Download className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Export Excel</span>
          </Button>
          <Button variant="outline" onClick={onRefresh}>
            <RefreshCw className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700">Total Changes</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{statistics.total}</p>
            </div>
            <Activity className="w-10 h-10 text-blue-600 opacity-50" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700">Today</p>
              <p className="text-2xl font-bold text-green-900 mt-1">{statistics.today}</p>
            </div>
            <Calendar className="w-10 h-10 text-green-600 opacity-50" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-700">Payment Changes</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">{statistics.paymentChanges}</p>
            </div>
            <DollarSign className="w-10 h-10 text-purple-600 opacity-50" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-700">Plan Changes</p>
              <p className="text-2xl font-bold text-orange-900 mt-1">{statistics.planChanges}</p>
            </div>
            <Package className="w-10 h-10 text-orange-600 opacity-50" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by customer name, ID, or admin email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>

          {/* Change Type Filter */}
          <select
            value={changeTypeFilter}
            onChange={(e) => setChangeTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">All Changes</option>
            <option value="payment_status">Payment Status</option>
            <option value="plan_change">Plan Change</option>
            <option value="amount_adjustment">Amount Adjustment</option>
            <option value="renewal">Renewals</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="customer">By Customer</option>
          </select>
        </div>
      </Card>

      {/* Billing History Table */}
      <Card className="p-6">
        {paginatedHistory.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No billing records found"
            description={searchTerm ? "Try adjusting your search" : "Billing changes will appear here"}
          />
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block lg:hidden space-y-4">
              {paginatedHistory.map((record) => {
                const user = userMap[record.user_id];
                const oldPlan = planMap[record.old_plan_id];
                const newPlan = planMap[record.new_plan_id];

                return (
                  <div key={record.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user ? user.name : 'Unknown'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {user ? user.cs_id : 'N/A'}
                        </div>
                      </div>
                      <Badge variant={
                        record.change_type === 'payment_status' ? 'info' :
                        record.change_type === 'plan_change' ? 'warning' : 'default'
                      }>
                        {getChangeTypeLabel(record.change_type)}
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Date:</span>
                        <p className="font-medium text-gray-900">{formatDateTime(record.changed_at)}</p>
                      </div>
                      {record.old_payment_status && record.new_payment_status && (
                        <div>
                          <span className="text-gray-600">Payment Status:</span>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="warning">{record.old_payment_status}</Badge>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                            <Badge variant="success">{record.new_payment_status}</Badge>
                          </div>
                        </div>
                      )}
                      {oldPlan && newPlan && (
                        <div>
                          <span className="text-gray-600">Plan Change:</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-gray-600 text-xs">{oldPlan.name}</span>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-900 font-medium text-xs">{newPlan.name}</span>
                          </div>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-600">Admin:</span>
                        <p className="font-medium text-gray-900 text-xs truncate">{record.admin_email}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Change Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan Change
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Admin
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedHistory.map((record) => {
                    const user = userMap[record.user_id];
                    const oldPlan = planMap[record.old_plan_id];
                    const newPlan = planMap[record.new_plan_id];

                    return (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDateTime(record.changed_at)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {user ? user.name : 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user ? user.cs_id : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={
                            record.change_type === 'payment_status' ? 'info' :
                            record.change_type === 'plan_change' ? 'warning' : 'default'
                          }>
                            {getChangeTypeLabel(record.change_type)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {record.old_payment_status && record.new_payment_status && (
                            <div className="flex items-center gap-2">
                              <Badge variant="warning">{record.old_payment_status}</Badge>
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                              <Badge variant="success">{record.new_payment_status}</Badge>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {oldPlan && newPlan && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600">{oldPlan.name}</span>
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-900 font-medium">{newPlan.name}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{record.admin_email}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
                <p className="text-sm text-gray-500">
                  Showing {((currentPage - 1) * PAGINATION.ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * PAGINATION.ITEMS_PER_PAGE, filteredHistory.length)} of {filteredHistory.length} records
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
          </>
        )}
      </Card>
    </div>
  );
};

// ============================================
// NOTIFICATIONS TAB
// ============================================

const NotificationsTab = ({ users, plans, showToast }) => {
  const [loading, setLoading] = useState(false);

  const handleSendAllNotifications = async () => {
    if (!window.confirm('Send notifications to all pending users?')) return;

    setLoading(true);
    try {
      const response = await api.post('/api/notifications/send-all');
      showToast(response.data.message || 'Notifications sent successfully', 'success');
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to send notifications', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckExpiredPlans = async () => {
    if (!window.confirm('Check and update all expired plans?')) return;

    setLoading(true);
    try {
      const response = await api.post('/api/users/check-expired-plans');
      showToast(response.data.message || 'Plans checked successfully', 'success');
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to check plans', 'error');
    } finally {
      setLoading(false);
    }
  };

  const pendingPayments = users.filter(u => u.payment_status === 'Pending').length;
  const expiringToday = users.filter(u => {
    const expiryDate = new Date(u.plan_expiry_date);
    const today = new Date();
    return expiryDate.toDateString() === today.toDateString();
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Notifications & Automation</h1>
        <p className="text-gray-600 mt-1">Manage notifications and automated tasks</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Send className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Send Notifications</h3>
              <p className="text-sm text-gray-600">Send payment reminders to all pending users</p>
            </div>
          </div>
          <Button 
            onClick={handleSendAllNotifications} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader className="w-4 h-4 animate-spin" />
                Sending...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Bell className="w-4 h-4" />
                Send All Notifications
              </span>
            )}
          </Button>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Check Expired Plans</h3>
              <p className="text-sm text-gray-600">Update status for all expired plans</p>
            </div>
          </div>
          <Button 
            onClick={handleCheckExpiredPlans} 
            disabled={loading}
            variant="danger"
            className="w-full"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader className="w-4 h-4 animate-spin" />
                Checking...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Check Expired Plans
              </span>
            )}
          </Button>
        </Card>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-700">Pending Payments</p>
              <p className="text-3xl font-bold text-yellow-900 mt-1">{pendingPayments}</p>
              <p className="text-xs text-yellow-700 mt-2">Users need payment reminder</p>
            </div>
            <Clock className="w-12 h-12 text-yellow-600 opacity-50" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700">Expiring Today</p>
              <p className="text-3xl font-bold text-red-900 mt-1">{expiringToday}</p>
              <p className="text-xs text-red-700 mt-2">Plans expiring today</p>
            </div>
            <Calendar className="w-12 h-12 text-red-600 opacity-50" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700">Total Users</p>
              <p className="text-3xl font-bold text-blue-900 mt-1">{users.length}</p>
              <p className="text-xs text-blue-700 mt-2">Active customers</p>
            </div>
            <Users className="w-12 h-12 text-blue-600 opacity-50" />
          </div>
        </Card>
      </div>

      {/* Automated Tasks Schedule */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Automated Schedule</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">Plan Expiry Check</p>
                <p className="text-sm text-gray-600">Runs daily at 12:05 AM</p>
              </div>
            </div>
            <Badge variant="info">Daily</Badge>
          </div>

          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-gray-900">Database Backup</p>
                <p className="text-sm text-gray-600">Runs daily at 2:00 AM</p>
              </div>
            </div>
            <Badge variant="success">Daily</Badge>
          </div>

          <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-orange-600" />
              <div>
                <p className="font-medium text-gray-900">Payment Reminders</p>
                <p className="text-sm text-gray-600">Runs daily at 10:00 AM</p>
              </div>
            </div>
            <Badge variant="warning">Daily</Badge>
          </div>
        </div>
      </Card>
    </div>
  );
};

// ============================================
// SETTINGS TAB
// ============================================

const SettingsTab = ({ showToast }) => {
  const [emailLoading, setEmailLoading] = useState(false);
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [dbInfo, setDbInfo] = useState(null);

  useEffect(() => {
    fetchDatabaseInfo();
  }, []);

  const fetchDatabaseInfo = async () => {
    try {
      const response = await api.get('/api/system/database-info');
      setDbInfo(response.data);
    } catch (error) {
      console.error('Failed to fetch database info:', error);
    }
  };

  const handleTestEmail = async () => {
    setEmailLoading(true);
    try {
      const response = await api.get('/api/system/test-email');
      showToast(response.data.message || 'Email test successful', 'success');
    } catch (error) {
      showToast(error.response?.data?.detail || 'Email test failed', 'error');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleTestWhatsApp = async () => {
    setWhatsappLoading(true);
    try {
      const response = await api.get('/api/system/test-whatsapp');
      showToast(response.data.message || 'WhatsApp test successful', 'success');
    } catch (error) {
      showToast(error.response?.data?.detail || 'WhatsApp test failed', 'error');
    } finally {
      setWhatsappLoading(false);
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
      
      showToast('Users exported successfully', 'success');
    } catch (error) {
      showToast('Failed to export users', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">System Configuration</h1>
        <p className="text-gray-600 mt-1">Manage system settings and integrations</p>
      </div>

      {/* Email Configuration */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6 text-orange-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Email Configuration</h3>
              <p className="text-sm text-gray-600">Test email notification system</p>
            </div>
          </div>
          <Button 
            onClick={handleTestEmail} 
            disabled={emailLoading}
            variant="outline"
          >
            {emailLoading ? (
              <span className="flex items-center gap-2">
                <Loader className="w-4 h-4 animate-spin" />
                Testing...
              </span>
            ) : (
              'Test Email'
            )}
          </Button>
        </div>
        <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
          <p className="text-sm text-green-800">✓ Email service is configured and ready</p>
        </div>
      </Card>

      {/* WhatsApp Configuration */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-6 h-6 text-orange-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">WhatsApp Configuration</h3>
              <p className="text-sm text-gray-600">Test WhatsApp notification system</p>
            </div>
          </div>
          <Button 
            onClick={handleTestWhatsApp} 
            disabled={whatsappLoading}
            variant="outline"
          >
            {whatsappLoading ? (
              <span className="flex items-center gap-2">
                <Loader className="w-4 h-4 animate-spin" />
                Testing...
              </span>
            ) : (
              'Test WhatsApp'
            )}
          </Button>
        </div>
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
          <p className="text-sm text-blue-800">ℹ Provider: Twilio (configured in .env)</p>
        </div>
      </Card>

      {/* Database Info */}
      {dbInfo && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-6 h-6 text-orange-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Database Information</h3>
              <p className="text-sm text-gray-600">Current database statistics</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Database Type</p>
              <p className="text-lg font-semibold text-gray-900">{dbInfo.type}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-lg font-semibold text-gray-900">{dbInfo.total_users}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Plans</p>
              <p className="text-lg font-semibold text-gray-900">{dbInfo.total_plans}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Engineers</p>
              <p className="text-lg font-semibold text-gray-900">{dbInfo.total_engineers}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Database Size</p>
              <p className="text-lg font-semibold text-gray-900">{dbInfo.size}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Last Backup</p>
              <p className="text-lg font-semibold text-gray-900">{dbInfo.last_backup}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Data Export */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <FileSpreadsheet className="w-6 h-6 text-orange-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Data Export</h3>
            <p className="text-sm text-gray-600">Download user data as Excel file</p>
          </div>
        </div>
        <Button onClick={handleExportUsers}>
          <Download className="w-4 h-4 mr-2" />
          Download Users Excel
        </Button>
      </Card>

      {/* Security Checklist */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-6 h-6 text-orange-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Security Checklist</h3>
            <p className="text-sm text-gray-600">Important security configurations</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm text-gray-900">JWT Authentication Enabled</span>
            </div>
            <Badge variant="success">Active</Badge>
          </div>
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm text-gray-900">Rate Limiting Enabled</span>
            </div>
            <Badge variant="success">Active</Badge>
          </div>
          <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <span className="text-sm text-gray-900">Change Default Admin Password</span>
            </div>
            <Badge variant="warning">Recommended</Badge>
          </div>
          <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <span className="text-sm text-gray-900">Enable HTTPS in Production</span>
            </div>
            <Badge variant="warning">Recommended</Badge>
          </div>
        </div>
      </Card>
    </div>
  );
};

// ============================================
// EXPORT WITH ERROR BOUNDARY
// ============================================

const AppWithErrorBoundary = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

export default AppWithErrorBoundary;


