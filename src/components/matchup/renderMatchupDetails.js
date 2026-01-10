import { createEl, append } from "../../utils/dom.js";
import { SmallRankBadge } from "../shared/SmallRankBadge.js";
import { renderGamePredictionThermometer } from "../shared/renderGamePredictionThermometer.js";

export async function renderMatchupDetails(team1Name, team2Name, gameDate, location = "neutral") {
    // Show loading overlay
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = '<div class="loading-spinner-container"><div class="loading-spinner"></div><div class="loading-text">Loading Game Details...</div></div>';
    document.body.appendChild(loadingOverlay);

    try {
        // Fetch all necessary data in parallel
        const [
            team1StatsResponse,
            team2StatsResponse,
            team1Logo,
            team2Logo,
            rankingsResponse,
            team1PtsLeadersResponse,
            team1AstLeadersResponse,
            team1RebLeadersResponse,
            team1BlkLeadersResponse,
            team1StlLeadersResponse,
            team2PtsLeadersResponse,
            team2AstLeadersResponse,
            team2RebLeadersResponse,
            team2BlkLeadersResponse,
            team2StlLeadersResponse,
            team1PastGamesResponse,
            team2PastGamesResponse,
            predictionsResponse
        ] = await Promise.all([
            fetch(`http://localhost:4000/pg_stats/team_pg_stats?team=${encodeURIComponent(team1Name)}`),
            fetch(`http://localhost:4000/pg_stats/team_pg_stats?team=${encodeURIComponent(team2Name)}`),
            fetch(`http://localhost:4000/teams/team_image?team=${encodeURIComponent(team1Name)}`).then(r => r.ok ? r.json() : null),
            fetch(`http://localhost:4000/teams/team_image?team=${encodeURIComponent(team2Name)}`).then(r => r.ok ? r.json() : null),
            fetch(`http://localhost:4000/rankings/top_25`),
            fetch(`http://localhost:4000/pg_stats/team_player_stat_leaders?team=${encodeURIComponent(team1Name)}&stat=pts`),
            fetch(`http://localhost:4000/pg_stats/team_player_stat_leaders?team=${encodeURIComponent(team1Name)}&stat=ast`),
            fetch(`http://localhost:4000/pg_stats/team_player_stat_leaders?team=${encodeURIComponent(team1Name)}&stat=trb`),
            fetch(`http://localhost:4000/pg_stats/team_player_stat_leaders?team=${encodeURIComponent(team1Name)}&stat=blk`),
            fetch(`http://localhost:4000/pg_stats/team_player_stat_leaders?team=${encodeURIComponent(team1Name)}&stat=stl`),
            fetch(`http://localhost:4000/pg_stats/team_player_stat_leaders?team=${encodeURIComponent(team2Name)}&stat=pts`),
            fetch(`http://localhost:4000/pg_stats/team_player_stat_leaders?team=${encodeURIComponent(team2Name)}&stat=ast`),
            fetch(`http://localhost:4000/pg_stats/team_player_stat_leaders?team=${encodeURIComponent(team2Name)}&stat=trb`),
            fetch(`http://localhost:4000/pg_stats/team_player_stat_leaders?team=${encodeURIComponent(team2Name)}&stat=blk`),
            fetch(`http://localhost:4000/pg_stats/team_player_stat_leaders?team=${encodeURIComponent(team2Name)}&stat=stl`),
            fetch(`http://localhost:4000/teams/past_team_games?team=${encodeURIComponent(team1Name)}&n=5`),
            fetch(`http://localhost:4000/teams/past_team_games?team=${encodeURIComponent(team2Name)}&n=5`),
            fetch(`http://localhost:4000/predict/game_points?team=${encodeURIComponent(team1Name)}&opponent=${encodeURIComponent(team2Name)}&gamedate=${gameDate || new Date().toISOString().split('T')[0]}&location=${location}`)
        ]);

        const team1Stats = await team1StatsResponse.json();
        const team2Stats = await team2StatsResponse.json();
        const rankings = rankingsResponse.ok ? await rankingsResponse.json() : [];
        
        const team1PtsLeaders = team1PtsLeadersResponse.ok ? await team1PtsLeadersResponse.json() : [];
        const team1AstLeaders = team1AstLeadersResponse.ok ? await team1AstLeadersResponse.json() : [];
        const team1RebLeaders = team1RebLeadersResponse.ok ? await team1RebLeadersResponse.json() : [];
        const team1BlkLeaders = team1BlkLeadersResponse.ok ? await team1BlkLeadersResponse.json() : [];
        const team1StlLeaders = team1StlLeadersResponse.ok ? await team1StlLeadersResponse.json() : [];
        
        const team2PtsLeaders = team2PtsLeadersResponse.ok ? await team2PtsLeadersResponse.json() : [];
        const team2AstLeaders = team2AstLeadersResponse.ok ? await team2AstLeadersResponse.json() : [];
        const team2RebLeaders = team2RebLeadersResponse.ok ? await team2RebLeadersResponse.json() : [];
        const team2BlkLeaders = team2BlkLeadersResponse.ok ? await team2BlkLeadersResponse.json() : [];
        const team2StlLeaders = team2StlLeadersResponse.ok ? await team2StlLeadersResponse.json() : [];
        
        const team1PastGames = await team1PastGamesResponse.json();
        const team2PastGames = await team2PastGamesResponse.json();
        const predictions = predictionsResponse.ok ? await predictionsResponse.json() : null;

        console.log("Matchup data loaded:", {
            team1Stats,
            team2Stats,
            team1PtsLeaders,
            team2PtsLeaders,
            team1PastGames: team1PastGames?.length,
            team2PastGames: team2PastGames?.length,
            predictions
        });

        // Find team ranks
        const team1Rank = rankings.find(t => t.team === team1Name)?.rank;
        const team2Rank = rankings.find(t => t.team === team2Name)?.rank;

        // Render matchup header
        renderMatchupHeader(team1Name, team2Name, team1Logo, team2Logo, team1Rank, team2Rank, team1Stats, team2Stats);

        // Render prediction thermometer and metrics
        if (predictions && predictions[team1Name] && predictions[team2Name]) {
            await renderPrediction(predictions[team1Name], predictions[team2Name], team1Name, team2Name, gameDate);
        }

        // Render stats comparison
        renderStatsComparison(team1Name, team2Name, team1Stats, team2Stats);

        // Render stat leaders
        await renderStatLeaders(team1Name, team2Name, {
            pts: team1PtsLeaders,
            ast: team1AstLeaders,
            trb: team1RebLeaders,
            blk: team1BlkLeaders,
            stl: team1StlLeaders
        }, {
            pts: team2PtsLeaders,
            ast: team2AstLeaders,
            trb: team2RebLeaders,
            blk: team2BlkLeaders,
            stl: team2StlLeaders
        });

        // Render recent form
        renderRecentForm(team1Name, team2Name, team1PastGames, team2PastGames);

    } catch (error) {
        console.error("Error rendering matchup details:", error);
        
        // Show error message
        const header = document.getElementById("matchup-header");
        if (header) {
            header.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">Error loading matchup details. Please try again.</div>';
        }
    } finally {
        // Remove loading overlay
        const loadingOverlay = document.querySelector('.loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
    }
}

function renderMatchupHeader(team1Name, team2Name, team1Logo, team2Logo, team1Rank, team2Rank, team1Stats, team2Stats) {
    const header = document.getElementById("matchup-header");
    if (!header) return;

    header.innerHTML = "";
    header.className = "matchup-header";

    const container = createEl("div");
    container.className = "matchup-header-content";

    // Team 1
    const team1Container = createEl("div");
    team1Container.className = "matchup-team";

    const logoWrapper1 = createEl("div");
    logoWrapper1.className = "matchup-logo-wrapper";
    logoWrapper1.style.position = "relative";

    if (team1Logo && team1Logo.image) {
        const logo = document.createElement("img");
        logo.className = "matchup-team-logo";
        logo.src = team1Logo.image;
        logo.alt = team1Name;
        logoWrapper1.appendChild(logo);
    } else {
        const fallback = document.createElement("div");
        fallback.className = "matchup-team-logo-fallback";
        fallback.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><ellipse cx="12" cy="12" rx="10" ry="4"/><path d="M12 2 Q 4 12 12 22"/><path d="M12 2 Q 20 12 12 22"/></svg>';
        logoWrapper1.appendChild(fallback);
    }

    if (team1Rank) {
        const badge = SmallRankBadge();
        badge.className = "small-rank-badge";
        badge.textContent = team1Rank;
        badge.style.visibility = "visible";
        badge.style.fontSize = "16px";
        badge.style.width = "32px";
        badge.style.height = "32px";
        logoWrapper1.appendChild(badge);
    }

    team1Container.appendChild(logoWrapper1);

    const team1Info = createEl("div");
    team1Info.className = "matchup-team-info";
    
    const team1NameWrapper = createEl("div");
    team1NameWrapper.className = "matchup-team-name-wrapper";
    
    const team1NameEl = createEl("h1");
    team1NameEl.className = "matchup-team-name";
    if (team1Rank) {
        const rankSpan = createEl("span");
        rankSpan.className = "matchup-rank-text";
        rankSpan.textContent = `#${team1Rank} `;
        team1NameEl.appendChild(rankSpan);
    }
    const teamNameText = document.createTextNode(team1Name);
    team1NameEl.appendChild(teamNameText);
    team1NameWrapper.appendChild(team1NameEl);
    team1NameWrapper.appendChild(team1NameEl);
    team1Info.appendChild(team1NameWrapper);

    if (team1Stats && team1Stats.length > 0) {
        const record = createEl("div");
        record.className = "matchup-team-record";
        // team_pg_stats returns array of [key, value] pairs - find W and L
        const winsEntry = team1Stats.find(entry => entry[0] === 'W');
        const lossesEntry = team1Stats.find(entry => entry[0] === 'L');
        const wins = winsEntry ? winsEntry[1] : 0;
        const losses = lossesEntry ? lossesEntry[1] : 0;
        record.textContent = `${wins}-${losses}`;
        team1Info.appendChild(record);
    }

    team1Container.appendChild(team1Info);

    // VS Separator
    const vsSeparator = createEl("div");
    vsSeparator.className = "matchup-vs";
    vsSeparator.textContent = "VS";

    // Team 2
    const team2Container = createEl("div");
    team2Container.className = "matchup-team";

    const logoWrapper2 = createEl("div");
    logoWrapper2.className = "matchup-logo-wrapper";
    logoWrapper2.style.position = "relative";

    if (team2Logo && team2Logo.image) {
        const logo = document.createElement("img");
        logo.className = "matchup-team-logo";
        logo.src = team2Logo.image;
        logo.alt = team2Name;
        logoWrapper2.appendChild(logo);
    } else {
        const fallback = document.createElement("div");
        fallback.className = "matchup-team-logo-fallback";
        fallback.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><ellipse cx="12" cy="12" rx="10" ry="4"/><path d="M12 2 Q 4 12 12 22"/><path d="M12 2 Q 20 12 12 22"/></svg>';
        logoWrapper2.appendChild(fallback);
    }

    if (team2Rank) {
        const badge = SmallRankBadge();
        badge.className = "small-rank-badge";
        badge.textContent = team2Rank;
        badge.style.visibility = "visible";
        badge.style.fontSize = "16px";
        badge.style.width = "32px";
        badge.style.height = "32px";
        logoWrapper2.appendChild(badge);
    }

    team2Container.appendChild(logoWrapper2);

    const team2Info = createEl("div");
    team2Info.className = "matchup-team-info";
    
    const team2NameWrapper = createEl("div");
    team2NameWrapper.className = "matchup-team-name-wrapper";
    
    const team2NameEl = createEl("h1");
    team2NameEl.className = "matchup-team-name";
    if (team2Rank) {
        const rankSpan = createEl("span");
        rankSpan.className = "matchup-rank-text";
        rankSpan.textContent = `#${team2Rank} `;
        team2NameEl.appendChild(rankSpan);
    }
    const team2NameText = document.createTextNode(team2Name);
    team2NameEl.appendChild(team2NameText);
    team2NameWrapper.appendChild(team2NameEl);
    team2NameWrapper.appendChild(team2NameEl);
    team2Info.appendChild(team2NameWrapper);

    if (team2Stats && team2Stats.length > 0) {
        const record = createEl("div");
        record.className = "matchup-team-record";
        // team_pg_stats returns array of [key, value] pairs - find W and L
        const winsEntry = team2Stats.find(entry => entry[0] === 'W');
        const lossesEntry = team2Stats.find(entry => entry[0] === 'L');
        const wins = winsEntry ? winsEntry[1] : 0;
        const losses = lossesEntry ? lossesEntry[1] : 0;
        record.textContent = `${wins}-${losses}`;
        team2Info.appendChild(record);
    }

    team2Container.appendChild(team2Info);

    append(container, team1Container, vsSeparator, team2Container);
    header.appendChild(container);
}

async function renderPrediction(team1Pred, team2Pred, team1Name, team2Name, gameDate) {
    const container = document.getElementById("prediction-container");
    if (!container) return;

    container.innerHTML = "";
    
    // Create wrapper for thermometer and metrics
    const wrapper = createEl("div");
    wrapper.style.display = "flex";
    wrapper.style.flexDirection = "column";
    wrapper.style.gap = "24px";
    
    // Add thermometer
    const thermometer = renderGamePredictionThermometer(team1Pred, team2Pred, team1Name, team2Name);
    wrapper.appendChild(thermometer);
    
    // Fetch and display game metrics
    try {
        const gameResult = {};
        gameResult[team1Name] = team1Pred;
        gameResult[team2Name] = team2Pred;
        
        const payload = {
            game_result: gameResult
        };
        
        // Add gamedate for caching if available
        if (gameDate) {
            payload.gamedate = gameDate;
        }
        
        const metricsResponse = await fetch('http://localhost:4000/predict/game_metrics', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (metricsResponse.ok) {
            const metrics = await metricsResponse.json();
            const metricsDisplay = renderGameMetrics(metrics, team1Name, team2Name);
            wrapper.appendChild(metricsDisplay);
        }
    } catch (error) {
        console.warn("Failed to fetch game metrics:", error);
    }
    
    container.appendChild(wrapper);
}

function renderGameMetrics(metrics, team1Name, team2Name) {
    const outerContainer = createEl("div");
    outerContainer.style.background = "linear-gradient(135deg, rgba(0, 32, 91, 0.03) 0%, rgba(186, 12, 47, 0.03) 100%)";
    outerContainer.style.borderRadius = "16px";
    outerContainer.style.padding = "4px";
    outerContainer.style.boxShadow = "0 4px 20px rgba(0, 32, 91, 0.12)";
    
    const container = createEl("div");
    container.style.background = "white";
    container.style.borderRadius = "12px";
    container.style.padding = "28px";
    
    // Header with decorative elements
    const header = createEl("div");
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.justifyContent = "space-between";
    header.style.marginBottom = "24px";
    header.style.paddingBottom = "16px";
    header.style.borderBottom = "3px solid transparent";
    header.style.backgroundImage = "linear-gradient(white, white), linear-gradient(90deg, #00205B 0%, #BA0C2F 100%)";
    header.style.backgroundOrigin = "padding-box, border-box";
    header.style.backgroundClip = "padding-box, border-box";
    header.style.borderImage = "linear-gradient(90deg, #00205B 0%, #BA0C2F 100%) 1";
    
    const titleContainer = createEl("div");
    titleContainer.style.display = "flex";
    titleContainer.style.alignItems = "center";
    titleContainer.style.gap = "12px";
    
    // Icon
    const icon = createEl("div");
    icon.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4zm2 2H5V5h14v14.1z" fill="#00205B"/>
    </svg>`;
    titleContainer.appendChild(icon);
    
    const title = createEl("h3");
    title.textContent = "Advanced Game Metrics";
    title.style.fontSize = "20px";
    title.style.fontWeight = "700";
    title.style.background = "linear-gradient(90deg, #00205B 0%, #BA0C2F 100%)";
    title.style.webkitBackgroundClip = "text";
    title.style.webkitTextFillColor = "transparent";
    title.style.backgroundClip = "text";
    title.style.margin = "0";
    titleContainer.appendChild(title);
    
    header.appendChild(titleContainer);
    
    const subtitle = createEl("div");
    subtitle.textContent = "Monte Carlo Simulation";
    subtitle.style.fontSize = "12px";
    subtitle.style.color = "#666";
    subtitle.style.fontWeight = "600";
    subtitle.style.textTransform = "uppercase";
    subtitle.style.letterSpacing = "1px";
    header.appendChild(subtitle);
    
    container.appendChild(header);
    
    // Grid for metrics cards
    const grid = createEl("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(auto-fit, minmax(280px, 1fr))";
    grid.style.gap = "20px";
    
    // Determine spread direction and favored team
    const spreadValue = Math.abs(metrics.spread_estimate.median);
    const favoredTeam = metrics.spread_estimate.median > 0 ? team1Name : team2Name;
    const spreadP25 = Math.abs(metrics.spread_estimate.distribution.p25);
    const spreadP75 = Math.abs(metrics.spread_estimate.distribution.p75);
    
    // Win Probability Card (Blue)
    const winProbCard = createMetricCard(
        "Win Probability",
        [
            { label: team1Name, value: `${(metrics.win_probability[team1Name].p50 * 100).toFixed(1)}%`, range: `${(metrics.win_probability[team1Name].p25 * 100).toFixed(0)}-${(metrics.win_probability[team1Name].p75 * 100).toFixed(0)}%` },
            { label: team2Name, value: `${(metrics.win_probability[team2Name].p50 * 100).toFixed(1)}%`, range: `${(metrics.win_probability[team2Name].p25 * 100).toFixed(0)}-${(metrics.win_probability[team2Name].p75 * 100).toFixed(0)}%` }
        ],
        "#00205B",
        null
    );
    
    // Spread Estimate Card (Red)
    const spreadCard = createMetricCard(
        "Spread Estimate",
        [
            { label: "Favored Team", value: favoredTeam },
            { label: "Point Spread", value: `${spreadValue.toFixed(1)} pts`, range: `${Math.min(spreadP25, spreadP75).toFixed(1)}-${Math.max(spreadP25, spreadP75).toFixed(1)} pts` }
        ],
        "#BA0C2F",
        null
    );
    
    // Upset Risk Card (Blue)
    const upsetCard = createMetricCard(
        "Upset Risk",
        [
            { label: "Underdog", value: metrics.underdog },
            { label: "Upset Chance", value: `${(metrics.upset_risk.median * 100).toFixed(1)}%`, range: `${(metrics.upset_risk.distribution.p25 * 100).toFixed(0)}-${(metrics.upset_risk.distribution.p75 * 100).toFixed(0)}%` }
        ],
        "#00205B",
        null
    );
    
    // Blowout Probability Card (Red)
    const blowoutCard = createMetricCard(
        `Blowout Probability`,
        [
            { label: "Favorite", value: metrics.favorite },
            { label: `${metrics.blowout_probability.margin}+ Point Win`, value: `${(metrics.blowout_probability.median * 100).toFixed(1)}%`, range: `${(metrics.blowout_probability.distribution.p25 * 100).toFixed(0)}-${(metrics.blowout_probability.distribution.p75 * 100).toFixed(0)}%` }
        ],
        "#BA0C2F",
        null
    );
    
    append(grid, winProbCard, spreadCard, upsetCard, blowoutCard);
    container.appendChild(grid);
    outerContainer.appendChild(container);
    
    return outerContainer;
}

function createMetricCard(title, items, accentColor, emoji) {
    const card = createEl("div");
    card.style.background = "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)";
    card.style.borderRadius = "12px";
    card.style.padding = "20px";
    card.style.border = `2px solid ${accentColor}`;
    card.style.borderLeft = `6px solid ${accentColor}`;
    card.style.boxShadow = "0 2px 8px rgba(0, 32, 91, 0.08)";
    card.style.transition = "all 0.3s ease";
    card.style.position = "relative";
    card.style.overflow = "hidden";
    
    // Hover effect
    card.addEventListener("mouseenter", () => {
        card.style.transform = "translateY(-4px)";
        card.style.boxShadow = "0 8px 20px rgba(0, 32, 91, 0.15)";
    });
    
    card.addEventListener("mouseleave", () => {
        card.style.transform = "translateY(0)";
        card.style.boxShadow = "0 2px 8px rgba(0, 32, 91, 0.08)";
    });
    
    // Background accent circle
    const accentCircle = createEl("div");
    accentCircle.style.position = "absolute";
    accentCircle.style.top = "-40px";
    accentCircle.style.right = "-40px";
    accentCircle.style.width = "120px";
    accentCircle.style.height = "120px";
    accentCircle.style.borderRadius = "50%";
    accentCircle.style.background = accentColor;
    accentCircle.style.opacity = "0.05";
    card.appendChild(accentCircle);
    
    // Card header
    const cardHeader = createEl("div");
    cardHeader.style.display = "flex";
    cardHeader.style.alignItems = "center";
    cardHeader.style.gap = "8px";
    cardHeader.style.marginBottom = "16px";
    cardHeader.style.position = "relative";
    cardHeader.style.zIndex = "1";
    
    if (emoji) {
        const emojiIcon = createEl("span");
        emojiIcon.textContent = emoji;
        emojiIcon.style.fontSize = "20px";
        cardHeader.appendChild(emojiIcon);
    }
    
    const cardTitle = createEl("div");
    cardTitle.textContent = title;
    cardTitle.style.fontSize = "14px";
    cardTitle.style.fontWeight = "700";
    cardTitle.style.color = accentColor;
    cardTitle.style.textTransform = "uppercase";
    cardTitle.style.letterSpacing = "0.5px";
    cardHeader.appendChild(cardTitle);
    
    card.appendChild(cardHeader);
    
    // Items container
    const itemsContainer = createEl("div");
    itemsContainer.style.position = "relative";
    itemsContainer.style.zIndex = "1";
    
    items.forEach((item, index) => {
        const itemRow = createEl("div");
        itemRow.style.display = "flex";
        itemRow.style.justifyContent = "space-between";
        itemRow.style.alignItems = "center";
        itemRow.style.marginBottom = index < items.length - 1 ? "12px" : "0";
        itemRow.style.paddingBottom = index < items.length - 1 ? "12px" : "0";
        itemRow.style.borderBottom = index < items.length - 1 ? `1px solid ${accentColor}20` : "none";
        
        const label = createEl("div");
        label.textContent = item.label;
        label.style.fontSize = "13px";
        label.style.color = "#666";
        label.style.fontWeight = "600";
        
        const valueContainer = createEl("div");
        valueContainer.style.display = "flex";
        valueContainer.style.flexDirection = "column";
        valueContainer.style.alignItems = "flex-end";
        
        const value = createEl("div");
        value.textContent = item.value;
        value.style.fontSize = "18px";
        value.style.fontWeight = "700";
        value.style.color = accentColor;
        valueContainer.appendChild(value);
        
        if (item.range) {
            const range = createEl("div");
            range.textContent = item.range;
            range.style.fontSize = "11px";
            range.style.color = "#999";
            range.style.fontWeight = "500";
            valueContainer.appendChild(range);
        }
        
        append(itemRow, label, valueContainer);
        itemsContainer.appendChild(itemRow);
    });
    
    card.appendChild(itemsContainer);
    
    return card;
}

function renderStatsComparison(team1Name, team2Name, team1Stats, team2Stats) {
    const container = document.getElementById("stats-comparison-container");
    if (!container) return;

    container.innerHTML = "";

    if (!team1Stats || team1Stats.length === 0 || !team2Stats || team2Stats.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">No stats available</div>';
        return;
    }

    // Add team headers
    const headerRow = createEl("div");
    headerRow.className = "stats-comparison-header";
    
    const team1Header = createEl("div");
    team1Header.className = "stats-comparison-team-header";
    team1Header.textContent = team1Name;
    
    const statHeader = createEl("div");
    statHeader.className = "stats-comparison-stat-header";
    statHeader.textContent = "";
    
    const team2Header = createEl("div");
    team2Header.className = "stats-comparison-team-header";
    team2Header.textContent = team2Name;
    
    append(headerRow, team1Header, statHeader, team2Header);
    container.appendChild(headerRow);

    // Convert array of [key, value] pairs to object
    const stats1 = Object.fromEntries(team1Stats);
    const stats2 = Object.fromEntries(team2Stats);

    const statsToCompare = [
        { label: "Points Per Game", key: "team_pts", format: (v) => v?.toFixed(1) || "0.0" },
        { label: "Field Goal %", key: "team_fg2_pct", format: (v) => v ? `${(v * 100).toFixed(1)}%` : "0.0%" },
        { label: "3-Point %", key: "team_fg3_pct", format: (v) => v ? `${(v * 100).toFixed(1)}%` : "0.0%" },
        { label: "Free Throw %", key: "team_ft_pct", format: (v) => v ? `${(v * 100).toFixed(1)}%` : "0.0%" },
        { label: "Rebounds Per Game", key: "team_trb", format: (v) => v?.toFixed(1) || "0.0" },
        { label: "Assists Per Game", key: "team_ast", format: (v) => v?.toFixed(1) || "0.0" },
        { label: "Steals Per Game", key: "team_stl", format: (v) => v?.toFixed(1) || "0.0" },
        { label: "Blocks Per Game", key: "team_blk", format: (v) => v?.toFixed(1) || "0.0" },
        { label: "Turnovers Per Game", key: "team_tov", format: (v) => v?.toFixed(1) || "0.0", reverse: true }
    ];

    statsToCompare.forEach(stat => {
        const card = createEl("div");
        card.className = "stat-comparison-card";

        const statLabel = createEl("div");
        statLabel.className = "stat-comparison-label";
        statLabel.textContent = stat.label;

        const statValues = createEl("div");
        statValues.className = "stat-comparison-values";

        const team1Value = stats1[stat.key];
        const team2Value = stats2[stat.key];

        const team1Better = stat.reverse 
            ? (team1Value < team2Value) 
            : (team1Value > team2Value);

        const team1Val = createEl("div");
        team1Val.className = "stat-comparison-value";
        team1Val.textContent = stat.format(team1Value);
        if (team1Better) team1Val.classList.add("stat-comparison-winner");

        const team2Val = createEl("div");
        team2Val.className = "stat-comparison-value";
        team2Val.textContent = stat.format(team2Value);
        if (!team1Better && team1Value !== team2Value) team2Val.classList.add("stat-comparison-winner");

        append(statValues, team1Val, team2Val);
        append(card, statLabel, statValues);
        container.appendChild(card);
    });
}

async function renderStatLeaders(team1Name, team2Name, team1Leaders, team2Leaders) {
    const container = document.getElementById("stat-leaders-container");
    if (!container) return;

    container.innerHTML = "";

    const stats = [
        { key: 'pts', label: 'Points', unit: 'PPG' },
        { key: 'ast', label: 'Assists', unit: 'APG' },
        { key: 'trb', label: 'Rebounds', unit: 'RPG' },
        { key: 'blk', label: 'Blocks', unit: 'BPG' },
        { key: 'stl', label: 'Steals', unit: 'SPG' }
    ];

    for (const stat of stats) {
        const statRow = createEl("div");
        statRow.className = "stat-leader-row";

        // Stat label
        const statLabel = createEl("div");
        statLabel.className = "stat-leader-label";
        statLabel.textContent = stat.label;
        statRow.appendChild(statLabel);

        // Team 1 leader
        const team1LeaderData = team1Leaders[stat.key];
        const team1Leader = team1LeaderData && team1LeaderData.length > 0 ? team1LeaderData[0] : null;
        const team1LeaderCard = await createStatLeaderCard(team1Leader, stat, team1Name);
        statRow.appendChild(team1LeaderCard);

        // Team 2 leader
        const team2LeaderData = team2Leaders[stat.key];
        const team2Leader = team2LeaderData && team2LeaderData.length > 0 ? team2LeaderData[0] : null;
        const team2LeaderCard = await createStatLeaderCard(team2Leader, stat, team2Name);
        statRow.appendChild(team2LeaderCard);

        container.appendChild(statRow);
    }
}

async function createStatLeaderCard(player, stat, teamName) {
    const card = createEl("div");
    card.className = "stat-leader-player-card";

    if (!player) {
        card.innerHTML = '<div style="text-align: center; color: #999; font-size: 14px;">No data</div>';
        return card;
    }

    // Fetch player photo
    let photoUrl = null;
    try {
        const photoResponse = await fetch(`http://localhost:4000/players/player_photos?player=${encodeURIComponent(player.player)}&team=${encodeURIComponent(teamName)}`);
        if (photoResponse.ok) {
            const photoData = await photoResponse.json();
            console.log('Fetched photo data for', player.player, ':', photoData);
            photoUrl = photoData.photo_url;
        } else if (photoResponse.status === 404) {
            // Photo not found, use fallback
            photoUrl = null;
        }
    } catch (error) {
        // Network error or other issue, use fallback
        console.debug('Player photo not available:', player.player);
    }

    // Player photo
    const photoWrapper = createEl("div");
    photoWrapper.className = "stat-leader-photo-wrapper";
    
    if (photoUrl) {
        const photo = document.createElement("img");
        photo.className = "stat-leader-photo";
        photo.src = photoUrl;
        photo.alt = player.player;
        photo.onerror = () => {
            photo.style.display = 'none';
            const fallback = createPlayerPhotoFallback();
            photoWrapper.appendChild(fallback);
        };
        photoWrapper.appendChild(photo);
    } else {
        const fallback = createPlayerPhotoFallback();
        photoWrapper.appendChild(fallback);
    }
    
    card.appendChild(photoWrapper);

    // Player info
    const info = createEl("div");
    info.className = "stat-leader-player-info";
    
    const name = createEl("div");
    name.className = "stat-leader-player-name";
    name.textContent = player.player;
    
    const statValue = createEl("div");
    statValue.className = "stat-leader-player-stat";
    const value = player[stat.key] || 0;
    statValue.textContent = `${parseFloat(value).toFixed(1)} ${stat.unit}`;
    
    append(info, name, statValue);
    card.appendChild(info);

    return card;
}

function createPlayerPhotoFallback() {
    const fallback = createEl("div");
    fallback.className = "stat-leader-photo-fallback";
    fallback.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
    return fallback;
}

function renderRecentForm(team1Name, team2Name, team1Games, team2Games) {
    const container = document.getElementById("recent-form-container");
    if (!container) return;

    container.innerHTML = "";

    // Team 1 Recent Games
    const team1Column = createEl("div");
    team1Column.className = "recent-form-column";

    const team1Header = createEl("h3");
    team1Header.className = "recent-form-team-name";
    team1Header.textContent = `${team1Name} - Last 5 Games`;
    team1Column.appendChild(team1Header);

    if (team1Games && Array.isArray(team1Games) && team1Games.length > 0) {
        team1Games.slice(-5).reverse().forEach(game => {
            const gameCard = createRecentGameCard(game, team1Name);
            team1Column.appendChild(gameCard);
        });
    } else {
        const noGames = createEl("div");
        noGames.className = "no-recent-games";
        noGames.textContent = "No recent games available";
        team1Column.appendChild(noGames);
    }

    // Team 2 Recent Games
    const team2Column = createEl("div");
    team2Column.className = "recent-form-column";

    const team2Header = createEl("h3");
    team2Header.className = "recent-form-team-name";
    team2Header.textContent = `${team2Name} - Last 5 Games`;
    team2Column.appendChild(team2Header);

    if (team2Games && Array.isArray(team2Games) && team2Games.length > 0) {
        team2Games.slice(-5).reverse().forEach(game => {
            const gameCard = createRecentGameCard(game, team2Name);
            team2Column.appendChild(gameCard);
        });
    } else {
        const noGames = createEl("div");
        noGames.className = "no-recent-games";
        noGames.textContent = "No recent games available";
        team2Column.appendChild(noGames);
    }

    append(container, team1Column, team2Column);
}

function createRecentGameCard(game, teamName) {
    const card = createEl("div");
    card.className = "recent-form-card";

    const isWin = game.team_pts > game.opponent_pts;
    card.classList.add(isWin ? "recent-form-win" : "recent-form-loss");

    const result = createEl("div");
    result.className = "recent-form-result";
    result.textContent = isWin ? "W" : "L";

    const gameInfo = createEl("div");
    gameInfo.className = "recent-form-info";

    const opponent = createEl("div");
    opponent.className = "recent-form-opponent";
    const vsText = game.location && game.location.toLowerCase().includes('home') ? 'vs' : '@';
    opponent.textContent = `${vsText} ${game.opponent}`;

    const score = createEl("div");
    score.className = "recent-form-score";
    score.textContent = `${game.team_pts} - ${game.opponent_pts}`;

    const date = createEl("div");
    date.className = "recent-form-date";
    if (game.date) {
        // Handle both YYYY-MM-DD format and ISO date strings
        let gameDate;
        if (typeof game.date === 'string') {
            if (game.date.includes('T')) {
                // ISO string
                gameDate = new Date(game.date);
            } else {
                // YYYY-MM-DD format
                const dateParts = game.date.split('-');
                gameDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
            }
        } else {
            gameDate = new Date(game.date);
        }
        
        if (!isNaN(gameDate.getTime())) {
            date.textContent = gameDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } else {
            date.textContent = '';
        }
    }

    append(gameInfo, opponent, score, date);
    append(card, result, gameInfo);

    return card;
}
