import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User,
  Shield,
  Bell,
  Moon,
  Sun,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Eye,
  EyeOff,
  MessageSquare,
  Users,
  Mail,
  Smartphone,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';

function Settings() {
  const { logout, user, userProfile, updateUserProfile } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const { permissionStatus, requestPermission } = useNotifications();
  const navigate = useNavigate();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const [saving, setSaving] = useState(false);

  // Privacy settings state
  // Hierarchy: everyone > connections (includes friends) > friends only
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: 'connections', // 'everyone', 'connections', 'friends'
    photoVisibility: 'friends', // 'everyone', 'connections', 'friends'
    showOnlineStatus: true,
    showLastActive: true,
  });

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState({
    pushEnabled: permissionStatus === 'granted',
    emailEnabled: true,
    newMatchNotify: true,
    messageNotify: true,
    connectionRequestNotify: true,
    soundEnabled: true,
  });

  // Load settings from userProfile
  useEffect(() => {
    if (userProfile?.settings?.privacy) {
      setPrivacySettings(prev => ({ ...prev, ...userProfile.settings.privacy }));
    }
    if (userProfile?.settings?.notifications) {
      setNotificationSettings(prev => ({ ...prev, ...userProfile.settings.notifications }));
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

  const savePrivacySettings = async () => {
    setSaving(true);
    try {
      await updateUserProfile({
        'settings.privacy': privacySettings,
      });
    } catch (error) {
      console.error('Failed to save privacy settings:', error);
    } finally {
      setSaving(false);
      setActiveSection(null);
    }
  };

  const saveNotificationSettings = async () => {
    setSaving(true);
    try {
      await updateUserProfile({
        'settings.notifications': notificationSettings,
      });
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    } finally {
      setSaving(false);
      setActiveSection(null);
    }
  };

  const handleEnablePush = async () => {
    const result = await requestPermission();
    if (result === 'granted') {
      setNotificationSettings(prev => ({ ...prev, pushEnabled: true }));
    }
  };

  // Profile photo URL
  const photoUrl = userProfile?.profile?.photoUrl;
  const userName = userProfile?.profile?.name || user?.displayName || 'User';
  const userInitial = userName.charAt(0).toUpperCase();

  // Main settings view
  if (!activeSection) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Settings</h1>
          <p className={`mb-8 ${isDark ? 'text-dark-300' : 'text-gray-500'}`}>Manage your account and preferences</p>

          {/* User Info */}
          <div className={`rounded-xl p-6 border mb-8 flex items-center gap-4 ${isDark ? 'bg-dark-700 border-dark-600' : 'bg-white border-gray-200 shadow-sm'}`}>
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={userName}
                className="w-14 h-14 rounded-full object-cover border-2 border-primary-400/50"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-xl font-semibold text-white">
                {userInitial}
              </div>
            )}
            <div>
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{userName}</h3>
              <p className={`text-sm ${isDark ? 'text-dark-300' : 'text-gray-500'}`}>{user?.email}</p>
            </div>
          </div>

          {/* Account Section */}
          <SettingsSection title="Account" isDark={isDark}>
            <SettingsItem
              icon={User}
              label="Edit Profile"
              onClick={() => navigate('/profile')}
              isDark={isDark}
            />
            <SettingsItem
              icon={Shield}
              label="Privacy"
              subtitle="Control who can see your profile and contact you"
              onClick={() => setActiveSection('privacy')}
              isDark={isDark}
            />
            <SettingsItem
              icon={Bell}
              label="Notifications"
              subtitle="Manage how you receive notifications"
              onClick={() => setActiveSection('notifications')}
              isDark={isDark}
            />
          </SettingsSection>

          {/* Appearance Section */}
          <SettingsSection title="Appearance" isDark={isDark}>
            <SettingsToggle
              icon={isDark ? Moon : Sun}
              label="Dark Mode"
              subtitle={isDark ? 'Currently using dark theme' : 'Currently using light theme'}
              checked={isDark}
              onChange={toggleTheme}
              isDark={isDark}
            />
          </SettingsSection>

          {/* Danger Zone */}
          <SettingsSection title="Danger Zone" isDark={isDark}>
            <SettingsItem
              icon={LogOut}
              label="Sign Out"
              onClick={handleLogout}
              isDark={isDark}
            />
            <SettingsItem
              icon={Trash2}
              label="Delete Account"
              subtitle="Permanently delete your account and data"
              onClick={() => setShowDeleteConfirm(true)}
              danger
              isDark={isDark}
            />
          </SettingsSection>

          {/* Version */}
          <p className={`text-center text-sm mt-8 ${isDark ? 'text-dark-400' : 'text-gray-400'}`}>
            3Degrees v1.0.0
            <br />
            Built for VisaVerse AI Hackathon 2025
          </p>
        </motion.div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <DeleteConfirmModal
            onCancel={() => setShowDeleteConfirm(false)}
            onConfirm={() => {
              console.log('Delete account');
              setShowDeleteConfirm(false);
            }}
            isDark={isDark}
          />
        )}
      </div>
    );
  }

  // Privacy Settings View
  if (activeSection === 'privacy') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => setActiveSection(null)}
              className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-dark-600' : 'hover:bg-gray-100'}`}
            >
              <ChevronLeft size={24} className={isDark ? 'text-white' : 'text-gray-900'} />
            </button>
            <div>
              <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Privacy Settings</h1>
              <p className={`text-sm ${isDark ? 'text-dark-300' : 'text-gray-500'}`}>Control who can see your information</p>
            </div>
          </div>

          {/* Info note about hierarchy */}
          <div className={`mb-4 p-3 rounded-lg text-sm ${isDark ? 'bg-dark-700 text-dark-300' : 'bg-gray-100 text-gray-600'}`}>
            <p>Friends are a subset of your connections. Choosing "Connections" includes friends.</p>
          </div>

          {/* Profile Visibility */}
          <SettingsSection title="Profile Visibility" isDark={isDark}>
            <SettingsRadio
              icon={Eye}
              label="Who can see your profile"
              value={privacySettings.profileVisibility}
              options={[
                { value: 'everyone', label: 'Everyone', desc: 'All users can view' },
                { value: 'connections', label: 'Connections', desc: 'Includes friends' },
                { value: 'friends', label: 'Friends only', desc: 'Most private' },
              ]}
              onChange={(value) => setPrivacySettings(prev => ({ ...prev, profileVisibility: value }))}
              isDark={isDark}
            />
            <SettingsRadio
              icon={EyeOff}
              label="Who can see your photo"
              value={privacySettings.photoVisibility}
              options={[
                { value: 'everyone', label: 'Everyone', desc: 'All users can view' },
                { value: 'connections', label: 'Connections', desc: 'Includes friends' },
                { value: 'friends', label: 'Friends only', desc: 'Most private' },
              ]}
              onChange={(value) => setPrivacySettings(prev => ({ ...prev, photoVisibility: value }))}
              isDark={isDark}
            />
          </SettingsSection>

          {/* Activity Status */}
          <SettingsSection title="Activity Status" isDark={isDark}>
            <SettingsToggle
              icon={Eye}
              label="Show online status"
              subtitle="Let others see when you're online"
              checked={privacySettings.showOnlineStatus}
              onChange={() => setPrivacySettings(prev => ({ ...prev, showOnlineStatus: !prev.showOnlineStatus }))}
              isDark={isDark}
            />
            <SettingsToggle
              icon={Eye}
              label="Show last active"
              subtitle="Let others see when you were last active"
              checked={privacySettings.showLastActive}
              onChange={() => setPrivacySettings(prev => ({ ...prev, showLastActive: !prev.showLastActive }))}
              isDark={isDark}
            />
          </SettingsSection>

          {/* Messaging Info */}
          <SettingsSection title="Messaging" isDark={isDark}>
            <div className={`px-4 py-4 ${isDark ? 'text-dark-300' : 'text-gray-600'}`}>
              <div className="flex items-center gap-3 mb-2">
                <MessageSquare size={20} className={isDark ? 'text-dark-400' : 'text-gray-400'} />
                <span className={isDark ? 'text-white' : 'text-gray-900'}>Messaging is connection-based</span>
              </div>
              <p className="text-sm ml-8">
                Only your connections can message you. This ensures all conversations are mutually agreed upon.
              </p>
            </div>
          </SettingsSection>

          {/* Save Button */}
          <div className="mt-8">
            <button
              onClick={savePrivacySettings}
              disabled={saving}
              className="w-full btn-primary py-3"
            >
              {saving ? 'Saving...' : 'Save Privacy Settings'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Notification Settings View
  if (activeSection === 'notifications') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => setActiveSection(null)}
              className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-dark-600' : 'hover:bg-gray-100'}`}
            >
              <ChevronLeft size={24} className={isDark ? 'text-white' : 'text-gray-900'} />
            </button>
            <div>
              <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Notification Settings</h1>
              <p className={`text-sm ${isDark ? 'text-dark-300' : 'text-gray-500'}`}>Choose how you want to be notified</p>
            </div>
          </div>

          {/* Notification Channels */}
          <SettingsSection title="Notification Channels" isDark={isDark}>
            {permissionStatus !== 'granted' ? (
              <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-600' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-3 mb-3">
                  <Smartphone size={20} className={isDark ? 'text-dark-300' : 'text-gray-500'} />
                  <div className="flex-1">
                    <p className={isDark ? 'text-white' : 'text-gray-900'}>Push Notifications</p>
                    <p className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>
                      {permissionStatus === 'denied' ? 'Blocked in browser settings' : 'Not enabled yet'}
                    </p>
                  </div>
                </div>
                {permissionStatus !== 'denied' && (
                  <button
                    onClick={handleEnablePush}
                    className="btn-primary w-full py-2 text-sm"
                  >
                    Enable Push Notifications
                  </button>
                )}
              </div>
            ) : (
              <SettingsToggle
                icon={Smartphone}
                label="Push Notifications"
                subtitle="Receive notifications on this device"
                checked={notificationSettings.pushEnabled}
                onChange={() => setNotificationSettings(prev => ({ ...prev, pushEnabled: !prev.pushEnabled }))}
                isDark={isDark}
              />
            )}
            <SettingsToggle
              icon={Mail}
              label="Email Notifications"
              subtitle="Receive important updates via email"
              checked={notificationSettings.emailEnabled}
              onChange={() => setNotificationSettings(prev => ({ ...prev, emailEnabled: !prev.emailEnabled }))}
              isDark={isDark}
            />
          </SettingsSection>

          {/* Notification Types */}
          <SettingsSection title="Notify Me About" isDark={isDark}>
            <SettingsToggle
              icon={Users}
              label="New Matches"
              subtitle="When someone matches with you"
              checked={notificationSettings.newMatchNotify}
              onChange={() => setNotificationSettings(prev => ({ ...prev, newMatchNotify: !prev.newMatchNotify }))}
              isDark={isDark}
            />
            <SettingsToggle
              icon={MessageSquare}
              label="New Messages"
              subtitle="When you receive a new message"
              checked={notificationSettings.messageNotify}
              onChange={() => setNotificationSettings(prev => ({ ...prev, messageNotify: !prev.messageNotify }))}
              isDark={isDark}
            />
            <SettingsToggle
              icon={Users}
              label="Connection Requests"
              subtitle="When someone wants to connect"
              checked={notificationSettings.connectionRequestNotify}
              onChange={() => setNotificationSettings(prev => ({ ...prev, connectionRequestNotify: !prev.connectionRequestNotify }))}
              isDark={isDark}
            />
          </SettingsSection>

          {/* Sound */}
          <SettingsSection title="Sound" isDark={isDark}>
            <SettingsToggle
              icon={notificationSettings.soundEnabled ? Volume2 : VolumeX}
              label="Notification Sounds"
              subtitle="Play a sound when you receive notifications"
              checked={notificationSettings.soundEnabled}
              onChange={() => setNotificationSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
              isDark={isDark}
            />
          </SettingsSection>

          {/* Save Button */}
          <div className="mt-8">
            <button
              onClick={saveNotificationSettings}
              disabled={saving}
              className="w-full btn-primary py-3"
            >
              {saving ? 'Saving...' : 'Save Notification Settings'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}

// Reusable Components

function SettingsSection({ title, children, isDark }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <h2 className={`text-sm uppercase tracking-wider mb-3 ${isDark ? 'text-dark-400' : 'text-gray-400'}`}>
        {title}
      </h2>
      <div className={`rounded-xl overflow-hidden divide-y ${isDark ? 'bg-dark-700 border border-dark-600 divide-dark-600' : 'bg-white border border-gray-200 divide-gray-100 shadow-sm'}`}>
        {children}
      </div>
    </motion.div>
  );
}

