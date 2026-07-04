import { createFileRoute, useNavigate, Navigate } from '@tanstack/react-router';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store } from '@/store';
import { useClassroomStore } from '@/lib/classroomStore';
import { playJoinSound, playHandSound } from '@/utils/sounds';
import { connectSocket, getSocket, disconnectSocket } from '@/services/socket';
import { api, joinMeetingByRoomId, heartbeatMeetingByRoomId, leaveMeetingByRoomId } from '@/lib/api';
import '@livekit/components-styles';
import '../index.css';
import {
  setStatus, addParticipant, removeParticipant,
  addToWaiting, removeFromWaiting, addMessage,
  resetMeeting, setRoomId, setScreenSharing,
  addRaisedHand, removeRaisedHand,
} from '@/store/slices/meetingSlice';
import { LiveKitRoom, useLocalParticipant } from '@livekit/components-react';
import VideoGrid from '@/components/meeting/VideoGrid';
import ControlBar from '@/components/meeting/ControlBar';
import ChatPanel from '@/components/meeting/ChatPanel';
import ParticipantsPanel from '@/components/meeting/ParticipantsPanel';
import WaitingPanel from '@/components/meeting/WaitingPanel';

// Default connection details
const LK_SERVER_URL = import.meta.env.VITE_LIVEKIT_URL || "wss://your-livekit-server-url";

export const Route = createFileRoute('/live/$roomId')({
  component: LiveClassroomWrapper,
});

function LiveClassroomWrapper() {
  const { currentUser } = useClassroomStore();

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  return (
    <Provider store={store}>
      <LiveClassroomRoom />
    </Provider>
  );
}

