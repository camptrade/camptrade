// netlify/edge-functions/sitemap.js
// https://camptrade.az/sitemap.xml ünvanını avtomatik yaradır.
// Yeni məhsul və ya blog yazısı əlavə etdikdə heç nə etmək lazım deyil:
// sitemap hər açılanda bazadan oxuyur (nəticə 1 saat keşlənir).

const SB = "https://iupwahtmnybxrowbkcfs.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1cHdhaHRtbnlieHJvd2JrY2ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMTU3MDksImV4cCI6MjA5NTg5MTcwOX0.QG1fL54mB8-mMKhb3Amc7W7yhTAfo3mCP5UubdVqw4E";
const SITE = "https://camptrade.az";

export const config = { path: "/sitemap.xml" };

const xml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));

// Supabase bir sorğuda ən çoxu 1000 sətir qaytarır, ona görə hissə-hissə oxuyuruq
async function ids(table) {
  const out = [];
  let ok = true;
  for (let from = 0; from < 20000; from += 1000) {
    try {
      const r = await fetch(SB + "/rest/v1/" + table + "?select=id&order=created_at.desc", {
        headers: { apikey: KEY, Authorization: "Bearer " + KEY, "Range-Unit": "items", Range: from + "-" + (from + 999) },
      });
      if (!r.ok) { ok = false; break; }
      const d = await r.json();
      if (!Array.isArray(d)) { ok = false; break; }
      d.forEach((x) => out.push(x.id));
      if (d.length < 1000) break;
    } catch (e) {
      ok = false;
      break;
    }
  }
  return { list: out, ok };
}

export default async () => {
  const [prods, blogs] = await Promise.all([ids("products"), ids("blogs")]);

  const urls = ["/", "/satis", "/kiraye", "/blog", "/sat", "/elaqe"].map((p) => SITE + p);
  prods.list.forEach((id) => urls.push(SITE + "/product.html?id=" + encodeURIComponent(id)));
  blogs.list.forEach((id) => urls.push(SITE + "/blog-post.html?id=" + encodeURIComponent(id)));

  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => "  <url><loc>" + xml(u) + "</loc></url>").join("\n") +
    "\n</urlset>\n";

  return new Response(body, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      // baza oxunmayıbsa nəticəni keşləmirik
      "cache-control": prods.ok && blogs.ok ? "public, max-age=3600" : "no-store",
    },
  });
};