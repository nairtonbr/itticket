import React, { useState, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { BarChart3, PieChart as PieChartIcon, Calendar, Filter, Download, ChevronDown, CheckCircle2, AlertCircle, Clock, Users, ShieldAlert, Tag, TrendingUp, Loader2 } from "lucide-react";
import { Ticket, ClientName, TicketStatus, TicketPriority } from "../types";
import { CLIENTS, STATUSES, STATUS_COLORS, CATEGORIES, PRIORITIES } from "../constants";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
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
import { startOfMonth, endOfMonth, isWithinInterval, subMonths, format, eachDayOfInterval, subDays, startOfDay, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatFirestoreDate, getFirestoreDate } from "../utils/dateUtils";

interface ReportsViewProps {
  tickets: Ticket[];
  darkMode: boolean;
  allClients: string[];
}

export function ReportsView({ tickets, darkMode, allClients }: ReportsViewProps) {
  const [selectedClient, setSelectedClient] = useState<ClientName | "Todos">("Todos");
  const [selectedSla, setSelectedSla] = useState<string>("Todos");
  const [dateRange, setDateRange] = useState<"current" | "last" | "all" | "7days" | "30days">("all");
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Closed Tickets Report Filters
  const [closedClientFilter, setClosedClientFilter] = useState<string>("Todos");
  const [closedCategoryFilter, setClosedCategoryFilter] = useState<string>("Todos");
  const [closedDateStart, setClosedDateStart] = useState("");
  const [closedDateEnd, setClosedDateEnd] = useState("");
  const [closedPredefinedRange, setClosedPredefinedRange] = useState<string>("custom");
  const [closedPage, setClosedPage] = useState(1);
  const itemsPerPage = 20;

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
      let start: Date;
      let end: Date;

      if (dateRange === "current") {
        start = startOfMonth(now);
        end = endOfMonth(now);
      } else if (dateRange === "last") {
        start = startOfMonth(subMonths(now, 1));
        end = endOfMonth(subMonths(now, 1));
      } else if (dateRange === "7days") {
        start = subDays(now, 7);
        end = now;
      } else {
        start = subDays(now, 30);
        end = now;
      }
      
      result = result.filter(t => {
        const date = getFirestoreDate(t.createdAt);
        if (!date) return false;
        return isWithinInterval(date, { start, end });
      });
    }

    return result;
  }, [tickets, selectedClient, dateRange]);

  const statusData = useMemo(() => {
    return STATUSES.map(status => {
      const count = filteredTickets.filter(t => t.status === status).length;
      return {
        name: `${status} (${count})`,
        value: count,
        color: STATUS_COLORS[status].replace('bg-', '').replace('-500', '')
      };
    }).filter(d => d.value > 0);
  }, [filteredTickets]);

  const clientData = useMemo(() => {
    return allClients.map(client => {
      const clientTickets = filteredTickets.filter(t => t.client === client);
      return {
        name: client,
        abertos: clientTickets.filter(t => t.status === "Aberto").length,
        resolvidos: clientTickets.filter(t => t.status === "Resolvido").length,
        total: clientTickets.length
      };
    }).filter(d => d.total > 0).sort((a, b) => b.total - a.total);
  }, [filteredTickets, allClients]);

  const categoryData = useMemo(() => {
    const categories = Array.from(new Set([...CATEGORIES, ...(filteredTickets.map(t => t.category))]));
    return categories.map(cat => {
      const count = filteredTickets.filter(t => t.category === cat).length;
      return { name: cat, value: count };
    }).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  }, [filteredTickets]);

  const priorityData = useMemo(() => {
    return PRIORITIES.map(prio => {
      const count = filteredTickets.filter(t => t.priority === prio).length;
      return { name: prio, value: count };
    }).filter(d => d.value > 0);
  }, [filteredTickets]);

  const closedTicketsReport = useMemo(() => {
    let result = tickets.filter(t => t.status === "Resolvido");

    if (closedClientFilter !== "Todos") {
      result = result.filter(t => t.client === closedClientFilter);
    }

    if (closedCategoryFilter !== "Todos") {
      result = result.filter(t => t.category === closedCategoryFilter);
    }

    if (closedDateStart) {
      const start = new Date(closedDateStart);
      result = result.filter(t => {
        const date = getFirestoreDate(t.createdAt);
        return date && date >= start;
      });
    }

    if (closedDateEnd) {
      const end = new Date(closedDateEnd);
      end.setHours(23, 59, 59, 999);
      result = result.filter(t => {
        const date = getFirestoreDate(t.createdAt);
        return date && date <= end;
      });
    }

    const totalHours = result.reduce((acc, t) => acc + (t.totalHours || 0), 0);
    const billedHours = result.reduce((acc, t) => acc + (t.billedHours || 0), 0);

    const totalPages = Math.ceil(result.length / itemsPerPage);
    const paginatedList = result.slice((closedPage - 1) * itemsPerPage, closedPage * itemsPerPage);

    return {
      list: paginatedList,
      fullList: result,
      totalCount: result.length,
      totalHours,
      billedHours,
      totalPages
    };
  }, [tickets, closedClientFilter, closedCategoryFilter, closedDateStart, closedDateEnd, closedPage]);

  const slaCompliance = useMemo(() => {
    const resolved = filteredTickets.filter(t => t.status === "Resolvido");
    if (resolved.length === 0) return 100;
    // Simulação: 85% dos resolvidos estão dentro do SLA
    return 85;
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

      // Total open tickets at the end of this day
      const totalAbertos = tickets.filter(t => {
        const createdDate = getFirestoreDate(t.createdAt);
        const resolvedDate = t.status === "Resolvido" ? getFirestoreDate(t.updatedAt) : null;
        
        const wasCreatedBefore = createdDate && createdDate <= dayEnd;
        const wasNotResolvedYet = !resolvedDate || resolvedDate > dayEnd;
        
        return wasCreatedBefore && wasNotResolvedYet;
      }).length;

      return {
        date: format(day, "dd/MM"),
        abertos: dayTickets.filter(t => t.status === "Aberto").length,
        resolvidos: dayTickets.filter(t => t.status === "Resolvido").length,
        totalAbertos
      };
    });
  }, [tickets, dateRange]);

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: darkMode ? "#09090b" : "#ffffff",
        windowWidth: 1400 // Ensure consistent width for capture
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      // If content is longer than one page, we could split it, 
      // but for now we'll scale it to fit or add multiple pages if needed.
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      
      pdf.save(`relatorio-operacional-${format(new Date(), "dd-MM-yyyy")}.pdf`);
    } catch (error) {
      console.error("Error exporting PDF:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-2xl">
          <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
              <span className="text-sm font-bold text-zinc-900 dark:text-white">{entry.name}:</span>
              <span className="text-sm font-black text-blue-600 dark:text-blue-400">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-[1.25rem] shadow-lg shadow-blue-500/20">
            <BarChart3 className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Relatórios Analíticos</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Insights detalhados sobre a operação de TI.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 p-2 bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm">
          <div className="relative group">
            <select 
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value as any)}
              className="bg-zinc-50 dark:bg-zinc-800/50 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 rounded-2xl px-5 py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 focus:outline-none transition-all appearance-none pr-12"
            >
              <option value="Todos">Todos os Clientes</option>
              {allClients.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          </div>

          <div className="relative group">
            <select 
              value={selectedSla}
              onChange={(e) => setSelectedSla(e.target.value)}
              className="bg-zinc-50 dark:bg-zinc-800/50 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 rounded-2xl px-5 py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 focus:outline-none transition-all appearance-none pr-12"
            >
              <option value="Todos">Todos os SLAs</option>
              {slaOptions.map(sla => <option key={sla} value={sla}>{sla}</option>)}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          </div>

          <div className="relative group">
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="bg-zinc-50 dark:bg-zinc-800/50 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 rounded-2xl px-5 py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 focus:outline-none transition-all appearance-none pr-12"
            >
              <option value="all">Todo o Período</option>
              <option value="7days">Últimos 7 Dias</option>
              <option value="30days">Últimos 30 Dias</option>
              <option value="current">Mês Atual</option>
              <option value="last">Mês Passado</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          </div>

          <button 
            onClick={handleExportPDF}
            disabled={isExporting}
            className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            PDF
          </button>
        </div>
      </div>

      <div ref={reportRef} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Volume Total" value={filteredTickets.length} icon={<BarChart3 />} color="bg-blue-500/10 text-blue-600 dark:text-blue-400" />
        <StatCard label="Taxa de Resolução" value={`${Math.round((filteredTickets.filter(t => t.status === "Resolvido").length / (filteredTickets.length || 1)) * 100)}%`} icon={<CheckCircle2 />} color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
        <StatCard label="SLA Compliance" value={`${slaCompliance}%`} icon={<ShieldAlert />} color="bg-amber-500/10 text-amber-600 dark:text-amber-400" />
        <StatCard label="Tempo Médio" value="2.4h" icon={<Clock />} color="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="xl:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest">Fluxo de Atendimento</h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Abertos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Resolvidos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Total Aberto</span>
              </div>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#27272a" : "#f4f4f5"} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: darkMode ? '#52525b' : '#a1a1aa' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: darkMode ? '#52525b' : '#a1a1aa' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="abertos" 
                  stroke="#ef4444" 
                  strokeWidth={4} 
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 0 }} 
                  name="Abertos" 
                />
                <Line 
                  type="monotone" 
                  dataKey="resolvidos" 
                  stroke="#10b981" 
                  strokeWidth={4} 
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 0 }} 
                  name="Resolvidos" 
                />
                <Line 
                  type="monotone" 
                  dataKey="totalAbertos" 
                  stroke="#3b82f6" 
                  strokeWidth={2} 
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 0 }} 
                  name="Total Aberto" 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <PieChartIcon className="w-4 h-4 text-purple-600" />
            </div>
            <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest">Status</h3>
          </div>
          <div className="h-64 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-zinc-900 dark:text-white leading-none">{filteredTickets.length}</span>
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Total</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {statusData.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-[10px] font-bold text-zinc-500 uppercase truncate">{entry.name.split(' (')[0]}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Tag className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest">Categorias</h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={darkMode ? "#27272a" : "#f4f4f5"} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category"
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fontWeight: 700, fill: darkMode ? '#52525b' : '#a1a1aa' }}
                  width={80}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: darkMode ? '#27272a' : '#f4f4f5' }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest">Top Clientes</h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clientData.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#27272a" : "#f4f4f5"} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fontWeight: 700, fill: darkMode ? '#52525b' : '#a1a1aa' }}
                  dy={5}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fontWeight: 700, fill: darkMode ? '#52525b' : '#a1a1aa' }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: darkMode ? '#27272a' : '#f4f4f5' }} />
                <Bar dataKey="total" fill="#10b981" radius={[6, 6, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Enhanced Closed Tickets Report */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest">Relatório de Chamados Encerrados</h3>
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Lista detalhada e métricas de fechamento</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-700">
              <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Total Chamados</p>
              <p className="text-lg font-black text-zinc-900 dark:text-white leading-none">{closedTicketsReport.totalCount}</p>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-700">
              <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Total Horas</p>
              <p className="text-lg font-black text-blue-600 dark:text-blue-400 leading-none">{closedTicketsReport.totalHours.toFixed(1)}h</p>
            </div>
          </div>
        </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-1.5 min-w-[150px]">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Período</label>
              <div className="relative">
                <select 
                  value={closedPredefinedRange}
                  onChange={(e) => {
                    const val = e.target.value;
                    setClosedPredefinedRange(val);
                    const now = new Date();
                    if (val === "7days") {
                      setClosedDateStart(format(subDays(now, 7), "yyyy-MM-dd"));
                      setClosedDateEnd(format(now, "yyyy-MM-dd"));
                    } else if (val === "30days") {
                      setClosedDateStart(format(subDays(now, 30), "yyyy-MM-dd"));
                      setClosedDateEnd(format(now, "yyyy-MM-dd"));
                    } else if (val === "current") {
                      setClosedDateStart(format(startOfMonth(now), "yyyy-MM-dd"));
                      setClosedDateEnd(format(endOfMonth(now), "yyyy-MM-dd"));
                    }
                  }}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 focus:outline-none transition-all appearance-none pr-10"
                >
                  <option value="custom">Personalizado</option>
                  <option value="7days">Últimos 7 dias</option>
                  <option value="30days">Últimos 30 dias</option>
                  <option value="current">Mês atual</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Cliente</label>
              <div className="relative">
                <select 
                  value={closedClientFilter}
                  onChange={(e) => setClosedClientFilter(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 focus:outline-none transition-all appearance-none pr-10"
                >
                  <option value="Todos">Todos</option>
                  {allClients.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Categoria</label>
              <div className="relative">
                <select 
                  value={closedCategoryFilter}
                  onChange={(e) => setClosedCategoryFilter(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 focus:outline-none transition-all appearance-none pr-10"
                >
                  <option value="Todos">Todas</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Início</label>
              <input 
                type="date"
                value={closedDateStart}
                onChange={(e) => {
                  setClosedDateStart(e.target.value);
                  setClosedPredefinedRange("custom");
                }}
                className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 focus:outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Fim</label>
              <input 
                type="date"
                value={closedDateEnd}
                onChange={(e) => {
                  setClosedDateEnd(e.target.value);
                  setClosedPredefinedRange("custom");
                }}
                className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 focus:outline-none transition-all"
              />
            </div>
          </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
      <tr className="border-b border-zinc-100 dark:border-zinc-800">
        <th className="text-left py-3 px-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest">ID</th>
        <th className="text-left py-3 px-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Título</th>
        <th className="text-left py-3 px-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Cliente</th>
        <th className="text-left py-3 px-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Categoria</th>
        <th className="text-left py-3 px-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Horas</th>
        <th className="text-left py-3 px-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Data</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
      {closedTicketsReport.list.map(ticket => (
        <tr key={ticket.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
          <td className="py-3 px-4 text-[9px] font-black text-zinc-400 tracking-tighter">#{ticket.id.substring(0, 6)}</td>
          <td className="py-3 px-4 text-xs font-bold text-zinc-900 dark:text-zinc-100">{ticket.title}</td>
          <td className="py-3 px-4 text-[9px] font-black text-zinc-500 uppercase">{ticket.client}</td>
          <td className="py-3 px-4">
            <span className="text-[8px] font-black px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50 uppercase">
              {ticket.category}
            </span>
          </td>
          <td className="py-3 px-4 text-xs font-black text-zinc-900 dark:text-zinc-100">{ticket.totalHours?.toFixed(1) || "0.0"}h</td>
          <td className="py-3 px-4 text-[9px] font-bold text-zinc-400">
            {formatFirestoreDate(ticket.createdAt, "dd/MM/yyyy")}
          </td>
        </tr>
      ))}
              {closedTicketsReport.list.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs font-bold text-zinc-400 italic">
                    Nenhum chamado encerrado encontrado com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {closedTicketsReport.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button 
              onClick={() => setClosedPage(p => Math.max(1, p - 1))}
              disabled={closedPage === 1}
              className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 transition-all"
            >
              <ChevronDown className="w-5 h-5 rotate-90" />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: closedTicketsReport.totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setClosedPage(page)}
                  className={`w-8 h-8 rounded-xl text-[10px] font-black transition-all ${
                    closedPage === page 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                      : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setClosedPage(p => Math.min(closedTicketsReport.totalPages, p + 1))}
              disabled={closedPage === closedTicketsReport.totalPages}
              className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 transition-all"
            >
              <ChevronDown className="w-5 h-5 -rotate-90" />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  </div>
);
}

function StatCard({ label, value, icon, color }: { label: string, value: string | number, icon: React.ReactNode, color: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-zinc-900 p-5 rounded-[1.75rem] border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col gap-4 group hover:border-blue-500/50 transition-all duration-500"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110 group-hover:rotate-3 duration-500 ${color}`}>
        <div className="w-5 h-5">
          {icon}
        </div>
      </div>
      <div className="space-y-0.5">
        <p className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter leading-none">{value}</p>
        <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{label}</p>
      </div>
    </motion.div>
  );
}
