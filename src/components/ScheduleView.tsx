import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { 
  Calendar as CalendarIcon, 
  Plus, 
  User, 
  Clock,
  Trash2
} from "lucide-react";
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/pt-br';

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
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({ isAdmin, schedules, onAdd, onDelete, users }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newEntry, setNewEntry] = useState<Partial<ScheduleEntry>>({
    shift: "Manhã",
    analyst: ""
  });

  const adminUsers = React.useMemo(() => {
    return users.filter(u => u.role === "admin");
  }, [users]);

  const events = useMemo(() => {
    return schedules.map(s => {
      const start = new Date(s.date);
      const end = s.endDate ? new Date(s.endDate) : new Date(s.date);
      // Ensure end date includes the full day if it's a multi-day event
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
        resource: s
      };
    });
  }, [schedules]);

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

      <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-6 border border-zinc-100 dark:border-zinc-800 shadow-sm">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 600 }}
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
            event: ({ event }) => (
              <div className={`group relative p-1 rounded text-[10px] font-bold ${
                event.resource.shift === "Manhã" ? "bg-blue-100 text-blue-800" :
                event.resource.shift === "Tarde" ? "bg-orange-100 text-orange-800" :
                event.resource.shift === "Noite" ? "bg-indigo-100 text-indigo-800" :
                "bg-red-100 text-red-800"
              }`}>
                <div className="flex items-center gap-1 truncate">
                  <User className="w-3 h-3 shrink-0" />
                  <span className="truncate">{event.resource.analyst}</span>
                </div>
                {isAdmin && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteScheduleClick(event.id as string);
                    }}
                    className="absolute -top-1 -right-1 p-0.5 bg-white rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )
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
