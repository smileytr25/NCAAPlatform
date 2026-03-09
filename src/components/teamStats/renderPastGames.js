import { fetchTeamImage, fetchBoxScore } from "../../utils/fetch.js";
import { createEl, append } from "../../utils/dom.js";
import { getTeamRank } from "../../utils/rank.js"

export async function renderPastGames(rows, team, onBoxScoreOpen) {
    const card = createEl("div", {
        background: "#FFFFFF",
        padding: "24px",
        border: "1px solid #E8E8E8",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0, 32, 91, 0.12)",
        flex: "1",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative"
    });

    const title = createEl("div", {
        fontSize: "16px",
        fontWeight: "700",
        marginBottom: "20px",
        borderBottom: "3px solid #BA0C2F",
        paddingBottom: "12px",
        color: "#00205B",
        textTransform: "uppercase",
        letterSpacing: "0.5px"
    });
    title.textContent = "Past Games";

    const list = createEl("div", {
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        overflowY: "auto",
        scrollSnapType: "y mandatory",
        flex: 1,
        maxHeight: "522px",
        scrollbarWidth: "none",        // Firefox
        msOverflowStyle: "none"
    });

    list.dataset.role = "past-games-list";

    append(card, title, list);

    // Enable carousel-style snapping: one game row per scroll step
    enableCardCarouselScroll(list);
    attachArrowControls(list);

    if (rows.length === 0) {
        const msg = createEl("div", { color: "#666666" });
        msg.textContent = "No past games";
        list.appendChild(msg);
        return card;
    }

    for (const game of rows) {
        const isAway = game.location?.toLowerCase().includes("away");
        const away = isAway ? team : game.opponent;
        const home = isAway ? game.opponent : team;
        const gameID = `${new Date(game.date).toISOString().split("T")[0]}-${away}-vs-${home}-m`;
        const isWin = game.team_pts > game.opponent_pts;

        const row = createEl("div", {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px",
            background: "#F5F5F5",
            borderRadius: "8px",
            cursor: "pointer",
            transition: "all 0.2s ease",
            scrollSnapAlign: "start",
            flexShrink: 0,
            border: "1px solid #E8E8E8"
        });

        row.onmouseover = () => {
            row.style.background = "rgba(0, 32, 91, 0.05)";
            row.style.borderColor = "#00205B";
            row.style.boxShadow = "0 2px 8px rgba(0, 32, 91, 0.15)";
        };
        row.onmouseout = () => {
            row.style.background = "#F5F5F5";
            row.style.borderColor = "#E8E8E8";
            row.style.boxShadow = "none";
        };

        // LEFT — Logo + Opponent info
        const left = createEl("div", {
            display: "flex",
            gap: "12px",
            alignItems: "center",
            flex: "1"
        });

        const logoCont = createEl("div", {
            position: "relative",
            width: "40px",
            height: "40px",
            flexShrink: "0"
        });

        const img = createEl("img", {
            width: "40px",
            height: "40px",
            objectFit: "contain"
        });
        
        fetchTeamImage(game.opponent)
            .then(src => { img.src = src; })
            .catch(() => { img.style.display = "none"; });
        
        img.onerror = () => img.style.display = "none";

        img.onerror = () => img.style.display = "none";

        // Opponent rank badge
        if (game.opponent_rank && game.opponent_rank !== "NR") {
            const badge = createEl("div", {
                position: "absolute",
                top: "-8px",
                right: "-8px",
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                background: "#00205B",
                color: "#FFFFFF",
                border: "2px solid #FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "700",
                fontSize: "10px",
                boxShadow: "0 2px 6px rgba(0, 32, 91, 0.3)"
            });
            badge.textContent = game.opponent_rank;
            logoCont.appendChild(badge);
        }

        logoCont.appendChild(img);

        const text = createEl("div", {
            display: "flex",
            flexDirection: "column",
            gap: "2px"
        });

        const name = createEl("div", {
            fontWeight: "700",
            fontSize: "14px",
            color: "#222222"
        });
        name.textContent = game.opponent;

        const date = createEl("div", {
            fontSize: "12px",
            color: "#666666"
        });
        date.textContent = game.date;

        const location = createEl("div", {
            fontSize: "12px",
            color: "#666666"
        });
        location.textContent = game.location || "—";

        append(text, name, date, location);
        append(left, logoCont, text);

        // RIGHT — Stats (Score)
        const right = createEl("div", {
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "4px",
            textAlign: "right"
        });

        const scoreText = createEl("div", {
            fontWeight: "700",
            fontSize: "14px",
            color: isWin ? "#2E7D32" : "#BA0C2F"
        });
        scoreText.textContent = `${game.team_pts} – ${game.opponent_pts}`;

        const result = createEl("div", {
            fontSize: "12px",
            fontWeight: "700",
            color: isWin ? "#2E7D32" : "#BA0C2F"
        });
        result.textContent = isWin ? "W" : "L";

        append(right, scoreText, result);
        append(row, left, right);

        append(row, left, right);

        // Await the team rank properly
        let teamRank = "NR";
        try {
            teamRank = await getTeamRank(team);
        } catch (err) {
            console.warn(`Error fetching team rank for ${team}:`, err);
        }

        const teamRanks = {
            [team]: teamRank,
            [game.opponent]: game.opponent_rank
        };
        
        let hasBox = true;
        try {
            const box = await fetchBoxScore(gameID);
            if (!box || box.error) {
                hasBox = false;
            }
        } catch (err) {
            hasBox = false;
        }

        if (hasBox) {
            row.onclick = () => onBoxScoreOpen(gameID, game.date, teamRanks);
        } else {
            row.style.cursor = "not-allowed";
            row.onclick = () => {};
        }

        list.appendChild(row);
    }

    return card;
}

