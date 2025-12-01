const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
  // 1. Users Table (New)
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`);

  // 2. Subjects Table
  db.run(`CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT
  )`);

  // 2. Categories Table
  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER,
    name TEXT NOT NULL,
    FOREIGN KEY(subject_id) REFERENCES subjects(id)
  )`);

  // 3. Questions Table
  db.run(`CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER,
    type TEXT NOT NULL, -- selection, sorting, listening, writing, card
    question_text TEXT,
    options TEXT, -- JSON string
    answer TEXT,
    media_url TEXT,
    explanation TEXT,
    FOREIGN KEY(category_id) REFERENCES categories(id)
  )`);

  // 4. Study Logs Table
  db.run(`CREATE TABLE IF NOT EXISTS study_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT, -- Simple user ID for now
    question_id INTEGER,
    is_correct INTEGER, -- 0 or 1
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(question_id) REFERENCES questions(id)
  )`);

  console.log("Tables created.");

  // Seed Data
  db.get("SELECT count(*) as count FROM subjects", (err, row) => {
    if (row.count === 0) {
      console.log("Inserting seed data...");

      const stmtSubject = db.prepare("INSERT INTO subjects (name, color) VALUES (?, ?)");
      stmtSubject.run("英語", "#4CAF50"); // Green
      stmtSubject.run("社会", "#FF9800"); // Orange
      stmtSubject.run("理科", "#2196F3"); // Blue
      stmtSubject.finalize();

      // Insert Categories and Questions after a slight delay to ensure subjects exist (simple approach)
      setTimeout(() => {
        // Get Subject IDs (assuming 1, 2, 3 for simplicity in seed, but better to query)
        // For this seed script, we'll assume sequential IDs 1, 2, 3.

        const stmtCat = db.prepare("INSERT INTO categories (subject_id, name) VALUES (?, ?)");
        stmtCat.run(1, "適語選択");
        stmtCat.run(1, "語順整序");
        stmtCat.run(2, "歴史");
        stmtCat.finalize();

        setTimeout(() => {
          const stmtQ = db.prepare("INSERT INTO questions (category_id, type, question_text, options, answer, explanation) VALUES (?, ?, ?, ?, ?, ?)");

          // English Selection Question
          stmtQ.run(1, "selection", "I ___ a student.", JSON.stringify(["am", "is", "are", "be"]), "am", "主語がIなのでamを使います。");

          // English Sorting Question
          stmtQ.run(2, "sorting", "彼はテニスをしますか？", JSON.stringify(["play", "he", "Does", "tennis", "?"]), "Does he play tennis ?", "疑問文なのでDoesから始めます。");

          // History Question
          stmtQ.run(3, "selection", "徳川家康が開いた幕府は？", JSON.stringify(["鎌倉幕府", "室町幕府", "江戸幕府"]), "江戸幕府", "1603年に開かれました。");

          stmtQ.finalize();
          console.log("Seed data inserted.");
        }, 500);
      }, 500);
    } else {
      console.log("Seed data already exists.");
    }
  });
});

// db.close(); // Keep open if we were doing more, but for script it's fine to let process exit or close.
