import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, Users, UserPlus, X, Loader2, Search, Hash } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../ui/Button";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

interface PRChatPanelProps {
  repoId: string;
  prNumber: string;
  onClose?: () => void;
}

export function PRChatPanel({ repoId, prNumber, onClose }: PRChatPanelProps) {
  const { user } = useAuth();
  
  const [channels, setChannels] = useState<any[]>([]);
  const [activeChannel, setActiveChannel] = useState<any>(null);
  
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  // Modals
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  
  const [showInvite, setShowInvite] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchChannels = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/channels/${repoId}/${prNumber}`, {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setChannels(data.channels);
        if (data.channels.length > 0 && !activeChannel) {
          setActiveChannel(data.channels[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch channels:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, [repoId, prNumber]);

  const fetchMessages = async () => {
    if (!activeChannel) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/channels/${activeChannel._id}/messages`, {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [activeChannel]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repositoryId: repoId, prNumber, name: newChannelName }),
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setChannels([data.channel, ...channels]);
        setActiveChannel(data.channel);
        setShowCreateChannel(false);
        setNewChannelName("");
      }
    } catch (err) {
      console.error("Failed to create channel:", err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChannel) return;
    
    setSending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/channels/${activeChannel._id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage }),
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setMessages([...messages, data.message]);
        setNewMessage("");
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.users);
      }
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setSearching(false);
    }
  };

  const handleInvite = async (userId: string) => {
    if (!activeChannel) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/channels/${activeChannel._id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setActiveChannel(data.channel);
        setShowInvite(false);
        setSearchQuery("");
        setSearchResults([]);
        
        // Update channels list so members stay in sync
        setChannels(channels.map(c => c._id === data.channel._id ? data.channel : c));
      }
    } catch (err) {
      console.error("Invite failed:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-white border-l border-slate-200 w-80">
        <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200 w-80 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
        <h3 className="font-semibold text-slate-900 flex items-center">
          <MessageSquare className="w-4 h-4 mr-2 text-indigo-600" />
          Discussions
        </h3>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Channel Selector / Creator */}
      <div className="p-3 border-b border-slate-100 flex-shrink-0 space-y-2">
        {channels.length > 0 ? (
          <select 
            className="w-full text-sm border-slate-200 rounded-md bg-slate-50 text-slate-700"
            value={activeChannel?._id || ""}
            onChange={(e) => setActiveChannel(channels.find(c => c._id === e.target.value))}
          >
            {channels.map(c => (
              <option key={c._id} value={c._id}># {c.name}</option>
            ))}
          </select>
        ) : (
          <div className="text-xs text-slate-500 text-center py-2">No channels yet.</div>
        )}
        
        <Button 
          variant="outline" 
          className="w-full text-xs h-8"
          onClick={() => setShowCreateChannel(true)}
        >
          <Hash className="w-3 h-3 mr-1" /> New Channel
        </Button>
      </div>

      {/* Active Channel Body */}
      {activeChannel ? (
        <>
          <div className="flex items-center justify-between px-3 py-2 bg-indigo-50/50 border-b border-slate-100 text-xs text-indigo-700">
            <span className="flex items-center">
              <Users className="w-3 h-3 mr-1" />
              {activeChannel.members?.length || 0} Members
            </span>
            <button 
              onClick={() => setShowInvite(true)}
              className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center"
            >
              <UserPlus className="w-3 h-3 mr-1" /> Invite
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
            {messages.length === 0 ? (
              <div className="text-center text-sm text-slate-400 py-8">
                No messages yet. Say hello!
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg._id} className={`flex flex-col ${msg.sender?._id === user?._id ? "items-end" : "items-start"}`}>
                  <div className="flex items-end space-x-1 mb-1">
                    {msg.sender?._id !== user?._id && (
                      <span className="text-[10px] text-slate-500 font-medium">{msg.sender?.name}</span>
                    )}
                  </div>
                  <div 
                    className={`px-3 py-2 rounded-2xl max-w-[90%] text-sm ${
                      msg.sender?._id === user?._id 
                        ? "bg-indigo-600 text-white rounded-tr-sm" 
                        : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-200 bg-white">
            <form onSubmit={handleSendMessage} className="flex space-x-2">
              <input 
                type="text" 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 text-sm border-slate-200 rounded-full px-4 focus:ring-indigo-500 focus:border-indigo-500"
                disabled={sending}
              />
              <button 
                type="submit" 
                disabled={!newMessage.trim() || sending}
                className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center disabled:opacity-50 hover:bg-indigo-700 transition-colors"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </form>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500">
          <MessageSquare className="w-12 h-12 text-slate-200 mb-4" />
          <p className="text-sm">Create a channel to start discussing this Pull Request.</p>
        </div>
      )}

      {/* Create Channel Modal */}
      {showCreateChannel && (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6">
          <div className="bg-white p-5 rounded-xl shadow-xl border border-slate-200 w-full relative">
            <button 
              onClick={() => setShowCreateChannel(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
            <h4 className="font-bold text-slate-900 mb-4">New Discussion Channel</h4>
            <input 
              type="text"
              autoFocus
              placeholder="e.g. Frontend Architecture"
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              className="w-full text-sm mb-4 border-slate-300 rounded-md"
            />
            <Button className="w-full" onClick={handleCreateChannel} disabled={!newChannelName.trim()}>
              Create Channel
            </Button>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6">
          <div className="bg-white p-5 rounded-xl shadow-xl border border-slate-200 w-full relative">
            <button 
              onClick={() => setShowInvite(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
            <h4 className="font-bold text-slate-900 mb-2">Invite to #{activeChannel?.name}</h4>
            <p className="text-xs text-slate-500 mb-4">Search by exact email or GitHub username.</p>
            
            <div className="flex space-x-2 mb-4">
              <input 
                type="text"
                autoFocus
                placeholder="Search user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
                className="flex-1 text-sm border-slate-300 rounded-md"
              />
              <Button variant="outline" className="px-3" onClick={handleSearchUsers} disabled={searching}>
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {searchResults.length === 0 && searchQuery && !searching && (
                <div className="text-xs text-slate-500 text-center py-2">No users found.</div>
              )}
              {searchResults.map(u => {
                const isMember = activeChannel?.members?.some((m: any) => m._id === u._id);
                return (
                  <div key={u._id} className="flex items-center justify-between p-2 rounded-lg border border-slate-100 bg-slate-50 text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-800">{u.name}</span>
                      <span className="text-[10px] text-slate-500">{u.email}</span>
                    </div>
                    {isMember ? (
                      <span className="text-[10px] text-emerald-600 font-medium px-2 py-1 bg-emerald-50 rounded">Joined</span>
                    ) : (
                      <Button variant="outline" className="h-6 px-2 text-xs" onClick={() => handleInvite(u._id)}>
                        Invite
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
