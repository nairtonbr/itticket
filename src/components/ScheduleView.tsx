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
import { getTicketDeadline } from "../utils/slaUtils";

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
  allDay?: boolean;
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
      // Set to 1 second after midnight to appear after tickets
      start.setHours(0, 0, 1, 0);
      
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
        allDay: true,
        resource: { ...s, type: 'schedule' as const }
      };
    });

    const ticketEvents: (CalendarEvent | null)[] = tickets
      .map(t => {
        const deadlineDate = getTicketDeadline(t);
        if (!deadlineDate || isNaN(deadlineDate.getTime())) return null;

        // Set to exactly midnight to appear before schedules
        const start = new Date(deadlineDate);
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(deadlineDate);
        end.setHours(0, 0, 0, 0);

        return {
          id: t.id,
          title: `#${t.id} (${t.responsible}) (${t.client})`,
          start,
          end,
          allDay: true,
          resource: { ...t, type: 'ticket' as const }
        };
      });

    const filteredTicketEvents = ticketEvents.filter((e): e is CalendarEvent => e !== null);

    // Invert order: tickets first, then schedules
    return [...filteredTicketEvents, ...scheduleEvents];
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
          <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">Agenda (Chamados e Escala de Analistas)</h2>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium">Cronograma de plantões e turnos da equipe IT</p>
        </div>

        {isAdmin && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-2xl transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nova Agenda
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
          allDayAccessor="allDay"
          style={{ height: 850 }}
          eventPropGetter={(event) => ({
            style: {
              backgroundColor: 'transparent',
              border: 'none',
              padding: '0.5px 0',
              display: 'block'
            }
          })}
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
                  <div className={`flex items-center justify-end p-1 ${isToday ? "text-blue-600 dark:text-blue-400" : ""}`}>
                    <span className={`text-[10px] font-black ${isToday ? "scale-110" : "opacity-40"}`}>
                      {label}
                    </span>
                  </div>
                );
              }
            },
            event: ({ event }) => {
              const res = event.resource;
              if (res.type === 'ticket') {
                const priorityColors = {
                  "Urgente": "bg-rose-600 border-rose-700/50 text-white",
                  "Alta": "bg-orange-600 border-orange-700/50 text-white",
                  "Média": "bg-blue-600 border-blue-700/50 text-white",
                  "Baixa": "bg-zinc-600 border-zinc-700/50 text-white"
                };
                
                const colorClass = res.priority ? priorityColors[res.priority] : "bg-blue-600 border-blue-700/50 text-white";

                return (
                  <div className={`group relative px-1.5 py-0.5 rounded-sm text-[8px] font-bold shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 overflow-hidden flex items-center gap-1 border ${colorClass}`}>
                    <div className="flex shrink-0 items-center justify-center bg-white/20 rounded-xs px-0.5 font-black text-[7px]">
                      #{res.id}
                    </div>
                    <span className="truncate opacity-95 tracking-tight">{res.client}</span>
                    <div className="px-1 rounded-xs bg-black/10 text-[7px] font-black uppercase tracking-tighter shrink-0 border border-white/5">
                      {res.responsible}
                    </div>
                    {res.priority === "Urgente" && (
                      <ShieldAlert className="w-2 h-2 ml-auto shrink-0 animate-pulse" />
                    )}
                    <div className="ml-auto shrink-0 opacity-60">
                      <Clock className="w-1.5 h-1.5" />
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
                "Manhã": "bg-blue-500/5 text-blue-600/70 border-blue-200/30 dark:bg-blue-500/10 dark:text-blue-400/70 dark:border-blue-800/30",
                "Tarde": "bg-orange-500/5 text-orange-600/70 border-orange-200/30 dark:bg-orange-500/10 dark:text-orange-400/70 dark:border-orange-800/30",
                "Noite": "bg-indigo-500/5 text-indigo-600/70 border-indigo-200/30 dark:bg-indigo-500/10 dark:text-indigo-400/70 dark:border-indigo-800/30",
                "Plantão": "bg-rose-500/5 text-rose-600/70 border-rose-200/30 dark:bg-rose-500/10 dark:text-rose-400/70 dark:border-rose-800/30"
              };

              const dotColors = {
                "Manhã": "bg-blue-500/50",
                "Tarde": "bg-orange-500/50",
                "Noite": "bg-indigo-500/50",
                "Plantão": "bg-rose-500/50"
              };

              return (
                <div className={`group relative px-1.5 py-0.5 rounded-sm text-[9px] font-medium border transition-all hover:shadow-md hover:-translate-y-0.5 ${shiftColors[res.shift as keyof typeof shiftColors]}`}>
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 truncate">
                      <div className={`w-1 h-1 rounded-full shrink-0 shadow-sm ${dotColors[res.shift as keyof typeof dotColors]}`} />
                      <span className="truncate tracking-tight opacity-90">{res.analyst}</span>
                      {res.shift === "Plantão" && (
                        <span className="px-0.5 rounded-xs bg-white/20 text-[7px] font-black uppercase tracking-tighter shrink-0">Plantão</span>
                      )}
                    </div>
                    <div className="opacity-10 group-hover:opacity-100 transition-opacity shrink-0">
                      {shiftIcons[res.shift as keyof typeof shiftIcons]}
                    </div>
                  </div>
                  
                  {isAdmin && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteScheduleClick(event.id as string);
                      }}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white dark:bg-zinc-800 rounded-full shadow-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-red-500 hover:text-red-600 border border-zinc-100 dark:border-zinc-700 z-20 hover:scale-110 active:scale-90"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
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
            <h3 className="text-2xl font-black text-zinc-900 dark:text-white mb-6">Agendar</h3>
            
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
