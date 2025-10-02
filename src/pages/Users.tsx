/**
 * Users Management Page
 * Admin interface for managing user accounts, roles, and security
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Upload,
  Download,
  RefreshCw,
  Search,
  Filter,
  Edit,
  Key,
  Unlock,
  UserCheck,
  UserX,
  Trash2,
  Shield,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/utils/cn';
import { 
  userService, 
  UserWithStatus, 
  UserFilters 
} from '@/services/userService';
import { csvService } from '@/services/csvService';
import { auditService } from '@/services/auditService';
import { authService } from '@/services/authService';
import { useAppStore } from '@/store/appStore';
import { Role } from '@/security/permissions';
import RequirePerm from '@/components/Security/RequirePerm';
import UserModal from '@/components/Users/UserModal';
import PinResetDialog from '@/components/Users/PinResetDialog';
import UsersCSVModal from '@/components/Users/UsersCSVModal';

const Users: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAppStore();
  
  const [users, setUsers] = useState<UserWithStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    lockedUsers: 0,
    managerUsers: 0
  });
  
  const [filters, setFilters] = useState<UserFilters>({
    status: 'ALL',
    role: 'ALL'
  });

  // Modal states
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPinResetDialog, setShowPinResetDialog] = useState(false);
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithStatus | null>(null);
  const [editingUser, setEditingUser] = useState<UserWithStatus | null>(null);

  // Authentication check
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    if (!authService.hasPermission('SETTINGS_WRITE')) {
      navigate('/');
      toast.error('Access denied: User management requires admin permissions');
      return;
    }
  }, [currentUser, navigate]);

  // Load users and stats
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersList, userStats] = await Promise.all([
        userService.listUsers(filters),
        userService.getUserStats()
      ]);
      
      setUsers(usersList);
      setStats(userStats);
      
    } catch (error) {
      console.error('Failed to load users data:', error);
      toast.error('Failed to load users data');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Load data on mount and filter changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle user creation
  const handleCreateUser = () => {
    setEditingUser(null);
    setShowUserModal(true);
  };

  // Handle user editing
  const handleEditUser = (user: UserWithStatus) => {
    setEditingUser(user);
    setShowUserModal(true);
  };

  // Handle PIN reset
  const handleResetPin = (user: UserWithStatus) => {
    setSelectedUser(user);
    setShowPinResetDialog(true);
  };

  // Handle lock reset
  const handleResetLock = async (user: UserWithStatus) => {
    if (!confirm(`Reset lockout for ${user.name}?`)) {
      return;
    }

    try {
      await userService.resetLock(user.id);
      toast.success(`Lockout reset for ${user.name}`);
      loadData();
    } catch (error) {
      console.error('Failed to reset lock:', error);
      toast.error('Failed to reset lockout');
    }
  };

  // Handle activate/deactivate
  const handleToggleActive = async (user: UserWithStatus) => {
    const action = user.active ? 'deactivate' : 'activate';
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${user.name}?`)) {
      return;
    }

    try {
      await userService.toggleActive(user.id, !user.active);
      toast.success(`User ${action}d successfully`);
      loadData();
    } catch (error) {
      console.error(`Failed to ${action} user:`, error);
      toast.error(`Failed to ${action} user`);
    }
  };

  // Handle delete user
  const handleDeleteUser = async (user: UserWithStatus) => {
    if (!confirm(`Delete ${user.name}? This will deactivate the user account.`)) {
      return;
    }

    try {
      await userService.deleteUser(user.id);
      toast.success('User deleted successfully');
      loadData();
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error('Failed to delete user');
    }
  };

  // Handle CSV export
  const handleExportCSV = async () => {
    if (!authService.hasPermission('EXPORT_CSV')) {
      toast.error('Access denied: CSV export requires export permissions');
      return;
    }

    try {
      await csvService.exportUsersCSV(users);
      
      // Log export action
      await auditService.log({
        action: 'USERS_CSV_EXPORT',
        payload: { exported_count: users.length }
      });
      
      toast.success(`Exported ${users.length} users to CSV`);
    } catch (error) {
      console.error('Failed to export users:', error);
      toast.error('Failed to export users');
    }
  };

  // Handle CSV import
  const handleImportCSV = () => {
    setShowCSVModal(true);
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get role color
  const getRoleColor = (role: Role) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300';
      case 'MANAGER':
        return 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300';
      case 'AUDITOR':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300';
      case 'CASHIER':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300';
      default:
        return 'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-300';
    }
  };

  return (
    <RequirePerm permission="SETTINGS_WRITE">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  User Management
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Manage user accounts, roles, and security settings
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCreateUser}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  New User
                </button>
                
                <button
                  onClick={handleImportCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  Import CSV
                </button>
                
                <button
                  onClick={handleExportCSV}
                  disabled={!authService.hasPermission('EXPORT_CSV')}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                  title={!authService.hasPermission('EXPORT_CSV') ? 'Requires export permission' : ''}
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
                
                <button
                  onClick={loadData}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalUsers}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <UserCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active Users</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeUsers}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
                  <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Locked Users</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.lockedUsers}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <Shield className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Managers/Admins</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.managerUsers}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Users ({users.length})
              </h3>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors",
                  showFilters 
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                )}
              >
                <Filter className="h-4 w-4" />
                Filters
              </button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Search
                  </label>
                  <input
                    type="text"
                    placeholder="Name or email..."
                    value={filters.search || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value || undefined }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Role
                  </label>
                  <select
                    value={filters.role || 'ALL'}
                    onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="ALL">All Roles</option>
                    <option value="CASHIER">Cashier</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                    <option value="AUDITOR">Auditor</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={filters.status || 'ALL'}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="ALL">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="LOCKED">Locked</option>
                  </select>
                </div>
              </div>
            )}

            {/* Users Table */}
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600 dark:text-gray-400">Loading users...</span>
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400">
                <Shield className="h-8 w-8 mb-2" />
                <p>No users found</p>
                <button
                  onClick={handleCreateUser}
                  className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
                >
                  Create your first user
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Role</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">PIN Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Locked Until</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                            {user.email && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                            getRoleColor(user.role)
                          )}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {user.active ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300">
                                <CheckCircle className="h-3 w-3" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-300">
                                <XCircle className="h-3 w-3" />
                                Inactive
                              </span>
                            )}
                            {user.is_locked && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300">
                                <AlertTriangle className="h-3 w-3" />
                                Locked
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {user.pin ? (
                            <span className="text-green-600 dark:text-green-400">Set</span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400">Not Set</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {user.is_locked && user.lockout_expires ? (
                            formatDate(user.lockout_expires)
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEditUser(user)}
                              className="p-1 text-blue-600 hover:text-blue-700 transition-colors"
                              title="Edit User"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            
                            <button
                              onClick={() => handleResetPin(user)}
                              className="p-1 text-green-600 hover:text-green-700 transition-colors"
                              title="Reset PIN"
                            >
                              <Key className="h-4 w-4" />
                            </button>
                            
                            {user.is_locked && (
                              <button
                                onClick={() => handleResetLock(user)}
                                className="p-1 text-amber-600 hover:text-amber-700 transition-colors"
                                title="Reset Lock"
                              >
                                <Unlock className="h-4 w-4" />
                              </button>
                            )}
                            
                            <button
                              onClick={() => handleToggleActive(user)}
                              className={cn(
                                "p-1 transition-colors",
                                user.active 
                                  ? "text-red-600 hover:text-red-700"
                                  : "text-green-600 hover:text-green-700"
                              )}
                              title={user.active ? "Deactivate" : "Activate"}
                            >
                              {user.active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                            </button>
                            
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="p-1 text-red-600 hover:text-red-700 transition-colors"
                              title="Delete User"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        {showUserModal && (
          <UserModal
            user={editingUser}
            isOpen={showUserModal}
            onClose={() => {
              setShowUserModal(false);
              setEditingUser(null);
            }}
            onSuccess={() => {
              setShowUserModal(false);
              setEditingUser(null);
              loadData();
            }}
          />
        )}

        {showPinResetDialog && selectedUser && (
          <PinResetDialog
            user={selectedUser}
            isOpen={showPinResetDialog}
            onClose={() => {
              setShowPinResetDialog(false);
              setSelectedUser(null);
            }}
            onSuccess={() => {
              setShowPinResetDialog(false);
              setSelectedUser(null);
              loadData();
            }}
          />
        )}

        {showCSVModal && (
          <UsersCSVModal
            isOpen={showCSVModal}
            onClose={() => setShowCSVModal(false)}
            onSuccess={() => {
              setShowCSVModal(false);
              loadData();
            }}
          />
        )}
      </div>
    </RequirePerm>
  );
};

export default Users;


