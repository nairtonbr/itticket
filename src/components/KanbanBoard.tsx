import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { Ticket, TicketStatus } from "../types";
import { STATUSES, STATUS_COLORS, STATUS_TEXT_COLORS, STATUS_CARD_COLORS } from "../constants";
import { Clock, User as UserIcon, AlertCircle, Loader2, MessageSquare, Paperclip } from "lucide-react";
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
  return (
    <div 
      className="flex-1 min-w-[280px] md:min-w-[320px] flex flex-col gap-4"
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

      <div className="flex-1 bg-zinc-100/30 dark:bg-zinc-900/30 rounded-[2rem] p-4 space-y-4 overflow-y-auto border border-zinc-200/50 dark:border-zinc-800/50 min-h-[400px] custom-scrollbar">
        {tickets.map((ticket) => {
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
              className={`p-5 rounded-2xl shadow-sm border cursor-grab active:cursor-grabbing hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group bg-white dark:bg-zinc-900 ${
                isExpired 
                  ? "border-red-500/50 ring-1 ring-red-500/20" 
                  : isApproaching 
                    ? "border-yellow-500/50" 
                    : "border-zinc-200 dark:border-zinc-800"
              }`}
            >
              <div className="flex justify-between items-start gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-tighter">#{ticket.id}</span>
                  <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                    {ticket.client}
                  </span>
                  {isExpired && <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 justify-end">
                  {ticket.category && (
                    <div className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50">
                      {ticket.category}
                    </div>
                  )}
                  {ticket.priority && (
                    <div className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700">
                      {ticket.priority}
                    </div>
                  )}
                </div>
              </div>
              
              <h4 className="font-bold text-zinc-900 dark:text-white mb-1 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
                {ticket.title}
              </h4>

              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-4 font-medium">
                {ticket.description}
              </p>

              <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-50 dark:border-zinc-800/50">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                    <UserIcon className="w-3 h-3 text-zinc-400" />
                  </div>
                  <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 truncate max-w-[80px]">
                    {ticket.responsible?.split(' ')[0] || "N/A"}
                  </span>
                  
                  <div className="flex items-center gap-1 ml-1">
                    {ticket.updates && ticket.updates.length > 0 && (
                      <MessageSquare className="w-3 h-3 text-zinc-400" />
                    )}
                    {ticket.attachments && ticket.attachments.length > 0 && (
                      <Paperclip className="w-3 h-3 text-zinc-400" />
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-1 text-zinc-400 dark:text-zinc-500">
                  <Clock className="w-3 h-3" />
                  <span className="text-[9px] font-bold uppercase tracking-tighter">
                    {(() => {
                      const date = getFirestoreDate(ticket.createdAt);
                      return date ? formatDistanceToNow(date, { addSuffix: true, locale: ptBR }) : "";
                    })()}
                  </span>
                </div>
              </div>

              {ticket.sla && (
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
                    <span className={isExpired ? "text-red-500" : "text-zinc-400"}>SLA</span>
                    <span className={isExpired ? "text-red-500" : "text-blue-600 dark:text-blue-400"}>{ticket.sla}</span>
                  </div>
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${slaProgress}%` }}
                      className={`h-full transition-all duration-1000 ${
                        isExpired ? "bg-red-500" : isApproaching ? "bg-yellow-500" : "bg-blue-500"
                      }`} 
                    />
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
        
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
    <div className="flex gap-4 md:gap-6 overflow-x-auto pb-6 h-full min-h-[600px] custom-scrollbar w-full">
      <div className="flex gap-4 md:gap-6 px-2 w-full">
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
    </div>
  );
}
