import React, { useState, useEffect } from "react";
import { 
  Layout, 
  Plus, 
  LogOut, 
  Settings as SettingsIcon, 
  BarChart3, 
  Moon, 
  Sun, 
  Search, 
  Filter, 
  Bell,
  User as UserIcon,
  ChevronRight,
  LayoutDashboard,
  FileText,
  AlertCircle,
  Menu,
  X,
  Lock,
  Mail
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import KanbanBoard from "./components/KanbanBoard";
import TicketList from "./components/TicketList";
import TicketModal from "./components/TicketModal";
import SettingsView from "./components/SettingsView";
import ReportsView from "./components/ReportsView";
import { Ticket, TicketStatus, ClientName, AppSettings, UserProfile } from "./types";
import { CLIENTS, STATUSES } from "./constants";
import { getTicketSlaStatus, sendWebhook } from "./utils/ticketUtils";

export default function App() {
  const [activeTab, setActiveTab] = useState<ClientName | "dashboard" | "reports" | "settings">("dashboard");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [settings, setSettings] = useState<AppSettings>({
    webhookUrl: "",
    clientLogos: {},
    clientResponsibles: {}
  });
  const [lastSlaNotification, setLastSlaNotification] = useState<Record<string, number>>({});

  // Auth initialization
  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");
    if (token && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser({ token });
        setUserProfile(parsedUser);
      } catch (e) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    setLoading(false);
  }, []);

  // Fetch Data
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const headers = { 
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        };
        
        // Fetch Tickets
        const ticketsRes = await fetch("/api/tickets", { headers });
        if (ticketsRes.ok) {
          const data = await ticketsRes.json();
          setTickets(data);
        }

        // Fetch Settings
        const settingsRes = await fetch("/api/settings", { headers });
        if (settingsRes.ok) {
          const data = await settingsRes.json();
          if (data.webhookUrl !== undefined) setSettings(data);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [user]);

  // SLA Monitor
  useEffect(() => {
    if (!tickets.length || !settings?.webhookUrl) return;

    const checkSlas = async () => {
      const now = Date.now();
      const newNotifications = { ...lastSlaNotification };
      let updated = false;

      for (const ticket of tickets) {
        if (ticket.status === "Resolvido") continue;

        const status = getTicketSlaStatus(ticket);
        if (status === "expired") {
          const lastNotify = lastSlaNotification[ticket.id] || 0;
          const twoHoursMs = 2 * 60 * 60 * 1000;
          
          if (lastNotify === 0 || (now - lastNotify) >= twoHoursMs) {
            await sendWebhook(ticket, settings, "sla_breach");
            newNotifications[ticket.id] = now;
            updated = true;
          }
        }
      }

      if (updated) {
        setLastSlaNotification(newNotifications);
      }
    };

    const interval = setInterval(checkSlas, 60000);
    checkSlas();
    return () => clearInterval(interval);
  }, [tickets, settings, lastSlaNotification]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "Total" | "Aguardando">("Total");
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth > 768 : true);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true';
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setUser({ token: data.token });
        setUserProfile(data.user);
        if (data.user.role === "client" && data.user.associatedClient) {
          setActiveTab(data.user.associatedClient);
        }
      } else {
        setLoginError("E-mail ou senha incorretos.");
      }
    } catch (error) {
      setLoginError("Erro ao conectar com o servidor.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setUserProfile(null);
  };

  const handleUpdateSettings = async (updates: Partial<AppSettings>) => {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.token}`
        },
        body: JSON.stringify({ ...settings, ...updates })
      });
      if (res.ok) {
        setSettings(prev => ({ ...prev, ...updates }));
      }
    } catch (error) {
      console.error("Error updating settings:", error);
    }
  };

  const handleCreateTicket = async (ticketData: Partial<Ticket>) => {
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.token}`
        },
        body: JSON.stringify(ticketData)
      });
      
      if (res.ok) {
        const { id } = await res.json();
        const newTicket = { ...ticketData, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), updates: [] } as Ticket;
        setTickets(prev => [newTicket, ...prev]);
        await sendWebhook(newTicket, settings, "create");
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error("Error creating ticket:", error);
    }
  };

  const handleUpdateTicket = async (ticketId: string, updates: Partial<Ticket>) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.token}`
        },
        body: JSON.stringify(updates)
      });
      
      if (res.ok) {
        setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t));
        const updatedTicket = tickets.find(t => t.id === ticketId);
        if (updatedTicket) {
          await sendWebhook({ ...updatedTicket, ...updates }, settings, "update");
        }
      }
    } catch (error) {
      console.error("Error updating ticket:", error);
    }
  };

  const ticketsByTab = activeTab === "dashboard" 
    ? tickets 
    : activeTab === "reports" || activeTab === "settings"
      ? []
      : tickets.filter(t => t.client === activeTab);

  const filteredTickets = statusFilter === "Total"
    ? ticketsByTab
    : ticketsByTab.filter(t => {
        if (statusFilter === "Aguardando") {
          return t.status === "Aguardando Cliente" || t.status === "Aguardando Terceiros";
        }
        return t.status === statusFilter;
      });

  const visibleClients = userProfile?.role === "client" && userProfile.associatedClient
    ? [userProfile.associatedClient]
    : CLIENTS;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl shadow-blue-100/50 dark:shadow-none p-8 md:p-12 border border-zinc-100 dark:border-zinc-800"
        >
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-200 dark:shadow-none rotate-3">
              <Layout className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight mb-2">IT TICKET</h1>
            <p className="text-zinc-500 dark:text-zinc-400 font-medium">Gestão Inteligente de Chamados</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input 
                  type="email" 
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input 
                  type="password" 
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium dark:text-white"
                />
              </div>
            </div>

            {loginError && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-2xl text-sm font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {loginError}
              </div>
            )}

            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 rounded-2xl transition-all shadow-xl shadow-blue-100 dark:shadow-none flex items-center justify-center gap-3 group"
            >
              Entrar no Sistema
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-xs text-zinc-400 dark:text-zinc-600 font-bold uppercase tracking-widest">
              Acesso Restrito à Equipe IT
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-white dark:bg-zinc-900 border-r border-zinc-100 dark:border-zinc-800 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-100 dark:shadow-none">
              <Layout className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">IT TICKET</span>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="mb-4">
              <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-4 px-3">Principal</p>
              <button 
                onClick={() => setActiveTab("dashboard")}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 group ${activeTab === "dashboard" ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"}`}
              >
                <LayoutDashboard className={`w-5 h-5 ${activeTab === "dashboard" ? "text-blue-600 dark:text-blue-400" : "text-zinc-400 group-hover:text-zinc-600"}`} />
                <span className="font-bold text-sm">Dashboard</span>
              </button>
            </div>

            <div>
              <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-4 px-3">Clientes</p>
              <div className="space-y-1">
                {visibleClients.map(client => (
                  <button 
                    key={client}
                    onClick={() => setActiveTab(client)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 group ${activeTab === client ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"}`}
                  >
                    <div className={`w-2 h-2 rounded-full ${activeTab === client ? "bg-blue-600 dark:bg-blue-400" : "bg-zinc-300 dark:bg-zinc-700 group-hover:bg-zinc-400"}`} />
                    <span className="font-bold text-sm truncate">{client}</span>
                  </button>
                ))}
              </div>
            </div>

            {(userProfile?.role === "admin" || userProfile?.role === "user") && (
              <div className="pt-6">
                <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-4 px-3">Análise</p>
                <button 
                  onClick={() => setActiveTab("reports")}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 group ${activeTab === "reports" ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"}`}
                >
                  <BarChart3 className={`w-5 h-5 ${activeTab === "reports" ? "text-blue-600 dark:text-blue-400" : "text-zinc-400 group-hover:text-zinc-600"}`} />
                  <span className="font-bold text-sm">Relatórios</span>
                </button>
              </div>
            )}
          </nav>

          <div className="pt-6 mt-6 border-t border-zinc-100 dark:border-zinc-800 space-y-1">
            {userProfile?.role === "admin" && (
              <button 
                onClick={() => setActiveTab("settings")}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 group ${activeTab === "settings" ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"}`}
              >
                <SettingsIcon className={`w-5 h-5 ${activeTab === "settings" ? "text-blue-600 dark:text-blue-400" : "text-zinc-400 group-hover:text-zinc-600"}`} />
                <span className="font-bold text-sm">Configurações</span>
              </button>
            )}
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all duration-200 group"
            >
              <LogOut className="w-5 h-5 text-red-400 group-hover:text-red-600" />
              <span className="font-bold text-sm">Sair</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between px-6 md:px-10 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl lg:hidden"
            >
              <Menu className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
            </button>
            <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
              {activeTab === "dashboard" ? "Visão Geral" : activeTab === "reports" ? "Relatórios" : activeTab === "settings" ? "Configurações" : activeTab}
            </h2>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <div className="hidden md:flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800 px-4 py-2 rounded-2xl border border-zinc-100 dark:border-zinc-700">
              <Search className="w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Buscar chamados..." 
                className="bg-transparent border-none focus:outline-none text-sm font-medium w-40 lg:w-64 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className="p-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-2xl transition-all text-zinc-500 dark:text-zinc-400"
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button className="p-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-2xl transition-all text-zinc-500 dark:text-zinc-400 relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-zinc-900"></span>
              </button>
              <div className="h-8 w-px bg-zinc-100 dark:bg-zinc-800 mx-1 hidden md:block"></div>
              <div className="flex items-center gap-3 pl-1">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-zinc-900 dark:text-white leading-none mb-1">{userProfile?.displayName}</p>
                  <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none">{userProfile?.role}</p>
                </div>
                <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                  <UserIcon className="w-5 h-5 text-zinc-500" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-zinc-50/50 dark:bg-zinc-950/50 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-10">
            {activeTab === "settings" ? (
              <SettingsView 
                isAdmin={userProfile?.role === "admin"} 
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
              />
            ) : activeTab === "reports" ? (
              <ReportsView tickets={tickets} darkMode={darkMode} />
            ) : (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
                  {[
                    { label: "Total", value: ticketsByTab.length, color: "blue" },
                    { label: "Abertos", value: ticketsByTab.filter(t => t.status === "Aberto").length, color: "green" },
                    { label: "Em Andamento", value: ticketsByTab.filter(t => t.status === "Em Andamento").length, color: "amber" },
                    { label: "Aguardando", value: ticketsByTab.filter(t => t.status === "Aguardando Cliente" || t.status === "Aguardando Terceiros").length, color: "purple" }
                  ].map((stat, i) => (
                    <motion.button
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      onClick={() => setStatusFilter(stat.label as any)}
                      className={`p-6 md:p-8 rounded-[2rem] border transition-all duration-300 text-left group relative overflow-hidden ${
                        statusFilter === stat.label 
                          ? "bg-white dark:bg-zinc-900 border-blue-500 shadow-xl shadow-blue-100/50 dark:shadow-none ring-1 ring-blue-500" 
                          : "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 hover:border-blue-200 dark:hover:border-blue-900 shadow-sm"
                      }`}
                    >
                      <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-5 group-hover:scale-110 transition-transform duration-500 bg-${stat.color}-500`}></div>
                      <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3">{stat.label}</p>
                      <p className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white tracking-tight">{stat.value}</p>
                    </motion.button>
                  ))}
                </div>

                {/* View Controls */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                  <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                    <button 
                      onClick={() => setViewMode("kanban")}
                      className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${viewMode === "kanban" ? "bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none" : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}
                    >
                      Kanban
                    </button>
                    <button 
                      onClick={() => setViewMode("list")}
                      className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${viewMode === "list" ? "bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none" : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}
                    >
                      Lista
                    </button>
                  </div>

                  <button 
                    onClick={() => {
                      setSelectedTicket(null);
                      setIsModalOpen(true);
                    }}
                    className="w-full sm:w-auto bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold py-4 px-8 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-zinc-200 dark:shadow-none flex items-center justify-center gap-3"
                  >
                    <Plus className="w-5 h-5" />
                    Novo Chamado
                  </button>
                </div>

                {/* Main View */}
                <div className="min-h-[600px]">
                  {viewMode === "kanban" ? (
                    <KanbanBoard 
                      tickets={filteredTickets} 
                      onTicketClick={(ticket) => {
                        setSelectedTicket(ticket);
                        setIsModalOpen(true);
                      }}
                      onStatusChange={handleUpdateTicket}
                    />
                  ) : (
                    <TicketList 
                      tickets={filteredTickets} 
                      onTicketClick={(ticket) => {
                        setSelectedTicket(ticket);
                        setIsModalOpen(true);
                      }}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <AnimatePresence>
        {isModalOpen && (
          <TicketModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            ticket={selectedTicket}
            onCreate={handleCreateTicket}
            onUpdate={handleUpdateTicket}
            user={userProfile}
            activeClient={activeTab !== "dashboard" && activeTab !== "reports" && activeTab !== "settings" ? activeTab : undefined}
            clientResponsibles={settings.clientResponsibles}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
