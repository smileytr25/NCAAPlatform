// Stat category mapping with colors
const statCategories = {
    "Record" : {
        stats: ["W", "L"],
        color: "#15ff0080"
    },
    "Playing" : {
        stats: ["GP", "GS", "MP"],
        color: "black"
    },
    "Points": {
        stats: ["PTS"],
        color: "black"
    },
    "Assists": {
        stats: ["AST"],
        color: "black"
    },
    "Rebounding": {
        stats: ["TRB", "DRB", "ORB"],
        color: "black"
    },
    "Defense": {
        stats: ["BLK", "STL"],
        color: "black"
    },
    "Miscues": {
        stats: ["TOV", "PF"],
        color: "black"
    },
    "Shooting": {
        stats: ["FG", "FGA", "FG%", "2P", "2PA", "2P%", "3P", "3PA", "3P%", "FT", "FTA", "FT%"],
        color: "black"
    },
    "Impact": {
        stats: ["GmSc"],
        color: "black"
    }
};

// Create a map of stat to category and color
const statColorMap = {};
for (const [category, data] of Object.entries(statCategories)) {
    data.stats.forEach(stat => {
        statColorMap[stat] = data.color;
    });
}

function displayBoxScore(boxScoreData, gameID, gameDate, venue, teamRanks = {}) {
    const pgStats = document.getElementById("pg_stats");
    pgStats.innerHTML = "";

    // Create main container
    const container = document.createElement("div");
    container.style.marginTop = "24px";
    container.style.marginBottom = "24px";

    // Game header with team logos and vs
    const headerSection = document.createElement("div");
    headerSection.style.background = "linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)";
    headerSection.style.borderRadius = "12px";
    headerSection.style.padding = "24px";
    headerSection.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
    headerSection.style.border = "1px solid #e8e8e8";
    headerSection.style.marginBottom = "24px";
    headerSection.style.display = "flex";
    headerSection.style.flexDirection = "column";
    headerSection.style.alignItems = "center";
    headerSection.style.gap = "20px";

    // Format game date with full month name, day, and year
    const formatGameDate = (dateStr) => {
        if (!dateStr) return "Unknown Date";
        const [year, month, day] = dateStr.split("-");
        const date = new Date(year, parseInt(month) - 1, day);
        return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    };

    // Game date (will be placed below)
    const gameDate_text = document.createElement("div");
    gameDate_text.textContent = formatGameDate(gameDate);
    gameDate_text.style.fontSize = "14px";
    gameDate_text.style.color = "#888";

    // Teams matchup row with even spacing
    const matchupRow = document.createElement("div");
    matchupRow.style.display = "flex";
    matchupRow.style.alignItems = "center";
    matchupRow.style.justifyContent = "center";
    matchupRow.style.gap = "0";
    matchupRow.style.width = "100%";

    const teams = Object.keys(boxScoreData).filter(k => k !== "Venue");
    const scoreValues = {}; // Store scores for later use

    teams.forEach((team, index) => {
        const teamCard = document.createElement("div");
        teamCard.style.display = "flex";
        teamCard.style.flexDirection = "column";
        teamCard.style.alignItems = "center";
        teamCard.style.gap = "12px";
        teamCard.style.flex = "1";
        teamCard.style.justifyContent = "center";

        // Team logo container with rank badge
        const logoContainer = document.createElement("div");
        logoContainer.style.position = "relative";
        logoContainer.style.width = "80px";
        logoContainer.style.height = "80px";

        const teamLogo = document.createElement("img");
        teamLogo.style.width = "100%";
        teamLogo.style.height = "100%";
        teamLogo.style.objectFit = "contain";

        fetch(`http://localhost:4000/teams/team_image?team=${encodeURIComponent(team)}`)
            .then(res => res.json())
            .then(data => teamLogo.src = data.image)
            .catch(err => console.log("Error fetching team logo:", err));

        // Rank badge
        const rankBadge = document.createElement("div");
        rankBadge.style.position = "absolute";
        rankBadge.style.top = "-8px";
        rankBadge.style.right = "-8px";
        rankBadge.style.background = "white";
        rankBadge.style.color = "black";
        rankBadge.style.width = "36px";
        rankBadge.style.height = "36px";
        rankBadge.style.borderRadius = "50%";
        rankBadge.style.display = "flex";
        rankBadge.style.alignItems = "center";
        rankBadge.style.justifyContent = "center";
        rankBadge.style.fontWeight = "700";
        rankBadge.style.fontSize = "14px";
        rankBadge.style.border = "2px solid black";
        rankBadge.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";

        // Set rank badge if available
        const teamRank = teamRanks[team];
        if (teamRank && teamRank !== "NR") {
            rankBadge.textContent = teamRank;
        } else {
            rankBadge.style.display = "none";
        }

        logoContainer.appendChild(teamLogo);
        logoContainer.appendChild(rankBadge);
        teamCard.appendChild(logoContainer);

        // Team name
        const teamName = document.createElement("div");
        teamName.textContent = team;
        teamName.style.fontSize = "18px";
        teamName.style.fontWeight = "700";
        teamName.style.color = "#111";
        teamCard.appendChild(teamName);

        // Team record
        const teamRecord = document.createElement("div");
        teamRecord.textContent = "—";
        teamRecord.style.fontSize = "14px";
        teamRecord.style.color = "#888";
        teamRecord.style.fontWeight = "600";
        teamCard.appendChild(teamRecord);

        // Calculate and store total score from players
        const players = boxScoreData[team];
        let totalScore = 0;
        if (Array.isArray(players)) {
            players.forEach(player => {
                if (player.PTS && typeof player.PTS === "number") {
                    totalScore += player.PTS;
                }
            });
        }
        scoreValues[team] = Math.round(totalScore);

        // Final score value
        const scoreValue = document.createElement("div");
        scoreValue.style.fontSize = "24px";
        scoreValue.style.fontWeight = "800";
        scoreValue.style.color = "#111";
        scoreValue.textContent = scoreValues[team];
        teamCard.appendChild(scoreValue);

        // Fetch team record
        fetch(`http://localhost:4000/pg_stats/team_pg_stats?team=${encodeURIComponent(team)}`)
            .then(res => res.json())
            .then(data => {
                let wins = 0, losses = 0;
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
            const vsText = document.createElement("div");
            vsText.textContent = "vs.";
            vsText.style.fontSize = "20px";
            vsText.style.fontWeight = "700";
            vsText.style.color = "black";
            vsText.style.flex = "1";
            vsText.style.textAlign = "center";
            matchupRow.appendChild(vsText);
        }
    });

    // "Final" label row - centered between the two scores
    const venueRow = document.createElement("div");
    venueRow.style.display = "flex";
    venueRow.style.alignItems = "center";
    venueRow.style.justifyContent = "center";
    venueRow.style.gap = "0";
    venueRow.style.width = "100%";
    venueRow.style.marginTop = "8px";

    // Create spacer that matches the team cards
    const spacer3 = document.createElement("div");
    spacer3.style.flex = "1";

    const venueLabel = document.createElement("div");
    venueLabel.textContent = venue;
    venueLabel.style.fontSize = "12px";
    venueLabel.style.color = "#888";
    venueLabel.style.fontWeight = "600";
    venueLabel.style.textTransform = "uppercase";
    venueLabel.style.letterSpacing = "0.5px";
    venueLabel.style.flex = "1";
    venueLabel.style.textAlign = "center";

    const spacer4 = document.createElement("div");
    spacer4.style.flex = "1";

    venueRow.appendChild(spacer3);
    venueRow.appendChild(venueLabel);
    venueRow.appendChild(spacer4);

    headerSection.appendChild(matchupRow);
    headerSection.appendChild(venueRow);
    headerSection.appendChild(gameDate_text);
    container.appendChild(headerSection);

    // Tab buttons
    const tabContainer = document.createElement("div");
    tabContainer.style.display = "flex";
    tabContainer.style.gap = "12px";
    tabContainer.style.marginBottom = "24px";

    let activeTeam = teams[0];

    teams.forEach(team => {
        const tabBtn = document.createElement("button");
        tabBtn.textContent = team;
        tabBtn.style.padding = "12px 24px";
        tabBtn.style.fontSize = "14px";
        tabBtn.style.fontWeight = "600";
        tabBtn.style.border = "2px solid #e8e8e8";
        tabBtn.style.borderRadius = "8px";
        tabBtn.style.cursor = "pointer";
        tabBtn.style.transition = "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)";
        tabBtn.style.background = team === activeTeam ? "#2b8becff" : "#ffffff";
        tabBtn.style.color = team === activeTeam ? "#ffffff" : "#111";

        tabBtn.addEventListener("click", () => {
            activeTeam = team;
            
            // Update all tab buttons
            Array.from(tabContainer.querySelectorAll("button")).forEach(btn => {
                if (btn.textContent === team) {
                    btn.style.background = "#2b8becff";
                    btn.style.color = "#ffffff";
                } else {
                    btn.style.background = "#ffffff";
                    btn.style.color = "#111";
                }
            });

            // Show/hide tables
            Array.from(tablesContainer.querySelectorAll("[data-team]")).forEach(table => {
                if (table.getAttribute("data-team") === team) {
                    table.style.display = "block";
                } else {
                    table.style.display = "none";
                }
            });
        });

        tabContainer.appendChild(tabBtn);
    });

    container.appendChild(tabContainer);

    // Tables container
    const tablesContainer = document.createElement("div");

    teams.forEach(team => {
        const players = boxScoreData[team];

        // Team table wrapper with fixed width and scroll
        const tableWrapper = document.createElement("div");
        tableWrapper.setAttribute("data-team", team);
        tableWrapper.style.display = team === activeTeam ? "block" : "none";
        tableWrapper.style.width = "100%";
        tableWrapper.style.overflowX = "auto";
        tableWrapper.style.background = "linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)";
        tableWrapper.style.borderRadius = "12px";
        tableWrapper.style.padding = "24px";
        tableWrapper.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
        tableWrapper.style.border = "1px solid #e8e8e8";

        // Table with fixed width for scrolling
        const table = document.createElement("div");
        table.style.display = "grid";
        table.style.gap = "8px";
        table.style.minWidth = "1200px";

        // Header row
        const headerRow = document.createElement("div");
        headerRow.style.display = "grid";
        headerRow.style.gridTemplateColumns = "150px repeat(19, 70px)";
        headerRow.style.gap = "12px";
        headerRow.style.padding = "12px";
        headerRow.style.background = "#f0f0f0";
        headerRow.style.borderRadius = "8px";
        headerRow.style.fontWeight = "700";
        headerRow.style.fontSize = "12px";
        headerRow.style.textTransform = "uppercase";
        headerRow.style.color = "#666";
        headerRow.style.position = "sticky";
        headerRow.style.left = "0";

        // Key stats to display
        const displayStats = ["Player", "MP", "FG", "FGA", "FG%", "3P", "3PA", "3P%", "FT", "FTA", "FT%", "ORB", "DRB", "TRB", "AST", "STL", "BLK", "TOV", "PF", "PTS"];
        
        displayStats.forEach((stat, idx) => {
            const headerCell = document.createElement("div");
            headerCell.textContent = stat;
            headerCell.style.textAlign = idx === 0 ? "left" : "center";
            headerRow.appendChild(headerCell);
        });

        table.appendChild(headerRow);

        // Player rows
        players.forEach(player => {
            const playerRow = document.createElement("div");
            playerRow.style.display = "grid";
            playerRow.style.gridTemplateColumns = "150px repeat(19, 70px)";
            playerRow.style.gap = "12px";
            playerRow.style.padding = "12px";
            playerRow.style.background = "#fafafa";
            playerRow.style.borderRadius = "8px";
            playerRow.style.fontSize = "13px";
            playerRow.style.transition = "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)";

            playerRow.onmouseenter = () => {
                playerRow.style.background = "#f0f0f0";
            };
            playerRow.onmouseleave = () => {
                playerRow.style.background = "#fafafa";
            };

            displayStats.forEach((stat, idx) => {
                const cell = document.createElement("div");
                const value = player[stat];
                
                if (stat === "Player") {
                    cell.textContent = value;
                    cell.style.fontWeight = "600";
                    cell.style.color = "#111";
                    cell.style.textAlign = "left";
                } else {
                    // Format numeric values
                    if (typeof value === "number") {
                        // Check if stat is a percentage
                        if (stat.endsWith("%")) {
                            cell.textContent = (value * 100).toFixed(1) + "%";
                        } else {
                            cell.textContent = Math.round(value);
                        }
                    } else {
                        cell.textContent = value !== undefined ? value : "—";
                    }
                    cell.style.textAlign = "center";
                    cell.style.color = "#555";
                }

                playerRow.appendChild(cell);
            });

            table.appendChild(playerRow);
        });

        tableWrapper.appendChild(table);
        tablesContainer.appendChild(tableWrapper);
    });

    container.appendChild(tablesContainer);
    pgStats.appendChild(container);
}

playerSelect = document.getElementById("player-select")
const playerOptions = document.getElementById("player-options")
let allPlayers = []
let filteredPlayersByTeam = []

fetch("http://localhost:4000/players/all_player_names")
    .then(res => res.json())
    .then((data) => {
        allPlayers = data.players.map(p => (p.normalize("NFC"))).sort((a, b) => a.localeCompare(b))
        updatePlayerOptions(allPlayers)
    })

function updatePlayerOptions(players) {
    playerOptions.innerHTML = ""
    for (const player of players) {
        const option = document.createElement("div")
        option.className = "dropdown-option"
        option.textContent = player
        option.addEventListener("click", async () => {
            playerSelect.value = player
            playerOptions.classList.remove("active")
            playerOptions.innerHTML = ""
            await fetchPlayerStats(player)
        })
        playerOptions.appendChild(option)
    }
}

playerSelect.addEventListener("input", () => {
    const searchValue = playerSelect.value.toLowerCase()
    const playersToSearch = filteredPlayersByTeam.length > 0 ? filteredPlayersByTeam : allPlayers
    
    if (searchValue === "") {
        updatePlayerOptions(playersToSearch)
        playerOptions.classList.add("active")
    } else {
        const filtered = playersToSearch.filter(p => p.toLowerCase().includes(searchValue))
        updatePlayerOptions(filtered)
        if (filtered.length > 0) {
            playerOptions.classList.add("active")
        } else {
            playerOptions.classList.remove("active")
        }
    }
})

playerSelect.addEventListener("focus", () => {
    // Show options when input is focused
    const playersToShow = filteredPlayersByTeam.length > 0 ? filteredPlayersByTeam : allPlayers
    updatePlayerOptions(playersToShow)
    playerOptions.classList.add("active")
})

playerSelect.addEventListener("blur", () => {
    // Delay closing to allow click on option
    setTimeout(() => {
        playerOptions.classList.remove("active")
    }, 200)
})

const PgStats = document.getElementById("pg_stats")
const conferenceStandings = document.getElementById("conference_standings")

async function fetchPlayerStats(player) {
    const fetchURL = `http://localhost:4000/pg_stats/player_pg_stats?player=${encodeURIComponent(player)}`;
    const res = await fetch(fetchURL);
    const data = await res.json();

    PgStats.style.display = "block";
    PgStats.innerHTML = "";
    conferenceStandings.style.display = "none";

    // Extract team + conference
    let team = "—";
    let conference = "—";

    for (const [key, value] of data) {
        if (key === "Team") team = value;
        if (key === "Conference") conference = value;
    }

    // MAIN PAGE LAYOUT (Left panel + Right panel)
    const container = document.createElement("div");
    container.style.marginTop = "24px";
    container.style.marginBottom = "24px";
    container.style.display = "flex";
    container.style.gap = "24px";

    // ============================================================
    // LEFT PANEL — PLAYER STAT AVERAGES (matches Team Stats sidebar)
    // ============================================================

    const statsCard = document.createElement("div");
    statsCard.style.width = "320px";
    statsCard.style.flexShrink = "0";
    statsCard.style.background = "linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)";
    statsCard.style.borderRadius = "12px";
    statsCard.style.padding = "24px";
    statsCard.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
    statsCard.style.border = "1px solid #e8e8e8";

    const statsTitle = document.createElement("div");
    statsTitle.textContent = "Player Stats";
    statsTitle.style.fontSize = "18px";
    statsTitle.style.fontWeight = "700";
    statsTitle.style.color = "#111";
    statsTitle.style.marginBottom = "20px";
    statsTitle.style.paddingBottom = "12px";
    statsTitle.style.borderBottom = "2px solid #1f77b4";

    statsCard.appendChild(statsTitle);

    // STAT GRID (2 columns)
    const statsGrid = document.createElement("div");
    statsGrid.style.display = "grid";
    statsGrid.style.gridTemplateColumns = "1fr 1fr";
    statsGrid.style.gap = "16px";

    for (const [key, value] of data) {
        if (["Player", "Team", "Conference"].includes(key)) continue;

        const statBox = document.createElement("div");
        statBox.style.display = "flex";
        statBox.style.flexDirection = "column";
        statBox.style.gap = "4px";

        const statVal = document.createElement("div");
        statVal.textContent = typeof value === 'number' ? value.toFixed(2) : value;
        statVal.style.fontSize = "20px";
        statVal.style.fontWeight = "800";
        statVal.style.color = statColorMap[key] || "#000";

        const statLabel = document.createElement("div");
        statLabel.textContent = key;
        statLabel.style.fontSize = "10px";
        statLabel.style.fontWeight = "700";
        statLabel.style.color = "#888";
        statLabel.style.textTransform = "uppercase";

        statBox.appendChild(statVal);
        statBox.appendChild(statLabel);
        statsGrid.appendChild(statBox);
    }

    statsCard.appendChild(statsGrid);
    container.appendChild(statsCard);

    // ============================================================
    // RIGHT SIDE (Player Info + Past Games)
    // ============================================================

    const rightSide = document.createElement("div");
    rightSide.style.flex = "1";
    rightSide.style.display = "flex";
    rightSide.style.flexDirection = "column";
    rightSide.style.gap = "24px";

    // ================
    // PLAYER INFO CARD
    // ================

    const infoCard = document.createElement("div");
    infoCard.style.background = "linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)";
    infoCard.style.borderRadius = "12px";
    infoCard.style.padding = "24px";
    infoCard.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
    infoCard.style.border = "1px solid #e8e8e8";
    infoCard.style.display = "flex";
    infoCard.style.alignItems = "center";
    infoCard.style.justifyContent = "space-between";  // 🔥 important
    infoCard.style.gap = "16px";

    // LEFT — Player Photo
    const photoContainer = document.createElement("div");
    photoContainer.style.width = "80px";
    photoContainer.style.height = "80px";
    photoContainer.style.borderRadius = "8px";
    photoContainer.style.overflow = "hidden";
    photoContainer.style.flexShrink = "0";
    photoContainer.style.border = "3px solid #1f77b4";

    const playerPhoto = document.createElement("img");
    playerPhoto.style.width = "100%";
    playerPhoto.style.height = "100%";
    playerPhoto.style.objectFit = "cover";

    fetch(`http://localhost:4000/players/player_photos?player=${encodeURIComponent(player)}`)
        .then(res => res.json())
        .then(obj => playerPhoto.src = obj.Link);

    playerPhoto.onerror = () => {
        playerPhoto.style.display = "none";
    };

    photoContainer.appendChild(playerPhoto);
    infoCard.appendChild(photoContainer);

    // MIDDLE — Player Name + Team + Conference
    const infoText = document.createElement("div");
    infoText.style.display = "flex";
    infoText.style.flexDirection = "column";
    infoText.style.gap = "8px";
    infoText.style.flex = "1";  // allow this section to expand

    const playerName = document.createElement("div");
    playerName.textContent = player;
    playerName.style.fontSize = "24px";
    playerName.style.fontWeight = "800";
    playerName.style.color = "#111";

    const teamEl = document.createElement("div");
    teamEl.textContent = team;
    teamEl.style.fontSize = "14px";
    teamEl.style.fontWeight = "700";
    teamEl.style.cursor = "pointer";
    teamEl.onclick = () => fetchTeamStats(team);

    const confEl = document.createElement("div");
    confEl.textContent = conference;
    confEl.style.fontSize = "13px";
    confEl.style.fontWeight = "600";
    confEl.style.cursor = "pointer";
    confEl.onclick = () => {
        conferenceSelect.value = conference;
        fetchConferenceStandings(conference);
    };

    infoText.appendChild(playerName);
    infoText.appendChild(teamEl);
    infoText.appendChild(confEl);
    infoCard.appendChild(infoText);

    // RIGHT — Team Logo
    const teamLogoContainer = document.createElement("div");
    teamLogoContainer.style.width = "70px";
    teamLogoContainer.style.height = "70px";
    teamLogoContainer.style.flexShrink = "0";

    const teamLogo = document.createElement("img");
    teamLogo.style.width = "100%";
    teamLogo.style.height = "100%";
    teamLogo.style.objectFit = "contain";

    fetch(`http://localhost:4000/teams/team_image?team=${encodeURIComponent(team)}`)
        .then(res => res.json())
        .then(obj => teamLogo.src = obj.image);

    teamLogo.onerror = () => {
        teamLogoContainer.style.display = "none";
    };

    teamLogoContainer.appendChild(teamLogo);
    infoCard.appendChild(teamLogoContainer);

    // Finally append the card
    rightSide.appendChild(infoCard);

    // ============================================================
    // PAST GAMES PANEL
    // ============================================================

    const pastCard = document.createElement("div");
    pastCard.style.background = "linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)";
    pastCard.style.borderRadius = "12px";
    pastCard.style.padding = "24px";
    pastCard.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
    pastCard.style.border = "1px solid #e8e8e8";
    pastCard.style.flex = "1";

    const pastTitle = document.createElement("div");
    pastTitle.textContent = "Past Games";
    pastTitle.style.fontSize = "18px";
    pastTitle.style.fontWeight = "700";
    pastTitle.style.color = "#111";
    pastTitle.style.marginBottom = "20px";
    pastTitle.style.paddingBottom = "12px";
    pastTitle.style.borderBottom = "2px solid #1f77b4";

    pastCard.appendChild(pastTitle);

    const pastContainer = document.createElement("div");
    pastContainer.style.display = "flex";
    pastContainer.style.flexDirection = "column";
    pastContainer.style.gap = "12px";

    // First fetch team past games:
    const teamGamesRes = await fetch(`http://localhost:4000/teams/past_team_games?team=${encodeURIComponent(team)}`);
    const teamGames = await teamGamesRes.json();

    // For each game → fetch box score → extract THIS PLAYER's stats
    for (const game of teamGames) {
        const isAway = game.Location && game.Location.toLowerCase().includes("away");
        const awayTeam = isAway ? team : game.opp_Team;
        const homeTeam = isAway ? game.opp_Team : team;
        const gameID = `${game.Date}-${awayTeam}-vs-${homeTeam}-m`;

        const boxRes = await fetch(`http://localhost:4000/games/box_score?gameID=${encodeURIComponent(gameID)}`);
        const boxData = await boxRes.json();

        const playerRow = boxData[team].find(p => p.Player === player);

        // Extract player stats
        const PTS = playerRow?.PTS ?? "—";
        const TRB = playerRow?.TRB ?? "—";
        const AST = playerRow?.AST ?? "—";

        const isWin = game.PTS > game.opp_PTS;

        // row container
        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.justifyContent = "space-between";
        row.style.padding = "12px";
        row.style.background = "#fafafa";
        row.style.borderRadius = "8px";
        row.style.cursor = "pointer";
        row.style.transition = "0.25s";

        row.onmouseenter = () => row.style.background = "#f0f0f0";
        row.onmouseleave = () => row.style.background = "#fafafa";

        row.onclick = () =>
            displayBoxScore(boxData, gameID, game.Date, boxData.Venue, {});

        // left: opponent + info
        const left = document.createElement("div");
        left.style.display = "flex";
        left.style.gap = "12px";
        left.style.alignItems = "center";

        const oppLogo = document.createElement("img");
        oppLogo.style.width = "40px";
        oppLogo.style.height = "40px";
        oppLogo.style.objectFit = "contain";

        fetch(`http://localhost:4000/teams/team_image?team=${encodeURIComponent(game.opp_Team)}`)
            .then(r => r.json())
            .then(obj => oppLogo.src = obj.image);

        left.appendChild(oppLogo);

        const text = document.createElement("div");
        text.style.display = "flex";
        text.style.flexDirection = "column";
        text.style.gap = "2px";

        const oppName = document.createElement("div");
        oppName.textContent = game.opp_Team;
        oppName.style.fontWeight = "700";

        const dateEl = document.createElement("div");
        dateEl.textContent = game.Date;
        dateEl.style.fontSize = "12px";
        dateEl.style.color = "#666";

        text.appendChild(oppName);
        text.appendChild(dateEl);

        left.appendChild(text);

        // right: stats
        const statsRight = document.createElement("div");
        statsRight.style.textAlign = "right";

        const line1 = document.createElement("div");
        line1.textContent = `${PTS} pts • ${TRB} reb • ${AST} ast`;
        line1.style.fontSize = "14px";
        line1.style.fontWeight = "700";
        line1.style.color = isWin ? "#1f77b4" : "#d62728";

        statsRight.appendChild(line1);

        row.appendChild(left);
        row.appendChild(statsRight);

        pastContainer.appendChild(row);
    }

    pastCard.appendChild(pastContainer);
    rightSide.appendChild(pastCard);

    // FINALLY append everything:
    container.appendChild(rightSide);
    PgStats.appendChild(container);
}

teamSelect = document.getElementById("team-select")
const teamOptions = document.getElementById("team-options")
let allTeams = []

fetch("http://localhost:4000/teams/all_team_names")
    .then(res => res.json())
    .then((data) => {
        allTeams = data.teams.map(p => (p.normalize("NFC"))).sort((a, b) => a.localeCompare(b))
        updateTeamOptions(allTeams)
    })

function updateTeamOptions(teams) {
    teamOptions.innerHTML = ""
    for (const team of teams) {
        const option = document.createElement("div")
        option.className = "dropdown-option"
        option.textContent = team
        option.addEventListener("click", () => {
            console.log("option event triggered")
            teamSelect.value = team
            teamOptions.classList.remove("active")
            teamOptions.innerHTML = ""
            // Clear player search when team is selected
            playerSelect.value = ""
            filteredPlayersByTeam = []

            // Fetch players for this team
            fetchTeamPlayers(team)
            fetchTeamStats(team)
        })
        teamOptions.appendChild(option)
    }
}

function fetchTeamPlayers(team) {
    const fetchURL = `http://localhost:4000/players/team_players?team=${encodeURIComponent(team)}`;
    fetch(fetchURL)
        .then(res => res.json())
        .then((data) => {
            filteredPlayersByTeam = data.players.map(p => (p.normalize("NFC"))).sort((a, b) => a.localeCompare(b))
            updatePlayerOptions(filteredPlayersByTeam)
        })
        .catch(err => {
            console.log("Error fetching team players:", err)
            filteredPlayersByTeam = []
        })
}

teamSelect.addEventListener("input", () => {
    console.log("triggered team select")
    const searchValue = teamSelect.value.toLowerCase()
    if (searchValue === "") {
        updateTeamOptions(allTeams)
        teamOptions.classList.add("active")
    } else {
        const filtered = allTeams.filter(p => p.toLowerCase().includes(searchValue))
        updateTeamOptions(filtered)
        if (filtered.length > 0) {
            teamOptions.classList.add("active")
        } else {
            teamOptions.classList.remove("active")
        }
    }
})

teamSelect.addEventListener("focus", () => {
    // Show all options when input is focused
    updateTeamOptions(allTeams)
    teamOptions.classList.add("active")
})

teamSelect.addEventListener("blur", () => {
    // Delay closing to allow click on option
    setTimeout(() => {
        teamOptions.classList.remove("active")
    }, 200)
})

function fetchTeamStats(team) {
    const fetchURL = `http://localhost:4000/pg_stats/team_pg_stats?team=${encodeURIComponent(team)}`;

    fetch(fetchURL)
        .then(res => res.json())
        .then((data) => {
            PgStats.style.display = "block";
            PgStats.innerHTML = "";
            conferenceStandings.style.display = "none"

            // Extract team and conference from data
            let conference = "—";
            let wins = "-";
            let losses = "-";
            for (const [key, value] of data) {
                if (key === "Conference") conference = value;
                if (key == "W") wins = value;
                if (key == "L") losses = value;
            }

            // Main container
            const container = document.createElement("div");
            container.style.marginTop = "24px";
            container.style.marginBottom = "24px";
            container.style.display = "flex";
            container.style.flexDirection = "column"; 
            container.style.gap = "24px";

            // ===== TOP ROW: STATS + RIGHT CARDS =====
            const topRow = document.createElement("div");
            topRow.style.display = "flex";
            topRow.style.gap = "24px";
            topRow.style.width = "100%";

            // ===== STATS CARD =====
            const statsCard = document.createElement("div");
            statsCard.style.width = "320px";
            statsCard.style.flexShrink = "0";
            statsCard.style.background = "linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)";
            statsCard.style.borderRadius = "12px";
            statsCard.style.padding = "24px";
            statsCard.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
            statsCard.style.border = "1px solid #e8e8e8";
            statsCard.style.overflowY = "auto";
            statsCard.style.maxHeight = "840px";

            const statsTitle = document.createElement("div");
            statsTitle.textContent = "Team Stats";
            statsTitle.style.fontSize = "18px";
            statsTitle.style.fontWeight = "700";
            statsTitle.style.marginBottom = "20px";
            statsTitle.style.paddingBottom = "12px";
            statsTitle.style.borderBottom = "2px solid #d62728";

            statsCard.appendChild(statsTitle);

            const statsGrid = document.createElement("div");
            statsGrid.style.display = "grid";
            statsGrid.style.gridTemplateColumns = "1fr 1fr";
            statsGrid.style.gap = "16px";

            for (const [key, value] of data) {
                if (["Team", "Conference", "W", "L"].includes(key)) continue;

                const statBox = document.createElement("div");
                statBox.style.display = "flex";
                statBox.style.flexDirection = "column";
                statBox.style.gap = "4px";

                const statValue = document.createElement("div");
                statValue.textContent = typeof value === 'number' ? value.toFixed(2) : value;
                statValue.style.fontSize = "20px";
                statValue.style.fontWeight = "800";
                statValue.style.color = statColorMap[key] || "black";

                const statLabel = document.createElement("div");
                statLabel.textContent = key;
                statLabel.style.fontSize = "10px";
                statLabel.style.fontWeight = "700";
                statLabel.style.color = "#888";
                statLabel.style.textTransform = "uppercase";

                statBox.appendChild(statValue);
                statBox.appendChild(statLabel);
                statsGrid.appendChild(statBox);
            }

            statsCard.appendChild(statsGrid);
            topRow.appendChild(statsCard);

            // ===== RIGHT SIDE =====
            const rightCardsArea = document.createElement("div");
            rightCardsArea.style.flex = "1";
            rightCardsArea.style.display = "flex";
            rightCardsArea.style.flexDirection = "column";
            rightCardsArea.style.gap = "24px";

            // ===== TEAM INFO CARD =====
            const teamInfoCard = document.createElement("div");
            teamInfoCard.style.background = "linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)";
            teamInfoCard.style.borderRadius = "12px";
            teamInfoCard.style.padding = "24px";
            teamInfoCard.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
            teamInfoCard.style.border = "1px solid #e8e8e8";
            teamInfoCard.style.display = "flex";
            teamInfoCard.style.flexDirection = "column";
            teamInfoCard.style.gap = "20px";

            // ===== TEAM HEADER SECTION =====
            const headerSection = document.createElement("div");
            headerSection.style.display = "flex";
            headerSection.style.gap = "16px";

            const logoContainer = document.createElement("div");
            logoContainer.style.position = "relative";
            logoContainer.style.width = "80px";
            logoContainer.style.height = "80px";

            const teamLogo = document.createElement("img");
            teamLogo.style.width = "100%";
            teamLogo.style.height = "100%";
            teamLogo.style.objectFit = "contain";

            fetch(`http://localhost:4000/teams/team_image?team=${encodeURIComponent(team)}`)
                .then(res => res.json())
                .then(data => teamLogo.src = data.image);

            logoContainer.appendChild(teamLogo);

            const apRankBadge = document.createElement("div");
            apRankBadge.style.position = "absolute";
            apRankBadge.style.top = "-8px";
            apRankBadge.style.right = "-8px";
            apRankBadge.style.background = "white";
            apRankBadge.style.width = "36px";
            apRankBadge.style.height = "36px";
            apRankBadge.style.borderRadius = "50%";
            apRankBadge.style.display = "flex";
            apRankBadge.style.alignItems = "center";
            apRankBadge.style.justifyContent = "center";
            apRankBadge.style.fontWeight = "700";
            apRankBadge.style.fontSize = "14px";
            apRankBadge.style.border = "2px solid black";

            const spinner = document.createElement("div");
            spinner.style.width = "20px";
            spinner.style.height = "20px";
            spinner.style.border = "2px solid rgba(0,0,0,0.2)";
            spinner.style.borderTop = "2px solid black";
            spinner.style.borderRadius = "50%";
            spinner.style.animation = "spin 0.8s linear infinite";
            apRankBadge.appendChild(spinner);

            fetch(`http://localhost:4000/standings/conference_standings?conference=${encodeURIComponent(conference)}`)
                .then(res => res.json())
                .then(rows => {
                    for (const row of rows) {
                        if (row.Team === team && row.rank !== "NR" && row.rank !== undefined) {
                            apRankBadge.innerHTML = row.rank;
                            break;
                        }
                        if (row.Team === team) {
                            apRankBadge.style.display = "none";
                            break;
                        }
                    }
                });

            logoContainer.appendChild(apRankBadge);

            const nameConfSection = document.createElement("div");
            nameConfSection.style.display = "flex";
            nameConfSection.style.flexDirection = "column";
            nameConfSection.style.gap = "8px";

            const teamNameValue = document.createElement("div");
            teamNameValue.textContent = team;
            teamNameValue.style.fontSize = "24px";
            teamNameValue.style.fontWeight = "800";

            const confValue = document.createElement("div");
            confValue.textContent = conference;
            confValue.style.fontSize = "13px";
            confValue.style.fontWeight = "600";
            confValue.style.cursor = "pointer";

            confValue.onclick = () => {
                conferenceSelect.value = conference;
                fetchConferenceStandings(conference);
            };

            nameConfSection.appendChild(teamNameValue);
            nameConfSection.appendChild(confValue);
            headerSection.appendChild(logoContainer);
            headerSection.appendChild(nameConfSection);
            teamInfoCard.appendChild(headerSection);

            // ===== RECORD / WIN% / CONF RANK =====
            const statsGridSection = document.createElement("div");
            statsGridSection.style.display = "grid";
            statsGridSection.style.gridTemplateColumns = "1fr 1fr 1fr";
            statsGridSection.style.gap = "12px";
            statsGridSection.style.paddingTop = "16px";
            statsGridSection.style.borderTop = "1px solid #e8e8e8";

            const recordStat = document.createElement("div");
            recordStat.style.display = "flex";
            recordStat.style.flexDirection = "column";
            recordStat.style.alignItems = "center";

            const recordValue = document.createElement("div");
            recordValue.textContent = `${wins}–${losses}`;
            recordValue.style.fontSize = "20px";
            recordValue.style.fontWeight = "700";
            recordValue.style.color = "#1f77b4";

            const recordLabel = document.createElement("div");
            recordLabel.textContent = "Record";
            recordLabel.style.fontSize = "10px";
            recordLabel.style.fontWeight = "700";
            recordLabel.style.color = "#888";

            recordStat.appendChild(recordValue);
            recordStat.appendChild(recordLabel);
            statsGridSection.appendChild(recordStat);

            let winPct = (wins / (wins + losses)).toFixed(3);

            const winPctStat = document.createElement("div");
            winPctStat.style.display = "flex";
            winPctStat.style.flexDirection = "column";
            winPctStat.style.alignItems = "center";

            const winPctValue = document.createElement("div");
            winPctValue.textContent = winPct;
            winPctValue.style.fontSize = "20px";
            winPctValue.style.fontWeight = "700";
            winPctValue.style.color = "#2ca02c";

            const winPctLabel = document.createElement("div");
            winPctLabel.textContent = "Win %";
            winPctLabel.style.fontSize = "10px";
            winPctLabel.style.fontWeight = "700";
            winPctLabel.style.color = "#888";

            winPctStat.appendChild(winPctValue);
            winPctStat.appendChild(winPctLabel);
            statsGridSection.appendChild(winPctStat);

            const confRankStat = document.createElement("div");
            confRankStat.style.display = "flex";
            confRankStat.style.flexDirection = "column";
            confRankStat.style.alignItems = "center";

            const confRankValue = document.createElement("div");
            confRankValue.style.fontSize = "20px";
            confRankValue.style.fontWeight = "700";
            confRankValue.style.color = "#d62728";
            confRankValue.style.height = "28px";
            confRankValue.style.display = "flex";
            confRankValue.style.alignItems = "center";

            const confSpinner = document.createElement("div");
            confSpinner.style.width = "16px";
            confSpinner.style.height = "16px";
            confSpinner.style.border = "2px solid rgba(214,39,40,0.2)";
            confSpinner.style.borderTop = "2px solid #d62728";
            confSpinner.style.borderRadius = "50%";
            confSpinner.style.animation = "spin 0.8s linear infinite";
            confRankValue.appendChild(confSpinner);

            const confRankLabel = document.createElement("div");
            confRankLabel.textContent = "Conf Rank";
            confRankLabel.style.fontSize = "10px";
            confRankLabel.style.fontWeight = "700";
            confRankLabel.style.color = "#888";

            confRankStat.appendChild(confRankValue);
            confRankStat.appendChild(confRankLabel);
            statsGridSection.appendChild(confRankStat);

            fetch(`http://localhost:4000/standings/conference_standings?conference=${encodeURIComponent(conference)}`)
                .then(res => res.json())
                .then(rows => {
                    let rank = 1;
                    for (const row of rows) {
                        if (row.Team === team) {
                            confRankValue.innerHTML = rank;
                            break;
                        }
                        rank++;
                    }
                })
                .catch(() => {
                    confRankValue.textContent = "—";
                });

            teamInfoCard.appendChild(statsGridSection);
            rightCardsArea.appendChild(teamInfoCard);

            // ===== PAST GAMES CARD =====
            const pastGamesCard = document.createElement("div");
            pastGamesCard.style.background = "linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)";
            pastGamesCard.style.borderRadius = "12px";
            pastGamesCard.style.padding = "24px";
            pastGamesCard.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
            pastGamesCard.style.border = "1px solid #e8e8e8";

            const pastGamesTitle = document.createElement("div");
            pastGamesTitle.textContent = "Past Games";
            pastGamesTitle.style.fontSize = "18px";
            pastGamesTitle.style.fontWeight = "700";
            pastGamesTitle.style.marginBottom = "20px";
            pastGamesTitle.style.paddingBottom = "12px";
            pastGamesTitle.style.borderBottom = "2px solid #d62728";

            pastGamesCard.appendChild(pastGamesTitle);

            const pastGamesContainer = document.createElement("div");
            pastGamesContainer.style.display = "flex";
            pastGamesContainer.style.flexDirection = "column";
            pastGamesContainer.style.gap = "12px";
            pastGamesContainer.style.maxHeight = "504px";
            pastGamesContainer.style.overflowY = "auto";

            fetch(`http://localhost:4000/teams/past_team_games?team=${encodeURIComponent(team)}`)
                .then(res => res.json())
                .then(rows => {
                    if (rows.length === 0) {
                        const msg = document.createElement("div");
                        msg.textContent = "No past games";
                        msg.style.color = "#aaa";
                        pastGamesContainer.appendChild(msg);
                    } else {
                        rows.forEach(game => {
                            const isAway = game.Location && game.Location.toLowerCase().includes("away");
                            const awayTeam = isAway ? team : game.opp_Team;
                            const homeTeam = isAway ? game.opp_Team : team;
                            const gameID = `${game.Date}-${awayTeam}-vs-${homeTeam}-m`;

                            const gameRow = document.createElement("div");
                            gameRow.style.display = "flex";
                            gameRow.style.justifyContent = "space-between";
                            gameRow.style.alignItems = "center";
                            gameRow.style.padding = "12px";
                            gameRow.style.background = "#fafafa";
                            gameRow.style.borderRadius = "8px";
                            gameRow.style.cursor = "pointer";

                            const isWin = game.PTS > game.opp_PTS;

                            const oppLogoContainer = document.createElement("div");
                            oppLogoContainer.style.position = "relative";
                            oppLogoContainer.style.width = "40px";
                            oppLogoContainer.style.height = "40px";

                            const oppLogo = document.createElement("img");
                            oppLogo.style.width = "100%";
                            oppLogo.style.height = "100%";
                            oppLogo.style.objectFit = "contain";

                            fetch(`http://localhost:4000/teams/team_image?team=${encodeURIComponent(game.opp_Team)}`)
                                .then(r => r.json())
                                .then(d => oppLogo.src = d.image);

                            if (game.opp_Rank && game.opp_Rank !== "NR") {
                                const b = document.createElement("div");
                                b.style.position = "absolute";
                                b.style.top = "-8px";
                                b.style.right = "-8px";
                                b.style.width = "20px";
                                b.style.height = "20px";
                                b.style.borderRadius = "50%";
                                b.style.display = "flex";
                                b.style.alignItems = "center";
                                b.style.justifyContent = "center";
                                b.style.fontSize = "10px";
                                b.style.fontWeight = "700";
                                b.style.background = "white";
                                b.style.border = "2px solid black";
                                b.textContent = game.opp_Rank;
                                oppLogoContainer.appendChild(b);
                            }

                            oppLogoContainer.appendChild(oppLogo);

                            const oppInfo = document.createElement("div");
                            oppInfo.style.display = "flex";
                            oppInfo.style.flexDirection = "column";
                            oppInfo.style.marginLeft = "12px";

                            const nameEl = document.createElement("div");
                            nameEl.textContent = game.opp_Team;
                            nameEl.style.fontSize = "14px";
                            nameEl.style.fontWeight = "700";

                            const dateEl = document.createElement("div");
                            dateEl.textContent = game.Date;
                            dateEl.style.fontSize = "12px";
                            dateEl.style.color = "#888";

                            const locEl = document.createElement("div");
                            locEl.textContent = game.Location;
                            locEl.style.fontSize = "12px";
                            locEl.style.color = "#888";

                            oppInfo.appendChild(nameEl);
                            oppInfo.appendChild(dateEl);
                            oppInfo.appendChild(locEl);

                            const left = document.createElement("div");
                            left.style.display = "flex";
                            left.appendChild(oppLogoContainer);
                            left.appendChild(oppInfo);

                            const scoreEl = document.createElement("div");
                            scoreEl.style.display = "flex";
                            scoreEl.style.flexDirection = "column";
                            scoreEl.style.textAlign = "right";

                            const scoreText = document.createElement("div");
                            scoreText.textContent = `${game.PTS} – ${game.opp_PTS}`;
                            scoreText.style.fontSize = "16px";
                            scoreText.style.fontWeight = "700";
                            scoreText.style.color = isWin ? "#2b8bec" : "#d62728";

                            const resultText = document.createElement("div");
                            resultText.textContent = isWin ? "W" : "L";
                            resultText.style.fontSize = "12px";
                            resultText.style.fontWeight = "700";
                            resultText.style.color = isWin ? "#2b8bec" : "#d62728";

                            scoreEl.appendChild(scoreText);
                            scoreEl.appendChild(resultText);

                            gameRow.appendChild(left);
                            gameRow.appendChild(scoreEl);

                            gameRow.onclick = () => {
                                fetch(`http://localhost:4000/games/box_score?gameID=${encodeURIComponent(gameID)}`)
                                    .then(r => r.json())
                                    .then(box => {
                                        const teamRanks = {};
                                        if (game.Rank) teamRanks[team] = game.Rank;
                                        if (game.opp_Rank) teamRanks[game.opp_Team] = game.opp_Rank;
                                        displayBoxScore(box, gameID, game.Date, box.Venue, teamRanks);
                                    });
                            };

                            gameRow.onmouseover = () => {
                                gameRow.style.background = "#f0f0f0";
                                gameRow.style.transform = "translateY(-2px)";
                                gameRow.style.boxShadow = "0 4px 10px rgba(0,0,0,0.08)";
                            };

                            gameRow.onmouseout = () => {
                                gameRow.style.background = "#fafafa";
                                gameRow.style.transform = "translateY(0px)";
                                gameRow.style.boxShadow = "none";
                            };

                            pastGamesContainer.appendChild(gameRow);
                        });
                    }
                });

            pastGamesCard.appendChild(pastGamesContainer);
            rightCardsArea.appendChild(pastGamesCard);

            topRow.appendChild(rightCardsArea);
            container.appendChild(topRow);

            // ============================================================
            //                 UPCOMING GAMES  (UPDATED)
            // ============================================================
            const futureGamesWrapper = document.createElement("div");
            futureGamesWrapper.style.width = "100%";

            const futureGamesCard = document.createElement("div");
            futureGamesCard.style.background = "linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)";
            futureGamesCard.style.borderRadius = "12px";
            futureGamesCard.style.padding = "24px";
            futureGamesCard.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
            futureGamesCard.style.border = "1px solid #e8e8e8";
            futureGamesCard.style.width = "100%";

            const futureGamesTitle = document.createElement("div");
            futureGamesTitle.textContent = "Upcoming Games";
            futureGamesTitle.style.fontSize = "18px";
            futureGamesTitle.style.fontWeight = "700";
            futureGamesTitle.style.marginBottom = "20px";
            futureGamesTitle.style.paddingBottom = "12px";
            futureGamesTitle.style.borderBottom = "2px solid #d62728";

            futureGamesCard.appendChild(futureGamesTitle);

            const futureGamesContainer = document.createElement("div");
            futureGamesContainer.style.display = "flex";
            futureGamesContainer.style.flexDirection = "column";
            futureGamesContainer.style.gap = "12px";

            const today = new Date().toISOString().split("T")[0];

            fetch(`http://localhost:4000/teams/future_team_games?team=${encodeURIComponent(team)}&date=${today}`)
                .then(r => r.json())
                .then(async (rows) => {
                    if (rows.length === 0) {
                        const m = document.createElement("div");
                        m.textContent = "No upcoming games";
                        m.style.color = "#aaa";
                        futureGamesContainer.appendChild(m);
                        return;
                    }

                    const standingsCache = {};

                    async function getRank(t) {
                        const confRes = await fetch(`http://localhost:4000/pg_stats/team_pg_stats?team=${encodeURIComponent(t)}`);
                        const confData = await confRes.json();
                        let conf = "Unknown";
                        for (const [k,v] of confData) if (k === "Conference") conf = v;

                        if (!standingsCache[conf]) {
                            const sRes = await fetch(`http://localhost:4000/standings/conference_standings?conference=${encodeURIComponent(conf)}`);
                            standingsCache[conf] = await sRes.json();
                        }

                        for (const row of standingsCache[conf]) {
                            if (row.Team === t && row.rank !== "NR" && row.rank !== undefined) {
                                return row.rank;
                            }
                        }
                        return null;
                    }

                    for (const game of rows.slice(0,5)) {
                        const cleanDate = new Date(game.Date).toISOString().split("T")[0];
                        const loc = game.Location ? game.Location.toLowerCase() : "—";

                        const gameRow = document.createElement("div");
                        gameRow.style.display = "flex";
                        gameRow.style.justifyContent = "space-between";
                        gameRow.style.alignItems = "center";
                        gameRow.style.padding = "12px";
                        gameRow.style.background = "#fafafa";
                        gameRow.style.borderRadius = "8px";

                        // ================================
                        // LEFT SIDE: LOGO + Opponent Info
                        // ================================
                        const oppLogoContainer = document.createElement("div");
                        oppLogoContainer.style.position = "relative";
                        oppLogoContainer.style.width = "40px";
                        oppLogoContainer.style.height = "40px";

                        const oppLogo = document.createElement("img");
                        oppLogo.style.width = "100%";
                        oppLogo.style.height = "100%";
                        oppLogo.style.objectFit = "contain";

                        fetch(`http://localhost:4000/teams/team_image?team=${encodeURIComponent(game.Opponent)}`)
                            .then(r => r.json())
                            .then(d => oppLogo.src = d.image);

                        // ========= NEW: RANK BADGE (Option A: same as Past Games)
                        const futureRankBadge = document.createElement("div");
                        futureRankBadge.style.position = "absolute";
                        futureRankBadge.style.top = "-8px";
                        futureRankBadge.style.right = "-8px";
                        futureRankBadge.style.width = "20px";
                        futureRankBadge.style.height = "20px";
                        futureRankBadge.style.borderRadius = "50%";
                        futureRankBadge.style.display = "flex";
                        futureRankBadge.style.alignItems = "center";
                        futureRankBadge.style.justifyContent = "center";
                        futureRankBadge.style.fontSize = "10px";
                        futureRankBadge.style.fontWeight = "700";
                        futureRankBadge.style.background = "white";
                        futureRankBadge.style.border = "2px solid black";
                        futureRankBadge.style.visibility = "hidden";

                        // attach badge (will fill after fetch)
                        oppLogoContainer.appendChild(futureRankBadge);
                        oppLogoContainer.appendChild(oppLogo);

                        const oppInfo = document.createElement("div");
                        oppInfo.style.display = "flex";
                        oppInfo.style.flexDirection = "column";
                        oppInfo.style.marginLeft = "12px";

                        const nameEl = document.createElement("div");
                        nameEl.textContent = game.Opponent;
                        nameEl.style.fontSize = "14px";
                        nameEl.style.fontWeight = "700";

                        const detailsRow = document.createElement("div");
                        detailsRow.style.display = "flex";
                        detailsRow.style.flexDirection = "row";
                        detailsRow.style.gap = "8px";
                        detailsRow.style.fontSize = "12px";
                        detailsRow.style.color = "#666";

                        const dateEl = document.createElement("div");
                        dateEl.textContent = cleanDate;

                        const locEl = document.createElement("div");
                        locEl.textContent = loc;

                        const recordEl = document.createElement("div");
                        recordEl.textContent = "(—)";

                        detailsRow.appendChild(dateEl);
                        detailsRow.appendChild(locEl);
                        detailsRow.appendChild(recordEl);

                        oppInfo.appendChild(nameEl);
                        oppInfo.appendChild(detailsRow);

                        const left = document.createElement("div");
                        left.style.display = "flex";
                        left.style.alignItems = "center";
                        left.appendChild(oppLogoContainer);
                        left.appendChild(oppInfo);

                        // ================================
                        // Fetch Rank + Record
                        // ================================
                        getRank(game.Opponent).then(rank => {
                            if (rank !== null && rank !== undefined) {
                                futureRankBadge.textContent = rank;
                                futureRankBadge.style.visibility = "visible";
                            }
                        });

                        const fetchURL = `http://localhost:4000/pg_stats/team_pg_stats?team=${encodeURIComponent(game.Opponent)}`;

                        fetch(fetchURL)
                            .then(res => res.json())
                            .then(data => {
                                let wins, losses;
                                for (const [key, value] of data) {
                                    if (key === "W") wins = value;
                                    if (key === "L") losses = value;
                                }

                                if (wins !== undefined && losses !== undefined) {
                                    recordEl.textContent = `(${wins}–${losses})`;
                                } else {
                                    recordEl.textContent = "";
                                }
                            })
                            .catch(() => {
                                recordEl.textContent = "";
                            });

                        gameRow.appendChild(left);
                        futureGamesContainer.appendChild(gameRow);
                    }
                });

            futureGamesCard.appendChild(futureGamesContainer);
            futureGamesWrapper.appendChild(futureGamesCard);

            container.appendChild(futureGamesWrapper);
            PgStats.appendChild(container);
        });
}


conferenceSelect = document.getElementById("conference-select")
const conferenceOptions = document.getElementById("conference-options")
let allConferences = []

fetch("http://localhost:4000/conferences/all_conference_names")
    .then(res => res.json())
    .then((data) => {
        allConferences = data.conferences.map(p => (p.normalize("NFC"))).sort((a, b) => a.localeCompare(b))
        updateConferenceOptions(allConferences)
    })

function updateConferenceOptions(conferences) {
    conferenceOptions.innerHTML = ""
    for (const conf of conferences) {
        const option = document.createElement("div")
        option.className = "dropdown-option"
        option.textContent = conf
        option.addEventListener("click", () => {
            conferenceSelect.value = conf
            conferenceOptions.classList.remove("active")
            conferenceOptions.innerHTML = ""
            // Clear player and team search when conference is selected
            filteredPlayersByTeam = []
            // Fetch and display conference standings
            fetchConferenceStandings(conf)
        })
        conferenceOptions.appendChild(option)
    }
}

function fetchConferenceStandings(conference) {
    const fetchURL = `http://localhost:4000/standings/conference_standings?conference=${encodeURIComponent(conference)}`;
    
    // Hide pgStats and show conference standings with loading spinner
    PgStats.style.display = "none"
    conferenceStandings.style.display = "block"
    conferenceStandings.innerHTML = ""
    
    // Create loading spinner
    const loadingContainer = document.createElement("div")
    loadingContainer.className = "loading-container"
    const spinner = document.createElement("div")
    spinner.className = "loading-spinner"
    loadingContainer.appendChild(spinner)
    conferenceStandings.appendChild(loadingContainer)
    
    fetch(fetchURL)
        .then(res => res.json())
        .then((data) => {
            const pgStats = document.getElementById("pg_stats")
            const conferenceStandings = document.getElementById("conference_standings")
            
            // Hide pgStats and show conference standings
            pgStats.style.display = "none"
            conferenceStandings.style.display = "block"
            conferenceStandings.innerHTML = ""

            // Create main container
            const container = document.createElement("div")
            container.style.marginTop = "24px"
            container.style.marginBottom = "24px"

            // Conference title
            const title = document.createElement("div")
            title.style.marginBottom = "24px"
            title.style.paddingBottom = "16px"
            title.style.borderBottom = "3px solid #2b8becff"

            const confName = document.createElement("h2")
            confName.textContent = conference + " Standings"
            confName.style.margin = "0"
            confName.style.fontSize = "28px"
            confName.style.fontWeight = "700"
            confName.style.color = "#111"
            confName.style.letterSpacing = "-0.5px"

            title.appendChild(confName)
            container.appendChild(title)

            // Create standings table
            const standingsGrid = document.createElement("div")
            standingsGrid.style.display = "grid"
            standingsGrid.style.gap = "12px"

            // Table header
            const headerRow = document.createElement("div")
            headerRow.style.display = "grid"
            headerRow.style.gridTemplateColumns = "2fr 60px 60px 70px 70px 80px 80px"
            headerRow.style.gap = "12px"
            headerRow.style.padding = "16px"
            headerRow.style.background = "linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)"
            headerRow.style.borderRadius = "12px"
            headerRow.style.border = "1px solid #e8e8e8"
            headerRow.style.alignItems = "center"
            headerRow.style.marginBottom = "12px"

            const headers = ["Team", "W", "L", "W%", "Conf W", "Conf L", "Conf %"]
            headers.forEach(header => {
                const headerCell = document.createElement("div")
                headerCell.textContent = header
                headerCell.style.fontWeight = "700"
                headerCell.style.fontSize = "12px"
                headerCell.style.color = "#666"
                headerCell.style.textTransform = "uppercase"
                headerCell.style.letterSpacing = "0.5px"
                headerCell.style.textAlign = header === "Team" ? "left" : "center"
                headerRow.appendChild(headerCell)
            })

            standingsGrid.appendChild(headerRow)

            // Table rows
            let rank = 1
            for (const [key, value] of Object.entries(data)) {
                if (["Conference"].includes(key)) {
                    continue
                }

                const row = document.createElement("div")
                row.style.display = "grid"
                row.style.gridTemplateColumns = "2fr 60px 60px 70px 70px 80px 80px"
                row.style.gap = "12px"
                row.style.padding = "16px"
                row.style.background = "linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)"
                row.style.borderRadius = "12px"
                row.style.border = "1px solid #e8e8e8"
                row.style.alignItems = "center"
                row.style.transition = "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)"
                row.style.cursor = "pointer"

                row.onmouseenter = () => {
                    row.style.transform = "translateY(-4px)"
                    row.style.boxShadow = "0 8px 16px rgba(0,0,0,0.12)"
                    row.style.borderColor = "#2b8becff"
                }
                row.onmouseleave = () => {
                    row.style.transform = "translateY(0)"
                    row.style.boxShadow = "none"
                    row.style.borderColor = "#e8e8e8"
                }

                row.addEventListener("click", () => {
                    // Fetch team stats when row is clicked
                    teamSelect.value = value.Team
                    const pgStats = document.getElementById("pg_stats")
                    const conferenceStandings = document.getElementById("conference_standings")
                    pgStats.style.display = "block"
                    conferenceStandings.style.display = "none"
                    fetchTeamStats(value.Team)
                })

                // Rank + Team logo + Team name
                const teamCell = document.createElement("div")
                teamCell.style.display = "flex"
                teamCell.style.alignItems = "center"
                teamCell.style.gap = "12px"

                const logoContainer = document.createElement("div")
                logoContainer.style.position = "relative"
                logoContainer.style.width = "40px"
                logoContainer.style.height = "40px"
                logoContainer.style.flexShrink = "0"

                const teamLogo = document.createElement("img")
                teamLogo.style.width = "100%"
                teamLogo.style.height = "100%"
                teamLogo.style.objectFit = "contain"

                const rankBadge = document.createElement("div")
                rankBadge.style.position = "absolute"
                rankBadge.style.top = "-8px"
                rankBadge.style.right = "-8px"
                rankBadge.style.background = "#2b8becff"
                rankBadge.style.color = "#fff"
                rankBadge.style.width = "24px"
                rankBadge.style.height = "24px"
                rankBadge.style.borderRadius = "50%"
                rankBadge.style.display = "flex"
                rankBadge.style.alignItems = "center"
                rankBadge.style.justifyContent = "center"
                rankBadge.style.fontWeight = "700"
                rankBadge.style.fontSize = "12px"
                rankBadge.style.border = "2px solid #ffffff"
                rankBadge.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)"

                logoContainer.appendChild(teamLogo)
                logoContainer.appendChild(rankBadge)
                teamCell.appendChild(logoContainer)

                const teamName = document.createElement("div")
                teamName.textContent = value.Team
                teamName.style.fontWeight = "600"
                teamName.style.fontSize = "15px"
                teamName.style.color = "#111"

                teamCell.appendChild(teamName)
                row.appendChild(teamCell)

                // Fetch team image URL
                fetch(`http://localhost:4000/teams/team_image?team=${encodeURIComponent(value.Team)}`)
                    .then(res => res.json())
                    .then(data => {
                        teamLogo.src = data.image
                    })
                    .catch(err => {
                        console.log("Error fetching team image:", err)
                        teamLogo.style.display = "none"
                    })

                // Set rank badge value
                rankBadge.textContent = value.rank !== undefined && value.rank !== "NR" ? value.rank : ""
                if (value.rank === undefined || value.rank === "NR") {
                    rankBadge.style.display = "none"
                }

                // Stats cells
                const stats = Array.isArray(value) ? value : [value.wins || "-", value.losses || "-", value.conference_wins || "-", value.conference_losses || "-"]
                const statValues = typeof value === "object" ? [value.wins || "-", value.losses || "-", value.conference_wins || "-", value.conference_losses || "-"] : [value, "-", "-", "-"]

                // Extract values from the data structure
                const wVal = value.wins !== undefined ? value.wins : "-"
                const lVal = value.losses !== undefined ? value.losses : "-"
                const wPctVal = value.overall_win_pct !== undefined ? value.overall_win_pct : "-"
                const confWVal = value.conference_wins !== undefined ? value.conference_wins : "-"
                const confLVal = value.conference_losses !== undefined ? value.conference_losses : "-"
                const confPctVal = value.conf_win_pct !== undefined ? value.conf_win_pct : "-"

                const statCells = [wVal, lVal, wPctVal, confWVal, confLVal, confPctVal]
                statCells.forEach(stat => {
                    const cell = document.createElement("div")
                    cell.textContent = stat
                    cell.style.fontWeight = "700"
                    cell.style.fontSize = "16px"
                    cell.style.color = "#1f77b4"
                    cell.style.textAlign = "center"
                    row.appendChild(cell)
                })

                standingsGrid.appendChild(row)
                rank++
            }

            container.appendChild(standingsGrid)
            conferenceStandings.appendChild(container)
        })
        .catch(err => {
            console.log("Error fetching conference standings:", err)
        })
}

conferenceSelect.addEventListener("change", () => {
    const searchValue = conferenceSelect.value.toLowerCase()
    if (searchValue === "") {
        updateConferenceOptions(allConferences)
        conferenceOptions.classList.add("active")
    } else {
        const filtered = allConferences.filter(p => p.toLowerCase().includes(searchValue))
        updateConferenceOptions(filtered)
        if (filtered.length > 0) {
            conferenceOptions.classList.add("active")
        } else {
            conferenceOptions.classList.remove("active")
        }
    }
})

conferenceSelect.addEventListener("focus", () => {
    // Show all options when input is focused
    updateConferenceOptions(allConferences)
    conferenceOptions.classList.add("active")
})

conferenceSelect.addEventListener("blur", () => {
    // Delay closing to allow click on option
    setTimeout(() => {
        conferenceOptions.classList.remove("active")
    }, 200)
})