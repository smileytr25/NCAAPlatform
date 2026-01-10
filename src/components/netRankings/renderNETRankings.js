import { createEl } from "../../utils/dom.js";
import { fetchData, fetchTeamImage } from "../../utils/fetch.js";

export async function renderNETRankings(container) {
    container.innerHTML = "";

    // Create section header
    const headerSection = createEl("div");
    headerSection.className = "net-rankings-header";

    const title = createEl("h2");
    title.textContent = "NCAA NET Rankings";
    title.className = "net-rankings-title";

    const subtitle = createEl("p");
    subtitle.textContent = "Official NCAA Evaluation Tool (NET) rankings and quadrant records";
    subtitle.className = "net-rankings-subtitle";

    // Create legend
    const legend = createEl("div");
    legend.className = "net-rankings-legend";
    legend.innerHTML = `
        <div class="legend-item">
            <span class="legend-indicator auto-bid-indicator"></span>
            <span>Automatic Bid (Conference Leader)</span>
        </div>
        <div class="legend-item">
            <span class="legend-indicator at-large-indicator"></span>
            <span>At-Large Bid (1-37)</span>
        </div>
        <div class="legend-item">
            <span class="legend-indicator bubble-indicator"></span>
            <span>Bubble Teams (At-Large 38-45)</span>
        </div>
    `;

    // Create filter controls
    const filtersContainer = createEl("div");
    filtersContainer.className = "net-rankings-filters";

    // Toggle buttons for All vs Tournament
    const viewToggleContainer = createEl("div");
    viewToggleContainer.className = "view-toggle-container";

    const allTeamsBtn = createEl("button");
    allTeamsBtn.textContent = "All Teams";
    allTeamsBtn.className = "view-toggle-btn active";
    allTeamsBtn.id = "all-teams-btn";

    const tournamentBtn = createEl("button");
    tournamentBtn.textContent = "Tournament Field (68)";
    tournamentBtn.className = "view-toggle-btn";
    tournamentBtn.id = "tournament-btn";

    viewToggleContainer.appendChild(allTeamsBtn);
    viewToggleContainer.appendChild(tournamentBtn);

    // Custom conference dropdown
    const conferenceSearchWrapper = createEl("div");
    conferenceSearchWrapper.style.position = "relative";
    conferenceSearchWrapper.style.minWidth = "240px";

    const selectConferenceButton = createEl("div");
    selectConferenceButton.style.cssText = `
        padding: 14px 16px;
        border-radius: 8px;
        border: 2px solid #E8E8E8;
        font-size: 15px;
        font-weight: 600;
        color: #222222;
        cursor: pointer;
        background: #FFFFFF;
        min-width: 220px;
        transition: all 0.2s ease;
        box-shadow: 0 2px 6px rgba(0, 32, 91, 0.08);
        background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2300205B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/csvg%3e");
        background-repeat: no-repeat;
        background-position: right 12px center;
        background-size: 20px;
        padding-right: 40px;
        position: relative;
    `;
    selectConferenceButton.textContent = "All Conferences";

    selectConferenceButton.onmouseover = () => {
        selectConferenceButton.style.borderColor = "#00205B";
        selectConferenceButton.style.boxShadow = "0 4px 12px rgba(0, 32, 91, 0.2)";
        selectConferenceButton.style.transform = "translateY(-2px)";
    };

    selectConferenceButton.onmouseout = () => {
        selectConferenceButton.style.borderColor = "#E8E8E8";
        selectConferenceButton.style.boxShadow = "0 2px 6px rgba(0, 32, 91, 0.08)";
        selectConferenceButton.style.transform = "translateY(0)";
    };

    const conferenceDropdownMenu = createEl("div");
    conferenceDropdownMenu.className = "dropdown-menu";

    let selectedConference = "";
    let showTournamentOnly = false;
    let cachedAllTeams = null;
    let cachedTournamentField = null;

    // Fetch and populate conferences
    try {
        const conferences = await fetchData("/conferences/all_conference_names");
        
        // Add "All Conferences" option
        const allOption = createEl("div");
        allOption.className = "dropdown-option";
        allOption.textContent = "All Conferences";
        allOption.onclick = (e) => {
            e.stopPropagation();
            selectedConference = "";
            selectConferenceButton.textContent = "All Conferences";
            conferenceDropdownMenu.classList.remove("active");
            loadNETRankings("", showTournamentOnly);
        };
        allOption.onmouseover = () => allOption.classList.add("highlighted");
        allOption.onmouseout = () => allOption.classList.remove("highlighted");
        conferenceDropdownMenu.appendChild(allOption);

        conferences.conferences
            .filter(conf => conf !== "Not D1")
            .sort()
            .forEach(conf => {
                const option = createEl("div");
                option.className = "dropdown-option";
                option.textContent = conf;
                option.onclick = (e) => {
                    e.stopPropagation();
                    selectedConference = conf;
                    selectConferenceButton.textContent = conf;
                    conferenceDropdownMenu.classList.remove("active");
                    loadNETRankings(conf, showTournamentOnly);
                };
                option.onmouseover = () => option.classList.add("highlighted");
                option.onmouseout = () => option.classList.remove("highlighted");
                conferenceDropdownMenu.appendChild(option);
            });
    } catch (error) {
        console.error("Error loading conferences:", error);
    }

    selectConferenceButton.onclick = () => {
        conferenceDropdownMenu.classList.toggle("active");
    };

    conferenceSearchWrapper.appendChild(selectConferenceButton);
    conferenceSearchWrapper.appendChild(conferenceDropdownMenu);

    filtersContainer.appendChild(viewToggleContainer);
    filtersContainer.appendChild(conferenceSearchWrapper);

    headerSection.appendChild(title);
    headerSection.appendChild(subtitle);
    headerSection.appendChild(legend);
    headerSection.appendChild(filtersContainer);
    container.appendChild(headerSection);

    // Create table container
    const tableContainer = createEl("div");
    tableContainer.className = "net-rankings-table-container";
    tableContainer.id = "net-rankings-table";
    container.appendChild(tableContainer);

    // Create loading overlay
    const loadingOverlay = createEl("div");
    loadingOverlay.className = "net-rankings-loading-overlay";
    loadingOverlay.innerHTML = `
        <div class="loading-overlay-content">
            <div class="loading-spinner-overlay"></div>
            <div class="loading-text-overlay">Loading NET Rankings...</div>
        </div>
    `;
    container.appendChild(loadingOverlay);

    // Load initial data with minimum 2 second display
    const startTime = Date.now();
    await loadNETRankings("", false);
    const elapsed = Date.now() - startTime;
    const remainingTime = Math.max(0, 2000 - elapsed);
    
    setTimeout(() => {
        loadingOverlay.style.opacity = '0';
        setTimeout(() => {
            loadingOverlay.remove();
        }, 300);
    }, remainingTime);

    // Toggle button event listeners
    allTeamsBtn.addEventListener("click", () => {
        showTournamentOnly = false;
        allTeamsBtn.classList.add("active");
        tournamentBtn.classList.remove("active");
        loadNETRankings(selectedConference, false);
    });

    tournamentBtn.addEventListener("click", () => {
        showTournamentOnly = true;
        tournamentBtn.classList.add("active");
        allTeamsBtn.classList.remove("active");
        loadNETRankings(selectedConference, true);
    });
}

