import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, User as UserIcon, Clock, CheckCircle2, AlertCircle, MessageSquare, Plus, Trash2, Paperclip, FileText, Download as DownloadIcon } from "lucide-react";
import { Ticket, TicketStatus, ClientName, TicketUpdate, TicketAttachment, TicketCategory } from "../types";
import { CLIENTS, STATUSES, STATUS_COLORS, STATUS_TEXT_COLORS, CATEGORIES } from "../constants";
import { formatFirestoreDate } from "../utils/dateUtils";

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket | null;
  onCreate: (ticket: Partial<Ticket>) => void;
  onUpdate: (ticketId: string, updates: Partial<Ticket>) => void;
  user: any;
  activeClient?: ClientName;
  clientResponsibles?: Record<string, string[]>;
}

export default function TicketModal({ isOpen, onClose, ticket, onCreate, onUpdate, user, activeClient, clientResponsibles }: TicketModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [client, setClient] = useState<ClientName>(activeClient || CLIENTS[0]);
  const [status, setStatus] = useState<TicketStatus>("Aberto");
  const [category, setCategory] = useState<TicketCategory | "">("");
  const [responsible, setResponsible] = useState("");
  const [sla, setSla] = useState("");
  const [newUpdate, setNewUpdate] = useState("");
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ticket) {
      setTitle(ticket.title);
      setDescription(ticket.description || "");
      setClient(ticket.client);
      setStatus(ticket.status);
      setCategory(ticket.category || "");
      setResponsible(ticket.responsible || "");
      setSla(ticket.sla || "");
      setAttachments(ticket.attachments || []);
    } else {
      setTitle("");
      setDescription("");
      setClient(activeClient || CLIENTS[0]);
      setStatus("Aberto");
      setCategory("");
      setResponsible("");
      setSla("");
      setAttachments([]);
    }
  }, [ticket, activeClient, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const data = {
      title,
      description,
      client,
      status,
      category: category || undefined,
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
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${ticket ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" : "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"}`}>
              {ticket ? <AlertCircle className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{ticket ? "Editar Ticket" : "Novo Ticket"}</h2>
              {ticket && <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">#{ticket.id}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col md:flex-row">
          {/* Form Section */}
          <form onSubmit={handleSubmit} className="flex-1 p-6 md:p-8 space-y-6 border-b md:border-b-0 md:border-r border-zinc-100 dark:border-zinc-800">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">Título do Chamado</label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Ex: Lentidão na conexão"
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">Cliente</label>
                <select 
                  value={client}
                  onChange={(e) => setClient(e.target.value as ClientName)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium appearance-none dark:text-white"
                >
                  {CLIENTS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">Status</label>
                <select 
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TicketStatus)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium appearance-none dark:text-white"
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">Categoria</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TicketCategory)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium appearance-none dark:text-white"
                >
                  <option value="">Selecione uma categoria</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">Responsável</label>
                {responsiblesForClient.length > 0 ? (
                  <select 
                    value={responsible}
                    onChange={(e) => setResponsible(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium appearance-none dark:text-white"
                  >
                    <option value="">Selecione um responsável</option>
                    {responsiblesForClient.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                ) : (
                  <input 
                    type="text" 
                    value={responsible}
                    onChange={(e) => setResponsible(e.target.value)}
                    placeholder="Nome do técnico"
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium dark:text-white"
                  />
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">SLA / Prazo</label>
                <input 
                  type="text" 
                  value={sla}
                  onChange={(e) => setSla(e.target.value)}
                  placeholder="Ex: 4h, 24h, Urgente"
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">Descrição</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Detalhes do problema ou solicitação..."
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium resize-none dark:text-white"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">Anexos</label>
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Adicionar Arquivo
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  multiple 
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {attachments.map((file, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl group">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                      <span className="text-xs font-medium truncate dark:text-zinc-300">{file.name}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a 
                        href={file.url} 
                        download={file.name}
                        className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-500"
                      >
                        <DownloadIcon className="w-3 h-3" />
                      </a>
                      <button 
                        type="button"
                        onClick={() => removeAttachment(i)}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg shadow-blue-100 dark:shadow-none flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  {ticket ? "Salvar Alterações" : "Criar Chamado"}
                </>
              )}
            </button>
          </form>

          {/* Updates Section */}
          {ticket && (
            <div className="w-full md:w-80 bg-zinc-50/50 dark:bg-zinc-900/50 p-6 flex flex-col shrink-0">
              <div className="flex items-center gap-2 mb-6">
                <MessageSquare className="w-4 h-4 text-zinc-400" />
                <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Atualizações</h3>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto mb-6 pr-2">
                {ticket.updates?.map((update, i) => (
                  <div key={i} className="bg-white dark:bg-zinc-800 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">{update.author}</span>
                      <span className="text-[9px] text-zinc-400 dark:text-zinc-500">
                        {formatFirestoreDate(update.timestamp, "dd/MM HH:mm")}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">{update.content}</p>
                  </div>
                ))}
                {(!ticket.updates || ticket.updates.length === 0) && (
                  <p className="text-xs text-zinc-400 dark:text-zinc-600 text-center py-8 italic">Nenhuma atualização ainda.</p>
                )}
              </div>

              <div className="relative">
                <textarea 
                  value={newUpdate}
                  onChange={(e) => setNewUpdate(e.target.value)}
                  placeholder="Nova atualização..."
                  rows={2}
                  className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none pr-10 dark:text-white"
                />
                <button 
                  onClick={handleAddUpdate}
                  disabled={!newUpdate.trim()}
                  className="absolute right-2 bottom-2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Send className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
