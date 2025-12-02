const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto'); // For hashing

const app = express();
const port = process.env.PORT || 3000;
const dbPath = path.resolve(__dirname, 'database.sqlite');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database Connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database ' + dbPath + ': ' + err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// Helper for hashing
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// --- API Endpoints ---

// Register
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  const hashedPassword = hashPassword(password);
  const sql = "INSERT INTO users (username, password) VALUES (?, ?)";
  db.run(sql, [username, hashedPassword], function (err) {
    if (err) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.json({ message: 'User registered', id: this.lastID });
  });
});

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = hashPassword(password);
  const sql = "SELECT * FROM users WHERE username = ? AND password = ?";
  db.get(sql, [username, hashedPassword], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (row) {
      res.json({ message: 'Login success', user: { id: row.id, username: row.username } });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });
});

// Get all subjects
app.get('/api/subjects', (req, res) => {
  db.all("SELECT * FROM subjects", [], (err, rows) => {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.json({ "data": rows });
  });
});

// Get categories by subject_id
app.get('/api/categories/:subject_id', (req, res) => {
  const sql = "SELECT * FROM categories WHERE subject_id = ?";
  const params = [req.params.subject_id];
  db.all(sql, params, (err, rows) => {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.json({ "data": rows });
  });
});

// Get questions by category_id
app.get('/api/questions/:category_id', (req, res) => {
  const sql = "SELECT * FROM questions WHERE category_id = ?";
  const params = [req.params.category_id];
  db.all(sql, params, (err, rows) => {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    // Parse options JSON string back to object
    const questions = rows.map(row => ({
      ...row,
      options: row.options ? JSON.parse(row.options) : []
    }));
    res.json({ "data": questions });
  });
});

// Save study log
app.post('/api/study_logs', (req, res) => {
  const { user_id, question_id, is_correct } = req.body;
  const sql = "INSERT INTO study_logs (user_id, question_id, is_correct) VALUES (?, ?, ?)";
  const params = [user_id, question_id, is_correct];
  db.run(sql, params, function (err) {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.json({ "message": "success", "id": this.lastID });
  });
});

// --- Admin API Endpoints ---

const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const upload = multer({ dest: 'uploads/' });

// CSV Upload
app.post('/api/upload/csv', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const targetCategoryId = req.body.category_id;

  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      try {
        db.serialize(() => {
          db.run("BEGIN TRANSACTION");

          // Prepared statements
          const stmtSubject = db.prepare("INSERT OR IGNORE INTO subjects (name, color) VALUES (?, ?)");
          const stmtCategory = db.prepare("INSERT OR IGNORE INTO categories (subject_id, name) VALUES ((SELECT id FROM subjects WHERE name = ?), ?)");

          // Question insert via Name lookup
          const stmtQuestionByName = db.prepare(`
                        INSERT INTO questions (category_id, type, question_text, options, answer, explanation)
                        VALUES ((SELECT id FROM categories WHERE name = ? AND subject_id = (SELECT id FROM subjects WHERE name = ?)), ?, ?, ?, ?, ?)
                    `);

          // Question insert via ID
          const stmtQuestionById = db.prepare(`
                        INSERT INTO questions (category_id, type, question_text, options, answer, explanation)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `);

          results.forEach(row => {
            let options = [];
            if (row.options) {
              options = row.options.split(',').map(s => s.trim());
            }

            if (targetCategoryId) {
              // Individual Mode: Use provided category_id
              stmtQuestionById.run(
                targetCategoryId,
                row.type || 'selection',
                row.question,
                JSON.stringify(options),
                row.answer,
                row.explanation
              );
            } else {
              // Bulk Mode: Use CSV columns
              if (!row.subject || !row.category) return; // Skip invalid rows

              stmtSubject.run(row.subject, '#00e5ff');
              stmtCategory.run(row.subject, row.category);
              stmtQuestionByName.run(
                row.category,
                row.subject,
                row.type || 'selection',
                row.question,
                JSON.stringify(options),
                row.answer,
                row.explanation
              );
            }
          });

          stmtSubject.finalize();
          stmtCategory.finalize();
          stmtQuestionByName.finalize();
          stmtQuestionById.finalize();

          db.run("COMMIT", (err) => {
            if (err) {
              console.error(err);
              res.status(500).json({ error: 'Transaction commit failed' });
            } else {
              res.json({ message: `Processed ${results.length} rows` });
            }
            fs.unlinkSync(req.file.path);
          });
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Processing failed' });
        fs.unlinkSync(req.file.path);
      }
    });
});

