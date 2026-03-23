import Database from "better-sqlite3";
const db = new Database("database.sqlite");
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log("Tables:", tables);
const settings = db.prepare("SELECT * FROM settings").all();
console.log("Settings:", JSON.stringify(settings, null, 2));
