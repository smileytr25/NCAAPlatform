export function initUnifiedSearch({ navigateTeam, navigatePlayer, renderConferenceStats }) {
    const searchInput = document.getElementById("unified-search");
    const resultsDropdown = document.getElementById("unified-search-results");
    
    if (!searchInput || !resultsDropdown) return;

    let allPlayers = [];
    let allTeams = [];
    let allConferences = [];
    
    // Fetch all data
    Promise.all([
        fetch("http://localhost:4000/players/all_player_names").then(r => r.json()),
        fetch("http://localhost:4000/teams/all_team_names").then(r => r.json()),
        fetch("http://localhost:4000/conferences/all_conference_names").then(r => r.json())
    ]).then(([playersData, teamsData, confsData]) => {
        allPlayers = playersData.players || [];
        allTeams = teamsData.teams || [];
        allConferences = confsData.conferences || [];
    });

    searchInput.addEventListener("input", (e) => {
        const query = e.target.value.trim().toLowerCase();
        
        if (!query) {
            resultsDropdown.classList.remove("active");
            return;
        }

        // Filter results
        const playerMatches = allPlayers
            .filter(p => p.toLowerCase().includes(query))
            .slice(0, 5);
        
        const teamMatches = allTeams
            .filter(t => t.toLowerCase().includes(query))
            .slice(0, 5);
        
        const confMatches = allConferences
            .filter(c => c.toLowerCase().includes(query))
            .slice(0, 3);

        // Build dropdown
        resultsDropdown.innerHTML = "";
        
        if (playerMatches.length > 0) {
            const category = document.createElement("div");
            category.className = "search-category";
            category.textContent = "Players";
            resultsDropdown.appendChild(category);
            
            playerMatches.forEach(player => {
                const [name, team] = player.split("|");
                const item = document.createElement("div");
                item.className = "search-result-item";
                item.innerHTML = `<strong>${name}</strong> <span style="color: #999;">- ${team}</span>`;
                item.onclick = () => {
                    navigatePlayer(name, team);
                    searchInput.value = "";
                    resultsDropdown.classList.remove("active");
                };
                resultsDropdown.appendChild(item);
            });
        }
        
        if (teamMatches.length > 0) {
            const category = document.createElement("div");
            category.className = "search-category";
            category.textContent = "Teams";
            resultsDropdown.appendChild(category);
            
            teamMatches.forEach(team => {
                const item = document.createElement("div");
                item.className = "search-result-item";
                item.textContent = team;
                item.onclick = () => {
                    navigateTeam(team);
                    searchInput.value = "";
                    resultsDropdown.classList.remove("active");
                };
                resultsDropdown.appendChild(item);
            });
        }
        
        if (confMatches.length > 0) {
            const category = document.createElement("div");
            category.className = "search-category";
            category.textContent = "Conferences";
            resultsDropdown.appendChild(category);
            
            confMatches.forEach(conf => {
                const item = document.createElement("div");
                item.className = "search-result-item";
                item.textContent = conf;
                item.onclick = () => {
                    // Hide all home sections
                    const heroSection = document.getElementById("hero-section");
                    const bracketPromo = document.getElementById("bracket-promo");
                    const conferencePreview = document.getElementById("conference-preview");
                    const recentGamesSection = document.getElementById("recent-games-section");
                    const top25Panel = document.getElementById("top25-panel");
                    const topPlayersPanel = document.getElementById("top-players-panel");
                    const top25Container = top25Panel?.parentElement;
                    const topPlayersContainer = topPlayersPanel?.parentElement;
                    const conferenceStandingsContainer = document.getElementById("conference_standings");
                    const pgStatsContainer = document.getElementById("pg_stats");
                    
                    if (heroSection) heroSection.style.display = "none";
                    if (bracketPromo) bracketPromo.style.display = "none";
                    if (conferencePreview) conferencePreview.style.display = "none";
                    if (recentGamesSection) recentGamesSection.style.display = "none";
                    if (top25Container) top25Container.style.display = "none";
                    if (topPlayersContainer) topPlayersContainer.style.display = "none";
                    if (top25Panel) top25Panel.style.display = "none";
                    if (topPlayersPanel) topPlayersPanel.style.display = "none";
                    
                    renderConferenceStats(conf, pgStatsContainer, conferenceStandingsContainer);
                    searchInput.value = "";
                    resultsDropdown.classList.remove("active");
                };
                resultsDropdown.appendChild(item);
            });
        }
        
        if (playerMatches.length === 0 && teamMatches.length === 0 && confMatches.length === 0) {
            const noResults = document.createElement("div");
            noResults.className = "search-result-item";
            noResults.textContent = "No results found";
            noResults.style.textAlign = "center";
            noResults.style.color = "#999";
            resultsDropdown.appendChild(noResults);
        }
        
        resultsDropdown.classList.add("active");
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
        if (!searchInput.contains(e.target) && !resultsDropdown.contains(e.target)) {
            resultsDropdown.classList.remove("active");
        }
    });
}
