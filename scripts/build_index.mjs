import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const BOOKS_DIR = path.join(ROOT, 'data', 'books');
const INDEX_FILE = path.join(ROOT, 'data', 'books_index.json');

// 允許的分類（slug ↔ 顯示名稱）
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

function normString(v){ return (typeof v === 'string' ? v.trim() : ''); }

function resolveCategory(meta, hint){
  // 優先用 category_slug
  const slug = normString(meta.category_slug);
  if (slug && SLUG_SET.has(slug)) return { slug, name: NAME_BY_SLUG[slug] };
  // 退回用 category（顯示名）
  const name = normString(meta.category);
  if (name && SLUG_BY_NAME[name]) return { slug: SLUG_BY_NAME[name], name };
  console.warn(`⚠ 無法解析分類：${hint} (category_slug='${meta.category_slug||''}', category='${meta.category||''}')`);
  return null;
}

function toIndexEntry(meta, hint){
  const cat = resolveCategory(meta, hint);
  if (!cat) return null;
  const entry = {
    id: normString(meta.id),
    title: normString(meta.title),
    author: normString(meta.author),
    year: Number.isFinite(meta.year) ? meta.year : null,
    category_slug: cat.slug,
    category: cat.name,
    tags: Array.isArray(meta.tags) ? meta.tags.filter(Boolean) : [],
    rating: typeof meta.rating === 'number' ? meta.rating : 0,
    status: normString(meta.status),
    added_at: normString(meta.added_at),
    summary: normString(meta.summary)
  };
  // 基本驗證
  if (!entry.id){ console.warn(`⚠ 略過（缺 id）：${hint}`); return null; }
  if (!entry.title){ console.warn(`⚠ 略過（缺 title）：${hint}`); return null; }
  return entry;
}

async function safeReadJSON(file){
  try{
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw);
  }catch(e){
    console.error(`✗ JSON 解析失敗：${file}\n  ${e.message}`);
    return null;
  }
}

async function main(){
  try { await fs.access(BOOKS_DIR); } catch { await fs.mkdir(BOOKS_DIR, { recursive: true }); }

  const entries = [];
  const dirs = await fs.readdir(BOOKS_DIR, { withFileTypes: true });

  const seenIds = new Set();

  for (const d of dirs){
    if (!d.isDirectory()) continue;
    const id = d.name;
    const metaPath = path.join(BOOKS_DIR, id, 'meta.json');
    try { await fs.access(metaPath); } catch { continue; }

    const meta = await safeReadJSON(metaPath);
    if (!meta) continue;

    if (!meta.id) meta.id = id; // 用資料夾名回填 id
    if (!meta.added_at){
      try {
        const st = await fs.stat(metaPath);
        meta.added_at = new Date(st.mtime).toISOString();
      } catch {}
    }

    const entry = toIndexEntry(meta, metaPath);
    if (!entry) continue;

    if (seenIds.has(entry.id)){
      console.warn(`⚠ 重複 id，僅保留第一筆：${entry.id}（來源：${metaPath}）`);
      continue;
    }
    seenIds.add(entry.id);
    entries.push(entry);
  }

  // 排序：新增時間 desc，其次標題
  entries.sort((a,b)=>{
    const da = a.added_at ? new Date(a.added_at).getTime() : 0;
    const db = b.added_at ? new Date(b.added_at).getTime() : 0;
    if (db !== da) return db - da;
    return (a.title||'').localeCompare(b.title||'');
  });

  await fs.mkdir(path.dirname(INDEX_FILE), { recursive: true });
  await fs.writeFile(INDEX_FILE, JSON.stringify(entries, null, 2) + '\n', 'utf8');
  console.log(`✓ 已產生 ${INDEX_FILE}（${entries.length} 筆）`);
}

main().catch(e=>{ console.error(e); process.exit(1); });
