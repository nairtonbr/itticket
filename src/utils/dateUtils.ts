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
