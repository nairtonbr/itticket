import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, Webhook, Users as UsersIcon, Building2, Image as ImageIcon, Plus, Trash2, UserPlus, Shield, User, Globe, CheckCircle2, AlertCircle, ShieldAlert, Sun, Moon, Palette, Pencil } from "lucide-react";
import { AppSettings, ClientName, UserProfile, UserRole, TicketStatus, Company } from "../types";
import { CLIENTS, STATUSES } from "../constants";
import { testWhatsAppConnection, checkInstanceStatus } from "../utils/whatsappUtils";
import { Send, Activity } from "lucide-react";

interface SettingsViewProps {
  isAdmin: boolean;
  userProfile: UserProfile | null;
  company: Company | null;
  settings: AppSettings;
  onUpdateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  users: UserProfile[];
  onCreateUser: (userData: any) => Promise<void>;
  onUpdateUser: (uid: string, data: Partial<UserProfile>) => Promise<void>;
  onDeleteUser: (uid: string) => Promise<void>;
  onMigrateData: () => Promise<void>;
  onCreateCompany: (companyData: Partial<Company>) => Promise<void>;
  onUpdateCompany: (id: string, data: Partial<Company>) => Promise<void>;
  onDeleteCompany: (id: string) => Promise<void>;
  companies: Company[];
  darkMode: boolean;
  setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
  currentCompanyId?: string | null;
}