function SettingsItem({ icon: Icon, label, subtitle, onClick, danger, isDark }) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-4 flex items-center gap-4 text-left transition-colors ${
        danger
          ? 'hover:bg-red-500/10'
          : isDark ? 'hover:bg-dark-600' : 'hover:bg-gray-50'
      }`}
    >
      <Icon
        size={22}
        className={danger ? 'text-red-400' : isDark ? 'text-dark-300' : 'text-gray-400'}
      />
      <div className="flex-1">
        <p className={danger ? 'text-red-400' : isDark ? 'text-white' : 'text-gray-900'}>{label}</p>
        {subtitle && (
          <p className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>{subtitle}</p>
        )}
      </div>
      <ChevronRight size={20} className={isDark ? 'text-dark-400' : 'text-gray-400'} />
    </button>
  );
}

function SettingsToggle({ icon: Icon, label, subtitle, checked, onChange, isDark }) {
  return (
    <button
      onClick={onChange}
      className={`w-full px-4 py-4 flex items-center gap-4 text-left transition-colors ${isDark ? 'hover:bg-dark-600' : 'hover:bg-gray-50'}`}
    >
      <Icon
        size={22}
        className={isDark ? 'text-dark-300' : 'text-gray-400'}
      />
      <div className="flex-1">
        <p className={isDark ? 'text-white' : 'text-gray-900'}>{label}</p>
        {subtitle && (
          <p className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>{subtitle}</p>
        )}
      </div>
      <div
        className={`w-11 h-6 rounded-full flex items-center p-1 transition-colors ${
          checked ? 'bg-primary-400' : isDark ? 'bg-dark-500' : 'bg-gray-300'
        }`}
      >
        <div
          className={`w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </div>
    </button>
  );
}