function enableCardCarouselScroll(container) {
    if (!container) return;

    let isAnimating = false;

    container.addEventListener("wheel", (event) => {
        if (!event.deltaY || isAnimating) return;

        const items = Array.from(container.children);
        if (!items.length) return;

        event.preventDefault();

        let index = parseInt(container.dataset.carouselIndex || "0", 10);
        if (Number.isNaN(index)) index = 0;

        const direction = event.deltaY > 0 ? 1 : -1;
        index += direction;
        index = Math.max(0, Math.min(items.length - 1, index));

        const target = items[index];
        if (!target) return;

        container.dataset.carouselIndex = String(index);

        const containerRect = container.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const delta = targetRect.top - containerRect.top;

        isAnimating = true;
        container.scrollTo({ top: container.scrollTop + delta, behavior: "smooth" });

        setTimeout(() => {
            isAnimating = false;
        }, 400);
    }, { passive: false });
}

function attachArrowControls(container) {

    function getMaxIndex(container) {
        const items = container.children;
        if (!items.length) return 0;

        const containerHeight = container.clientHeight;
        const first = items[0];
        const second = items[1] || first;
        const stride = second.offsetTop - first.offsetTop || first.offsetHeight + 12;

        const visibleCount = Math.floor(containerHeight / stride);
        return Math.max(0, items.length - visibleCount);
    }

    if (!container || !container.parentElement) return;

    const parent = container.parentElement;
    if (!parent) return;

    if (!parent.style.position) {
        parent.style.position = "relative";
    }

    const createArrow = (direction) => {
        const arrow = document.createElement("button");
        arrow.textContent = direction < 0 ? "▲" : "▼";
        Object.assign(arrow.style, {
            position: "absolute",
            right: "8px",
            width: "28px",
            height: "28px",
            borderRadius: "999px",
            border: "1px solid #00205B",
            background: "#FFFFFF",
            color: "#00205B",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(0, 32, 91, 0.15)",
            opacity: "0",
            pointerEvents: "none",
            transition: "opacity 0.2s ease"
        });

        if (direction < 0) {
            arrow.style.top = "8px";
        } else {
            arrow.style.bottom = "8px";
        }

        arrow.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();

            const items = Array.from(container.children);
            if (!items.length) return;

            let index = parseInt(container.dataset.carouselIndex || "0", 10);
            if (Number.isNaN(index)) index = 0;

            const maxIndex = getMaxIndex(container);

            index += direction;
            index = Math.max(0, Math.min(maxIndex, index));

            if (index === parseInt(container.dataset.carouselIndex || "0", 10)) return;

            const target = items[index];
            if (!target) return;

            container.dataset.carouselIndex = String(index);

            const containerRect = container.getBoundingClientRect();
            const targetRect = target.getBoundingClientRect();
            const delta = targetRect.top - containerRect.top;

            container.scrollTo({ top: container.scrollTop + delta, behavior: "smooth" });
        });

        parent.appendChild(arrow);
        return arrow;
    };

    const upArrow = createArrow(-1);
    const downArrow = createArrow(1);

    parent.addEventListener("mouseenter", () => {
        upArrow.style.opacity = "1";
        downArrow.style.opacity = "1";
        upArrow.style.pointerEvents = "auto";
        downArrow.style.pointerEvents = "auto";
    });

    parent.addEventListener("mouseleave", () => {
        upArrow.style.opacity = "0";
        downArrow.style.opacity = "0";
        upArrow.style.pointerEvents = "none";
        downArrow.style.pointerEvents = "none";
    });
}
