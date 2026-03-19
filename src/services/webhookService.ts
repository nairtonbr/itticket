import { Ticket, AppSettings } from "../types";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export async function sendWebhook(ticket: Ticket, action: "create" | "update" | "sla_breach" | "action") {
  try {
    const settingsDoc = await getDoc(doc(db, "settings", "global"));
    const settings = settingsDoc.data() as AppSettings | undefined;

    if (!settings?.webhookUrl) {
      console.log("No webhook URL configured.");
      return;
    }

    const payload = {
      action,
      ticket: {
        ...ticket,
        createdAt: ticket.createdAt?.toDate?.()?.toISOString() || ticket.createdAt,
        updatedAt: ticket.updatedAt?.toDate?.()?.toISOString() || ticket.updatedAt,
        updates: ticket.updates?.map(u => ({
          ...u,
          timestamp: u.timestamp?.toDate?.()?.toISOString() || u.timestamp
        }))
      },
      timestamp: new Date().toISOString()
    };

    const response = await fetch(settings.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error("Failed to send webhook:", response.statusText);
    } else {
      console.log("Webhook sent successfully.");
    }
  } catch (error) {
    console.error("Error sending webhook:", error);
  }
}
