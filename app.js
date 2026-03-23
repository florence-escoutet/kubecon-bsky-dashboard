// KubeCon Bluesky Pulse — Dashboard App
(async function () {
    const resp = await fetch("data/dashboard.json");
    const D = await resp.json();

    const $ = (s) => document.querySelector(s);
    const $$ = (s) => document.querySelectorAll(s);
    const fmt = (n) =>
        n >= 1e6 ? (n / 1e6).toFixed(1) + "M" :
        n >= 1e3 ? (n / 1e3).toFixed(1) + "k" : String(n);
    const timeAgo = (iso) => {
        if (!iso) return "";
        const diff = (Date.now() - new Date(iso).getTime()) / 1000;
        if (diff < 60) return "now";
        if (diff < 3600) return Math.floor(diff / 60) + "m";
        if (diff < 86400) return Math.floor(diff / 3600) + "h";
        return Math.floor(diff / 86400) + "d";
    };
    const esc = (s) =>
        s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const isMobile = window.innerWidth < 640;

    // All posts for word-cloud click-through
    const allPosts = [...D.top_posts, ...D.recent_posts];

    // ── Tabs ─────────────────────────────────────────────────
    $$(".tab").forEach((btn) => {
        btn.addEventListener("click", () => {
            $$(".tab").forEach((b) => b.classList.remove("active"));
            $$(".tab-content").forEach((c) => c.classList.remove("active"));
            btn.classList.add("active");
            $(`#tab-${btn.dataset.tab}`).classList.add("active");
        });
    });

    // ── Header ───────────────────────────────────────────────
    const updStr = D.generated_at
        ? new Date(D.generated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "—";
    $("#meta-updated").textContent = updStr;
    $("#meta-posts").textContent = fmt(D.summary.total_posts);

    // ── Stats ────────────────────────────────────────────────
    const S = D.summary;
    $("#s-posts").textContent = fmt(S.total_posts);
    $("#s-authors").textContent = fmt(S.total_authors);
    $("#s-24h").textContent = fmt(S.last_24h_posts);
    $("#s-likes").textContent = fmt(S.total_likes);
    $("#s-reposts").textContent = fmt(S.total_reposts);
    $("#s-overlap").textContent = fmt(S.both_sources);

    // ── Palette ──────────────────────────────────────────────
    const PAL = ["#58a6ff","#3fb950","#d29922","#f778ba","#a371f7",
                 "#f85149","#79c0ff","#56d364","#e3b341","#ff7b72"];
    Chart.defaults.color = "#8b949e";
    Chart.defaults.borderColor = "#30363d33";

    // ── Timeline ─────────────────────────────────────────────
    if (D.timeline.length) {
        // Group by showing only the last 72h for the detailed view
        const cutoff = new Date(Date.now() - 72 * 3600 * 1000).toISOString();
        const recent = D.timeline.filter(t => t.hour >= cutoff);
        const tData = recent.length > 6 ? recent : D.timeline.slice(-72);
        const labels = tData.map((t) => {
            const d = new Date(t.hour);
            return d.toLocaleDateString("en", { weekday: "short" }) +
                " " + d.getHours().toString().padStart(2, "0") + "h";
        });
        new Chart($("#chart-timeline"), {
            type: "bar",
            data: {
                labels,
                datasets: [
                    {
                        label: "Posts",
                        data: tData.map((t) => t.count),
                        backgroundColor: "#58a6ff44",
                        borderColor: "#58a6ff",
                        borderWidth: 1,
                        borderRadius: 2,
                        order: 2,
                    },
                    {
                        label: "Likes",
                        data: tData.map((t) => t.likes),
                        type: "line",
                        borderColor: "#f85149",
                        backgroundColor: "#f8514918",
                        fill: true,
                        tension: 0.35,
                        pointRadius: 0,
                        borderWidth: 1.5,
                        yAxisID: "y1",
                        order: 1,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: !isMobile,
                interaction: { mode: "index", intersect: false },
                plugins: {
                    legend: { position: "top", align: "end", labels: { boxWidth: 10, padding: 10, font: { size: 11 } } },
                },
                scales: {
                    x: { ticks: { maxRotation: 0, maxTicksLimit: isMobile ? 6 : 18, font: { size: 10 } } },
                    y: { position: "left", title: { display: !isMobile, text: "Posts", font: { size: 10 } }, ticks: { font: { size: 10 } } },
                    y1: { position: "right", title: { display: !isMobile, text: "Likes", font: { size: 10 } }, ticks: { font: { size: 10 } }, grid: { display: false } },
                },
            },
        });
    }

    // ── Daily Trend ──────────────────────────────────────────
    if (D.daily && D.daily.length) {
        // Show only last 14 days
        const dailyData = D.daily.slice(-14);
        new Chart($("#chart-daily"), {
            type: "bar",
            data: {
                labels: dailyData.map(d => {
                    const dt = new Date(d.day + "T12:00:00Z");
                    return dt.toLocaleDateString("en", { month: "short", day: "numeric" });
                }),
                datasets: [
                    {
                        label: "Posts",
                        data: dailyData.map(d => d.posts),
                        backgroundColor: "#58a6ff66",
                        borderColor: "#58a6ff",
                        borderWidth: 1,
                        borderRadius: 3,
                        order: 2,
                    },
                    {
                        label: "Authors",
                        data: dailyData.map(d => d.authors),
                        type: "line",
                        borderColor: "#3fb950",
                        backgroundColor: "#3fb95020",
                        fill: true,
                        tension: 0.3,
                        pointRadius: 3,
                        pointBackgroundColor: "#3fb950",
                        borderWidth: 2,
                        order: 1,
                    },
                ],
            },
            options: {
                responsive: true,
                plugins: { legend: { position: "top", align: "end", labels: { boxWidth: 10, font: { size: 11 } } } },
                scales: {
                    x: { ticks: { font: { size: 10 } } },
                    y: { ticks: { font: { size: 10 } }, beginAtZero: true },
                },
            },
        });
    }

    // ── Category bars ────────────────────────────────────────
    const catBars = $("#cat-bars");
    if (D.categories.length) {
        const maxCat = Math.max(...D.categories.map((c) => c.count));
        D.categories.forEach((c, i) => {
            const pct = (c.count / maxCat) * 100;
            const row = document.createElement("div");
            row.className = "hbar-row";
            row.innerHTML = `
                <span class="hbar-label">${esc(c.name)}</span>
                <div class="hbar-track">
                    <div class="hbar-fill" style="width:${pct}%;background:${PAL[i % PAL.length]}"></div>
                </div>
                <span class="hbar-value">${c.count}</span>
            `;
            catBars.appendChild(row);
        });
    }

    // ── Language bars ────────────────────────────────────────
    const langBars = $("#lang-bars");
    if (D.languages && D.languages.length) {
        const LANG_NAMES = {
            en: "English", de: "German", fr: "French", es: "Spanish", ja: "Japanese",
            pt: "Portuguese", zh: "Chinese", ko: "Korean", nl: "Dutch", it: "Italian",
            ru: "Russian", da: "Danish", sv: "Swedish", uk: "Ukrainian", ar: "Arabic",
        };
        const maxLang = D.languages[0].count;
        D.languages.forEach((l, i) => {
            const pct = (l.count / maxLang) * 100;
            const name = LANG_NAMES[l.lang] || l.lang;
            const row = document.createElement("div");
            row.className = "hbar-row";
            row.innerHTML = `
                <span class="hbar-label">${esc(name)}</span>
                <div class="hbar-track">
                    <div class="hbar-fill" style="width:${pct}%;background:${PAL[i % PAL.length]}"></div>
                </div>
                <span class="hbar-value">${l.count}</span>
            `;
            langBars.appendChild(row);
        });
    }

    // ── Sources donut ────────────────────────────────────────
    new Chart($("#chart-sources"), {
        type: "doughnut",
        data: {
            labels: ["Feed only", "Search only", "Both"],
            datasets: [{
                data: [S.feed_only, S.search_only, S.both_sources],
                backgroundColor: ["#58a6ff", "#a371f7", "#3fb950"],
                borderColor: "#161b22",
                borderWidth: 2,
            }],
        },
        options: {
            responsive: true,
            cutout: "60%",
            plugins: {
                legend: { position: "bottom", labels: { padding: 8, font: { size: 10 }, boxWidth: 10 } },
            },
        },
    });

    // ── Word Cloud with click-through ────────────────────────
    const cloud = $("#word-cloud");
    const maxWC = D.word_cloud.length ? D.word_cloud[0].count : 1;
    // Color words by frequency tier
    const wcColors = ["#f85149", "#d29922", "#58a6ff", "#a371f7", "#3fb950", "#8b949e"];
    D.word_cloud.forEach((w, i) => {
        const scale = 0.55 + (w.count / maxWC) * 1.2;
        const colorIdx = Math.min(Math.floor(i / (D.word_cloud.length / wcColors.length)), wcColors.length - 1);
        const el = document.createElement("span");
        el.className = "wc-word";
        el.textContent = w.word;
        el.style.fontSize = `${scale}rem`;
        el.style.color = wcColors[colorIdx];
        el.title = `${w.count} occurrences — click to see posts`;
        el.addEventListener("click", () => showWordPosts(w.word));
        cloud.appendChild(el);
    });

    // ── Word cloud modal ─────────────────────────────────────
    function showWordPosts(word) {
        const modal = $("#word-modal");
        const title = $("#modal-title");
        const postsEl = $("#modal-posts");
        const lower = word.toLowerCase();
        const matches = allPosts.filter(p => p.text.toLowerCase().includes(lower));
        // Deduplicate by URL
        const seen = new Set();
        const unique = matches.filter(p => { if (seen.has(p.url)) return false; seen.add(p.url); return true; });
        title.textContent = `Posts mentioning "${word}" (${unique.length})`;
        postsEl.innerHTML = "";
        unique.slice(0, 20).forEach(p => postsEl.appendChild(postCard(p)));
        if (unique.length === 0) {
            postsEl.innerHTML = '<p style="color:var(--text-muted);padding:1rem">No matching posts found in current dataset.</p>';
        }
        modal.classList.remove("hidden");
    }
    $("#modal-close").addEventListener("click", () => $("#word-modal").classList.add("hidden"));
    $("#word-modal").addEventListener("click", (e) => {
        if (e.target === $("#word-modal")) $("#word-modal").classList.add("hidden");
    });

    // ── Links ────────────────────────────────────────────────
    const linksList = $("#links-list");
    $("#links-count").textContent = `${D.links.length} links`;
    D.links.forEach((l) => {
        const row = document.createElement("div");
        row.className = "link-row";
        row.innerHTML = `
            <a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.title.substring(0, 55))}</a>
            <span class="link-meta">${l.shares}× ❤️${l.likes}</span>
        `;
        linksList.appendChild(row);
    });

    // ── Post card builder ────────────────────────────────────
    function postCard(p, rank) {
        const el = document.createElement("div");
        el.className = "post-card";
        const av = p.author_avatar
            ? `<img class="post-avatar" src="${esc(p.author_avatar)}" alt="" loading="lazy">`
            : `<div class="post-avatar"></div>`;
        const embed = p.embed_url
            ? `<div class="post-embed">🔗 <a href="${esc(p.embed_url)}" target="_blank" rel="noopener">${esc((p.embed_title || p.embed_url).substring(0, 70))}</a></div>`
            : "";
        const rankCls = rank === 1 ? "gold" : rank === 2 ? "silver" : rank === 3 ? "bronze" : "";
        const rankHtml = rank != null ? `<div class="post-rank ${rankCls}">${rank}</div>` : "";
        const engTotal = Math.max(p.likes + p.reposts + (p.replies || 0), 1);
        const lPct = (p.likes / engTotal) * 100;
        const rPct = (p.reposts / engTotal) * 100;

        el.innerHTML = `
            <div class="post-header">
                ${rankHtml}${av}
                <div>
                    <div class="post-author-name">${esc(p.author_name)}</div>
                    <div class="post-author-handle">@${esc(p.author_handle)}</div>
                </div>
                <span class="post-time">${timeAgo(p.created_at)}</span>
            </div>
            <div class="post-text">${esc(p.text)}</div>
            ${embed}
            <div class="engagement-bar">
                <div class="eng-likes" style="width:${lPct}%"></div>
                <div class="eng-reposts" style="width:${rPct}%"></div>
                <div class="eng-replies" style="width:${100 - lPct - rPct}%"></div>
            </div>
            <div class="post-footer">
                <span class="post-stat">❤️ ${p.likes}</span>
                <span class="post-stat">🔁 ${p.reposts}</span>
                <span class="post-stat">💬 ${p.replies || 0}</span>
                <a class="post-link" href="${esc(p.url)}" target="_blank" rel="noopener">↗ bsky</a>
                <span class="post-source">${esc(p.source)}</span>
            </div>
        `;
        return el;
    }

    // ── Overview top 5 ───────────────────────────────────────
    const top5 = $("#overview-top5");
    D.top_posts.slice(0, 5).forEach((p, i) => top5.appendChild(postCard(p, i + 1)));

    // ── Feed tab ─────────────────────────────────────────────
    const feedList = $("#feed-list");
    D.recent_posts.forEach((p) => feedList.appendChild(postCard(p)));
    $("#feed-search").addEventListener("input", (e) => {
        const q = e.target.value.toLowerCase();
        feedList.querySelectorAll(".post-card").forEach((c) => {
            c.style.display = c.textContent.toLowerCase().includes(q) ? "" : "none";
        });
    });

    // ── Top posts tab ────────────────────────────────────────
    const topList = $("#top-posts-list");
    D.top_posts.forEach((p, i) => topList.appendChild(postCard(p, i + 1)));

    // ── People tab ───────────────────────────────────────────
    const authGrid = $("#authors-grid");
    D.top_authors.forEach((a) => {
        const card = document.createElement("div");
        card.className = "author-card";
        const av = a.avatar
            ? `<img class="author-avatar" src="${esc(a.avatar)}" alt="" loading="lazy">`
            : `<div class="author-avatar"></div>`;
        card.innerHTML = `
            ${av}
            <div class="author-info">
                <div class="author-name">${esc(a.name)}</div>
                <div class="author-handle">@${esc(a.handle)}</div>
                <div class="author-metrics">
                    <span>📝 ${a.posts}</span>
                    <span>❤️ ${a.likes}</span>
                    <span>🔁 ${a.reposts}</span>
                </div>
            </div>
        `;
        authGrid.appendChild(card);
    });

    // ── Topics: category engagement ──────────────────────────
    if (D.categories.length) {
        new Chart($("#chart-cat-engagement"), {
            type: "bar",
            data: {
                labels: D.categories.map((c) => c.name),
                datasets: [
                    { label: "Posts", data: D.categories.map((c) => c.count),
                      backgroundColor: "#58a6ff88", borderColor: "#58a6ff", borderWidth: 1, borderRadius: 3 },
                    { label: "Likes", data: D.categories.map((c) => c.likes),
                      backgroundColor: "#f8514988", borderColor: "#f85149", borderWidth: 1, borderRadius: 3 },
                    { label: "Reposts", data: D.categories.map((c) => c.reposts),
                      backgroundColor: "#3fb95088", borderColor: "#3fb950", borderWidth: 1, borderRadius: 3 },
                ],
            },
            options: {
                responsive: true,
                plugins: { legend: { position: "top", align: "end", labels: { boxWidth: 10, font: { size: 11 } } } },
                scales: {
                    x: { ticks: { font: { size: 10 } } },
                    y: { ticks: { font: { size: 10 } } },
                },
            },
        });
    }

    // ── Topics: hashtag bars ─────────────────────────────────
    const hbars = $("#hashtag-bars");
    const maxH = D.hashtags.length ? D.hashtags[0].count : 1;
    D.hashtags.forEach((h, i) => {
        const pct = (h.count / maxH) * 100;
        const row = document.createElement("div");
        row.className = "hbar-row";
        row.innerHTML = `
            <span class="hbar-label">#${esc(h.tag)}</span>
            <div class="hbar-track">
                <div class="hbar-fill" style="width:${pct}%;background:${PAL[i % PAL.length]}"></div>
            </div>
            <span class="hbar-value">${h.count}</span>
        `;
        hbars.appendChild(row);
    });
})();
