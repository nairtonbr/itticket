import { ClientName, TicketStatus, TicketCategory, TicketPriority } from "./types";

export const CLIENTS: ClientName[] = ["Avançar", "Bixnet", "Brasilink", "Iplay", "Jrnet", "Meconnect", "Nexo"];
export const STATUSES: TicketStatus[] = ["Aberto", "Em Andamento", "Aguardando Cliente", "Aguardando Terceiros", "Resolvido"];
export const CATEGORIES: TicketCategory[] = ["Suporte", "Vendas", "Financeiro", "Engenharia", "Infraestrutura"];
export const PRIORITIES: TicketPriority[] = ["Baixa", "Média", "Alta", "Urgente"];

export const STATUS_COLORS: Record<TicketStatus, string> = {
  "Aberto": "bg-blue-500",
  "Em Andamento": "bg-yellow-500",
  "Aguardando Cliente": "bg-purple-500",
  "Aguardando Terceiros": "bg-orange-500",
  "Resolvido": "bg-green-500",
};

export const STATUS_TEXT_COLORS: Record<TicketStatus, string> = {
  "Aberto": "text-blue-500",
  "Em Andamento": "text-yellow-500",
  "Aguardando Cliente": "text-purple-500",
  "Aguardando Terceiros": "text-orange-500",
  "Resolvido": "text-green-500",
};

export const STATUS_CARD_COLORS: Record<TicketStatus, string> = {
  "Aberto": "border-l-4 border-l-blue-500 bg-blue-50/30 dark:bg-blue-900/10",
  "Em Andamento": "border-l-4 border-l-yellow-500 bg-yellow-50/30 dark:bg-yellow-900/10",
  "Aguardando Cliente": "border-l-4 border-l-purple-500 bg-purple-50/30 dark:bg-purple-900/10",
  "Aguardando Terceiros": "border-l-4 border-l-orange-500 bg-orange-50/30 dark:bg-orange-900/10",
  "Resolvido": "border-l-4 border-l-green-500 bg-green-50/30 dark:bg-green-900/10",
};
