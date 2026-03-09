import { fetchTeamPgStats, fetchPastTeamGames, fetchFutureTeamGames } from "../../utils/fetch.js";
import { createEl, append } from "../../utils/dom.js";
import { createSectionTitle } from "../shared/SectionTitle.js";
import { renderStatsCard } from "./renderStatsCard.js";
import { renderTeamInfoCard } from "./renderTeamInfoCard.js";
import { renderPastGames } from "./renderPastGames.js";
import { renderUpcomingGames } from "./renderUpcomingGames.js";
import { showLoadingOverlay, hideLoadingOverlay } from "../../utils/loading.js";

export async function renderTeamStats(team, PgStats, conferenceStandings, displayBoxScore, renderConferenceStats) {

    try {
        // Show loading overlay
        const loadingOverlay = showLoadingOverlay("Loading team stats...");
        
        PgStats.style.display = "block";
        PgStats.innerHTML = "";
        conferenceStandings.style.display = "none";

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

    console.log("Inserting home button for team:", team);

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

    const data = await fetchTeamPgStats(team);

    console.log("Fetched PG Stats for team:", team, data);

    let conference = "Unknown";
    let wins = "-";
    let losses = "-";

    for (const [k,v] of data) {
        if (k==="team_conference") conference = v;
        if (k==="W") wins = v;
        if (k==="L") losses = v;
    }

    let root = createEl("div", {
        marginTop: "24px",
        marginBottom: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "24px"
    });

    const row = createEl("div", {
        display: "flex",
        gap: "24px"
    });

    // LEFT: Stats card
    const statsCard = renderStatsCard(data);
    row.appendChild(statsCard);

    console.log("Rendered stats card for team:", team, statsCard);

    // RIGHT: Info card + Past games
    const right = createEl("div", {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: "24px"
    });

    const infoCard = await renderTeamInfoCard(
        team, 
        conference, 
        wins, 
        losses,
        (confName) => renderConferenceStats(confName, PgStats, conferenceStandings, (teamName) =>
            renderTeamStats(teamName, PgStats, conferenceStandings, displayBoxScore, renderConferenceStats)
        )
    );
    right.appendChild(infoCard);

    console.log("Rendered info card for team:", team, infoCard);

    const pastGames = await fetchPastTeamGames(team);
    // Wrap displayBoxScore to include team context
    const displayBoxScoreWithContext = (gameID, gameDate, teamRanks) => {
        displayBoxScore(gameID, gameDate, teamRanks, { type: "team", teamName: team });
    };
    const pastGamesContainer = await renderPastGames(pastGames, team, displayBoxScoreWithContext);
    right.appendChild(pastGamesContainer);

    row.appendChild(right);
    root.appendChild(row);

    console.log("Rendered past games for team:", team, pastGamesContainer);

    // Calculate optimal viewport height to prevent half-card visibility
    setTimeout(() => {
        const pastGamesList = pastGamesContainer.querySelector('[data-role="team-past-games-list"]');
        if (pastGamesList && pastGamesList.children.length >= 2) {
            const firstCard = pastGamesList.children[0];
            const secondCard = pastGamesList.children[1];
            
            // Calculate stride (card height + gap)
            const stride = secondCard.offsetTop - firstCard.offsetTop;
            
            // Get available height (maxHeight from CSS)
            const availableHeight = 541; // matches maxHeight in renderPastGames
            
            // Calculate how many full cards fit
            const maxVisibleCards = Math.floor(availableHeight / stride);
            
            // Set exact height to show only complete cards
            const viewportHeight = maxVisibleCards * stride;
            pastGamesList.style.height = `${viewportHeight}px`;
            pastGamesList.style.maxHeight = `${viewportHeight}px`;
        }
    }, 0);

    // Upcoming games
    const futureGames = await fetchFutureTeamGames(team, new Date().toISOString().split("T")[0]);
    root = await renderUpcomingGames(team, futureGames, root);

    console.log("Rendered upcoming games for team:", team, futureGames);

    // Stat rankings section
    const majorStats = [
        { stat: "team_pts", label: "PPG" },
        { stat: "pts_allowed", label: "oPPG" },
        { stat: "team_fg_pct", label: "Field Goal %" },
        { stat: "team_fg3_pct", label: "3-Point %" },
        { stat: "team_ft_pct", label: "Free Throw %" },
        { stat: "fg_pct_allowed", label: "oFG%" },
        { stat: "team_ast", label: "Assists" },
        { stat: "team_trb", label: "Rebounds" },
        { stat: "forced_tov", label: "Forced Turnovers" }
    ];

    const rankingsSection = createEl("div", {
        marginTop: "24px",
        padding: "24px",
        background: "#FFFFFF",
        borderRadius: "8px",
        border: "1px solid #E8E8E8",
        boxShadow: "0 4px 12px rgba(0, 32, 91, 0.08)"
    });

    const rankingsTitle = createSectionTitle("Stat Rankings");
    rankingsTitle.style.borderBottom = "2px solid #BA0C2F";
    rankingsSection.appendChild(rankingsTitle);

    const rankingsTiles = createEl("div", {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "16px"
    });

    // Fetch ranks for each major stat
    for (const statConfig of majorStats) {
        const tile = createEl("div", {
            padding: "16px",
            background: "#F5F5F5",
            borderRadius: "8px",
            border: "1px solid #E8E8E8",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            transition: "all 0.2s ease"
        });

        tile.onmouseover = () => {
            tile.style.borderColor = "#00205B";
            tile.style.boxShadow = "0 4px 12px rgba(0, 32, 91, 0.15)";
        };

        tile.onmouseout = () => {
            tile.style.borderColor = "#E8E8E8";
            tile.style.boxShadow = "none";
        };

        const statLabel = createEl("div", {
            fontSize: "13px",
            fontWeight: "700",
            color: "#666666",
            textTransform: "uppercase",
            letterSpacing: "0.5px"
        });
        statLabel.textContent = statConfig.label;
        tile.appendChild(statLabel);

        const rankContainer = createEl("div", {
            display: "flex",
            gap: "16px",
            alignItems: "center"
        });

        const nationalRankEl = createEl("div", {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
            flex: 1
        });

        const nationalLabel = createEl("div", {
            fontSize: "11px",
            color: "#666666",
            fontWeight: "600"
        });
        nationalLabel.textContent = "National";
        nationalRankEl.appendChild(nationalLabel);

        const nationalRank = createEl("div", {
            fontSize: "24px",
            fontWeight: "800",
            color: "#00205B"
        });
        nationalRank.textContent = "—";
        nationalRankEl.appendChild(nationalRank);
        rankContainer.appendChild(nationalRankEl);

        const divider = createEl("div", {
            width: "1px",
            height: "50px",
            background: "#E8E8E8"
        });
        rankContainer.appendChild(divider);

        const confRankEl = createEl("div", {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
            flex: 1
        });

        const confLabel = createEl("div", {
            fontSize: "11px",
            color: "#666666",
            fontWeight: "600"
        });
        confLabel.textContent = "Conference";
        confRankEl.appendChild(confLabel);

        const confRank = createEl("div", {
            fontSize: "24px",
            fontWeight: "800",
            color: "#BA0C2F"
        });
        confRank.textContent = "—";
        confRankEl.appendChild(confRank);
        rankContainer.appendChild(confRankEl);

        tile.appendChild(rankContainer);
        rankingsTiles.appendChild(tile);

        // Fetch ranks
        try {
            const nationalResponse = await fetch(`http://localhost:4000/pg_stats/national_team_pg_rank?stat=${statConfig.stat}&team=${encodeURIComponent(team)}`);
            if (nationalResponse.ok) {
                const nationalData = await nationalResponse.json();
                nationalRank.textContent = nationalData.Rank;
            }
        } catch (error) {
            console.error(`Error fetching national rank for ${statConfig.stat}:`, error);
        }

        try {
            const confResponse = await fetch(`http://localhost:4000/pg_stats/conference_team_pg_rank?stat=${statConfig.stat}&team=${encodeURIComponent(team)}&conference=${encodeURIComponent(conference)}`);
            if (confResponse.ok) {
                const confData = await confResponse.json();
                confRank.textContent = confData.Rank;
            }
        } catch (error) {
            console.error(`Error fetching conference rank for ${statConfig.stat}:`, error);
        }
    }

    rankingsSection.appendChild(rankingsTiles);
    root.appendChild(rankingsSection);

    console.log("Rendered stat rankings for team:", team);

    PgStats.appendChild(root);
    
    console.log("Finalized team stats rendering for team:", team);

    loadingOverlay.remove();
    } catch (error) {
        console.error("Error rendering team stats:", error);
        hideLoadingOverlay();
        PgStats.innerHTML = '<div style="color: #BA0C2F; padding: 20px;">Error loading team stats. Please try again.</div>';
    }
}
