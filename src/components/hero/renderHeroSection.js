import { createEl, append } from "../../utils/dom.js";
import { SmallRankBadge } from "../shared/SmallRankBadge.js";
import { renderGamePredictionThermometer } from "../shared/renderGamePredictionThermometer.js";

export async function renderHeroSection() {
    const gamesContainer = document.getElementById("todays-games-container");
    
    if (!gamesContainer) return;

    try {
        // Get the date for "today's games" (switches at 5:00 AM)
        const now = new Date();
        const hour = now.getHours();
        
        // If it's before 5:00 AM, show yesterday's games
        let gameDate = new Date(now);
        if (hour < 5) {
            gameDate.setDate(gameDate.getDate() - 1);
        }
        
        const today = `${gameDate.getFullYear()}-${String(gameDate.getMonth() + 1).padStart(2, '0')}-${String(gameDate.getDate()).padStart(2, '0')}`;
        
        const response = await fetch(`http://localhost:4000/games/todays_games?date=${today}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Fetch team conferences
        const conferencesResponse = await fetch('http://localhost:4000/teams/all_team_conferences');
        const teamConferences = conferencesResponse.ok ? await conferencesResponse.json() : {};
        
        // Clear and populate games container
        gamesContainer.innerHTML = "";
        
        if (data.games && data.games.length > 0) {
            // Fetch predictions and standings for all games in parallel
            const gamesWithPredictions = await Promise.all(
                data.games.map(async (game) => {
                    const gameData = { ...game };
                    
                    // Get conferences for both teams
                    const team1Conference = teamConferences[game.team1];
                    const team2Conference = teamConferences[game.team2];
                    gameData.team1Conference = team1Conference;
                    gameData.team2Conference = team2Conference;
                    gameData.isConferenceGame = team1Conference && team2Conference && team1Conference === team2Conference;
                    
                    try {
                        // Fetch standings for team 1
                        if (team1Conference) {
                            const standings1Response = await fetch(`http://localhost:4000/standings/conference_standings?conference=${encodeURIComponent(team1Conference)}`);
                            if (standings1Response.ok) {
                                const standings1 = await standings1Response.json();
                                gameData.team1Record = standings1.find(s => s.Team === game.team1);
                            }
                        }
                        
                        // Fetch standings for team 2
                        if (team2Conference) {
                            const standings2Response = await fetch(`http://localhost:4000/standings/conference_standings?conference=${encodeURIComponent(team2Conference)}`);
                            if (standings2Response.ok) {
                                const standings2 = await standings2Response.json();
                                gameData.team2Record = standings2.find(s => s.Team === game.team2);
                            }
                        }
                        
                        // Determine location for prediction API
                        let location = "neutral";
                        if (game.location) {
                            const locLower = game.location.toLowerCase();
                            if (locLower.includes("home") || locLower === game.team1.toLowerCase()) {
                                location = "home";
                            } else if (locLower.includes("away") || locLower === game.team2.toLowerCase()) {
                                location = "away";
                            }
                        }
                        
                        const predUrl = `http://localhost:4000/predict/game_points?team=${encodeURIComponent(game.team1)}&opponent=${encodeURIComponent(game.team2)}&gamedate=${today}&location=${location}`;
                        const predResponse = await fetch(predUrl);
                        
                        if (predResponse.ok) {
                            const predictions = await predResponse.json();
                            gameData.predictions = predictions;
                        }
                    } catch (error) {
                        console.warn(`Failed to fetch data for ${game.team1} vs ${game.team2}:`, error);
                    }
                    return gameData;
                })
            );
            
            gamesWithPredictions.forEach(game => {
                const gameCard = createEl("div");
                gameCard.className = "game-card";
                gameCard.style.cursor = "pointer";
                
                // Make card clickable to navigate to matchup page
                // Capture date for this game card
                const gameDate = today;
                
                gameCard.addEventListener("click", () => {
                    // Determine location for URL
                    let urlLocation = "neutral";
                    if (game.location) {
                        const locLower = game.location.toLowerCase();
                        if (locLower.includes("home") || locLower === game.team1.toLowerCase()) {
                            urlLocation = "home";
                        } else if (locLower.includes("away") || locLower === game.team2.toLowerCase()) {
                            urlLocation = "away";
                        }
                    }
                    
                    const params = new URLSearchParams({
                        team1: game.team1,
                        team2: game.team2,
                        date: gameDate,
                        location: urlLocation
                    });
                    window.location.href = `matchup.html?${params.toString()}`;
                });
                
                const matchup = createEl("div");
                matchup.className = "game-matchup";
                
                // Team 1
                const team1Container = createEl("div");
                team1Container.className = "game-team-container";
                
                const logoWrapper = createEl("div");
                logoWrapper.style.position = "relative";
                logoWrapper.style.display = "inline-block";
                
                if (game.team1_logo) {
                    const team1Logo = document.createElement("img");
                    team1Logo.className = "game-team-logo";
                    team1Logo.src = game.team1_logo;
                    team1Logo.alt = game.team1;
                    team1Logo.onerror = () => {
                        team1Logo.style.display = 'none';
                        const icon = document.createElement('div');
                        icon.className = 'game-team-logo-fallback';
                        icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><ellipse cx="12" cy="12" rx="10" ry="4"/><path d="M12 2 Q 4 12 12 22"/><path d="M12 2 Q 20 12 12 22"/></svg>';
                        logoWrapper.insertBefore(icon, logoWrapper.firstChild);
                    };
                    logoWrapper.appendChild(team1Logo);
                } else {
                    const icon = document.createElement('div');
                    icon.className = 'game-team-logo-fallback';
                    icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><ellipse cx="12" cy="12" rx="10" ry="4"/><path d="M12 2 Q 4 12 12 22"/><path d="M12 2 Q 20 12 12 22"/></svg>';
                    logoWrapper.appendChild(icon);
                }
                
                if (game.team1_rank) {
                    const badge = SmallRankBadge();
                    badge.textContent = game.team1_rank;
                    badge.style.visibility = "visible";
                    logoWrapper.appendChild(badge);
                }
                
                team1Container.appendChild(logoWrapper);
                const team1Name = createEl("div");
                team1Name.className = "game-team";
                team1Name.textContent = game.team1;
                team1Container.appendChild(team1Name);
                
                // Add team 1 record
                if (game.team1Record) {
                    const team1Record = createEl("div");
                    team1Record.className = "game-team-record";
                    team1Record.textContent = `${game.team1Record.wins}-${game.team1Record.losses} (${game.team1Record.conference_wins}-${game.team1Record.conference_losses})`;
                    team1Container.appendChild(team1Record);
                }
                
                // VS
                const vs = createEl("div");
                vs.className = "game-vs";
                vs.textContent = "vs";
                
                // Team 2
                const team2Container = createEl("div");
                team2Container.className = "game-team-container";
                
                const logoWrapper2 = createEl("div");
                logoWrapper2.style.position = "relative";
                logoWrapper2.style.display = "inline-block";
                
                if (game.team2_logo) {
                    const team2Logo = document.createElement("img");
                    team2Logo.className = "game-team-logo";
                    team2Logo.src = game.team2_logo;
                    team2Logo.alt = game.team2;
                    team2Logo.onerror = () => {
                        team2Logo.style.display = 'none';
                        const icon = document.createElement('div');
                        icon.className = 'game-team-logo-fallback';
                        icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><ellipse cx="12" cy="12" rx="10" ry="4"/><path d="M12 2 Q 4 12 12 22"/><path d="M12 2 Q 20 12 12 22"/></svg>';
                        logoWrapper2.insertBefore(icon, logoWrapper2.firstChild);
                    };
                    logoWrapper2.appendChild(team2Logo);
                } else {
                    const icon = document.createElement('div');
                    icon.className = 'game-team-logo-fallback';
                    icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><ellipse cx="12" cy="12" rx="10" ry="4"/><path d="M12 2 Q 4 12 12 22"/><path d="M12 2 Q 20 12 12 22"/></svg>';
                    logoWrapper2.appendChild(icon);
                }
                
                if (game.team2_rank) {
                    const badge = SmallRankBadge();
                    badge.textContent = game.team2_rank;
                    badge.style.visibility = "visible";
                    logoWrapper2.appendChild(badge);
                }
                
                team2Container.appendChild(logoWrapper2);
                const team2Name = createEl("div");
                team2Name.className = "game-team";
                team2Name.textContent = game.team2;
                team2Container.appendChild(team2Name);
                
                // Add team 2 record
                if (game.team2Record) {
                    const team2Record = createEl("div");
                    team2Record.className = "game-team-record";
                    team2Record.textContent = `${game.team2Record.wins}-${game.team2Record.losses} (${game.team2Record.conference_wins}-${game.team2Record.conference_losses})`;
                    team2Container.appendChild(team2Record);
                }
                
                append(matchup, team1Container, vs, team2Container);
                
                // Add conference game indicator if applicable
                if (game.isConferenceGame) {
                    const confIndicator = createEl("div");
                    confIndicator.className = "game-conference-indicator";
                    confIndicator.textContent = `${game.team1Conference} Game`;
                    matchup.appendChild(confIndicator);
                }
                
                gameCard.appendChild(matchup);
                
                // Add prediction thermometer if available
                if (game.predictions) {
                    try {
                        // The API returns {team1Name: {...prediction}, team2Name: {...prediction}}
                        const team1Pred = game.predictions[game.team1];
                        const team2Pred = game.predictions[game.team2];
                        
                        if (team1Pred && team2Pred) {
                            const thermometer = renderGamePredictionThermometer(
                                team1Pred,
                                team2Pred,
                                game.team1,
                                game.team2
                            );
                            gameCard.appendChild(thermometer);
                        }
                    } catch (error) {
                        console.warn("Error rendering thermometer:", error);
                    }
                }
                
                gamesContainer.appendChild(gameCard);
            });
            
            // Setup scroll arrows
            setupScrollArrows("todays-games-container", "today-scroll-left", "today-scroll-right");
        } else {
            const noGames = createEl("div", {
                textAlign: "center",
                padding: "20px",
                color: "#666",
                fontSize: "16px"
            });
            noGames.textContent = "No games scheduled for today";
            gamesContainer.appendChild(noGames);
        }
    } catch (error) {
        console.error("Error fetching today's games:", error);
        gamesContainer.innerHTML = "<div style='text-align: center; padding: 20px; color: #999;'>Unable to load games</div>";
    }
}

function setupScrollArrows(containerId, leftArrowId, rightArrowId) {
    const container = document.getElementById(containerId);
    const leftArrow = document.getElementById(leftArrowId);
    const rightArrow = document.getElementById(rightArrowId);
    
    if (!container || !leftArrow || !rightArrow) return;
    
    leftArrow.addEventListener("click", () => {
        container.scrollBy({ left: -300, behavior: "smooth" });
    });
    
    rightArrow.addEventListener("click", () => {
        container.scrollBy({ left: 300, behavior: "smooth" });
    });
    
    // Update arrow states on scroll
    const updateArrows = () => {
        leftArrow.disabled = container.scrollLeft <= 0;
        rightArrow.disabled = container.scrollLeft >= container.scrollWidth - container.clientWidth;
    };
    
    container.addEventListener("scroll", updateArrows);
    updateArrows();
}