export default function SettingsView({ 
  isAdmin, 
  userProfile,
  company,
  settings, 
  onUpdateSettings, 
  users, 
  onCreateUser, 
  onUpdateUser, 
  onDeleteUser, 
  onMigrateData,
  onCreateCompany,
  onUpdateCompany,
  onDeleteCompany,
  companies,
  darkMode, 
  setDarkMode,
  currentCompanyId
}: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<"general" | "clients" | "users" | "whatsapp" | "status" | "superadmin">("general");
  const [newCompany, setNewCompany] = useState<Partial<Company>>({ active: true });
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUser, setNewUser] = useState<Partial<UserProfile & { password?: string }>>({
    role: "user",
    companyId: currentCompanyId || userProfile?.companyId || ""
  });
  const [webhookUrl, setWebhookUrl] = useState(settings.webhookUrl || "");
  const [webhookEnabled, setWebhookEnabled] = useState(settings.webhookEnabled ?? true);
  const [evolutionApiUrl, setEvolutionApiUrl] = useState(settings.evolutionApiUrl || "");
  const [evolutionApiKey, setEvolutionApiKey] = useState(settings.evolutionApiKey || "");
  const [evolutionInstance, setEvolutionInstance] = useState(settings.evolutionInstance || "");
  const [whatsappEnabled, setWhatsappEnabled] = useState(settings.whatsappEnabled ?? true);
  const [whatsappClientsList, setWhatsappClientsList] = useState<string[]>(settings.whatsappClientsList || []);
  const [whatsappResponsiblesList, setWhatsappResponsiblesList] = useState<string[]>(settings.whatsappResponsiblesList || []);
  const [whatsappClientMappings, setWhatsappClientMappings] = useState<Record<string, string[]>>(settings.whatsappClientMappings || {});
  const [whatsappResponsibleMappings, setWhatsappResponsibleMappings] = useState<Record<string, string[]>>(settings.whatsappResponsibleMappings || {});
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newResponsiblePhone, setNewResponsiblePhone] = useState("");
  const [newMappingPhone, setNewMappingPhone] = useState("");
  const [selectedMappingTarget, setSelectedMappingTarget] = useState("");
  
  const [clientLogos, setClientLogos] = useState<Record<string, string>>(settings.clientLogos || {});
  const [clientResponsibles, setClientResponsibles] = useState<Record<string, string[]>>(settings.clientResponsibles || {});
  const [customClients, setCustomClients] = useState<string[]>(settings.customClients || []);
  const [customCategories, setCustomCategories] = useState<string[]>(settings.customCategories || []);
  const [statusColors, setStatusColors] = useState<Record<string, string>>(settings.statusColors || {});
  const [newClientName, setNewClientName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<UserProfile>>({});
  const [editingCompany, setEditingCompany] = useState<string | null>(null);
  const [editCompanyData, setEditCompanyData] = useState<Partial<Company>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [testNumber, setTestNumber] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  
  const allResponsibles = React.useMemo(() => {
    const all = new Set<string>();
    Object.values(clientResponsibles).forEach(names => {
      names.forEach(name => all.add(name));
    });
    return Array.from(all).sort();
  }, [clientResponsibles]);

  const getCompanyClients = (companyId?: string) => {
    const targetId = companyId || currentCompanyId || userProfile?.companyId;
    const targetCompany = companies.find(c => c.id === targetId);
    
    let custom: string[] = [];
    if (targetCompany) {
      custom = targetCompany.settings?.customClients || [];
    } else if (!companyId) {
      custom = customClients;
    }

    if (custom.length > 0) return [...custom].sort();
    
    // Fallback para itmanage
    if (targetId === 'itmanage') {
      return ["Avançar", "Bixnet", "Brasilink", "Iplay", "Jrnet", "Meconnect", "Nexo", "Prosseguir"].sort();
    }

    return [];
  };

  useEffect(() => {
    setWebhookUrl(settings.webhookUrl || "");
    setWebhookEnabled(settings.webhookEnabled ?? true);
    setEvolutionApiUrl(settings.evolutionApiUrl || "");
    setEvolutionApiKey(settings.evolutionApiKey || "");
    setEvolutionInstance(settings.evolutionInstance || "");
    setWhatsappEnabled(settings.whatsappEnabled ?? true);
    setWhatsappClientsList(settings.whatsappClientsList || []);
    setWhatsappResponsiblesList(settings.whatsappResponsiblesList || []);
    setWhatsappClientMappings(settings.whatsappClientMappings || {});
    setWhatsappResponsibleMappings(settings.whatsappResponsibleMappings || {});
    setClientLogos(settings.clientLogos || {});
    setClientResponsibles(settings.clientResponsibles || {});
    setCustomClients(settings.customClients || []);
    setCustomCategories(settings.customCategories || []);
    setStatusColors(settings.statusColors || {});
  }, [settings]);

  useEffect(() => {
    if (currentCompanyId) {
      setNewUser(prev => ({ ...prev, companyId: currentCompanyId }));
    }
  }, [currentCompanyId]);

  const handleAddClientPhone = () => {
    if (!newClientPhone.trim()) return;
    const newList = [...whatsappClientsList, newClientPhone.trim()];
    setWhatsappClientsList(newList);
    onUpdateSettings({ whatsappClientsList: newList });
    setNewClientPhone("");
  };

  const handleRemoveClientPhone = (phone: string) => {
    const newList = whatsappClientsList.filter(p => p !== phone);
    setWhatsappClientsList(newList);
    onUpdateSettings({ whatsappClientsList: newList });
  };

  const handleAddResponsiblePhone = () => {
    if (!newResponsiblePhone.trim()) return;
    const newList = [...whatsappResponsiblesList, newResponsiblePhone.trim()];
    setWhatsappResponsiblesList(newList);
    onUpdateSettings({ whatsappResponsiblesList: newList });
    setNewResponsiblePhone("");
  };

  const handleRemoveResponsiblePhone = (phone: string) => {
    const newList = whatsappResponsiblesList.filter(p => p !== phone);
    setWhatsappResponsiblesList(newList);
    onUpdateSettings({ whatsappResponsiblesList: newList });
  };

  const handleAddClientMapping = (client: string, phone: string) => {
    if (!phone.trim()) return;
    const current = whatsappClientMappings[client] || [];
    if (current.includes(phone.trim())) return;
    
    const newMappings = { 
      ...whatsappClientMappings, 
      [client]: [...current, phone.trim()] 
    };
    setWhatsappClientMappings(newMappings);
    onUpdateSettings({ whatsappClientMappings: newMappings });
  };

  const handleRemoveClientMapping = (client: string, phone: string) => {
    const current = whatsappClientMappings[client] || [];
    const newMappings = { 
      ...whatsappClientMappings, 
      [client]: current.filter(p => p !== phone) 
    };
    setWhatsappClientMappings(newMappings);
    onUpdateSettings({ whatsappClientMappings: newMappings });
  };

  const handleAddResponsibleMapping = (responsible: string, phone: string) => {
    if (!phone.trim()) return;
    const current = whatsappResponsibleMappings[responsible] || [];
    if (current.includes(phone.trim())) return;
    
    const newMappings = { 
      ...whatsappResponsibleMappings, 
      [responsible]: [...current, phone.trim()] 
    };
    setWhatsappResponsibleMappings(newMappings);
    onUpdateSettings({ whatsappResponsibleMappings: newMappings });
  };

  const handleRemoveResponsibleMapping = (responsible: string, phone: string) => {
    const current = whatsappResponsibleMappings[responsible] || [];
    const newMappings = { 
      ...whatsappResponsibleMappings, 
      [responsible]: current.filter(p => p !== phone) 
    };
    setWhatsappResponsibleMappings(newMappings);
    onUpdateSettings({ whatsappResponsibleMappings: newMappings });
  };

  const handleSaveGeneral = async () => {
    setMessage(null);
    try {
      await onUpdateSettings({ webhookUrl, webhookEnabled });
      setMessage({ type: "success", text: "Configurações salvas com sucesso!" });
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao salvar configurações." });
    }
  };

  const handleUpdateLogo = (client: string, url: string) => {
    const newLogos = { ...clientLogos, [client]: url };
    setClientLogos(newLogos);
    onUpdateSettings({ clientLogos: newLogos });
  };

  const handleAddResponsible = (client: string, name: string) => {
    if (!name.trim()) return;
    const current = clientResponsibles[client] || [];
    if (current.includes(name)) return;
    
    const newResponsibles = { 
      ...clientResponsibles, 
      [client]: [...current, name] 
    };
    setClientResponsibles(newResponsibles);
    onUpdateSettings({ clientResponsibles: newResponsibles });
  };

  const handleRemoveResponsible = (client: string, name: string) => {
    const current = clientResponsibles[client] || [];
    const newResponsibles = { 
      ...clientResponsibles, 
      [client]: current.filter(n => n !== name) 
    };
    setClientResponsibles(newResponsibles);
    onUpdateSettings({ clientResponsibles: newResponsibles });
  };

  const handleTestWhatsApp = async () => {
    if (!testNumber) {
      setMessage({ type: "error", text: "Por favor, insira um número ou ID de grupo para o teste." });
      return;
    }

    setIsTesting(true);
    setMessage(null);

    try {
      await testWhatsAppConnection(
        { evolutionApiUrl, evolutionApiKey, evolutionInstance },
        testNumber
      );
      setMessage({ type: "success", text: "Mensagem de teste enviada com sucesso! Verifique seu WhatsApp." });
    } catch (error: any) {
      setMessage({ type: "error", text: `Falha no teste: ${error.message}` });
    } finally {
      setIsTesting(false);
    }
  };

  const handleCheckStatus = async () => {
    console.log('Iniciando verificação de status da instância...');
    setIsCheckingStatus(true);
    setMessage(null);

    try {
      const status = await checkInstanceStatus({ evolutionApiUrl, evolutionApiKey, evolutionInstance });
      console.log('Status recebido:', status);
      const statusMap: Record<string, string> = {
        'open': 'Conectada (Online) ✅',
        'close': 'Desconectada (Offline) ❌',
        'connecting': 'Conectando... ⏳',
        'unknown': 'Desconhecido ❓'
      };
      setMessage({ 
        type: status === 'open' ? "success" : "error", 
        text: `Status da Instância: ${statusMap[status] || status}` 
      });
    } catch (error: any) {
      console.error('Erro ao verificar status:', error);
      setMessage({ type: "error", text: `Erro ao verificar status: ${error.message}` });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleAddClient = () => {
    if (!newClientName.trim()) return;
    if (getCompanyClients().includes(newClientName.trim())) {
      setMessage({ type: "error", text: "Este cliente já existe." });
      return;
    }
    const newCustom = [...customClients, newClientName.trim()];
    setCustomClients(newCustom);
    onUpdateSettings({ customClients: newCustom });
    setNewClientName("");
    setMessage({ type: "success", text: `Cliente ${newClientName} adicionado!` });
  };

  const handleRemoveClient = (client: string) => {
    let newCustom: string[] = [];
    if (customClients.length > 0) {
      newCustom = customClients.filter(c => c !== client);
    } else if (currentCompanyId === 'itmanage') {
      // Se for itmanage e não tiver customClients, inicializa com os defaults menos o excluído
      const defaults = ["Avançar", "Bixnet", "Brasilink", "Iplay", "Jrnet", "Meconnect", "Nexo", "Prosseguir"];
      newCustom = defaults.filter(c => c !== client);
    } else {
      newCustom = [];
    }
    
    setCustomClients(newCustom);
    onUpdateSettings({ customClients: newCustom });
    setMessage({ type: "success", text: `Cliente ${client} removido!` });
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const newCustom = [...customCategories, newCategoryName.trim()];
    setCustomCategories(newCustom);
    onUpdateSettings({ customCategories: newCustom });
    setNewCategoryName("");
    setMessage({ type: "success", text: `Categoria ${newCategoryName} adicionada!` });
  };

  const handleRemoveCategory = (category: string) => {
    const newCustom = customCategories.filter(c => c !== category);
    setCustomCategories(newCustom);
    onUpdateSettings({ customCategories: newCustom });
  };

  const handleUpdateStatusColor = (status: string, color: string) => {
    const newColors = { ...statusColors, [status]: color };
    setStatusColors(newColors);
    onUpdateSettings({ statusColors: newColors });
  };

  const handleResetStatusColors = () => {
    setStatusColors({});
    onUpdateSettings({ statusColors: {} });
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password) return;
    
    try {
      await onCreateUser({
        ...newUser,
        displayName: newUser.displayName || newUser.email.split("@")[0]
      });
      setIsAddingUser(false);
      setNewUser({ role: "user" });
    } catch (error) {
      console.error("Error creating user:", error);
    }
  };

  const handleUpdateUser = async (uid: string) => {
    try {
      await onUpdateUser(uid, editData);
      setEditingUser(null);
      setEditData({});
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    try {
      await onDeleteUser(uid);
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
        <ShieldAlert className="w-16 h-16 mb-4 stroke-1 opacity-20" />
        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Acesso Restrito</h3>
        <p className="text-sm font-medium">Apenas administradores podem acessar as configurações.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Configurações</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Gerencie o sistema, clientes e usuários.</p>
        </div>
      </div>

      {message && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl flex items-center gap-3 shadow-sm border ${
            message.type === "success" 
              ? "bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/50" 
              : "bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/50"
          }`}
        >
          {message.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-sm font-bold">{message.text}</span>
          <button 
            onClick={() => setMessage(null)}
            className="ml-auto p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4 rotate-45" />
          </button>
        </motion.div>
      )}

      <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab("general")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === "general" 
              ? "bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm" 
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          }`}
        >
          <Webhook className="w-4 h-4" />
          Geral
        </button>
        <button
          onClick={() => setActiveTab("clients")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === "clients" 
              ? "bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm" 
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          }`}
        >
          <Building2 className="w-4 h-4" />
          Clientes
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === "users" 
              ? "bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm" 
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          }`}
        >
          <UsersIcon className="w-4 h-4" />
          Usuários
        </button>
        <button
          onClick={() => setActiveTab("whatsapp")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === "whatsapp" 
              ? "bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm" 
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          }`}
        >
          <Globe className="w-4 h-4" />
          WhatsApp
        </button>
        <button
          onClick={() => setActiveTab("status")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === "status" 
              ? "bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm" 
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          }`}
        >
          <Palette className="w-4 h-4" />
          Status
        </button>
        {userProfile?.role === 'superadmin' && (
          <button
            onClick={() => setActiveTab("superadmin")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === "superadmin" 
                ? "bg-white dark:bg-zinc-700 text-purple-600 dark:text-purple-400 shadow-sm" 
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            Mult-Empresa
          </button>
        )}
      </div>

      {activeTab === "general" && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                  <Webhook className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Integração Webhook</h3>
              </div>
              <button
                onClick={() => setWebhookEnabled(!webhookEnabled)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  webhookEnabled 
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                    : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500"
                }`}
              >
                {webhookEnabled ? "ATIVADO" : "DESATIVADO"}
              </button>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Configure a URL para envio de notificações ao n8n ou outros serviços.</p>
            <div className="flex gap-3">
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://n8n.seu-servidor.com/webhook/..."
                className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium dark:text-white"
              />
              <button
                onClick={handleSaveGeneral}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl transition-all flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Salvar
              </button>
            </div>
          </div>

          <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Tema do Sistema</h3>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Escolha entre o tema claro ou escuro para a interface.</p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setDarkMode(false)}
                className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                  !darkMode 
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400" 
                    : "border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 hover:border-zinc-200 dark:hover:border-zinc-700"
                }`}
              >
                <Sun className="w-5 h-5" />
                <span className="font-bold">Tema Claro</span>
              </button>
              <button
                onClick={() => setDarkMode(true)}
                className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                  darkMode 
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400" 
                    : "border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 hover:border-zinc-200 dark:hover:border-zinc-700"
                }`}
              >
                <Moon className="w-5 h-5" />
                <span className="font-bold">Tema Escuro</span>
              </button>
            </div>
          </div>

          <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                <Plus className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Gerenciar Categorias</h3>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Adicione ou remova categorias personalizadas para os chamados.</p>
            
            <div className="flex gap-3 mb-6">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                placeholder="Nome da nova categoria..."
                className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium dark:text-white"
              />
              <button
                onClick={handleAddCategory}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Adicionar
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {customCategories.map((cat) => (
                <span key={cat} className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-3 border border-zinc-200 dark:border-zinc-700">
                  {cat}
                  <button onClick={() => handleRemoveCategory(cat)} className="text-zinc-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </span>
              ))}
              {customCategories.length === 0 && (
                <p className="text-sm text-zinc-400 italic">Nenhuma categoria personalizada adicionada.</p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "whatsapp" && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-8"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg">
                  <Globe className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Integração EvolutionAPI</h3>
              </div>
              <button
                onClick={() => setWhatsappEnabled(!whatsappEnabled)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  whatsappEnabled 
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                    : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500"
                }`}
              >
                {whatsappEnabled ? "ATIVADO" : "DESATIVADO"}
              </button>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Configure sua instância da EvolutionAPI para enviar notificações diretas via WhatsApp.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">URL da API</label>
                <input
                  type="url"
                  value={evolutionApiUrl}
                  onChange={(e) => setEvolutionApiUrl(e.target.value)}
                  placeholder="https://api.sua-instancia.com"
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium dark:text-white"
                />
                <p className="text-[10px] text-zinc-500 px-1 mt-1">Ex: https://api.whatsapp.com (sem a barra no final)</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">Nome da Instância</label>
                <input
                  type="text"
                  value={evolutionInstance}
                  onChange={(e) => setEvolutionInstance(e.target.value)}
                  placeholder="Ex: Suporte"
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium dark:text-white"
                />
                <p className="text-[10px] text-zinc-500 px-1 mt-1">O nome da instância criada no painel EvolutionAPI.</p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">API Key Global</label>
                <input
                  type="password"
                  value={evolutionApiKey}
                  onChange={(e) => setEvolutionApiKey(e.target.value)}
                  placeholder="Sua API Key da EvolutionAPI"
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium dark:text-white"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={handleCheckStatus}
                disabled={isCheckingStatus}
                className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold px-6 py-3 rounded-xl transition-all flex items-center gap-2"
              >
                <Activity className={`w-4 h-4 ${isCheckingStatus ? 'animate-pulse' : ''}`} />
                {isCheckingStatus ? 'Verificando...' : 'Verificar Status'}
              </button>
              <button
                onClick={() => onUpdateSettings({ evolutionApiUrl, evolutionApiKey, evolutionInstance, whatsappEnabled })}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl transition-all flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Salvar Credenciais
              </button>
            </div>

            <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-lg">
                  <Send className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-zinc-900 dark:text-white">Testar Conexão</h4>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Envie uma mensagem de teste para verificar se as credenciais estão corretas. Certifique-se de que a instância está <b>conectada</b> no painel da EvolutionAPI.</p>
              
              <div className="flex gap-3">
                <input
                  type="text"
                  value={testNumber}
                  onChange={(e) => setTestNumber(e.target.value)}
                  placeholder="Número (com DDD) ou ID do Grupo"
                  className="flex-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white text-sm"
                />
                <button
                  onClick={handleTestWhatsApp}
                  disabled={isTesting}
                  className={`px-6 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                    isTesting 
                      ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-400 cursor-not-allowed" 
                      : "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90"
                  }`}
                >
                  {isTesting ? "Testando..." : "Enviar Teste"}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                <UsersIcon className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Lista de WhatsApp para Clientes</h3>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Estes números receberão notificações de <b>Criação</b> e <b>Atualização</b> de tickets.</p>
            
            <div className="flex gap-3 mb-6">
              <input
                type="text"
                value={newClientPhone}
                onChange={(e) => setNewClientPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddClientPhone()}
                placeholder="Ex: 5511999999999 ou 123456789@g.us"
                className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium dark:text-white"
              />
              <button
                onClick={handleAddClientPhone}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Adicionar
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {whatsappClientsList.map((phone) => (
                <div key={phone} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                  <span className="text-sm font-bold text-zinc-900 dark:text-white">{phone}</span>
                  <button onClick={() => handleRemoveClientPhone(phone)} className="text-zinc-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {whatsappClientsList.length === 0 && (
                <p className="text-sm text-zinc-400 italic">Nenhum número configurado para clientes.</p>
              )}
            </div>
          </div>

          <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                <User className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Lista de WhatsApp para Responsáveis</h3>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Estes números receberão alertas de <b>SLA Estourado</b>.</p>
            
            <div className="flex gap-3 mb-6">
              <input
                type="text"
                value={newResponsiblePhone}
                onChange={(e) => setNewResponsiblePhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddResponsiblePhone()}
                placeholder="Ex: 5511999999999 ou 123456789@g.us"
                className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium dark:text-white"
              />
              <button
                onClick={handleAddResponsiblePhone}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Adicionar
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {whatsappResponsiblesList.map((phone) => (
                <div key={phone} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                  <span className="text-sm font-bold text-zinc-900 dark:text-white">{phone}</span>
                  <button onClick={() => handleRemoveResponsiblePhone(phone)} className="text-zinc-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {whatsappResponsiblesList.length === 0 && (
                <p className="text-sm text-zinc-400 italic">Nenhum número configurado para responsáveis.</p>
              )}
            </div>
          </div>

          <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Associação de WhatsApp por Cliente</h3>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Associe números específicos a cada cliente para notificações direcionadas.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {getCompanyClients().map(client => (
                <div key={client} className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 space-y-3">
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{client}</h4>
                  <div className="flex flex-wrap gap-2">
                    {whatsappClientMappings[client]?.map(phone => (
                      <span key={phone} className="bg-white dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-2 border border-zinc-200 dark:border-zinc-600">
                        {phone}
                        <button onClick={() => handleRemoveClientMapping(client, phone)} className="text-zinc-400 hover:text-red-500">
                          <Plus className="w-3 h-3 rotate-45" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Número..."
                      className="flex-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleAddClientMapping(client, e.currentTarget.value);
                          e.currentTarget.value = "";
                        }
                      }}
                    />
                    <button 
                      onClick={(e) => {
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                        handleAddClientMapping(client, input.value);
                        input.value = "";
                      }}
                      className="p-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg hover:opacity-90"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                <User className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Associação de WhatsApp por Responsável</h3>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Associe números específicos a cada responsável para alertas de SLA direcionados.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allResponsibles.map(resp => (
                <div key={resp} className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 space-y-3">
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{resp}</h4>
                  <div className="flex flex-wrap gap-2">
                    {whatsappResponsibleMappings[resp]?.map(phone => (
                      <span key={phone} className="bg-white dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-2 border border-zinc-200 dark:border-zinc-600">
                        {phone}
                        <button onClick={() => handleRemoveResponsibleMapping(resp, phone)} className="text-zinc-400 hover:text-red-500">
                          <Plus className="w-3 h-3 rotate-45" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Número..."
                      className="flex-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleAddResponsibleMapping(resp, e.currentTarget.value);
                          e.currentTarget.value = "";
                        }
                      }}
                    />
                    <button 
                      onClick={(e) => {
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                        handleAddResponsibleMapping(resp, input.value);
                        input.value = "";
                      }}
                      className="p-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg hover:opacity-90"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {allResponsibles.length === 0 && (
                <p className="text-sm text-zinc-400 italic col-span-2">Nenhum responsável cadastrado nos clientes.</p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "clients" && (
        <div className="space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                <Plus className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Cadastrar Novo Cliente</h3>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Adicione novos clientes ao sistema. Eles aparecerão automaticamente no menu lateral e filtros.</p>
            <div className="flex gap-3">
              <input
                type="text"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddClient()}
                placeholder="Nome do novo cliente..."
                className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium dark:text-white"
              />
              <button
                onClick={handleAddClient}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Adicionar
              </button>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {getCompanyClients().map((client) => (
              <motion.div 
                key={client}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6 relative group"
              >
                <button 
                  onClick={() => handleRemoveClient(client)}
                  className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-red-500 transition-all"
                  title="Remover Cliente"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="flex items-center justify-between pr-8">
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white">{client}</h3>
                  {clientLogos[client] && (
                    <img src={clientLogos[client]} alt={client} className="w-10 h-10 rounded-lg object-contain bg-zinc-50 dark:bg-zinc-800 p-1" />
                  )}
                </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <ImageIcon className="w-3 h-3" />
                  Logo do Cliente (URL)
                </label>
                <input
                  type="url"
                  value={clientLogos[client] || ""}
                  onChange={(e) => handleUpdateLogo(client, e.target.value)}
                  placeholder="URL da imagem..."
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                />
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <UsersIcon className="w-3 h-3" />
                  Responsáveis
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {clientResponsibles[client]?.map((name) => (
                    <span key={name} className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
                      {name}
                      <button onClick={() => handleRemoveResponsible(client, name)} className="text-zinc-400 hover:text-red-500">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Novo responsável..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAddResponsible(client, e.currentTarget.value);
                        e.currentTarget.value = "";
                      }
                    }}
                    className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                  />
                  <button 
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                      handleAddResponsible(client, input.value);
                      input.value = "";
                    }}
                    className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    )}

      {activeTab === "users" && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Gerenciamento de Usuários</h3>
            <button 
              onClick={() => setIsAddingUser(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-sm"
            >
              <UserPlus className="w-4 h-4" />
              Adicionar Usuário
            </button>
          </div>

          {isAddingUser && (
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-blue-200 dark:border-blue-900/50 shadow-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">Email</label>
                  <input
                    type="email"
                    value={newUser.email || ""}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="email@exemplo.com"
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">Senha</label>
                  <input
                    type="password"
                    value={newUser.password || ""}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Senha do usuário"
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">Nome de Exibição</label>
                  <input
                    type="text"
                    value={newUser.displayName || ""}
                    onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
                    placeholder="Nome do usuário"
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">Função (Role)</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white"
                  >
                    <option value="admin">Administrador</option>
                    <option value="user">Usuário (Técnico)</option>
                    <option value="client">Cliente</option>
                    {userProfile?.role === 'superadmin' && <option value="superadmin">Super Admin</option>}
                  </select>
                </div>
                {userProfile?.role === 'superadmin' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">Empresa</label>
                    <select
                      value={newUser.companyId || ""}
                      onChange={(e) => {
                        const newCompanyId = e.target.value;
                        setNewUser({ ...newUser, companyId: newCompanyId, associatedClient: "" });
                      }}
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white"
                    >
                      <option value="">Selecione a Empresa</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
                {newUser.role === "client" && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">Cliente Associado</label>
                    <select
                      value={newUser.associatedClient || ""}
                      onChange={(e) => setNewUser({ ...newUser, associatedClient: e.target.value as ClientName })}
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white"
                    >
                      <option value="">Selecione um cliente</option>
                      <option value="Todos">Todos</option>
                      {getCompanyClients(newUser.companyId || userProfile?.companyId).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setIsAddingUser(false)} className="px-4 py-2 text-sm font-bold text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">Cancelar</button>
                <button onClick={handleCreateUser} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-xl transition-all text-sm">Criar Usuário</button>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Usuário</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Email</th>
                  {userProfile?.role === 'superadmin' && (
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Empresa</th>
                  )}
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Função</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Associação</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {users.filter(u => u.companyId === currentCompanyId).map((u) => (
                  <tr key={u.uid} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                          <User className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">{u.displayName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">{u.email}</td>
                    {userProfile?.role === 'superadmin' && (
                      <td className="px-6 py-4">
                        {editingUser === u.uid ? (
                          <select
                            value={editData.companyId || u.companyId}
                            onChange={(e) => {
                              const newCompanyId = e.target.value;
                              setEditData({ ...editData, companyId: newCompanyId, associatedClient: "" });
                            }}
                            className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white"
                          >
                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        ) : (
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg">
                            {u.companyId}
                          </span>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4">
                      {editingUser === u.uid ? (
                        <select
                          value={editData.role || u.role}
                          onChange={(e) => setEditData({ ...editData, role: e.target.value as UserRole })}
                          className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white"
                        >
                          <option value="admin">Administrador</option>
                          <option value="user">Usuário (Técnico)</option>
                          <option value="client">Cliente</option>
                          <option value="pending">Pendente</option>
                          {userProfile?.role === 'superadmin' && <option value="superadmin">Super Admin</option>}
                        </select>
                      ) : (
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1.5 w-fit ${
                          u.role === "admin" ? "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400" :
                          u.role === "user" ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" :
                          u.role === "pending" ? "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" :
                          "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}>
                          <Shield className="w-3 h-3" />
                          {u.role}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                      {editingUser === u.uid ? (
                        <select
                          value={editData.associatedClient || u.associatedClient || ""}
                          onChange={(e) => setEditData({ ...editData, associatedClient: e.target.value })}
                          className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white w-full"
                        >
                          <option value="">Nenhum</option>
                          <option value="Todos">Todos</option>
                          {getCompanyClients(editData.companyId || u.companyId).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      ) : (
                        u.associatedClient ? (
                          <div className="flex items-center gap-1.5">
                            <Globe className="w-3 h-3" />
                            {u.associatedClient}
                          </div>
                        ) : "-"
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {editingUser === u.uid ? (
                          <>
                            <button 
                              onClick={() => handleUpdateUser(u.uid)}
                              className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                              title="Salvar"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => {
                                setEditingUser(null);
                                setEditData({});
                              }}
                              className="p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                              title="Cancelar"
                            >
                              <Plus className="w-4 h-4 rotate-45" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => {
                                setEditingUser(u.uid);
                                setEditData({ role: u.role, associatedClient: u.associatedClient });
                              }}
                              className="p-2 text-zinc-400 hover:text-blue-600 transition-colors"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteUser(u.uid)} className="p-2 text-zinc-400 hover:text-red-500 transition-colors" title="Excluir">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
      {activeTab === "superadmin" && userProfile?.role === 'superadmin' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Ferramentas Mult-Empresa</h3>
            </div>
            
            <div className="p-6 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/30 space-y-4">
              <h4 className="font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Migração de Dados Legados
              </h4>
              <p className="text-sm text-red-600 dark:text-red-300">
                Esta ferramenta migra todos os tickets, usuários e agendas que não possuem um ID de empresa para a empresa padrão "itmanage".
                Use isso apenas uma vez após a atualização para o sistema multi-empresa.
              </p>
              <button
                onClick={onMigrateData}
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-xl transition-all flex items-center gap-2"
              >
                <Activity className="w-4 h-4" />
                Iniciar Migração
              </button>
            </div>

            <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Cadastrar Nova Empresa</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest px-1">ID da Empresa (slug)</label>
                  <input
                    type="text"
                    value={newCompany.id || ""}
                    onChange={(e) => setNewCompany({ ...newCompany, id: e.target.value })}
                    placeholder="ex: nova-empresa"
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest px-1">Nome da Empresa</label>
                  <input
                    type="text"
                    value={newCompany.name || ""}
                    onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                    placeholder="Ex: Nova Empresa LTDA"
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium dark:text-white"
                  />
                </div>
              </div>
              
              <button
                onClick={() => {
                  if (newCompany.id && newCompany.name) {
                    onCreateCompany(newCompany);
                    setNewCompany({ active: true });
                  }
                }}
                className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold px-8 py-3 rounded-xl hover:opacity-90 transition-all"
              >
                Criar Empresa
              </button>
            </div>

            <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Empresas Multi-Empresa</h3>
              </div>

              <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">ID (Slug)</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Nome da Empresa</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {companies.map((c) => (
                      <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 font-mono">{c.id}</span>
                        </td>
                        <td className="px-6 py-4">
                          {editingCompany === c.id ? (
                            <input
                              type="text"
                              value={editCompanyData.name || c.name}
                              onChange={(e) => setEditCompanyData({ ...editCompanyData, name: e.target.value })}
                              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white"
                            />
                          ) : (
                            <span className="text-sm font-bold text-zinc-900 dark:text-white">{c.name}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {editingCompany === c.id ? (
                              <>
                                <button
                                  onClick={() => {
                                    onUpdateCompany(c.id, editCompanyData);
                                    setEditingCompany(null);
                                    setEditCompanyData({});
                                  }}
                                  className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                  title="Salvar"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingCompany(null);
                                    setEditCompanyData({});
                                  }}
                                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                  title="Cancelar"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingCompany(c.id);
                                    setEditCompanyData({ name: c.name });
                                  }}
                                  className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                  title="Editar"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                {c.id !== 'itmanage' && (
                                  <button
                                    onClick={() => onDeleteCompany(c.id)}
                                    className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    title="Excluir Empresa"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </motion.div>
      )}
      {activeTab === "status" && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                <Palette className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Cores dos Status</h3>
            </div>
            <button 
              onClick={handleResetStatusColors}
              className="text-xs font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
            >
              Resetar para Padrão
            </button>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Personalize as cores que representam cada status no sistema.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {STATUSES.map((status) => (
              <div key={status} className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full shadow-sm" 
                    style={{ backgroundColor: statusColors[status] || (status === "Aberto" ? "#3b82f6" : status === "Em Andamento" ? "#eab308" : status === "Aguardando Cliente" ? "#a855f7" : status === "Aguardando Terceiros" ? "#f97316" : "#22c55e") }}
                  />
                  <span className="text-sm font-bold text-zinc-900 dark:text-white">{status}</span>
                </div>
                <input 
                  type="color" 
                  value={statusColors[status] || (status === "Aberto" ? "#3b82f6" : status === "Em Andamento" ? "#eab308" : status === "Aguardando Cliente" ? "#a855f7" : status === "Aguardando Terceiros" ? "#f97316" : "#22c55e")}
                  onChange={(e) => handleUpdateStatusColor(status, e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none"
                />
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
