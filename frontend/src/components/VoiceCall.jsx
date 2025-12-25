import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneCall,
  PhoneIncoming,
} from 'lucide-react';

const CALL_TIMEOUT_MS = 10000; // 10 seconds

function VoiceCall({ socket, matchId, userId, otherUserName, onClose }) {
  const [callState, setCallState] = useState('idle'); // idle, calling, incoming, connected
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState(null);

  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const callTimerRef = useRef(null);
  const callTimeoutRef = useRef(null);
  const pendingOfferRef = useRef(null);

  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  // Cleanup function
  const cleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
    pendingOfferRef.current = null;
    setCallDuration(0);
  }, []);

  // Initialize audio stream with iPhone Safari compatibility
  const initializeAudio = async () => {
    try {
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support audio calls');
      }

      // Request microphone permission with Safari-compatible constraints
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      return stream;
    } catch (err) {
      console.error('Error accessing microphone:', err);

      // Provide more helpful error messages
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone access denied. Please allow microphone access in your browser settings and reload the page.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No microphone found. Please connect a microphone and try again.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Microphone is in use by another application. Please close other apps using the microphone.');
      } else if (err.name === 'OverconstrainedError') {
        // Try again with simpler constraints for older devices
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          localStreamRef.current = stream;
          return stream;
        } catch (fallbackErr) {
          setError('Could not access microphone. Please check your device settings.');
          throw fallbackErr;
        }
      } else {
        setError('Could not access microphone. Please check permissions and try again.');
      }
      throw err;
    }
  };

  // Create peer connection
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(iceServers);

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('voice_ice_candidate', {
          roomId: matchId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      remoteStreamRef.current = event.streams[0];
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
        // For iOS Safari, we need to play on user interaction
        remoteAudioRef.current.play().catch(e => {
          console.log('Auto-play prevented, will play on user interaction');
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        // Clear timeout when connected
        if (callTimeoutRef.current) {
          clearTimeout(callTimeoutRef.current);
          callTimeoutRef.current = null;
        }
        setCallState('connected');
        // Start call timer
        callTimerRef.current = setInterval(() => {
          setCallDuration(prev => prev + 1);
        }, 1000);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        handleEndCall();
      }
    };

    return pc;
  }, [socket, matchId]);

  // Start a call
  const startCall = async () => {
    try {
      setError(null);
      setCallState('calling');

      const stream = await initializeAudio();
      const pc = createPeerConnection();
      peerConnectionRef.current = pc;

      // Add local stream tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('voice_call_offer', {
        roomId: matchId,
        offer: pc.localDescription,
        callerId: userId,
      });

      // Set timeout for unanswered calls
      callTimeoutRef.current = setTimeout(() => {
        if (callState === 'calling') {
          setError('Call timed out - no answer');
          handleEndCall();
        }
      }, CALL_TIMEOUT_MS);
    } catch (err) {
      console.error('Error starting call:', err);
      setCallState('idle');
      cleanup();
    }
  };

  // Answer incoming call
  const answerCall = async () => {
    try {
      setError(null);
      setCallState('connecting');

      const offer = pendingOfferRef.current;
      if (!offer) {
        setError('Call offer expired');
        setCallState('idle');
        return;
      }

      const stream = await initializeAudio();
      const pc = createPeerConnection();
      peerConnectionRef.current = pc;

      // Add local stream tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Set remote description
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Create and send answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('voice_call_answer', {
        roomId: matchId,
        answer: pc.localDescription,
      });
    } catch (err) {
      console.error('Error answering call:', err);
      setCallState('idle');
      cleanup();
    }
  };

  // End call
  const handleEndCall = useCallback(() => {
    socket?.emit('voice_call_end', { roomId: matchId });
    cleanup();
    setCallState('idle');
  }, [socket, matchId, cleanup]);

  // Decline incoming call
  const declineCall = () => {
    socket?.emit('voice_call_decline', { roomId: matchId });
    pendingOfferRef.current = null;
    setCallState('idle');
  };

  // Toggle mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  // Toggle deafen
  const toggleDeafen = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !isDeafened;
      setIsDeafened(!isDeafened);
    }
  };

  // Format duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const handleCallOffer = ({ offer, callerId }) => {
      if (callerId !== userId && callState === 'idle') {
        pendingOfferRef.current = offer;
        setCallState('incoming');

        // Auto-decline after timeout
        callTimeoutRef.current = setTimeout(() => {
          if (callState === 'incoming') {
            declineCall();
          }
        }, CALL_TIMEOUT_MS);
      }
    };

    const handleCallAnswer = async ({ answer }) => {
      try {
        // Clear the calling timeout
        if (callTimeoutRef.current) {
          clearTimeout(callTimeoutRef.current);
          callTimeoutRef.current = null;
        }

        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(answer)
          );
        }
      } catch (err) {
        console.error('Error handling answer:', err);
      }
    };

    const handleIceCandidate = async ({ candidate }) => {
      try {
        if (peerConnectionRef.current && candidate) {
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
        }
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    };

    const handleCallEnd = () => {
      cleanup();
      setCallState('idle');
    };

    const handleCallDecline = () => {
      cleanup();
      setCallState('idle');
      setError('Call was declined');
    };

    socket.on('voice_call_offer', handleCallOffer);
    socket.on('voice_call_answer', handleCallAnswer);
    socket.on('voice_ice_candidate', handleIceCandidate);
    socket.on('voice_call_end', handleCallEnd);
    socket.on('voice_call_decline', handleCallDecline);

    return () => {
      socket.off('voice_call_offer', handleCallOffer);
      socket.off('voice_call_answer', handleCallAnswer);
      socket.off('voice_ice_candidate', handleIceCandidate);
      socket.off('voice_call_end', handleCallEnd);
      socket.off('voice_call_decline', handleCallDecline);
    };
  }, [socket, userId, cleanup, callState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Idle state - show call button
  if (callState === 'idle') {
    return (
      <div className="flex flex-col items-center gap-3">
        {error && (
          <p className="text-error-400 text-sm text-center max-w-xs">{error}</p>
        )}
        <button
          onClick={startCall}
          className="btn bg-success-400 hover:bg-success-500 text-white px-6 py-3 rounded-full flex items-center gap-2"
        >
          <Phone size={20} />
          Start Voice Call
        </button>
        <p className="text-dark-400 text-xs text-center">
          Call will timeout after 10 seconds if not answered
        </p>
      </div>
    );
  }

  // Incoming call
  if (callState === 'incoming') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-dark-700 rounded-xl p-6 border border-dark-600 text-center"
      >
        <PhoneIncoming className="mx-auto text-success-400 mb-4 animate-pulse" size={48} />
        <h3 className="text-lg font-semibold mb-2">Incoming Call</h3>
        <p className="text-dark-300 mb-6">{otherUserName} is calling you</p>

        <div className="flex justify-center gap-4">
          <button
            onClick={declineCall}
            className="w-14 h-14 rounded-full bg-error-400 hover:bg-error-500 flex items-center justify-center text-white transition-colors"
          >
            <PhoneOff size={24} />
          </button>
          <button
            onClick={answerCall}
            className="w-14 h-14 rounded-full bg-success-400 hover:bg-success-500 flex items-center justify-center text-white transition-colors"
          >
            <Phone size={24} />
          </button>
        </div>
      </motion.div>
    );
  }

  // Calling/connecting state
  if (callState === 'calling' || callState === 'connecting') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-dark-700 rounded-xl p-6 border border-dark-600 text-center"
      >
        <PhoneCall className="mx-auto text-primary-400 mb-4 animate-pulse" size={48} />
        <h3 className="text-lg font-semibold mb-2">
          {callState === 'calling' ? 'Calling...' : 'Connecting...'}
        </h3>
        <p className="text-dark-300 mb-6">{otherUserName}</p>

        <button
          onClick={handleEndCall}
          className="w-14 h-14 rounded-full bg-error-400 hover:bg-error-500 flex items-center justify-center text-white transition-colors mx-auto"
        >
          <PhoneOff size={24} />
        </button>
      </motion.div>
    );
  }

  // Connected state
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-dark-700 rounded-xl p-6 border border-success-400/30 text-center"
    >
      {/* Hidden audio element for remote stream */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        // For iOS Safari
        webkit-playsinline="true"
      />

      <div className="flex items-center justify-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full bg-success-400 animate-pulse" />
        <span className="text-success-400 font-medium">Connected</span>
      </div>

      <h3 className="text-lg font-semibold mb-1">{otherUserName}</h3>
      <p className="text-dark-400 text-sm mb-6">{formatDuration(callDuration)}</p>

      <div className="flex justify-center gap-3">
        <button
          onClick={toggleMute}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            isMuted
              ? 'bg-error-400 text-white'
              : 'bg-dark-600 hover:bg-dark-500 text-dark-200'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <button
          onClick={handleEndCall}
          className="w-12 h-12 rounded-full bg-error-400 hover:bg-error-500 flex items-center justify-center text-white transition-colors"
          title="End call"
        >
          <PhoneOff size={20} />
        </button>

        <button
          onClick={toggleDeafen}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            isDeafened
              ? 'bg-error-400 text-white'
              : 'bg-dark-600 hover:bg-dark-500 text-dark-200'
          }`}
          title={isDeafened ? 'Undeafen' : 'Deafen'}
        >
          {isDeafened ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      </div>
    </motion.div>
  );
}

export default VoiceCall;
