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
  CheckCircle2,
  Clock,
  ShieldAlert,
  Menu,
  X,
  Lock,
  Mail,
  ArrowUpDown,
  Calendar as CalendarIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster, toast } from "react-hot-toast";
import KanbanBoard from "./components/KanbanBoard";
import TicketList from "./components/TicketList";
import TicketModal from "./components/TicketModal";
import SettingsView from "./components/SettingsView";
import { ReportsView } from "./components/ReportsView";
import { ScheduleView } from "./components/ScheduleView";
import { Ticket, TicketStatus, ClientName, AppSettings, UserProfile } from "./types";
import { CLIENTS, STATUSES, CATEGORIES } from "./constants";
import { getTicketSlaStatus, sendWebhook } from "./utils/ticketUtils";
import { startOfMonth, endOfMonth, isWithinInterval, subDays } from "date-fns";
import { getFirestoreDate } from "./utils/dateUtils";
import { db, auth, handleFirestoreError, OperationType } from "./firebase";
import firebaseConfig from "../firebase-applet-config.json";
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc,
  getDocs,
  Timestamp,
  addDoc,
  writeBatch
} from "firebase/firestore";
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { initializeApp, getApps, getApp } from "firebase/app";

export default function App() {
  const [activeTab, setActiveTab] = useState<ClientName | "dashboard" | "reports" | "settings" | "schedule">("dashboard");
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
  const [schedules, setSchedules] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [lastSlaNotification, setLastSlaNotification] = useState<Record<string, number>>({});
  const [showArchived, setShowArchived] = useState(false);

  const allClients = React.useMemo(() => {
    const custom = settings.customClients || [];
    return Array.from(new Set([...CLIENTS, ...custom])).sort();
  }, [settings.customClients]);

  const allCategories = React.useMemo(() => {
    const custom = settings.customCategories || [];
    return Array.from(new Set([...CATEGORIES, ...custom])).sort();
  }, [settings.customCategories]);

  // Auth initialization - Rely solely on onAuthStateChanged
  useEffect(() => {
    // Loading is handled by onAuthStateChanged
  }, []);

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

  const handleArchiveOldTickets = async () => {
    if (!auth.currentUser || userProfile?.role !== "admin") return;
    
    try {
      const thirtyDaysAgo = subDays(new Date(), 30);
      const q = query(
        collection(db, "tickets"),
        where("status", "==", "Resolvido")
      );
      
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      let count = 0;

      querySnapshot.forEach((docSnap) => {
        const ticket = docSnap.data();
        // Only archive if not already archived and is old enough
        if (ticket.archived !== 1) {
          const updatedAt = getFirestoreDate(ticket.updatedAt);
          if (updatedAt && updatedAt < thirtyDaysAgo) {
            batch.update(docSnap.ref, { archived: 1 });
            count++;
          }
        }
      });

      if (count > 0) {
        await batch.commit();
        console.log(`${count} tickets archived.`);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "tickets/batch-archive");
    }
  };

  useEffect(() => {
    if (userProfile?.role === "admin") {
      handleArchiveOldTickets();
    }
  }, [userProfile]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "Total" | "Aguardando" | "SLA Crítico">("Total");
  const [clientFilter, setClientFilter] = useState<ClientName | "Todos">("Todos");
  const [responsibleFilter, setResponsibleFilter] = useState<string>("Todos");
  const [categoryFilter, setCategoryFilter] = useState<string>("Todos");
  const [sortBy, setSortBy] = useState<"createdAt" | "updatedAt" | "priority">("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [itemsPerPage, setItemsPerPage] = useState<number>(15);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth > 768 : true);
  const [zoom, setZoom] = useState(1);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true';
    }
    return false;
  });

  // Firebase Auth Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const adminEmails = ["nairtonbraga00@gmail.com", "noc.itmanage@gmail.com"];
          const isHardcodedAdmin = firebaseUser.email && adminEmails.includes(firebaseUser.email.toLowerCase());
          
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          
          if (userDoc.exists()) {
            let profile = userDoc.data() as UserProfile;
            
            // Force admin role if email is in the hardcoded list
            if (isHardcodedAdmin && profile.role !== 'admin') {
              profile.role = 'admin';
              await setDoc(doc(db, "users", firebaseUser.uid), { role: 'admin' }, { merge: true });
            }
            
            setUser(firebaseUser);
            setUserProfile(profile);
          } else {
            const profile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "Usuário",
              role: isHardcodedAdmin ? "admin" : "pending"
            };
            await setDoc(doc(db, "users", firebaseUser.uid), profile);
            setUser(firebaseUser);
            setUserProfile(profile);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Real-time Data Fetching (Firestore)
  useEffect(() => {
    if (!user || !userProfile) return;

    // Tickets Subscription
    let ticketsQuery;
    if (userProfile.role === 'admin' || userProfile.role === 'user') {
      ticketsQuery = query(
        collection(db, "tickets"),
        where("archived", "==", showArchived ? 1 : 0),
        orderBy("createdAt", "desc")
      );
    } else {
      ticketsQuery = query(
        collection(db, "tickets"),
        where("client", "==", userProfile.associatedClient || ""),
        where("archived", "==", showArchived ? 1 : 0),
        orderBy("createdAt", "desc")
      );
    }

    const unsubTickets = onSnapshot(ticketsQuery, (snapshot) => {
      const ticketsData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Ticket[];
      setTickets(ticketsData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "tickets"));

    // Settings Subscription
    const unsubSettings = onSnapshot(doc(db, "settings", "global"), (doc) => {
      if (doc.exists()) {
        setSettings(doc.data() as AppSettings);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, "settings/global"));

    // Schedules Subscription
    const unsubSchedules = onSnapshot(query(collection(db, "schedules"), orderBy("date", "asc")), (snapshot) => {
      const schedulesData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      setSchedules(schedulesData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "schedules"));

    // Users Subscription (Admin only)
    let unsubUsers = () => {};
    if (userProfile.role === 'admin') {
      unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        }));
        setUsers(usersData);
      }, (error) => handleFirestoreError(error, OperationType.LIST, "users"));
    }

    return () => {
      unsubTickets();
      unsubSettings();
      unsubSchedules();
      unsubUsers();
    };
  }, [user, userProfile, showArchived]);

  const greeting = React.useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  const isOnDuty = React.useMemo(() => {
    if (!userProfile || !schedules.length) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return schedules.some(s => {
      if (s.analyst !== userProfile.displayName && s.analyst !== userProfile.email) return false;
      
      const startDate = new Date(s.date);
      startDate.setHours(0, 0, 0, 0);
      
      if (s.endDate) {
        const endDate = new Date(s.endDate);
        endDate.setHours(23, 59, 59, 999);
        return today >= startDate && today <= endDate;
      }
      
      return today.getTime() === startDate.getTime();
    });
  }, [userProfile, schedules]);

  const formattedDate = new Intl.DateTimeFormat('pt-BR', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  }).format(new Date());

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
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      toast.success("Login realizado com sucesso!");
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.code === 'auth/operation-not-allowed') {
        setLoginError("O login por e-mail/senha não está ativado. Por favor, use o 'Google Login' abaixo.");
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setLoginError("E-mail ou senha incorretos.");
      } else {
        setLoginError("Erro ao realizar login. Tente novamente.");
      }
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoginError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success("Login com Google realizado!");
    } catch (error: any) {
      console.error("Google login error:", error);
      let message = "Erro ao realizar login com Google.";
      const errorCode = error.code || "unknown";
      
      if (errorCode === 'auth/operation-not-allowed') {
        message = "O login por Google não está ativado no Firebase Console. Ative-o em Authentication > Sign-in method.";
      } else if (errorCode === 'auth/popup-blocked') {
        message = "O pop-up de login foi bloqueado pelo navegador. Por favor, permita pop-ups para este site.";
      } else if (errorCode === 'auth/unauthorized-domain') {
        message = "Este domínio não está autorizado no Firebase Console. Adicione '" + window.location.hostname + "' aos domínios autorizados.";
      } else {
        message = `Erro (${errorCode}): ${error.message || "Erro desconhecido"}`;
      }
      setLoginError(message);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Sessão encerrada");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleUpdateSettings = async (updates: Partial<AppSettings>) => {
    try {
      await setDoc(doc(db, "settings", "global"), { ...settings, ...updates });
      toast.success("Configurações salvas!");
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("Erro ao salvar configurações.");
    }
  };

  const handleCreateUser = async (userData: any) => {
    const { email, password, ...profile } = userData;
    try {
      // Use a secondary app to create the user without logging out the admin
      const secondaryApp = getApps().find(a => a.name === "Secondary") || initializeApp(firebaseConfig, "Secondary");
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const uid = userCredential.user.uid;
      
      await setDoc(doc(db, "users", uid), {
        ...profile,
        uid,
        email,
        createdAt: new Date().toISOString()
      });
      
      await signOut(secondaryAuth);
      toast.success("Usuário criado com sucesso!");
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(`Erro ao criar usuário: ${error.message}`);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    try {
      await deleteDoc(doc(db, "users", uid));
      toast.success("Usuário removido do sistema!");
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Erro ao remover usuário");
    }
  };

  const handleCreateTicket = async (ticketData: Partial<Ticket>) => {
    try {
      const now = new Date().toISOString();
      const ticketId = Math.random().toString(36).substring(2, 15);
      
      const formattedData = {
        ...ticketData,
        id: ticketId,
        title: ticketData.title?.toUpperCase(),
        createdAt: now,
        updatedAt: now,
        updates: [],
        archived: 0,
        history: [{
          action: "Criação",
          user: userProfile?.displayName || userProfile?.email || "Sistema",
          timestamp: now,
          details: "Chamado criado no sistema"
        }]
      };

      await setDoc(doc(db, "tickets", ticketId), formattedData);
      
      await sendWebhook(formattedData as Ticket, settings, "create");
      setIsModalOpen(false);
      toast.success("Chamado criado com sucesso!");
    } catch (error) {
      console.error("Error creating ticket:", error);
      toast.error("Erro ao criar chamado.");
    }
  };

  const handleUpdateTicket = async (ticketId: string, updates: Partial<Ticket>) => {
    try {
      const author = userProfile?.displayName || userProfile?.email || "Sistema";
      const now = new Date().toISOString();
      
      const formattedUpdates: any = {
        ...updates,
        updatedAt: now
      };
      
      if (updates.title) {
        formattedUpdates.title = updates.title.toUpperCase();
      }

      // Find original ticket to track changes
      const originalTicket = tickets.find(t => t.id === ticketId);
      const historyEntries: any[] = [];

      if (originalTicket) {
        const trackableFields: (keyof Ticket)[] = ['status', 'priority', 'responsible', 'category', 'title', 'description'];
        trackableFields.forEach(field => {
          if (updates[field] !== undefined && updates[field] !== originalTicket[field]) {
            historyEntries.push({
              action: `Alteração de ${field}`,
              user: author,
              timestamp: now,
              details: `De "${originalTicket[field] || 'N/A'}" para "${updates[field]}"`
            });
          }
        });
      }

      const finalHistory = [...(originalTicket?.history || []), ...historyEntries];
      
      await updateDoc(doc(db, "tickets", ticketId), {
        ...formattedUpdates,
        history: finalHistory
      });
      
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { 
          ...prev, 
          ...formattedUpdates, 
          history: finalHistory
        } : null);
      }

      const updatedTicket = tickets.find(t => t.id === ticketId);
      if (updatedTicket) {
        await sendWebhook({ ...updatedTicket, ...formattedUpdates }, settings, "update");
      }
      toast.success("Chamado atualizado!");
    } catch (error) {
      console.error("Error updating ticket:", error);
      toast.error("Erro ao atualizar chamado.");
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    try {
      await deleteDoc(doc(db, "tickets", ticketId));
      toast.success("Chamado excluído com sucesso!");
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error deleting ticket:", error);
      toast.error("Erro ao excluir chamado.");
    }
  };

  const handleCreateSchedule = async (scheduleData: any) => {
    try {
      await addDoc(collection(db, "schedules"), scheduleData);
      toast.success("Escala agendada!");
    } catch (error) {
      console.error("Error creating schedule:", error);
      toast.error("Erro ao agendar escala.");
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      await deleteDoc(doc(db, "schedules", id));
      toast.success("Escala removida!");
    } catch (error) {
      console.error("Error deleting schedule:", error);
      toast.error("Erro ao excluir escala.");
    }
  };

  const ticketsByTab = activeTab === "dashboard" 
    ? tickets 
    : activeTab === "reports" || activeTab === "settings"
      ? []
      : tickets.filter(t => t.client === activeTab);

  const filteredTickets = React.useMemo(() => {
    const filtered = ticketsByTab.filter(t => {
      const matchesStatus = statusFilter === "Total" 
        ? true 
        : statusFilter === "Aguardando" 
          ? (t.status === "Aguardando Cliente" || t.status === "Aguardando Terceiros")
          : statusFilter === "SLA Crítico"
            ? (t.status !== "Resolvido" && getTicketSlaStatus(t) === "expired")
            : t.status === statusFilter;
      
      const matchesClient = clientFilter === "Todos" ? true : t.client === clientFilter;
      const matchesResponsible = responsibleFilter === "Todos" ? true : t.responsible === responsibleFilter;
      const matchesCategory = categoryFilter === "Todos" ? true : t.category === categoryFilter;
      
      if (!matchesStatus || !matchesClient || !matchesResponsible || !matchesCategory) return false;

      // Special filter for Resolvido: only current month in dashboard
      if (statusFilter === "Resolvido" && activeTab === "dashboard") {
        const date = getFirestoreDate(t.updatedAt);
        if (!date || !isWithinInterval(date, { start: startOfMonth(new Date()), end: endOfMonth(new Date()) })) {
          return false;
        }
      }

      return true;
    });

    return filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "priority") {
        const priorityOrder = { "Urgente": 4, "Alta": 3, "Média": 2, "Baixa": 1 };
        comparison = (priorityOrder[a.priority || "Baixa"] || 0) - (priorityOrder[b.priority || "Baixa"] || 0);
      } else {
        const dateA = new Date(a[sortBy] || 0).getTime();
        const dateB = new Date(b[sortBy] || 0).getTime();
        comparison = dateA - dateB;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [ticketsByTab, statusFilter, clientFilter, responsibleFilter, categoryFilter, sortBy, sortOrder, activeTab]);

  const paginatedTickets = filteredTickets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);

  const visibleClients = userProfile?.role === "client" && userProfile.associatedClient
    ? [userProfile.associatedClient]
    : allClients;

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-screen bg-zinc-50 dark:bg-zinc-950 ${darkMode ? 'dark' : ''}`}>
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4 ${darkMode ? 'dark' : ''}`}>
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

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-100 dark:border-zinc-800"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-zinc-900 px-2 text-zinc-400 font-bold">Ou continue com</span>
              </div>
            </div>

            <button 
              type="button"
              onClick={handleGoogleLogin}
              className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 font-bold py-4 rounded-2xl transition-all hover:bg-zinc-50 dark:hover:bg-zinc-700 flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google Login
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-xs text-zinc-400 dark:text-zinc-600 font-bold uppercase tracking-widest">
              Acesso Restrito à Equipe IT • Use o Google Login se o acesso por e-mail estiver desativado
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Pending Authorization Screen
  if (userProfile.role === 'pending' || (userProfile.role === 'client' && !userProfile.associatedClient)) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <Toaster position="top-right" />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white dark:bg-zinc-900 p-12 rounded-[40px] shadow-2xl border border-zinc-100 dark:border-zinc-800 text-center"
        >
          <div className="w-24 h-24 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <AlertCircle className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter mb-4">Acesso Pendente</h2>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed mb-10">
            Seu Usuário ainda não foi liberado ao sistema.
          </p>
          <button 
            onClick={() => auth.signOut()}
            className="w-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-bold py-4 rounded-2xl transition-all"
          >
            Sair da Conta
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-zinc-50 dark:bg-zinc-950 flex font-sans selection:bg-blue-100 selection:text-blue-900`}>
      <Toaster position="top-right" />
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside 
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 z-40 w-72 bg-white dark:bg-zinc-900 border-r border-zinc-100 dark:border-zinc-800 lg:static shrink-0"
          >
            <div className="h-full flex flex-col p-6">
              <div className="flex items-center justify-between mb-10 px-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 rotate-3 group-hover:rotate-0 transition-transform duration-300">
                    <Layout className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-black text-zinc-900 dark:text-white tracking-tighter leading-none">IT TICKET</h1>
                    <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-1">Manage</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl lg:hidden"
                >
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>

          <nav className="flex-1 space-y-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="mb-4">
              <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-4 px-3">Principal</p>
              <button 
                onClick={() => setActiveTab("dashboard")}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative ${
                  activeTab === "dashboard" 
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25" 
                    : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                }`}
              >
                <LayoutDashboard className={`w-5 h-5 ${activeTab === "dashboard" ? "text-white" : "text-zinc-400 group-hover:text-zinc-600"}`} />
                <span className="font-bold text-sm">Dashboard</span>
                {activeTab === "dashboard" && (
                  <motion.div layoutId="sidebar-active" className="absolute left-0 w-1 h-6 bg-white rounded-r-full" />
                )}
              </button>
            </div>

            <div>
              <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-4 px-3">Clientes</p>
              <div className="space-y-1">
                {visibleClients.map(client => (
                  <button 
                    key={client}
                    onClick={() => setActiveTab(client)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative ${
                      activeTab === client 
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25" 
                        : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full transition-all duration-300 ${activeTab === client ? "bg-white scale-125" : "bg-zinc-300 dark:bg-zinc-700 group-hover:bg-blue-400"}`} />
                    <span className="font-bold text-sm truncate">{client}</span>
                    {activeTab === client && (
                      <motion.div layoutId="sidebar-active" className="absolute left-0 w-1 h-6 bg-white rounded-r-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {(userProfile?.role === "admin" || userProfile?.role === "user") && (
              <div className="pt-6">
                <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-4 px-3">Análise</p>
                <div className="space-y-1">
                  <button 
                    onClick={() => setActiveTab("reports")}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 group ${activeTab === "reports" ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"}`}
                  >
                    <BarChart3 className={`w-5 h-5 ${activeTab === "reports" ? "text-blue-600 dark:text-blue-400" : "text-zinc-400 group-hover:text-zinc-600"}`} />
                    <span className="font-bold text-sm">Relatórios</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab("schedule")}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 group ${activeTab === "schedule" ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"}`}
                  >
                    <CalendarIcon className={`w-5 h-5 ${activeTab === "schedule" ? "text-blue-600 dark:text-blue-400" : "text-zinc-400 group-hover:text-zinc-600"}`} />
                    <span className="font-bold text-sm">Escala</span>
                  </button>
                </div>
              </div>
            )}
          </nav>

          <div className="pt-6 mt-6 border-t border-zinc-100 dark:border-zinc-800 space-y-1">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all duration-200 group"
            >
              <LogOut className="w-5 h-5 text-red-400 group-hover:text-red-600" />
              <span className="font-bold text-sm">Sair</span>
            </button>
          </div>
        </div>
      </motion.aside>
      )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-24 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between px-6 md:px-10 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl transition-all text-zinc-500 dark:text-zinc-400 border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden md:block">
              <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                {greeting}, {userProfile?.displayName?.split(' ')[0]}!
                {isOnDuty && (
                  <span className="ml-2 px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-black rounded-lg uppercase tracking-widest animate-pulse shadow-lg shadow-emerald-500/20">
                    De Plantão
                  </span>
                )}
                <span className="text-blue-600 animate-pulse">.</span>
              </h2>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{formattedDate}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <div className="hidden lg:flex items-center gap-2 bg-zinc-100/50 dark:bg-zinc-800/50 px-3 py-1.5 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50">
              <button onClick={() => setZoom(prev => Math.max(0.7, prev - 0.1))} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors">
                <Search className="w-3.5 h-3.5 text-zinc-500" style={{ transform: 'scale(0.8)' }} />
              </button>
              <span className="text-[10px] font-black text-zinc-400 w-8 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(prev => Math.min(1.3, prev + 0.1))} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors">
                <Plus className="w-3.5 h-3.5 text-zinc-500" />
              </button>
            </div>

            <div className="hidden lg:flex items-center gap-3 bg-zinc-100/50 dark:bg-zinc-800/50 px-4 py-2.5 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
              <Search className="w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Buscar chamados..." 
                className="bg-transparent border-none focus:outline-none text-sm font-medium w-48 xl:w-64 dark:text-white placeholder:text-zinc-400"
              />
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              <button 
                onClick={() => setDarkMode(prev => !prev)}
                className="p-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-2xl transition-all text-zinc-500 dark:text-zinc-400"
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button className="p-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-2xl transition-all text-zinc-500 dark:text-zinc-400 relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-zinc-900"></span>
              </button>
              
              {userProfile?.role === "admin" && (
                <button 
                  onClick={() => setActiveTab("settings")}
                  className={`p-2.5 rounded-2xl transition-all ${activeTab === "settings" ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}
                >
                  <SettingsIcon className="w-5 h-5" />
                </button>
              )}

              <button 
                onClick={handleLogout}
                className="p-2.5 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl transition-all text-red-500"
              >
                <LogOut className="w-5 h-5" />
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
        <div 
          className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-zinc-50/50 dark:bg-zinc-950/50 custom-scrollbar transition-all duration-300"
          style={{ zoom: zoom }}
        >
          <div className="max-w-full mx-auto space-y-10">
            {activeTab === "settings" ? (
              <SettingsView 
                isAdmin={userProfile?.role === "admin"} 
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                users={users}
                onCreateUser={handleCreateUser}
                onDeleteUser={handleDeleteUser}
              />
            ) : activeTab === "reports" ? (
              <ReportsView tickets={tickets} darkMode={darkMode} allClients={allClients} />
            ) : activeTab === "schedule" ? (
              <ScheduleView 
                isAdmin={userProfile?.role === "admin"} 
                schedules={schedules}
                onAdd={handleCreateSchedule}
                onDelete={handleDeleteSchedule}
                users={users} 
              />
            ) : (
              <>
                {/* Stats Grid */}
                <div className="flex justify-center">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 md:gap-6 w-full">
                  {[
                    { label: "Total", value: ticketsByTab.length, color: "blue", icon: <BarChart3 />, gradient: "from-blue-500/10 to-transparent" },
                    { label: "Em Aberto", value: ticketsByTab.filter(t => t.status === "Aberto").length, color: "red", icon: <AlertCircle />, gradient: "from-red-500/10 to-transparent" },
                    { label: "Em Andamento", value: ticketsByTab.filter(t => t.status === "Em Andamento").length, color: "yellow", icon: <Clock />, gradient: "from-yellow-500/10 to-transparent" },
                    { label: "Aguardando Cliente", value: ticketsByTab.filter(t => t.status === "Aguardando Cliente").length, color: "purple", icon: <UserIcon />, gradient: "from-purple-500/10 to-transparent" },
                    { label: "Aguardando Terceiros", value: ticketsByTab.filter(t => t.status === "Aguardando Terceiros").length, color: "orange", icon: <Clock />, gradient: "from-orange-500/10 to-transparent" },
                    { label: "SLA Crítico", value: ticketsByTab.filter(t => getTicketSlaStatus(t) === "expired").length, color: "orange", icon: <ShieldAlert />, gradient: "from-orange-500/10 to-transparent" },
                    { label: "Resolvidos", value: ticketsByTab.filter(t => {
                      if (t.status !== "Resolvido") return false;
                      const date = new Date(t.updatedAt || t.createdAt);
                      const now = new Date();
                      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                    }).length, color: "green", icon: <CheckCircle2 />, gradient: "from-green-500/10 to-transparent" }
                  ].map((stat, i) => (
                    <motion.button
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => {
                        if (stat.label === "Total") setStatusFilter("Total");
                        else if (stat.label === "Resolvidos") setStatusFilter("Resolvido");
                        else if (stat.label === "Em Aberto") setStatusFilter("Aberto");
                        else if (stat.label === "Em Andamento") setStatusFilter("Em Andamento");
                        else if (stat.label === "Aguardando Cliente") setStatusFilter("Aguardando Cliente");
                        else if (stat.label === "Aguardando Terceiros") setStatusFilter("Aguardando Terceiros");
                        else if (stat.label === "SLA Crítico") setStatusFilter("Total");
                      }}
                      className={`p-6 rounded-[2rem] border transition-all duration-500 text-left group relative overflow-hidden flex flex-col justify-between h-40 ${
                        (statusFilter === "Total" && stat.label === "Total") ||
                        (statusFilter === "Resolvido" && stat.label === "Resolvidos") ||
                        (statusFilter === "Aberto" && stat.label === "Em Aberto") ||
                        (statusFilter === "Em Andamento" && stat.label === "Em Andamento") ||
                        (statusFilter === "Aguardando Cliente" && stat.label === "Aguardando Cliente") ||
                        (statusFilter === "Aguardando Terceiros" && stat.label === "Aguardando Terceiros")
                          ? "bg-white dark:bg-zinc-900 border-blue-500 shadow-2xl shadow-blue-500/10 dark:shadow-none ring-1 ring-blue-500/50" 
                          : "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 hover:border-blue-200 dark:hover:border-blue-900 shadow-sm hover:shadow-md"
                      }`}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                      
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 group-hover:rotate-3 duration-500 relative z-10 ${
                        stat.color === "blue" ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" :
                        stat.color === "green" ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400" :
                        stat.color === "red" ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" :
                        stat.color === "yellow" ? "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400" :
                        stat.color === "purple" ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400" :
                        stat.color === "orange" ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400" :
                        "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
                      }`}>
                        <div className="w-6 h-6">
                          {stat.icon}
                        </div>
                      </div>

                      <div className="relative z-10">
                        <p className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter leading-none mb-1">{stat.value}</p>
                        <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{stat.label}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

                {/* View Controls & Filters */}
                <div className="flex justify-center">
                  <div className="flex flex-wrap items-center justify-between gap-6 bg-white dark:bg-zinc-900 p-4 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 shadow-sm w-full">
                    <div className="flex flex-wrap items-center gap-6">
                      {/* View Toggle */}
                      <div className="flex items-center gap-1 p-1 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700">
                        <button 
                          onClick={() => setViewMode("kanban")}
                          className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === "kanban" ? "bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"}`}
                        >
                          Kanban
                        </button>
                        <button 
                          onClick={() => setViewMode("list")}
                          className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === "list" ? "bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"}`}
                        >
                          Lista
                        </button>
                      </div>

                      <div className="h-8 w-px bg-zinc-100 dark:bg-zinc-800 hidden md:block"></div>

                      {/* Filters */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 mr-2">
                          <Filter className="w-4 h-4 text-zinc-400" />
                          <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Filtros:</span>
                        </div>
                        
                        <select 
                          value={clientFilter}
                          onChange={(e) => { setClientFilter(e.target.value as any); setCurrentPage(1); }}
                          className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        >
                          <option value="Todos">Todos Clientes</option>
                          {allClients.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>

                        <select 
                          value={responsibleFilter}
                          onChange={(e) => { setResponsibleFilter(e.target.value); setCurrentPage(1); }}
                          className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        >
                          <option value="Todos">Todos Responsáveis</option>
                          {Array.from(new Set(tickets.map(t => t.responsible).filter(Boolean))).sort().map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>

                        <select 
                          value={categoryFilter}
                          onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                          className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        >
                          <option value="Todos">Todas Categorias</option>
                          {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>

                        <div className="flex items-center gap-2 ml-2">
                          <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Ordenar:</span>
                          <select 
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                          >
                            <option value="createdAt">Criação</option>
                            <option value="updatedAt">Atualização</option>
                            <option value="priority">Prioridade</option>
                          </select>
                          <button 
                            onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-zinc-500"
                            title={sortOrder === "asc" ? "Crescente" : "Decrescente"}
                          >
                            <ArrowUpDown className={`w-4 h-4 transition-transform ${sortOrder === "desc" ? "rotate-180" : ""}`} />
                          </button>
                        </div>

                        <div className="flex items-center gap-2 ml-2">
                          <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Exibir:</span>
                          <select 
                            value={itemsPerPage}
                            onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
                            className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                          >
                            <option value={15}>15</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => setShowArchived(!showArchived)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                              showArchived 
                                ? "bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20" 
                                : "bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                            }`}
                          >
                            {showArchived ? "Ver Ativos" : "Ver Arquivados"}
                          </button>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        setSelectedTicket(null);
                        setIsModalOpen(true);
                      }}
                      className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold py-3 px-6 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-zinc-200 dark:shadow-none flex items-center justify-center gap-2 text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Novo Chamado
                    </button>
                  </div>
                </div>

                {/* Main View */}
                <div className="flex justify-center w-full">
                  <div className="min-h-[600px] flex flex-col gap-6 w-full">
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
                    <>
                      <TicketList 
                        tickets={paginatedTickets} 
                        onTicketClick={(ticket) => {
                          setSelectedTicket(ticket);
                          setIsModalOpen(true);
                        }}
                      />
                      
                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-4">
                          <button 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            className="p-2 rounded-xl border border-zinc-100 dark:border-zinc-800 text-zinc-500 disabled:opacity-30"
                          >
                            <ChevronRight className="w-5 h-5 rotate-180" />
                          </button>
                          <span className="text-sm font-bold text-zinc-500">
                            Página {currentPage} de {totalPages}
                          </span>
                          <button 
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            className="p-2 rounded-xl border border-zinc-100 dark:border-zinc-800 text-zinc-500 disabled:opacity-30"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
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
            onDelete={handleDeleteTicket}
            user={userProfile}
            activeClient={activeTab !== "dashboard" && activeTab !== "reports" && activeTab !== "settings" ? activeTab : undefined}
            clientResponsibles={settings.clientResponsibles}
            allClients={allClients}
            allCategories={allCategories}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
