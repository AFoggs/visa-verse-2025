import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Users,
  MessageCircle,
  ChevronRight,
  Zap,
  Plane,
  Home,
  Globe,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { matchesApi, userApi } from '../services/api';

function Dashboard() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [connections, setConnections] = useState([]);
  const [friends, setFriends] = useState([]);
  const [suggestedCount, setSuggestedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Check for mobility data - redirect to onboarding if missing
  useEffect(() => {
    const mobility = userProfile?.mobility;
    if (userProfile && (!mobility?.mode || !mobility?.area?.country)) {
      navigate('/onboarding');
    }
  }, [userProfile, navigate]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [connectionsData, friendsData, suggestedData] = await Promise.all([
          userApi.getConnections().catch(() => ({ connections: [] })),
          userApi.getFriends().catch(() => ({ friends: [] })),
          matchesApi.getSuggestedMatches().catch(() => ({ matches: [] })),
        ]);

        setConnections(connectionsData.connections || []);
        setFriends(friendsData.friends || []);
        setSuggestedCount(suggestedData.matches?.length || 0);
      } catch (error) {
        console.error('Dashboard fetch error:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Get mobility info for display
  const mobility = userProfile?.mobility;
  const isLocal = mobility?.mode === 'LOCAL';
  const destinationDisplay = mobility?.area?.city
    ? `${mobility.area.city}, ${mobility.area.country}`
    : mobility?.area?.country || 'your destination';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold mb-2">
          {greeting()}, {userProfile?.profile?.name || 'there'}!
        </h1>
        <p className="text-dark-300">Find locals and travelers connected to your destination</p>

        {/* Destination Badge */}
        {mobility && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-700">
            {isLocal ? (
              <Home size={18} className="text-primary-400" />
            ) : (
              <Plane size={18} className="text-accent-400" />
            )}
            <span className="text-sm">
              <span className="text-dark-400">{isLocal ? 'Local in' : 'Traveling to'}</span>{' '}
              <span className="font-medium">{destinationDisplay}</span>
            </span>
          </div>
        )}
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Companion Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Link
            to="/companion"
            className="card-hover flex items-center gap-4 h-full"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center flex-shrink-0">
              <Sparkles className="text-white" size={28} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">AI Companion</h3>
              <p className="text-sm text-dark-300">Chat to build your profile and get matched</p>
            </div>
            <ChevronRight className="text-dark-400" size={24} />
          </Link>
        </motion.div>

        {/* Discover Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Link
            to="/discover"
            className="card-hover flex items-center gap-4 h-full"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-success-400 to-primary-400 flex items-center justify-center flex-shrink-0 relative">
              <Globe className="text-white" size={28} />
              {suggestedCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
                  {suggestedCount}
                </span>
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Find Connections</h3>
              <p className="text-dark-300 text-sm">
                {suggestedCount > 0
                  ? `${suggestedCount} ${isLocal ? 'travelers' : 'locals & travelers'} for ${destinationDisplay}`
                  : `Discover people in ${destinationDisplay}`}
              </p>
            </div>
            <ChevronRight className="text-dark-400" size={24} />
          </Link>
        </motion.div>
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-3 gap-4 mb-8"
      >
        <div className="card text-center">
          <div className="text-3xl font-bold gradient-text mb-1">
            {connections.length}
          </div>
          <div className="text-dark-300 text-sm">Connections</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold gradient-text mb-1">
            {friends.length}
          </div>
          <div className="text-dark-300 text-sm">Friends</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold gradient-text mb-1">
            {userProfile?.profile?.interests?.length || 0}
          </div>
          <div className="text-dark-300 text-sm">Interests</div>
        </div>
      </motion.div>

      {/* Active Connections */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <MessageCircle size={24} className="text-primary-400" />
            Active Connections
          </h2>
          {connections.length > 0 && (
            <Link to="/friends" className="text-primary-400 text-sm hover:text-primary-300">
              View all
            </Link>
          )}
        </div>

        {loading ? (
          <div className="card flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-400" />
          </div>
        ) : connections.length > 0 ? (
          <div className="space-y-3">
            {connections.slice(0, 3).map((connection) => (
              <Link
                key={connection.matchId}
                to={`/chat/${connection.matchId}`}
                className="card-hover flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-lg font-semibold">
                  {connection.otherUser?.name?.charAt(0) || '?'}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{connection.otherUser?.name || 'Unknown'}</h4>
                  <p className="text-dark-300 text-sm">
                    {connection.sharedInterests?.length || 0} shared interests
                  </p>
                </div>
                <div className="text-sm text-success-400 flex items-center gap-1">
                  <Zap size={16} />
                  {connection.compatibilityScore}%
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card text-center py-8">
            <Users className="mx-auto text-dark-400 mb-3" size={48} />
            <p className="text-dark-300 mb-2">No active connections yet</p>
            <p className="text-dark-400 text-sm mb-4">
              Find {isLocal ? 'travelers coming to' : 'locals and travelers in'} {destinationDisplay}
            </p>
            <Link to="/discover" className="btn-primary inline-flex items-center gap-2">
              <Globe size={20} />
              Discover Connections
            </Link>
          </div>
        )}
      </motion.div>

      {/* Friends */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users size={24} className="text-accent-400" />
            Friends
          </h2>
          {friends.length > 0 && (
            <Link to="/friends" className="text-primary-400 text-sm hover:text-primary-300">
              View all
            </Link>
          )}
        </div>

        {loading ? (
          <div className="card flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-400" />
          </div>
        ) : friends.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {friends.slice(0, 4).map((friend) => (
              <Link
                key={friend.matchId}
                to={`/chat/${friend.matchId}`}
                className="card-hover text-center py-4"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent-400 to-primary-400 flex items-center justify-center text-2xl font-semibold mx-auto mb-2">
                  {friend.otherUser?.name?.charAt(0) || '?'}
                </div>
                <h4 className="font-medium truncate">{friend.otherUser?.name || 'Unknown'}</h4>
                <p className="text-dark-400 text-xs">
                  {friend.otherUser?.mobility?.area?.city || friend.otherUser?.location?.city || 'Connection'}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card text-center py-8">
            <Users className="mx-auto text-dark-400 mb-3" size={48} />
            <p className="text-dark-300">No friends yet</p>
            <p className="text-dark-400 text-sm">Connect with people and build friendships!</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default Dashboard;
