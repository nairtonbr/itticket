import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const getFirestoreDate = (date: any): Date | null => {
  if (!date) return null;
  
  try {
    let dateObj: Date;
    if (typeof date.toDate === 'function') {
      dateObj = date.toDate();
    } else if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'number') {
      dateObj = new Date(date);
    } else if (date && typeof date === 'object' && 'seconds' in date) {
      dateObj = new Date((date as any).seconds * 1000);
    } else if (date && typeof date === 'object' && (date.constructor?.name === 'FieldValue' || !('seconds' in date))) {
      // Handle pending serverTimestamp or other FieldValues by using current time
      dateObj = new Date();
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
    } else {
      return null;
    }
    
    if (isNaN(dateObj.getTime())) return null;
    return dateObj;
  } catch (e) {
    console.error("Error getting firestore date:", e);
    return null;
  }
};

export const formatFirestoreDate = (date: any, formatStr: string = "dd/MM/yyyy HH:mm"): string => {
  const dateObj = getFirestoreDate(date);
  if (!dateObj) return "-";
  return format(dateObj, formatStr, { locale: ptBR });
};

export const getTimeOpen = (date: any): string => {
  const dateObj = getFirestoreDate(date);
  if (!dateObj) return "-";
  
  const now = new Date();
  const diffInMs = now.getTime() - dateObj.getTime();
  
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInMinutes = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffInHours > 24) {
    const days = Math.floor(diffInHours / 24);
    const hours = diffInHours % 24;
    return `${days}d ${hours}h ${diffInMinutes}m`;
  }
  
  return `${diffInHours}h ${diffInMinutes}m`;
};

export const formatHoursToHMin = (hours: number): string => {
  if (!hours || isNaN(hours)) return "0h 00m";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m < 10 ? '0' : ''}${m}m`;
};

export const hMinToHours = (h: number, m: number): number => {
  return h + (m / 60);
};
