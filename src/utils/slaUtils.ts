import { Ticket } from "../types";

export type SlaStatus = "normal" | "approaching" | "expired";

export const parseSlaToMs = (sla: string): number => {
  if (!sla) return 0;
  
  const lowerSla = sla.toLowerCase().trim();
  
  // Handle common formats
  if (lowerSla.includes('h')) {
    const hours = parseInt(lowerSla.replace('h', ''));
    if (!isNaN(hours)) return hours * 60 * 60 * 1000;
  }
  
  if (lowerSla.includes('m')) {
    const minutes = parseInt(lowerSla.replace('m', ''));
    if (!isNaN(minutes)) return minutes * 60 * 1000;
  }

  if (lowerSla.includes('d')) {
    const days = parseInt(lowerSla.replace('d', ''));
    if (!isNaN(days)) return days * 24 * 60 * 60 * 1000;
  }

  // Special cases
  if (lowerSla === 'urgente') return 1 * 60 * 60 * 1000; // 1 hour
  if (lowerSla === 'alta') return 4 * 60 * 60 * 1000; // 4 hours
  if (lowerSla === 'média') return 24 * 60 * 60 * 1000; // 24 hours
  if (lowerSla === 'baixa') return 48 * 60 * 60 * 1000; // 48 hours

  return 0;
};

export const getTicketSlaStatus = (ticket: Ticket): SlaStatus => {
  if (!ticket.createdAt || !ticket.sla || ticket.status === "Resolvido") return "normal";

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

  const slaMs = parseSlaToMs(ticket.sla);
  if (slaMs === 0) return "normal";

  const now = Date.now();
  const elapsed = now - createdAtMs;
  const remaining = slaMs - elapsed;

  if (remaining <= 0) return "expired";
  if (remaining <= slaMs * 0.2) return "approaching"; // Last 20% of time

  return "normal";
};

export const getSlaProgress = (ticket: Ticket): number => {
  if (!ticket.createdAt || !ticket.sla) return 0;
  
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

  const slaMs = parseSlaToMs(ticket.sla);
  if (slaMs === 0) return 0;

  const now = Date.now();
  const elapsed = now - createdAtMs;
  
  const progress = (elapsed / slaMs) * 100;
  return Math.min(progress, 100);
};
