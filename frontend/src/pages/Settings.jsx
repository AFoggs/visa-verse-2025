import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User,
  Shield,
  Bell,
  Moon,
  LogOut,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function Settings() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const settingsGroups = [
    {
      title: 'Account',
      items: [
        {
          icon: User,
          label: 'Edit Profile',
          action: () => navigate('/profile'),
        },
        {
          icon: Shield,
          label: 'Privacy',
          subtitle: 'Manage your privacy settings',
          action: () => {},
          disabled: true,
        },
        {
          icon: Bell,
          label: 'Notifications',
          subtitle: 'Configure notification preferences',
          action: () => {},
          disabled: true,
        },
      ],
    },
    {
      title: 'Appearance',
      items: [
        {
          icon: Moon,
          label: 'Dark Mode',
          subtitle: 'Always on',
          toggle: true,
          checked: true,
          disabled: true,
        },
      ],
    },
    {
      title: 'Danger Zone',
      items: [
        {
          icon: LogOut,
          label: 'Sign Out',
          action: handleLogout,
          danger: false,
        },
        {
          icon: Trash2,
          label: 'Delete Account',
          subtitle: 'Permanently delete your account and data',
          action: () => setShowDeleteConfirm(true),
          danger: true,
        },
      ],
    },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold mb-2">Settings</h1>
        <p className="text-dark-300 mb-8">Manage your account and preferences</p>

        {/* User Info */}
        <div className="card mb-8 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-xl font-semibold">
            {user?.displayName?.charAt(0) || user?.email?.charAt(0) || '?'}
          </div>
          <div>
            <h3 className="font-semibold">{user?.displayName || 'User'}</h3>
            <p className="text-dark-300 text-sm">{user?.email}</p>
          </div>
        </div>

        {/* Settings Groups */}
        {settingsGroups.map((group, groupIndex) => (
          <motion.div
            key={group.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIndex * 0.1 }}
            className="mb-6"
          >
            <h2 className="text-sm text-dark-400 uppercase tracking-wider mb-3">
              {group.title}
            </h2>
            <div className="card p-0 overflow-hidden divide-y divide-dark-600">
              {group.items.map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  disabled={item.disabled}
                  className={`w-full px-4 py-4 flex items-center gap-4 text-left transition-colors ${
                    item.disabled
                      ? 'opacity-50 cursor-not-allowed'
                      : item.danger
                        ? 'hover:bg-red-500/10'
                        : 'hover:bg-dark-600'
                  }`}
                >
                  <item.icon
                    size={22}
                    className={item.danger ? 'text-red-400' : 'text-dark-300'}
                  />
                  <div className="flex-1">
                    <p className={item.danger ? 'text-red-400' : ''}>{item.label}</p>
                    {item.subtitle && (
                      <p className="text-dark-400 text-sm">{item.subtitle}</p>
                    )}
                  </div>
                  {item.toggle ? (
                    <div
                      className={`w-11 h-6 rounded-full flex items-center p-1 transition-colors ${
                        item.checked ? 'bg-primary-400' : 'bg-dark-500'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          item.checked ? 'translate-x-5' : ''
                        }`}
                      />
                    </div>
                  ) : (
                    <ChevronRight size={20} className="text-dark-400" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        ))}

        {/* Version */}
        <p className="text-center text-dark-400 text-sm mt-8">
          3Degrees v1.0.0
          <br />
          Built for VisaVerse AI Hackathon 2025
        </p>
      </motion.div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="card w-full max-w-sm"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="text-red-400" size={32} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Delete Account?</h3>
              <p className="text-dark-300 text-sm">
                This action cannot be undone. All your data, connections, and
                conversations will be permanently deleted.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // In a real app, this would call an API to delete the account
                  console.log('Delete account');
                  setShowDeleteConfirm(false);
                }}
                className="btn flex-1 bg-red-500 hover:bg-red-600 text-white"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

export default Settings;