async function loadNETRankings(conference, tournamentOnly = false) {
    const tableContainer = document.getElementById("net-rankings-table");
    
    // Check if we have cached data for this view
    const cacheKey = tournamentOnly ? 'cachedTournamentField' : 'cachedAllTeams';
    const cachedData = tournamentOnly ? window.cachedTournamentField : window.cachedAllTeams;

    try {
        let rankings;
        
        // Use cached data if available and no conference filter
        if (cachedData && !conference) {
            rankings = cachedData;
        } else {
            // Fetch from appropriate endpoint
            const endpoint = tournamentOnly ? '/rankings/tournament_field' : '/rankings/net_rankings';
            const url = conference 
                ? `${endpoint}?conference=${encodeURIComponent(conference)}`
                : endpoint;
            
            rankings = await fetchData(url);
            
            // Cache the data if no conference filter
            if (!conference) {
                if (tournamentOnly) {
                    window.cachedTournamentField = rankings;
                } else {
                    window.cachedAllTeams = rankings;
                }
            }
        }

        if (!rankings || rankings.length === 0) {
            tableContainer.innerHTML = '<div class="no-data">No rankings found for this conference</div>';
            return;
        }

        renderNETTable(rankings, tableContainer, tournamentOnly);
    } catch (error) {
        console.error("Error loading NET rankings:", error);
        tableContainer.innerHTML = '<div class="error-message">Error loading rankings</div>';
    }
}

