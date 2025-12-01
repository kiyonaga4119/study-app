const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = path.resolve(__dirname, 'sentaku.db');
const EXPORT_PATH = path.resolve(__dirname, 'exports', '英語_神奈川　高校入試過去問　適語選択.csv');

// Ensure exports dir exists
if (!fs.existsSync(path.dirname(EXPORT_PATH))) {
  fs.mkdirSync(path.dirname(EXPORT_PATH));
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
});

const KANA_MAP = {
  'ア': 'sect1',
  'イ': 'sect2',
  'ウ': 'sect3',
  'エ': 'sect4'
};

db.all("SELECT * FROM en_sentaku4", [], (err, rows) => {
  if (err) {
    console.error('Error querying database:', err.message);
    process.exit(1);
  }

  const header = 'subject,category,type,question,options,answer,explanation\n';
  const csvRows = rows.map(row => {
    const subject = '英語';
    // Use Year as Category
    const category = row.year ? `${row.year}年` : '不明な年代';
    const type = 'selection';
    const question = row.ques;

    const optionsArr = [row.sect1, row.sect2, row.sect3, row.sect4];
    // Filter out empty options
    const validOptions = optionsArr.filter(o => o !== null && o !== undefined && o !== '');
    const options = validOptions.join(',');

    // Answer is always the first option (sect1)
    const answer = row.sect1;

    // Use original category (topic) as explanation
    const explanation = row.category ? `分野: ${row.category}` : '';

    // Escape CSV fields
    const escape = (text) => {
      if (text === null || text === undefined) return '';
      const str = String(text);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    return [
      escape(subject),
      escape(category),
      escape(type),
      escape(question),
      escape(options),
      escape(answer),
      escape(explanation)
    ].join(',');
  });

  const csvContent = '\uFEFF' + header + csvRows.join('\n');

  fs.writeFile(EXPORT_PATH, csvContent, (err) => {
    if (err) {
      console.error('Error writing CSV:', err);
    } else {
      console.log(`Successfully exported ${rows.length} rows to ${EXPORT_PATH}`);
    }
    db.close();
  });
});
