import { createEl, append } from "../../utils/dom.js";
import { fetchTeamImage, fetchFutureTeamGames } from "../../utils/fetch.js";

export async function renderTop25(container, onTeamClick) {
    container.style.display = "block";
    container.innerHTML = "";
    
    const panel = createEl("div", {
        marginTop: "24px",
        marginBottom: "24px"
    });

    // Table wrapper with scroll
    const tableWrapper = createEl("div", {
        overflowX: "auto",
        marginBottom: "24px"
    });

    // Table
    const table = createEl("table", {
        width: "100%",
        borderCollapse: "collapse",
        fontSize: "14px"
    });

    // Header row
    const headerRow = createEl("tr", {
        backgroundColor: "#00205B",
        borderBottom: "3px solid #BA0C2F"
    });

    const headers = ["Rank", "Team", "Conference", "Record", "Next Game"];
    headers.forEach(header => {
        const th = createEl("th", {
            padding: "12px 16px",
            textAlign: "left",
            fontWeight: "700",
            color: "#FFFFFF",
            textTransform: "uppercase",
            fontSize: "12px",
            letterSpacing: "0.5px"
        });
        th.textContent = header;
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    // Fetch and render top 25 teams
    try {
        const response = await fetch("http://localhost:4000/rankings/top_25");
        const rankings = await response.json();
        
        for (let i = 0; i < rankings.length; i++) {
            const ranking = rankings[i];
            const row = createEl("tr", {
                borderBottom: "1px solid #E8E8E8",
                cursor: "pointer",
                transition: "background-color 0.15s",
                height: "70px",
                backgroundColor: i % 2 === 0 ? "#FFFFFF" : "#F5F5F5"
            });

            row.onmouseover = () => row.style.backgroundColor = "rgba(0, 32, 91, 0.05)";
            row.onmouseout = () => row.style.backgroundColor = i % 2 === 0 ? "#FFFFFF" : "#F5F5F5";

            // Rank with badge
            const rankCell = createEl("td", {
                padding: "12px 16px",
                position: "relative",
                width: "70px"
            });

            const rankBadge = createEl("div", {
                width: "36px",
                height: "36px",
                background: "#00205B",
                color: "#FFFFFF",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "800",
                fontSize: "14px",
                boxShadow: "0 2px 6px rgba(0, 32, 91, 0.2)"
            });
            rankBadge.textContent = ranking["Current Rank"];
            rankCell.appendChild(rankBadge);
            row.appendChild(rankCell);

            // Team with logo
            const teamCell = createEl("td", {
                padding: "12px",
                display: "flex",
                alignItems: "center",
                gap: "12px"
            });

            const logoImg = createEl("img", {
                width: "50px",
                height: "50px",
                objectFit: "contain",
                borderRadius: "4px"
            });

            const teamName = createEl("div", {
                fontWeight: "700",
                fontSize: "15px"
            });
            teamName.textContent = ranking.Team;
            teamName.style.cursor = "pointer";
            teamName.style.color = "#00205B";
            teamName.onclick = (e) => {
                e.stopPropagation();
                if (onTeamClick) onTeamClick(ranking.Team);
            };

            // Load team logo
            try {
                const logoUrl = await fetchTeamImage(ranking.Team);
                logoImg.src = logoUrl;
            } catch (e) {
                logoImg.style.display = "none";
            }

            append(teamCell, logoImg, teamName);
            row.appendChild(teamCell);

            // Conference
            const confCell = createEl("td", {
                padding: "12px 16px",
                fontSize: "14px",
                color: "#666666"
            });
            confCell.textContent = ranking.Conference || "—";
            row.appendChild(confCell);

            // Record (W-L)
            const recordCell = createEl("td", {
                padding: "12px 16px",
                fontWeight: "600",
                fontSize: "14px",
                color: "#333333"
            });
            recordCell.textContent = `${ranking.W}-${ranking.L}`;
            row.appendChild(recordCell);

            // Next game
            const gameCell = createEl("td", {
                padding: "12px 16px",
                fontSize: "13px",
                color: "#666666"
            });

            try {
                const today = new Date().toISOString().split("T")[0];
                const futureGames = await fetchFutureTeamGames(ranking.Team, today);

                if (futureGames && futureGames.length > 0) {
                    const nextGame = futureGames[0];
                    const gameDate = new Date(nextGame.date);
                    const dateStr = gameDate.toLocaleDateString("en-US", { 
                        month: "short", 
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                    });
                    gameCell.textContent = `vs ${nextGame.opponent} - ${dateStr}`;
                } else {
                    gameCell.textContent = "No upcoming games";
                }
            } catch (e) {
                gameCell.textContent = "—";
            }

            row.appendChild(gameCell);

            // Make entire row clickable for team stats
            row.onclick = () => {
                if (onTeamClick) onTeamClick(ranking.Team);
            };

            table.appendChild(row);
        }
    } catch (error) {
        console.error("Error loading top 25:", error);
        console.error("Error details:", error.message);
        const errorRow = createEl("tr");
        const errorCell = createEl("td", {
            padding: "20px",
            textAlign: "center",
            colSpan: "5",
            color: "#BA0C2F"
        });
        errorCell.textContent = "Failed to load rankings: " + error.message;
        errorRow.appendChild(errorCell);
        table.appendChild(errorRow);
    }

    tableWrapper.appendChild(table);
    panel.appendChild(tableWrapper);
    container.appendChild(panel);
}
