// KubeCon Bluesky Dashboard — App
(async function () {
    const resp = await fetch("data/dashboard.json");
    const D = await resp.json();

    // ── Helpers ──────────────────────────────────────────────
    const $ = (s) => document.querySelector(s);
    const $$ = (s) => document.querySelectorAll(s);
    const fmt = (n) => n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n);
    const timeAgo = (iso) => {
        if (!iso) return "";
        const d = new Date(iso);
        const diff = (Date.now() - d.getTime()) / 1000;
        if (diff < 60) return "just now";
        if (diff < 3600) return Math.floor(diff / 60) + "m ago";
        if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
        return Math.floor(diff / 86400) + "d ago";
    };
    const escHtml = (s) =>
        s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // ── Tabs ─────────────────────────────────────────────────
    $$(".tab").forEach((btn) => {
        btn.addEventListener("click", () => {
            $$(".tab").forEach((b) => b.classList.remove("active"));
            $$(".tab-content").forEach((c) => c.classList.remove("active"));
            btn.classList.add("active");
            $(`#tab-${btn.dataset.tab}`).classList.add("active");
        });
    });

    // ── Meta / Header ────────────────────────────────────────
    const updatedAt = D.generated_at
        ? new Date(D.generated_at).toLocaleString()
        : "—";
    $("#meta-updated").textContent = `Updated: ${updatedAt}`;
    $("#meta-posts").textContent = `${fmt(D.summary.total_posts)} posts`;

    // ── Summary Stats ────────────────────────────────────────
    $("#stat-total-posts").textContent = fmt(D.summary.total_posts);
    $("#stat-total-authors").textContent = fmt(D.summary.total_authors);
    $("#stat-24h-posts").textContent = fmt(D.summary.last_24h_posts);
    $("#stat-total-likes").textContent = fmt(D.summary.total_likes);
    $("#stat-total-reposts").textContent = fmt(D.summary.total_reposts);
    $("#stat-both").textContent = fmt(D.summary.both_sources);

    // ── Chart colors ─────────────────────────────────────────
    const COLORS = [
        "#58a6ff", "#3fb950", "#d29922", "#f778ba", "#a371f7",
        "#f85149", "#79c0ff", "#56d364", "#e3b341", "#ff7b72",
        "#7ee787", "#d2a8ff", "#ffa657", "#79e2f2", "#ff9bce",
    ];

    // ── Timeline Chart ───────────────────────────────────────
    if (D.timeline.length) {
        const labels = D.timeline.map((t) => {
            const d = new Date(t.hour);
            return d.toLocaleDateString("en", { weekday: "short" }) +
                " " + d.toLocaleTimeString("en", { hour: "2-digit", hour12: false });
        });
        new Chart($("#chart-timeline"), {
            type: "bar",
            data: {
                labels,
                datasets: [
                    {
                        label: "Posts",
                        data: D.timeline.map((t) => t.count),
                        backgroundColor: "#58a6ff44",
                        borderColor: "#58a6ff",
                        borderWidth: 1,
                        borderRadius: 3,
                    },
                    {
                        label: "Likes",
                        data: D.timeline.map((t) => t.likes),
                        type: "line",
                        borderColor: "#f85149",
                        backgroundColor: "#f8514933",
                        fill: true,
                        tension: 0.3,
                        pointRadius: 0,
                        yAxisID: "y1",
                    },
                ],
            },
            options: {
                responsive: true,
                interaction: { mode: "index", intersect: false },
                plugins: { legend: { labels: { color: "#8b949e" } } },
                scales: {
                    x: {
                        ticks: { color: "#8b949e", maxRotation: 45, maxTicksLimit: 24 },
                        grid: { color: "#30363d33" },
                    },
                    y: {
                        position: "left",
                        ticks: { color: "#58a6ff" },
                        grid: { color: "#30363d33" },
                        title: { display: true, text: "Posts", color: "#58a6ff" },
                    },
                    y1: {
                        position: "right",
                        ticks: { color: "#f85149" },
                        grid: { display: false },
                        title: { display: true, text: "Likes", color: "#f85149" },
                    },
                },
            },
        });
    }

    // ── Categories Chart ─────────────────────────────────────
    if (D.categories.length) {
        new Chart($("#chart-categories"), {
            type: "doughnut",
            data: {
                labels: D.categories.map((c) => c.name),
                datasets: [{
                    data: D.categories.map((c) => c.count),
                    backgroundColor: COLORS.slice(0, D.categories.length),
                    borderColor: "#161b22",
                    borderWidth: 2,
                }],
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: "right",
                        labels: { color: "#8b949e", padding: 12, font: { size: 11 } },
                    },
                },
            },
        });
    }

    // ── Sources Chart ────────────────────────────────────────
    new Chart($("#chart-sources"), {
        type: "doughnut",
        data: {
            labels: ["Feed only", "Search only", "Both"],
            datasets: [{
                data: [
                    D.summary.feed_only,
                    D.summary.search_only,
                    D.summary.both_sources,
                ],
                backgroundColor: ["#58a6ff", "#a371f7", "#3fb950"],
                borderColor: "#161b22",
                borderWidth: 2,
            }],
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: "bottom",
                    labels: { color: "#8b949e", padding: 12 },
                },
            },
        },
    });

    // ── Hashtag Cloud ────────────────────────────────────────
    const maxTag = Math.max(...D.hashtags.map((h) => h.count));
    const cloud = $("#hashtag-cloud");
    D.hashtags.forEach((h) => {
        const scale = 0.7 + (h.count / maxTag) * 1.3;
        const el = document.createElement("span");
        el.className = "hashtag-item";
        el.textContent = `#${h.tag}`;
        el.style.fontSize = `${scale}rem`;
        el.title = `${h.count} posts`;
        cloud.appendChild(el);
    });

    // ── Links List ───────────────────────────────────────────
    const linksList = $("#links-list");
    D.links.forEach((l) => {
        const div = document.createElement("div");
        div.className = "link-item";
        div.innerHTML = `
            <a href="${escHtml(l.url)}" target="_blank" title="${escHtml(l.title)}">${escHtml(l.title.substring(0, 60))}</a>
            <span class="link-shares">${l.shares}× · ❤️${l.likes}</span>
        `;
        linksList.appendChild(div);
    });

    // ── Post Card Builder ────────────────────────────────────
    function postCard(p, rank) {
        const card = document.createElement("div");
        card.className = "post-card";
        const avatarUrl = p.author_avatar || "";
        const avatarHtml = avatarUrl
            ? `<img class="post-avatar" src="${escHtml(avatarUrl)}" alt="" loading="lazy">`
            : `<div class="post-avatar"></div>`;

        let embedHtml = "";
        if (p.embed_url) {
            embedHtml = `<div class="post-embed">🔗 <a href="${escHtml(p.embed_url)}" target="_blank">${escHtml((p.embed_title || p.embed_url).substring(0, 80))}</a></div>`;
        }

        const rankHtml = rank != null ? `<div class="post-rank">#${rank}</div>` : "";

        card.innerHTML = `
            <div class="post-header">
                ${rankHtml}
                ${avatarHtml}
                <div>
                    <div class="post-author-name">${escHtml(p.author_name)}</div>
                    <div class="post-author-handle">@${escHtml(p.author_handle)}</div>
                </div>
                <span class="post-time">${timeAgo(p.created_at)}</span>
            </div>
            <div class="post-text">${escHtml(p.text)}</div>
            ${embedHtml}
            <div class="post-stats">
                <span class="post-stat">❤️ ${p.likes}</span>
                <span class="post-stat">🔁 ${p.reposts}</span>
                <span class="post-stat">💬 ${p.replies}</span>
                <a class="post-link" href="${escHtml(p.url)}" target="_blank">view on Bluesky ↗</a>
                <span class="post-source">${escHtml(p.source)}</span>
            </div>
        `;
        return card;
    }

    // ── Live Feed ────────────────────────────────────────────
    const feedList = $("#feed-list");
    D.recent_posts.forEach((p) => feedList.appendChild(postCard(p)));

    // Search filter
    $("#feed-search").addEventListener("input", (e) => {
        const q = e.target.value.toLowerCase();
        feedList.querySelectorAll(".post-card").forEach((card) => {
            card.style.display = card.textContent.toLowerCase().includes(q) ? "" : "none";
        });
    });

    // ── Top Posts ─────────────────────────────────────────────
    const topList = $("#top-posts-list");
    D.top_posts.forEach((p, i) => topList.appendChild(postCard(p, i + 1)));

    // ── People ───────────────────────────────────────────────
    const authorsGrid = $("#authors-grid");
    D.top_authors.forEach((a) => {
        const card = document.createElement("div");
        card.className = "author-card";
        const avatarHtml = a.avatar
            ? `<img class="author-avatar" src="${escHtml(a.avatar)}" alt="" loading="lazy">`
            : `<div class="author-avatar"></div>`;
        card.innerHTML = `
            ${avatarHtml}
            <div class="author-info">
                <div class="author-name">${escHtml(a.name)}</div>
                <div class="author-handle">@${escHtml(a.handle)}</div>
                <div class="author-stats">
                    <span>📝 ${a.posts}</span>
                    <span>❤️ ${a.likes}</span>
                    <span>🔁 ${a.reposts}</span>
                </div>
            </div>
        `;
        authorsGrid.appendChild(card);
    });

    // ── Topics – Category Engagement Chart ───────────────────
    if (D.categories.length) {
        new Chart($("#chart-cat-engagement"), {
            type: "bar",
            data: {
                labels: D.categories.map((c) => c.name),
                datasets: [
                    {
                        label: "Posts",
                        data: D.categories.map((c) => c.count),
                        backgroundColor: "#58a6ff88",
                        borderColor: "#58a6ff",
                        borderWidth: 1,
                        borderRadius: 4,
                    },
                    {
                        label: "Likes",
                        data: D.categories.map((c) => c.likes),
                        backgroundColor: "#f8514988",
                        borderColor: "#f85149",
                        borderWidth: 1,
                        borderRadius: 4,
                    },
                    {
                        label: "Reposts",
                        data: D.categories.map((c) => c.reposts),
                        backgroundColor: "#3fb95088",
                        borderColor: "#3fb950",
                        borderWidth: 1,
                        borderRadius: 4,
                    },
                ],
            },
            options: {
                responsive: true,
                plugins: { legend: { labels: { color: "#8b949e" } } },
                scales: {
                    x: { ticks: { color: "#8b949e" }, grid: { color: "#30363d33" } },
                    y: { ticks: { color: "#8b949e" }, grid: { color: "#30363d33" } },
                },
            },
        });
    }

    // ── Hashtag Table ────────────────────────────────────────
    const htTable = $("#hashtag-table");
    const maxH = D.hashtags.length ? D.hashtags[0].count : 1;
    let tableHtml = `<table><thead><tr><th>Hashtag</th><th>Posts</th><th></th></tr></thead><tbody>`;
    D.hashtags.forEach((h) => {
        const pct = (h.count / maxH) * 100;
        tableHtml += `<tr>
            <td><span class="hashtag-item" style="font-size:0.85rem">#${escHtml(h.tag)}</span></td>
            <td>${h.count}</td>
            <td class="bar-cell"><div class="bar-fill" style="width:${pct}%"></div></td>
        </tr>`;
    });
    tableHtml += `</tbody></table>`;
    htTable.innerHTML = tableHtml;
})();
