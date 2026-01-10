import { fetchPlayerStats, fetchTeamPlayers, fetchPastTeamGames, fetchTeamPgStats, fetchNationalPlayerRank, fetchConferencePlayerRank, fetchTeamPlayerRank } from "../../utils/fetch.js";
import { renderPlayerInfoCard } from "./renderPlayerInfoCard.js";
import { renderPlayerStatGrid } from "./renderPlayerStatGrid.js";
import { renderPlayerPastGames } from "./renderPlayerPastGames.js";
import { createEl, append } from "../../utils/dom.js";
import { createSectionTitle } from "../shared/SectionTitle.js";
import { showLoadingOverlay, hideLoadingOverlay } from "../../utils/loading.js";

export async function renderPlayerPage(playerName, playerTeam, PgStats, conferenceStandings, displayBoxScore, renderTeamStats, renderConferenceStats) {

    // Show loading overlay
    const loadingOverlay = showLoadingOverlay("Loading player stats...");
    
    PgStats.style.display = "block";
    PgStats.innerHTML = "";
    conferenceStandings.style.display = "none";

    const pg = await fetchPlayerStats(playerName, playerTeam);

    console.log(pg);    // Extract player team + conference
    let team = "—";
    let conference = "—";
    for (const [k,v] of pg) {
        if (k === "team") team = v;
        if (k === "conference") conference = v;
    }

    console.log(team, conference);
    // Home button
    const homeButton = createEl("button", {
        padding: "10px 16px",
        borderRadius: "8px",
        border: "2px solid #E8E8E8",
        background: "#FFFFFF",
        color: "#00205B",
        fontSize: "14px",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.2s ease",
        marginTop: "24px",
        marginBottom: "16px",
        boxShadow: "0 2px 6px rgba(0, 32, 91, 0.1)"
    });
    homeButton.textContent = "← Back to Home";
    homeButton.onmouseover = () => {
        homeButton.style.background = "#00205B";
        homeButton.style.color = "#FFFFFF";
        homeButton.style.boxShadow = "0 4px 12px rgba(0, 32, 91, 0.2)";
    };
    homeButton.onmouseout = () => {
        homeButton.style.background = "#FFFFFF";
        homeButton.style.color = "#00205B";
        homeButton.style.boxShadow = "0 2px 6px rgba(0, 32, 91, 0.1)";
    };
    homeButton.onclick = () => {
        history.pushState({ view: "home" }, "", window.location.pathname);
        window.dispatchEvent(new PopStateEvent("popstate", { state: { view: "home" } }));

        const wrapper = document.getElementById("player-home-wrapper");
        if (wrapper) wrapper.remove();
    };

    // Place the back button above the dropdowns without touching their layout
    const controlsContainer = document.querySelector(".controls-container");
    if (controlsContainer && controlsContainer.parentNode) {
        let wrapper = document.getElementById("player-home-wrapper");
        if (!wrapper) {
            wrapper = createEl("div", {
                maxWidth: "1200px",
                marginLeft: "auto",
                marginRight: "auto",
                marginBottom: "8px",
                display: "flex",
                justifyContent: "flex-start"
            });
            wrapper.id = "player-home-wrapper";
            controlsContainer.parentNode.insertBefore(wrapper, controlsContainer);
        } else {
            wrapper.innerHTML = "";
        }
        wrapper.appendChild(homeButton);
    } else {
        // Fallback: keep previous behavior if controls container is not found
        PgStats.appendChild(homeButton);
    }

    // Main container
    const root = createEl("div", {
        marginTop: "24px",
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: "24px",
        alignItems: "stretch",
        gridAutoRows: "1fr"
    });

    // LEFT — Player stats
    const left = createEl("div", { 
        display: "flex",
        flexDirection: "column",
        minHeight: 0
    });
    const statGrid = renderPlayerStatGrid(pg);
    left.appendChild(statGrid);
    // MIDDLE — Info + past games
    const middle = createEl("div", {
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        minHeight: 0,
        overflow: "hidden"
    });

    const infoCard = await Promise.resolve(renderPlayerInfoCard(
        playerName, 
        team, 
        conference,
        (teamName) => renderTeamStats(teamName, PgStats, conferenceStandings, displayBoxScore),
    )).catch(error => {
        console.error("[playerStats.index] Error in renderPlayerInfoCard:", error);
        // Return empty div if info card fails
        return document.createElement("div");
    });
    middle.appendChild(infoCard);

    // Player past games
    const teamGames = await fetchPastTeamGames(team);
    console.log(teamGames);
    let past;
    try {
        past = await renderPlayerPastGames(playerName, team, teamGames, displayBoxScore);
        middle.appendChild(past);
    } catch (error) {
        console.error("Error rendering past games:", error);
        // Continue without past games rather than breaking
    }

    append(root, left, middle);
    
    // Stat Rankings Section
    const majorStats = [
        { stat: "pts", label: "Points" },
        { stat: "ast", label: "Assists" },
        { stat: "trb", label: "Rebounds" },
        { stat: "stl", label: "Steals" },
        { stat: "blk", label: "Blocks" },
        { stat: "fg_pct", label: "Field Goal %" },
        { stat: "fg3_pct", label: "3-Point %" },
        { stat: "ft_pct", label: "Free Throw %" },
        { stat: "tov", label: "Turnovers" },
        { stat: "pf", label: "Personal Fouls" },
        { stat: "gmsc", label: "GmSc" }
    ];

    const rankingsSection = createEl("div", {
        padding: "24px",
        background: "#FFFFFF",
        borderRadius: "8px",
        border: "1px solid #E8E8E8",
        boxShadow: "0 4px 12px rgba(0, 32, 91, 0.08)",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden",
        position: "relative"
    });

    const rankingsTitle = createSectionTitle("Stat Rankings");
    rankingsTitle.style.borderBottom = "2px solid #BA0C2F";
    rankingsTitle.style.paddingBottom = "12px";
    rankingsTitle.style.marginBottom = "16px";
    rankingsSection.appendChild(rankingsTitle);

    const rankingsTiles = createEl("div", {
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: "12px",
        overflowY: "auto",
        flex: 1,
        scrollSnapType: "y mandatory"
    });
    rankingsTiles.dataset.role = "player-rankings-list";

    // Enable carousel-style snapping: one stat card per scroll step
    enableCardCarouselScroll(rankingsTiles);

    // Fetch ranks for each major stat
    for (const statConfig of majorStats) {
        const tile = createEl("div", {
            padding: "12px 16px",
            background: "#F5F5F5",
            borderRadius: "8px",
            border: "1px solid #E8E8E8",
            display: "grid",
            gridTemplateColumns: "120px 1fr 1fr 1fr",
            alignItems: "center",
            gap: "12px",
            transition: "all 0.2s ease",
            scrollSnapAlign: "start"
        });
        tile.onmouseover = () => {
            tile.style.borderColor = "#00205B";
            tile.style.boxShadow = "0 4px 12px rgba(0, 32, 91, 0.1)";
            tile.style.background = "#FFFFFF";
        };

        tile.onmouseout = () => {
            tile.style.borderColor = "#E8E8E8";
            tile.style.boxShadow = "none";
            tile.style.background = "#F5F5F5";
        };

        const statLabel = createEl("div", {
            fontSize: "12px",
            fontWeight: "700",
            color: "#222222",
            textTransform: "uppercase",
            letterSpacing: "0.5px"
        });
        statLabel.textContent = statConfig.label;
        tile.appendChild(statLabel);

        // National Rank
        const nationalRankEl = createEl("div", {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2px"
        });

        const nationalLabel = createEl("div", {
            fontSize: "10px",
            color: "#666666",
            fontWeight: "600"
        });
        nationalLabel.textContent = "National";
        nationalRankEl.appendChild(nationalLabel);

        const nationalRank = createEl("div", {
            fontSize: "18px",
            fontWeight: "800",
            color: "#00205B"
        });
        nationalRank.textContent = "—";
        nationalRankEl.appendChild(nationalRank);
        tile.appendChild(nationalRankEl);

        // Conference Rank
        const confRankEl = createEl("div", {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2px"
        });

        const confLabel = createEl("div", {
            fontSize: "10px",
            color: "#666666",
            fontWeight: "600"
        });
        confLabel.textContent = "Conference";
        confRankEl.appendChild(confLabel);

        const confRank = createEl("div", {
            fontSize: "18px",
            fontWeight: "800",
            color: "#BA0C2F"
        });
        confRank.textContent = "—";
        confRankEl.appendChild(confRank);
        tile.appendChild(confRankEl);

        // Team Rank
        const teamRankEl = createEl("div", {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2px"
        });

        const teamLabel = createEl("div", {
            fontSize: "10px",
            color: "#666666",
            fontWeight: "600"
        });
        teamLabel.textContent = "Team";
        teamRankEl.appendChild(teamLabel);

        const teamRank = createEl("div", {
            fontSize: "18px",
            fontWeight: "800",
            color: "#00205B"
        });
        teamRank.textContent = "—";
        teamRankEl.appendChild(teamRank);
        tile.appendChild(teamRankEl);
        rankingsTiles.appendChild(tile);

        // Fetch ranks
        try {
            const nationalData = await fetchNationalPlayerRank(statConfig.stat, playerName);
            nationalRank.textContent = nationalData.Rank;
        } catch (error) {
            nationalRank.textContent = "NA"
            console.error(`Error fetching national rank for ${statConfig.stat}:`, error);
        }

        try {
            const confData = await fetchConferencePlayerRank(statConfig.stat, playerName, conference);
            confRank.textContent = confData.Rank;
        } catch (error) {
            confRank.textContent = "NA"
            console.error(`Error fetching conference rank for ${statConfig.stat}:`, error);
        }

        try {
            const teamData = await fetchTeamPlayerRank(statConfig.stat, playerName, team);
            teamRank.textContent = teamData.Rank;
        } catch (error) {
            teamRank.textContent = "NA"
            console.error(`Error fetching team rank for ${statConfig.stat}:`, error);
        }
    }

    rankingsSection.appendChild(rankingsTiles);
    root.appendChild(rankingsSection);
    attachArrowControls(rankingsTiles);
    
    // After rendering, set height constraints based on the stats grid card
    setTimeout(() => {
        const statsHeight = statGrid ? statGrid.offsetHeight : 0;
        if (!statsHeight) return;

        // Make right rankings panel match stats grid height
        rankingsSection.style.maxHeight = `${statsHeight}px`;
        rankingsSection.style.height = `${statsHeight}px`;

        // Middle column: keep top aligned with others and bottom aligned
        // by constraining the past games card under the info card
        const infoCard = middle.firstChild;
        const infoHeight = infoCard ? infoCard.offsetHeight : 0;
        const gap = 24; // matches middle column gap
        const availableForPast = Math.max(statsHeight - infoHeight - gap, 120);

        const pastGamesCard = middle.lastChild;
        if (pastGamesCard && pastGamesCard !== infoCard) {
            pastGamesCard.style.maxHeight = `${availableForPast}px`;
            pastGamesCard.style.height = `${availableForPast}px`;

            const pastGamesList = pastGamesCard.querySelector('[data-role="past-games-list"]');
            const firstRow = pastGamesList ? pastGamesList.firstElementChild : null;
            if (pastGamesList && firstRow) {
                const secondRow = firstRow.nextElementSibling;
                const stride = secondRow ? (secondRow.offsetTop - firstRow.offsetTop) : firstRow.offsetHeight;
                const currentViewport = pastGamesList.clientHeight || availableForPast;
                const maxVisibleRows = Math.max(1, Math.floor(currentViewport / stride));
                const viewportHeight = maxVisibleRows * stride;
                pastGamesList.style.maxHeight = `${viewportHeight}px`;
                pastGamesList.style.height = `${viewportHeight}px`;
            }
        }

        const firstTile = rankingsTiles.firstElementChild;
        if (firstTile) {
            const secondTile = firstTile.nextElementSibling;
            const stride = secondTile ? (secondTile.offsetTop - firstTile.offsetTop) : firstTile.offsetHeight;
            const currentViewport = rankingsTiles.clientHeight || statsHeight;
            const maxVisibleTiles = Math.max(1, Math.floor(currentViewport / stride));
            const viewportHeight = maxVisibleTiles * stride;
            rankingsTiles.style.maxHeight = `${viewportHeight}px`;
            rankingsTiles.style.height = `${viewportHeight}px`;
        }

        // Ensure middle column itself aligns top/bottom with left
        middle.style.maxHeight = `${statsHeight}px`;
        middle.style.height = `${statsHeight}px`;
    }, 0);
    
    // Clear loading indicator and display content
    PgStats.innerHTML = "";
    PgStats.appendChild(root);
    
    // Hide loading overlay
    hideLoadingOverlay();
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