async function renderNETTable(rankings, container, tournamentOnly = false) {
    container.innerHTML = "";

    const table = createEl("table");
    table.className = "net-rankings-table";

    // Create table header
    const thead = createEl("thead");
    const headerRow = createEl("tr");
    
    const headers = [
        { text: "NET", key: "rank" },
        { text: "Team", key: "team" },
        { text: "Conference", key: "conference" },
        { text: "Record", key: "record" },
        { text: "Quad 1", key: "q1" },
        { text: "Quad 2", key: "q2" },
        { text: "Quad 3", key: "q3" },
        { text: "Quad 4", key: "q4" }
    ];

    headers.forEach(header => {
        const th = createEl("th");
        th.textContent = header.text;
        th.className = `th-${header.key}`;
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create table body
    const tbody = createEl("tbody");

    for (const team of rankings) {
        const row = createEl("tr");
        row.className = "net-ranking-row";
        
        // Highlight by bid type for both views
        if (team.bid_type === 'auto') {
            row.classList.add("auto-bid");
        } else if (team.bid_type === 'at-large') {
            row.classList.add("at-large-bid");
        } else if (team.bid_type === 'bubble') {
            row.classList.add("bubble-team");
        }

        // NET Rank
        const rankCell = createEl("td");
        rankCell.textContent = team.rank;
        rankCell.className = "net-rank-cell";
        row.appendChild(rankCell);

        // Team Name with Logo
        const teamCell = createEl("td");
        teamCell.className = "team-name-cell";
        
        const teamContainer = createEl("div");
        teamContainer.style.display = "flex";
        teamContainer.style.alignItems = "center";
        teamContainer.style.gap = "10px";
        
        // Team logo
        try {
            const logoUrl = await fetchTeamImage(team.team);
            const logo = document.createElement("img");
            logo.src = logoUrl;
            logo.alt = team.team;
            logo.className = "net-team-logo";
            logo.style.width = "32px";
            logo.style.height = "32px";
            logo.style.objectFit = "contain";
            teamContainer.appendChild(logo);
        } catch (error) {
            // If logo fails, just show team name
        }
        
        const teamName = createEl("span");
        teamName.textContent = team.team;
        teamContainer.appendChild(teamName);
        
        teamCell.appendChild(teamContainer);
        row.appendChild(teamCell);

        // Conference
        const confCell = createEl("td");
        confCell.textContent = team.conference || "—";
        confCell.className = "conference-cell";
        row.appendChild(confCell);

        // Record
        const recordCell = createEl("td");
        recordCell.textContent = `${team.wins}-${team.losses}`;
        recordCell.className = "record-cell";
        row.appendChild(recordCell);

        // Quad 1
        const q1Cell = createEl("td");
        const q1Record = `${team.q1_wins}-${team.q1_losses}`;
        q1Cell.textContent = q1Record;
        q1Cell.className = "quad-cell quad-1";
        row.appendChild(q1Cell);

        // Quad 2
        const q2Cell = createEl("td");
        const q2Record = `${team.q2_wins}-${team.q2_losses}`;
        q2Cell.textContent = q2Record;
        q2Cell.className = "quad-cell quad-2";
        row.appendChild(q2Cell);

        // Quad 3
        const q3Cell = createEl("td");
        const q3Record = `${team.q3_wins}-${team.q3_losses}`;
        q3Cell.textContent = q3Record;
        q3Cell.className = "quad-cell quad-3";
        row.appendChild(q3Cell);

        // Quad 4
        const q4Cell = createEl("td");
        const q4Record = `${team.q4_wins}-${team.q4_losses}`;
        q4Cell.textContent = q4Record;
        q4Cell.className = "quad-cell quad-4";
        row.appendChild(q4Cell);

        tbody.appendChild(row);
    }

    table.appendChild(tbody);
    container.appendChild(table);
}
