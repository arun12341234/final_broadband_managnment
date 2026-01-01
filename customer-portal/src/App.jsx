import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import api from './api';
import { useAuth } from './hooks/useAuth';
import { useDebounce } from './hooks/useDebounce';
import {
  getErrorMessage,
  formatDate,
  formatRelativeDate,
  getDaysUntil,
  formatPhone,
  formatCurrency,
  sanitizeInput,
  copyToClipboard,
  toBoolean,
  safeGet
} from './utils/helpers';
import {
  TOAST,
  PAGINATION,
  DATE_THRESHOLDS,
  VALIDATION,
  PAYMENT_METHODS,
  BILL_STATUS,
  SUPPORT,
  TABS,
  SORT_OPTIONS,
  FILTER_OPTIONS
} from './utils/constants';
import {
  validateMobile,
  validatePassword,
  validatePaymentMethod,
  validateUserData,
  validateBillsData,
  sanitizeMobile
} from './utils/validation';
import {
  Wifi, LogOut, CreditCard, FileText, User, Phone, Mail, MapPin,
  Calendar, DollarSign, CheckCircle, AlertTriangle, X, Loader,
  Download, ArrowRight, Clock, Zap, Database, TrendingUp,
  Home, Receipt, Settings, RefreshCw, Info, ExternalLink, Eye, EyeOff, Copy
} from 'lucide-react';

// ============================================
// ERROR BOUNDARY COMPONENT
// ============================================

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 text-center mb-4">
              An unexpected error occurred. Please refresh the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================
