import { Ticket, AppSettings } from "../types";

export const sendWhatsAppNotification = async (
  ticket: Ticket, 
  settings: AppSettings, 
  type: 'create' | 'update' | 'status' | 'comment' | 'sla_breach'
) => {
  if (settings.whatsappEnabled === false) {
    console.log("WhatsApp notification skipped: Disabled in settings.");
    return;
  }

  const clientPhone = settings.clientPhones?.[ticket.client];
  const slaPhone = settings.slaAlertPhone;
  
  // Use dedicated SLA alert phone if available for SLA breach, otherwise use client phone
  const targetPhone = (type === 'sla_breach' && slaPhone) ? slaPhone : clientPhone;
  
  if (!targetPhone || !settings.evolutionApiUrl || !settings.evolutionApiKey || !settings.evolutionInstance) {
    console.log("WhatsApp notification skipped: Missing configuration or target phone.");
    return;
  }

  // Format phone number or group ID
  const isGroupId = targetPhone.includes('@g.us') || targetPhone.includes('-');
  const formattedTarget = isGroupId ? targetPhone.trim() : targetPhone.replace(/\D/g, '');
  
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
    message += `${getStatusIcon(ticket.status)} Status: ${getStatusDisplay(ticket.status)}\n`;
    message += `🔰 Assunto: ${ticket.title}\n`;
    message += `⏰ Prazo para atualização: ${ticket.sla}`;
  } else if (type === 'comment') {
    message = `🆔 ID TICKET: ${ticket.id}\n`;
    message += `🔰 Assunto: ${ticket.title}\n`;
    message += formatUpdates(ticket.updates);
  } else if (type === 'status') {
    message = `🆔 ID TICKET: ${ticket.id}\n`;
    message += `${getStatusIcon(ticket.status)} Status: ${getStatusDisplay(ticket.status)}\n`;
    message += `🔰 Assunto: ${ticket.title}`;
    
    // For specific statuses, add updates
    if (ticket.status === "Aguardando Cliente" || ticket.status === "Aguardando Terceiros") {
      const updatesText = formatUpdates(ticket.updates);
      if (updatesText) {
        message += `\n${updatesText}`;
      }
    }
  }
 else if (type === 'sla_breach') {
    message = `🆔 ID TICKET: ${ticket.id}\n`;
    message += `🔰 Assunto: ${ticket.title}\n`;
    message += `🚨 ALERTA: SLA Vencido!`;
  } else {
    // Fallback for generic update
    message = `🆔 ID TICKET: ${ticket.id}\n`;
    message += `🔰 Assunto: ${ticket.title}\n`;
    const lastUpdate = ticket.updates?.[ticket.updates.length - 1]?.content || "Sem atualização";
    message += `🔄 Atualização: ${lastUpdate}`;
  }

  // Normalize URL (remove trailing slash)
  const baseUrl = settings.evolutionApiUrl.replace(/\/$/, '');
  
  try {
    const url = `${baseUrl}/message/sendText/${settings.evolutionInstance}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': settings.evolutionApiKey
      },
      body: JSON.stringify({
        number: formattedTarget,
        text: message,
        options: {
          delay: 1200,
          presence: "composing",
          linkPreview: false
        }
      }),
    });

    if (!response.ok) {
      try {
        const errorData = await response.json();
        console.error('EvolutionAPI Error:', errorData);
      } catch (e) {
        const textError = await response.text();
        console.error('EvolutionAPI Text Error:', textError);
      }
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

  const url = `${baseUrl}/message/sendText/${settings.evolutionInstance}`;
  
  console.log('Iniciando teste de WhatsApp...', { url, target: formattedTarget });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': settings.evolutionApiKey
      },
      body: JSON.stringify({
        number: formattedTarget,
        text: message,
        options: {
          delay: 1200,
          presence: "composing",
          linkPreview: false
        }
      }),
    });

    if (!response.ok) {
      let errorMessage = `Erro HTTP: ${response.status}`;
      try {
        const errorData = await response.json();
        console.error('EvolutionAPI Error Response:', errorData);
        
        if (errorData.message) {
          if (Array.isArray(errorData.message)) {
            errorMessage = errorData.message.join(', ');
          } else {
            errorMessage = errorData.message;
          }
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (e) {
        const textError = await response.text();
        console.error('EvolutionAPI Text Error:', textError);
        errorMessage = textError || errorMessage;
      }
      throw new Error(errorMessage);
    }
    
    console.log('Teste de WhatsApp concluído com sucesso.');
    return true;
  } catch (error: any) {
    console.error('Erro na requisição ao EvolutionAPI:', error);
    if (error.message === 'Failed to fetch') {
      throw new Error("Não foi possível conectar ao servidor da API. Verifique se a URL está correta e se o servidor permite conexões (CORS).");
    }
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
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': settings.evolutionApiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const data = await response.json();
    return data.instance?.state || 'unknown';
  } catch (error: any) {
    console.error('Erro ao verificar status da instância:', error);
    throw error;
  }
};
