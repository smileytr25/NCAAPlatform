import { createEl, append } from "../../utils/dom.js";
import { fetchPlayerPhoto, fetchTeamImage } from "../../utils/fetch.js";

export async function renderPlayerInfoCard(player, team, conference, onTeamClick, onConferenceClick) {
    try {
        return await renderPlayerInfoCardInternal(player, team, conference, onTeamClick, onConferenceClick);
    } catch (error) {
        console.error("[renderPlayerInfoCard] Fatal error:", error, error.stack);
        throw error;
    }
}

async function renderPlayerInfoCardInternal(player, team, conference, onTeamClick, onConferenceClick) {
    const card = createEl("div", {
        background: "#FFFFFF",
        borderRadius: "8px",
        padding: "24px",
        boxShadow: "0 4px 12px rgba(0, 32, 91, 0.12)",
        border: "1px solid #E8E8E8",
        display: "flex",
        flexDirection: "column",
        gap: "20px"
    });

    // Title
    const title = createEl("div", {
        fontSize: "16px",
        fontWeight: "700",
        color: "#00205B",
        paddingBottom: "12px",
        borderBottom: "3px solid #BA0C2F",
        textTransform: "uppercase",
        letterSpacing: "0.5px"
    });
    title.textContent = "Player Info";
    card.appendChild(title);

    // Content wrapper
    const content = createEl("div", {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px"
    });

    // LEFT — Player Photo with fallback to team logo
    const photoContainer = createEl("div", {
        width: "80px",
        height: "80px",
        borderRadius: "8px",
        overflow: "hidden",
        flexShrink: "0",
        border: "3px solid #00205B",
        boxShadow: "0 4px 12px rgba(0, 32, 91, 0.2)"
    });

    const photo = createEl("img", {
        width: "100%",
        height: "100%",
        objectFit: "cover"
    });
    
    const silhouetteSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style="width:100%; height:100%; background:#f0f0f0;"><circle cx="50" cy="35" r="20" fill="#ccc"/><path d="M 20 100 Q 20 60 50 60 Q 80 60 80 100" fill="#ccc"/></svg>';
    
    const showSilhouette = () => {
        photoContainer.innerHTML = silhouetteSvg;
    };
    
    try {
        console.log(`[1] Starting fetchPlayerPhoto for ${player} on team ${team}`);
        
        const photoResult = await fetchPlayerPhoto(player, team);
        console.log(`[2] fetchPlayerPhoto returned:`, photoResult, typeof photoResult);
        
        if (!photoResult) {
            console.log(`[3] photoResult is falsy, trying team logo`);
            showSilhouette();
        } else if (typeof photoResult !== "string") {
            console.log(`[4] photoResult is not a string, trying silhouettelogo`);
            showSilhouette();
        } else if (!photoResult.startsWith("http")) {
            console.log(`[6] URL doesn't start with http, trying silhouette logo`);
            showSilhouette();
        } else {
            console.log(`[7] Setting photo.src to:`, photoResult);
            photo.src = photoResult;
            photo.onerror = async () => {
                console.log(`[ONERROR] Photo failed to load for ${player}, trying silhouette logo`);
                showSilhouette();
            };
            photoContainer.appendChild(photo);
            console.log(`[8] Successfully set photo.src`);
        }
    } catch (error) {
        console.error(`[ERROR] Loading photo for ${player}:`, error);
        showSilhouette();
    }

    // MIDDLE — Player Name + Team + Conference
    const infoText = createEl("div", {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        flex: "1"
    });

    const nameEl = createEl("div", {
        fontSize: "24px",
        fontWeight: "800",
        color: "#222222"
    });
    nameEl.textContent = player;

    const teamEl = createEl("div", {
        fontSize: "14px",
        fontWeight: "700",
        cursor: "pointer",
        color: "#00205B"
    });
    teamEl.textContent = team;
    if (onTeamClick) teamEl.onclick = () => onTeamClick(team);

    const confEl = createEl("div", {
        fontSize: "13px",
        fontWeight: "600",
        cursor: "pointer",
        color: "#003087"
    });
    confEl.textContent = conference;
    if (onConferenceClick) confEl.onclick = () => onConferenceClick(conference);

    append(infoText, nameEl, teamEl, confEl);

    // RIGHT — Team Logo (only shown if not used as photo fallback)
    const logoContainer = createEl("div", {
        width: "70px",
        height: "70px",
        flexShrink: "0"
    });

    const logo = createEl("img", {
        width: "100%",
        height: "100%",
        objectFit: "contain"
    });
    
    try {
        const logoSrc = await fetchTeamImage(team);
        if (logoSrc) {
            logo.src = logoSrc;
        }
    } catch (error) {
        console.error("[renderPlayerInfoCard] Error loading team logo for sidebar:", error);
        logoContainer.style.display = "none";
    }
    
    logo.onerror = () => logoContainer.style.display = "none";

    logoContainer.appendChild(logo);

    append(content, photoContainer, infoText, logoContainer);
    append(card, content);
    return card;
}