// UTILITY COMPONENTS
// ============================================

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = 'primary', disabled = false, className = '', type = 'button', ariaLabel }) => {
  const variants = {
    primary: 'bg-orange-600 hover:bg-orange-700 text-white focus-visible:ring-orange-500',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800 focus-visible:ring-gray-400',
    success: 'bg-green-600 hover:bg-green-700 text-white focus-visible:ring-green-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus-visible:ring-red-500',
    outline: 'border-2 border-orange-600 text-orange-600 hover:bg-orange-50 focus-visible:ring-orange-500'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] focus-visible:ring-2 focus-visible:ring-offset-2 ${variants[variant]} ${className}`}
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

  // Ensure message is always a string to prevent React errors
  const safeMessage = typeof message === 'string' ? message : getErrorMessage(message);

  return (
    <div
      className={`toast toast-${type}`}
      role="alert"
      aria-live={type === 'error' || type === 'warning' ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <div className="flex items-center gap-3">
        {icons[type]}
        <p className="flex-1 text-sm text-gray-700">{safeMessage}</p>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 icon-btn"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const LoadingSpinner = ({ size = 'default' }) => {
  const sizes = {
    small: 'w-4 h-4',
    default: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  return (
    <div className="flex items-center justify-center py-12" role="status" aria-label="Loading">
      <Loader className={`${sizes[size]} text-orange-600 animate-spin`} />
    </div>
  );
};

const SkeletonCard = () => (
  <div
    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse"
    role="status"
    aria-label="Loading content"
    aria-live="polite"
  >
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    <span className="sr-only">Loading...</span>
  </div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  const modalRef = React.useRef(null);
  const previousActiveElementRef = React.useRef(null);

  // Focus trap and focus restoration
  useEffect(() => {
    if (!isOpen) return;

    // Save the currently focused element before opening modal
    previousActiveElementRef.current = document.activeElement;

    const modal = modalRef.current;
    if (!modal) return;

    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element
    firstElement?.focus();

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          e.preventDefault();
        }
      }
    };

    const handleEscapeKey = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleTabKey);
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('keydown', handleTabKey);
      document.removeEventListener('keydown', handleEscapeKey);

      // Restore focus to the element that was focused before modal opened
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
        previousActiveElementRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="flex items-center justify-center min-h-screen px-4 py-4">
        <div className="fixed inset-0 bg-black opacity-50" onClick={onClose} aria-hidden="true"></div>
        <div
          ref={modalRef}
          className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto my-4"
        >
          <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between z-10">
            <h3 id="modal-title" className="text-base sm:text-lg font-semibold text-gray-900 pr-4">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 icon-btn"
              aria-label="Close modal"
            >
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

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, loading = false }) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <p className="text-gray-700">{message}</p>
        <div className="flex gap-3 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1" disabled={loading}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm} className="flex-1" disabled={loading}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader className="w-4 h-4 animate-spin" />
                Confirming...
              </span>
            ) : (
              'Confirm'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ============================================
// MAIN APP COMPONENT
// ============================================

function App() {
  const { isAuthenticated, loading: authLoading, login, logout } = useAuth();
  const [activeTab, setActiveTab] = useState(TABS.HOME);
  const [toast, setToast] = useState(null);
  const [userData, setUserData] = useState(null);
  const [bills, setBills] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Toast notification function - defined early to avoid dependency issues
  const showToast = useCallback((message, type = 'success') => {
    const safeMessage = typeof message === 'string' ? message : getErrorMessage(message);
    setToast({ message: safeMessage, type });
  }, []);

  // Listen for auth logout events from api.js
  useEffect(() => {
    const handleAuthLogout = (event) => {
      if (event.detail?.reason === 'token_expired') {
        showToast('Your session has expired. Please login again.', 'warning');
      }
      logout();
    };

    window.addEventListener('auth:logout', handleAuthLogout);
    return () => window.removeEventListener('auth:logout', handleAuthLogout);
  }, [logout, showToast]);

  const fetchUserData = useCallback(async () => {
    try {
      const [profileRes, billsRes, plansRes] = await Promise.allSettled([
        api.get('/api/customer/me'),
        api.get('/api/customer/bills'),
        api.get('/api/plans')
      ]);

      // Check if critical profile endpoint failed
      if (profileRes.status === 'rejected') {
        console.error('Failed to load profile:', profileRes.reason);
        const errorMsg = getErrorMessage(profileRes.reason?.response?.data?.detail || profileRes.reason);
        showToast(`Failed to load profile: ${errorMsg}`, 'error');
        // Don't continue if profile failed - it's critical
        logout();
        return;
      }

      // Validate and set user data
      const userData = profileRes.value.data;
      const validation = validateUserData(userData);

      if (validation.valid) {
        setUserData(userData);
      } else {
        console.error('Invalid user data:', validation.error);
        showToast('Failed to load profile data', 'error');
        logout();
        return;
      }

      // Validate and set bills (non-critical - continue on failure)
      if (billsRes.status === 'fulfilled') {
        const billsData = billsRes.value.data;
        let billsArray = [];

        if (Array.isArray(billsData)) {
          billsArray = billsData;
        } else if (billsData && Array.isArray(billsData.bills)) {
          billsArray = billsData.bills;
        }

        const billsValidation = validateBillsData(billsArray);
        if (billsValidation.valid) {
          setBills(billsArray);
        } else {
          console.error('Invalid bills data:', billsValidation.error);
          setBills([]);
        }
      } else {
        console.warn('Failed to load bills:', billsRes.reason);
        setBills([]);
      }

      // Set plans (non-critical - continue on failure)
      if (plansRes.status === 'fulfilled') {
        const plansData = plansRes.value.data;
        setPlans(Array.isArray(plansData) ? plansData : []);
      } else {
        console.warn('Failed to load plans:', plansRes.reason);
        setPlans([]);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      showToast(getErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, logout]);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      fetchUserData();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [isAuthenticated, authLoading, fetchUserData]);

  const handleLogin = async (mobile, password, rememberMe) => {
    try {
      const sanitizedMobile = sanitizeMobile(mobile);
      const response = await api.post('/api/customer/login', {
        mobile: sanitizedMobile,
        password: sanitizeInput(password)
      });

      login(response.data.access_token, rememberMe);
      await fetchUserData();
      showToast('Welcome back!', 'success');
    } catch (error) {
      const errorMsg = getErrorMessage(error.response?.data?.detail || error);
      showToast(errorMsg, 'error');
      throw error;
    }
  };

  const handleLogoutConfirm = useCallback(() => {
    logout();
    setUserData(null);
    setBills([]);
    setPlans([]);
    setActiveTab(TABS.HOME);
    setShowLogoutConfirm(false);
    showToast('Logged out successfully', 'info');
  }, [logout, showToast]);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} showToast={showToast} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header userName={userData?.name} onLogout={() => setShowLogoutConfirm(true)} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* Skip to main content link for accessibility */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        {/* Header */}
        <Header userName={userData?.name} onLogout={() => setShowLogoutConfirm(true)} />

        {/* Navigation Tabs */}
        <NavigationTabs activeTab={activeTab} onTabChange={handleTabChange} />

        {/* Main Content */}
        <main
          id="main-content"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"
          role="main"
          aria-busy={loading}
        >
          {activeTab === TABS.HOME && (
            <div role="tabpanel" id="home-panel" aria-labelledby="home-tab">
              <DashboardTab
                userData={userData}
                bills={bills}
                plans={plans}
                onRefresh={fetchUserData}
                showToast={showToast}
                onNavigate={handleTabChange}
              />
            </div>
          )}
          {activeTab === TABS.BILLS && (
            <div role="tabpanel" id="bills-panel" aria-labelledby="bills-tab">
              <BillsTab
                bills={bills}
                userData={userData}
                onRefresh={fetchUserData}
                showToast={showToast}
              />
            </div>
          )}
          {activeTab === TABS.PROFILE && (
            <div role="tabpanel" id="profile-panel" aria-labelledby="profile-tab">
              <ProfileTab userData={userData} showToast={showToast} />
            </div>
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

        {/* Logout Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showLogoutConfirm}
          onClose={() => setShowLogoutConfirm(false)}
          onConfirm={handleLogoutConfirm}
          title="Confirm Logout"
          message="Are you sure you want to logout?"
        />
      </div>
    </ErrorBoundary>
  );
}

// ============================================
// HEADER COMPONENT
// ============================================

const Header = ({ userName, onLogout }) => (
  <header className="bg-gradient-to-r from-orange-500 to-orange-600 text-white sticky top-0 z-10 shadow-lg">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between h-16">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
            <Wifi className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-lg font-bold">4You Broadband</h1>
            <p className="text-xs text-orange-100">Customer Portal</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 hover:bg-white hover:bg-opacity-20 px-3 py-2 rounded-lg transition-colors min-h-[44px]"
          aria-label="Logout"
        >
          <LogOut className="w-5 h-5" aria-hidden="true" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </div>
  </header>
);

// ============================================
// NAVIGATION TABS COMPONENT
// ============================================

const NavigationTabs = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: TABS.HOME, label: 'Dashboard', icon: Home },
    { id: TABS.BILLS, label: 'My Bills', icon: Receipt },
    { id: TABS.PROFILE, label: 'Profile', icon: Settings }
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-16 z-10" role="tablist" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              id={`${tab.id}-tab`}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`${tab.id}-panel`}
              onClick={() => onTabChange(tab.id)}
              className="tab-button"
            >
              <tab.icon className="w-4 h-4 inline mr-2" aria-hidden="true" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

// ============================================
// LOGIN SCREEN
// ============================================

const LoginScreen = ({ onLogin, showToast }) => {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Rate limiting check
    if (loginAttempts >= 5) {
      setIsRateLimited(true);
      setError('Too many login attempts. Please wait 15 minutes and try again.');
      setTimeout(() => {
        setLoginAttempts(0);
        setIsRateLimited(false);
      }, 15 * 60 * 1000); // 15 minutes
      return;
    }

    // Validate mobile
    const mobileValidation = validateMobile(mobile);
    if (!mobileValidation.valid) {
      setError(mobileValidation.error);
      return;
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.error);
      return;
    }

    setLoading(true);

    try {
      await onLogin(mobile, password, rememberMe);
      setLoginAttempts(0);
    } catch (err) {
      setLoginAttempts(prev => prev + 1);
      const errorMsg = getErrorMessage(err.response?.data?.detail || err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleMobileChange = (e) => {
    const value = sanitizeMobile(e.target.value);
    setMobile(value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo Card */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4 shadow-lg">
            <Wifi className="w-10 h-10 text-orange-600" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">4You Broadband</h1>
          <p className="text-orange-100">Customer Portal</p>
        </div>

        {/* Login Card */}
        <Card className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Login</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="mobile-input" className="label">Mobile Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" aria-hidden="true" />
                <input
                  id="mobile-input"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  value={mobile}
                  onChange={handleMobileChange}
                  className="input pl-10"
                  placeholder="9876543210"
                  maxLength="10"
                  required
                  autoComplete="tel"
                  aria-describedby="mobile-hint"
                />
              </div>
              <p id="mobile-hint" className="sr-only">Enter your 10-digit mobile number</p>
            </div>

            <div>
              <label htmlFor="password-input" className="label">Password</label>
              <div className="relative">
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-12"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  minLength={VALIDATION.PASSWORD_MIN_LENGTH}
                  maxLength={VALIDATION.PASSWORD_MAX_LENGTH}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 icon-btn"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                Remember me
              </label>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2" role="alert">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" disabled={loading || isRateLimited} className="w-full">
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

          <div className="mt-4 text-center">
            <button
              type="button"
              className="text-sm text-orange-600 hover:text-orange-700 focus-visible:ring-2 focus-visible:ring-orange-500 rounded px-2 py-1"
              onClick={() => showToast('Please contact support at ' + SUPPORT.PHONE + ' to reset your password.', 'info')}
            >
              Forgot Password?
            </button>
          </div>

          <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-900 font-medium mb-2">📱 First Time Login?</p>
            <p className="text-xs text-orange-800">Use your registered mobile number and the password provided by our engineer during installation.</p>
          </div>
        </Card>

        {/* Help Text */}
        <div className="text-center mt-6">
          <p className="text-white text-sm">
            Need help? Contact: <strong>{SUPPORT.PHONE}</strong>
          </p>
        </div>
      </div>
    </div>
  );
};

// ============================================
// DASHBOARD TAB
// ============================================

const DashboardTab = ({ userData, bills, plans, onRefresh, showToast, onNavigate }) => {
  const [refreshing, setRefreshing] = useState(false);
  const lastRefreshRef = useRef(0);

  // Safe data with null checks
  const safeBills = useMemo(() => Array.isArray(bills) ? bills : [], [bills]);
  const safePlans = useMemo(() => Array.isArray(plans) ? plans : [], [plans]);

  // Find user's plan
  const userPlan = useMemo(() => {
    if (!userData?.plan_id) return null;
    return safePlans.find(p => p.id === userData.plan_id) || null;
  }, [userData, safePlans]);

  // Calculate dates safely
  const dateMetrics = useMemo(() => {
    const daysUntilExpiry = getDaysUntil(userData?.plan_expiry_date);
    const isExpiringSoon = daysUntilExpiry <= DATE_THRESHOLDS.PLAN_EXPIRY_WARNING_DAYS && daysUntilExpiry > 0;
    const isExpired = daysUntilExpiry < 0;

    return { daysUntilExpiry: Math.max(0, daysUntilExpiry), isExpiringSoon, isExpired };
  }, [userData]);

  // Calculate bill metrics
  const billMetrics = useMemo(() => {
    const pendingBills = safeBills.filter(b => b.payment_status === BILL_STATUS.PENDING);
    const totalPending = pendingBills.reduce((sum, bill) => {
      const amount = Number(bill.amount);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    return { pendingBills, totalPending };
  }, [safeBills]);

  const handleRefresh = async () => {
    // Throttle refreshes to prevent spam (3 second minimum between refreshes)
    const now = Date.now();
    if (now - lastRefreshRef.current < 3000) {
      showToast('Please wait before refreshing again', 'warning');
      return;
    }

    lastRefreshRef.current = now;
    setRefreshing(true);
    try {
      await onRefresh();
      showToast('Data refreshed successfully', 'success');
    } catch (error) {
      showToast('Failed to refresh data', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const handleQuickAction = useCallback((action) => {
    if (action === 'pay_bill') {
      onNavigate(TABS.BILLS);
      showToast('Navigate to My Bills to make a payment', 'info');
    } else if (action === 'view_bills') {
      onNavigate(TABS.BILLS);
    }
  }, [onNavigate, showToast]);

  if (!userData) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg p-4 sm:p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-bold mb-2">Welcome, {safeGet(userData, 'name', 'User')}! 👋</h2>
            <div className="flex items-center gap-2">
              <p className="text-sm sm:text-base text-orange-100">Customer ID: {safeGet(userData, 'cs_id', 'N/A')}</p>
              <button
                onClick={async () => {
                  const success = await copyToClipboard(userData.cs_id);
                  showToast(success ? 'Customer ID copied!' : 'Failed to copy', success ? 'success' : 'error');
                }}
                className="text-orange-100 hover:text-white icon-btn p-1"
                aria-label="Copy customer ID"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-white bg-opacity-20 border-white text-white hover:bg-white hover:bg-opacity-30 w-full sm:w-auto flex-shrink-0"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Alert Messages */}
      {dateMetrics.isExpired && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-start gap-3" role="alert">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <h4 className="font-semibold text-red-900">Plan Expired</h4>
            <p className="text-sm text-red-700 mt-1">
              Your plan expired on {formatDate(userData.plan_expiry_date)} ({formatRelativeDate(userData.plan_expiry_date)}). Please renew to continue service.
            </p>
          </div>
        </div>
      )}

      {dateMetrics.isExpiringSoon && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex items-start gap-3" role="alert">
          <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <h4 className="font-semibold text-yellow-900">Plan Expiring Soon</h4>
            <p className="text-sm text-yellow-700 mt-1">
              Your plan will expire {formatRelativeDate(userData.plan_expiry_date)} ({dateMetrics.daysUntilExpiry} {dateMetrics.daysUntilExpiry === 1 ? 'day' : 'days'} remaining). Renew now to avoid service interruption.
            </p>
          </div>
        </div>
      )}

      {userData.payment_status === BILL_STATUS.PENDING && (
        <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg flex items-start gap-3" role="alert">
          <Clock className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <h4 className="font-semibold text-orange-900">Payment Pending</h4>
            <p className="text-sm text-orange-700 mt-1">
              Payment due by {formatDate(userData.payment_due_date)}. Pay now to keep your service active.
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
                {toBoolean(userData.is_plan_active) ? 'Active' : 'Inactive'}
              </p>
            </div>
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
              toBoolean(userData.is_plan_active) ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {toBoolean(userData.is_plan_active) ? (
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" aria-hidden="true" />
              ) : (
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" aria-hidden="true" />
              )}
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs sm:text-sm text-gray-600">Days Remaining</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                {dateMetrics.daysUntilExpiry}
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" aria-hidden="true" />
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-600">Pending Amount</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 truncate">
                {formatCurrency(userData.old_pending_amount || 0)}
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" aria-hidden="true" />
            </div>
          </div>
        </Card>
      </div>

      {/* Current Plan Details */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Current Plan</h3>
          <Badge variant={toBoolean(userData.is_plan_active) ? 'success' : 'danger'}>
            {safeGet(userData, 'status', 'Unknown')}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Wifi className="w-5 h-5 text-gray-400 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm text-gray-600">Plan Name</p>
                <p className="font-medium text-gray-900">
                  {userPlan ? userPlan.name : 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-gray-400 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm text-gray-600">Speed</p>
                <p className="font-medium text-gray-900">
                  {userPlan ? `${userPlan.speed_mbps} Mbps` : 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Database className="w-5 h-5 text-gray-400 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm text-gray-600">Data Limit</p>
                <p className="font-medium text-gray-900">
                  {userPlan ? (userPlan.data_limit_gb ? `${userPlan.data_limit_gb} GB` : 'Unlimited') : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm text-gray-600">Plan Start Date</p>
                <p className="font-medium text-gray-900">{formatDate(userData.plan_start_date)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm text-gray-600">Plan Expiry Date</p>
                <p className="font-medium text-gray-900">{formatDate(userData.plan_expiry_date)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <DollarSign className="w-5 h-5 text-gray-400 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm text-gray-600">Payment Status</p>
                <Badge variant={
                  userData.payment_status === BILL_STATUS.PENDING ? 'warning' :
                  userData.payment_status === BILL_STATUS.VERIFIED_BY_CASH ? 'success' : 'info'
                }>
                  {safeGet(userData, 'payment_status', 'Unknown')}
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
            {safeBills.slice(0, PAGINATION.RECENT_BILLS_DISPLAY).map((bill) => (
              <div key={bill.id || bill.invoice_number} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    bill.payment_status === BILL_STATUS.PENDING ? 'bg-yellow-100' : 'bg-green-100'
                  }`}>
                    <Receipt className={`w-5 h-5 ${
                      bill.payment_status === BILL_STATUS.PENDING ? 'text-yellow-600' : 'text-green-600'
                    }`} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{formatCurrency(bill.amount)}</p>
                    <p className="text-sm text-gray-500">Due: {formatDate(bill.due_date)}</p>
                  </div>
                </div>
                <Badge variant={bill.payment_status === BILL_STATUS.PENDING ? 'warning' : 'success'}>
                  {bill.payment_status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <button
          onClick={() => handleQuickAction('pay_bill')}
          className="p-4 sm:p-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg text-left min-h-[44px] focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
          aria-label="Navigate to pay bill"
        >
          <CreditCard className="w-6 h-6 sm:w-8 sm:h-8 mb-2" aria-hidden="true" />
          <p className="font-semibold text-base sm:text-lg">Pay Bill</p>
          <p className="text-xs sm:text-sm text-orange-100 mt-1">Make a payment now</p>
        </button>
        <button
          onClick={() => handleQuickAction('view_bills')}
          className="p-4 sm:p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg text-left min-h-[44px] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          aria-label="Navigate to view bills"
        >
          <FileText className="w-6 h-6 sm:w-8 sm:h-8 mb-2" aria-hidden="true" />
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
  const safeBills = useMemo(() => Array.isArray(bills) ? bills : [], [bills]);
  const lastRefreshRef = useRef(0);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date_newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const debouncedSearchTerm = useDebounce(searchTerm);

  // Filter, search, and sort bills
  const processedBills = useMemo(() => {
    let filtered = [...safeBills];

    // Search
    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(bill => {
        const amount = String(bill.amount).toLowerCase();
        const dueDate = formatDate(bill.due_date).toLowerCase();
        const status = String(bill.payment_status).toLowerCase();
        return amount.includes(term) || dueDate.includes(term) || status.includes(term);
      });
    }

    // Filter by status (case-insensitive)
    if (filterStatus !== 'all') {
      if (filterStatus === 'pending') {
        filtered = filtered.filter(b => {
          const status = String(b.payment_status || '').toLowerCase();
          return status === BILL_STATUS.PENDING.toLowerCase();
        });
      } else if (filterStatus === 'paid') {
        filtered = filtered.filter(b => {
          const status = String(b.payment_status || '').toLowerCase();
          return status !== BILL_STATUS.PENDING.toLowerCase();
        });
      }
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date_newest':
          return new Date(b.due_date || 0) - new Date(a.due_date || 0);
        case 'date_oldest':
          return new Date(a.due_date || 0) - new Date(b.due_date || 0);
        case 'amount_high':
          return Number(b.amount || 0) - Number(a.amount || 0);
        case 'amount_low':
          return Number(a.amount || 0) - Number(b.amount || 0);
        case 'status_pending': {
          const bPending = String(b.payment_status || '').toLowerCase() === BILL_STATUS.PENDING.toLowerCase();
          const aPending = String(a.payment_status || '').toLowerCase() === BILL_STATUS.PENDING.toLowerCase();
          return (bPending ? 1 : 0) - (aPending ? 1 : 0);
        }
        default:
          return 0;
      }
    });

    return filtered;
  }, [safeBills, debouncedSearchTerm, filterStatus, sortBy]);

  // Pagination
  const paginatedBills = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGINATION.BILLS_PER_PAGE;
    const endIndex = startIndex + PAGINATION.BILLS_PER_PAGE;
    return processedBills.slice(startIndex, endIndex);
  }, [processedBills, currentPage]);

  const totalPages = Math.ceil(processedBills.length / PAGINATION.BILLS_PER_PAGE);

  const handleRefresh = async () => {
    // Throttle refreshes to prevent spam (3 second minimum between refreshes)
    const now = Date.now();
    if (now - lastRefreshRef.current < 3000) {
      showToast('Please wait before refreshing again', 'warning');
      return;
    }

    lastRefreshRef.current = now;
    setRefreshing(true);
    try {
      await onRefresh();
      showToast('Bills refreshed successfully', 'success');
    } catch (error) {
      showToast('Failed to refresh bills', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const handlePayBill = (bill) => {
    setSelectedBill(bill);
    setShowPaymentModal(true);
  };

  const handleDownloadInvoice = async (bill) => {
    if (!bill.id) {
      showToast('Invalid bill ID', 'error');
      return;
    }

    let url = null;
    let link = null;

    try {
      showToast('Downloading invoice...', 'info');
      const response = await api.get(`/api/customer/download-invoice/${bill.id}`, {
        responseType: 'blob'
      });

      url = window.URL.createObjectURL(new Blob([response.data]));
      link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${bill.id}.pdf`);
      document.body.appendChild(link);
      link.click();

      showToast('Invoice downloaded successfully!', 'success');
    } catch (error) {
      const errorMsg = error.response?.status === 404
        ? 'Invoice not found'
        : error.response?.status === 403
        ? 'You do not have permission to download this invoice'
        : getErrorMessage(error);
      showToast(errorMsg, 'error');
    } finally {
      // Always cleanup DOM and memory
      if (link && link.parentNode) {
        link.remove();
      }
      if (url) {
        window.URL.revokeObjectURL(url);
      }
    }
  };

  return (
    <div className="space-y-6" role="region" aria-label="Bills management">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">My Bills</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">{safeBills.length} total bills</p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} className="w-full sm:w-auto">
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
          {refreshing ? 'Refreshing...' : 'Refresh'}
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
            <Receipt className="w-10 h-10 sm:w-12 sm:h-12 text-orange-600 opacity-50" aria-hidden="true" />
          </div>
        </Card>

        <Card className="p-4 sm:p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-yellow-700">Pending</p>
              <p className="text-2xl sm:text-3xl font-bold text-yellow-900 mt-1">
                {safeBills.filter(b => b.payment_status === BILL_STATUS.PENDING).length}
              </p>
            </div>
            <Clock className="w-10 h-10 sm:w-12 sm:h-12 text-yellow-600 opacity-50" aria-hidden="true" />
          </div>
        </Card>

        <Card className="p-4 sm:p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-green-700">Paid</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-900 mt-1">
                {safeBills.filter(b => b.payment_status !== BILL_STATUS.PENDING).length}
              </p>
            </div>
            <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-green-600 opacity-50" aria-hidden="true" />
          </div>
        </Card>
      </div>

      {/* Search, Filter, Sort */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="search-bills" className="label">Search</label>
            <input
              id="search-bills"
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset pagination on search
              }}
              placeholder="Search by amount, date, status..."
              className="input"
            />
          </div>

          <div>
            <label htmlFor="filter-status" className="label">Filter by Status</label>
            <select
              id="filter-status"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1); // Reset pagination on filter
              }}
              className="input"
            >
              {FILTER_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="sort-bills" className="label">Sort by</label>
            <select
              id="sort-bills"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1); // Reset pagination on sort
              }}
              className="input"
            >
              {SORT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Bills List */}
      {safeBills.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No bills yet</h3>
          <p className="text-gray-600">Your billing history will appear here. Bills are generated monthly.</p>
        </Card>
      ) : paginatedBills.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No bills found</h3>
          <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
        </Card>
      ) : (
        <>
          <div className="space-y-4" role="list" aria-label="Bill list">
            {paginatedBills.map((bill) => (
              <Card key={bill.id || bill.invoice_number} className="p-6 hover:shadow-lg transition-shadow" role="listitem">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      bill.payment_status === BILL_STATUS.PENDING ? 'bg-yellow-100' : 'bg-green-100'
                    }`}>
                      <Receipt className={`w-6 h-6 ${
                        bill.payment_status === BILL_STATUS.PENDING ? 'text-yellow-600' : 'text-green-600'
                      }`} aria-hidden="true" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900 text-lg">{formatCurrency(bill.amount)}</h3>
                        <Badge variant={
                          bill.payment_status === BILL_STATUS.PENDING ? 'warning' : 'success'
                        }>
                          {bill.payment_status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" aria-hidden="true" />
                          <span>Due: {formatDate(bill.due_date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" aria-hidden="true" />
                          <span>Period: {safeGet(bill, 'billing_period', 'Current Month')}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    {bill.payment_status === BILL_STATUS.PENDING && (
                      <Button onClick={() => handlePayBill(bill)} className="whitespace-nowrap w-full sm:w-auto">
                        <CreditCard className="w-4 h-4 mr-2" aria-hidden="true" />
                        Pay Now
                      </Button>
                    )}
                    {bill.is_invoice && bill.pdf_available ? (
                      <Button
                        variant="outline"
                        onClick={() => handleDownloadInvoice(bill)}
                        className="whitespace-nowrap w-full sm:w-auto"
                        ariaLabel={`Download invoice ${bill.invoice_number || ''}`}
                      >
                        <Download className="w-4 h-4 mr-2" aria-hidden="true" />
                        Invoice
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        disabled
                        className="whitespace-nowrap w-full sm:w-auto"
                        ariaLabel="Invoice unavailable"
                      >
                        Invoice Unavailable
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2" role="navigation" aria-label="Pagination">
              <Button
                variant="secondary"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                ariaLabel="Previous page"
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="secondary"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                ariaLabel="Next page"
              >
                Next
              </Button>
            </div>
          )}
        </>
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
  const [transactionId, setTransactionId] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validation = validatePaymentMethod(paymentMethod);
    if (!validation.valid) {
      showToast(validation.error, 'warning');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/api/customer/pay-bill', {
        amount: Number(bill.amount),
        payment_method: paymentMethod,
        bill_id: bill.id
      });

      // Show confirmation with transaction ID from backend (never generate client-side)
      setTransactionId(response.data.transaction_id || null);
      setShowConfirmation(true);
    } catch (error) {
      const errorMsg = getErrorMessage(error.response?.data?.detail || error);
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (showConfirmation) {
    return (
      <Modal isOpen={true} onClose={onSuccess} title="Payment Confirmation">
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" aria-hidden="true" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Payment Submitted!</h3>
            <p className="text-gray-600">Your payment has been submitted successfully.</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-3">Transaction Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">Transaction ID:</span>
                <span className="font-mono font-medium text-gray-900 flex items-center gap-2">
                  {transactionId || 'Processing...'}
                  {transactionId && (
                    <button
                      onClick={async () => {
                        const success = await copyToClipboard(transactionId);
                        showToast(success ? 'Transaction ID copied!' : 'Failed to copy', success ? 'success' : 'error');
                      }}
                      className="text-blue-600 hover:text-blue-700 icon-btn p-1"
                      aria-label="Copy transaction ID"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Amount:</span>
                <span className="font-medium text-gray-900">{formatCurrency(bill.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Payment Method:</span>
                <span className="font-medium text-gray-900">{paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Date:</span>
                <span className="font-medium text-gray-900">{formatDate(new Date().toISOString())}</span>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Important:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Payment will be verified within 24 hours</li>
                  <li>• You will receive a confirmation SMS</li>
                  <li>• Save your transaction ID for reference</li>
                  <li>• Contact support if you don't receive confirmation</li>
                </ul>
              </div>
            </div>
          </div>

          <Button onClick={onSuccess} className="w-full">
            Done
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Make Payment">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Bill Summary */}
        <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
          <h4 className="font-semibold text-orange-900 mb-3">Payment Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-700">Customer ID:</span>
              <span className="font-medium text-gray-900">{safeGet(userData, 'cs_id', 'N/A')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Customer Name:</span>
              <span className="font-medium text-gray-900">{safeGet(userData, 'name', 'N/A')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Billing Period:</span>
              <span className="font-medium text-gray-900">{safeGet(bill, 'billing_period', 'Current Month')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Due Date:</span>
              <span className="font-medium text-gray-900">{formatDate(bill.due_date)}</span>
            </div>
            <div className="border-t border-orange-300 pt-2 mt-2 flex justify-between text-base">
              <span className="font-semibold text-gray-900">Total Amount:</span>
              <span className="font-bold text-orange-600 text-xl">{formatCurrency(bill.amount)}</span>
            </div>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Select Payment Method</h4>
          <div className="space-y-3" role="radiogroup" aria-label="Payment method selection">
            {PAYMENT_METHODS.map(method => (
              <button
                key={method.id}
                type="button"
                role="radio"
                aria-checked={paymentMethod === method.id}
                onClick={() => setPaymentMethod(method.id)}
                className={`payment-method ${paymentMethod === method.id ? 'selected' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${
                    method.id === 'UPI' ? 'bg-blue-100' :
                    method.id === 'Card' ? 'bg-green-100' : 'bg-purple-100'
                  } rounded-lg flex items-center justify-center`}>
                    {method.id === 'UPI' && <Phone className="w-5 h-5 text-blue-600" aria-hidden="true" />}
                    {method.id === 'Card' && <CreditCard className="w-5 h-5 text-green-600" aria-hidden="true" />}
                    {method.id === 'NetBanking' && <ExternalLink className="w-5 h-5 text-purple-600" aria-hidden="true" />}
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">{method.name}</p>
                    <p className="text-xs text-gray-600">{method.description}</p>
                  </div>
                </div>
                {paymentMethod === method.id && (
                  <CheckCircle className="w-5 h-5 text-orange-600" aria-hidden="true" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
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
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1" disabled={loading}>
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
                Pay {formatCurrency(bill.amount)}
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

const ProfileTab = ({ userData, showToast }) => {
  if (!userData) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Profile Header */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white text-2xl sm:text-3xl font-bold flex-shrink-0">
            {safeGet(userData, 'name', 'U').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{safeGet(userData, 'name', 'Unknown')}</h2>
            <div className="flex items-center gap-2 justify-center sm:justify-start mt-1">
              <p className="text-sm sm:text-base text-gray-600">Customer ID: {safeGet(userData, 'cs_id', 'N/A')}</p>
              <button
                onClick={async () => {
                  const success = await copyToClipboard(userData.cs_id);
                  showToast(success ? 'Customer ID copied!' : 'Failed to copy', success ? 'success' : 'error');
                }}
                className="text-gray-400 hover:text-gray-600 icon-btn p-1"
                aria-label="Copy customer ID"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <Badge variant={toBoolean(userData.is_plan_active) ? 'success' : 'danger'} className="mt-2">
              {safeGet(userData, 'status', 'Unknown')}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Contact Information */}
      <Card className="p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" aria-hidden="true" />
          Contact Information
        </h3>
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-600">Mobile Number</p>
              <p className="font-medium text-sm sm:text-base text-gray-900">{formatPhone(userData.phone || userData.mobile)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-600">Email Address</p>
              <p className="font-medium text-sm sm:text-base text-gray-900 break-all">{safeGet(userData, 'email', 'Not provided')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-600">Address</p>
              <p className="font-medium text-sm sm:text-base text-gray-900">{safeGet(userData, 'address', 'N/A')}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Account Details */}
      <Card className="p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" aria-hidden="true" />
          Account Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Account Created</p>
            <p className="font-medium text-gray-900">{formatDate(userData.created_at)}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Last Renewal</p>
            <p className="font-medium text-gray-900">{formatDate(safeGet(userData, 'last_renewal_date', null)) || 'N/A'}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Plan Start Date</p>
            <p className="font-medium text-gray-900">{formatDate(userData.plan_start_date)}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Plan Expiry Date</p>
            <p className="font-medium text-gray-900">{formatDate(userData.plan_expiry_date)}</p>
          </div>
        </div>
      </Card>

      {/* Support Information */}
      <Card className="p-6 bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
        <h3 className="text-lg font-semibold text-orange-900 mb-4">Need Help?</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-orange-600" aria-hidden="true" />
            <p className="text-orange-800">
              <strong>Customer Support:</strong> {SUPPORT.PHONE}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-orange-600" aria-hidden="true" />
            <p className="text-orange-800">
              <strong>Email:</strong> {SUPPORT.EMAIL}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-600" aria-hidden="true" />
            <p className="text-orange-800">
              <strong>Hours:</strong> {SUPPORT.HOURS}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

// ============================================
// EXPORT DEFAULT
// ============================================

export default App;
