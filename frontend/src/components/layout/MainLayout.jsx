import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  MessageCircle,
  Users,
  Compass,
  User,
  Settings,
  LogOut,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';

function MainLayout() {
  const { logout, userProfile } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Home' },
    { path: '/companion', icon: Sparkles, label: 'Companion' },
    { path: '/discover', icon: Compass, label: 'Discover' },
    { path: '/friends', icon: Users, label: 'Friends' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-dark-800 flex flex-col">
      {/* Header - Desktop */}
      <header className="hidden md:flex fixed top-0 left-0 right-0 h-16 bg-dark-700/90 backdrop-blur-md border-b border-dark-600 z-50">
        <div className="max-w-7xl mx-auto w-full px-4 flex items-center justify-between">
          {/* Logo */}
          <NavLink to="/dashboard" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center">
              <span className="text-white font-bold text-lg">3°</span>
            </div>
            <span className="text-xl font-semibold gradient-text">3Degrees</span>
          </NavLink>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-400/20 text-primary-400'
                      : 'text-dark-200 hover:text-white hover:bg-dark-600'
                  }`
                }
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            <span className="text-dark-200 text-sm">
              {userProfile?.profile?.name || 'User'}
            </span>
            <NavLink
              to="/settings"
              className="p-2 rounded-lg text-dark-200 hover:text-white hover:bg-dark-600 transition-all"
            >
              <Settings size={20} />
            </NavLink>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-dark-200 hover:text-red-400 hover:bg-dark-600 transition-all"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-0 md:pt-16">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-dark-700/90 backdrop-blur-md border-t border-dark-600 z-50 safe-area-inset-bottom">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'text-primary-400'
                    : 'text-dark-300 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <motion.div
                    animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <item.icon size={24} />
                  </motion.div>
                  <span className="text-xs">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default MainLayout;
