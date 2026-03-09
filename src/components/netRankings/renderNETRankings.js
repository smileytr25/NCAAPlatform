import { createEl } from "../../utils/dom.js";
import { fetchData, fetchTeamImage } from "../../utils/fetch.js";

export async function renderNETRankings(container) {
    container.innerHTML = "";

    // Create section header
    const headerSection = createEl("div");
    headerSection.className = "net-rankings-header";

    const title = createEl("h2");
    title.textContent = "Rankings";
    title.className = "net-rankings-title";

    const subtitle = createEl("p");
    subtitle.textContent = "NCAA evaluation tools and team rankings";
    subtitle.className = "net-rankings-subtitle";

    // Create rating system tabs
    const tabsContainer = createEl("div");
    tabsContainer.className = "ratings-tabs-container";

    const netTab = createEl("button");
    netTab.textContent = "NET Rankings";
    netTab.className = "ratings-tab active";
    netTab.id = "net-tab";

    const kenpomTab = createEl("button");
    kenpomTab.textContent = "KenPom Rankings";
    kenpomTab.className = "ratings-tab";
    kenpomTab.id = "kenpom-tab";

    tabsContainer.appendChild(netTab);
    tabsContainer.appendChild(kenpomTab);

    let selectedRatingSystem = "net";

    // Create legend (NET-specific initially)
    const legend = createEl("div");
    legend.className = "net-rankings-legend";
    legend.id = "ratings-legend";
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
    let cachedAllTeamsKenpom = null;
    let cachedTournamentFieldKenpom = null;

    // Fetch and populate conferences
    try {
        let conferences = await fetchData("/conferences/all_conference_names");
        
        // Map conference names for display
        const conferenceNameMap = {
            "Summit": "Summit League",
            "Patriot": "Patriot League",
            "Southern": "SoCon"
        };
        
        conferences.conferences = conferences.conferences.map(conf => 
            conferenceNameMap[conf] || conf
        );
        
        // Add "All Conferences" option
        const allOption = createEl("div");
        allOption.className = "dropdown-option";
        allOption.textContent = "All Conferences";
        allOption.onclick = (e) => {
            e.stopPropagation();
            selectedConference = "";
            selectConferenceButton.textContent = "All Conferences";
            conferenceDropdownMenu.classList.remove("active");
            loadRatings("", showTournamentOnly, selectedRatingSystem);
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
                    loadRatings(conf, showTournamentOnly, selectedRatingSystem);
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
    headerSection.appendChild(tabsContainer);
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
    await loadRatings("", false, "net");
    const elapsed = Date.now() - startTime;
    const remainingTime = Math.max(0, 2000 - elapsed);
    
    setTimeout(() => {
        loadingOverlay.style.opacity = '0';
        setTimeout(() => {
            loadingOverlay.remove();
        }, 300);
    }, remainingTime);

    // Tab switching event listeners
    netTab.addEventListener("click", () => {
        selectedRatingSystem = "net";
        netTab.classList.add("active");
        kenpomTab.classList.remove("active");
        updateLegendForRatingSystem("net");
        loadRatings(selectedConference, showTournamentOnly, "net");
    });

    kenpomTab.addEventListener("click", () => {
        selectedRatingSystem = "kenpom";
        kenpomTab.classList.add("active");
        netTab.classList.remove("active");
        updateLegendForRatingSystem("kenpom");
        loadRatings(selectedConference, showTournamentOnly, "kenpom");
    });

    // Toggle button event listeners
    allTeamsBtn.addEventListener("click", () => {
        showTournamentOnly = false;
        allTeamsBtn.classList.add("active");
        tournamentBtn.classList.remove("active");
        loadRatings(selectedConference, false, selectedRatingSystem);
    });

    tournamentBtn.addEventListener("click", () => {
        showTournamentOnly = true;
        tournamentBtn.classList.add("active");
        allTeamsBtn.classList.remove("active");
        loadRatings(selectedConference, true, selectedRatingSystem);
    });
}

async function loadRatings(conference, tournamentOnly = false, ratingSystem = "net") {
    const tableContainer = document.getElementById("net-rankings-table");
    
    // Conference name mapping for display
    const conferenceNameMap = {
        "Summit": "Summit League",
        "Patriot": "Patriot League",
        "Southern": "SoCon"
    };
    
    try {
        let rankings;
        
        // Determine cache keys and endpoints based on rating system
        let cacheKey, endpoint, cachedData;
        
        if (ratingSystem === "kenpom") {
            cacheKey = tournamentOnly ? 'cachedTournamentFieldKenpom' : 'cachedAllTeamsKenpom';
            endpoint = '/rankings/kenpom_rankings';
            cachedData = tournamentOnly ? window.cachedTournamentFieldKenpom : window.cachedAllTeamsKenpom;
        } else {
            cacheKey = tournamentOnly ? 'cachedTournamentField' : 'cachedAllTeams';
            endpoint = tournamentOnly ? '/rankings/tournament_field' : '/rankings/net_rankings';
            cachedData = tournamentOnly ? window.cachedTournamentField : window.cachedAllTeams;
        }

        // Use cached data if available and no conference filter
        if (cachedData && !conference) {
            rankings = cachedData;
        } else {
            // Fetch from appropriate endpoint
            const url = conference 
                ? `${endpoint}?conference=${encodeURIComponent(conference)}`
                : endpoint;
            
            rankings = await fetchData(url);
            
            // Cache the data if no conference filter
            if (!conference) {
                if (ratingSystem === "kenpom") {
                    if (tournamentOnly) {
                        window.cachedTournamentFieldKenpom = rankings;
                    } else {
                        window.cachedAllTeamsKenpom = rankings;
                    }
                } else {
                    if (tournamentOnly) {
                        window.cachedTournamentField = rankings;
                    } else {
                        window.cachedAllTeams = rankings;
                    }
                }
            }
        }

        if (!rankings || rankings.length === 0) {
            tableContainer.innerHTML = '<div class="no-data">No rankings found for this conference</div>';
            return;
        }

        // Apply conference name mapping to rankings data
        rankings = rankings.map(team => ({
            ...team,
            conference: conferenceNameMap[team.conference] || team.conference
        }));

        renderRatingsTable(rankings, tableContainer, ratingSystem, tournamentOnly);
    } catch (error) {
        console.error("Error loading rankings:", error);
        tableContainer.innerHTML = '<div class="error-message">Error loading rankings</div>';
    }
}

function updateLegendForRatingSystem(ratingSystem) {
    const legend = document.getElementById("ratings-legend");
    
    if (ratingSystem === "net") {
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
    } else {
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
    }
}

async function renderRatingsTable(rankings, container, ratingSystem = "net", tournamentOnly = false) {
    container.innerHTML = "";

    const table = createEl("table");
    table.className = "net-rankings-table";

    // Create table header based on rating system
    const thead = createEl("thead");
    const headerRow = createEl("tr");
    
    let headers;
    if (ratingSystem === "kenpom") {
        headers = [
            { text: "Kenpom", key: "kenpom_rank" },
            { text: "Team", key: "team" },
            { text: "Conference", key: "conference" },
            { text: "Record", key: "record" },
            { text: "NET", key: "net_rank" },
            { text: "NetRtg", key: "netrtg" },
            { text: "ORtg", key: "ortg" },
            { text: "ORtg Rk", key: "ortg_rk" },
            { text: "DRtg", key: "drtg" },
            { text: "DRtg Rk", key: "drtg_rk" },
            { text: "AdjT", key: "adjt" },
            { text: "AdjT Rk", key: "adjt_rk" },
            { text: "Luck", key: "luck" },
            { text: "Luck Rk", key: "luck_rk" },
            { text: "SOS NetRtg", key: "sos_netrtg" },
            { text: "SOS NetRtg Rk", key: "sos_netrtg_rk" },
            { text: "SOS ORtg", key: "sos_ortg" },
            { text: "SOS ORtg Rk", key: "sos_ortg_rk" },
            { text: "SOS DRtg", key: "sos_drtg" },
            { text: "SOS DRtg Rk", key: "sos_drtg_rk" },
            { text: "NCSOS NetRtg", key: "ncsos_netrtg" },
            { text: "NCSOS NetRtg Rk", key: "ncsos_netrtg_rk" }
        ];
    } else {
        headers = [
            { text: "NET", key: "rank" },
            { text: "Team", key: "team" },
            { text: "Conference", key: "conference" },
            { text: "Record", key: "record" },
            { text: "Conf Record", key: "conf_record" },
            { text: "Quad 1", key: "q1" },
            { text: "Quad 2", key: "q2" },
            { text: "Quad 3", key: "q3" },
            { text: "Quad 4", key: "q4" }
        ];
    }

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
        
        if (team.bid_type === 'auto') {
            row.classList.add("auto-bid");
        } else if (team.bid_type === 'at-large') {
            row.classList.add("at-large-bid");
        } else if (team.bid_type === 'bubble') {
            row.classList.add("bubble-team");
        }

        if (ratingSystem === "net") {
            // Rank
            const rankCell = createEl("td");
            rankCell.textContent = team.rank;
            rankCell.className = "net-rank-cell";
            row.appendChild(rankCell);
        } else {
            const rankCell = createEl("td");
            rankCell.textContent = team.kenpom_rank ? team.kenpom_rank : "—";
            rankCell.className = "net-rank-cell";
            row.appendChild(rankCell);
        }

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
        const recordText = team.record || `${team.wins || "0"}-${team.losses || "0"}`;
        recordCell.textContent = recordText;
        recordCell.className = "record-cell";
        row.appendChild(recordCell);

        // Conference Record (for NET ratings only)
        if (ratingSystem === "net") {
            const confRecordCell = createEl("td");
            const confRecordText = team.conf_wins !== undefined && team.conf_losses !== undefined 
                ? `${team.conf_wins}-${team.conf_losses}` 
                : "—";
            confRecordCell.textContent = confRecordText;
            confRecordCell.className = "conf-record-cell";
            row.appendChild(confRecordCell);
        }

        if (ratingSystem === "kenpom") {
            // NET Rank
            const netRankCell = createEl("td");
            netRankCell.textContent = team.net_rank ? team.net_rank : "—";
            netRankCell.className = "kenpom-stat-cell";
            row.appendChild(netRankCell);

            // NetRtg
            const netRtgCell = createEl("td");
            netRtgCell.textContent = team.netrtg ? parseFloat(team.netrtg).toFixed(1) : "—";
            netRtgCell.className = "kenpom-stat-cell";
            row.appendChild(netRtgCell);

            // AdjO (Adjusted Offense)
            const adjOCell = createEl("td");
            adjOCell.textContent = team.ortg ? parseFloat(team.ortg).toFixed(1) : "—";
            adjOCell.className = "kenpom-stat-cell";
            row.appendChild(adjOCell);

            // AdjO Rank
            const adjORkCell = createEl("td");
            adjORkCell.textContent = team.ortg_rk ? team.ortg_rk : "—";
            adjORkCell.className = "kenpom-stat-cell";
            row.appendChild(adjORkCell);

            // AdjD (Adjusted Defense)
            const adjDCell = createEl("td");
            adjDCell.textContent = team.drtg ? parseFloat(team.drtg).toFixed(1) : "—";
            adjDCell.className = "kenpom-stat-cell";
            row.appendChild(adjDCell);

            // AdjD Rank
            const adjDRkCell = createEl("td");
            adjDRkCell.textContent = team.drtg_rk ? team.drtg_rk : "—";
            adjDRkCell.className = "kenpom-stat-cell";
            row.appendChild(adjDRkCell);

            // AdjT (Adjusted Tempo)
            const adjTCell = createEl("td");
            adjTCell.textContent = team.adjt ? parseFloat(team.adjt).toFixed(1) : "—";
            adjTCell.className = "kenpom-stat-cell";
            row.appendChild(adjTCell);

            // AdjT Rank
            const adjTRkCell = createEl("td");
            adjTRkCell.textContent = team.adjt_rk ? team.adjt_rk : "—";
            adjTRkCell.className = "kenpom-stat-cell";
            row.appendChild(adjTRkCell);

            // Luck
            const luckCell = createEl("td");
            luckCell.textContent = team.luck ? parseFloat(team.luck).toFixed(3) : "—";
            luckCell.className = "kenpom-stat-cell";
            row.appendChild(luckCell);

            // Luck Rank
            const luckRkCell = createEl("td");
            luckRkCell.textContent = team.luck_rk ? team.luck_rk : "—";
            luckRkCell.className = "kenpom-stat-cell";
            row.appendChild(luckRkCell);

            // SOS (Strength of Schedule) - NetRTG
            const sosCell = createEl("td");
            sosCell.textContent = team.sos_netrtg ? parseFloat(team.sos_netrtg).toFixed(1) : "—";
            sosCell.className = "kenpom-stat-cell";
            row.appendChild(sosCell);

            // SOS NetRtg Rank
            const sosRkCell = createEl("td");
            sosRkCell.textContent = team.sos_netrtg_rk ? team.sos_netrtg_rk : "—";
            sosRkCell.className = "kenpom-stat-cell";
            row.appendChild(sosRkCell);

            // SOS ORtg
            const sosORtgCell = createEl("td");
            sosORtgCell.textContent = team.sos_ortg ? parseFloat(team.sos_ortg).toFixed(1) : "—";
            sosORtgCell.className = "kenpom-stat-cell";
            row.appendChild(sosORtgCell);
            
            // SOS ORtg Rank
            const sosORtkRkCell = createEl("td");
            sosORtkRkCell.textContent = team.sos_ortg_rk ? team.sos_ortg_rk : "—";
            sosORtkRkCell.className = "kenpom-stat-cell";
            row.appendChild(sosORtkRkCell);

            // SOS DRtg
            const sosDRtgCell = createEl("td");
            sosDRtgCell.textContent = team.sos_drtg ? parseFloat(team.sos_drtg).toFixed(1) : "—";
            sosDRtgCell.className = "kenpom-stat-cell";
            row.appendChild(sosDRtgCell);
            
            // SOS DRtg Rank
            const sosDRtkRkCell = createEl("td");
            sosDRtkRkCell.textContent = team.sos_drtg_rk ? team.sos_drtg_rk : "—";
            sosDRtkRkCell.className = "kenpom-stat-cell";
            row.appendChild(sosDRtkRkCell);

            // NCSOS NetRtg
            const ncSosCell = createEl("td");
            ncSosCell.textContent = team.ncsos_netrtg ? parseFloat(team.ncsos_netrtg).toFixed(1) : "—";
            ncSosCell.className = "kenpom-stat-cell";
            row.appendChild(ncSosCell);

            // NCSOS NetRtg Rank
            const ncSosRkCell = createEl("td");
            ncSosRkCell.textContent = team.ncsos_netrtg_rk ? team.ncsos_netrtg_rk : "—";
            ncSosRkCell.className = "kenpom-stat-cell";
            row.appendChild(ncSosRkCell);

        } else {
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
        }

        tbody.appendChild(row);
    }

    table.appendChild(tbody);
    container.appendChild(table);
}
