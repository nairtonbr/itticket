import { Ticket, AppSettings } from "../types";
import { getTicketSlaStatus } from "./slaUtils";

export { getTicketSlaStatus };

export const sendWebhook = async (ticket: Ticket, settings: AppSettings, type: 'create' | 'update' | 'sla_breach' | 'action') => {
  if (settings.webhookEnabled === false || !settings.webhookUrl) return;

  try {
    await fetch(settings.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        ticket,
        timestamp: new Date().toISOString()
      }),
    });
  } catch (error) {
    console.error('Error sending webhook:', error);
  }
};