// CSV Export
app.get('/api/export/csv', (req, res) => {
  const { subject_id, category_id } = req.query;

  let sql = `
        SELECT s.name as subject, c.name as category, q.type, q.question_text, q.options, q.answer, q.explanation
        FROM questions q
        JOIN categories c ON q.category_id = c.id
        JOIN subjects s ON c.subject_id = s.id
    `;

  const params = [];
  const conditions = [];

  if (subject_id) {
    conditions.push("s.id = ?");
    params.push(subject_id);
  }
  if (category_id) {
    conditions.push("c.id = ?");
    params.push(category_id);
  }

  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    // Determine filename
    let filename = 'questions_export.csv';
    if (rows.length > 0) {
      const first = rows[0];
      if (subject_id && category_id) {
        filename = `${first.subject}_${first.category}.csv`;
      } else if (subject_id) {
        filename = `${first.subject}.csv`;
      }
    }
    // Sanitize filename
    filename = filename.replace(/[\\/:*?"<>|]/g, '_');

    const header = 'subject,category,type,question,options,answer,explanation\n';
    const csvRows = rows.map(row => {
      const escape = (text) => {
        if (text === null || text === undefined) return '';
        const str = String(text);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      let optionsStr = row.options;
      try {
        const opts = JSON.parse(row.options);
        if (Array.isArray(opts)) optionsStr = opts.join(',');
      } catch (e) { }

      return [
        escape(row.subject),
        escape(row.category),
        escape(row.type),
        escape(row.question_text),
        escape(optionsStr),
        escape(row.answer),
        escape(row.explanation)
      ].join(',');
    });

    const csvContent = '\uFEFF' + header + csvRows.join('\n'); // Add BOM for Excel

    res.setHeader('Content-Type', 'text/csv; charset=utf-8'); // Add charset
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(csvContent);
  });
});

// List Exported Files
app.get('/api/exports', (req, res) => {
  const exportDir = path.join(__dirname, 'exports');
  if (!fs.existsSync(exportDir)) {
    return res.json([]);
  }
  fs.readdir(exportDir, (err, files) => {
    if (err) return res.status(500).json({ error: err.message });
    const csvFiles = files.filter(f => f.endsWith('.csv'));
    res.json(csvFiles);
  });
});

// Download Exported File
app.get('/api/downloads/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(__dirname, 'exports', filename);

  // Basic security check
  if (filename.includes('..') || !filename.endsWith('.csv')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  if (fs.existsSync(filepath)) {
    res.download(filepath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// Users
app.get('/api/users', (req, res) => {
  db.all("SELECT id, username FROM users", [], (err, rows) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ data: rows });
  });
});

app.delete('/api/users/:id', (req, res) => {
  db.run("DELETE FROM users WHERE id = ?", req.params.id, function (err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ message: "Deleted", changes: this.changes });
  });
});

// Subjects
app.post('/api/subjects', (req, res) => {
  const { name, color } = req.body;
  db.run("INSERT INTO subjects (name, color) VALUES (?, ?)", [name, color], function (err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ message: "Created", id: this.lastID });
  });
});

app.get('/api/subjects/:id', (req, res) => {
  db.get("SELECT * FROM subjects WHERE id = ?", req.params.id, (err, row) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Subject not found' });
    res.json({ data: row });
  });
});

app.delete('/api/subjects/:id', (req, res) => {
  db.run("DELETE FROM subjects WHERE id = ?", req.params.id, function (err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ message: "Deleted", changes: this.changes });
  });
});

// Categories
app.get('/api/categories', (req, res) => {
  const { subject_id, type } = req.query;
  console.log(`GET /api/categories?subject_id=${subject_id}&type=${type}`);
  if (!subject_id) return res.status(400).json({ error: 'Subject ID required' });

  let sql = "SELECT * FROM categories WHERE subject_id = ?";
  let params = [subject_id];

  if (type) {
    sql = `
      SELECT DISTINCT c.*
      FROM categories c
      JOIN questions q ON c.id = q.category_id
      WHERE c.subject_id = ? AND q.type = ?
    `;
    params.push(type);
  }

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(400).json({ error: err.message });
    }
    res.json({ data: rows });
  });
});
app.post('/api/categories', (req, res) => {
  const { subject_id, name } = req.body;
  db.run("INSERT INTO categories (subject_id, name) VALUES (?, ?)", [subject_id, name], function (err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ message: "Created", id: this.lastID });
  });
});

