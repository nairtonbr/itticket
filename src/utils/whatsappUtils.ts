import { Ticket, AppSettings } from "../types";

export const sendWhatsAppNotification = async (
  ticket: Ticket, 
  settings: AppSettings, 
  type: 'create' | 'update' | 'status' | 'comment' | 'sla'
) => {
  if (settings.whatsappEnabled === false) {
    console.log("WhatsApp notification skipped: Disabled in settings.");
    return { success: false, error: "Disabled in settings" };
  }

  let recipients: string[] = [];

  if (type === 'create' || type === 'update' || type === 'status' || type === 'comment') {
    // Global client recipients
    recipients = [...(settings.whatsappClientsList || [])];
    
    // Specific client recipients (new format)
    if (ticket.client && settings.whatsappClientMappings?.[ticket.client]) {
      recipients = [...recipients, ...settings.whatsappClientMappings[ticket.client]];
    }
    
    // Specific client recipients (legacy format - fallback)
    if (ticket.client && settings.clientPhones?.[ticket.client]) {
      recipients.push(settings.clientPhones[ticket.client]);
    }
  } else if (type === 'sla') {
    // Global responsible recipients
    recipients = [...(settings.whatsappResponsiblesList || [])];
    
    // Specific responsible recipients (new format)
    if (ticket.responsible && settings.whatsappResponsibleMappings?.[ticket.responsible]) {
      recipients = [...recipients, ...settings.whatsappResponsibleMappings[ticket.responsible]];
    }
    
    // Specific responsible recipients (legacy format - fallback)
    if (ticket.responsible && settings.responsiblePhones?.[ticket.responsible]) {
      recipients.push(settings.responsiblePhones[ticket.responsible]);
    }

    // STRICT EXCLUSION: Ensure no client phones are in the SLA list
    const clientPhones = new Set([
      ...(settings.whatsappClientsList || []),
      ...Object.values(settings.whatsappClientMappings || {}).flat(),
      ...Object.values(settings.clientPhones || {})
    ]);
    
    recipients = recipients.filter(phone => !clientPhones.has(phone));
  }

  // Remove duplicates and empty strings
  recipients = Array.from(new Set(recipients.filter(r => !!r)));

  console.log("WhatsApp Notification Debug:", { 
    type, 
    ticketId: ticket.id, 
    recipients
  });
  
  if (!recipients.length) {
    console.log("Nenhum destinatário configurado para", type);
    return { success: true }; // Return success so it doesn't show an error toast
  }

  if (!settings.evolutionApiUrl || !settings.evolutionApiKey || !settings.evolutionInstance) {
    console.log("WhatsApp notification skipped: Missing configuration.");
    return { success: false, error: "Missing configuration" };
  }

  let message = "";

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Resolvido":
      case "Concluido":
        return "✅";
      default:
        return "✴️";
    }
  };

  const getStatusDisplay = (status: string) => {
    if (status === "Resolvido") return "Concluido";
    return status;
  };

  const formatUpdates = (updates: any[], limit = 3) => {
    if (!updates || updates.length === 0) return "";
    const lastUpdates = updates.slice(-limit);
    return lastUpdates.map((u, i) => {
      const index = updates.length - lastUpdates.length + i + 1;
      const label = index === 1 ? "Atualização" : `Atualização${index}`;
      return `🔄 ${label}: ${u.content}`;
    }).join("\n\n");
  };

  if (type === 'create') {
    message = `*NOVO TICKET ABERTO*\n`;
    message += `🆔 ID TICKET: ${ticket.id}\n`;
    message += `👤 Cliente: ${ticket.client}\n`;
    message += `${getStatusIcon(ticket.status)} Status: ${getStatusDisplay(ticket.status)}\n`;
    message += `🔰 Assunto: ${ticket.title}\n`;
    message += `⏰ Prazo para atualização: ${ticket.sla}`;
  } else if (type === 'comment') {
    message = `🆔 ID TICKET: ${ticket.id}\n`;
    message += `👤 Cliente: ${ticket.client}\n`;
    message += `🔰 Assunto: ${ticket.title}\n`;
    message += formatUpdates(ticket.updates);
  } else if (type === 'status') {
    message = `🆔 ID TICKET: ${ticket.id}\n`;
    message += `👤 Cliente: ${ticket.client}\n`;
    message += `${getStatusIcon(ticket.status)} Status: ${getStatusDisplay(ticket.status)}\n`;
    message += `🔰 Assunto: ${ticket.title}`;
    
    // For specific statuses, add updates
    if (ticket.status === "Aguardando Cliente" || ticket.status === "Aguardando Terceiros") {
      const updatesText = formatUpdates(ticket.updates);
      if (updatesText) {
        message += `\n${updatesText}`;
      }
    }
  } else if (type === 'sla') {
    message = `🚨 *ALERTA DE SLA*\n`;
    message += `🆔 ID TICKET: ${ticket.id}\n`;
    message += `👤 Cliente: ${ticket.client}\n`;
    message += `🔰 Assunto: ${ticket.title}\n`;
    message += `⚠️ O SLA deste chamado estourou!`;
  } else {
    // Fallback for generic update
    message = `🆔 ID TICKET: ${ticket.id}\n`;
    message += `👤 Cliente: ${ticket.client}\n`;
    message += `🔰 Assunto: ${ticket.title}\n`;
    const lastUpdate = ticket.updates?.[ticket.updates.length - 1]?.content || "Sem atualização";
    message += `🔄 Atualização: ${lastUpdate}`;
  }

  // Normalize URL (remove trailing slash)
  const baseUrl = settings.evolutionApiUrl.replace(/\/$/, '');
  const url = `${baseUrl}/message/sendText/${encodeURIComponent(settings.evolutionInstance)}`;
  
  let hasSuccess = false;
  let lastError = "";

  for (const phone of recipients) {
    if (!phone) continue;
    
    // Format phone number or group ID
    const isGroupId = phone.includes('@g.us') || phone.includes('-');
    const formattedTarget = isGroupId ? phone.trim() : phone.replace(/\D/g, '');
    
    try {
      const response = await fetch('/api/webhook-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          method: 'POST',
          headers: {
            'apikey': settings.evolutionApiKey
          },
          data: {
            number: formattedTarget,
            text: message,
            options: {
              delay: 1200,
              presence: "composing",
              linkPreview: false
            }
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const apiError = errorData.error || errorData;
        
        let errorMessage = "Erro ao enviar WhatsApp";
        if (response.status === 400 && JSON.stringify(apiError).includes('Connection Closed')) {
          errorMessage = "WhatsApp desconectado. Reconecte na EvolutionAPI.";
        } else if (response.status === 404) {
          errorMessage = "Instância do WhatsApp não encontrada.";
        }
        lastError = errorMessage;
      } else {
        hasSuccess = true;
      }
    } catch (error: any) {
      lastError = error.message;
    }
  }

  if (hasSuccess) {
    console.log('WhatsApp notification sent successfully to at least one recipient.');
    return { success: true };
  } else {
    return { success: false, error: lastError || "Falha ao enviar para todos os destinatários" };
  }
};

