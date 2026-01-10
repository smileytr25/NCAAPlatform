import { createEl, append } from "../../utils/dom.js";
import { SmallRankBadge } from "../shared/SmallRankBadge.js";

export async function renderRecentGames(onGameClick) {
    const container = document.getElementById("recent-games-container");
    if (!container) return;

    try {
        const response = await fetch("http://localhost:4000/games/recent_games?n=1000");
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        container.innerHTML = "";
        
        if (data.games && data.games.length > 0) {
            data.games.forEach(game => {
                const card = createEl("div");
                card.className = "recent-game-card";
                
                // Make card clickable
                card.style.cursor = "pointer";
                card.style.transition = "transform 0.2s ease, box-shadow 0.2s ease";
                
                card.addEventListener("mouseenter", () => {
                    card.style.transform = "translateY(-2px)";
                    card.style.boxShadow = "0 8px 16px rgba(0, 32, 91, 0.15)";
                });
                
                card.addEventListener("mouseleave", () => {
                    card.style.transform = "translateY(0)";
                    card.style.boxShadow = "";
                });
                
                // Add click handler to navigate to box score
                card.addEventListener("click", () => {
                    if (onGameClick && game.game_id && game.date) {
                        const teamRanks = {
                            [game.team1]: game.team1_rank,
                            [game.team2]: game.team2_rank
                        };
                        onGameClick(game.game_id, game.date, teamRanks);
                    }
                });
                
                const date = createEl("div");
                date.className = "game-date";
                // Parse date as local date to avoid timezone issues
                const dateParts = game.date.split('-');
                const gameDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
                date.textContent = gameDate.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                });
                
                const result = createEl("div");
                result.className = "game-result";
                
                // Team 1
                const team1 = createEl("div");
                team1.className = "game-result-team";
                
                const logoWrapper1 = createEl("div");
                logoWrapper1.style.position = "relative";
                logoWrapper1.style.display = "inline-block";
                
                if (game.team1_logo) {
                    const team1Logo = document.createElement("img");
                    team1Logo.className = "result-team-logo";
                    team1Logo.src = game.team1_logo;
                    team1Logo.alt = game.team1;
                    team1Logo.onerror = () => {
                        team1Logo.style.display = 'none';
                        const icon = document.createElement('div');
                        icon.className = 'result-team-logo-fallback';
                        icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><ellipse cx="12" cy="12" rx="10" ry="4"/><path d="M12 2 Q 4 12 12 22"/><path d="M12 2 Q 20 12 12 22"/></svg>';
                        logoWrapper1.insertBefore(icon, logoWrapper1.firstChild);
                    };
                    logoWrapper1.appendChild(team1Logo);
                } else {
                    const icon = document.createElement('div');
                    icon.className = 'result-team-logo-fallback';
                    icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><ellipse cx="12" cy="12" rx="10" ry="4"/><path d="M12 2 Q 4 12 12 22"/><path d="M12 2 Q 20 12 12 22"/></svg>';
                    logoWrapper1.appendChild(icon);
                }
                
                if (game.team1_rank) {
                    const badge = SmallRankBadge();
                    badge.textContent = game.team1_rank;
                    badge.style.visibility = "visible";
                    logoWrapper1.appendChild(badge);
                }
                
                team1.appendChild(logoWrapper1);
                const team1Name = createEl("div");
                team1Name.className = "result-team-name";
                team1Name.textContent = game.team1;
                const team1Score = createEl("div");
                team1Score.className = "result-team-score";
                team1Score.textContent = game.team1_pts;
                team1Score.style.color = game.team1_pts > game.team2_pts ? "var(--ncaa-blue)" : "var(--ncaa-gray-400)";
                append(team1, team1Name, team1Score);
                
                const divider = createEl("div");
                divider.className = "result-divider";
                divider.textContent = "-";
                
                // Team 2
                const team2 = createEl("div");
                team2.className = "game-result-team";
                
                const logoWrapper2 = createEl("div");
                logoWrapper2.style.position = "relative";
                logoWrapper2.style.display = "inline-block";
                
                if (game.team2_logo) {
                    const team2Logo = document.createElement("img");
                    team2Logo.className = "result-team-logo";
                    team2Logo.src = game.team2_logo;
                    team2Logo.alt = game.team2;
                    team2Logo.onerror = () => {
                        team2Logo.style.display = 'none';
                        const icon = document.createElement('div');
                        icon.className = 'result-team-logo-fallback';
                        icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><ellipse cx="12" cy="12" rx="10" ry="4"/><path d="M12 2 Q 4 12 12 22"/><path d="M12 2 Q 20 12 12 22"/></svg>';
                        logoWrapper2.insertBefore(icon, logoWrapper2.firstChild);
                    };
                    logoWrapper2.appendChild(team2Logo);
                } else {
                    const icon = document.createElement('div');
                    icon.className = 'result-team-logo-fallback';
                    icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><ellipse cx="12" cy="12" rx="10" ry="4"/><path d="M12 2 Q 4 12 12 22"/><path d="M12 2 Q 20 12 12 22"/></svg>';
                    logoWrapper2.appendChild(icon);
                }
                
                if (game.team2_rank) {
                    const badge = SmallRankBadge();
                    badge.textContent = game.team2_rank;
                    badge.style.visibility = "visible";
                    logoWrapper2.appendChild(badge);
                }
                
                team2.appendChild(logoWrapper2);
                const team2Name = createEl("div");
                team2Name.className = "result-team-name";
                team2Name.textContent = game.team2;
                const team2Score = createEl("div");
                team2Score.className = "result-team-score";
                team2Score.textContent = game.team2_pts;
                team2Score.style.color = game.team2_pts > game.team1_pts ? "var(--ncaa-blue)" : "var(--ncaa-gray-400)";
                append(team2, team2Name, team2Score);
                
                append(result, team1, divider, team2);
                
                append(card, date, result);
                container.appendChild(card);
            });
            
            // Setup scroll arrows
            setupScrollArrows("recent-games-container", "recent-scroll-left", "recent-scroll-right");
        }
    } catch (error) {
        console.error("Error loading recent games:", error);
    }
}

function setupScrollArrows(containerId, leftArrowId, rightArrowId) {
    const container = document.getElementById(containerId);
    const leftArrow = document.getElementById(leftArrowId);
    const rightArrow = document.getElementById(rightArrowId);
    
    if (!container || !leftArrow || !rightArrow) return;
    
    leftArrow.addEventListener("click", () => {
        container.scrollBy({ left: -350, behavior: "smooth" });
    });
    
    rightArrow.addEventListener("click", () => {
        container.scrollBy({ left: 350, behavior: "smooth" });
    });
    
    // Update arrow states on scroll
    const updateArrows = () => {
        leftArrow.disabled = container.scrollLeft <= 0;
        rightArrow.disabled = container.scrollLeft >= container.scrollWidth - container.clientWidth;
    };
    
    container.addEventListener("scroll", updateArrows);
    updateArrows();
}
