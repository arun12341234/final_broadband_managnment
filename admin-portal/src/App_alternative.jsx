import React, { useState, useEffect } from 'react';
import { UserCircle, Settings, LogOut, Search, Filter, Plus, Edit2, Trash2, Eye, EyeOff, Download, Upload, FileText, Users, WifiIcon, Wrench, CreditCard, Bell, BarChart3, Calendar, MapPin, Phone, Mail, CheckCircle, XCircle, AlertCircle, Clock, DollarSign, TrendingUp, Menu, X } from 'lucide-react';

// ============================================
// UTILITY COMPONENTS
// ============================================

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-lg shadow-md ${className}`}>
    {children}
  </div>
);

const Button = ({ children, variant = 'primary', size = 'md', onClick, className = '', disabled = false, icon: Icon }) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

  const variants = {
    primary: 'bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-500',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    outline: 'border-2 border-orange-600 text-orange-600 hover:bg-orange-50 focus:ring-orange-500'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {Icon && <Icon className="w-4 h-4 mr-2" />}
      {children}
    </button>
  );
};

const Badge = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className={`inline-block w-full ${sizes[size]} my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-lg shadow-xl`}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="px-6 py-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

const Toast = ({ message, type = 'success', onClose }) => {
  const types = {
    success: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', icon: CheckCircle },
    error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: XCircle },
    warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', icon: AlertCircle },
    info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: Bell }
  };

  const { bg, border, text, icon: Icon } = types[type];

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center p-4 rounded-lg border-l-4 ${bg} ${border} shadow-lg max-w-md`}>
      <Icon className={`w-5 h-5 mr-3 ${text}`} />
      <p className={`flex-1 text-sm font-medium ${text}`}>{message}</p>
      <button onClick={onClose} className={`ml-4 ${text} hover:opacity-70`}>
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// ============================================
// MAIN APP COMPONENT
// ============================================

