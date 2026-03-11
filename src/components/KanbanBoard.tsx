import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { Ticket, TicketStatus } from "../types";
import { STATUSES, STATUS_COLORS, STATUS_TEXT_COLORS, STATUS_CARD_COLORS } from "../constants";
import { Clock, User as UserIcon, AlertCircle, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getFirestoreDate } from "../utils/dateUtils";
import { getTicketSlaStatus, getSlaProgress } from "../utils/slaUtils";

interface KanbanBoardProps {
  tickets: Ticket[];
  onTicketClick: (ticket: Ticket) => void;
  onStatusChange: (ticketId: string, updates: Partial<Ticket>) => void;
}

interface KanbanColumnProps {
  status: TicketStatus;
  tickets: Ticket[];
  onTicketClick: (ticket: Ticket) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, status: TicketStatus) => void;
  onDragStart: (e: React.DragEvent, ticketId: string) => void;
}

function KanbanColumn({ status, tickets, onTicketClick, onDragOver, onDrop, onDragStart }: KanbanColumnProps) {
  const [visibleCount, setVisibleCount] = useState(15);
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
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + 15, tickets.length));
      setIsLoadingMore(false);
    }, 300);
  };

  // Reset visible count when tickets change
  useEffect(() => {
    setVisibleCount(15);
  }, [tickets.length]);

  return (
    <div 
      className="flex-shrink-0 w-72 md:w-80 flex flex-col gap-4"
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, status)}
    >
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[status]}`} />
          <h3 className="font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider text-[10px] md:text-xs">{status}</h3>
          <span className="bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-full text-[10px] font-bold">
            {tickets.length}
          </span>
        </div>
      </div>

      <div className="flex-1 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-2xl p-3 space-y-3 overflow-y-auto border border-zinc-200/50 dark:border-zinc-800/50 min-h-[200px] scrollbar-hide">
        {visibleTickets.map((ticket) => {
          const slaStatus = getTicketSlaStatus(ticket);
          const slaProgress = getSlaProgress(ticket);
          const isExpired = slaStatus === "expired";
          const isApproaching = slaStatus === "approaching";

          return (
            <motion.div
              key={ticket.id}
              layoutId={ticket.id}
              draggable
              onDragStart={(e) => onDragStart(e as unknown as React.DragEvent, ticket.id)}
              onClick={() => onTicketClick(ticket)}
              className={`p-4 rounded-xl shadow-sm border cursor-grab active:cursor-grabbing hover:shadow-md transition-all group bg-white dark:bg-zinc-900 ${
                isExpired 
                  ? "border-red-500 ring-1 ring-red-500/50" 
                  : isApproaching 
                    ? "border-yellow-500" 
                    : "border-zinc-200 dark:border-zinc-700"
              } ${STATUS_CARD_COLORS[ticket.status]}`}
            >
              <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-3">
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">#{ticket.id.substring(0, 8)}</span>
                  {isExpired && <AlertCircle className="w-3 h-3 text-red-500 animate-pulse" />}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 justify-end">
                  <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${STATUS_TEXT_COLORS[ticket.status]} bg-white/50 dark:bg-zinc-900/50 whitespace-nowrap`}>
                    {ticket.client}
                  </div>
                </div>
              </div>
              
              <h4 className="font-semibold text-zinc-900 dark:text-white mb-3 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {ticket.title}
              </h4>

              <div className="flex items-center justify-between mt-auto pt-3 border-t border-zinc-50 dark:border-zinc-700/50">
                <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500">
                  <UserIcon className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium truncate max-w-[100px]">
                    {ticket.responsible || "Sem resp."}
                  </span>
                </div>
                
                <div className="flex items-center gap-1 text-zinc-400 dark:text-zinc-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-medium">
                    {(() => {
                      const date = getFirestoreDate(ticket.createdAt);
                      return date ? formatDistanceToNow(date, { addSuffix: true, locale: ptBR }) : "";
                    })()}
                  </span>
                </div>
              </div>

              {ticket.sla && (
                <div className="mt-2 flex items-center gap-1.5">
                  <div className="w-full bg-zinc-100 dark:bg-zinc-700 h-1 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        isExpired ? "bg-red-500" : isApproaching ? "bg-yellow-500" : "bg-blue-500"
                      }`} 
                      style={{ width: `${slaProgress}%` }} 
                    />
                  </div>
                  <span className={`text-[10px] font-bold whitespace-nowrap ${
                    isExpired ? "text-red-500" : isApproaching ? "text-yellow-500" : "text-blue-600 dark:text-blue-400"
                  }`}>
                    {ticket.sla}
                  </span>
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Observer Target */}
        <div ref={observerTarget} className="h-4 flex items-center justify-center">
          {isLoadingMore && (
            <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
          )}
        </div>
        
        {tickets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-400 dark:text-zinc-600 opacity-50">
            <AlertCircle className="w-8 h-8 mb-2 stroke-1" />
            <p className="text-xs font-medium">Nenhum ticket</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard({ tickets, onTicketClick, onStatusChange }: KanbanBoardProps) {
  const getTicketsByStatus = (status: TicketStatus) => {
    return tickets.filter(t => t.status === status);
  };

  const handleDragStart = (e: React.DragEvent, ticketId: string) => {
    e.dataTransfer.setData("ticketId", ticketId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, newStatus: TicketStatus) => {
    e.preventDefault();
    const ticketId = e.dataTransfer.getData("ticketId");
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket && ticket.status !== newStatus) {
      onStatusChange(ticketId, { status: newStatus });
    }
  };

  return (
    <div className="flex gap-4 md:gap-6 overflow-x-auto pb-6 h-full min-h-[600px] scrollbar-hide">
      {STATUSES.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          tickets={getTicketsByStatus(status)}
          onTicketClick={onTicketClick}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragStart={handleDragStart}
        />
      ))}
    </div>
  );
}
