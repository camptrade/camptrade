// netlify/edge-functions/seo.js
// Hər sorğuda Supabase-dən məlumatı oxuyur və səhifənin HTML-inə əlavə edir:
//   title, description, canonical, Open Graph (WhatsApp önizləməsi), JSON-LD və hazır məzmun.
// Beləliklə Google (və WhatsApp) JavaScript işləmədən də məzmunu görür.
// Səhifələrin özündəki JavaScript əvvəlki kimi işləyir və məzmunu yenidən çəkir.

const SB = "https://iupwahtmnybxrowbkcfs.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1cHdhaHRtbnlieHJvd2JrY2ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMTU3MDksImV4cCI6MjA5NTg5MTcwOX0.QG1fL54mB8-mMKhb3Amc7W7yhTAfo3mCP5UubdVqw4E";
const SITE = "https://camptrade.az";
const MONTHS = ["Yanvar","Fevral","Mart","Aprel","May","İyun","İyul","Avqust","Sentyabr","Oktyabr","Noyabr","Dekabr"];

export const config = {
  path: [
    "/product", "/product.html",
    "/blog-post", "/blog-post.html",
    "/satis", "/satis.html",
    "/kiraye", "/kiraye.html",
    "/blog", "/blog.html",
  ],
};

/* ---------- köməkçi funksiyalar ---------- */
const esc = (s) =>
  String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const stripTags = (h) =>
  String(h || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

const cut = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…");

const absUrl = (u) => {
  u = String(u || "").trim();
  if (!u) return SITE + "/images/logo.jpeg";
  return /^https?:\/\//i.test(u) ? u : SITE + "/" + u.replace(/^\/+/, "");
};

const fmtDate = (d) => {
  const x = new Date(d);
  return isNaN(x.getTime()) ? "" : x.getDate() + " " + MONTHS[x.getMonth()] + " " + x.getFullYear();
};

const jsonLd = (obj) =>
  '<script type="application/ld+json">' + JSON.stringify(obj).replace(/</g, "\\u003c") + "</script>";

async function sb(path) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4000);
  try {
    const r = await fetch(SB + "/rest/v1/" + path, {
      headers: { apikey: KEY, Authorization: "Bearer " + KEY },
      signal: ctrl.signal,
    });
    if (!r.ok) return null;
    const d = await r.json();
    return Array.isArray(d) ? d : null;
  } catch (e) {
    return null; // Supabase işləməsə səhifə əvvəlki kimi qalır
  } finally {
    clearTimeout(t);
  }
}

function setHead(html, title, desc, url, image, ogType, ld) {
  const tags = [
    '<meta name="description" content="' + esc(desc) + '">',
    '<link rel="canonical" href="' + esc(url) + '">',
    '<meta property="og:site_name" content="CampTrade">',
    '<meta property="og:type" content="' + ogType + '">',
    '<meta property="og:locale" content="az_AZ">',
    '<meta property="og:title" content="' + esc(title) + '">',
    '<meta property="og:description" content="' + esc(desc) + '">',
    '<meta property="og:url" content="' + esc(url) + '">',
    '<meta property="og:image" content="' + esc(image) + '">',
    '<meta name="twitter:card" content="summary_large_image">',
    ld ? jsonLd(ld) : "",
  ].join("\n");

  return html
    .replace(/<title>[\s\S]*?<\/title>/i, () => "<title>" + esc(title) + "</title>")
    .replace(/<meta\s+name="description"[^>]*>\s*/gi, "")
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, "")
    .replace(/<\/head>/i, () => tags + "\n</head>");
}

/* ---------- hazır məzmun şablonları (səhifənin JS şablonlarının surəti) ---------- */
function blogBody(b) {
  const cover = b.sekil
    ? '<img class="hero-img" src="' + esc(b.sekil) + '" alt="' + esc(b.baslig) + '">'
    : '<div class="hero-ph">📰</div>';
  return (
    '<section class="hero">' + cover +
    '<div class="hero-top"></div><div class="hero-shade"></div>' +
    '<a href="blog.html" class="back-btn">← Bloga Qayıt</a>' +
    '<div class="hero-text"><span class="tag">' + esc(b.kateqoriya) + "</span><h1>" + esc(b.baslig) + "</h1>" +
    '<div class="meta"><span>📅 ' + fmtDate(b.created_at) + "</span></div></div></section>" +
    '<div class="band"><div class="grid"><article class="article"><div class="body">' + (b.metn || "") +
    '</div></article><aside class="side"></aside></div></div>'
  );
}

