import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { 
  Calendar as CalendarIcon, 
  Plus, 
  User, 
  Clock,
  Trash2,
  Sun,
  CloudSun,
  Moon,
  ShieldAlert,
  Hash,
  Briefcase,
  Tag as TagIcon
} from "lucide-react";
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/pt-br';
import { Ticket } from "../types";

moment.locale('pt-br');
const localizer = momentLocalizer(moment);

interface ScheduleEntry {
  id: string;
  analyst: string;
  date: string; // ISO string (Start Date)
  endDate?: string; // ISO string (End Date)
  shift: "Manhã" | "Tarde" | "Noite" | "Plantão";
}

interface ScheduleViewProps {
  isAdmin: boolean;
  schedules: ScheduleEntry[];
  onAdd: (entry: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  users: any[];
  tickets: Ticket[];
  onTicketClick: (ticket: Ticket) => void;
}

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: (ScheduleEntry & { type: 'schedule' }) | (Ticket & { type: 'ticket' });
};

export const ScheduleView: React.FC<ScheduleViewProps> = ({ isAdmin, schedules, onAdd, onDelete, users, tickets, onTicketClick }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newEntry, setNewEntry] = useState<Partial<ScheduleEntry>>({
    shift: "Manhã",
    analyst: ""
  });

  const adminUsers = React.useMemo(() => {
    return users.filter(u => u.role === "admin");
  }, [users]);

  const events = useMemo<CalendarEvent[]>(() => {
    const scheduleEvents: CalendarEvent[] = schedules.map(s => {
      const start = new Date(s.date);
      const end = s.endDate ? new Date(s.endDate) : new Date(s.date);
      if (s.endDate) {
        end.setHours(23, 59, 59, 999);
      } else {
        end.setHours(23, 59, 59, 999);
      }
      return {
        id: s.id,
        title: `${s.analyst} (${s.shift})`,
        start,
        end,
        resource: { ...s, type: 'schedule' }
      };
    });

    const ticketEvents: CalendarEvent[] = tickets.map(t => {
      const date = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
      return {
        id: t.id,
        title: `#${t.id} (${t.responsible}) (${t.client})`,
        start: date,
        end: date,
        resource: { ...t, type: 'ticket' }
      };
    });

    return [...scheduleEvents, ...ticketEvents];
  }, [schedules, tickets]);

  const handleAddSchedule = async () => {
    if (!newEntry.analyst || !newEntry.date || !newEntry.shift) return;

    // Fix date bug: parse YYYY-MM-DD as local date
    const parseAsLocalISO = (dateStr: string) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, m - 1, d).toISOString();
    };

    const payload = {
      ...newEntry,
      date: parseAsLocalISO(newEntry.date!),
      endDate: newEntry.endDate ? parseAsLocalISO(newEntry.endDate) : undefined
    };

    await onAdd(payload);
    setIsAdding(false);
    setNewEntry({ shift: "Manhã", analyst: "" });
  };

  const handleDeleteScheduleClick = async (id: string) => {
    if (!confirm("Deseja excluir esta escala?")) return;
    await onDelete(id);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">Escala de Analistas</h2>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium">Cronograma de plantões e turnos da equipe IT</p>
        </div>

        {isAdmin && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-2xl transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nova Escala
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-6 px-4 py-2 bg-zinc-50/50 dark:bg-zinc-800/20 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 w-fit">
        {[
          { label: "Manhã", color: "bg-blue-500", icon: <Sun className="w-3 h-3" /> },
          { label: "Tarde", color: "bg-orange-500", icon: <CloudSun className="w-3 h-3" /> },
          { label: "Noite", color: "bg-indigo-500", icon: <Moon className="w-3 h-3" /> },
          { label: "Plantão", color: "bg-rose-500", icon: <ShieldAlert className="w-3 h-3" /> },
          { label: "Chamado", color: "bg-zinc-400", icon: <Hash className="w-3 h-3" /> }
        ].map(item => (
          <div key={item.label} className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg ${item.color} bg-opacity-10 text-opacity-100 ${item.color.replace('bg-', 'text-')}`}>
              {item.icon}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden">
        <Calendar<CalendarEvent>
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 700 }}
          onSelectEvent={(event) => {
            if (event.resource.type === 'ticket') {
              onTicketClick(event.resource);
            }
          }}
          messages={{
            next: "Próximo",
            previous: "Anterior",
            today: "Hoje",
            month: "Mês",
            week: "Semana",
            day: "Dia",
            agenda: "Agenda",
            date: "Data",
            time: "Hora",
            event: "Evento",
          }}
          components={{
            toolbar: (props) => {
              const { label, onNavigate, onView, view } = props;
              return (
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
                  <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                    <button 
                      onClick={() => onNavigate('PREV')}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-900 transition-all active:scale-95"
                    >
                      Anterior
                    </button>
                    <button 
                      onClick={() => onNavigate('TODAY')}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm transition-all active:scale-95"
                    >
                      Hoje
                    </button>
                    <button 
                      onClick={() => onNavigate('NEXT')}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-900 transition-all active:scale-95"
                    >
                      Próximo
                    </button>
                  </div>

                  <h3 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight uppercase">
                    {label}
                  </h3>

                  <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                    {['month', 'week', 'day', 'agenda'].map((v) => (
                      <button 
                        key={v}
                        onClick={() => onView(v as any)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                          view === v 
                            ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm" 
                            : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                        }`}
                      >
                        {v === 'month' ? 'Mês' : v === 'week' ? 'Semana' : v === 'day' ? 'Dia' : 'Agenda'}
                      </button>
                    ))}
                  </div>
                </div>
              );
            },
            month: {
              dateHeader: ({ label, date }) => {
                const isToday = moment(date).isSame(moment(), 'day');
                return (
                  <div className={`flex flex-col items-end p-2 ${isToday ? "text-blue-600 dark:text-blue-400" : ""}`}>
                    <span className={`text-xs font-black ${isToday ? "scale-125 origin-right" : "opacity-50"}`}>
                      {label}
                    </span>
                  </div>
                );
              }
            },
            event: ({ event }) => {
              const res = event.resource;
              if (res.type === 'ticket') {
                return (
                  <div className="group relative px-2 py-1.5 rounded-lg text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 transition-all hover:shadow-md hover:-translate-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <div className="flex items-center gap-0.5 bg-zinc-200 dark:bg-zinc-700 px-1 rounded text-[9px] font-black">
                        <Hash className="w-2.5 h-2.5" />
                        {res.id}
                      </div>
                      <div className="flex items-center gap-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1 rounded text-[9px] font-black">
                        <User className="w-2.5 h-2.5" />
                        {res.responsible}
                      </div>
                      <div className="flex items-center gap-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-1 rounded text-[9px] font-black">
                        <Briefcase className="w-2.5 h-2.5" />
                        {res.client}
                      </div>
                    </div>
                  </div>
                );
              }

              const shiftIcons = {
                "Manhã": <Sun className="w-3 h-3" />,
                "Tarde": <CloudSun className="w-3 h-3" />,
                "Noite": <Moon className="w-3 h-3" />,
                "Plantão": <ShieldAlert className="w-3 h-3" />
              };

              const shiftColors = {
                "Manhã": "bg-blue-500/10 text-blue-600 border-blue-200/50 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-800/50",
                "Tarde": "bg-orange-500/10 text-orange-600 border-orange-200/50 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-800/50",
                "Noite": "bg-indigo-500/10 text-indigo-600 border-indigo-200/50 dark:bg-indigo-500/20 dark:text-indigo-400 dark:border-indigo-800/50",
                "Plantão": "bg-rose-500/10 text-rose-600 border-rose-200/50 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-800/50"
              };

              const dotColors = {
                "Manhã": "bg-blue-500",
                "Tarde": "bg-orange-500",
                "Noite": "bg-indigo-500",
                "Plantão": "bg-rose-500"
              };

              return (
                <div className={`group relative px-3 py-2 rounded-xl text-[11px] font-bold border transition-all hover:shadow-lg hover:-translate-y-0.5 ${shiftColors[res.shift as keyof typeof shiftColors]}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <div className={`w-2 h-2 rounded-full shrink-0 shadow-sm ${dotColors[res.shift as keyof typeof dotColors]}`} />
                      <span className="truncate tracking-tight">{res.analyst}</span>
                    </div>
                    <div className="opacity-40 group-hover:opacity-100 transition-opacity">
                      {shiftIcons[res.shift as keyof typeof shiftIcons]}
                    </div>
                  </div>
                  
                  {isAdmin && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteScheduleClick(event.id as string);
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-white dark:bg-zinc-800 rounded-full shadow-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-red-500 hover:text-red-600 border border-zinc-100 dark:border-zinc-700 z-20 hover:scale-110 active:scale-90"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            }
          }}
        />
      </div>

      {/* Add Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border border-zinc-100 dark:border-zinc-800"
          >
            <h3 className="text-2xl font-black text-zinc-900 dark:text-white mb-6">Agendar Escala</h3>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Analista (Admin)</label>
                <select 
                  value={newEntry.analyst || ""}
                  onChange={e => setNewEntry(prev => ({ ...prev, analyst: e.target.value }))}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold dark:text-white"
                >
                  <option value="">Selecione um analista</option>
                  {adminUsers.map(u => (
                    <option key={u.id} value={u.displayName || u.email}>
                      {u.displayName || u.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">
                  {newEntry.shift === "Plantão" ? "Data Início" : "Data"}
                </label>
                <input 
                  type="date"
                  value={newEntry.date || ""}
                  onChange={e => setNewEntry(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold dark:text-white"
                />
              </div>

              {newEntry.shift === "Plantão" && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Data Fim</label>
                  <input 
                    type="date"
                    value={newEntry.endDate || ""}
                    onChange={e => setNewEntry(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold dark:text-white"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Turno</label>
                <div className="grid grid-cols-2 gap-2">
                  {["Manhã", "Tarde", "Noite", "Plantão"].map(s => (
                    <button
                      key={s}
                      onClick={() => setNewEntry(prev => ({ ...prev, shift: s as any }))}
                      className={`py-3 rounded-2xl text-xs font-bold border transition-all ${
                        newEntry.shift === s 
                          ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20" 
                          : "bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-10">
              <button 
                onClick={() => setIsAdding(false)}
                className="flex-1 py-4 rounded-2xl text-sm font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleAddSchedule}
                className="flex-1 py-4 rounded-2xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all"
              >
                Salvar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
