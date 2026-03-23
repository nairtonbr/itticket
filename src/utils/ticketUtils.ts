import { Ticket, AppSettings } from "../types";
import { getTicketSlaStatus } from "./slaUtils";

export { getTicketSlaStatus };

export const sendWebhook = async (ticket: Ticket, settings: AppSettings, type: 'create' | 'update' | 'sla_breach' | 'action') => {
  if (settings.webhookEnabled === false || !settings.webhookUrl) return;

  try {
    const response = await fetch('/api/webhook-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: settings.webhookUrl,
        data: {
          type,
          ticket,
          timestamp: new Date().toISOString()
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Webhook proxy error:', errorData.error);
    }
  } catch (error) {
    console.error('Error sending webhook through proxy:', error);
  }
};
