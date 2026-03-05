import Database, { Database as DatabaseType } from "better-sqlite3";
import path from "path";

const dbPath = path.join(__dirname, "..", "database.sqlite");
const db: DatabaseType = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma("journal_mode = WAL");

// Create the Contact table
db.exec(`
  CREATE TABLE IF NOT EXISTS Contact (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phoneNumber TEXT,
    email TEXT,
    linkedId INTEGER,
    linkPrecedence TEXT NOT NULL CHECK(linkPrecedence IN ('primary', 'secondary')),
    createdAt DATETIME NOT NULL DEFAULT (datetime('now')),
    updatedAt DATETIME NOT NULL DEFAULT (datetime('now')),
    deletedAt DATETIME,
    FOREIGN KEY (linkedId) REFERENCES Contact(id)
  )
`);

export default db;