function App() {
  // ============================================
  // STATE MANAGEMENT
  // ============================================

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Data States
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [billingHistory, setBillingHistory] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddPlanModal, setShowAddPlanModal] = useState(false);
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [toast, setToast] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // ============================================
  // MOCK DATA
  // ============================================

  useEffect(() => {
    // Mock authentication
    setIsLoggedIn(true);
    setCurrentUser({
      name: 'Admin User',
      email: 'admin@4you.in',
      role: 'Administrator'
    });

    // Mock users data
    setUsers([
      {
        id: 1,
        cs_id: 'CS_1001',
        name: 'Rajesh Kumar',
        email: 'rajesh@example.com',
        phone: '9876543210',
        address: '123 MG Road, Mumbai',
        broadband_plan_id: 1,
        plan_expiry_date: '2025-01-15',
        is_plan_active: true,
        payment_status: 'Paid',
        old_pending_amount: 0,
        payment_due_date: null,
        status: 'Active',
        photo: null
      },
      {
        id: 2,
        cs_id: 'CS_1002',
        name: 'Priya Sharma',
        email: 'priya@example.com',
        phone: '9876543211',
        address: '456 Brigade Road, Bangalore',
        broadband_plan_id: 2,
        plan_expiry_date: '2025-01-05',
        is_plan_active: true,
        payment_status: 'Pending',
        old_pending_amount: 500,
        payment_due_date: '2025-01-10',
        status: 'Active',
        photo: null
      },
      {
        id: 3,
        cs_id: 'CS_1003',
        name: 'Amit Patel',
        email: 'amit@example.com',
        phone: '9876543212',
        address: '789 Park Street, Kolkata',
        broadband_plan_id: 3,
        plan_expiry_date: '2024-12-20',
        is_plan_active: false,
        payment_status: 'Pending',
        old_pending_amount: 1200,
        payment_due_date: '2025-01-05',
        status: 'Expired',
        photo: null
      }
    ]);

    // Mock plans data
    setPlans([
      {
        id: 1,
        name: 'Basic',
        price: 599,
        speed: '50 Mbps',
        data_limit: '500 GB',
        description: 'Perfect for browsing and social media'
      },
      {
        id: 2,
        name: 'Standard',
        price: 899,
        speed: '100 Mbps',
        data_limit: '1 TB',
        description: 'Great for streaming and gaming'
      },
      {
        id: 3,
        name: 'Premium',
        price: 1499,
        speed: '300 Mbps',
        data_limit: 'Unlimited',
        description: 'Ultimate speed for power users'
      }
    ]);

    // Mock engineers data
    setEngineers([
      {
        id: 1,
        name: 'Vikram Singh',
        email: 'vikram@4you.in',
        phone: '9123456789',
        area: 'North Mumbai',
        active_tickets: 5,
        status: 'Active'
      },
      {
        id: 2,
        name: 'Suresh Reddy',
        email: 'suresh@4you.in',
        phone: '9123456790',
        area: 'South Mumbai',
        active_tickets: 3,
        status: 'Active'
      }
    ]);

    // Mock billing history
    setBillingHistory([
      {
        id: 1,
        user_id: 1,
        user_name: 'Rajesh Kumar',
        amount: 599,
        payment_method: 'UPI',
        payment_date: '2024-12-01',
        status: 'Success'
      },
      {
        id: 2,
        user_id: 2,
        user_name: 'Priya Sharma',
        amount: 899,
        payment_method: 'Card',
        payment_date: '2024-12-05',
        status: 'Success'
      }
    ]);

    // Mock notifications
    setNotifications([
      {
        id: 1,
        type: 'payment_due',
        user_name: 'Priya Sharma',
        message: 'Payment due in 2 days',
        date: '2025-01-08',
        status: 'Unread'
      },
      {
        id: 2,
        type: 'plan_expiry',
        user_name: 'Amit Patel',
        message: 'Plan expired',
        date: '2024-12-20',
        status: 'Unread'
      }
    ]);
  }, []);

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getPlanName = (planId) => {
    const plan = plans.find(p => p.id === planId);
    return plan ? plan.name : 'No Plan';
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'Active': 'success',
      'Expired': 'danger',
      'Suspended': 'warning',
      'Pending': 'warning'
    };
    return <Badge variant={statusMap[status] || 'default'}>{status}</Badge>;
  };

  const getPaymentStatusBadge = (status) => {
    const statusMap = {
      'Paid': 'success',
      'Pending': 'warning',
      'VerifiedByUpi': 'info',
      'VerifiedByCash': 'info'
    };
    return <Badge variant={statusMap[status] || 'default'}>{status}</Badge>;
  };

  // ============================================
  // DASHBOARD METRICS
  // ============================================

  const getDashboardMetrics = () => {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === 'Active').length;
    const totalRevenue = billingHistory.reduce((sum, b) => sum + b.amount, 0);
    const pendingPayments = users.filter(u => u.payment_status === 'Pending').length;

    return {
      totalUsers,
      activeUsers,
      totalRevenue,
      pendingPayments
    };
  };

  const metrics = getDashboardMetrics();

  // ============================================
  // LOGIN PAGE
  // ============================================

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-400 to-red-600 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
              <WifiIcon className="w-8 h-8 text-orange-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">4You Broadband</h1>
            <p className="text-gray-600 mt-2">Admin Portal</p>
          </div>

          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="admin@4you.in"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            <Button
              variant="primary"
              className="w-full"
              onClick={(e) => {
                e.preventDefault();
                setIsLoggedIn(true);
              }}
            >
              Sign In
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  // ============================================
  // SIDEBAR NAVIGATION
  // ============================================

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'plans', label: 'Plans', icon: WifiIcon },
    { id: 'engineers', label: 'Engineers', icon: Wrench },
    { id: 'billing', label: 'Billing History', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  // ============================================
  // DASHBOARD TAB
  // ============================================

  const DashboardTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <Button variant="primary" icon={Download}>
          Export Report
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.totalUsers}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.activeUsers}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">₹{metrics.totalRevenue.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Payments</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.pendingPayments}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Payments</h3>
          <div className="space-y-3">
            {billingHistory.slice(0, 5).map(bill => (
              <div key={bill.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-gray-900">{bill.user_name}</p>
                  <p className="text-sm text-gray-500">{bill.payment_date}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">₹{bill.amount}</p>
                  <Badge variant="success" className="text-xs">{bill.payment_method}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Notifications</h3>
          <div className="space-y-3">
            {notifications.slice(0, 5).map(notif => (
              <div key={notif.id} className="flex items-start space-x-3 py-2 border-b border-gray-100 last:border-0">
                <Bell className="w-5 h-5 text-orange-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{notif.user_name}</p>
                  <p className="text-sm text-gray-600">{notif.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{notif.date}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );

  // ============================================
  // USERS TAB
  // ============================================

  const UsersTab = () => {
    const filteredUsers = users.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           user.cs_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           user.phone.includes(searchQuery);
      const matchesFilter = filterStatus === 'all' || user.status === filterStatus;
      return matchesSearch && matchesFilter;
    });

    const indexOfLastUser = currentPage * itemsPerPage;
    const indexOfFirstUser = indexOfLastUser - itemsPerPage;
    const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" icon={FileText}>Export Excel</Button>
            <Button variant="primary" icon={Plus} onClick={() => setShowAddUserModal(true)}>
              Add User
            </Button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search users by name, ID, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="Active">Active</option>
            <option value="Expired">Expired</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>

        {/* Users Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentUsers.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                            <span className="text-orange-600 font-medium">{user.name.charAt(0)}</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.cs_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.phone}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{getPlanName(user.broadband_plan_id)}</div>
                      <div className="text-sm text-gray-500">Exp: {user.plan_expiry_date}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPaymentStatusBadge(user.payment_status)}
                      {user.old_pending_amount > 0 && (
                        <div className="text-xs text-red-600 mt-1">Due: ₹{user.old_pending_amount}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(user.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowUserDetailsModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowAddUserModal(true);
                          }}
                          className="text-green-600 hover:text-green-800"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete user ${user.name}?`)) {
                              setUsers(users.filter(u => u.id !== user.id));
                              showToast('User deleted successfully', 'success');
                            }
                          }}
                          className="text-red-600 hover:text-red-800"
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
          <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Showing {indexOfFirstUser + 1} to {Math.min(indexOfLastUser, filteredUsers.length)} of {filteredUsers.length} users
            </div>
            <div className="flex space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  // ============================================
  // PLANS TAB
  // ============================================

  const PlansTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Broadband Plans</h2>
        <Button variant="primary" icon={Plus} onClick={() => setShowAddPlanModal(true)}>
          Add Plan
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map(plan => (
          <Card key={plan.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="text-center mb-4">
              <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
              <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
            </div>

            <div className="text-center py-4 border-y border-gray-200">
              <p className="text-4xl font-bold text-orange-600">₹{plan.price}</p>
              <p className="text-sm text-gray-600 mt-1">per month</p>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Speed:</span>
                <span className="text-sm font-medium text-gray-900">{plan.speed}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Data Limit:</span>
                <span className="text-sm font-medium text-gray-900">{plan.data_limit}</span>
              </div>
            </div>

            <div className="mt-6 flex space-x-2">
              <Button variant="outline" size="sm" className="flex-1" icon={Edit2}>
                Edit
              </Button>
              <Button variant="danger" size="sm" className="flex-1" icon={Trash2}>
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  // ============================================
  // ENGINEERS TAB
  // ============================================

  const EngineersTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Engineers</h2>
        <Button variant="primary" icon={Plus}>Add Engineer</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {engineers.map(engineer => (
          <Card key={engineer.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Wrench className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{engineer.name}</h3>
                  <p className="text-sm text-gray-600">{engineer.area}</p>
                </div>
              </div>
              {getStatusBadge(engineer.status)}
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <Mail className="w-4 h-4 mr-2" />
                {engineer.email}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Phone className="w-4 h-4 mr-2" />
                {engineer.phone}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="w-4 h-4 mr-2" />
                {engineer.area}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active Tickets:</span>
                <Badge variant={engineer.active_tickets > 0 ? 'warning' : 'success'}>
                  {engineer.active_tickets}
                </Badge>
              </div>
            </div>

            <div className="mt-4 flex space-x-2">
              <Button variant="outline" size="sm" className="flex-1" icon={Edit2}>
                Edit
              </Button>
              <Button variant="secondary" size="sm" className="flex-1" icon={Eye}>
                View Tickets
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  // ============================================
  // BILLING HISTORY TAB
  // ============================================

  const BillingTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Billing History</h2>
        <Button variant="outline" icon={Download}>Export Report</Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {billingHistory.map(bill => (
                <tr key={bill.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">#{bill.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bill.user_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">₹{bill.amount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bill.payment_method}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bill.payment_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant="success">{bill.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  // ============================================
  // NOTIFICATIONS TAB
  // ============================================

  const NotificationsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
        <Button variant="outline">Mark All as Read</Button>
      </div>

      <div className="space-y-4">
        {notifications.map(notif => (
          <Card key={notif.id} className={`p-4 ${notif.status === 'Unread' ? 'bg-orange-50 border-l-4 border-orange-500' : ''}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <Bell className={`w-5 h-5 mt-1 ${notif.status === 'Unread' ? 'text-orange-600' : 'text-gray-400'}`} />
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{notif.user_name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                  <p className="text-xs text-gray-500 mt-2">{notif.date}</p>
                </div>
              </div>
              {notif.status === 'Unread' && (
                <Badge variant="warning">New</Badge>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  // ============================================
  // SETTINGS TAB
  // ============================================

  const SettingsTab = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Settings</h2>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
            <input
              type="text"
              defaultValue="4You Broadband"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
            <input
              type="email"
              defaultValue="support@4you.in"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Support Phone</label>
            <input
              type="tel"
              defaultValue="1800-4YOU-NET"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              defaultValue="Mumbai, Maharashtra, India"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
        <div className="mt-6">
          <Button variant="primary">Save Changes</Button>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Email Notifications</p>
              <p className="text-sm text-gray-600">Receive email notifications for important events</p>
            </div>
            <input type="checkbox" defaultChecked className="w-4 h-4 text-orange-600 rounded" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">WhatsApp Notifications</p>
              <p className="text-sm text-gray-600">Send WhatsApp notifications to customers</p>
            </div>
            <input type="checkbox" defaultChecked className="w-4 h-4 text-orange-600 rounded" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Payment Reminders</p>
              <p className="text-sm text-gray-600">Automatically send payment reminders</p>
            </div>
            <input type="checkbox" defaultChecked className="w-4 h-4 text-orange-600 rounded" />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Security</h3>
        <div className="space-y-4">
          <Button variant="outline">Change Password</Button>
          <Button variant="outline">Enable Two-Factor Authentication</Button>
          <Button variant="danger">Sign Out All Devices</Button>
        </div>
      </Card>
    </div>
  );

  // ============================================
  // RENDER MAIN APP
  // ============================================

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 transition-all duration-300`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {sidebarOpen && (
            <div className="flex items-center space-x-2">
              <WifiIcon className="w-8 h-8 text-orange-600" />
              <span className="text-xl font-bold text-gray-900">4You</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <nav className="p-4 space-y-2">
          {navigationItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center ${sidebarOpen ? 'justify-start' : 'justify-center'} space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === item.id
                    ? 'bg-orange-50 text-orange-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                {sidebarOpen && <span className="font-medium">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-gray-200">
          <button
            onClick={() => setIsLoggedIn(false)}
            className={`w-full flex items-center ${sidebarOpen ? 'justify-start' : 'justify-center'} space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors`}
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {navigationItems.find(item => item.id === activeTab)?.label}
              </h1>
              <p className="text-sm text-gray-600 mt-1">Manage your broadband business</p>
            </div>

            <div className="flex items-center space-x-4">
              <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{currentUser?.name}</p>
                  <p className="text-xs text-gray-600">{currentUser?.role}</p>
                </div>
                <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center">
                  <UserCircle className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'plans' && <PlansTab />}
          {activeTab === 'engineers' && <EngineersTab />}
          {activeTab === 'billing' && <BillingTab />}
          {activeTab === 'notifications' && <NotificationsTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </main>
      </div>

      {/* Toast Notifications */}
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

export default App;
