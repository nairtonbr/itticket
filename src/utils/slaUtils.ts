import { Ticket } from "../types";

export type SlaStatus = "normal" | "approaching" | "expired";

export const parseSlaToMs = (sla: string): number => {
  if (!sla) return 0;
  
  const lowerSla = sla.toLowerCase().trim();
  
  // Handle common formats
  let totalMs = 0;
  let found = false;

  const daysMatch = lowerSla.match(/(\d+)\s*d/);
  if (daysMatch) {
    totalMs += parseInt(daysMatch[1]) * 24 * 60 * 60 * 1000;
    found = true;
  }

  const hoursMatch = lowerSla.match(/(\d+)\s*h/);
  if (hoursMatch) {
    totalMs += parseInt(hoursMatch[1]) * 60 * 60 * 1000;
    found = true;
  }
  
  const minutesMatch = lowerSla.match(/(\d+)\s*m/);
  if (minutesMatch) {
    totalMs += parseInt(minutesMatch[1]) * 60 * 1000;
    found = true;
  }

  if (found) return totalMs;

  // Special cases
  if (lowerSla === 'urgente') return 1 * 60 * 60 * 1000; // 1 hour
  if (lowerSla === 'alta') return 4 * 60 * 60 * 1000; // 4 hours
  if (lowerSla === 'média') return 24 * 60 * 60 * 1000; // 24 hours
  if (lowerSla === 'baixa') return 48 * 60 * 60 * 1000; // 48 hours

  // Fallback: if it's just a number, treat as hours
  const numericSla = parseInt(lowerSla);
  if (!isNaN(numericSla)) return numericSla * 60 * 60 * 1000;

  return 0;
};

export const formatSlaDisplay = (sla: string): string => {
  if (!sla) return "-";
  
  const isDateString = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(sla);
  if (isDateString) {
    try {
      const date = new Date(sla);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${day}/${month} ${hours}:${minutes}`;
    } catch (e) {
      return sla;
    }
  }
  
  return sla;
};

export const getTicketSlaStatus = (ticket: Ticket): SlaStatus => {
  const status = (ticket.status || "").toLowerCase().trim();
  if (!ticket.createdAt || !ticket.sla || 
      status === "resolvido" || 
      status === "concluido" ||
      status === "finalizado" ||
      status === "aguardando cliente" || 
      status === "aguardando terceiros") return "normal";

  let createdAtMs: number = 0;
  try {
    if (typeof ticket.createdAt.toDate === 'function') {
      createdAtMs = ticket.createdAt.toDate().getTime();
    } else if (ticket.createdAt instanceof Date) {
      createdAtMs = ticket.createdAt.getTime();
    } else if (typeof ticket.createdAt === 'number') {
      createdAtMs = ticket.createdAt;
    } else if (ticket.createdAt && typeof ticket.createdAt === 'object' && 'seconds' in ticket.createdAt) {
      createdAtMs = (ticket.createdAt as any).seconds * 1000;
    } else if (typeof ticket.createdAt === 'string') {
      createdAtMs = new Date(ticket.createdAt).getTime();
    }
  } catch (e) {
    console.error("Error parsing date in getTicketSlaStatus:", e);
    return "normal";
  }
  
  if (!createdAtMs || isNaN(createdAtMs)) return "normal";

  const now = Date.now();
  
  // Check if SLA is an ISO date string (e.g., "2026-03-24T14:22")
  const isDateString = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(ticket.sla);
  
  if (isDateString) {
    const deadlineMs = new Date(ticket.sla).getTime();
    if (isNaN(deadlineMs)) return "normal";
    
    const remaining = deadlineMs - now;
    if (remaining <= 0) return "expired";
    
    const totalDuration = deadlineMs - createdAtMs;
    if (totalDuration > 0 && remaining <= totalDuration * 0.2) return "approaching";
    
    return "normal";
  }

  const slaMs = parseSlaToMs(ticket.sla);
  if (slaMs === 0) return "normal";

  const elapsed = now - createdAtMs;
  const remaining = slaMs - elapsed;

  if (remaining <= 0) return "expired";
  if (remaining <= slaMs * 0.2) return "approaching"; // Last 20% of time

  return "normal";
};

export const getSlaProgress = (ticket: Ticket): number => {
  if (!ticket.createdAt || !ticket.sla || 
      ticket.status === "Resolvido" || 
      ticket.status === "Aguardando Cliente" || 
      ticket.status === "Aguardando Terceiros") return 0;
  
  let createdAtMs: number = 0;
  try {
    if (typeof ticket.createdAt.toDate === 'function') {
      createdAtMs = ticket.createdAt.toDate().getTime();
    } else if (ticket.createdAt instanceof Date) {
      createdAtMs = ticket.createdAt.getTime();
    } else if (typeof ticket.createdAt === 'number') {
      createdAtMs = ticket.createdAt;
    } else if (ticket.createdAt && typeof ticket.createdAt === 'object' && 'seconds' in ticket.createdAt) {
      createdAtMs = (ticket.createdAt as any).seconds * 1000;
    } else if (typeof ticket.createdAt === 'string') {
      createdAtMs = new Date(ticket.createdAt).getTime();
    }
  } catch (e) {
    console.error("Error parsing date in getSlaProgress:", e);
    return 0;
  }

  if (!createdAtMs || isNaN(createdAtMs)) return 0;

  const now = Date.now();
  
  const isDateString = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(ticket.sla);
  if (isDateString) {
    const deadlineMs = new Date(ticket.sla).getTime();
    if (isNaN(deadlineMs)) return 0;
    
    const totalDuration = deadlineMs - createdAtMs;
    if (totalDuration <= 0) return 100;
    
    const elapsed = now - createdAtMs;
    const progress = (elapsed / totalDuration) * 100;
    return Math.min(Math.max(progress, 0), 100);
  }

  const slaMs = parseSlaToMs(ticket.sla);
  if (slaMs === 0) return 0;

  const elapsed = now - createdAtMs;
  
  const progress = (elapsed / slaMs) * 100;
  return Math.min(Math.max(progress, 0), 100);
};