export const testWhatsAppConnection = async (
  settings: { evolutionApiUrl: string; evolutionApiKey: string; evolutionInstance: string },
  target: string
) => {
  if (!settings.evolutionApiUrl || !settings.evolutionApiKey || !settings.evolutionInstance || !target) {
    throw new Error("Configuração incompleta ou número de teste ausente.");
  }

  // Normalize URL (remove trailing slash)
  const baseUrl = settings.evolutionApiUrl.replace(/\/$/, '');
  
  const isGroupId = target.includes('@g.us') || target.includes('-');
  let formattedTarget = target.trim();
  
  if (!isGroupId) {
    formattedTarget = formattedTarget.replace(/\D/g, '');
    // Some EvolutionAPI versions prefer the suffix for individual numbers too
    if (!formattedTarget.includes('@')) {
      // We'll try sending just the numbers first as it's the most common
      // but we'll keep it as is for now as EvolutionAPI usually appends the suffix
    }
  }
  
  const message = `🧪 *TESTE DE CONEXÃO*\n\nSua integração com a EvolutionAPI está funcionando corretamente! 🚀\n\n_Enviado em: ${new Date().toLocaleString('pt-BR')}_`;

  const url = `${baseUrl}/message/sendText/${encodeURIComponent(settings.evolutionInstance)}`;
  
  console.log('Iniciando teste de WhatsApp...', { url, target: formattedTarget });

  try {
    const response = await fetch('/api/webhook-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        method: 'POST',
        headers: {
          'apikey': settings.evolutionApiKey
        },
        data: {
          number: formattedTarget,
          text: message,
          options: {
            delay: 1200,
            presence: "composing",
            linkPreview: false
          }
        }
      }),
    });

    if (!response.ok) {
      let errorMessage = `Erro HTTP: ${response.status}`;
      try {
        const errorData = await response.json();
        const apiError = errorData.error || errorData;
        
        // Specific handling for common EvolutionAPI errors
        if (response.status === 400 && JSON.stringify(apiError).includes('Connection Closed')) {
          errorMessage = "Instância Desconectada: A sessão do WhatsApp foi encerrada ou não está aberta. Por favor, reconecte no painel da EvolutionAPI.";
        } else if (response.status === 404) {
          errorMessage = "Não Encontrado (404): Verifique se a URL da API e o Nome da Instância estão corretos.";
        } else if (apiError.response?.message) {
          const msg = apiError.response.message;
          errorMessage = Array.isArray(msg) ? msg.join(', ') : msg;
        } else if (apiError.message) {
          if (Array.isArray(apiError.message)) {
            errorMessage = apiError.message.join(', ');
          } else {
            errorMessage = apiError.message;
          }
        } else if (apiError.error) {
          errorMessage = apiError.error;
        } else if (typeof apiError === 'string') {
          errorMessage = apiError;
        }
      } catch (e) {
        errorMessage = "Erro ao processar resposta da API.";
      }
      throw new Error(errorMessage);
    }
    
    console.log('Teste de WhatsApp concluído com sucesso.');
    return true;
  } catch (error: any) {
    console.error('Erro na requisição ao EvolutionAPI:', error);
    throw error;
  }
};

export const checkInstanceStatus = async (
  settings: { evolutionApiUrl: string; evolutionApiKey: string; evolutionInstance: string }
) => {
  if (!settings.evolutionApiUrl || !settings.evolutionApiKey || !settings.evolutionInstance) {
    throw new Error("Configuração incompleta.");
  }

  const baseUrl = settings.evolutionApiUrl.replace(/\/$/, '');
  const url = `${baseUrl}/instance/connectionState/${settings.evolutionInstance}`;

  try {
    const response = await fetch('/api/webhook-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        method: 'GET',
        headers: {
          'apikey': settings.evolutionApiKey
        }
      }),
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Não Encontrado (404): Verifique se a URL da API e o Nome da Instância estão corretos.");
      }
      if (response.status === 400) {
        const errorData = await response.json();
        if (JSON.stringify(errorData).includes('Connection Closed')) {
          throw new Error("Instância Desconectada: A sessão do WhatsApp foi encerrada ou não está aberta.");
        }
      }
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const data = await response.json();
    return data.instance?.state || 'unknown';
  } catch (error: any) {
    console.error('Erro ao verificar status da instância:', error);
    throw error;
  }
};
