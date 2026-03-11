export type ClientName = "Avançar" | "Bixnet" | "Brasilink" | "Iplay" | "Jrnet" | "Meconnect" | "Nexo";
export type TicketStatus = "Aberto" | "Em Andamento" | "Aguardando Cliente" | "Aguardando Terceiros" | "Resolvido";
export type TicketCategory = "ENGENHARIA IP" | "INFRAESTRUTURA" | "NOC" | "PROJETOS" | "NÍVEL3";

export interface TicketAttachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface TicketUpdate {
  author: string;
  content: string;
  timestamp: any; // Firestore Timestamp
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  client: ClientName;
  status: TicketStatus;
  category?: TicketCategory;
  responsible: string;
  sla: string;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  updates: TicketUpdate[];
  attachments?: TicketAttachment[];
}

export interface AppSettings {
  webhookUrl: string;
  clientLogos?: Record<string, string>; // ClientName -> Logo URL
  clientResponsibles?: Record<string, string[]>; // ClientName -> Array of names
  ticketCounter?: {
    lastDate: string; // YYYYMMDD
    count: number;
  };
}

export type UserRole = "admin" | "user" | "client";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  associatedClient?: ClientName;
}
