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
    attachments TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    webhookUrl TEXT,
    clientLogos TEXT,
    clientResponsibles TEXT
  );
`);

// Seed default admin if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE email = ?").get("NairtonBraga00@gmail.com");
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync("admin123", 10);
  db.prepare("INSERT INTO users (id, email, password, displayName, role) VALUES (?, ?, ?, ?, ?)").run(
    "admin-id",
    "NairtonBraga00@gmail.com",
    hashedPassword,
    "Nairton Braga",
    "admin"
  );
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

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
    const { email, password } = req.body;
    const user: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

    if (!user || !bcrypt.compareSync(password, user.password)) {
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
      attachments: JSON.parse(t.attachments || "[]")
    }));
    
    res.json(parsedTickets);
  });

  app.post("/api/tickets", authenticateToken, (req, res) => {
    const ticket = req.body;
    const id = ticket.id || Math.random().toString(36).substring(2, 15);
    
    db.prepare(`
      INSERT INTO tickets (id, title, description, client, status, category, responsible, sla, createdAt, updatedAt, updates, attachments)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      ticket.title,
      ticket.description || "",
      ticket.client,
      ticket.status,
      ticket.category || "",
      ticket.responsible || "",
      ticket.sla || "",
      ticket.createdAt || new Date().toISOString(),
      ticket.updatedAt || new Date().toISOString(),
      JSON.stringify(ticket.updates || []),
      JSON.stringify(ticket.attachments || [])
    );
    
    res.status(201).json({ id });
  });

  app.put("/api/tickets/:id", authenticateToken, (req, res) => {
    const { id } = req.params;
    const ticket = req.body;
    
    db.prepare(`
      UPDATE tickets SET 
        title = ?, description = ?, client = ?, status = ?, category = ?, 
        responsible = ?, sla = ?, updatedAt = ?, updates = ?, attachments = ?
      WHERE id = ?
    `).run(
      ticket.title,
      ticket.description,
      ticket.client,
      ticket.status,
      ticket.category,
      ticket.responsible,
      ticket.sla,
      new Date().toISOString(),
      JSON.stringify(ticket.updates),
      JSON.stringify(ticket.attachments),
      id
    );
    
    res.json({ message: "Ticket atualizado" });
  });

  // Settings Routes
  app.get("/api/settings", authenticateToken, (req, res) => {
    const settings: any = db.prepare("SELECT * FROM settings WHERE id = 'global'").get();
    if (!settings) return res.json({});
    res.json({
      ...settings,
      clientLogos: JSON.parse(settings.clientLogos || "{}"),
      clientResponsibles: JSON.parse(settings.clientResponsibles || "{}")
    });
  });

  app.post("/api/settings", authenticateToken, (req, res) => {
    const settings = req.body;
    db.prepare(`
      INSERT OR REPLACE INTO settings (id, webhookUrl, clientLogos, clientResponsibles)
      VALUES ('global', ?, ?, ?)
    `).run(
      settings.webhookUrl || "",
      JSON.stringify(settings.clientLogos || {}),
      JSON.stringify(settings.clientResponsibles || {})
    );
    res.json({ message: "Configurações salvas" });
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
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
