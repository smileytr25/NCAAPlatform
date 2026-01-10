import { createEl, append } from "../../utils/dom.js";
import { fetchTeamImage } from "../../utils/fetch.js";

export async function renderConferencePreview() {
    const container = document.getElementById("conference-preview-grid");
    if (!container) return;

    const majorConferences = ["Big Ten", "SEC", "ACC", "Big 12", "Big East", "WCC", "MVC"];
    
    try {
        container.innerHTML = "";
        
        for (const conf of majorConferences) {
            try {
                const response = await fetch(`http://localhost:4000/standings/conference_standings?conference=${encodeURIComponent(conf)}`);
                if (!response.ok) continue;
                
                const standings = await response.json();
                if (!standings || standings.length === 0) continue;
                
                const card = createEl("div", { className: "conference-card" });
                
                const confName = createEl("div", { className: "conference-name" });
                confName.textContent = conf;
                card.appendChild(confName);
                
                // Show top 3 teams
                const topTeams = standings.slice(0, 3);
                for (let idx = 0; idx < topTeams.length; idx++) {
                    const team = topTeams[idx];
                    const teamRow = createEl("div", { className: "conference-team" });
                    
                    // Get team logo
                    const logoImg = document.createElement("img");
                    logoImg.className = "conference-team-logo";
                    logoImg.alt = team.Team;
                    
                    try {
                        const logoUrl = await fetchTeamImage(team.Team);
                        if (logoUrl) {
                            logoImg.src = logoUrl;
                        } else {
                            logoImg.style.display = 'none';
                        }
                    } catch {
                        logoImg.style.display = 'none';
                    }
                    
                    teamRow.appendChild(logoImg);
                    
                    const teamName = createEl("div", { className: "conference-team-name" });
                    teamName.textContent = team.Team;
                    teamRow.appendChild(teamName);
                    
                    const overallRecord = createEl("div", { className: "conference-team-record" });
                    overallRecord.textContent = `${team.wins}-${team.losses}`;
                    teamRow.appendChild(overallRecord);
                    
                    card.appendChild(teamRow);
                }
                
                container.appendChild(card);
            } catch (error) {
                console.error(`Error loading ${conf}:`, error);
            }
        }
        
        // Setup scroll arrows
        setupScrollArrows("conference-preview-grid", "conference-scroll-left", "conference-scroll-right");
    } catch (error) {
        console.error("Error loading conference previews:", error);
    }
}

function setupScrollArrows(containerId, leftArrowId, rightArrowId) {
    const container = document.getElementById(containerId);
    const leftArrow = document.getElementById(leftArrowId);
    const rightArrow = document.getElementById(rightArrowId);
    
    if (!container || !leftArrow || !rightArrow) return;
    
    leftArrow.addEventListener("click", () => {
        container.scrollBy({ left: -340, behavior: "smooth" });
    });
    
    rightArrow.addEventListener("click", () => {
        container.scrollBy({ left: 340, behavior: "smooth" });
    });
    
    // Update arrow states on scroll
    const updateArrows = () => {
        leftArrow.disabled = container.scrollLeft <= 0;
        rightArrow.disabled = container.scrollLeft >= container.scrollWidth - container.clientWidth;
    };
    
    container.addEventListener("scroll", updateArrows);
    updateArrows();
}
