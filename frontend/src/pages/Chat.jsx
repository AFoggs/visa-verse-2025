import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  ArrowLeft,
  MoreVertical,
  Mic,
  MicOff,
  Sparkles,
  Gamepad2,
  UserPlus,
  Star,
  X,
  Info,
  Zap,
  RefreshCw,
  Dice5,
  HelpCircle,
  MessageCircle,
  Phone,
  PhoneOff,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNotifications } from '../context/NotificationContext';
import { chatApi, matchesApi, gamesApi, userApi } from '../services/api';
import GameContainer from '../components/games/GameContainer';
import VoiceCall from '../components/VoiceCall';

function Chat() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, connected, joinRoom, leaveRoom, startTyping, stopTyping } = useSocket();
  const { setActiveChat, clearActiveChat } = useNotifications();

  const [match, setMatch] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [icebreakers, setIcebreakers] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [showGames, setShowGames] = useState(false);
  const [rating, setRating] = useState(0);
  const [listening, setListening] = useState(false);
  const [loadingIcebreakers, setLoadingIcebreakers] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [showGame, setShowGame] = useState(false);
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const [communicationMode, setCommunicationMode] = useState('both'); // 'text', 'voice', 'both'
  const [myPreference, setMyPreference] = useState('both');
  const [theirPreference, setTheirPreference] = useState('both');

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const recognitionRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Determine communication mode based on both users' preferences
  const determineCommunicationMode = (myPref, theirPref) => {
    // If either user wants text-only, use text
    if (myPref === 'text' || theirPref === 'text') {
      // But if the other wants voice-only, we have a conflict - default to text
      if ((myPref === 'text' && theirPref === 'voice') ||
          (myPref === 'voice' && theirPref === 'text')) {
        return 'conflict'; // They need to negotiate
      }
      return 'text';
    }
    // If either user wants voice-only, use voice
    if (myPref === 'voice' || theirPref === 'voice') {
      return 'voice';
    }
    // Both are fine with both
    return 'both';
  };

  // Load match and conversation data
  useEffect(() => {
    async function loadData() {
      try {
        const [matchData, conversationData, icebreakersData, gameData, myProfile] = await Promise.all([
          matchesApi.getMatch(matchId),
          chatApi.getConversation(matchId),
          chatApi.getIcebreakers(matchId).catch(() => ({ icebreakers: [] })),
          gamesApi.getGameState(matchId).catch(() => ({ gameState: null })),
          userApi.getMe().catch(() => ({ profile: { preferences: { communication: 'both' } } })),
        ]);

        setMatch(matchData.match);
        setMessages(conversationData.messages || []);
        setIcebreakers(icebreakersData.icebreakers || []);

        // Get communication preferences
        const myCommPref = myProfile?.profile?.preferences?.communication || 'both';
        const theirCommPref = matchData.match?.otherUser?.preferences?.communication || 'both';

        setMyPreference(myCommPref);
        setTheirPreference(theirCommPref);
        setCommunicationMode(determineCommunicationMode(myCommPref, theirCommPref));

        // Check for active game
        if (gameData.gameState && gameData.gameState.status !== 'complete') {
          setGameState(gameData.gameState);
          setShowGame(true);
        }
      } catch (error) {
        console.error('Error loading chat:', error);
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [matchId, navigate]);

  // Socket connection
  useEffect(() => {
    if (connected && matchId) {
      joinRoom(matchId);

      return () => {
        leaveRoom(matchId);
      };
    }
  }, [connected, matchId, joinRoom, leaveRoom]);

  // Mark messages as read when entering/leaving chat
  useEffect(() => {
    if (matchId) {
      setActiveChat(matchId);
    }

    return () => {
      clearActiveChat();
    };
  }, [matchId, setActiveChat, clearActiveChat]);

  // Socket message handlers
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      if (message.roomId === matchId) {
        setMessages((prev) => [...prev, message]);
      }
    };

    const handleTypingStart = (data) => {
      if (data.roomId === matchId && data.userId !== user?.uid) {
        setOtherTyping(true);
      }
    };

    const handleTypingStop = (data) => {
      if (data.roomId === matchId && data.userId !== user?.uid) {
        setOtherTyping(false);
      }
    };

    const handleGameStarted = (data) => {
      if (data.matchId === matchId) {
        setGameState(data.gameState);
        setShowGame(true);
        setShowGames(false);
      }
    };

    const handleGameMove = (data) => {
      if (data.matchId === matchId) {
        setGameState(data.gameState);
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('typing_start', handleTypingStart);
    socket.on('typing_stop', handleTypingStop);
    socket.on('game_started', handleGameStarted);
    socket.on('game_move', handleGameMove);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('typing_start', handleTypingStart);
      socket.off('typing_stop', handleTypingStop);
      socket.off('game_started', handleGameStarted);
      socket.off('game_move', handleGameMove);
    };
  }, [socket, matchId, user]);

  // Speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join('');
        setInput(transcript);
      };

      recognitionRef.current.onend = () => {
        setListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
    } else {
      recognitionRef.current?.start();
      setListening(true);
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);

    // Typing indicator
    if (connected) {
      startTyping(matchId);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(matchId);
      }, 1000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const messageContent = input.trim();
    setInput('');
    setSending(true);
    stopTyping(matchId);

    try {
      await chatApi.sendMessage(matchId, messageContent, 'text');
    } catch (error) {
      console.error('Send message error:', error);
      // Add message locally on error for optimistic update
      setMessages((prev) => [
        ...prev,
        {
          messageId: Date.now().toString(),
          senderId: user?.uid,
          content: messageContent,
          type: 'text',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const sendIcebreaker = async (icebreaker) => {
    try {
      await chatApi.sendMessage(matchId, icebreaker, 'ai-icebreaker');
      setIcebreakers((prev) => prev.filter((i) => i !== icebreaker));
    } catch (error) {
      console.error('Send icebreaker error:', error);
    }
  };

  const handleFriendRequest = async () => {
    try {
      await matchesApi.requestFriend(matchId);
      setMatch((prev) => ({
        ...prev,
        friendRequestStatus: {
          ...prev.friendRequestStatus,
          [`${user?.uid === prev.user1Id ? 'user1' : 'user2'}Requested`]: true,
        },
      }));
      setShowMenu(false);
    } catch (error) {
      console.error('Friend request error:', error);
    }
  };

  const submitRating = async () => {
    if (rating === 0) return;

    try {
      await matchesApi.rateConnection(matchId, rating);
      setShowRating(false);
    } catch (error) {
      console.error('Rating error:', error);
    }
  };

  const startGame = async (gameType) => {
    try {
      const result = await gamesApi.startGame(matchId, gameType);
      setGameState(result.gameState);
      setShowGame(true);
      setShowMenu(false);
      setShowGames(false);
      // Send a system message about game start
      const gameName = gameType === 'two_truths' ? 'Two Truths & a Lie' :
                       gameType === 'would_you_rather' ? 'Would You Rather' :
                       gameType === '20_questions' ? '20 Questions' : gameType;
      await chatApi.sendMessage(matchId, `🎮 Started a game: ${gameName}! Let's play!`, 'game-start');
    } catch (error) {
      console.error('Start game error:', error);
    }
  };

  const handleGameUpdate = (newGameState) => {
    setGameState(newGameState);
  };

  const handleCloseGame = () => {
    setShowGame(false);
    // Keep gameState in case they want to resume
  };

  const refreshIcebreakers = async () => {
    setLoadingIcebreakers(true);
    try {
      const data = await chatApi.getIcebreakers(matchId + '?refresh=true');
      setIcebreakers(data.icebreakers || []);
    } catch (error) {
      console.error('Refresh icebreakers error:', error);
    } finally {
      setLoadingIcebreakers(false);
    }
  };

  const GAMES = [
    { id: 'two_truths', name: 'Two Truths & a Lie', icon: '🎭', desc: 'Guess which statement is false' },
    { id: 'would_you_rather', name: 'Would You Rather', icon: '🤔', desc: 'Make impossible choices' },
    { id: '20_questions', name: '20 Questions', icon: '❓', desc: 'Guess what they\'re thinking' },
  ];

  const canRequestFriend = useCallback(() => {
    if (!match) return false;
    const userKey = user?.uid === match.user1Id ? 'user1Requested' : 'user2Requested';
    return !match.friendRequestStatus?.[userKey] && match.status !== 'friends';
  }, [match, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-400" />
      </div>
    );
  }

  const otherUser = match?.otherUser;

  return (
    <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)] flex flex-col bg-dark-800">
      {/* Header */}
      <div className="bg-dark-700/50 border-b border-dark-600 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-ghost p-2">
            <ArrowLeft size={24} />
          </button>

          <Link
            to={match?.status === 'friends' ? `/profile/${otherUser?.userId}` : '#'}
            className="flex items-center gap-3 flex-1"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center font-semibold">
              {otherUser?.name?.charAt(0) || '?'}
            </div>
            <div>
              <h2 className="font-semibold">{otherUser?.name || 'Unknown'}</h2>
              <p className="text-dark-300 text-sm flex items-center gap-1">
                <Zap size={14} className="text-success-400" />
                {match?.compatibilityScore || 0}% compatible
              </p>
            </div>
          </Link>

          {/* Voice call button - only if mode allows */}
          {(communicationMode === 'voice' || communicationMode === 'both') && (
            <button
              onClick={() => setShowVoiceCall(!showVoiceCall)}
              className={`btn-ghost p-2 ${showVoiceCall ? 'text-success-400' : 'text-dark-300'}`}
              title="Voice call"
            >
              <Phone size={24} />
            </button>
          )}

          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="btn-ghost p-2">
              <MoreVertical size={24} />
            </button>

            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute right-0 top-full mt-2 w-56 bg-dark-700 border border-dark-600 rounded-xl shadow-xl z-50 overflow-hidden"
                >
                  {canRequestFriend() && (
                    <button
                      onClick={handleFriendRequest}
                      className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-dark-600 transition-colors"
                    >
                      <UserPlus size={20} className="text-accent-400" />
                      Become Friends
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setShowRating(true);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-dark-600 transition-colors"
                  >
                    <Star size={20} className="text-amber-400" />
                    Rate Connection
                  </button>

                  <button
                    onClick={() => startGame('two_truths')}
                    className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-dark-600 transition-colors"
                  >
                    <Gamepad2 size={20} className="text-success-400" />
                    Two Truths & a Lie
                  </button>

                  {match?.status === 'friends' && (
                    <Link
                      to={`/profile/${otherUser?.userId}`}
                      className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-dark-600 transition-colors"
                    >
                      <Info size={20} className="text-primary-400" />
                      View Full Profile
                    </Link>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Communication Mode Banner */}
      {communicationMode === 'conflict' && (
        <div className="bg-amber-400/10 border-b border-amber-400/30 px-4 py-2">
          <div className="flex items-center gap-2 text-amber-400 text-sm">
            <AlertTriangle size={16} />
            <span>
              Communication preference conflict: You prefer {myPreference}, they prefer {theirPreference}.
              Defaulting to text chat.
            </span>
          </div>
        </div>
      )}

      {communicationMode === 'voice' && (
        <div className="bg-primary-400/10 border-b border-primary-400/30 px-4 py-2">
          <div className="flex items-center gap-2 text-primary-400 text-sm">
            <Phone size={16} />
            <span>Voice-only mode: Use the phone button to start a call</span>
          </div>
        </div>
      )}

      {/* Voice Call Panel */}
      <AnimatePresence>
        {showVoiceCall && socket && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-dark-700/50 border-b border-dark-600 overflow-hidden"
          >
            <div className="px-4 py-4">
              <VoiceCall
                socket={socket}
                matchId={matchId}
                userId={user?.uid}
                otherUserName={otherUser?.name || 'Other User'}
                onClose={() => setShowVoiceCall(false)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Icebreakers */}
      {(icebreakers.length > 0 || messages.length === 0) && (
        <div className="bg-dark-700/30 px-4 py-3 border-b border-dark-600">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm text-dark-300">
              <Sparkles size={16} className="text-accent-400" />
              AI Conversation Starters
            </div>
            <button
              onClick={refreshIcebreakers}
              disabled={loadingIcebreakers}
              className="btn-ghost p-1.5 text-dark-400 hover:text-accent-400"
              title="Get new icebreakers"
            >
              <RefreshCw size={16} className={loadingIcebreakers ? 'animate-spin' : ''} />
            </button>
          </div>
          {icebreakers.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {icebreakers.map((icebreaker, index) => (
                <button
                  key={index}
                  onClick={() => sendIcebreaker(icebreaker)}
                  className="flex-shrink-0 px-4 py-2 bg-accent-400/20 text-accent-300 rounded-full text-sm hover:bg-accent-400/30 transition-colors"
                >
                  {icebreaker}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-dark-400 text-sm">Click refresh to get personalized icebreakers!</p>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Active Game */}
          <AnimatePresence>
            {showGame && gameState && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-4"
              >
                <GameContainer
                  matchId={matchId}
                  gameState={gameState}
                  userId={user?.uid}
                  otherUserName={otherUser?.name || 'Other Player'}
                  onGameUpdate={handleGameUpdate}
                  onClose={handleCloseGame}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {messages.length === 0 && !showGame && (
            <div className="text-center py-12">
              <Sparkles className="mx-auto text-dark-400 mb-3" size={48} />
              <p className="text-dark-300">Start a conversation!</p>
              <p className="text-dark-400 text-sm">Use an icebreaker above or say hi</p>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((message, index) => {
              const isOwn = message.senderId === user?.uid;
              const isAiIcebreaker = message.type === 'ai-icebreaker';

              return (
                <motion.div
                  key={message.messageId || index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      isAiIcebreaker
                        ? 'bg-accent-400/20 border border-accent-400/30'
                        : isOwn
                          ? 'bg-primary-400 text-white'
                          : 'bg-dark-700 border border-dark-600'
                    }`}
                  >
                    {isAiIcebreaker && (
                      <div className="flex items-center gap-1 text-accent-400 text-xs mb-1">
                        <Sparkles size={12} />
                        AI Icebreaker
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        isOwn && !isAiIcebreaker ? 'text-primary-200' : 'text-dark-400'
                      }`}
                    >
                      {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Typing indicator */}
          {otherTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-dark-700 border border-dark-600 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Games Panel */}
      <AnimatePresence>
        {showGames && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-dark-700/50 border-t border-dark-600 overflow-hidden"
          >
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Gamepad2 size={18} className="text-success-400" />
                  Play a Game Together
                </div>
                <button onClick={() => setShowGames(false)} className="btn-ghost p-1">
                  <X size={18} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {GAMES.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => startGame(game.id)}
                    className="flex items-center gap-3 p-3 bg-dark-600 hover:bg-dark-500 rounded-lg transition-colors text-left"
                  >
                    <span className="text-2xl">{game.icon}</span>
                    <div>
                      <div className="font-medium text-sm">{game.name}</div>
                      <div className="text-xs text-dark-400">{game.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="bg-dark-700/50 border-t border-dark-600 px-4 py-4">
        {/* Voice-only mode message */}
        {communicationMode === 'voice' ? (
          <div className="max-w-3xl mx-auto text-center py-2">
            <p className="text-dark-400 text-sm mb-2">
              Voice-only mode active. Use the phone button above to call.
            </p>
            <button
              onClick={() => setShowVoiceCall(true)}
              className="btn-primary flex items-center gap-2 mx-auto"
            >
              <Phone size={18} />
              Start Voice Call
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-2">
            {/* Games Button */}
            <button
              type="button"
              onClick={() => setShowGames(!showGames)}
              className={`btn-ghost p-3 ${showGames ? 'text-success-400' : 'text-dark-300'}`}
              title="Play a game"
            >
              <Gamepad2 size={24} />
            </button>

            {/* Voice call button for both mode */}
            {communicationMode === 'both' && (
              <button
                type="button"
                onClick={() => setShowVoiceCall(!showVoiceCall)}
                className={`btn-ghost p-3 ${showVoiceCall ? 'text-success-400' : 'text-dark-300'}`}
                title="Voice call"
              >
                <Phone size={24} />
              </button>
            )}

            {recognitionRef.current && (
              <button
                type="button"
                onClick={toggleListening}
                className={`btn-ghost p-3 ${listening ? 'text-red-400' : 'text-dark-300'}`}
                title={listening ? 'Stop listening' : 'Voice input'}
              >
                {listening ? <MicOff size={24} /> : <Mic size={24} />}
              </button>
            )}

            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Type a message..."
              className="input flex-1"
            />

            <button type="submit" disabled={!input.trim() || sending} className="btn-primary p-3">
              <Send size={24} />
            </button>
          </form>
        )}
      </div>

      {/* Rating Modal */}
      <AnimatePresence>
        {showRating && (
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
              className="card w-full max-w-sm"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">Rate This Connection</h3>
                <button onClick={() => setShowRating(false)} className="btn-ghost p-1">
                  <X size={24} />
                </button>
              </div>

              <p className="text-dark-300 mb-6">
                How's your conversation with {otherUser?.name}?
              </p>

              <div className="flex justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      size={36}
                      className={
                        star <= rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-dark-400'
                      }
                    />
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowRating(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={submitRating}
                  disabled={rating === 0}
                  className="btn-primary flex-1"
                >
                  Submit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Chat;
