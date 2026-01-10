import { createEl, append } from "../../utils/dom.js";
import { formatDate } from "../../utils/format.js";
import { fetchTeamImage, fetchBoxScore } from "../../utils/fetch.js";
import { SmallRankBadge } from "../shared/SmallRankBadge.js";
import { renderGamePredictionThermometerWithResults } from "../shared/renderGamePredictionThermometer.js";

export async function renderBoxScore(gameID, gameDate, teamRanks, backContext = {}) {
    const PgStats = document.getElementById("pg_stats");
    PgStats.innerHTML = "";

    const root = createEl("div", {
        marginTop: "24px",
        marginBottom: "24px"
    });

    // Back button (context-aware)
    const backButton = createEl("button", {
        padding: "10px 16px",
        borderRadius: "8px",
        border: "2px solid #00205B",
        background: "#FFFFFF",
        color: "#00205B",
        fontSize: "14px",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.2s ease",
        marginBottom: "16px",
        boxShadow: "0 2px 6px rgba(0, 32, 91, 0.1)"
    });
    
    // Set button text and action based on context
    if (backContext.type === "team") {
        backButton.textContent = `← Back to ${backContext.teamName}`;
        backButton.onclick = () => {
            history.pushState({ view: "team", team: backContext.teamName }, "", window.location.pathname);
            window.dispatchEvent(new PopStateEvent("popstate", { state: { view: "team", team: backContext.teamName } }));
        };
    } else {
        backButton.textContent = "← Back to Home";
        backButton.onclick = () => {
            const scrollPosition = backContext.scrollPosition || 0;
            history.pushState({ view: "home", scrollPosition }, "", window.location.pathname);
            window.dispatchEvent(new PopStateEvent("popstate", { state: { view: "home", scrollPosition } }));
        };
    }
    
    backButton.onmouseover = () => {
        backButton.style.background = "#00205B";
        backButton.style.color = "#FFFFFF";
        backButton.style.boxShadow = "0 4px 12px rgba(0, 32, 91, 0.2)";
    };
    backButton.onmouseout = () => {
        backButton.style.background = "#FFFFFF";
        backButton.style.color = "#00205B";
        backButton.style.boxShadow = "0 2px 6px rgba(0, 32, 91, 0.1)";
    };
    root.appendChild(backButton);

    const box = await fetchBoxScore(gameID);
    const venue = box["venue"];
    const location = box["location"] || "N/A";
    const teams = Object.keys(box).filter(t => t !== "venue" && t !== "location");
    const scores = {};


    // ============ HEADER SECTION ============
    const headerSection = createEl("div", {
        background: "#FFFFFF",
        padding: "24px",
        borderRadius: "8px",
        border: "1px solid #E8E8E8",
        boxShadow: "0 4px 12px rgba(0, 32, 91, 0.12)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "20px",
        marginBottom: "24px"
    });

    // Teams matchup row with even spacing
    const matchupRow = createEl("div", {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0",
        width: "100%"
    });

    teams.forEach((team, index) => {
        const teamCard = createEl("div", {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
            flex: "1",
            justifyContent: "center"
        });

        // Team logo container with rank badge
        const logoContainer = createEl("div", {
            position: "relative",
            width: "80px",
            height: "80px"
        });

        const teamLogo = createEl("img", {
            width: "100%",
            height: "100%",
            objectFit: "contain"
        });
        fetchTeamImage(team).then(src => teamLogo.src = src);

        // Rank badge
        const teamRank = teamRanks?.[team];
        if (teamRank && teamRank !== "NR") {
            const badge = SmallRankBadge();
            badge.textContent = teamRank;
            badge.style.visibility = "visible";
            badge.style.width = "32px";
            badge.style.height = "32px";
            badge.style.fontSize = "13px";
            badge.style.background = "#00205B";
            badge.style.color = "#FFFFFF";
            badge.style.border = "2px solid #FFFFFF";
            badge.style.boxShadow = "0 2px 6px rgba(0, 32, 91, 0.25)";
            logoContainer.appendChild(badge);
        }

        logoContainer.appendChild(teamLogo);
        teamCard.appendChild(logoContainer);

        // Team name
        const teamName = createEl("div", {
            fontSize: "18px",
            fontWeight: "700",
            color: "#222222"
        });
        teamName.textContent = team;
        teamCard.appendChild(teamName);

        // Team record
        const teamRecord = createEl("div", {
            fontSize: "14px",
            color: "#666666",
            fontWeight: "600"
        });
        teamRecord.textContent = "—";
        teamCard.appendChild(teamRecord);

        // Calculate and store total score from players
        const players = box[team];
        let totalScore = 0;
        if (Array.isArray(players)) {
            totalScore = players.reduce((sum, p) => sum + (p.pts || 0), 0);
        }
        scores[team] = Math.round(totalScore);

        // Final score value
        const scoreValue = createEl("div", {
            fontSize: "28px",
            fontWeight: "800",
            color: "#00205B"
        });
        scoreValue.textContent = scores[team];
        teamCard.appendChild(scoreValue);

        // Fetch team record
        fetch(`http://localhost:4000/pg_stats/team_pg_stats?team=${encodeURIComponent(team)}`)
            .then(res => res.json())
            .then(data => {
                let wins = "—", losses = "—";
                for (const [key, value] of data) {
                    if (key === "W") wins = value;
                    if (key === "L") losses = value;
                }
                teamRecord.textContent = `${wins}–${losses}`;
            })
            .catch(err => console.log("Error fetching team record:", err));

        matchupRow.appendChild(teamCard);

        // Add "vs." between teams
        if (index === 0) {
            const vsContainer = createEl("div", {
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                flex: "0 0 80px"
            });
            const vsText = createEl("div", {
                fontSize: "20px",
                fontWeight: "700",
                color: "#666666",
                margin: "0 20px"
            });
            vsText.textContent = "vs.";
            vsContainer.appendChild(vsText);
            matchupRow.appendChild(vsContainer);
        }
    });

    // Venue row
    const venueRow = createEl("div", {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0",
        width: "100%",
        marginTop: "8px"
    });

    const spacer3 = createEl("div", { flex: "1" });
    const venueLabel = createEl("div", {
        fontSize: "12px",
        color: "#666666",
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        flex: "1",
        textAlign: "center"
    });
    venueLabel.textContent = venue || "—";
    const spacer4 = createEl("div", { flex: "1" });

    venueRow.appendChild(spacer3);
    venueRow.appendChild(venueLabel);
    venueRow.appendChild(spacer4);

    // Game date (below)
    const dateText = createEl("div", { fontSize: "14px", color: "#666666" });
    dateText.textContent = formatDate(new Date(gameDate).toISOString().split("T")[0]);

    headerSection.appendChild(matchupRow);
    headerSection.appendChild(venueRow);
    headerSection.appendChild(dateText);
    root.appendChild(headerSection);

    // ============ PREDICTION vs ACTUAL RESULTS SECTION ============
    // Fetch prediction data for both teams
    try {
        const team1 = teams[0];
        const team2 = teams[1];
        
        // Determine opponent location - the location field is relative to team1 in the box score
        let team2Location = location;
        if (location === "home") {
            team2Location = "away";
        } else if (location === "away") {
            team2Location = "home";
        }
        // If neutral, both teams have the same location
        
        // Fetch predictions for both teams
        const prediction1Response = await fetch(
            `http://localhost:4000/predict/game_points?team=${encodeURIComponent(team1)}&opponent=${encodeURIComponent(team2)}&gamedate=${gameDate}&location=${location}`
        );
        const prediction2Response = await fetch(
            `http://localhost:4000/predict/game_points?team=${encodeURIComponent(team2)}&opponent=${encodeURIComponent(team1)}&gamedate=${gameDate}&location=${team2Location}`
        );
        
        if (prediction1Response.ok && prediction2Response.ok) {
            const prediction1 = await prediction1Response.json();
            const prediction2 = await prediction2Response.json();
            
            console.log("Predictions:", prediction1, prediction2);

            const predictionSection = createEl("div", {
                background: "#FFFFFF",
                padding: "24px",
                borderRadius: "8px",
                border: "1px solid #E8E8E8",
                boxShadow: "0 4px 12px rgba(0, 32, 91, 0.12)",
                marginBottom: "24px"
            });
            
            const thermometerComponent = renderGamePredictionThermometerWithResults(
                prediction1,
                prediction2,
                team1,
                team2,
                scores[team1],
                scores[team2]
            );
            
            predictionSection.appendChild(thermometerComponent);
            root.appendChild(predictionSection);
        }
    } catch (error) {
        console.log("Could not load prediction data:", error);
    }

    // ============ TAB BUTTONS ============
    const tabContainer = createEl("div", {
        display: "flex",
        gap: "12px",
        marginBottom: "24px"
    });

    let activeTeam = teams[0];
    const tabButtons = {};

    teams.forEach(team => {
        const tabBtn = createEl("button", {
            padding: "12px 24px",
            fontSize: "14px",
            fontWeight: "600",
            border: "2px solid #E8E8E8",
            borderRadius: "8px",
            cursor: "pointer",
            transition: "all 0.2s ease",
            background: team === activeTeam ? "#00205B" : "#FFFFFF",
            color: team === activeTeam ? "#FFFFFF" : "#222222",
            boxShadow: team === activeTeam ? "0 4px 12px rgba(0, 32, 91, 0.2)" : "0 2px 6px rgba(0, 32, 91, 0.08)"
        });
        tabBtn.textContent = team;

        tabButtons[team] = tabBtn;

        tabBtn.addEventListener("click", () => {
            activeTeam = team;

            Object.keys(tabButtons).forEach(t => {
                if (t === team) {
                    tabButtons[t].style.background = "#00205B";
                    tabButtons[t].style.color = "#FFFFFF";
                    tabButtons[t].style.boxShadow = "0 4px 12px rgba(0, 32, 91, 0.2)";
                } else {
                    tabButtons[t].style.background = "#FFFFFF";
                    tabButtons[t].style.color = "#222222";
                    tabButtons[t].style.boxShadow = "0 2px 6px rgba(0, 32, 91, 0.08)";
                }
            });

            document.querySelectorAll("[data-team-table]").forEach(table => {
                table.style.display = table.getAttribute("data-team-table") === team ? "block" : "none";
            });
        });

        tabContainer.appendChild(tabBtn);
    });

    root.appendChild(tabContainer);

    // ============ BOX SCORE TABLES ============
    const tableSection = createEl("div", { marginTop: "24px" });

    teams.forEach(team => {
        const players = box[team];

        const tableWrapper = createEl("div", {
            display: team === activeTeam ? "block" : "none",
            width: "100%",
            overflowX: "auto",
            background: "#FFFFFF",
            borderRadius: "8px",
            padding: "24px 24px 24px 0",
            boxShadow: "0 4px 12px rgba(0, 32, 91, 0.12)",
            border: "1px solid #E8E8E8"
        });
        tableWrapper.setAttribute("data-team-table", team);

        const table = createEl("div", {
            display: "table",
            width: "100%",
            minWidth: "1200px",
            borderCollapse: "separate",
            borderSpacing: "0 8px",
            paddingLeft: "24px"
        });

        const headerRow = createEl("div", {
            display: "table-row",
            background: "#00205B",
            borderRadius: "8px"
        });

        const displayStats = ["player", "mp", "fgm", "fga", "fg_pct", "fg3m", "fg3a", "fg3_pct", "ftm", "fta", "ft_pct", "orb", "drb", "trb", "ast", "stl", "blk", "tov", "pf", "pts"];

        displayStats.forEach((stat, idx) => {
            const h = createEl("div", {
                display: "table-cell",
                padding: "12px",
                background: "#00205B",
                fontWeight: "700",
                fontSize: "11px",
                textTransform: "uppercase",
                color: "#FFFFFF",
                textAlign: stat === "player" ? "left" : "center",
                borderTopLeftRadius: idx === 0 ? "8px" : "0",
                borderBottomLeftRadius: idx === 0 ? "8px" : "0",
                borderTopRightRadius: idx === displayStats.length - 1 ? "8px" : "0",
                borderBottomRightRadius: idx === displayStats.length - 1 ? "8px" : "0",
                width: stat === "player" ? "200px" : "70px",
                minWidth: stat === "player" ? "200px" : "70px",
                position: stat === "player" ? "sticky" : "relative",
                left: stat === "player" ? "0" : "auto",
                zIndex: stat === "player" ? "10" : "1"
            });
            h.textContent = stat;
            headerRow.appendChild(h);
        });

        table.appendChild(headerRow);

        players.forEach((player, idx) => {
            const row = createEl("div", {
                display: "table-row",
                background: idx % 2 === 0 ? "#FFFFFF" : "#F5F5F5"
            });

            displayStats.forEach((stat, colIdx) => {
                const cell = createEl("div", {
                    display: "table-cell",
                    padding: "12px",
                    background: idx % 2 === 0 ? "#FFFFFF" : "#F5F5F5",
                    textAlign: stat === "player" ? "left" : "center",
                    color: "#222222",
                    verticalAlign: "middle",
                    borderTopLeftRadius: colIdx === 0 ? "8px" : "0",
                    borderBottomLeftRadius: colIdx === 0 ? "8px" : "0",
                    borderTopRightRadius: colIdx === displayStats.length - 1 ? "8px" : "0",
                    borderBottomRightRadius: colIdx === displayStats.length - 1 ? "8px" : "0",
                    width: stat === "player" ? "200px" : "70px",
                    minWidth: stat === "player" ? "200px" : "70px",
                    position: stat === "player" ? "sticky" : "relative",
                    left: stat === "player" ? "0" : "auto",
                    zIndex: stat === "player" ? "5" : "1",
                    boxShadow: stat === "player" ? "2px 0 4px rgba(0, 0, 0, 0.05)" : "none"
                });

                const v = player[stat];
                if (stat === "player") {
                    cell.textContent = v ?? "—";
                } else if (typeof v === "number") {
                    if (stat.endsWith("_pct")) {
                        cell.textContent = (v * 100).toFixed(2) + "%";
                    } else {
                        cell.textContent = Math.round(v);
                    }
                } else {
                    cell.textContent = v ?? "—";
                }

                row.appendChild(cell);
            });

            table.appendChild(row);
        });

        tableWrapper.appendChild(table);
        tableSection.appendChild(tableWrapper);
    });

    root.appendChild(tableSection);
    PgStats.appendChild(root);
}
