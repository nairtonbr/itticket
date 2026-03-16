import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("database.sqlite");
const JWT_SECRET = process.env.JWT_SECRET || "itticket-secret-key-2026";

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    password TEXT,
    displayName TEXT,
    role TEXT,
    associatedClient TEXT
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    client TEXT,
    status TEXT,
    category TEXT,
    responsible TEXT,
    sla TEXT,
    createdAt TEXT,
    updatedAt TEXT,
    updates TEXT,
    attachments TEXT,
    history TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    webhookUrl TEXT,
    clientLogos TEXT,
    clientResponsibles TEXT,
    customClients TEXT,
    customCategories TEXT
  );

  CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY,
    analyst TEXT,
    date TEXT,
    endDate TEXT,
    shift TEXT
  );
`);

// Seed default admin if not exists
const adminEmail = "NairtonBraga00@gmail.com";
const hashedPassword = bcrypt.hashSync("admin123", 10);
const adminExists = db.prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?)").get(adminEmail);

if (!adminExists) {
  db.prepare("INSERT INTO users (id, email, password, displayName, role) VALUES (?, ?, ?, ?, ?)").run(
    "admin-id",
    adminEmail,
    hashedPassword,
    "Nairton Braga",
    "admin"
  );
  console.log("Admin user created.");
} else {
  // Force update password to ensure it's admin123
  db.prepare("UPDATE users SET password = ? WHERE LOWER(email) = LOWER(?)").run(hashedPassword, adminEmail);
  console.log("Admin password updated.");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // Auth Routes
  app.post("/api/login", (req, res) => {
    const email = (req.body.email || "").trim();
    const password = (req.body.password || "").trim();
    
    console.log(`Login attempt for: [${email}] (length: ${email.length})`);
    
    // EMERGENCY BYPASS for the main admin
    if (email.toLowerCase() === "nairtonbraga00@gmail.com" && password === "admin123") {
      console.log("Emergency bypass triggered for admin.");
      let user: any = db.prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?)").get(email);
      
      // If for some reason the user was deleted from DB, recreate it
      if (!user) {
        const id = "admin-id";
        const hashedPassword = bcrypt.hashSync("admin123", 10);
        db.prepare("INSERT INTO users (id, email, password, displayName, role) VALUES (?, ?, ?, ?, ?)").run(
          id, email, hashedPassword, "Nairton Braga", "admin"
        );
        user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
      }
      
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
      const { password: _, ...userWithoutPassword } = user;
      return res.json({ token, user: userWithoutPassword });
    }

    // Normal login flow
    const user: any = db.prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?)").get(email);

    if (!user) {
      console.log(`User not found in DB: ${email}`);
      return res.status(401).json({ message: "Credenciais inválidas" });
    }

    const passwordMatch = bcrypt.compareSync(password, user.password);
    console.log(`Password match for ${email}: ${passwordMatch}`);

    if (!passwordMatch) {
      return res.status(401).json({ message: "Credenciais inválidas" });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
    const { password: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  });

  app.post("/api/register", (req, res) => {
    const { email, password, displayName, role, associatedClient } = req.body;
    const id = Math.random().toString(36).substring(2, 15);
    const hashedPassword = bcrypt.hashSync(password, 10);

    try {
      db.prepare("INSERT INTO users (id, email, password, displayName, role, associatedClient) VALUES (?, ?, ?, ?, ?, ?)").run(
        id, email, hashedPassword, displayName, role || 'client', associatedClient || null
      );
      res.status(201).json({ message: "Usuário criado com sucesso" });
    } catch (error) {
      res.status(400).json({ message: "Erro ao criar usuário. E-mail já existe?" });
    }
  });

  app.get("/api/users", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const users = db.prepare("SELECT id, email, displayName, role, associatedClient FROM users").all();
    res.json(users);
  });

  app.delete("/api/users/:id", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
    res.json({ message: "Usuário excluído" });
  });

  // Ticket Routes
  app.get("/api/tickets", authenticateToken, (req: any, res) => {
    let tickets;
    if (req.user.role === 'admin' || req.user.role === 'user') {
      tickets = db.prepare("SELECT * FROM tickets ORDER BY createdAt DESC").all();
    } else {
      const user: any = db.prepare("SELECT associatedClient FROM users WHERE id = ?").get(req.user.id);
      tickets = db.prepare("SELECT * FROM tickets WHERE client = ? ORDER BY createdAt DESC").all(user.associatedClient);
    }
    
    // Parse JSON strings back to objects
    const parsedTickets = tickets.map((t: any) => ({
      ...t,
      updates: JSON.parse(t.updates || "[]"),
      attachments: JSON.parse(t.attachments || "[]"),
      history: JSON.parse(t.history || "[]")
    }));
    
    res.json(parsedTickets);
  });

  app.post("/api/tickets", authenticateToken, (req, res) => {
    const ticket = req.body;
    const id = ticket.id || Math.random().toString(36).substring(2, 15);
    const now = new Date().toISOString();
    
    const history = [{
      action: "Criado",
      user: ticket.author || "Sistema",
      timestamp: now,
      details: "Chamado aberto"
    }];

    db.prepare(`
      INSERT INTO tickets (id, title, description, client, status, category, responsible, sla, createdAt, updatedAt, updates, attachments, history)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      ticket.title,
      ticket.description || "",
      ticket.client,
      ticket.status,
      ticket.category || "",
      ticket.responsible || "",
      ticket.sla || "",
      ticket.createdAt || now,
      ticket.updatedAt || now,
      JSON.stringify(ticket.updates || []),
      JSON.stringify(ticket.attachments || []),
      JSON.stringify(history)
    );
    
    res.status(201).json({ id });
  });

  app.put("/api/tickets/:id", authenticateToken, (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();
    
    // Get current ticket state for history tracking
    const currentTicket: any = db.prepare("SELECT * FROM tickets WHERE id = ?").get(id);
    if (!currentTicket) return res.status(404).json({ message: "Ticket não encontrado" });

    const history = JSON.parse(currentTicket.history || "[]");
    const changes: string[] = [];

    // Build dynamic update query
    const fields = Object.keys(updates).filter(k => k !== 'id' && k !== 'history' && k !== 'author');
    if (fields.length === 0) return res.json({ message: "Nenhuma alteração enviada" });

    // Track changes for history
    fields.forEach(field => {
      let oldValue = currentTicket[field];
      let newValue = updates[field];
      
      // Handle JSON fields
      if (field === 'updates' || field === 'attachments') {
        oldValue = JSON.parse(oldValue || "[]").length;
        newValue = (newValue || []).length;
        if (oldValue !== newValue) {
          changes.push(`${field === 'updates' ? 'Comentário' : 'Anexo'} adicionado`);
        }
      } else if (oldValue !== newValue) {
        changes.push(`${field}: ${oldValue} -> ${newValue}`);
      }
    });

    if (changes.length > 0) {
      history.push({
        action: "Atualizado",
        user: updates.author || "Sistema",
        timestamp: now,
        details: changes.join(", ")
      });
    }

    const setClause = fields.map(f => `${f} = ?`).join(", ") + ", updatedAt = ?, history = ?";
    const values = fields.map(f => {
      if (f === 'updates' || f === 'attachments') return JSON.stringify(updates[f]);
      return updates[f];
    });
    values.push(now, JSON.stringify(history), id);

    db.prepare(`UPDATE tickets SET ${setClause} WHERE id = ?`).run(...values);
    
    res.json({ message: "Ticket atualizado" });
  });
  
  app.delete("/api/tickets/:id", authenticateToken, (req: any, res) => {
    const { id } = req.params;
    const userRole = req.user.role;
    
    // Only admins or users can delete tickets
    if (userRole !== 'admin' && userRole !== 'user') {
      return res.status(403).json({ message: "Sem permissão para excluir chamados" });
    }
    
    db.prepare("DELETE FROM tickets WHERE id = ?").run(id);
    res.json({ message: "Ticket excluído com sucesso" });
  });

  // Settings Routes
  app.get("/api/settings", authenticateToken, (req, res) => {
    const settings: any = db.prepare("SELECT * FROM settings WHERE id = 'global'").get();
    if (!settings) return res.json({});
    res.json({
      ...settings,
      clientLogos: JSON.parse(settings.clientLogos || "{}"),
      clientResponsibles: JSON.parse(settings.clientResponsibles || "{}"),
      customClients: JSON.parse(settings.customClients || "[]"),
      customCategories: JSON.parse(settings.customCategories || "[]")
    });
  });

  app.post("/api/settings", authenticateToken, (req, res) => {
    const settings = req.body;
    db.prepare(`
      INSERT OR REPLACE INTO settings (id, webhookUrl, clientLogos, clientResponsibles, customClients, customCategories)
      VALUES ('global', ?, ?, ?, ?, ?)
    `).run(
      settings.webhookUrl || "",
      JSON.stringify(settings.clientLogos || {}),
      JSON.stringify(settings.clientResponsibles || {}),
      JSON.stringify(settings.customClients || []),
      JSON.stringify(settings.customCategories || [])
    );
    res.json({ message: "Configurações salvas" });
  });

  // Schedule Routes
  app.get("/api/schedules", authenticateToken, (req, res) => {
    const schedules = db.prepare("SELECT * FROM schedules ORDER BY date ASC").all();
    res.json(schedules);
  });

  app.post("/api/schedules", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { analyst, date, endDate, shift } = req.body;
    const id = Math.random().toString(36).substring(2, 15);
    
    db.prepare("INSERT INTO schedules (id, analyst, date, endDate, shift) VALUES (?, ?, ?, ?, ?)").run(
      id, analyst, date, endDate || null, shift
    );
    
    res.status(201).json({ id, analyst, date, endDate, shift });
  });

  app.delete("/api/schedules/:id", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    db.prepare("DELETE FROM schedules WHERE id = ?").run(req.params.id);
    res.json({ message: "Escala excluída" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
