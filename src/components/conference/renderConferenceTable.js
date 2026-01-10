import { fetchConferenceStandings, fetchTeamImage } from "../../utils/fetch.js";
import { createEl, append } from "../../utils/dom.js";

export async function renderConferenceTable(confName, PgStats, conferenceStandings, onTeamClick) {

    // Show loading overlay
    
    PgStats.style.display = "none";
    conferenceStandings.style.display = "block";
    conferenceStandings.innerHTML = "";

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
        conferenceStandings.appendChild(homeButton);
    }

    const rows = await fetchConferenceStandings(confName);
    console.log(rows);
    
    const root = createEl("div", {
        marginTop: "24px",
        marginBottom: "24px"
    });

    // Title with NCAA underline
    const title = createEl("div", {
        marginBottom: "24px",
        paddingBottom: "16px",
        borderBottom: "3px solid #BA0C2F"
    });

    const titleText = createEl("h2", {
        margin: "0",
        fontSize: "24px",
        fontWeight: "700",
        color: "#00205B",
        letterSpacing: "0.5px",
        textTransform: "uppercase"
    });
    titleText.textContent = `${confName} Standings`;
    title.appendChild(titleText);
    root.appendChild(title);

    const grid = createEl("div", {
        display: "grid",
        gap: "8px"
    });

    // Header row
    const headerRow = createEl("div", {
        display: "grid",
        gridTemplateColumns: "2fr 60px 60px 70px 70px 80px 80px",
        gap: "12px",
        padding: "14px 16px",
        background: "#00205B",
        borderRadius: "8px",
        alignItems: "center",
        marginBottom: "8px"
    });

    const headers = ["Team", "W", "L", "W%", "Conf W", "Conf L", "Conf %"];
    headers.forEach((header, idx) => {
        const headerCell = createEl("div", {
            fontWeight: "700",
            fontSize: "11px",
            color: "#FFFFFF",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            textAlign: idx === 0 ? "left" : "center"
        });
        headerCell.textContent = header;
        headerRow.appendChild(headerCell);
    });

    grid.appendChild(headerRow);

    console.log(rows);

    // Data rows
    let rankIndex = 1;
    for (const row of rows) {
        const currentRank = rankIndex;
        const r = createEl("div", {
            display: "grid",
            gridTemplateColumns: "2fr 60px 60px 70px 70px 80px 80px",
            gap: "12px",
            padding: "14px 16px",
            background: currentRank % 2 === 0 ? "#F5F5F5" : "#FFFFFF",
            borderRadius: "8px",
            border: "1px solid #E8E8E8",
            alignItems: "center",
            transition: "all 0.2s ease",
            cursor: "pointer"
        });

        r.onmouseenter = () => {
            r.style.background = "rgba(0, 32, 91, 0.05)";
            r.style.borderColor = "#00205B";
            r.style.boxShadow = "0 2px 8px rgba(0, 32, 91, 0.12)";
        };

        r.onmouseleave = () => {
            r.style.background = currentRank % 2 === 0 ? "#F5F5F5" : "#FFFFFF";
            r.style.borderColor = "#E8E8E8";
            r.style.boxShadow = "none";
        };

        r.onclick = () => onTeamClick(row.Team);

        // Team cell with logo and rank badge
        const teamCell = createEl("div", {
            display: "flex",
            alignItems: "center",
            gap: "12px"
        });

        const logoContainer = createEl("div", {
            position: "relative",
            width: "40px",
            height: "40px",
            flexShrink: "0"
        });

        const logo = createEl("img", {
            width: "100%",
            height: "100%",
            objectFit: "contain"
        });

        logo.src = await fetchTeamImage(row.Team);

        const rankBadge = createEl("div", {
            position: "absolute",
            top: "-8px",
            right: "-8px",
            background: "#00205B",
            color: "#FFFFFF",
            width: "22px",
            height: "22px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "700",
            fontSize: "11px",
            border: "2px solid #FFFFFF",
            boxShadow: "0 2px 6px rgba(0, 32, 91, 0.3)"
        });
        rankBadge.textContent = row.rank && row.rank !== "NR" ? row.rank : "";
        if (!row.rank || row.rank === "NR") rankBadge.style.display = "none";

        logoContainer.appendChild(logo);
        logoContainer.appendChild(rankBadge);

        const name = createEl("div", {
            fontWeight: "600",
            fontSize: "15px",
            color: "#222222"
        });
        name.textContent = row.Team;

        append(teamCell, logoContainer, name);
        r.appendChild(teamCell);

        // Stats cells
        const stats = [
            row.wins || 0,
            row.losses || 0,
            row.overall_win_pct || "-",
            row.conference_wins || 0,
            row.conference_losses || 0,
            row.conf_win_pct || "-"
        ];

        stats.forEach(stat => {
            const cell = createEl("div", {
                fontWeight: "700",
                fontSize: "15px",
                color: "#00205B",
                textAlign: "center"
            });
            cell.textContent = stat;
            r.appendChild(cell);
        });

        grid.appendChild(r);
        rankIndex++;
    }

    append(root, grid);
    conferenceStandings.appendChild(root);
}