function LiveClassroomRoom() {
  const { roomId: routeRoomId } = Route.useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { currentUser: user, accessToken: token } = useClassroomStore();
  const { status, activePanel, raisedHands } = useSelector((s: any) => s.meeting);

  // Manage body class for scoped meeting styles
  useEffect(() => {
    document.body.classList.add('in-meeting');
    document.documentElement.classList.add('in-meeting');
    return () => {
      document.body.classList.remove('in-meeting');
      document.documentElement.classList.remove('in-meeting');
    };
  }, []);

  const isStaff = user?.role !== 'student';
  const [liveRoomId, setLiveRoomId] = useState<string | null>(routeRoomId);
  const roomIdRef = useRef<string | null>(routeRoomId);
  const [lkToken, setLkToken] = useState<string | null>(null);

  // REST API calls to track attendance in MongoDB
  useEffect(() => {
    if (status !== 'live' || !liveRoomId || liveRoomId === 'new') return;

    if (user?.role === 'student') {
      const joinMeeting = async () => {
        try {
          await joinMeetingByRoomId(liveRoomId);
        } catch (err) {
          console.error('Failed to log meeting join in DB:', err);
        }
      };
      void joinMeeting();

      const heartbeatInterval = setInterval(async () => {
        try {
          await heartbeatMeetingByRoomId(liveRoomId);
        } catch (err) {
          console.error('Failed to send meeting heartbeat to DB:', err);
        }
      }, 30000);

      return () => {
        clearInterval(heartbeatInterval);
        const leaveMeeting = async () => {
          try {
            await leaveMeetingByRoomId(liveRoomId);
          } catch (err) {
            console.error('Failed to log meeting leave in DB:', err);
          }
        };
        void leaveMeeting();
      };
    }
  }, [status, liveRoomId, user?.role]);

  // Media state — visual state kept in React; actual LiveKit calls go via lkActionsRef
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isScreenSharingState, setIsScreenSharingState] = useState(false);
  // Ref that _MediaControllerSync populates once it has LiveKit room context
  const lkActionsRef = useRef<{
    toggleAudio: () => Promise<void>;
    toggleVideo: () => Promise<void>;
    toggleScreen: () => Promise<void>;
  } | null>(null);

  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<any>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);

  const startTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
  }, []);

  useEffect(() => { roomIdRef.current = liveRoomId; }, [liveRoomId]);

  // Fetch LiveKit Token
  const fetchLiveKitToken = async (roomIdentifier: string, uName: string) => {
    try {
      const data = await api.get(`/livekit/get-token?room=${roomIdentifier}`);
      setLkToken(data.token);
    } catch (err) {
      console.error('LK Token fetch error:', err);
      dispatch(setStatus('error'));
    }
  };

  useEffect(() => {
    let mounted = true;
    let socket: any;

    const run = async () => {
      socket = connectSocket({ token: token || undefined });

      socket.on('connect_error', (err: any) => {
        if (mounted) dispatch(setStatus('error'));
      });

      socket.on('admitted', ({ roomId: admittedRoomId, existingParticipants }: any) => {
        if (!mounted) return;
        socket.emit('join-room', { roomId: admittedRoomId }, (res: any) => {
          if (!mounted) return;
          dispatch(setStatus('live'));
          startTimer();
          fetchLiveKitToken(admittedRoomId, user?.name || '');
        });
      });

      socket.on('rejected', () => { if (mounted) dispatch(setStatus('rejected')); });

      socket.on('user-joined', ({ socketId, name, role }: any) => {
        if (!mounted) return;
        dispatch(addParticipant({ socketId, name, role }));
        dispatch(addMessage({ senderId: '__system__', senderName: 'System', message: `${name} joined the class`, timestamp: Date.now(), _system: true }));
      });

      socket.on('join-request', ({ socketId, name }: any) => {
        if (!mounted) return;
        dispatch(addToWaiting({ socketId, name }));
        setJoinRequests(prev => [...prev, { socketId, name, id: Date.now() }]);
        if (isStaff) playJoinSound();
      });

      socket.on('user-left', ({ socketId, name }: any) => {
        if (!mounted) return;
        dispatch(removeParticipant(socketId));
        dispatch(removeFromWaiting(socketId));
        if (name) {
          dispatch(addMessage({ senderId: '__system__', senderName: 'System', message: `${name} left the class`, timestamp: Date.now(), _system: true }));
        }
      });

      socket.on('meeting-ended', () => { if (mounted) dispatch(setStatus('ended')); });

      socket.on('kicked', () => {
        if (!mounted) return;
        dispatch(resetMeeting());
        navigate({ to: '/' });
      });

      socket.on('new-message', (msg: any) => { if (mounted) dispatch(addMessage(msg)); });
      socket.on('hand-raised', (data: any) => { if (mounted) { dispatch(addRaisedHand(data)); if (isStaff) playHandSound(); } });
      socket.on('hand-lowered', ({ socketId }: any) => { if (mounted) dispatch(removeRaisedHand(socketId)); });

      const onConnect = () => {
        if (!mounted) return;
        if (isStaff) {
          socket.emit('staff-create-room', { roomId: routeRoomId }, (res: any) => {
            if (!mounted) return;
            if (res?.error) {
              dispatch(setStatus('error'));
              return;
            }
            const resolvedRoomId = res.roomId;
            setLiveRoomId(resolvedRoomId);
            roomIdRef.current = resolvedRoomId;
            dispatch(setRoomId(resolvedRoomId));
            dispatch(setStatus('live'));
            startTimer();
            fetchLiveKitToken(resolvedRoomId, user?.name || '');
          });
        } else {
          dispatch(setStatus('waiting'));
          socket.emit('student-request-join', { roomId: routeRoomId }, (res: any) => {
            if (res?.error) dispatch(setStatus('error'));
          });
        }
      };

      if (socket.connected) { onConnect(); } else { socket.once('connect', onConnect); }
    };

    run();

    return () => {
      mounted = false;
      clearInterval(timerRef.current);
      const s = getSocket();
      if (s) {
        const r = roomIdRef.current;
        if (r) s.emit('leave-room', { roomId: r });
        disconnectSocket();
      }
      dispatch(resetMeeting());
    };
  }, [routeRoomId, token, user?.name, isStaff, startTimer, dispatch, navigate]);

  const getRoomId = () => liveRoomId || routeRoomId;
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const displayRoomId = liveRoomId && liveRoomId !== 'new' ? liveRoomId : routeRoomId;

  const handleEnd = () => {
    const roomId = getRoomId();
    const s = getSocket();
    if (isStaff) s?.emit('end-meeting', { roomId });
    else s?.emit('leave-room', { roomId });
    disconnectSocket();
    dispatch(resetMeeting());
    navigate({ to: '/' });
  };

  const copyLink = () => {
    const roomId = getRoomId();
    if (!roomId) return;
    navigator.clipboard.writeText(`${window.location.origin}/live/${roomId}`).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    });
  };

  const dismissRequest = (id: number) => setJoinRequests(prev => prev.filter(r => r.id !== id));

  const admitFromToast = (req: any) => {
    getSocket()?.emit('admit-student', { roomId: getRoomId(), targetSocketId: req.socketId });
    dispatch(removeFromWaiting(req.socketId));
    dismissRequest(req.id);
  };

  const rejectFromToast = (req: any) => {
    getSocket()?.emit('reject-student', { roomId: getRoomId(), targetSocketId: req.socketId });
    dispatch(removeFromWaiting(req.socketId));
    dismissRequest(req.id);
  };

  if (status === 'waiting') {
    return (
      <div style={{ height: '100vh', background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(124,58,237,0.3), transparent), #070412', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '24px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>Waiting for the host</h2>
        <button onClick={() => navigate({ to: '/' })} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)', borderRadius: '8px', padding: '8px 20px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}>Cancel</button>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div style={{ height: '100vh', background: '#070412', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        <div style={{ fontSize: '56px' }}>🚫</div>
        <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: '700' }}>Entry Declined</h2>
        <button className="btn-primary" onClick={() => navigate({ to: '/' })}>Return to Dashboard</button>
      </div>
    );
  }

  if (status === 'ended') {
    return (
      <div style={{ height: '100vh', background: '#070412', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        <div style={{ fontSize: '56px' }}>🎓</div>
        <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: '700' }}>Class Ended</h2>
        <button className="btn-primary" onClick={() => navigate({ to: '/' })}>Return to Dashboard</button>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={{ height: '100vh', background: '#070412', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        <div style={{ fontSize: '56px' }}>⚠️</div>
        <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: '700' }}>Connection Error</h2>
        <button className="btn-primary" onClick={() => navigate({ to: '/' })}>Return to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="meeting-layout animate-in">
      {/* ── Row 1: Header — always rendered, always stable ── */}
      <div className="meeting-header">
        <div className="meeting-header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', flexShrink: 0 }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: 'linear-gradient(135deg, #7C3AED, #A855F7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.362a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" /></svg></div>
            <span className="logo-text" style={{ fontWeight: '800', fontSize: '14px' }}>Axon Meeting</span>
          </div>
          <div style={{ width: '1px', height: '20px', background: 'var(--border)', flexShrink: 0 }} />
          {displayRoomId && <div className="room-code-badge">{displayRoomId}</div>}
          {status === 'live' && <div className="live-badge"><div className="live-dot" /><span className="live-label">Live</span></div>}
        </div>
        <div className="meeting-header-right">
          <div className="timer-badge">{fmt(elapsed)}</div>
          {isStaff && displayRoomId && (
            <button onClick={copyLink} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: linkCopied ? 'rgba(0,214,143,0.15)' : 'rgba(124,58,237,0.15)', border: `1px solid ${linkCopied ? 'rgba(0,214,143,0.3)' : 'var(--border)'}`, borderRadius: '8px', padding: '6px 12px', color: linkCopied ? 'var(--green)' : 'var(--secondary)', cursor: 'pointer', fontSize: '13px', fontWeight: '600', flexShrink: 0 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              <span className="share-btn-text">{linkCopied ? 'Copied!' : 'Share Link'}</span>
            </button>
          )}
          <div className="user-avatar-container" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', borderRadius: '99px', padding: '4px 10px 4px 4px', flexShrink: 0 }}>
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'linear-gradient(135deg,#7C3AED,#E879F9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#fff' }}>{user?.name?.charAt(0)?.toUpperCase()}</div>
            <span className="user-name-text" style={{ fontSize: '12px', fontWeight: '600', color: '#fff', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</span>
          </div>
        </div>
      </div>

      {/* ── Row 2: Content — LiveKitRoom wraps only the video area ── */}
      {lkToken ? (
        <LiveKitRoom
          serverUrl={LK_SERVER_URL}
          token={lkToken}
          connect={true}
          audio={true}
          video={true}
          onDisconnected={handleEnd}
          style={{ display: 'flex', minHeight: 0, overflow: 'hidden' }}
        >
          {/* meeting-main fills the entire content row */}
          <div className="meeting-main animate-in" style={{ flex: 1, minHeight: 0 }}>
            <VideoGrid />
            {activePanel === 'chat' && <ChatPanel roomId={getRoomId()} />}
            {activePanel === 'participants' && <ParticipantsPanel localUser={user} roomId={getRoomId()} />}
            {activePanel === 'waiting' && isStaff && <WaitingPanel roomId={getRoomId()} />}
          </div>
          {/* _MediaControllerSync: invisible, only wires LiveKit API into lkActionsRef */}
          <_MediaControllerSync
            audioEnabled={audioEnabled}
            videoEnabled={videoEnabled}
            isScreenSharing={isScreenSharingState}
            isStaff={isStaff}
            onSyncActions={(actions) => { lkActionsRef.current = actions; }}
            onToggleAudio={setAudioEnabled}
            onToggleVideo={setVideoEnabled}
            onToggleScreen={setIsScreenSharingState}
          />
        </LiveKitRoom>
      ) : (
        /* Placeholder content while waiting for LK token */
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#030108', minHeight: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid rgba(124,58,237,0.3)', borderTopColor: '#7C3AED', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', fontWeight: '600' }}>Connecting media…</span>
          </div>
        </div>
      )}

      {/* ── Row 3: Control bar — ALWAYS in the grid, never moves ── */}
      <ControlBar
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled}
        isScreenSharing={isScreenSharingState}
        onToggleAudio={() => lkActionsRef.current ? lkActionsRef.current.toggleAudio() : setAudioEnabled(p => !p)}
        onToggleVideo={() => lkActionsRef.current ? lkActionsRef.current.toggleVideo() : setVideoEnabled(p => !p)}
        onScreenShare={() => lkActionsRef.current ? lkActionsRef.current.toggleScreen() : setIsScreenSharingState(p => !p)}
        onRaiseHand={() => {
          const socket = getSocket();
          const localHandRaised = raisedHands.some((h: any) => h.socketId === socket?.id);
          if (localHandRaised) {
            socket?.emit('lower-hand', { roomId: getRoomId(), targetSocketId: socket?.id });
          } else {
            socket?.emit('raise-hand', { roomId: getRoomId() });
          }
        }}
        onEnd={handleEnd}
        isStaff={isStaff}
      />

      {/* ── Join Request Toasts (staff) ── */}
      <div style={{ position: 'fixed', top: '72px', right: '20px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 9999 }}>
        {joinRequests.map(req => (
          <div key={req.id} className="request-popup animate-in">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg,#7C3AED,#E879F9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: '#fff' }}>
                {req.name.charAt(0).toUpperCase()}
              </div>
              <div><p style={{ color: '#fff', fontWeight: '700', fontSize: '14px', margin: 0 }}>{req.name}</p></div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => admitFromToast(req)} style={{ flex: 1, background: 'var(--green)', border: 'none', borderRadius: '8px', padding: '9px', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>✓ Admit</button>
              <button onClick={() => rejectFromToast(req)} style={{ flex: 1, background: 'rgba(255,74,106,0.15)', border: '1px solid rgba(255,74,106,0.35)', borderRadius: '8px', padding: '9px', color: 'var(--red)', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>✗ Deny</button>
              <button onClick={() => dismissRequest(req.id)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-light)', borderRadius: '8px', width: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>X</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * _MediaControllerSync — renders nothing visible.
 * Lives INSIDE <LiveKitRoom> to access useLocalParticipant().
 * Registers LiveKit API callbacks into lkActionsRef via onSyncActions so the
 * always-visible ControlBar in row 3 can call them.
 */
function _MediaControllerSync({
  audioEnabled, videoEnabled, isScreenSharing, isStaff,
  onSyncActions, onToggleAudio, onToggleVideo, onToggleScreen,
}: {
  audioEnabled: boolean;
  videoEnabled: boolean;
  isScreenSharing: boolean;
  isStaff: boolean;
  onSyncActions: (a: { toggleAudio: () => Promise<void>; toggleVideo: () => Promise<void>; toggleScreen: () => Promise<void> }) => void;
  onToggleAudio: (v: boolean) => void;
  onToggleVideo: (v: boolean) => void;
  onToggleScreen: (v: boolean) => void;
}) {
  const { localParticipant } = useLocalParticipant();

  // Keep a stable ref to the current values so async handlers don't close over stale state
  const stateRef = useRef({ audioEnabled, videoEnabled, isScreenSharing });
  stateRef.current = { audioEnabled, videoEnabled, isScreenSharing };

  useEffect(() => {
    onSyncActions({
      toggleAudio: async () => {
        const next = !stateRef.current.audioEnabled;
        try { await localParticipant.setMicrophoneEnabled(next); } catch (e) { console.warn('[LK] mic', e); }
        onToggleAudio(next);
      },
      toggleVideo: async () => {
        const next = !stateRef.current.videoEnabled;
        try { await localParticipant.setCameraEnabled(next); } catch (e) { console.warn('[LK] cam', e); }
        onToggleVideo(next);
      },
      toggleScreen: async () => {
        const next = !stateRef.current.isScreenSharing;
        
        if (next && !isStaff) {
          alert("Only instructors and administrators have permission to share screen.");
          return;
        }

        try {
          await localParticipant.setScreenShareEnabled(next);
          onToggleScreen(next);
        } catch (e: any) {
          console.warn('[LK] screen', e);
          // LiveKit throws a meaningful error if screen share is unsupported on the platform
          alert("Could not start screen sharing: " + (e?.message || String(e)));
        }
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localParticipant]);

  return null; // renders nothing — ControlBar lives in row 3 of the grid
}