function SettingsRadio({ icon: Icon, label, value, options, onChange, isDark }) {
  return (
    <div className={`px-4 py-4 ${isDark ? 'hover:bg-dark-600' : 'hover:bg-gray-50'}`}>
      <div className="flex items-center gap-4 mb-3">
        <Icon
          size={22}
          className={isDark ? 'text-dark-300' : 'text-gray-400'}
        />
        <p className={isDark ? 'text-white' : 'text-gray-900'}>{label}</p>
      </div>
      <div className="ml-10 space-y-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`w-full p-3 rounded-lg text-left text-sm flex items-center gap-3 transition-all ${
              value === option.value
                ? 'bg-primary-400/20 border-2 border-primary-400'
                : isDark
                  ? 'bg-dark-600 border-2 border-transparent'
                  : 'bg-gray-100 border-2 border-transparent'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                value === option.value
                  ? 'border-primary-400'
                  : isDark ? 'border-dark-400' : 'border-gray-400'
              }`}
            >
              {value === option.value && (
                <div className="w-2 h-2 rounded-full bg-primary-400" />
              )}
            </div>
            <div className="flex-1">
              <span className={isDark ? 'text-white' : 'text-gray-900'}>{option.label}</span>
              {option.desc && (
                <span className={`ml-2 text-xs ${isDark ? 'text-dark-400' : 'text-gray-400'}`}>
                  - {option.desc}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function DeleteConfirmModal({ onCancel, onConfirm, isDark }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className={`w-full max-w-sm rounded-xl p-6 ${isDark ? 'bg-dark-700' : 'bg-white'}`}
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <Trash2 className="text-red-400" size={32} />
          </div>
          <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Delete Account?</h3>
          <p className={`text-sm ${isDark ? 'text-dark-300' : 'text-gray-500'}`}>
            This action cannot be undone. All your data, connections, and
            conversations will be permanently deleted.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="btn flex-1 bg-red-500 hover:bg-red-600 text-white"
          >
            Delete
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default Settings;