function productBody(p) {
  const imgs = String(p.sekiller || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!imgs.length) imgs.push("images/logo.jpeg");
  const isRent = p.kateqoriya === "kiraye";
  const sub = p.alt_kateqoriya || "Digər";
  const num = String(p.whatsapp || "").replace(/\D/g, "");
  const thumbs = imgs.length > 1
    ? '<div class="thumbs">' + imgs.map((s, i) => '<img src="' + esc(s) + '" alt="' + esc(p.ad) + " " + (i + 1) + '" class="' + (i ? "" : "on") + '">').join("") + "</div>"
    : "";
  return (
    '<div class="crumb"><a href="index.html">Ana Səhifə</a> / <a href="' + (isRent ? "kiraye.html" : "satis.html") + '">' +
    (isRent ? "Kirayə" : "Satılıq") + "</a> / " + esc(sub) + "</div>" +
    '<div class="layout"><div class="gal"><div class="main"><img id="big" src="' + esc(imgs[0]) + '" alt="' + esc(p.ad) + '"></div>' + thumbs + "</div>" +
    '<div class="info"><h1>' + esc(p.ad) + "</h1>" +
    '<div class="badges"><span class="b">' + (isRent ? "Kirayə" : "Satılıq") + " / " + esc(sub) + "</span>" +
    (p.veziyyet && !isRent ? '<span class="b o">' + esc(p.veziyyet) + "</span>" : "") + '<span class="b g">✔ Mövcuddur</span></div>' +
    '<div class="price"><small>' + (isRent ? "Kirayə qiyməti" : "Qiymət") + "</small><b>" + esc(p.qiymet) + " ₼</b></div>" +
    '<div class="desc-t">📋 Məhsul haqqında</div><div class="desc">' + esc(p.melumat) + "</div>" +
    '<div class="acts"><a class="btn2 wa" target="_blank" href="https://wa.me/' + num + '">💬 WhatsApp</a>' +
    '<a class="btn2" href="tel:+' + num + '">📞 Zəng et</a></div></div></div>'
  );
}

function productCards(list) {
  return list.map((p) => {
    const img = String(p.sekiller || "").split(",")[0].trim() || "images/logo.jpeg";
    return (
      '<a class="card" href="product.html?id=' + encodeURIComponent(p.id) + '">' +
      '<div class="im"><img src="' + esc(img) + '" alt="' + esc(p.ad) + '" loading="lazy"><span class="tag">' + esc(p.alt_kateqoriya || "Digər") + "</span></div>" +
      '<div class="in"><h3>' + esc(p.ad) + '</h3><div class="pr">' + esc(p.qiymet) + ' AZN</div><div class="cd">' + esc(p.veziyyet || "") + "</div></div></a>"
    );
  }).join("");
}

function blogCards(list) {
  return list.map((b) => {
    const img = b.sekil
      ? '<div class="blog-img"><img src="' + esc(b.sekil) + '" alt="' + esc(b.baslig) + '"></div>'
      : '<div class="blog-img">📰</div>';
    return (
      '<div class="blog-card">' + img + '<div class="blog-info"><span class="blog-tag">' + esc(b.kateqoriya) + "</span>" +
      "<h3>" + esc(b.baslig) + '</h3><div class="blog-meta"><span>📅 ' + fmtDate(b.created_at) + "</span><span>⏱️ " + esc(b.oxuma_muddeti) + "</span></div>" +
      '<a href="blog-post.html?id=' + encodeURIComponent(b.id) + '" class="read-more">Davam et →</a></div></div>'
    );
  }).join("");
}

