const http = require('http');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3000/api';
const EXPORT_DIR = path.join(__dirname, 'exports');

if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR);
}

// Helper to fetch JSON
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Helper to download file
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    http.get(url, (res) => {
      res.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => { });
      reject(err);
    });
  });
}

async function main() {
  try {
    console.log('Fetching subjects...');
    const subjectsRes = await fetchJson(`${API_BASE}/subjects`);
    const subjects = subjectsRes.data;

    for (const subject of subjects) {
      console.log(`Processing Subject: ${subject.name}`);
      const categoriesRes = await fetchJson(`${API_BASE}/categories/${subject.id}`);
      const categories = categoriesRes.data;

      for (const category of categories) {
        console.log(`  Exporting Category: ${category.name}`);
        const filename = `${subject.name}_${category.name}.csv`.replace(/[\\/:*?"<>|]/g, '_'); // Sanitize
        const dest = path.join(EXPORT_DIR, filename);

        await downloadFile(
          `${API_BASE}/export/csv?subject_id=${subject.id}&category_id=${category.id}`,
          dest
        );
        console.log(`    Saved to ${filename}`);
      }
    }
    console.log('Done! All files exported to ./exports directory.');
  } catch (e) {
    console.error('Error:', e);
  }
}

main();
