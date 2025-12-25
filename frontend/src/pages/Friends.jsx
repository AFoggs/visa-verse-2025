import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  MessageCircle,
  Search,
  Star,
  Zap,
  Circle,
  Inbox,
  Send,
  Check,
  X,
  Bell,
} from 'lucide-react';
import { userApi, matchesApi } from '../services/api';
import { useNotifications } from '../context/NotificationContext';

function Friends() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('connections');
  const [friends, setFriends] = useState([]);
  const [connections, setConnections] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const { getUnreadCount, totalUnread, permissionStatus, requestPermission } = useNotifications();

  const loadData = async () => {
    try {
      const [friendsData, connectionsData, pendingData, sentData] = await Promise.all([
        userApi.getFriends(),
        userApi.getConnections(),
        userApi.getPendingRequests(),
        userApi.getSentRequests(),
      ]);
      setFriends(friendsData.friends || []);
      setConnections(connectionsData.connections || []);
      setPendingRequests(pendingData.pendingRequests || []);
      setSentRequests(sentData.sentRequests || []);
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAccept = async (matchId) => {
    setActionLoading(matchId);
    try {
      await matchesApi.acceptConnection(matchId);
      // Reload data to refresh lists
      await loadData();
    } catch (error) {
      console.error('Error accepting connection:', error);
      alert('Failed to accept connection: ' + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (matchId, userId) => {
    setActionLoading(matchId);
    try {
      await matchesApi.decline(userId, 'Declined request');
      // Remove from pending list
      setPendingRequests(prev => prev.filter(r => r.matchId !== matchId));
    } catch (error) {
      console.error('Error declining connection:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const getFilteredList = () => {
    let list = [];
    if (activeTab === 'friends') {
      list = friends;
    } else if (activeTab === 'connections') {
      list = connections;
    } else if (activeTab === 'requests') {
      list = pendingRequests;
    } else if (activeTab === 'sent') {
      list = sentRequests;
    }

    return list.filter((item) => {
      const user = item.otherUser || item.fromUser || item.toUser;
      return (
        user?.name?.toLowerCase().includes(search.toLowerCase()) ||
        user?.location?.city?.toLowerCase().includes(search.toLowerCase())
      );
    });
  };

  const filteredList = getFilteredList();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Your People</h1>
        {permissionStatus === 'default' && (
          <button
            onClick={requestPermission}
            className="flex items-center gap-2 px-4 py-2 bg-primary-400/20 text-primary-400 rounded-lg hover:bg-primary-400/30 transition-colors text-sm"
          >
            <Bell size={18} />
            Enable Notifications
          </button>
        )}
      </div>

      {/* Unread Messages Banner */}
      {totalUnread > 0 && (
        <div className="mb-4 p-4 bg-primary-400/10 border border-primary-400/30 rounded-xl flex items-center gap-3">
          <MessageCircle className="text-primary-400" size={24} />
          <p className="text-primary-400 font-medium">
            You have {totalUnread} unread message{totalUnread !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
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
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-lg font-medium transition-all relative ${
            activeTab === 'requests'
              ? 'bg-success-400 text-white'
              : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
          }`}
        >
          <Inbox size={18} className="inline mr-2" />
          Requests ({pendingRequests.length})
          {pendingRequests.length > 0 && activeTab !== 'requests' && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-error-400 rounded-full text-xs flex items-center justify-center text-white">
              {pendingRequests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('sent')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'sent'
              ? 'bg-warning-400 text-dark-900'
              : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
          }`}
        >
          <Send size={18} className="inline mr-2" />
          Sent ({sentRequests.length})
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

      {/* Requests Tab Content */}
      {activeTab === 'requests' && (
        <div className="mb-4 p-4 bg-success-400/10 border border-success-400/30 rounded-xl">
          <p className="text-success-400 text-sm">
            These people want to connect with you! Accept to start chatting.
          </p>
        </div>
      )}

      {/* Sent Tab Content */}
      {activeTab === 'sent' && (
        <div className="mb-4 p-4 bg-warning-400/10 border border-warning-400/30 rounded-xl">
          <p className="text-warning-400 text-sm">
            Waiting for these people to accept your connection request.
          </p>
        </div>
      )}

      {/* List */}
      {filteredList.length === 0 ? (
        <div className="card text-center py-12">
          <Users className="mx-auto text-dark-400 mb-4" size={48} />
          <h3 className="text-lg font-semibold mb-2">
            {search
              ? 'No matches found'
              : activeTab === 'friends'
                ? 'No friends yet'
                : activeTab === 'connections'
                  ? 'No connections yet'
                  : activeTab === 'requests'
                    ? 'No pending requests'
                    : 'No sent requests'}
          </h3>
          <p className="text-dark-300">
            {search
              ? 'Try a different search term'
              : activeTab === 'friends'
                ? 'Your connections can become friends!'
                : activeTab === 'connections'
                  ? 'Start discovering people to connect with'
                  : activeTab === 'requests'
                    ? 'When someone wants to connect, they\'ll appear here'
                    : 'Connect with people in Discover to send requests'}
          </p>
          {!search && (activeTab === 'connections' || activeTab === 'sent') && (
            <Link to="/discover" className="btn-primary mt-4 inline-block">
              Find Connections
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredList.map((item, index) => {
            const user = item.otherUser || item.fromUser || item.toUser;
            const isRequest = activeTab === 'requests';
            const isSent = activeTab === 'sent';

            return (
              <motion.div
                key={item.matchId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`card-hover flex items-center gap-4 ${!isRequest && !isSent ? 'cursor-pointer' : ''}`}
                onClick={() => {
                  if (!isRequest && !isSent) {
                    navigate(`/chat/${item.matchId}`);
                  }
                }}
              >
                {/* Avatar */}
                <div className="relative">
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-semibold ${
                      activeTab === 'friends'
                        ? 'bg-gradient-to-br from-accent-400 to-primary-400'
                        : activeTab === 'requests'
                          ? 'bg-gradient-to-br from-success-400 to-primary-400'
                          : activeTab === 'sent'
                            ? 'bg-gradient-to-br from-warning-400 to-primary-400'
                            : 'bg-gradient-to-br from-primary-400 to-success-400'
                    }`}
                  >
                    {user?.name?.charAt(0) || '?'}
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
                    {user?.name || 'Unknown'}
                    {activeTab === 'friends' && (
                      <Star
                        size={14}
                        className="inline ml-2 fill-amber-400 text-amber-400"
                      />
                    )}
                  </h3>
                  <p className="text-dark-300 text-sm truncate">
                    {user?.location?.city},{' '}
                    {user?.location?.country}
                  </p>
                  {item.sharedInterests && item.sharedInterests.length > 0 && (
                    <p className="text-dark-400 text-xs mt-1 truncate">
                      {item.sharedInterests.slice(0, 3).join(', ')}
                      {item.sharedInterests.length > 3 &&
                        ` +${item.sharedInterests.length - 3} more`}
                    </p>
                  )}
                </div>

                {/* Actions for requests */}
                {isRequest && (
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAccept(item.matchId);
                      }}
                      disabled={actionLoading === item.matchId}
                      className="btn-success px-3 py-2 flex items-center gap-1"
                    >
                      {actionLoading === item.matchId ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" />
                      ) : (
                        <>
                          <Check size={18} />
                          Accept
                        </>
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDecline(item.matchId, user.userId);
                      }}
                      disabled={actionLoading === item.matchId}
                      className="btn-secondary px-3 py-2 flex items-center gap-1"
                    >
                      <X size={18} />
                    </button>
                  </div>
                )}

                {/* Pending indicator for sent */}
                {isSent && (
                  <div className="text-warning-400 text-sm font-medium">
                    Pending...
                  </div>
                )}

                {/* Compatibility & Chat link for connections/friends */}
                {!isRequest && !isSent && (
                  <div className="flex flex-col items-end relative">
                    {getUnreadCount(item.matchId) > 0 && (
                      <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1.5 bg-error-400 rounded-full text-xs flex items-center justify-center text-white font-medium animate-pulse">
                        {getUnreadCount(item.matchId) > 99 ? '99+' : getUnreadCount(item.matchId)}
                      </span>
                    )}
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
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Friends;
