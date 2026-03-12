import React, { useState, useEffect, useRef, useMemo } from "react";
import { Ticket } from "../types";
import { STATUS_COLORS, STATUS_TEXT_COLORS } from "../constants";
import { User as UserIcon, ChevronRight, MoreHorizontal, Loader2 } from "lucide-react";
import { formatFirestoreDate } from "../utils/dateUtils";
import { getTicketSlaStatus } from "../utils/slaUtils";

interface TicketListProps {
  tickets: Ticket[];
  onTicketClick: (ticket: Ticket) => void;
}

export default function TicketList({ tickets, onTicketClick }: TicketListProps) {
  const [visibleCount, setVisibleCount] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  const visibleTickets = useMemo(() => {
    return tickets.slice(0, visibleCount);
  }, [tickets, visibleCount]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < tickets.length && !isLoadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [visibleCount, tickets.length, isLoadingMore]);

  const loadMore = () => {
    setIsLoadingMore(true);
    // Simulate a small delay for smoother UX
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + 20, tickets.length));
      setIsLoadingMore(false);
    }, 300);
  };

  // Reset visible count when tickets change (e.g. filter applied)
  useEffect(() => {
    setVisibleCount(20);
  }, [tickets.length]);

  if (tickets.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden h-full flex flex-col items-center justify-center py-20 text-zinc-400">
        <MoreHorizontal className="w-12 h-12 mb-4 stroke-1 opacity-20" />
        <p className="text-sm font-medium">Nenhum ticket encontrado</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden h-full flex flex-col">
      <div className="flex-1 overflow-auto scrollbar-hide">
        <div className="min-w-[1200px]">
          {/* Header */}
          <div className="flex items-center bg-zinc-50/50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800 sticky top-0 z-20">
            <div className="w-[120px] px-6 py-4 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest shrink-0">ID</div>
            <div className="flex-1 px-6 py-4 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Título</div>
            <div className="w-[150px] px-6 py-4 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest shrink-0">Cliente</div>
            <div className="w-[150px] px-6 py-4 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest shrink-0">Status</div>
            <div className="w-[120px] px-6 py-4 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest shrink-0">Prioridade</div>
            <div className="w-[150px] px-6 py-4 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest shrink-0">Categoria</div>
            <div className="w-[180px] px-6 py-4 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest shrink-0">Responsável</div>
            <div className="w-[100px] px-6 py-4 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest shrink-0">SLA</div>
            <div className="w-[120px] px-6 py-4 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest shrink-0">Criado em</div>
            <div className="w-[50px] px-6 py-4 shrink-0"></div>
          </div>

          {/* Infinite List */}
          <div className="divide-y divide-zinc-50 dark:divide-zinc-800">
            {visibleTickets.map((ticket) => {
              const slaStatus = getTicketSlaStatus(ticket);
              const isExpired = slaStatus === "expired";
              const isApproaching = slaStatus === "approaching";

              return (
                <div 
                  key={ticket.id}
                  onClick={() => onTicketClick(ticket)}
                  className={`flex items-center group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors h-[72px] ${
                    isExpired ? "bg-red-50/50 dark:bg-red-900/10" : isApproaching ? "bg-yellow-50/50 dark:bg-yellow-900/10" : ""
                  }`}
                >
                  <div className="w-[120px] px-6 py-4 shrink-0 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 truncate" title={ticket.id}>
                        #{ticket.id.substring(0, 8)}...
                      </span>
                      {isExpired && <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                    </div>
                  </div>
                  <div className="flex-1 px-6 py-4 overflow-hidden">
                    <div className="max-w-md">
                      <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {ticket.title}
                      </p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate">
                        {ticket.description}
                      </p>
                    </div>
                  </div>
                  <div className="w-[150px] px-6 py-4 shrink-0 overflow-hidden">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate block">
                      {ticket.client}
                    </span>
                  </div>
                  <div className="w-[150px] px-6 py-4 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_COLORS[ticket.status]}`} />
                      <span className={`text-[10px] font-semibold uppercase tracking-wider truncate ${STATUS_TEXT_COLORS[ticket.status]}`}>
                        {ticket.status}
                      </span>
                    </div>
                  </div>
                  <div className="w-[120px] px-6 py-4 shrink-0">
                    {ticket.priority ? (
                      <span className="inline-block text-[10px] font-bold px-2 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-zinc-500 border border-zinc-100 dark:border-zinc-700 whitespace-nowrap uppercase tracking-wider">
                        {ticket.priority}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400 dark:text-zinc-600">-</span>
                    )}
                  </div>
                  <div className="w-[150px] px-6 py-4 shrink-0">
                    {ticket.category ? (
                      <span className="inline-block text-[10px] font-bold px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 whitespace-nowrap uppercase tracking-wider">
                        {ticket.category}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400 dark:text-zinc-600">-</span>
                    )}
                  </div>
                  <div className="w-[180px] px-6 py-4 shrink-0 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                        <UserIcon className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                      </div>
                      <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400 truncate">
                        {ticket.responsible || "-"}
                      </span>
                    </div>
                  </div>
                  <div className="w-[100px] px-6 py-4 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                      isExpired 
                        ? "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30" 
                        : isApproaching
                          ? "text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30"
                          : "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                    }`}>
                      {ticket.sla || "-"}
                    </span>
                  </div>
                  <div className="w-[120px] px-6 py-4 shrink-0">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        {formatFirestoreDate(ticket.createdAt, "dd/MM/yyyy")}
                      </span>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        {formatFirestoreDate(ticket.createdAt, "HH:mm")}
                      </span>
                    </div>
                  </div>
                  <div className="w-[50px] px-6 py-4 shrink-0 text-right">
                    <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600 group-hover:text-blue-400 transition-colors inline-block" />
                  </div>
                </div>
              );
            })}

            {/* Observer Target for Infinite Scroll */}
            <div ref={observerTarget} className="h-10 flex items-center justify-center">
              {isLoadingMore && (
                <div className="flex items-center gap-2 text-zinc-400 text-[10px] font-bold uppercase tracking-widest">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Carregando mais...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-6 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-800/30 flex justify-between items-center shrink-0">
        <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
          Mostrando {visibleTickets.length} de {tickets.length} tickets
        </p>
        <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
          Paginação Infinita
        </p>
      </div>
    </div>
  );
}
