import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, User as UserIcon, Clock, CheckCircle2, AlertCircle, MessageSquare, Plus, Trash2, Paperclip, FileText, Download as DownloadIcon, Pencil, Save, Loader2, ChevronDown, History, Star, ChevronLeft } from "lucide-react";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ptBR } from "date-fns/locale";
import { Ticket, TicketStatus, ClientName, TicketUpdate, TicketAttachment, TicketCategory, TicketPriority, AppSettings } from "../types";
registerLocale("pt-BR", ptBR);
import { CLIENTS, STATUSES, STATUS_COLORS, STATUS_TEXT_COLORS, CATEGORIES, PRIORITIES } from "../constants";
import { formatFirestoreDate, getTimeOpen, formatHoursToHMin } from "../utils/dateUtils";
import { parseSlaToMs } from "../utils/slaUtils";

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket | null;
  onCreate: (ticket: Partial<Ticket>) => void;
  onUpdate: (ticketId: string, updates: Partial<Ticket>) => void;
  onDelete: (ticketId: string) => void;
  user: any;
  activeClient?: ClientName;
  clientResponsibles?: Record<string, string[]>;
  allClients?: string[];
  allCategories?: string[];
  settings: AppSettings;
}

export default function TicketModal({ isOpen, onClose, ticket, onCreate, onUpdate, onDelete, user, activeClient, clientResponsibles, allClients = [], allCategories = [], settings }: TicketModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [client, setClient] = useState<ClientName>(activeClient || (allClients[0] || CLIENTS[0]));
  const [status, setStatus] = useState<TicketStatus>("Aberto");
  const [category, setCategory] = useState<TicketCategory | string>("");
  const [priority, setPriority] = useState<TicketPriority | "">("");
  const [responsible, setResponsible] = useState("");
  const [sla, setSla] = useState("");
  const [slaDate, setSlaDate] = useState<Date | null>(null);
  const [isImportant, setIsImportant] = useState(false);
  const [totalHours, setTotalHours] = useState<number>(0);
  const [liveElapsed, setLiveElapsed] = useState(0);
  const [newUpdate, setNewUpdate] = useState("");
  const [editingCommentIndex, setEditingCommentIndex] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<"details" | "comments" | "attachments" | "history">("details");
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastTicketIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen || !ticket?.inProgressSince || ticket.status !== "Em Andamento") {
      setLiveElapsed(0);
      return;
    }

    const updateTimer = () => {
      const start = new Date(ticket.inProgressSince!).getTime();
      const now = new Date().getTime();
      const elapsed = Math.max(0, (now - start) / (1000 * 60 * 60));
      setLiveElapsed(elapsed);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [isOpen, ticket?.inProgressSince, ticket?.status]);

  useEffect(() => {
    if (!isOpen) {
      lastTicketIdRef.current = null;
      return;
    }

    const currentId = ticket?.id || "new";
    
    // Only reset state if it's a different ticket or if it's the first time opening
    if (lastTicketIdRef.current !== currentId) {
      if (ticket) {
        setTitle(ticket.title);
        setDescription(ticket.description || "");
        setClient(ticket.client);
        setStatus(ticket.status);
        setCategory(ticket.category || "");
        setPriority(ticket.priority || "");
        setResponsible(ticket.responsible || "");
        
        let initialSla = ticket.sla || "";
        if (initialSla && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(initialSla)) {
          // Convert legacy format (e.g., "24h") to datetime-local format
          const slaMs = parseSlaToMs(initialSla);
          if (slaMs > 0 && ticket.createdAt) {
            let createdAtMs = 0;
            if (typeof ticket.createdAt.toDate === 'function') {
              createdAtMs = ticket.createdAt.toDate().getTime();
            } else if (ticket.createdAt instanceof Date) {
              createdAtMs = ticket.createdAt.getTime();
            } else if (typeof ticket.createdAt === 'number') {
              createdAtMs = ticket.createdAt;
            } else if (typeof ticket.createdAt === 'string') {
              createdAtMs = new Date(ticket.createdAt).getTime();
            }
            
            if (createdAtMs > 0) {
              const deadline = new Date(createdAtMs + slaMs);
              // Format to YYYY-MM-DDThh:mm
              const pad = (n: number) => n.toString().padStart(2, '0');
              initialSla = `${deadline.getFullYear()}-${pad(deadline.getMonth() + 1)}-${pad(deadline.getDate())}T${pad(deadline.getHours())}:${pad(deadline.getMinutes())}`;
            }
          }
        }
        setSla(initialSla);
        setSlaDate(initialSla ? new Date(initialSla) : null);
        
        setIsImportant(ticket.isImportant || false);
        setTotalHours(ticket.totalHours || 0);
        setAttachments(ticket.attachments || []);
        
        // Adjust textarea height on next tick
        setTimeout(() => {
          if (descriptionRef.current) {
            descriptionRef.current.style.height = 'auto';
            descriptionRef.current.style.height = descriptionRef.current.scrollHeight + 'px';
          }
        }, 0);
      } else {
        setTitle("");
        setDescription("");
        setClient(user?.role === "client" && user.associatedClient !== "Todos" ? user.associatedClient : (activeClient || (allClients[0] || CLIENTS[0])));
        setStatus("Aberto");
        setCategory("");
        setPriority("");
        setResponsible("");
        setSla("");
        setIsImportant(false);
        setTotalHours(0);
        setAttachments([]);
      }
      lastTicketIdRef.current = currentId;
    }
  }, [ticket, activeClient, isOpen, user, allClients]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Título é obrigatório";
    if (!category) newErrors.category = "Categoria é obrigatória";
    if (!status) newErrors.status = "Status é obrigatório";
    
    if (user?.role === "client" && user.associatedClient === "Todos" && !client) {
      newErrors.client = "Cliente é obrigatório";
    } else if (user?.role !== "client" && !client) {
      newErrors.client = "Cliente é obrigatório";
    }
    
    if (!sla.trim()) newErrors.sla = "SLA / Prazo é obrigatório";
    if (!priority) newErrors.priority = "Prioridade é obrigatória";
    if (!responsible) newErrors.responsible = "Responsável é obrigatório";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setActiveModalTab("details");
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    
    const data: any = {
      title,
      description,
      client: user?.role === "client" && user.associatedClient !== "Todos" ? user.associatedClient : client,
      status: ticket ? status : "Aberto",
      category: category || undefined,
      attachments,
      priority: priority || undefined,
      totalHours,
      responsible,
      sla,
      isImportant
    };

    if (ticket) {
      await onUpdate(ticket.id, data);
    } else {
      await onCreate(data);
    }
    
    setIsSubmitting(false);
  };

  const handleAddUpdate = async () => {
    if (!newUpdate.trim() || !ticket) return;

    const update: TicketUpdate = {
      author: user.displayName || user.email,
      content: newUpdate,
      timestamp: new Date().toISOString()
    };

    const updatedUpdates = [...(ticket.updates || []), update];
    await onUpdate(ticket.id, { updates: updatedUpdates });
    setNewUpdate("");
  };

  const handleEditComment = (index: number, content: string) => {
    setEditingCommentIndex(index);
    setEditContent(content);
  };

  const handleSaveEdit = async (index: number) => {
    if (!ticket || !editContent.trim()) return;
    
    const updatedUpdates = [...(ticket.updates || [])];
    updatedUpdates[index] = {
      ...updatedUpdates[index],
      content: editContent,
      editedAt: new Date().toISOString()
    };
    
    await onUpdate(ticket.id, { updates: updatedUpdates });
    setEditingCommentIndex(null);
    setEditContent("");
  };

  const handleDeleteComment = async (index: number) => {
    if (!ticket) return;
    
    const updatedUpdates = [...(ticket.updates || [])];
    updatedUpdates.splice(index, 1);
    
    await onUpdate(ticket.id, { updates: updatedUpdates });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        const newAttachment: TicketAttachment = {
          name: file.name,
          url: base64,
          type: file.type,
          size: file.size
        };
        setAttachments(prev => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const responsiblesForClient = clientResponsibles?.[client] || [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-zinc-200 dark:border-zinc-800"
      >
        {/* Header */}
        <div className="px-8 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose}
              className="flex items-center gap-1.5 text-zinc-400 hover:text-blue-600 transition-colors group"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Voltar</span>
            </button>
            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex items-center gap-3">
              {ticket && (
                <>
                  <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                    #{ticket.id}
                  </span>
                <span 
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${!settings.statusColors?.[ticket.status] ? STATUS_TEXT_COLORS[ticket.status] : ""} bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700`}
                  style={settings.statusColors?.[ticket.status] ? { color: settings.statusColors[ticket.status] } : {}}
                >
                  {ticket.status}
                </span>
                {ticket.category && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase text-blue-600 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                    {ticket.category}
                  </span>
                )}
                {ticket.priority && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase text-zinc-500 bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700">
                    {ticket.priority}
                  </span>
                )}
              </>
            )}
            {!ticket && (
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Novo Chamado</h2>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsImportant(!isImportant)}
              className={`p-2 rounded-full transition-all ${isImportant ? "text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20" : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
              title={isImportant ? "Remover destaque" : "Marcar como importante"}
            >
              <Star className={`w-5 h-5 ${isImportant ? "fill-current" : ""}`} />
            </button>
            {ticket && (
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                <Pencil className="w-3.5 h-3.5" />
                Editar
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-8">
            {/* Title & Description */}
            <div className="mb-8">
              <input 
                type="text" 
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value.toUpperCase());
                  if (errors.title) setErrors(prev => ({ ...prev, title: "" }));
                }}
                placeholder="Título do chamado... *"
                className={`w-full text-2xl font-bold bg-transparent border rounded-xl px-4 py-2 focus:outline-none placeholder:text-zinc-300 dark:placeholder:text-zinc-700 mb-2 uppercase transition-all ${
                  errors.title ? "border-red-500 text-red-500" : "border-transparent text-zinc-900 dark:text-white"
                }`}
              />
              {errors.title && <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-2">{errors.title}</p>}
              <textarea 
                ref={descriptionRef}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Adicione uma descrição para este chamado..."
                className="w-full text-base text-zinc-500 dark:text-zinc-400 bg-transparent border-none focus:outline-none resize-none placeholder:text-zinc-300 dark:placeholder:text-zinc-700 min-h-[150px]"
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = target.scrollHeight + 'px';
                }}
              />
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-8 border-b border-zinc-100 dark:border-zinc-800 mb-8">
              {[
                { id: "details", label: "Detalhes", icon: <FileText className="w-4 h-4" /> },
                { id: "comments", label: `Comentários (${ticket?.updates?.length || 0})`, icon: <MessageSquare className="w-4 h-4" /> },
                { id: "attachments", label: `Anexos (${attachments.length})`, icon: <Paperclip className="w-4 h-4" /> },
                { id: "history", label: "Histórico", icon: <Clock className="w-4 h-4" /> }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveModalTab(tab.id as any)}
                  className={`flex items-center gap-2 pb-4 text-sm font-bold transition-all relative ${
                    activeModalTab === tab.id 
                      ? "text-blue-600 dark:text-blue-400" 
                      : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {activeModalTab === tab.id && (
                    <motion.div 
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[300px]">
              {activeModalTab === "details" && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <span className="w-24 text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest shrink-0">
                          Cliente <span className="text-red-500">*</span>:
                        </span>
                        {user?.role === "client" && user.associatedClient !== "Todos" ? (
                          <div className="flex-1 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-zinc-900 dark:text-white">
                            {user.associatedClient || client}
                          </div>
                        ) : (
                          <div className="flex-1 relative group">
                            <select 
                              value={client}
                              onChange={(e) => {
                                setClient(e.target.value as ClientName);
                                if (errors.client) setErrors(prev => ({ ...prev, client: "" }));
                              }}
                              className={`w-full bg-zinc-50 dark:bg-zinc-800/50 border rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer transition-all ${
                                errors.client ? "border-red-500 text-red-500" : "border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
                              }`}
                            >
                              {(allClients.length > 0 ? allClients : CLIENTS).map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none group-hover:text-zinc-600 transition-colors" />
                            {errors.client && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-1 px-1">{errors.client}</p>}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="w-24 text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest shrink-0">
                          Categoria <span className="text-red-500">*</span>:
                        </span>
                        <div className="flex-1 relative group">
                          <select 
                            value={category}
                            onChange={(e) => {
                              setCategory(e.target.value);
                              if (errors.category) setErrors(prev => ({ ...prev, category: "" }));
                            }}
                            className={`w-full bg-zinc-50 dark:bg-zinc-800/50 border rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer transition-all ${
                              errors.category ? "border-red-500 text-red-500" : "border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
                            }`}
                          >
                            <option value="">Selecione</option>
                            {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none group-hover:text-zinc-600 transition-colors" />
                          {errors.category && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-1 px-1">{errors.category}</p>}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="w-24 text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest shrink-0">Abertura:</span>
                        <div className="flex-1 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-xl text-sm font-bold text-zinc-900 dark:text-white">
                          {ticket ? formatFirestoreDate(ticket.createdAt, "dd/MM/yy HH:mm") : "-"}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="w-24 text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest shrink-0">Tempo aberto:</span>
                        <div className="flex-1 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-xl text-sm font-bold text-zinc-900 dark:text-white">
                          {ticket ? getTimeOpen(ticket.createdAt) : "-"}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="w-24 text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest shrink-0">
                          SLA / Prazo <span className="text-red-500">*</span>:
                        </span>
                        <div className="flex-1">
                          <DatePicker 
                            selected={slaDate}
                            onChange={(date: Date | null) => {
                              setSlaDate(date);
                              setSla(date ? date.toISOString().slice(0, 16) : "");
                              if (errors.sla) setErrors(prev => ({ ...prev, sla: "" }));
                            }}
                            showTimeSelect
                            timeFormat="HH:mm"
                            timeIntervals={15}
                            dateFormat="dd/MM/yyyy HH:mm"
                            locale="pt-BR"
                            className={`w-full bg-zinc-50 dark:bg-zinc-800/50 border rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-zinc-300 dark:placeholder:text-zinc-600 ${
                              errors.sla ? "border-red-500 text-red-500" : "border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
                            }`}
                          />
                          {errors.sla && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-1 px-1">{errors.sla}</p>}
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      {ticket && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">
                            Status <span className="text-red-500">*</span>
                          </label>
                          <div className="relative group">
                            <select 
                              value={status}
                              onChange={(e) => {
                                setStatus(e.target.value as TicketStatus);
                                if (errors.status) setErrors(prev => ({ ...prev, status: "" }));
                              }}
                              className={`w-full bg-zinc-50 dark:bg-zinc-800/50 border rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer transition-all ${
                                errors.status ? "border-red-500 text-red-500" : "border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
                              }`}
                            >
                              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none group-hover:text-zinc-600 transition-colors" />
                          </div>
                          {errors.status && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-1 px-1">{errors.status}</p>}
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">
                          Prioridade <span className="text-red-500">*</span>
                        </label>
                        <div className="relative group">
                          <select 
                            value={priority}
                            onChange={(e) => {
                              setPriority(e.target.value as TicketPriority);
                              if (errors.priority) setErrors(prev => ({ ...prev, priority: "" }));
                            }}
                            className={`w-full bg-zinc-50 dark:bg-zinc-800/50 border rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer transition-all ${
                              errors.priority ? "border-red-500 text-red-500" : "border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
                            }`}
                          >
                            <option value="">Selecionar...</option>
                            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none group-hover:text-zinc-600 transition-colors" />
                        </div>
                        {errors.priority && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-1 px-1">{errors.priority}</p>}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">
                          Responsável <span className="text-red-500">*</span>
                        </label>
                        <div className="relative group">
                          <select 
                            value={responsible}
                            onChange={(e) => {
                              setResponsible(e.target.value);
                              if (errors.responsible) setErrors(prev => ({ ...prev, responsible: "" }));
                            }}
                            className={`w-full bg-zinc-50 dark:bg-zinc-800/50 border rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer transition-all ${
                              errors.responsible ? "border-red-500 text-red-500" : "border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
                            }`}
                          >
                            <option value="">Selecionar...</option>
                            {[...(clientResponsibles?.[client] || [])].sort((a, b) => a.localeCompare(b)).map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none group-hover:text-zinc-600 transition-colors" />
                        </div>
                        {errors.responsible && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-1 px-1">{errors.responsible}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Horas Section */}
                  <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-zinc-400" />
                        <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Controle de Horas</h3>
                      </div>
                      {ticket?.inProgressSince && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                            Sessão Atual: {formatHoursToHMin(liveElapsed)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-700">
                        <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3">Total Acumulado</p>
                        <div className="flex items-end gap-3">
                          <div className="flex-1">
                            <label className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">Horas</label>
                            <input 
                              type="number"
                              min="0"
                              value={Math.floor(totalHours)}
                              onChange={(e) => {
                                const h = parseInt(e.target.value) || 0;
                                const m = Math.round((totalHours - Math.floor(totalHours)) * 60);
                                setTotalHours(h + (m / 60));
                              }}
                              className="bg-zinc-100 dark:bg-zinc-900 text-xl font-black text-zinc-900 dark:text-white w-full px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">Minutos</label>
                            <input 
                              type="number"
                              min="0"
                              max="59"
                              value={Math.round((totalHours - Math.floor(totalHours)) * 60)}
                              onChange={(e) => {
                                let m = parseInt(e.target.value) || 0;
                                if (m > 59) m = 59;
                                const h = Math.floor(totalHours);
                                setTotalHours(h + (m / 60));
                              }}
                              className="bg-zinc-100 dark:bg-zinc-900 text-xl font-black text-zinc-900 dark:text-white w-full px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-blue-600 rounded-2xl border border-blue-500 shadow-lg shadow-blue-500/20 flex flex-col justify-between">
                        <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest">Total Geral (Com Sessão)</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black text-white">{formatHoursToHMin(totalHours + liveElapsed).split(' ')[0]}</span>
                          <span className="text-lg font-black text-blue-200">{formatHoursToHMin(totalHours + liveElapsed).split(' ')[1]}</span>
                        </div>
                        <p className="text-[9px] font-bold text-blue-200 uppercase tracking-widest mt-2">
                          {ticket?.status === "Em Andamento" ? "Incluindo tempo da sessão atual" : "Tempo total registrado"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Save Button in Details */}
                  <div className="pt-8">
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          {ticket ? "Salvar Alterações" : "Criar Chamado"}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {activeModalTab === "comments" && (
                <div className="flex flex-col h-full min-h-[400px]">
                  <div className="flex-1 space-y-4 mb-6">
                    {ticket?.updates?.map((update, i) => (
                      <div key={i} className="flex gap-4 group">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                          <UserIcon className="w-4 h-4 text-zinc-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-zinc-900 dark:text-white">{update.author}</span>
                              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                                {formatFirestoreDate(update.timestamp, "dd/MM HH:mm")}
                                {update.editedAt && " (editado)"}
                              </span>
                            </div>
                            
                            {(user?.displayName === update.author || user?.email === update.author || user?.role === "admin") && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => handleEditComment(i, update.content)}
                                  className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-400 hover:text-blue-500 transition-colors"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteComment(i)}
                                  className="flex items-center gap-1 px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-zinc-400 hover:text-red-500 transition-colors"
                                  title="Excluir comentário"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span className="text-[10px] font-bold">Excluir</span>
                                </button>
                              </div>
                            )}
                          </div>
                          
                          {editingCommentIndex === i ? (
                            <div className="space-y-2">
                              <textarea 
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                    e.preventDefault();
                                    handleSaveEdit(i);
                                  }
                                }}
                                className="w-full bg-white dark:bg-zinc-900 border border-blue-500 rounded-xl p-3 text-sm focus:outline-none dark:text-white resize-none"
                                rows={3}
                              />
                              <div className="flex justify-end gap-2">
                                <button 
                                  onClick={() => setEditingCommentIndex(null)}
                                  className="px-3 py-1 text-[10px] font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
                                >
                                  Cancelar
                                </button>
                                <button 
                                  onClick={() => handleSaveEdit(i)}
                                  className="px-3 py-1 text-[10px] font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                                >
                                  Salvar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap break-words">
                              {update.content}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {(!ticket?.updates || ticket.updates.length === 0) && (
                      <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                        <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-sm font-medium italic">Nenhum comentário ainda.</p>
                      </div>
                    )}
                  </div>

                  <div className="relative mt-auto">
                    <textarea 
                      value={newUpdate}
                      onChange={(e) => setNewUpdate(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault();
                          handleAddUpdate();
                        }
                      }}
                      placeholder="Adicionar comentário ou tratativa..."
                      rows={3}
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none pr-12 dark:text-white"
                    />
                    <button 
                      onClick={handleAddUpdate}
                      disabled={!newUpdate.trim()}
                      className="absolute right-3 bottom-3 p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-lg shadow-blue-200 dark:shadow-none"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {activeModalTab === "history" && (
                <div className="space-y-6">
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-zinc-100 dark:bg-zinc-800" />
                    <div className="space-y-8 relative">
                      {ticket?.history?.slice().reverse().map((entry, i) => (
                        <div key={i} className="flex gap-6 items-start">
                          <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-900 border-2 border-blue-500 flex items-center justify-center shrink-0 relative z-10">
                            <History className="w-4 h-4 text-blue-500" />
                          </div>
                          <div className="flex-1 pt-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-black text-zinc-900 dark:text-white">{entry.action}</span>
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                {formatFirestoreDate(entry.timestamp, "dd/MM/yy HH:mm")}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mb-1">
                              Realizado por: <span className="text-zinc-700 dark:text-zinc-300 font-bold">{entry.user}</span>
                            </p>
                            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-700 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">
                              {entry.details}
                            </div>
                          </div>
                        </div>
                      ))}
                      {(!ticket?.history || ticket.history.length === 0) && (
                        <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                          <History className="w-12 h-12 mb-4 opacity-20" />
                          <p className="text-sm font-medium italic">Nenhum histórico registrado.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeModalTab === "attachments" && (
                <div className="space-y-6">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl p-12 flex flex-col items-center justify-center gap-4 hover:border-blue-500/50 hover:bg-blue-50/10 transition-all cursor-pointer group"
                  >
                    <div className="w-16 h-16 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Paperclip className="w-8 h-8 text-zinc-400 group-hover:text-blue-500" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-zinc-900 dark:text-white">Clique para anexar arquivo</p>
                      <p className="text-xs text-zinc-400">ou arraste e solte aqui</p>
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      className="hidden" 
                      multiple 
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {attachments.map((file, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl group shadow-sm">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-zinc-400" />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{file.name}</p>
                            <p className="text-[10px] text-zinc-400">{(file.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a 
                            href={file.url} 
                            download={file.name}
                            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-xl text-zinc-500"
                          >
                            <DownloadIcon className="w-4 h-4" />
                          </a>
                          <button 
                            type="button"
                            onClick={() => removeAttachment(i)}
                            className="flex items-center gap-1 px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl text-red-500 transition-colors"
                            title="Excluir anexo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold">Excluir</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeModalTab === "history" && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-4 h-4 text-zinc-400" />
                    <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Histórico de Alterações</h3>
                  </div>
                  <div className="space-y-4">
                    {ticket?.history?.map((entry, i) => (
                      <div key={i} className="flex gap-4 relative">
                        {i !== (ticket.history?.length || 0) - 1 && (
                          <div className="absolute left-4 top-8 bottom-0 w-px bg-zinc-100 dark:bg-zinc-800" />
                        )}
                        <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0 z-10">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                        </div>
                        <div className="flex-1 pb-6">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-zinc-900 dark:text-white">{entry.action}</span>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                              {formatFirestoreDate(entry.timestamp, "dd/MM HH:mm")}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Por: {entry.user}</p>
                          <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">{entry.details}</p>
                        </div>
                      </div>
                    ))}
                    {(!ticket?.history || ticket.history.length === 0) && (
                      <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                        <Clock className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-sm font-medium italic">Nenhum histórico disponível.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            {ticket && (user?.role === "admin" || user?.role === "user") && (
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-zinc-500 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Excluir Ticket
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
            >
              Fechar
            </button>
          </div>
        </div>

        {/* Delete Confirmation Overlay */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <div className="absolute inset-0 z-[60] flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white dark:bg-zinc-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-zinc-200 dark:border-zinc-800 text-center"
              >
                <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Excluir Chamado?</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">Esta ação não pode ser desfeita. Todos os dados e anexos serão removidos.</p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => {
                      if (ticket) onDelete(ticket.id);
                      setShowDeleteConfirm(false);
                    }}
                    className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-200 dark:shadow-none"
                  >
                    Sim, excluir
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
