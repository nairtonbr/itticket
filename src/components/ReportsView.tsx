import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { BarChart3, PieChart as PieChartIcon, Calendar, Filter, Download, ChevronDown, CheckCircle2, AlertCircle, Clock, Users } from "lucide-react";
import { Ticket, ClientName, TicketStatus } from "../types";
import { CLIENTS, STATUSES, STATUS_COLORS } from "../constants";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend,
  LineChart,
  Line
} from "recharts";
import { startOfMonth, endOfMonth, isWithinInterval, subMonths, format, eachDayOfInterval, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatFirestoreDate, getFirestoreDate } from "../utils/dateUtils";

interface ReportsViewProps {
  tickets: Ticket[];
  darkMode: boolean;
}

export default function ReportsView({ tickets, darkMode }: ReportsViewProps) {
  const [selectedClient, setSelectedClient] = useState<ClientName | "Todos">("Todos");
  const [selectedSla, setSelectedSla] = useState<string>("Todos");
  const [dateRange, setDateRange] = useState<"current" | "last" | "all">("all");

  const slaOptions = useMemo(() => {
    const slas = tickets.map(t => t.sla).filter(Boolean);
    return Array.from(new Set(slas)).sort();
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    let result = tickets;
    
    if (selectedClient !== "Todos") {
      result = result.filter(t => t.client === selectedClient);
    }

    if (selectedSla !== "Todos") {
      result = result.filter(t => t.sla === selectedSla);
    }

    if (dateRange !== "all") {
      const now = new Date();
      const start = dateRange === "current" ? startOfMonth(now) : startOfMonth(subMonths(now, 1));
      const end = dateRange === "current" ? endOfMonth(now) : endOfMonth(subMonths(now, 1));
      
      result = result.filter(t => {
        const date = getFirestoreDate(t.createdAt);
        if (!date) return false;
        return isWithinInterval(date, { start, end });
      });
    }

    return result;
  }, [tickets, selectedClient, dateRange]);

  const statusData = useMemo(() => {
    return STATUSES.map(status => ({
      name: status,
      value: filteredTickets.filter(t => t.status === status).length,
      color: STATUS_COLORS[status].replace('bg-', '').replace('-500', '')
    })).filter(d => d.value > 0);
  }, [filteredTickets]);

  const clientData = useMemo(() => {
    return CLIENTS.map(client => {
      const clientTickets = filteredTickets.filter(t => t.client === client);
      return {
        name: client,
        abertos: clientTickets.filter(t => t.status === "Aberto").length,
        resolvidos: clientTickets.filter(t => t.status === "Resolvido").length,
        total: clientTickets.length
      };
    }).filter(d => d.total > 0).sort((a, b) => b.total - a.total);
  }, [filteredTickets]);
  
  const timeData = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date;

    if (dateRange === "current") {
      start = startOfMonth(now);
      end = now;
    } else if (dateRange === "last") {
      start = startOfMonth(subMonths(now, 1));
      end = endOfMonth(subMonths(now, 1));
    } else {
      start = subDays(now, 30);
      end = now;
    }

    const days = eachDayOfInterval({ start, end });

    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const dayTickets = tickets.filter(t => {
        const date = getFirestoreDate(t.createdAt);
        return date && isWithinInterval(date, { start: dayStart, end: dayEnd });
      });

      return {
        date: format(day, "dd/MM"),
        abertos: dayTickets.filter(t => t.status === "Aberto").length,
        resolvidos: dayTickets.filter(t => t.status === "Resolvido").length,
      };
    });
  }, [tickets, dateRange]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="bg-blue-500 p-3 rounded-2xl">
            <BarChart3 className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Relatórios de Atendimento</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Análise de fluxo e performance de tickets.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group">
            <select 
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value as any)}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-sm font-bold text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none pr-10"
            >
              <option value="Todos">Todos os Clientes</option>
              {CLIENTS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          </div>

          <div className="relative group">
            <select 
              value={selectedSla}
              onChange={(e) => setSelectedSla(e.target.value)}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-sm font-bold text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none pr-10"
            >
              <option value="Todos">Todos os SLAs</option>
              {slaOptions.map(sla => <option key={sla} value={sla}>{sla}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          </div>

          <div className="relative group">
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-sm font-bold text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none pr-10"
            >
              <option value="all">Todo o Período</option>
              <option value="current">Mês Atual</option>
              <option value="last">Mês Passado</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          </div>

          <button className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors">
            <Download className="w-4 h-4" />
            Exportar PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard label="Total de Tickets" value={filteredTickets.length} icon={<BarChart3 />} color="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" />
        <StatCard label="Resolvidos" value={filteredTickets.filter(t => t.status === "Resolvido").length} icon={<CheckCircle2 />} color="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400" />
        <StatCard label="Em Aberto" value={filteredTickets.filter(t => t.status === "Aberto").length} icon={<AlertCircle />} color="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" />
        <StatCard label="Média de Resposta" value="2.4h" icon={<Clock />} color="bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-8">
          <Calendar className="w-4 h-4 text-blue-500" />
          <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Evolução de Chamados</h3>
        </div>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#3f3f46" : "#e4e4e7"} />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 600, fill: darkMode ? '#71717a' : '#a1a1aa' }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 600, fill: darkMode ? '#71717a' : '#a1a1aa' }}
              />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '12px', 
                  border: 'none', 
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  backgroundColor: darkMode ? '#18181b' : '#fff',
                  color: darkMode ? '#fff' : '#18181b'
                }}
                itemStyle={{ color: darkMode ? '#fff' : '#18181b' }}
              />
              <Legend verticalAlign="top" height={36} />
              <Line type="monotone" dataKey="abertos" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Abertos" />
              <Line type="monotone" dataKey="resolvidos" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Resolvidos" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-8">
            <PieChartIcon className="w-4 h-4 text-blue-500" />
            <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Distribuição por Status</h3>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    backgroundColor: darkMode ? '#18181b' : '#fff',
                    color: darkMode ? '#fff' : '#18181b'
                  }}
                  itemStyle={{ color: darkMode ? '#fff' : '#18181b' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-8">
            <Users className="w-4 h-4 text-blue-500" />
            <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Tickets por Cliente</h3>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clientData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#3f3f46" : "#e4e4e7"} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 600, fill: darkMode ? '#71717a' : '#a1a1aa' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 600, fill: darkMode ? '#71717a' : '#a1a1aa' }}
                />
                <Tooltip 
                  cursor={{ fill: darkMode ? '#27272a' : '#f4f4f5' }}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    backgroundColor: darkMode ? '#18181b' : '#fff',
                    color: darkMode ? '#fff' : '#18181b'
                  }}
                  itemStyle={{ color: darkMode ? '#fff' : '#18181b' }}
                />
                <Legend verticalAlign="top" height={36} />
                <Bar dataKey="abertos" fill="#ef4444" radius={[4, 4, 0, 0]} name="Abertos" />
                <Bar dataKey="resolvidos" fill="#10b981" radius={[4, 4, 0, 0]} name="Resolvidos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-8">
          <Filter className="w-4 h-4 text-blue-500" />
          <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Resumo de Atividades</h3>
        </div>
        <div className="space-y-4">
          {filteredTickets.slice(0, 5).map((ticket, i) => (
            <div key={ticket.id} className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 flex items-center justify-center border border-zinc-100 dark:border-zinc-800 shadow-sm">
                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500">#{ticket.id}</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{ticket.title}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{ticket.client} • {ticket.responsible || "Sem técnico"}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  {formatFirestoreDate(ticket.createdAt, "dd 'de' MMM")}
                </p>
                <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">{ticket.status}</p>
              </div>
            </div>
          ))}
          {filteredTickets.length === 0 && (
            <p className="text-center py-12 text-zinc-400 dark:text-zinc-600 font-medium italic">Nenhum dado para exibir no período selecionado.</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string, value: string | number, icon: React.ReactNode, color: string }) {
  return (
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col gap-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-3xl font-bold text-zinc-900 dark:text-white">{value}</p>
        <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-1">{label}</p>
      </div>
    </div>
  );
}
