import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  User, 
  Clock,
  Trash2,
  AlertCircle
} from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addDays, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ScheduleEntry {
  id: string;
  analyst: string;
  date: string; // ISO string
  shift: "Manhã" | "Tarde" | "Noite" | "Plantão";
}

interface ScheduleViewProps {
  isAdmin: boolean;
  token: string;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({ isAdmin, token }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newEntry, setNewEntry] = useState<Partial<ScheduleEntry>>({
    shift: "Manhã"
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const res = await fetch("/api/schedules", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSchedules(data);
      }
    } catch (error) {
      console.error("Error fetching schedules:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchedule = async () => {
    if (!newEntry.analyst || !newEntry.date || !newEntry.shift) return;

    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(newEntry)
      });

      if (res.ok) {
        const saved = await res.json();
        setSchedules(prev => [...prev, saved]);
        setIsAdding(false);
        setNewEntry({ shift: "Manhã" });
      }
    } catch (error) {
      console.error("Error adding schedule:", error);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm("Deseja excluir esta escala?")) return;

    try {
      const res = await fetch(`/api/schedules/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        setSchedules(prev => prev.filter(s => s.id !== id));
      }
    } catch (error) {
      console.error("Error deleting schedule:", error);
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

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

      <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden">
        {/* Calendar Header */}
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CalendarIcon className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-black text-zinc-900 dark:text-white capitalize">
              {format(currentDate, "MMMM yyyy", { locale: ptBR })}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">
              <ChevronLeft className="w-5 h-5 text-zinc-500" />
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors">
              Hoje
            </button>
            <button onClick={nextMonth} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">
              <ChevronRight className="w-5 h-5 text-zinc-500" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(day => (
            <div key={day} className="py-4 text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-800">
              {day}
            </div>
          ))}
          {calendarDays.map((day, i) => {
            const daySchedules = schedules.filter(s => isSameDay(new Date(s.date), day));
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isToday = isSameDay(day, new Date());

            return (
              <div 
                key={day.toString()} 
                className={`min-h-[140px] p-3 border-r border-b border-zinc-100 dark:border-zinc-800 last:border-r-0 transition-colors ${
                  !isCurrentMonth ? "bg-zinc-50/50 dark:bg-zinc-950/20" : "bg-white dark:bg-zinc-900"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-sm font-black ${
                    isToday ? "w-7 h-7 bg-blue-600 text-white rounded-lg flex items-center justify-center" : 
                    isCurrentMonth ? "text-zinc-900 dark:text-white" : "text-zinc-300 dark:text-zinc-700"
                  }`}>
                    {format(day, "d")}
                  </span>
                </div>
                
                <div className="space-y-1.5">
                  {daySchedules.map(s => (
                    <div 
                      key={s.id}
                      className={`group relative p-2 rounded-xl text-[10px] font-bold border transition-all ${
                        s.shift === "Manhã" ? "bg-blue-50 border-blue-100 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300" :
                        s.shift === "Tarde" ? "bg-orange-50 border-orange-100 text-orange-700 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-300" :
                        s.shift === "Noite" ? "bg-indigo-50 border-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-300" :
                        "bg-red-50 border-red-100 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <User className="w-3 h-3 shrink-0" />
                        <span className="truncate">{s.analyst}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 opacity-70">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>{s.shift}</span>
                      </div>

                      {isAdmin && (
                        <button 
                          onClick={() => handleDeleteSchedule(s.id)}
                          className="absolute -top-1 -right-1 p-1 bg-white dark:bg-zinc-800 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
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
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Analista</label>
                <input 
                  type="text"
                  placeholder="Nome do analista"
                  value={newEntry.analyst || ""}
                  onChange={e => setNewEntry(prev => ({ ...prev, analyst: e.target.value }))}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold dark:text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Data</label>
                <input 
                  type="date"
                  value={newEntry.date || ""}
                  onChange={e => setNewEntry(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold dark:text-white"
                />
              </div>

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
