// components/teamStats/renderUpcomingGames.js

import { fetchTeamImage, fetchTeamPgStats, fetchConferenceStandings } from "../../utils/fetch.js";
import { SmallRankBadge } from "../shared/SmallRankBadge.js";
import { createSectionTitle } from "../shared/SectionTitle.js";
import { createEl, append } from "../../utils/dom.js";
import { renderGamePredictionThermometer } from "../shared/renderGamePredictionThermometer.js";

export async function renderUpcomingGames(team, games, container) {
    const wrapper = document.createElement("div");
    wrapper.style.width = "100%";

    const card = document.createElement("div");
    card.style.background = "#FFFFFF";
    card.style.borderRadius = "8px";
    card.style.padding = "24px";
    card.style.boxShadow = "0 4px 12px rgba(0, 32, 91, 0.12)";
    card.style.border = "1px solid #E8E8E8";
    card.style.width = "100%";

    // Title
    const title = createSectionTitle("Upcoming Games");
    title.style.borderBottom = "3px solid #BA0C2F";
    title.style.color = "#00205B";
    card.appendChild(title);

    const gamesContainer = document.createElement("div");
    gamesContainer.id = "upcoming-games-container";
    gamesContainer.style.display = "flex";
    gamesContainer.style.gap = "20px";
    gamesContainer.style.overflowX = "auto";
    gamesContainer.style.scrollBehavior = "smooth";
    gamesContainer.style.padding = "16px 0";
    gamesContainer.style.scrollbarWidth = "thin";
    gamesContainer.style.marginTop = "16px";

    if (games.length === 0) {
        const msg = document.createElement("div");
        msg.textContent = "No upcoming games";
        msg.style.color = "#666666";
        msg.style.textAlign = "center";
        msg.style.padding = "20px";
        gamesContainer.appendChild(msg);
        card.appendChild(gamesContainer);
        wrapper.appendChild(card);
        container.appendChild(wrapper);
        return container;
    }

    // Get team conference
    let teamConferences = {};
    try {
        const teamConferencesResponse = await fetch('http://localhost:4000/teams/all_team_conferences');
        if (teamConferencesResponse.ok) {
            teamConferences = await teamConferencesResponse.json();
        }
    } catch (error) {
        console.error("Error fetching team conferences:", error);
    }
    const teamConference = teamConferences[team];

    // Fetch predictions and standings for next 5 games in parallel
    const gamesWithData = await Promise.all(
        games.slice(0, 5).map(async (game) => {
            const gameData = { ...game };
            const opponent = game.opponent || game.Opponent;
            gameData.opponent = opponent;
            
            // Get opponent conference
            const opponentConference = teamConferences[opponent];
            gameData.teamConference = teamConference;
            gameData.opponentConference = opponentConference;
            gameData.isConferenceGame = teamConference && opponentConference && teamConference === opponentConference;
            
            try {
                // Fetch standings for team
                if (teamConference) {
                    const standingsResponse = await fetch(`http://localhost:4000/standings/conference_standings?conference=${encodeURIComponent(teamConference)}`);
                    if (standingsResponse.ok) {
                        const standings = await standingsResponse.json();
                        gameData.teamRecord = standings.find(s => s.Team === team);
                    }
                }
                
                // Fetch standings for opponent
                if (opponentConference) {
                    const standingsOpponentResponse = await fetch(`http://localhost:4000/standings/conference_standings?conference=${encodeURIComponent(opponentConference)}`);
                    if (standingsOpponentResponse.ok) {
                        const standingsOpponent = await standingsOpponentResponse.json();
                        gameData.opponentRecord = standingsOpponent.find(s => s.Team === opponent);
                    }
                }
                
                // Determine location for prediction
                let location = game.location ? game.location.toLowerCase() : "neutral";
                if (location.includes("home") || location === team.toLowerCase()) {
                    location = "home";
                } else if (location.includes("away") || location === opponent.toLowerCase()) {
                    location = "away";
                } else {
                    location = "neutral";
                }
                
                // Fetch predictions
                const cleanDate = new Date(game.date).toISOString().split("T")[0];
                const predUrl = `http://localhost:4000/predict/game_points?team=${encodeURIComponent(team)}&opponent=${encodeURIComponent(opponent)}&gamedate=${cleanDate}&location=${location}`;
                const predResponse = await fetch(predUrl);
                
                if (predResponse.ok) {
                    const predictions = await predResponse.json();
                    gameData.predictions = predictions;
                }
                
                // Fetch team logos
                gameData.teamLogo = await fetchTeamImage(team);
                gameData.opponentLogo = await fetchTeamImage(opponent);
                
            } catch (error) {
                console.warn(`Failed to fetch data for ${team} vs ${opponent}:`, error);
            }
            
            return gameData;
        })
    );

    // Render each game as a hero-style card
    gamesWithData.forEach(game => {
        const gameCard = createEl("div");
        gameCard.className = "game-card";
        gameCard.style.cursor = "pointer";
        
        // Make card clickable to navigate to matchup page
        gameCard.addEventListener("click", () => {
            let urlLocation = "neutral";
            if (game.location) {
                const locLower = game.location.toLowerCase();
                if (locLower.includes("home") || locLower === team.toLowerCase()) {
                    urlLocation = "home";
                } else if (locLower.includes("away") || locLower === game.opponent.toLowerCase()) {
                    urlLocation = "away";
                }
            }
            
            const cleanDate = new Date(game.date).toISOString().split("T")[0];
            const params = new URLSearchParams({
                team1: team,
                team2: game.opponent,
                date: cleanDate,
                location: urlLocation
            });
            window.location.href = `matchup.html?${params.toString()}`;
        });
        
        const matchup = createEl("div");
        matchup.className = "game-matchup";
        matchup.style.display = "flex";
        matchup.style.justifyContent = "space-around";
        matchup.style.alignItems = "center";
        matchup.style.gap = "24px";
        matchup.style.marginBottom = "16px";
        matchup.style.width = "100%";
        matchup.style.position = "relative";
        matchup.style.paddingTop = "8px";
        
        // Team (home team)
        const teamContainer = createEl("div");
        teamContainer.className = "game-team-container";
        teamContainer.style.display = "flex";
        teamContainer.style.flexDirection = "column";
        teamContainer.style.alignItems = "center";
        teamContainer.style.gap = "8px";
        teamContainer.style.flex = "1";
        
        const logoWrapper = createEl("div");
        logoWrapper.style.position = "relative";
        logoWrapper.style.display = "inline-block";
        
        const teamLogo = document.createElement("img");
        teamLogo.className = "game-team-logo";
        teamLogo.style.width = "64px";
        teamLogo.style.height = "64px";
        teamLogo.style.objectFit = "contain";
        teamLogo.src = game.teamLogo;
        teamLogo.alt = team;
        logoWrapper.appendChild(teamLogo);
        
        // Add rank badge if available and not NR
        if (game.teamRecord && game.teamRecord.rank && game.teamRecord.rank !== "NR") {
            const badge = SmallRankBadge();
            badge.textContent = game.teamRecord.rank;
            badge.style.visibility = "visible";
            logoWrapper.appendChild(badge);
        }
        
        teamContainer.appendChild(logoWrapper);
        const teamName = createEl("div");
        teamName.className = "game-team";
        teamName.style.fontSize = "16px";
        teamName.style.fontWeight = "700";
        teamName.style.color = "#222222";
        teamName.style.textAlign = "center";
        teamName.textContent = team;
        teamContainer.appendChild(teamName);
        
        // Add team record
        if (game.teamRecord) {
            const teamRecord = createEl("div");
            teamRecord.className = "game-team-record";
            teamRecord.style.fontSize = "12px";
            teamRecord.style.color = "#666666";
            teamRecord.textContent = `${game.teamRecord.wins}-${game.teamRecord.losses} (${game.teamRecord.conference_wins}-${game.teamRecord.conference_losses})`;
            teamContainer.appendChild(teamRecord);
        }
        
        // VS or @ based on location
        const vs = createEl("div");
        vs.className = "game-vs";
        vs.style.fontSize = "18px";
        vs.style.fontWeight = "700";
        vs.style.color = "#666666";
        
        // Determine if team is home or away
        let isHome = true; // default to home/neutral (vs)
        if (game.location) {
            const locLower = game.location.toLowerCase();
            if (locLower.includes("away") || locLower === game.opponent.toLowerCase()) {
                isHome = false;
            }
        }
        vs.textContent = isHome ? "vs" : "@";
        
        // Opponent
        const opponentContainer = createEl("div");
        opponentContainer.className = "game-team-container";
        opponentContainer.style.display = "flex";
        opponentContainer.style.flexDirection = "column";
        opponentContainer.style.alignItems = "center";
        opponentContainer.style.gap = "8px";
        opponentContainer.style.flex = "1";
        
        const logoWrapper2 = createEl("div");
        logoWrapper2.style.position = "relative";
        logoWrapper2.style.display = "inline-block";
        
        const opponentLogo = document.createElement("img");
        opponentLogo.className = "game-team-logo";
        opponentLogo.style.width = "64px";
        opponentLogo.style.height = "64px";
        opponentLogo.style.objectFit = "contain";
        opponentLogo.src = game.opponentLogo;
        opponentLogo.alt = game.opponent;
        logoWrapper2.appendChild(opponentLogo);
        
        // Add rank badge if available and not NR
        if (game.opponentRecord && game.opponentRecord.rank && game.opponentRecord.rank !== "NR") {
            const badge = SmallRankBadge();
            badge.textContent = game.opponentRecord.rank;
            badge.style.visibility = "visible";
            logoWrapper2.appendChild(badge);
        }
        
        opponentContainer.appendChild(logoWrapper2);
        const opponentName = createEl("div");
        opponentName.className = "game-team";
        opponentName.style.fontSize = "16px";
        opponentName.style.fontWeight = "700";
        opponentName.style.color = "#222222";
        opponentName.style.textAlign = "center";
        opponentName.textContent = game.opponent;
        opponentContainer.appendChild(opponentName);
        
        // Add opponent record
        if (game.opponentRecord) {
            const opponentRecord = createEl("div");
            opponentRecord.className = "game-team-record";
            opponentRecord.style.fontSize = "12px";
            opponentRecord.style.color = "#666666";
            opponentRecord.textContent = `${game.opponentRecord.wins}-${game.opponentRecord.losses} (${game.opponentRecord.conference_wins}-${game.opponentRecord.conference_losses})`;
            opponentContainer.appendChild(opponentRecord);
        }
        
        append(matchup, teamContainer, vs, opponentContainer);
        
        // Add conference game indicator if applicable
        if (game.isConferenceGame) {
            const confIndicator = createEl("div");
            confIndicator.className = "game-conference-indicator";
            confIndicator.style.position = "absolute";
            confIndicator.style.top = "-8px";
            confIndicator.style.left = "50%";
            confIndicator.style.transform = "translateX(-50%)";
            confIndicator.style.color = "white";
            confIndicator.style.fontSize = "9px";
            confIndicator.style.fontWeight = "700";
            confIndicator.style.textTransform = "uppercase";
            confIndicator.style.padding = "3px 8px";
            confIndicator.style.borderRadius = "10px";
            confIndicator.style.letterSpacing = "0.5px";
            confIndicator.style.boxShadow = "0 2px 4px rgba(0, 32, 91, 0.2)";
            confIndicator.style.whiteSpace = "nowrap";
            confIndicator.style.zIndex = "1";
            confIndicator.textContent = `${game.teamConference} Game`;
            matchup.appendChild(confIndicator);
        }
        
        gameCard.appendChild(matchup);
        
        // Add prediction thermometer if available
        if (game.predictions) {
            try {
                const teamPred = game.predictions[team];
                const opponentPred = game.predictions[game.opponent];
                
                if (teamPred && opponentPred) {
                    const thermometer = renderGamePredictionThermometer(
                        teamPred,
                        opponentPred,
                        team,
                        game.opponent
                    );
                    gameCard.appendChild(thermometer);
                }
            } catch (error) {
                console.warn("Error rendering thermometer:", error);
            }
        }
        
        gamesContainer.appendChild(gameCard);
    });

    card.appendChild(gamesContainer);
    wrapper.appendChild(card);
    container.appendChild(wrapper);

    return container;
}
