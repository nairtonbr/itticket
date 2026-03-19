import { Ticket, AppSettings } from "../types";

export const sendWhatsAppNotification = async (
  ticket: Ticket, 
  settings: AppSettings, 
  type: 'create' | 'update' | 'action' | 'sla_breach'
) => {
  const clientPhone = settings.clientPhones?.[ticket.client];
  
  if (!clientPhone || !settings.evolutionApiUrl || !settings.evolutionApiKey || !settings.evolutionInstance) {
    console.log("WhatsApp notification skipped: Missing configuration or client phone.");
    return;
  }

  // Format phone number or group ID
  // If it contains @g.us or hyphens, assume it's a group ID/JID and don't strip
  const isGroupId = clientPhone.includes('@g.us') || clientPhone.includes('-');
  const formattedTarget = isGroupId ? clientPhone.trim() : clientPhone.replace(/\D/g, '');
  
  // Format message based on user's image
  let message = `🆔 *ID TICKET:* ${ticket.id}\n`;
  message += `🔰 *Assunto:* ${ticket.title}\n`;

  if (type === 'create') {
    message += `⏰ *Prazo para atualização:* ${ticket.sla}`;
  } else if (type === 'sla_breach') {
    message += `🚨 *ALERTA:* SLA Vencido!`;
  } else {
    const lastUpdate = ticket.updates?.[ticket.updates.length - 1]?.content || "Sem atualização";
    message += `🔄 *Atualização:* ${lastUpdate}`;
  }

  try {
    const url = `${settings.evolutionApiUrl}/message/sendText/${settings.evolutionInstance}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': settings.evolutionApiKey
      },
      body: JSON.stringify({
        number: formattedTarget,
        options: {
          delay: 1200,
          presence: "composing",
          linkPreview: false
        },
        textMessage: {
          text: message
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('EvolutionAPI Error:', errorData);
    } else {
      console.log('WhatsApp notification sent successfully.');
    }
  } catch (error) {
    console.error('Error sending WhatsApp notification:', error);
  }
};

export const testWhatsAppConnection = async (
  settings: { evolutionApiUrl: string; evolutionApiKey: string; evolutionInstance: string },
  target: string
) => {
  if (!settings.evolutionApiUrl || !settings.evolutionApiKey || !settings.evolutionInstance || !target) {
    throw new Error("Configuração incompleta ou número de teste ausente.");
  }

  const isGroupId = target.includes('@g.us') || target.includes('-');
  const formattedTarget = isGroupId ? target.trim() : target.replace(/\D/g, '');
  
  const message = `🧪 *TESTE DE CONEXÃO*\n\nSua integração com a EvolutionAPI está funcionando corretamente! 🚀`;

  const url = `${settings.evolutionApiUrl}/message/sendText/${settings.evolutionInstance}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': settings.evolutionApiKey
    },
    body: JSON.stringify({
      number: formattedTarget,
      options: {
        delay: 500,
        presence: "composing",
        linkPreview: false
      },
      textMessage: {
        text: message
      }
    }),
  });

  if (!response.ok) {
    try {
      const errorData = await response.json();
      throw new Error(errorData.message || `Erro HTTP: ${response.status}`);
    } catch (e) {
      throw new Error(`Erro na requisição: ${response.status} ${response.statusText}`);
    }
  }
  
  return true;
};
