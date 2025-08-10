import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const BOOKS_DIR = path.join(ROOT, 'data', 'books');
const INDEX_FILE = path.join(ROOT, 'data', 'books_index.json');

const CATS = [
  ["🎨 藝術與設計","art-design"],
  ["🔊 聲音與音樂","sound-music"],
  ["🧠 心智與心理學","mind-psych"],
  ["🌌 哲學與科普","philosophy-science"],
  ["📈 經濟與社會觀察","economy-society"],
  ["✍️ 語言與表達","language-expression"],
  ["🧭 自我成長與人生設計","self-growth-design"],
  ["👁️‍🗨️ 感官與風格","senses-style"],
  ["📚 知識與文明史","knowledge-civilization"],
  ["🧰 創新與問題解決","innovation-problem"]
];
const NAME_BY_SLUG = Object.fromEntries(CATS.map(([n,s])=>[s,n]));
const SLUG_BY_NAME = Object.fromEntries(CATS.map(([n,s])=>[n,s]));
const SLUG_SET = new Set(CATS.map(([,s])=>s));

const s = v => (typeof v === 'string' ? v.trim() : '');
const n = v => (Number.isFinite(v) ? v : null);

function resolveCategory(meta, hint){
  const slug = s(meta.category_slug);
  if (slug && SLUG_SET.has(slug)) return { slug, name: NAME_BY_SLUG[slug] };
  const name = s(meta.category);
  if (name && SLUG_BY_NAME[name]) return { slug: SLUG_BY_NAME[name], name };
  console.warn(`⚠ 無法解析分類：${hint} (category_slug='${meta.category_slug||''}', category='${meta.category||''}')`);
  return null;
}

function toIndexEntry(meta, hint){
  const cat = resolveCategory(meta, hint);
  if (!cat) return null;
  const entry = {
    id: s(meta.id),
    title: s(meta.title),
    author: s(meta.author),
    year: n(meta.year),
    category_slug: cat.slug,
    category: cat.name,
    tags: Array.isArray(meta.tags) ? meta.tags.filter(Boolean) : [],
    summary: s(meta.summary)
    // 不再輸出：rating / status / added_at
  };
  if (!entry.id){ console.warn(`⚠ 略過（缺 id）：${hint}`); return null; }
  if (!entry.title){ console.warn(`⚠ 略過（缺 title）：${hint}`); return null; }
  return entry;
}

async function readJSON(file){
  try{
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw);
  }catch(e){
    console.error(`✗ JSON 解析失敗：${file}\n  ${e.message}`);
    return null;
  }
}

async function main(){
  await fs.mkdir(BOOKS_DIR, { recursive: true });
  const entries = [];
  const dirs = await fs.readdir(BOOKS_DIR, { withFileTypes: true });
  const seen = new Set();

  for (const d of dirs){
    if (!d.isDirectory()) continue;
    const id = d.name;
    const metaPath = path.join(BOOKS_DIR, id, 'meta.json');
    try { await fs.access(metaPath); } catch { continue; }

    const meta = await readJSON(metaPath);
    if (!meta) continue;
    if (!meta.id) meta.id = id;

    const entry = toIndexEntry(meta, metaPath);
    if (!entry) continue;
    if (seen.has(entry.id)){ console.warn(`⚠ 重複 id（忽略）：${entry.id}`); continue; }
    seen.add(entry.id);
    entries.push(entry);
  }

  // 排序：標題 A→Z；若標題相同則年份（新→舊）
  entries.sort((a,b)=>{
    const t = (a.title||'').localeCompare(b.title||'');
    if (t !== 0) return t;
    const ya = a.year ?? -Infinity, yb = b.year ?? -Infinity;
    return yb - ya;
  });

  await fs.mkdir(path.dirname(INDEX_FILE), { recursive: true });
  await fs.writeFile(INDEX_FILE, JSON.stringify(entries, null, 2) + '\n', 'utf8');
  console.log(`✓ 已產生 ${INDEX_FILE}（${entries.length} 筆）`);
}

main().catch(e=>{ console.error(e); process.exit(1); });