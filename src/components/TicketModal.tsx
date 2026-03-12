import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, User as UserIcon, Clock, CheckCircle2, AlertCircle, MessageSquare, Plus, Trash2, Paperclip, FileText, Download as DownloadIcon, Pencil, Save, Loader2 } from "lucide-react";
import { Ticket, TicketStatus, ClientName, TicketUpdate, TicketAttachment, TicketCategory, TicketPriority } from "../types";
import { CLIENTS, STATUSES, STATUS_COLORS, STATUS_TEXT_COLORS, CATEGORIES, PRIORITIES } from "../constants";
import { formatFirestoreDate, getTimeOpen } from "../utils/dateUtils";

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
}

export default function TicketModal({ isOpen, onClose, ticket, onCreate, onUpdate, onDelete, user, activeClient, clientResponsibles }: TicketModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [client, setClient] = useState<ClientName>(activeClient || CLIENTS[0]);
  const [status, setStatus] = useState<TicketStatus>("Aberto");
  const [category, setCategory] = useState<TicketCategory | "">("");
  const [priority, setPriority] = useState<TicketPriority | "">("");
  const [responsible, setResponsible] = useState("");
  const [sla, setSla] = useState("");
  const [totalHours, setTotalHours] = useState<number>(0);
  const [billedHours, setBilledHours] = useState<number>(0);
  const [newUpdate, setNewUpdate] = useState("");
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<"details" | "comments" | "attachments">("details");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ticket) {
      setTitle(ticket.title);
      setDescription(ticket.description || "");
      setClient(ticket.client);
      setStatus(ticket.status);
      setCategory(ticket.category || "");
      setPriority(ticket.priority || "");
      setResponsible(ticket.responsible || "");
      setSla(ticket.sla || "");
      setTotalHours(ticket.totalHours || 0);
      setBilledHours(ticket.billedHours || 0);
      setAttachments(ticket.attachments || []);
    } else {
      setTitle("");
      setDescription("");
      setClient(user?.role === "client" ? user.associatedClient : (activeClient || CLIENTS[0]));
      setStatus("Aberto");
      setCategory("");
      setPriority("");
      setResponsible("");
      setSla("");
      setTotalHours(0);
      setBilledHours(0);
      setAttachments([]);
    }
  }, [ticket, activeClient, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const data = {
      title,
      description,
      client: user?.role === "client" ? user.associatedClient : client,
      status,
      category: category || undefined,
      priority: priority || undefined,
      totalHours,
      billedHours,
      responsible,
      sla,
      attachments
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
          <div className="flex items-center gap-3">
            {ticket && (
              <>
                <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                  {ticket.id}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${STATUS_TEXT_COLORS[ticket.status]} bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700`}>
                  {ticket.status}
                </span>
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
          <div className="flex items-center gap-2">
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
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título do chamado..."
                className="w-full text-2xl font-bold text-zinc-900 dark:text-white bg-transparent border-none focus:outline-none placeholder:text-zinc-300 dark:placeholder:text-zinc-700 mb-2"
              />
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Adicione uma descrição para este chamado..."
                rows={2}
                className="w-full text-sm text-zinc-500 dark:text-zinc-400 bg-transparent border-none focus:outline-none resize-none placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
              />
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-8 border-b border-zinc-100 dark:border-zinc-800 mb-8">
              {[
                { id: "details", label: "Detalhes", icon: <FileText className="w-4 h-4" /> },
                { id: "comments", label: `Comentários (${ticket?.updates?.length || 0})`, icon: <MessageSquare className="w-4 h-4" /> },
                { id: "attachments", label: `Anexos (${attachments.length})`, icon: <Paperclip className="w-4 h-4" /> }
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
                        <span className="w-24 text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Clientes:</span>
                        {user?.role === "client" ? (
                          <span className="text-sm font-bold text-zinc-900 dark:text-white">{user.associatedClient || client}</span>
                        ) : (
                          <select 
                            value={client}
                            onChange={(e) => setClient(e.target.value as ClientName)}
                            className="bg-transparent text-sm font-bold text-zinc-900 dark:text-white focus:outline-none cursor-pointer"
                          >
                            {CLIENTS.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="w-24 text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Categoria:</span>
                        <select 
                          value={category}
                          onChange={(e) => setCategory(e.target.value as TicketCategory)}
                          className="bg-transparent text-sm font-bold text-zinc-900 dark:text-white focus:outline-none cursor-pointer"
                        >
                          <option value="">Selecione</option>
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="w-24 text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Abertura:</span>
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">
                          {ticket ? formatFirestoreDate(ticket.createdAt, "dd/MM/yy HH:mm") : "-"}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="w-24 text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Tempo aberto:</span>
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">
                          {ticket ? getTimeOpen(ticket.createdAt) : "-"}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="w-24 text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">SLA / Prazo:</span>
                        <input 
                          type="text" 
                          value={sla}
                          onChange={(e) => setSla(e.target.value)}
                          placeholder="Ex: 4h, 24h"
                          className="bg-transparent text-sm font-bold text-zinc-900 dark:text-white focus:outline-none placeholder:text-zinc-300"
                        />
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Status</label>
                        <select 
                          value={status}
                          onChange={(e) => setStatus(e.target.value as TicketStatus)}
                          className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white"
                        >
                          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Prioridade</label>
                        <select 
                          value={priority}
                          onChange={(e) => setPriority(e.target.value as TicketPriority)}
                          className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white"
                        >
                          <option value="">Selecionar...</option>
                          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Responsável</label>
                        <select 
                          value={responsible}
                          onChange={(e) => setResponsible(e.target.value)}
                          className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white"
                        >
                          <option value="">Selecionar...</option>
                          {(clientResponsibles?.[client] || []).map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Horas Section */}
                  <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="w-4 h-4 text-zinc-400" />
                      <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Horas</h3>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-1 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-700">
                        <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Total Horas</p>
                        <input 
                          type="number"
                          step="0.1"
                          value={totalHours}
                          onChange={(e) => setTotalHours(parseFloat(e.target.value) || 0)}
                          className="bg-transparent text-xl font-black text-zinc-900 dark:text-white w-full focus:outline-none"
                        />
                      </div>
                      <div className="flex-1 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-700">
                        <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Horas Faturadas</p>
                        <input 
                          type="number"
                          step="0.1"
                          value={billedHours}
                          onChange={(e) => setBilledHours(parseFloat(e.target.value) || 0)}
                          className="bg-transparent text-xl font-black text-zinc-900 dark:text-white w-full focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Seguidores Section */}
                  <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2 mb-4">
                      <UserIcon className="w-4 h-4 text-zinc-400" />
                      <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Seguidores</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border-2 border-white dark:border-zinc-900">
                        <UserIcon className="w-4 h-4 text-zinc-400" />
                      </div>
                      <button className="w-8 h-8 rounded-full bg-zinc-50 dark:bg-zinc-800 border border-dashed border-zinc-300 dark:border-zinc-600 flex items-center justify-center text-zinc-400 hover:text-blue-500 hover:border-blue-500 transition-all">
                        <Plus className="w-4 h-4" />
                      </button>
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
                      <div key={i} className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                          <UserIcon className="w-4 h-4 text-zinc-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-zinc-900 dark:text-white">{update.author}</span>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                              {formatFirestoreDate(update.timestamp, "dd/MM HH:mm")}
                            </span>
                          </div>
                          <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-300">
                            {update.content}
                          </div>
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
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
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
