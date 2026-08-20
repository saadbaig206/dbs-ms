'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Bot,
  User,
  Send,
  RefreshCw,
  Sliders,
  BookOpen,
  Check,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { apiFetch } from '../../lib/api/client';
import { useClinic } from '../../lib/context/ClinicContext';
import { useRouter } from 'next/navigation';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { Button } from '../../components/ui/Button';

interface Conversation {
  id: string;
  phone: string;
  name: string | null;
  mode: 'agent' | 'human';
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface Settings {
  system_prompt: string;
  knowledge_base: string;
}

export default function WhatsAppPage() {
  const { role, isLoading } = useClinic();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && role !== 'admin') {
      router.push('/dashboard');
    }
  }, [role, isLoading, router]);

  const [activeTab, setActiveTab] = useState<'chat' | 'settings'>('chat');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState('');
  
  // Settings State
  const [systemPrompt, setSystemPrompt] = useState('');
  const [knowledgeBase, setKnowledgeBase] = useState('');
  
  // UI states
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch Conversations
  const fetchConversations = async (silent = false) => {
    if (!silent) setLoadingConvs(true);
    try {
      const data = await apiFetch<Conversation[]>('/whatsapp/conversations');
      setConversations(data);
      if (selectedConv) {
        const updated = data.find(c => c.id === selectedConv.id);
        if (updated) setSelectedConv(updated);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load conversations', 'error');
    } finally {
      if (!silent) setLoadingConvs(false);
    }
  };

  // Fetch Messages for a conversation
  const fetchMessages = async (convId: string, silent = false) => {
    if (!silent) setLoadingMsgs(true);
    try {
      const data = await apiFetch<Message[]>(`/whatsapp/conversations/${convId}/messages`);
      setMessages(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load messages', 'error');
    } finally {
      if (!silent) setLoadingMsgs(false);
    }
  };

  // Fetch Settings
  const fetchSettings = async () => {
    setLoadingSettings(true);
    try {
      const data = await apiFetch<Settings>('/whatsapp/settings');
      setSystemPrompt(data.system_prompt || '');
      setKnowledgeBase(data.knowledge_base || '');
    } catch (err: any) {
      showToast(err.message || 'Failed to load settings', 'error');
    } finally {
      setLoadingSettings(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await apiFetch<Settings>('/whatsapp/settings', {
        method: 'POST',
        body: JSON.stringify({
          system_prompt: systemPrompt,
          knowledge_base: knowledgeBase
        })
      });
      showToast('WhatsApp agent settings saved successfully!');
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  // Toggle Mode (Agent / Human)
  const toggleMode = async (conv: Conversation) => {
    const nextMode = conv.mode === 'agent' ? 'human' : 'agent';
    try {
      const updated = await apiFetch<Conversation>(`/whatsapp/conversations/${conv.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ mode: nextMode })
      });
      setSelectedConv(updated);
      setConversations(prev => prev.map(c => c.id === conv.id ? updated : c));
      showToast(`Switched to ${nextMode.toUpperCase()} reply mode`);
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle mode', 'error');
    }
  };

  // Send Manual Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConv || !replyText.trim() || sendingMsg) return;

    setSendingMsg(true);
    try {
      const newMsg = await apiFetch<Message>(`/whatsapp/conversations/${selectedConv.id}/send`, {
        method: 'POST',
        body: JSON.stringify({ message: replyText })
      });
      setMessages(prev => [...prev, newMsg]);
      setReplyText('');
      fetchConversations(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to send message', 'error');
    } finally {
      setSendingMsg(false);
    }
  };

  // Poll for updates in active conversation
  useEffect(() => {
    if (role === 'admin') {
      fetchConversations();
      fetchSettings();
    }
  }, [role]);

  // Poll active chat and conversation list every 5 seconds
  useEffect(() => {
    if (!selectedConv) return;
    const interval = setInterval(() => {
      fetchConversations(true);
      fetchMessages(selectedConv.id, true);
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedConv]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (isLoading || role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-500 animate-pulse font-bold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 text-slate-900 dark:text-slate-100">
      {/* Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold ${
              toast.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200'
                : 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200'
            }`}
          >
            {toast.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" /> : <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Breadcrumb />
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            WhatsApp AI Chatbot & Agent
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage incoming inquiries, toggle AI automated reply mode, and configure the business knowledge base.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 p-1.5 rounded-2xl self-start md:self-auto shadow-sm">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Chat Console
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Knowledge Base Settings
          </button>
        </div>
      </div>

      {activeTab === 'chat' ? (
        /* Chat Console Split View */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-230px)] min-h-[550px] max-h-[750px]">
          {/* Left panel: Conversation List */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl flex flex-col overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800/85 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Active Chats ({conversations.length})
              </span>
              <button
                onClick={() => fetchConversations()}
                disabled={loadingConvs}
                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors disabled:opacity-50 cursor-pointer"
                title="Refresh Chats"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingConvs ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              {loadingConvs && conversations.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  Loading conversations...
                </div>
              ) : conversations.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <MessageSquare className="w-8 h-8 text-slate-400 mb-2" />
                  <p className="text-xs font-bold text-slate-400">No conversations yet</p>
                  <p className="text-[10px] text-slate-500 mt-1">Meta WhatsApp Webhook messages will appear here.</p>
                </div>
              ) : (
                conversations.map((conv) => {
                  const isSelected = selectedConv?.id === conv.id;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        setSelectedConv(conv);
                        fetchMessages(conv.id);
                      }}
                      className={`p-3.5 rounded-2xl cursor-pointer border transition-all flex flex-col gap-1.5 ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-600/10 border-blue-200 dark:border-blue-600/40'
                          : 'bg-slate-50/50 dark:bg-slate-900/60 border-slate-100 dark:border-slate-800/60 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs tracking-wide text-slate-900 dark:text-slate-100">
                          {conv.name || conv.phone}
                        </span>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold tracking-wider uppercase border flex items-center gap-1 ${
                            conv.mode === 'agent'
                              ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/80'
                              : 'bg-orange-50 dark:bg-orange-950/80 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800/80'
                          }`}
                        >
                          {conv.mode === 'agent' ? (
                            <>
                              <Bot className="w-2.5 h-2.5" />
                              AI Agent
                            </>
                          ) : (
                            <>
                              <User className="w-2.5 h-2.5" />
                              Human
                            </>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        <span>{conv.phone}</span>
                        <span>{new Date(conv.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right panel: Active Chat Window */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl flex flex-col overflow-hidden shadow-sm">
            {selectedConv ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
                  <div className="flex flex-col">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white tracking-wide">
                      {selectedConv.name || selectedConv.phone}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Phone: {selectedConv.phone}
                    </span>
                  </div>

                  {/* Mode Selector Toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase hidden sm:inline">
                      Chat Mode:
                    </span>
                    <button
                      onClick={() => toggleMode(selectedConv)}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer ${
                        selectedConv.mode === 'agent'
                          ? 'bg-blue-50 dark:bg-blue-600/10 border-blue-200 dark:border-blue-600/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-600/20'
                          : 'bg-orange-50 dark:bg-orange-600/10 border-orange-200 dark:border-orange-600/30 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-600/20'
                      }`}
                    >
                      {selectedConv.mode === 'agent' ? (
                        <>
                          <Bot className="w-3.5 h-3.5" />
                          AI Chatbot Active
                        </>
                      ) : (
                        <>
                          <User className="w-3.5 h-3.5" />
                          Human Replier Active
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Chat History Panel */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30 dark:bg-slate-950/20 custom-scrollbar">
                  {loadingMsgs && messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-500">
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      Loading messages...
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isUser = msg.role === 'user';
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}
                        >
                          <div
                            className={`max-w-[80%] p-3.5 rounded-2xl text-xs leading-relaxed border ${
                              isUser
                                ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none'
                                : 'bg-blue-600 text-white border-blue-500/20 rounded-tr-none shadow-lg shadow-blue-600/10'
                            }`}
                          >
                            <p>{msg.content}</p>
                            <span
                              className={`block text-[8px] mt-1.5 text-right ${
                                isUser ? 'text-slate-400 dark:text-slate-500' : 'text-blue-200'
                              }`}
                            >
                              {new Date(msg.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input Panel */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/20 dark:bg-slate-900/30">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={
                        selectedConv.mode === 'agent'
                          ? "Switch to Human Mode to reply manually..."
                          : "Type your manual reply here..."
                      }
                      disabled={selectedConv.mode === 'agent' || sendingMsg}
                      className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <Button
                      type="submit"
                      disabled={selectedConv.mode === 'agent' || !replyText.trim() || sendingMsg}
                      className="rounded-xl px-4 flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:opacity-40"
                    >
                      {sendingMsg ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </form>
                  {selectedConv.mode === 'agent' && (
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-500 font-medium">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                      <span>The agent is responding automatically. Click the chatbot toggle above to take over.</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <Bot className="w-12 h-12 text-slate-400 dark:text-slate-600 mb-3 animate-pulse" />
                <h3 className="font-bold text-sm text-slate-500">No Chat Selected</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[280px]">
                  Select an active customer conversation from the list to view history, toggle modes, or reply.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Knowledge Base and Settings Tab */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl shadow-sm p-6 max-w-4xl">
          <div className="flex items-center gap-2 mb-6">
            <BookOpen className="w-5 h-5 text-blue-500" />
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
              Chatbot Configuration & FAQ Knowledge Base
            </h2>
          </div>

          {loadingSettings ? (
            <div className="flex items-center justify-center py-12 text-slate-500 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              Loading configuration...
            </div>
          ) : (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              {/* System Prompt Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  System Prompt (AI Persona & Directives)
                </label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="You are an AI receptionist for Aura Luxury Clinic. Keep responses brief, luxury-themed, and helpful. Guide users to make appointments."
                  rows={4}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-2xl p-4 text-xs text-slate-950 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-all outline-none leading-relaxed"
                  required
                />
                <span className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                  Sets the core behavior, tone of voice, and guidelines for the AI Agent when responding to clients.
                </span>
              </div>

              {/* Knowledge Base Info Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  FAQ & Knowledge Base Context
                </label>
                <textarea
                  value={knowledgeBase}
                  onChange={(e) => setKnowledgeBase(e.target.value)}
                  placeholder="CLINIC INFO: Aura Luxury Clinic is open Mon-Sat 11 AM - 8 PM.
SERVICES: Advanced Laser Hair Removal (PKR 5,000/session), Hydrafacial (PKR 8,000), Botox (PKR 25,000).
DOCTORS: Dr. Ali Imran (Aesthetic Consultant).
POLICIES: Appointments must be booked 24h in advance."
                  rows={10}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-2xl p-4 text-xs text-slate-950 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-all outline-none leading-relaxed font-mono"
                  required
                />
                <span className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                  Provide detailed information about services, pricing, operating hours, doctors, and frequently asked questions. The chatbot will query this context to answer customers accurately.
                </span>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={savingSettings}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 text-xs font-semibold py-2.5 flex items-center justify-center gap-2"
                >
                  {savingSettings ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  Save Configuration
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
