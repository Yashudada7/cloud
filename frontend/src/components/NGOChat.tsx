import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { auth } from '../lib/firebase';
import { Send, MessageCircle, X, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatMessage {
  _id: string;
  ngoId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
}

interface NGOChatProps {
  ngoId: string;
  ngoName: string;
  userName: string;
  isAdmin?: boolean;
  onClose?: () => void;
  onUserClick?: (userId: string) => void;
}

type ConnectionState = 'connecting' | 'connected' | 'error' | 'auth_error';

const NGOChat: React.FC<NGOChatProps> = ({ ngoId, ngoName, userName, isAdmin = false, onClose, onUserClick }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [connState, setConnState] = useState<ConnectionState>('connecting');
  const [connError, setConnError] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const myUid = auth.currentUser?.uid;

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!ngoId || !auth.currentUser) {
      setConnState('auth_error');
      setConnError('You must be logged in to access this chat.');
      return;
    }

    let socket: Socket;

    const connect = async () => {
      try {
        // Get fresh Firebase JWT token
        const token = await auth.currentUser!.getIdToken();

        socket = io(window.location.origin, {
          path: '/socket.io',
          auth: { token },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 2000,
        });

        socketRef.current = socket;
        setConnState('connecting');

        socket.on('connect', () => {
          setConnState('connected');
          setConnError('');
          // Join the NGO room immediately on connect
          socket.emit('join_room', ngoId);
        });

        socket.on('message_history', (history: ChatMessage[]) => {
          setMessages(history);
          setTimeout(scrollToBottom, 50);
        });

        socket.on('new_message', (msg: ChatMessage) => {
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m._id === msg._id)) return prev;
            return [...prev, msg];
          });
          setTimeout(scrollToBottom, 50);
        });

        socket.on('error', (err: { message: string }) => {
          setConnState('error');
          setConnError(err.message || 'Connection error');
        });

        socket.on('connect_error', (err) => {
          setConnState('error');
          setConnError(err.message?.includes('Unauthorized') ? 'Authentication failed. Please sign in again.' : 'Connection failed. Retrying…');
        });

        socket.on('disconnect', (reason) => {
          if (reason !== 'io client disconnect') {
            setConnState('connecting');
          }
        });

        socket.on('reconnect', () => {
          setConnState('connected');
          socket.emit('join_room', ngoId);
        });

      } catch (err) {
        setConnState('auth_error');
        setConnError('Failed to get authentication token.');
      }
    };

    connect();

    return () => {
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [ngoId, scrollToBottom]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !socketRef.current || connState !== 'connected') return;
    setSending(true);
    socketRef.current.emit('send_message', { ngoId, text: input.trim() });
    setInput('');
    setSending(false);
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch { return ''; }
  };

  // Group messages by date for display
  const groupedMessages = messages.reduce<{ date: string; msgs: ChatMessage[] }[]>((acc, msg) => {
    const date = formatDate(msg.createdAt);
    const last = acc[acc.length - 1];
    if (last && last.date === date) { last.msgs.push(msg); }
    else { acc.push({ date, msgs: [msg] }); }
    return acc;
  }, []);

  const StatusBar = () => (
    <div className={`flex items-center gap-2 px-3 py-1.5 text-[9px] font-black uppercase shrink-0 ${
      connState === 'connected' ? 'bg-green-600 text-white' :
      connState === 'connecting' ? 'bg-bauhaus-yellow text-black' :
      'bg-bauhaus-red text-white'
    }`}>
      {connState === 'connected' ? (
        <><Wifi size={10} /> LIVE</>
      ) : connState === 'connecting' ? (
        <><Loader2 size={10} className="animate-spin" /> CONNECTING…</>
      ) : (
        <><WifiOff size={10} /> {connError || 'DISCONNECTED'}</>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white border-4 border-black shadow-[8px_8px_0px_0px_black]">
      {/* Header */}
      <div className="bg-black text-white p-4 flex items-center justify-between border-b-4 border-black shrink-0">
        <div className="flex items-center gap-3">
          <MessageCircle size={20} />
          <div>
            <div className="font-black uppercase text-sm leading-none">{ngoName}</div>
            <div className="text-[9px] font-bold uppercase opacity-50 mt-0.5">
              {isAdmin ? 'ADMIN • GROUP CHAT' : 'VOLUNTEER CHAT'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBar />
          {onClose && (
            <button onClick={onClose} className="p-1 hover:bg-bauhaus-red transition-colors ml-1">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Auth / Connection Error Screen */}
      {(connState === 'auth_error' || (connState === 'error' && connError.includes('authoris'))) && (
        <div className="flex-grow flex flex-col items-center justify-center p-8 text-center">
          <WifiOff size={48} className="opacity-20 mb-4" />
          <div className="text-lg font-black uppercase opacity-60">{connError}</div>
          {!isAdmin && (
            <p className="text-xs font-bold uppercase opacity-40 mt-2">
              Only approved volunteers can access this chat.
            </p>
          )}
        </div>
      )}

      {/* Messages Area */}
      {connState !== 'auth_error' && !(connState === 'error' && connError.includes('authoris')) && (
        <div className="flex-grow overflow-y-auto p-4 space-y-1 bg-[#FAFAFA]">
          {connState === 'connecting' && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full opacity-30">
              <Loader2 size={40} className="animate-spin mb-3" />
              <p className="font-black uppercase text-sm">Connecting to chat…</p>
            </div>
          )}

          {connState !== 'connecting' && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full opacity-30 py-12">
              <MessageCircle size={48} />
              <p className="font-black uppercase text-sm mt-3">No messages yet. Start the conversation!</p>
            </div>
          )}

          <AnimatePresence initial={false}>
            {groupedMessages.map(({ date, msgs }) => (
              <div key={date}>
                {/* Date separator */}
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-grow h-px bg-black/10" />
                  <span className="text-[8px] font-black uppercase opacity-30 px-2">{date}</span>
                  <div className="flex-grow h-px bg-black/10" />
                </div>

                {msgs.map((msg) => {
                  const isMe = msg.senderId === myUid;
                  return (
                    <motion.div
                      key={msg._id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex flex-col mb-2 ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      {!isMe && (
                        <div 
                          onClick={() => onUserClick?.(msg.senderId)}
                          className={`text-[9px] font-black uppercase opacity-50 mb-1 ml-2 ${onUserClick ? 'cursor-pointer hover:text-bauhaus-blue hover:underline' : ''}`}
                        >
                          {msg.senderName}
                          {msg.senderName === ngoName && (
                            <span className="ml-1 bg-bauhaus-blue text-white px-1 text-[7px]">NGO</span>
                          )}
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] px-4 py-2 border-2 border-black text-sm font-bold leading-relaxed ${
                          isMe
                            ? 'bg-black text-white shadow-[3px_3px_0px_0px_#FFCC00]'
                            : 'bg-white text-black shadow-[3px_3px_0px_0px_black]'
                        }`}
                      >
                        {msg.text}
                      </div>
                      <div className="text-[8px] opacity-25 font-black uppercase mt-0.5 mx-2">
                        {formatTime(msg.createdAt)}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="border-t-4 border-black p-3 flex gap-2 bg-white shrink-0"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={connState !== 'connected'}
          placeholder={connState === 'connected' ? 'TYPE A MESSAGE…' : 'WAITING FOR CONNECTION…'}
          className="flex-grow border-2 border-black p-2 font-bold uppercase text-sm focus:bg-bauhaus-yellow outline-none disabled:opacity-40 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={sending || !input.trim() || connState !== 'connected'}
          className="bg-black text-white px-4 py-2 font-black uppercase text-xs flex items-center gap-2 hover:bg-bauhaus-blue transition-colors disabled:opacity-40 border-2 border-black"
        >
          <Send size={14} />
          SEND
        </button>
      </form>
    </div>
  );
};

export default NGOChat;
