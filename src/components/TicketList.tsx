import React, { useState, useEffect, useRef, useMemo } from "react";
import { Ticket, AppSettings } from "../types";
import { STATUS_COLORS, STATUS_TEXT_COLORS, STATUS_DESCRIPTIONS } from "../constants";
import { User as UserIcon, ChevronRight, MoreHorizontal, Loader2, MessageSquare, Paperclip, AlertCircle, Star } from "lucide-react";
import { formatFirestoreDate } from "../utils/dateUtils";
import { getTicketSlaStatus, formatSlaDisplay } from "../utils/slaUtils";

interface TicketListProps {
  tickets: Ticket[];
  onTicketClick: (ticket: Ticket) => void;
  settings: AppSettings;
}

export default function TicketList({ tickets, onTicketClick, settings }: TicketListProps) {
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
            <div className="w-[120px] px-6 py-4 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest shrink-0">Criado em</div>
            <div className="w-[50px] px-6 py-4 shrink-0"></div>
          </div>

          {/* List */}
          <div className="divide-y divide-zinc-100/50 dark:divide-zinc-800/50">
            {tickets.map((ticket) => {
              return (
                <div 
                  key={ticket.id}
                  onClick={() => onTicketClick(ticket)}
                  className={`flex items-center group hover:bg-blue-50/30 dark:hover:bg-blue-900/10 cursor-pointer transition-all duration-200 h-[80px] relative overflow-hidden border-l-4 border-l-transparent ${ticket.isImportant ? "ring-1 ring-inset ring-yellow-500/50 bg-yellow-50/20 dark:bg-yellow-900/10" : ""}`}
                >
                  {ticket.isImportant && (
                    <div className="absolute right-0 top-0 w-8 h-8 flex items-center justify-center">
                      <Star className="w-3 h-3 text-yellow-500 fill-current" />
                    </div>
                  )}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-top" />
                  
                  <div className="w-[120px] px-6 py-4 shrink-0 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black font-mono tracking-tighter text-zinc-400 dark:text-zinc-500" title={ticket.id}>
                        #{ticket.id}
                      </span>
                      
                      <div className="flex items-center gap-1">
                        {ticket.updates && ticket.updates.length > 0 && (
                          <MessageSquare className="w-3 h-3 text-zinc-400" />
                        )}
                        {ticket.attachments && ticket.attachments.length > 0 && (
                          <Paperclip className="w-3 h-3 text-zinc-400" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 px-6 py-4 overflow-hidden">
                    <div className="max-w-md">
                      <p className="font-bold text-sm truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight text-zinc-900 dark:text-zinc-100">
                        {ticket.title}
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-500 line-clamp-1 mt-0.5 font-medium">
                        {ticket.description}
                      </p>
                    </div>
                  </div>

                  <div className="w-[150px] px-6 py-4 shrink-0 overflow-hidden">
                    <span className="text-xs font-black text-zinc-700 dark:text-zinc-300 truncate block uppercase tracking-tight">
                      {ticket.client}
                    </span>
                  </div>

                  <div className="w-[150px] px-6 py-4 shrink-0" title={STATUS_DESCRIPTIONS[ticket.status]}>
                    <div className="flex items-center gap-2">
                      <div 
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${!settings.statusColors?.[ticket.status] ? STATUS_COLORS[ticket.status] : ""}`} 
                        style={settings.statusColors?.[ticket.status] ? { backgroundColor: settings.statusColors[ticket.status] } : {}}
                      />
                      <span 
                        className={`text-[10px] font-black uppercase tracking-widest truncate ${!settings.statusColors?.[ticket.status] ? STATUS_TEXT_COLORS[ticket.status] : ""}`}
                        style={settings.statusColors?.[ticket.status] ? { color: settings.statusColors[ticket.status] } : {}}
                      >
                        {ticket.status}
                      </span>
                    </div>
                  </div>

                  <div className="w-[120px] px-6 py-4 shrink-0">
                    {ticket.priority ? (
                      <span className="inline-block text-[9px] font-black px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700 whitespace-nowrap uppercase tracking-widest">
                        {ticket.priority}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400 dark:text-zinc-600">-</span>
                    )}
                  </div>

                  <div className="w-[150px] px-6 py-4 shrink-0">
                    {ticket.category ? (
                      <span className="inline-block text-[9px] font-black px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50 whitespace-nowrap uppercase tracking-widest">
                        {ticket.category}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400 dark:text-zinc-600">-</span>
                    )}
                  </div>

                  <div className="w-[180px] px-6 py-4 shrink-0 overflow-hidden">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700">
                        <UserIcon className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                      </div>
                      <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 truncate">
                        {ticket.responsible || "Não atribuído"}
                      </span>
                    </div>
                  </div>

                  <div className="w-[120px] px-6 py-4 shrink-0">
                    <div className="flex flex-col">
                      <span className="text-xs font-black font-mono text-zinc-700 dark:text-zinc-300">
                        {formatFirestoreDate(ticket.createdAt, "dd/MM/yyyy")}
                      </span>
                      <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 tracking-tighter">
                        {formatFirestoreDate(ticket.createdAt, "HH:mm")}
                      </span>
                    </div>
                  </div>

                  <div className="w-[50px] px-6 py-4 shrink-0 text-right">
                    <ChevronRight className="w-5 h-5 text-zinc-300 dark:text-zinc-600 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-300 inline-block" />
                  </div>
                </div>
              );
            })}

          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-6 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-800/30 flex justify-between items-center shrink-0">
        <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
          Mostrando {tickets.length} tickets nesta página
        </p>
      </div>
    </div>
  );
}
