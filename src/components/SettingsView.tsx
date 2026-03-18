import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, Webhook, Users as UsersIcon, Building2, Image as ImageIcon, Plus, Trash2, UserPlus, Shield, User, Globe, CheckCircle2, AlertCircle, ShieldAlert, Sun, Moon } from "lucide-react";
import { AppSettings, ClientName, UserProfile, UserRole } from "../types";
import { CLIENTS } from "../constants";

interface SettingsViewProps {
  isAdmin: boolean;
  settings: AppSettings;
  onUpdateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  users: UserProfile[];
  onCreateUser: (userData: any) => Promise<void>;
  onUpdateUser: (uid: string, data: Partial<UserProfile>) => Promise<void>;
  onDeleteUser: (uid: string) => Promise<void>;
  darkMode: boolean;
  setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function SettingsView({ isAdmin, settings, onUpdateSettings, users, onCreateUser, onUpdateUser, onDeleteUser, darkMode, setDarkMode }: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<"general" | "clients" | "users">("general");
  const [webhookUrl, setWebhookUrl] = useState(settings.webhookUrl || "");
  const [clientLogos, setClientLogos] = useState<Record<string, string>>(settings.clientLogos || {});
  const [clientResponsibles, setClientResponsibles] = useState<Record<string, string[]>>(settings.clientResponsibles || {});
  const [customClients, setCustomClients] = useState<string[]>(settings.customClients || []);
  const [customCategories, setCustomCategories] = useState<string[]>(settings.customCategories || []);
  const [newClientName, setNewClientName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUser, setNewUser] = useState<Partial<UserProfile & { password?: string }>>({
    role: "user"
  });
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<UserProfile>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setWebhookUrl(settings.webhookUrl || "");
    setClientLogos(settings.clientLogos || {});
    setClientResponsibles(settings.clientResponsibles || {});
    setCustomClients(settings.customClients || []);
    setCustomCategories(settings.customCategories || []);
  }, [settings]);

  const handleSaveGeneral = async () => {
    setMessage(null);
    try {
      await onUpdateSettings({ webhookUrl });
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

  const handleAddClient = () => {
    if (!newClientName.trim()) return;
    if (CLIENTS.includes(newClientName as any) || customClients.includes(newClientName)) {
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
    if (confirm(`Tem certeza que deseja excluir o cliente ${client}? Isso não excluirá os chamados dele.`)) {
      const newCustom = customClients.filter(c => c !== client);
      setCustomClients(newCustom);
      onUpdateSettings({ customClients: newCustom });
    }
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
    if (confirm(`Tem certeza que deseja excluir a categoria ${category}?`)) {
      const newCustom = customCategories.filter(c => c !== category);
      setCustomCategories(newCustom);
      onUpdateSettings({ customCategories: newCustom });
    }
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
    if (confirm("Tem certeza que deseja excluir este usuário?")) {
      try {
        await onDeleteUser(uid);
      } catch (error) {
        console.error("Error deleting user:", error);
      }
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
      </div>

      {activeTab === "general" && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                <Webhook className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Integração Webhook</h3>
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

          {message && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`p-4 rounded-xl flex items-center gap-3 ${
                message.type === "success" ? "bg-green-50 text-green-700 border border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/50" : "bg-red-50 text-red-700 border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/50"
              }`}
            >
              {message.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <span className="text-sm font-bold">{message.text}</span>
            </motion.div>
          )}
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
            {[...CLIENTS, ...customClients].sort().map((client) => (
              <motion.div 
                key={client}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6 relative group"
              >
                {customClients.includes(client) && (
                  <button 
                    onClick={() => handleRemoveClient(client)}
                    className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    title="Remover Cliente"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
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
                  </select>
                </div>
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
                      {[...CLIENTS, ...customClients].sort().map(c => <option key={c} value={c}>{c}</option>)}
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
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Função</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Associação</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {users.map((u) => (
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
                          {[...CLIENTS, ...customClients].sort().map(c => <option key={c} value={c}>{c}</option>)}
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
                              <Plus className="w-4 h-4" />
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
    </div>
  );
}
