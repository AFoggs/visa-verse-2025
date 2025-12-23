import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  MessageCircle,
  Search,
  Star,
  Zap,
  Circle,
} from 'lucide-react';
import { userApi } from '../services/api';

function Friends() {
  const [activeTab, setActiveTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [friendsData, connectionsData] = await Promise.all([
          userApi.getFriends(),
          userApi.getConnections(),
        ]);
        setFriends(friendsData.friends || []);
        setConnections(connectionsData.connections || []);
      } catch (error) {
        console.error('Error loading friends:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredList = (activeTab === 'friends' ? friends : connections).filter(
    (item) =>
      item.otherUser?.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.otherUser?.location?.city?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Your People</h1>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('friends')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'friends'
              ? 'bg-accent-400 text-white'
              : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
          }`}
        >
          <Users size={18} className="inline mr-2" />
          Friends ({friends.length})
        </button>
        <button
          onClick={() => setActiveTab('connections')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'connections'
              ? 'bg-primary-400 text-white'
              : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
          }`}
        >
          <MessageCircle size={18} className="inline mr-2" />
          Connections ({connections.length})
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search
          size={20}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or location..."
          className="input pl-12"
        />
      </div>

      {/* List */}
      {filteredList.length === 0 ? (
        <div className="card text-center py-12">
          <Users className="mx-auto text-dark-400 mb-4" size={48} />
          <h3 className="text-lg font-semibold mb-2">
            {search
              ? 'No matches found'
              : activeTab === 'friends'
                ? 'No friends yet'
                : 'No connections yet'}
          </h3>
          <p className="text-dark-300">
            {search
              ? 'Try a different search term'
              : activeTab === 'friends'
                ? 'Your connections can become friends!'
                : 'Start discovering people to connect with'}
          </p>
          {!search && (
            <Link to="/discover" className="btn-primary mt-4 inline-block">
              Find Connections
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredList.map((item, index) => (
            <motion.div
              key={item.matchId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={`/chat/${item.matchId}`}
                className="card-hover flex items-center gap-4"
              >
                {/* Avatar */}
                <div className="relative">
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-semibold ${
                      activeTab === 'friends'
                        ? 'bg-gradient-to-br from-accent-400 to-primary-400'
                        : 'bg-gradient-to-br from-primary-400 to-success-400'
                    }`}
                  >
                    {item.otherUser?.name?.charAt(0) || '?'}
                  </div>
                  {/* Online indicator (simulated) */}
                  {activeTab === 'friends' && Math.random() > 0.5 && (
                    <Circle
                      size={14}
                      className="absolute bottom-0 right-0 fill-success-400 text-success-400"
                    />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">
                    {item.otherUser?.name || 'Unknown'}
                    {activeTab === 'friends' && (
                      <Star
                        size={14}
                        className="inline ml-2 fill-amber-400 text-amber-400"
                      />
                    )}
                  </h3>
                  <p className="text-dark-300 text-sm truncate">
                    {item.otherUser?.location?.city},{' '}
                    {item.otherUser?.location?.country}
                  </p>
                  {item.sharedInterests && item.sharedInterests.length > 0 && (
                    <p className="text-dark-400 text-xs mt-1 truncate">
                      {item.sharedInterests.slice(0, 3).join(', ')}
                      {item.sharedInterests.length > 3 &&
                        ` +${item.sharedInterests.length - 3} more`}
                    </p>
                  )}
                </div>

                {/* Compatibility */}
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1 text-success-400 font-medium">
                    <Zap size={16} />
                    {item.compatibilityScore || 0}%
                  </div>
                  {item.connectionMetrics?.sessionCount > 0 && (
                    <p className="text-dark-400 text-xs mt-1">
                      {item.connectionMetrics.sessionCount} sessions
                    </p>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Friends;