/* ---------- əsas hissə ---------- */
export default async (request, context) => {
  const response = await context.next();
  const type = response.headers.get("content-type") || "";
  if (response.status !== 200 || !type.includes("text/html")) return response;

  const url = new URL(request.url);
  const path = url.pathname.replace(/\.html$/, "").replace(/\/+$/, "");
  const id = url.searchParams.get("id");
  const filtered = url.searchParams.has("g") || url.searchParams.has("c");
  const original = await response.text();
  let html = original;
  let status = 200;

  try {
    if (path === "/blog-post" && id) {
      const d = await sb("blogs?id=eq." + encodeURIComponent(id));
      if (d && !d.length) {
        status = 404;
      } else if (d && d[0]) {
        const b = d[0];
        const canon = SITE + "/blog-post.html?id=" + encodeURIComponent(b.id);
        const desc = cut(stripTags(b.metn) || b.baslig + " - CampTrade blogu", 155);
        const ld = {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: b.baslig,
          description: desc,
          image: [absUrl(b.sekil)],
          datePublished: b.created_at,
          mainEntityOfPage: canon,
          author: { "@type": "Organization", name: "CampTrade" },
          publisher: { "@type": "Organization", name: "CampTrade", logo: { "@type": "ImageObject", url: SITE + "/images/logo.jpeg" } },
        };
        html = setHead(html, b.baslig + " — CampTrade Blog", desc, canon, absUrl(b.sekil), "article", ld);
        html = html.replace(
          /<div id="postContent">[\s\S]*?Yazı yüklənir\.\.\.<\/p>\s*<\/div>\s*<\/div>/,
          () => '<div id="postContent">' + blogBody(b) + "</div>"
        );
      }
    } else if (path === "/product" && id) {
      const d = await sb("products?id=eq." + encodeURIComponent(id));
      if (d && !d.length) {
        status = 404;
      } else if (d && d[0]) {
        const p = d[0];
        const isRent = p.kateqoriya === "kiraye";
        const label = isRent ? "Kirayə" : "Satılıq";
        const canon = SITE + "/product.html?id=" + encodeURIComponent(p.id);
        const first = String(p.sekiller || "").split(",")[0];
        const title = p.ad + " – " + label + " | CampTrade";
        const desc = cut(p.ad + " – " + label.toLowerCase() + ", " + p.qiymet + " AZN. " + stripTags(p.melumat), 155);
        const price = String(p.qiymet || "").replace(/[^\d.,]/g, "").replace(",", ".");
        const imgs = String(p.sekiller || "").split(",").map((s) => absUrl(s)).filter(Boolean);
        const ld = {
          "@context": "https://schema.org",
          "@type": "Product",
          name: p.ad,
          description: stripTags(p.melumat) || p.ad,
          image: imgs.length ? imgs : [absUrl("")],
          category: p.alt_kateqoriya || undefined,
        };
        if (price) {
          ld.offers = {
            "@type": "Offer",
            url: canon,
            price: price,
            priceCurrency: "AZN",
            availability: "https://schema.org/InStock",
          };
        }
        html = setHead(html, title, desc, canon, absUrl(first), "product", ld);
        html = html.replace(
          /<div class="wrap" id="root">\s*<div class="state">[^<]*<\/div>\s*<\/div>/,
          () => '<div class="wrap" id="root">' + productBody(p) + "</div>"
        );
      }
    } else if ((path === "/satis" || path === "/kiraye") && !filtered) {
      const cat = path.slice(1);
      const d = await sb("products?kateqoriya=eq." + cat + "&order=created_at.desc&limit=12");
      if (d && d.length) {
        html = html.replace(
          /(<div class="grid" id="grid">)\s*<div class="msg"[^>]*>[^<]*<\/div>\s*(<\/div>)/,
          (m, a, c) => a + productCards(d) + c
        );
      }
    } else if (path === "/blog" && !filtered) {
      const d = await sb("blogs?order=created_at.desc&limit=100");
      if (d && d.length) {
        html = html
          .replace(/<div class="loading" id="loading"[^>]*>[^<]*<\/div>/, () => '<div class="loading" id="loading" style="display:none"></div>')
          .replace(/<div class="blog-grid" id="blogGrid"[^>]*>\s*<\/div>/, () => '<div class="blog-grid" id="blogGrid">' + blogCards(d) + "</div>");
      }
    }
  } catch (e) {
    html = original; // nəsə səhv getsə, səhifə dəyişməz qalır
    status = 200;
  }

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(html, { status, headers });
};