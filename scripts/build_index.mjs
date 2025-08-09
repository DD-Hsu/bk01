import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const BOOKS_DIR = path.join(ROOT, 'data', 'books');
const INDEX_FILE = path.join(ROOT, 'data', 'books_index.json');

function toIndexEntry(meta) {
  return {
    id: meta.id ?? '',
    title: meta.title ?? '',
    author: meta.author ?? '',
    year: meta.year ?? null,
    category: meta.category ?? '',
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    rating: typeof meta.rating === 'number' ? meta.rating : 0,
    status: meta.status ?? '',
    added_at: meta.added_at ?? '',
    summary: meta.summary ?? ''
  };
}

async function safeReadJSON(file) {
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`✗ 解析失敗：${file}\n`, err.message);
    return null;
  }
}

async function main() {
  const entries = [];
  const ids = await fs.readdir(BOOKS_DIR, { withFileTypes: true });
  for (const dirent of ids) {
    if (!dirent.isDirectory()) continue;
    const id = dirent.name;
    const metaPath = path.join(BOOKS_DIR, id, 'meta.json');
    try { await fs.access(metaPath); } catch { continue; }
    const meta = await safeReadJSON(metaPath);
    if (!meta) continue;
    if (!meta.id) meta.id = id;
    entries.push(toIndexEntry(meta));
  }
  entries.sort((a,b)=>{
    const da = a.added_at ? new Date(a.added_at).getTime() : 0;
    const db = b.added_at ? new Date(b.added_at).getTime() : 0;
    if (db !== da) return db - da;
    return (a.title || '').localeCompare(b.title || '');
  });
  await fs.writeFile(INDEX_FILE, JSON.stringify(entries, null, 2) + '\n', 'utf8');
  console.log(`✓ 已生成 ${INDEX_FILE}（共 ${entries.length} 筆）`);
}

main();
