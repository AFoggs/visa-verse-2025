import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Shield,
  Bell,
  Moon,
  Sun,
  LogOut,
  ChevronRight,
  ChevronDown,
  Trash2,
  Eye,
  MapPin,
  MessageSquare,
  Users,
  Volume2,
  VolumeX,
  Smartphone,
  Mail,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';

function Settings() {
  const { logout, user, userProfile, updateUserProfile } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const { permissionStatus, requestPermission } = useNotifications();
  const navigate = useNavigate();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const [saving, setSaving] = useState(false);

  // Privacy settings state
  const [privacySettings, setPrivacySettings] = useState({
    showOnlineStatus: true,
    showLocation: true,
    allowMessageRequests: true,
    profileVisibility: 'connections',
  });

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState({
    pushEnabled: permissionStatus === 'granted',
    emailNotifications: true,
    messageNotifications: true,
    connectionRequests: true,
    friendRequests: true,
    gameInvitations: true,
    soundEnabled: true,
  });

  // Load settings from profile
  useEffect(() => {
    if (userProfile?.settings) {
      if (userProfile.settings.privacy) {
        setPrivacySettings(prev => ({ ...prev, ...userProfile.settings.privacy }));
      }
      if (userProfile.settings.notifications) {
        setNotificationSettings(prev => ({ ...prev, ...userProfile.settings.notifications }));
      }
    }
  }, [userProfile]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const savePrivacySettings = async () => {
    setSaving(true);
    try {
      await updateUserProfile({
        settings: {
          ...userProfile?.settings,
          privacy: privacySettings,
        },
      });
    } catch (error) {
      console.error('Save privacy settings error:', error);
    } finally {
      setSaving(false);
    }
  };

  const saveNotificationSettings = async () => {
    setSaving(true);
    try {
      await updateUserProfile({
        settings: {
          ...userProfile?.settings,
          notifications: notificationSettings,
        },
      });
    } catch (error) {
      console.error('Save notification settings error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleEnablePush = async () => {
    const result = await requestPermission();
    if (result === 'granted') {
      setNotificationSettings(prev => ({ ...prev, pushEnabled: true }));
    }
  };

  const ToggleSwitch = ({ checked, onChange, disabled = false }) => (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`w-11 h-6 rounded-full flex items-center p-1 transition-colors ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${checked ? 'bg-primary-400' : isDark ? 'bg-dark-500' : 'bg-gray-300'}`}
    >
      <div
        className={`w-4 h-4 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-5' : ''
        }`}
      />
    </button>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold mb-2">Settings</h1>
        <p className={`${isDark ? 'text-dark-300' : 'text-gray-600'} mb-8`}>
          Manage your account and preferences
        </p>

        {/* User Info */}
        <div className="card mb-8 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-xl font-semibold overflow-hidden">
            {userProfile?.profile?.photoUrl ? (
              <img
                src={userProfile.profile.photoUrl}
                alt={userProfile.profile.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white">
                {user?.displayName?.charAt(0) || user?.email?.charAt(0) || '?'}
              </span>
            )}
          </div>
          <div>
            <h3 className="font-semibold">{user?.displayName || userProfile?.profile?.name || 'User'}</h3>
            <p className={`${isDark ? 'text-dark-300' : 'text-gray-600'} text-sm`}>{user?.email}</p>
          </div>
        </div>

        {/* Account Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <h2 className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-500'} uppercase tracking-wider mb-3`}>
            Account
          </h2>
          <div className="card p-0 overflow-hidden">
            {/* Edit Profile */}
            <button
              onClick={() => navigate('/profile')}
              className={`w-full px-4 py-4 flex items-center gap-4 text-left transition-colors ${
                isDark ? 'hover:bg-dark-600' : 'hover:bg-gray-50'
              }`}
            >
              <User size={22} className={isDark ? 'text-dark-300' : 'text-gray-500'} />
              <div className="flex-1">
                <p>Edit Profile</p>
              </div>
              <ChevronRight size={20} className={isDark ? 'text-dark-400' : 'text-gray-400'} />
            </button>

            {/* Privacy - Expandable */}
            <div className={`border-t ${isDark ? 'border-dark-600' : 'border-gray-200'}`}>
              <button
                onClick={() => toggleSection('privacy')}
                className={`w-full px-4 py-4 flex items-center gap-4 text-left transition-colors ${
                  isDark ? 'hover:bg-dark-600' : 'hover:bg-gray-50'
                }`}
              >
                <Shield size={22} className={isDark ? 'text-dark-300' : 'text-gray-500'} />
                <div className="flex-1">
                  <p>Privacy</p>
                  <p className={`${isDark ? 'text-dark-400' : 'text-gray-500'} text-sm`}>
                    Manage your privacy settings
                  </p>
                </div>
                <motion.div
                  animate={{ rotate: expandedSection === 'privacy' ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown size={20} className={isDark ? 'text-dark-400' : 'text-gray-400'} />
                </motion.div>
              </button>

              <AnimatePresence>
                {expandedSection === 'privacy' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className={`px-4 py-4 space-y-4 ${isDark ? 'bg-dark-800' : 'bg-gray-50'}`}>
                      {/* Show Online Status */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Eye size={18} className={isDark ? 'text-dark-300' : 'text-gray-500'} />
                          <div>
                            <p className="text-sm font-medium">Show Online Status</p>
                            <p className={`text-xs ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>
                              Let others see when you're online
                            </p>
                          </div>
                        </div>
                        <ToggleSwitch
                          checked={privacySettings.showOnlineStatus}
                          onChange={(val) => setPrivacySettings(prev => ({ ...prev, showOnlineStatus: val }))}
                        />
                      </div>

                      {/* Show Location */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <MapPin size={18} className={isDark ? 'text-dark-300' : 'text-gray-500'} />
                          <div>
                            <p className="text-sm font-medium">Show Location</p>
                            <p className={`text-xs ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>
                              Display your city on your profile
                            </p>
                          </div>
                        </div>
                        <ToggleSwitch
                          checked={privacySettings.showLocation}
                          onChange={(val) => setPrivacySettings(prev => ({ ...prev, showLocation: val }))}
                        />
                      </div>

                      {/* Allow Message Requests */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <MessageSquare size={18} className={isDark ? 'text-dark-300' : 'text-gray-500'} />
                          <div>
                            <p className="text-sm font-medium">Allow Message Requests</p>
                            <p className={`text-xs ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>
                              Receive messages from new connections
                            </p>
                          </div>
                        </div>
                        <ToggleSwitch
                          checked={privacySettings.allowMessageRequests}
                          onChange={(val) => setPrivacySettings(prev => ({ ...prev, allowMessageRequests: val }))}
                        />
                      </div>

                      {/* Profile Visibility */}
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <Users size={18} className={isDark ? 'text-dark-300' : 'text-gray-500'} />
                          <div>
                            <p className="text-sm font-medium">Profile Visibility</p>
                            <p className={`text-xs ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>
                              Who can see your full profile
                            </p>
                          </div>
                        </div>
                        <div className="ml-7 flex gap-2 flex-wrap">
                          {[
                            { value: 'everyone', label: 'Everyone' },
                            { value: 'connections', label: 'Connections' },
                            { value: 'friends', label: 'Friends Only' },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => setPrivacySettings(prev => ({ ...prev, profileVisibility: opt.value }))}
                              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                privacySettings.profileVisibility === opt.value
                                  ? 'bg-primary-400 text-white'
                                  : isDark
                                    ? 'bg-dark-600 hover:bg-dark-500'
                                    : 'bg-gray-200 hover:bg-gray-300'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Save Button */}
                      <button
                        onClick={savePrivacySettings}
                        disabled={saving}
                        className="btn-primary w-full mt-4"
                      >
                        {saving ? 'Saving...' : 'Save Privacy Settings'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Notifications - Expandable */}
            <div className={`border-t ${isDark ? 'border-dark-600' : 'border-gray-200'}`}>
              <button
                onClick={() => toggleSection('notifications')}
                className={`w-full px-4 py-4 flex items-center gap-4 text-left transition-colors ${
                  isDark ? 'hover:bg-dark-600' : 'hover:bg-gray-50'
                }`}
              >
                <Bell size={22} className={isDark ? 'text-dark-300' : 'text-gray-500'} />
                <div className="flex-1">
                  <p>Notifications</p>
                  <p className={`${isDark ? 'text-dark-400' : 'text-gray-500'} text-sm`}>
                    Configure notification preferences
                  </p>
                </div>
                <motion.div
                  animate={{ rotate: expandedSection === 'notifications' ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown size={20} className={isDark ? 'text-dark-400' : 'text-gray-400'} />
                </motion.div>
              </button>

              <AnimatePresence>
                {expandedSection === 'notifications' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className={`px-4 py-4 space-y-4 ${isDark ? 'bg-dark-800' : 'bg-gray-50'}`}>
                      {/* Push Notifications */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Smartphone size={18} className={isDark ? 'text-dark-300' : 'text-gray-500'} />
                          <div>
                            <p className="text-sm font-medium">Push Notifications</p>
                            <p className={`text-xs ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>
                              {permissionStatus === 'granted'
                                ? 'Receive browser notifications'
                                : permissionStatus === 'denied'
                                  ? 'Notifications blocked by browser'
                                  : 'Enable browser notifications'}
                            </p>
                          </div>
                        </div>
                        {permissionStatus === 'granted' ? (
                          <ToggleSwitch
                            checked={notificationSettings.pushEnabled}
                            onChange={(val) => setNotificationSettings(prev => ({ ...prev, pushEnabled: val }))}
                          />
                        ) : permissionStatus === 'denied' ? (
                          <span className="text-xs text-red-400">Blocked</span>
                        ) : (
                          <button
                            onClick={handleEnablePush}
                            className="btn-primary text-sm py-1 px-3"
                          >
                            Enable
                          </button>
                        )}
                      </div>

                      {/* Email Notifications */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Mail size={18} className={isDark ? 'text-dark-300' : 'text-gray-500'} />
                          <div>
                            <p className="text-sm font-medium">Email Notifications</p>
                            <p className={`text-xs ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>
                              Receive updates via email
                            </p>
                          </div>
                        </div>
                        <ToggleSwitch
                          checked={notificationSettings.emailNotifications}
                          onChange={(val) => setNotificationSettings(prev => ({ ...prev, emailNotifications: val }))}
                        />
                      </div>

                      {/* Sound */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {notificationSettings.soundEnabled ? (
                            <Volume2 size={18} className={isDark ? 'text-dark-300' : 'text-gray-500'} />
                          ) : (
                            <VolumeX size={18} className={isDark ? 'text-dark-300' : 'text-gray-500'} />
                          )}
                          <div>
                            <p className="text-sm font-medium">Notification Sounds</p>
                            <p className={`text-xs ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>
                              Play sound for notifications
                            </p>
                          </div>
                        </div>
                        <ToggleSwitch
                          checked={notificationSettings.soundEnabled}
                          onChange={(val) => setNotificationSettings(prev => ({ ...prev, soundEnabled: val }))}
                        />
                      </div>

                      <div className={`border-t ${isDark ? 'border-dark-600' : 'border-gray-300'} pt-4`}>
                        <p className={`text-xs ${isDark ? 'text-dark-400' : 'text-gray-500'} mb-3`}>
                          Notify me about:
                        </p>

                        {/* Message Notifications */}
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm">New messages</p>
                          <ToggleSwitch
                            checked={notificationSettings.messageNotifications}
                            onChange={(val) => setNotificationSettings(prev => ({ ...prev, messageNotifications: val }))}
                          />
                        </div>

                        {/* Connection Requests */}
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm">Connection requests</p>
                          <ToggleSwitch
                            checked={notificationSettings.connectionRequests}
                            onChange={(val) => setNotificationSettings(prev => ({ ...prev, connectionRequests: val }))}
                          />
                        </div>

                        {/* Friend Requests */}
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm">Friend requests</p>
                          <ToggleSwitch
                            checked={notificationSettings.friendRequests}
                            onChange={(val) => setNotificationSettings(prev => ({ ...prev, friendRequests: val }))}
                          />
                        </div>

                        {/* Game Invitations */}
                        <div className="flex items-center justify-between">
                          <p className="text-sm">Game invitations</p>
                          <ToggleSwitch
                            checked={notificationSettings.gameInvitations}
                            onChange={(val) => setNotificationSettings(prev => ({ ...prev, gameInvitations: val }))}
                          />
                        </div>
                      </div>

                      {/* Save Button */}
                      <button
                        onClick={saveNotificationSettings}
                        disabled={saving}
                        className="btn-primary w-full mt-4"
                      >
                        {saving ? 'Saving...' : 'Save Notification Settings'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Appearance Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <h2 className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-500'} uppercase tracking-wider mb-3`}>
            Appearance
          </h2>
          <div className="card p-0 overflow-hidden">
            <button
              onClick={toggleTheme}
              className={`w-full px-4 py-4 flex items-center gap-4 text-left transition-colors ${
                isDark ? 'hover:bg-dark-600' : 'hover:bg-gray-50'
              }`}
            >
              {isDark ? (
                <Moon size={22} className="text-primary-400" />
              ) : (
                <Sun size={22} className="text-amber-500" />
              )}
              <div className="flex-1">
                <p>{isDark ? 'Dark Mode' : 'Light Mode'}</p>
                <p className={`${isDark ? 'text-dark-400' : 'text-gray-500'} text-sm`}>
                  {isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                </p>
              </div>
              <div
                className={`w-11 h-6 rounded-full flex items-center p-1 transition-colors ${
                  isDark ? 'bg-primary-400' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    isDark ? 'translate-x-5' : ''
                  }`}
                />
              </div>
            </button>
          </div>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <h2 className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-500'} uppercase tracking-wider mb-3`}>
            Danger Zone
          </h2>
          <div className="card p-0 overflow-hidden">
            <button
              onClick={handleLogout}
              className={`w-full px-4 py-4 flex items-center gap-4 text-left transition-colors ${
                isDark ? 'hover:bg-dark-600' : 'hover:bg-gray-50'
              }`}
            >
              <LogOut size={22} className={isDark ? 'text-dark-300' : 'text-gray-500'} />
              <div className="flex-1">
                <p>Sign Out</p>
              </div>
              <ChevronRight size={20} className={isDark ? 'text-dark-400' : 'text-gray-400'} />
            </button>

            <div className={`border-t ${isDark ? 'border-dark-600' : 'border-gray-200'}`}>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full px-4 py-4 flex items-center gap-4 text-left transition-colors hover:bg-red-500/10"
              >
                <Trash2 size={22} className="text-red-400" />
                <div className="flex-1">
                  <p className="text-red-400">Delete Account</p>
                  <p className={`${isDark ? 'text-dark-400' : 'text-gray-500'} text-sm`}>
                    Permanently delete your account and data
                  </p>
                </div>
                <ChevronRight size={20} className="text-red-400" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Version */}
        <p className={`text-center ${isDark ? 'text-dark-400' : 'text-gray-500'} text-sm mt-8`}>
          3Degrees v1.0.0
          <br />
          Built for VisaVerse AI Hackathon 2025
        </p>
      </motion.div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="card w-full max-w-sm relative"
            >
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="absolute top-4 right-4 btn-ghost p-1"
              >
                <X size={20} />
              </button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="text-red-400" size={32} />
                </div>
                <h3 className="text-xl font-semibold mb-2">Delete Account?</h3>
                <p className={`${isDark ? 'text-dark-300' : 'text-gray-600'} text-sm`}>
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
      </AnimatePresence>
    </div>
  );
}

export default Settings;
