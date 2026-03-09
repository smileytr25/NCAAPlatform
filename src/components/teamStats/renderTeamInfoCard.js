import { createEl, append } from "../../utils/dom.js";
import { fetchTeamImage, fetchConferenceStandings } from "../../utils/fetch.js";
import { renderConferenceStats } from "../conference/conference.index.js";

export async function renderTeamInfoCard(team, conference, wins, losses, onConferenceClick) {
    const card = createEl("div", {
        background: "#FFFFFF",
        padding: "24px",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0, 32, 91, 0.12)",
        border: "1px solid #E8E8E8",
        display: "flex",
        flexDirection: "column",
        gap: "20px"
    });

    // HEADER
    const header = createEl("div", { display: "flex", gap: "16px" });

    const logoContainer = createEl("div", {
        position: "relative",
        width: "80px",
        height: "80px"
    });

    const img = createEl("img", {
        width: "100%", height: "100%", objectFit: "contain"
    });
    img.src = await fetchTeamImage(team);

    const badge = createEl("div", {
        position: "absolute",
        top: "-8px",
        right: "-8px",
        width: "32px",
        height: "32px",
        borderRadius: "50%",
        background: "#00205B",
        border: "2px solid #FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "700",
        fontSize: "13px",
        color: "#FFFFFF",
        boxShadow: "0 2px 8px rgba(0, 32, 91, 0.25)"
    });

    // Rank spinner first
    const spinner = createEl("div", {
        width: "18px",
        height: "18px",
        border: "2px solid rgba(0, 32, 91, 0.2)",
        borderTop: "2px solid #00205B",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite"
    });
    badge.appendChild(spinner);

    logoContainer.appendChild(img);
    logoContainer.appendChild(badge);

    // Team + Conference
    const infoCol = createEl("div", {
        display: "flex",
        flexDirection: "column",
        gap: "8px"
    });

    const teamNameEl = createEl("div", {
        fontSize: "24px",
        fontWeight: "800",
        color: "#222222"
    });
    teamNameEl.textContent = team;

    const confEl = createEl("div", {
        fontSize: "13px",
        fontWeight: "600",
        cursor: "pointer",
        color: "#00205B"
    });
    confEl.textContent = conference;
    if (onConferenceClick) confEl.onclick = () => onConferenceClick(conference);

    infoCol.appendChild(teamNameEl);
    infoCol.appendChild(confEl);

    append(header, logoContainer, infoCol);
    card.appendChild(header);

    // Fetch conference rank
    fetchConferenceStandings(conference)
        .then(rows => {
            for (let i = 0; i < rows.length; i++) {
                if (rows[i].Team === team && rows[i].rank !== "NR") {
                    badge.innerHTML = rows[i].rank;
                    return;
                }
            }
            badge.style.display = "none";
        })
        .catch(error => {
            console.error(`Error fetching conference standings for ${conference}:`, error);
            badge.style.display = "none";
        });

    // RECORD, WIN%, CONF RANK SECTION
    const statsGrid = createEl("div", {
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: "12px",
        paddingTop: "16px",
        borderTop: "1px solid #E8E8E8"
    });

    // Record
    const rec = createEl("div", {
        display: "flex", flexDirection: "column", alignItems: "center"
    });
    const recVal = createEl("div", {
        fontSize: "20px", fontWeight: "700", color: "#00205B"
    });
    recVal.textContent = `${wins}–${losses}`;

    const recLabel = createEl("div", {
        fontSize: "10px",
        fontWeight: "700",
        color: "#666666",
        textTransform: "uppercase"
    });
    recLabel.textContent = "Record";

    append(rec, recVal, recLabel);
    statsGrid.appendChild(rec);

    // Win %
    const wp = (wins / (wins + losses)).toFixed(3);
    const wpBox = createEl("div", {
        display: "flex", flexDirection: "column", alignItems: "center"
    });
    const wpVal = createEl("div", {
        fontSize: "20px", fontWeight: "700", color: "#003087"
    });
    wpVal.textContent = wp;

    const wpLabel = createEl("div", {
        fontSize: "10px", fontWeight: "700",
        color: "#666666",
        textTransform: "uppercase"
    });
    wpLabel.textContent = "Win %";

    append(wpBox, wpVal, wpLabel);
    statsGrid.appendChild(wpBox);

    // Conf Rank placeholder
    const confRankBox = createEl("div", {
        display: "flex", flexDirection: "column", alignItems: "center"
    });
    const confRankVal = createEl("div", {
        fontSize: "20px",
        fontWeight: "700",
        color: "#BA0C2F",
        height: "28px",
        display: "flex",
        alignItems: "center"
    });

    const confSpin = createEl("div", {
        width: "16px",
        height: "16px",
        border: "2px solid rgba(186, 12, 47, 0.2)",
        borderTop: "2px solid #BA0C2F",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite"
    });
    confRankVal.appendChild(confSpin);

    const confRankLabel = createEl("div", {
        fontSize: "10px", fontWeight: "700", color: "#666666",
        textTransform: "uppercase"
    });
    confRankLabel.textContent = "Conf Rank";

    append(confRankBox, confRankVal, confRankLabel);
    statsGrid.appendChild(confRankBox);

    // Fill conf rank
    fetchConferenceStandings(conference)
        .then(rows => {
            for (let i = 0; i < rows.length; i++) {
                if (rows[i].Team === team) {
                    confRankVal.innerHTML = i + 1;
                    return;
                }
            }
        })
        .catch(error => {
            console.error(`Error fetching conference standings for ${conference}:`, error);
            confRankVal.innerHTML = "—";
        });

    card.appendChild(statsGrid);
    return card;
}