app.put('/api/categories/:id', (req, res) => {
  const { name } = req.body;
  db.run("UPDATE categories SET name = ? WHERE id = ?", [name, req.params.id], function (err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ message: "Updated", changes: this.changes });
  });
});

app.delete('/api/categories/:id', (req, res) => {
  db.run("DELETE FROM categories WHERE id = ?", req.params.id, function (err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ message: "Deleted", changes: this.changes });
  });
});

// Questions
app.post('/api/questions', (req, res) => {
  try {
    const { category_id, type, question_text, options, answer, explanation, year, font_size } = req.body;
    const stmt = db.prepare('INSERT INTO questions (category_id, type, question_text, options, answer, explanation, year, font_size) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    const info = stmt.run(category_id, type, question_text, JSON.stringify(options), answer, explanation, year, font_size);
    res.json({ id: info.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/questions/:id', (req, res) => {
  try {
    const { type, question_text, options, answer, explanation, year, font_size } = req.body;
    const stmt = db.prepare('UPDATE questions SET type = ?, question_text = ?, options = ?, answer = ?, explanation = ?, year = ?, font_size = ? WHERE id = ?');
    const info = stmt.run(type, question_text, JSON.stringify(options), answer, explanation, year, font_size, req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Question not found' });
    res.json({ message: "Updated", changes: info.changes });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/questions/:id', (req, res) => {
  db.run("DELETE FROM questions WHERE id = ?", req.params.id, function (err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ message: "Deleted", changes: this.changes });
  });
});

// Settings
app.get('/api/settings', (req, res) => {
  db.all("SELECT key, value FROM settings", [], (err, rows) => {
    if (err) return res.status(400).json({ error: err.message });
    const settings = {};
    rows.forEach(row => settings[row.key] = row.value);
    res.json(settings);
  });
});

app.post('/api/settings', (req, res) => {
  const settings = req.body; // { key: value, ... }
  const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");
    try {
      for (const [key, value] of Object.entries(settings)) {
        stmt.run(key, value);
      }
      db.run("COMMIT");
      res.json({ message: "Settings saved" });
    } catch (err) {
      db.run("ROLLBACK");
      res.status(400).json({ error: err.message });
    }
  });
});

// Rankings
// Rankings
app.get('/api/rankings/:category_id', (req, res) => {
  const categoryId = req.params.category_id;
  const userId = req.query.user_id;

  const response = {
    all: [],
    unique: [],
    personal: []
  };

  db.serialize(() => {
    // 1. All Scores (Top 20)
    db.all(`
      SELECT r.score, u.username, r.created_at
      FROM rankings r
      JOIN users u ON r.user_id = u.id
      WHERE r.category_id = ?
      ORDER BY r.score DESC
      LIMIT 20
    `, [categoryId], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      response.all = rows;

      // 2. Unique Users (Top 20)
      db.all(`
        SELECT MAX(r.score) as score, u.username, MAX(r.created_at) as created_at
        FROM rankings r
        JOIN users u ON r.user_id = u.id
        WHERE r.category_id = ?
        GROUP BY r.user_id
        ORDER BY score DESC
        LIMIT 20
      `, [categoryId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        response.unique = rows;

        // 3. Personal History (Top 20)
        if (userId) {
          db.all(`
            SELECT r.score, u.username, r.created_at
            FROM rankings r
            JOIN users u ON r.user_id = u.id
            WHERE r.category_id = ? AND r.user_id = ?
            ORDER BY r.score DESC
            LIMIT 20
          `, [categoryId, userId], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            response.personal = rows;
            res.json(response);
          });
        } else {
          res.json(response);
        }
      });
    });
  });
});

app.post('/api/rankings', (req, res) => {
  const { user_id, category_id, score } = req.body;
  const stmt = db.prepare('INSERT INTO rankings (user_id, category_id, score) VALUES (?, ?, ?)');
  const info = stmt.run(user_id, category_id, score);
  res.json({ id: info.lastInsertRowid });
});

// Admin: Get All Rankings (Latest 100)
app.get('/api/admin/rankings', (req, res) => {
  const sql = `
    SELECT r.id, r.score, r.created_at, u.username, c.name as category_name, s.name as subject_name
    FROM rankings r
    JOIN users u ON r.user_id = u.id
    JOIN categories c ON r.category_id = c.id
    JOIN subjects s ON c.subject_id = s.id
    ORDER BY r.created_at DESC
    LIMIT 100
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Admin: Delete Ranking
app.delete('/api/rankings/:id', (req, res) => {
  const stmt = db.prepare('DELETE FROM rankings WHERE id = ?');
  stmt.run(req.params.id, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// Start Server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
