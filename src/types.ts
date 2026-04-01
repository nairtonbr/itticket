export type ClientName = string;
export type TicketStatus = "Aberto" | "Em Andamento" | "Aguardando Cliente" | "Aguardando Terceiros" | "Resolvido";
export type TicketCategory = string;
export type TicketPriority = "Baixa" | "Média" | "Alta" | "Urgente";

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
  editedAt?: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  client: ClientName;
  status: TicketStatus;
  category?: TicketCategory;
  priority?: TicketPriority;
  totalHours?: number;
  billedHours?: number;
  responsible: string;
  sla: string;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  updates: TicketUpdate[];
  attachments?: TicketAttachment[];
  archived?: number; // 0 for active, 1 for archived
  slaNotified?: boolean;
  slaNotifiedAt?: string | null;
  inProgressSince?: string; // ISO date when status became "Em Andamento"
  isImportant?: boolean;
  history?: {
    action: string;
    user: string;
    timestamp: string;
    details: string;
  }[];
}

export interface AppSettings {
  webhookUrl: string;
  customClients?: string[];
  customCategories?: string[];
  clientLogos?: Record<string, string>; // ClientName -> Logo URL
  clientResponsibles?: Record<string, string[]>; // ClientName -> Array of names
  ticketCounter?: {
    lastDate: string; // YYYYMMDD
    count: number;
  };
  nextTicketId?: number;
  evolutionApiUrl?: string;
  evolutionApiKey?: string;
  evolutionInstance?: string;
  whatsappEnabled?: boolean;
  webhookEnabled?: boolean;
  clientPhones?: Record<string, string>; // Deprecated
  responsiblePhones?: Record<string, string>; // Deprecated
  whatsappClientsList?: string[];
  whatsappResponsiblesList?: string[];
  whatsappClientMappings?: Record<string, string[]>; // ClientName -> Phone numbers
  whatsappResponsibleMappings?: Record<string, string[]>; // ResponsibleName -> Phone numbers
  lastSlaCheckDate?: string; // YYYY-MM-DD
  disabledSlaClients?: string[];
  statusColors?: Record<string, string>; // Status -> Hex Color
}

export type UserRole = "admin" | "user" | "client" | "pending";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  associatedClient?: ClientName;
  token?: string;
}
