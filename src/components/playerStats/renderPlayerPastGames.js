import { fetchBoxScore, fetchTeamImage } from "../../utils/fetch.js";
import { createEl, append } from "../../utils/dom.js";

export async function renderPlayerPastGames(player, team, games, displayBoxScore) {

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
        flex: 1
    });
    list.dataset.role = "past-games-list";

    append(card, title, list);

    // Enable carousel-style snapping: one game row per scroll step
    enableCardCarouselScroll(list);
    attachArrowControls(list);

    for (const g of games) {
        try {
            const isAway = g.location && g.location.toLowerCase().includes("away");
            const away = isAway ? team : g.opponent;
            const home = isAway ? g.opponent : team;
            const gameID = `${new Date(g.date).toISOString().split("T")[0]}-${away}-vs-${home}-m`;

            const box = await fetchBoxScore(gameID);
            const playerRow = box[team].find(p => p.player === player);

            const pts = playerRow?.pts ?? "—";
            const trb = playerRow?.trb ?? "—";
            const ast = playerRow?.ast ?? "—";

        const isWin = g.team_pts > g.opponent_pts;

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

        const logo = createEl("img", {
            width: "40px",
            height: "40px",
            objectFit: "contain"
        });
        
        fetchTeamImage(g.opponent)
            .then(src => { logo.src = src; })
            .catch(() => { logo.style.display = "none"; });
        
        logo.onerror = () => logo.style.display = "none";

        // Opponent rank badge
        if (g.opponent_rank && g.opponent_rank !== "NR") {
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
            badge.textContent = g.opponent_rank;
            logoCont.appendChild(badge);
        }

        logoCont.appendChild(logo);

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
        name.textContent = g.opponent;

        const date = createEl("div", {
            fontSize: "12px",
            color: "#666666"
        });
        date.textContent = new Date(g.date).toISOString().split("T")[0];

        const location = createEl("div", {
            fontSize: "12px",
            color: "#666666"
        });
        location.textContent = g.location || "—";

        append(text, name, date, location);
        append(left, logoCont, text);

        // RIGHT — Stats
        const right = createEl("div", {
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "4px",
            textAlign: "right"
        });

        const statline = createEl("div", {
            fontWeight: "700",
            fontSize: "14px",
            color: isWin ? "#2E7D32" : "#BA0C2F"
        });
        statline.textContent = `${pts} pts • ${trb} reb • ${ast} ast`;

        append(right, statline);
        append(row, left, right);

        row.onclick = () => {
            try {
                const teamRanks = {};
                teamRanks[team] = g.team_rank || "NR";
                teamRanks[g.opponent] = g.opponent_rank || "NR";
                displayBoxScore(gameID, g.date, teamRanks);
            } catch (error) {
                console.error("Error displaying box score:", error);
            }
        };

        list.appendChild(row);
        } catch (error) {
            console.error(`Error loading game for ${player}:`, error);
        }
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

            index += direction;
            index = Math.max(0, Math.min(items.length - 1, index));

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
