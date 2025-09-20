// ../js/script.js
// Feed | Yapper – Noroff Social v2 integration with true pagination

const BASE_URL = "https://v2.api.noroff.dev/social";
const API_KEY = "f46433fb-6c5d-42f9-aa02-0751b52aa6fb";
const TOKEN = localStorage.getItem("yapper_token");

if (!TOKEN) {
  console.warn("No JWT in localStorage.yapper_token — API calls will 401.");
}

// ---------- utils ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const el = (t, cls = "", html = "") => {
  const n = document.createElement(t);
  if (cls) n.className = cls;
  if (html) n.innerHTML = html;
  return n;
};
const fmtDate = (iso) =>
  new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * Noroff v2 request helper returning {data, meta}
 * @template T
 * @param {string} path
 * @param {RequestInit & { query?: Record<string, string|number|boolean|undefined> }} [init]
 * @returns {Promise<{data:T, meta:any}>}
 */
export async function apiRequest(path, init = {}) {
  const url = new URL(BASE_URL + path);
  if (init.query) {
    for (const [k, v] of Object.entries(init.query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json");
  if (TOKEN) headers.set("Authorization", `Bearer ${TOKEN}`);
  headers.set("X-Noroff-API-Key", API_KEY);

  const res = await fetch(url, { ...init, headers });
  let json = null;
  try { json = await res.json(); } catch {}
  if (!res.ok) {
    const msg = json?.errors?.[0]?.message || res.statusText || "Request failed";
    const err = new Error(msg);
    err.status = res.status;
    err.payload = json;
    throw err;
  }
  return json ?? { data: null, meta: null };
}

// ---------- DOM ----------
const postsGrid = document.querySelector("[data-posts]");
const feedback = document.querySelector("[data-feed-feedback]");
const searchForms = $$("form[data-search-form]");
const desktopSearch = $("#desktop-search");
const logoutBtn = document.querySelector("[data-logout]");
const navDesktop = document.querySelector("header nav");
const pagination = document.querySelector("[data-pagination]");
const limitSelect = document.querySelector("[data-limit]");

// Mirror mobile nav on desktop (if empty)
if (navDesktop && navDesktop.children.length === 0) {
  navDesktop.innerHTML = `
    <a href="./" class="text-yellow-300 hover:underline">Feed</a>
    <a href="../profile/" class="text-yellow-300 hover:underline">Profile</a>
    <button data-logout class="text-red-400 hover:underline">Logout</button>
  `;
  navDesktop.querySelector("[data-logout]")?.addEventListener("click", handleLogout);
}

// ---------- state ----------
const state = {
  page: 1,
  limit: Number(limitSelect?.value || 24),
  q: "",
  _tag: "",
  loading: false,
  meta: null, // holds {currentPage, pageCount, ...}
};

// ---------- UI helpers ----------
function setFeedback(text = "") {
  if (feedback) feedback.textContent = text;
}

function skeletonCards(n = 8) {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < n; i++) {
    const card = el(
      "article",
      "bg-gray-900 rounded-lg overflow-hidden shadow animate-pulse"
    );
    card.innerHTML = `
      <div class="h-44 bg-gray-700"></div>
      <div class="p-4 space-y-3">
        <div class="h-4 bg-gray-700 rounded w-3/4"></div>
        <div class="h-3 bg-gray-700 rounded w-full"></div>
        <div class="h-3 bg-gray-700 rounded w-5/6"></div>
        <div class="h-3 bg-gray-700 rounded w-1/3"></div>
      </div>
    `;
    frag.appendChild(card);
  }
  return frag;
}

function emptyMessage(msg = "No posts found.") {
  const box = el(
    "div",
    "col-span-full text-center text-yellow-300 bg-gray-900 p-6 rounded"
  );
  box.textContent = msg;
  return box;
}

// ---------- render ----------
function renderPosts(posts) {
  postsGrid.innerHTML = "";
  if (!posts?.length) {
    postsGrid.appendChild(emptyMessage());
    return;
  }
  const frag = document.createDocumentFragment();
  for (const p of posts) frag.appendChild(renderCard(p));
  postsGrid.appendChild(frag);
}

function renderCard(p) {
  const {
    id, title, body, media, created, author,
    tags = [], _count = { comments: 0, reactions: 0 },
  } = p;

  const imgUrl =
    media?.url ||
    `https://picsum.photos/seed/yap-${encodeURIComponent(id)}/600/360`;
  const alt = media?.alt || (title ? `Image for ${title}` : "Post image");

  const card = el(
    "article",
    "bg-gray-900 rounded-lg overflow-hidden shadow hover:shadow-lg transition"
  );

  const tagChips = tags.slice(0, 4).map(
    (t) => `<button type="button"
            class="text-xs bg-gray-800 px-2 py-1 rounded hover:bg-gray-700"
            data-tag="${t}">#${t}</button>`
  ).join(" ");

  card.innerHTML = `
    <a href="../feed/post.html?id=${id}" class="block">
      <img src="${imgUrl}" alt="${alt}" class="w-full h-44 object-cover" loading="lazy">
    </a>
    <div class="p-4 space-y-2">
      <a href="../feed/post.html?id=${id}" class="block">
        <h3 class="font-semibold text-yellow-300 line-clamp-1">${title || "(untitled)"}</h3>
      </a>
      <p class="text-gray-300 text-sm line-clamp-3">${(body || "").slice(0, 200)}</p>

      <div class="flex items-center justify-between text-xs text-gray-400">
        <span title="${created}">${fmtDate(created)}</span>
        <span>by <strong class="text-gray-200">${author?.name ?? "Unknown"}</strong></span>
      </div>

      <div class="flex items-center justify-between text-xs text-gray-400">
        <div class="flex gap-2">${tagChips}</div>
        <div class="flex gap-3">
          <span title="Comments">💬 ${_count.comments ?? 0}</span>
          <span title="Reactions">❤️ ${_count.reactions ?? 0}</span>
        </div>
      </div>
    </div>
  `;

  // Tag filtering
  card.querySelectorAll("[data-tag]").forEach((btn) =>
    btn.addEventListener("click", () => {
      state._tag = btn.dataset.tag;
      state.q = "";
      state.page = 1;
      $("[name=search]")?.value && ($("[name=search]").value = "");
      desktopSearch && (desktopSearch.value = "");
      loadFeed({ reset: true });
      setFeedback(`Filtering by #${state._tag}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    })
  );

  return card;
}

// Build pagination UI (Prev, numbers, Next)
function renderPagination(meta) {
  if (!pagination) return;
  pagination.innerHTML = "";

  if (!meta?.pageCount || meta.pageCount <= 1) {
    // Nothing to paginate
    return;
  }

  const { currentPage, pageCount, totalCount } = meta;

  const bar = el("div", "flex items-center gap-2 flex-wrap w-full");

  const prev = el(
    "button",
    "bg-gray-900 text-yellow-300 border border-gray-700 px-3 py-1 rounded disabled:opacity-40",
    "Prev"
  );
  prev.disabled = meta.isFirstPage;
  prev.addEventListener("click", () => {
    if (state.page > 1) {
      state.page -= 1;
      loadFeed({ reset: true });
      scrollToTop();
    }
  });
  bar.appendChild(prev);

  // Window of page numbers around current
  const windowSize = 5;
  let start = Math.max(1, currentPage - Math.floor(windowSize / 2));
  let end = start + windowSize - 1;
  if (end > pageCount) {
    end = pageCount;
    start = Math.max(1, end - windowSize + 1);
  }

  // Maybe show first and ellipsis
  if (start > 1) {
    bar.appendChild(pageBtn(1));
    if (start > 2) bar.appendChild(ellipsis());
  }
  for (let p = start; p <= end; p++) bar.appendChild(pageBtn(p));
  // Maybe show ellipsis and last
  if (end < pageCount) {
    if (end < pageCount - 1) bar.appendChild(ellipsis());
    bar.appendChild(pageBtn(pageCount));
  }

  const next = el(
    "button",
    "bg-gray-900 text-yellow-300 border border-gray-700 px-3 py-1 rounded disabled:opacity-40",
    "Next"
  );
  next.disabled = meta.isLastPage;
  next.addEventListener("click", () => {
    if (state.page < pageCount) {
      state.page += 1;
      loadFeed({ reset: true });
      scrollToTop();
    }
  });
  bar.appendChild(next);

  // Right-aligned stats
  const stats = el(
    "div",
    "ml-auto text-xs text-yellow-300",
    `Page ${currentPage} of ${pageCount} · ${typeof totalCount === "number" ? totalCount : "?"} posts`
  );

  pagination.appendChild(bar);
  pagination.appendChild(stats);

  function pageBtn(p) {
    const b = el(
      "button",
      `min-w-8 px-3 py-1 rounded border ${p === currentPage
        ? "bg-yellow-400 text-gray-900 border-yellow-400 font-semibold"
        : "bg-gray-900 text-yellow-300 border-gray-700 hover:bg-gray-800"}`
    , String(p));
    b.disabled = p === currentPage;
    b.addEventListener("click", () => {
      if (state.page !== p) {
        state.page = p;
        loadFeed({ reset: true });
        scrollToTop();
      }
    });
    return b;
  }
  function ellipsis() {
    return el("span", "px-1 text-yellow-300 select-none", "…");
    }
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ---------- data fetch ----------
async function loadFeed({ reset = false } = {}) {
  if (state.loading) return;
  state.loading = true;

  postsGrid.innerHTML = "";
  postsGrid.appendChild(skeletonCards(8));
  setFeedback("Loading…");
  pagination.innerHTML = "";

  try {
    const baseParams = {
      page: state.page,
      limit: state.limit,
      _author: true,
    };

    const json = state.q
      ? await apiRequest("/posts/search", { query: { ...baseParams, q: state.q } })
      : await apiRequest("/posts", { query: { ...baseParams, _tag: state._tag || undefined } });

    const { data, meta } = json;
    state.meta = meta || null;

    renderPosts(data);
    renderPagination(meta);

    setFeedback(
      data?.length
        ? state.q
          ? `Showing results for “${state.q}”`
          : state._tag
          ? `Showing posts tagged #${state._tag}`
          : ""
        : "No posts found."
    );
  } catch (err) {
    postsGrid.innerHTML = "";
    postsGrid.appendChild(
      emptyMessage(
        `Could not load feed: ${err.message}${err.status ? ` (HTTP ${err.status})` : ""}`
      )
    );
    setFeedback("");
  } finally {
    state.loading = false;
  }
}

/**
 * Fetches posts from the API and renders them.
 * @param {string} [query] - Optional search query.
 * @returns {Promise<void>}
 * @example
 * fetchPosts('finance');
 */
export async function fetchPosts(query = '') {
    try {
        const response = await apiRequest(url);
        console.log('API response:', response); // Debugging output
        const posts = Array.isArray(response?.data) ? response.data : [];
        renderPosts(posts);
    } catch (error) {
        console.error('API error:', error); // Debugging output
    }
}

// ---------- events ----------
searchForms.forEach((form) => {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    state.q = (fd.get("search") || "").toString().trim();
    state._tag = "";
    state.page = 1;
    loadFeed({ reset: true });
  });
});

// desktop live-search (debounced)
if (desktopSearch) {
  let t;
  desktopSearch.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(() => {
      state.q = desktopSearch.value.trim();
      state._tag = "";
      state.page = 1;
      loadFeed({ reset: true });
    }, 400);
  });
}

// page size
limitSelect?.addEventListener("change", () => {
  state.limit = Number(limitSelect.value);
  state.page = 1;
  loadFeed({ reset: true });
});

// logout
if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);
function handleLogout(e) {
  e?.preventDefault?.();
  localStorage.removeItem("yapper_token");
  location.href = "../";
}

// init
if (document.body?.dataset.page === "feed") {
  loadFeed({ reset: true });
}

posts.forEach(({ id, title, body, media, tags }) => {
    // Use destructured variables directly
});

