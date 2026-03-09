import { GlobalState } from "./state/globalState.js";
import { renderTeamStats } from "./components/teamStats/teamStats.index.js";
import { renderPlayerPage } from "./components/playerStats/playerStats.index.js";
import { renderConferenceStats } from "./components/conference/conference.index.js";
import { renderTop25 } from "./components/top25/renderTop25.js";
import { renderTopPlayersUnified } from "./components/topPlayers/renderTopPlayersUnified.js";
import { registerListeners } from "./listeners/registerListeners.js";
import { renderBoxScore } from "./components/boxScore/renderBoxScore.js";
import { renderHeroSection } from "./components/hero/renderHeroSection.js";
import { renderConferencePreview } from "./components/conferencePreview/renderConferencePreview.js";
import { renderRecentGames } from "./components/recentGames/renderRecentGames.js";
import { initUnifiedSearch } from "./listeners/initUnifiedSearch.js";
import { renderNETRankings } from "./components/netRankings/renderNETRankings.js";

GlobalState.displayBoxScore = renderBoxScore;

document.addEventListener("DOMContentLoaded", () => {
    let currentView = "home";
    
    const navigateHome = (push = true, scrollPosition = 0) => {
        if (push) history.pushState({ view: "home", scrollPosition }, "", window.location.pathname);
        currentView = "home";
        
        // Show home sections
        const heroSection = document.getElementById("hero-section");
        const bracketPromo = document.getElementById("bracket-promo");
        const conferencePreview = document.getElementById("conference-preview");
        const recentGamesSection = document.getElementById("recent-games-section");
        const top25Container = document.querySelector("#top25-panel").parentElement;
        const topPlayersContainer = document.querySelector("#top-players-panel").parentElement;
        const netRankingsSection = document.getElementById("net-rankings-section");
        
        if (heroSection) heroSection.style.display = "block";
        if (bracketPromo) bracketPromo.style.display = "block";
        if (conferencePreview) conferencePreview.style.display = "block";
        if (recentGamesSection) recentGamesSection.style.display = "block";
        if (top25Container) top25Container.style.display = "block";
        if (topPlayersContainer) topPlayersContainer.style.display = "block";
        if (netRankingsSection) netRankingsSection.style.display = "none";
        updateCarouselVisibility(); // Update carousel/promo visibility when navigating home
        
        if (top25Panel) top25Panel.style.display = "block";
        if (topPlayersPanel) topPlayersPanel.style.display = "block";
        if (pgStatsContainer) {
            pgStatsContainer.style.display = "none";
            pgStatsContainer.innerHTML = "";
        }
        if (conferenceStandingsContainer) {
            conferenceStandingsContainer.style.display = "none";
            conferenceStandingsContainer.innerHTML = "";
        }
        
        // Remove back button wrapper if it exists
        const wrapper = document.getElementById("player-home-wrapper");
        if (wrapper) wrapper.remove();
        
        // Restore scroll position
        if (scrollPosition > 0) {
            requestAnimationFrame(() => {
                window.scrollTo(0, scrollPosition);
            });
        }
    };

    const navigateTeam = (teamName, push = true) => {
        if (push) history.pushState({ view: "team", team: teamName }, "", window.location.pathname);
        currentView = "team";
        
        // Hide home sections
        const heroSection = document.getElementById("hero-section");
        const bracketPromo = document.getElementById("bracket-promo");
        const conferencePreview = document.getElementById("conference-preview");
        const recentGamesSection = document.getElementById("recent-games-section");
        const top25Container = document.querySelector("#top25-panel").parentElement;
        const topPlayersContainer = document.querySelector("#top-players-panel").parentElement;
        
        if (heroSection) heroSection.style.display = "none";
        if (bracketPromo) bracketPromo.style.display = "none";
        if (conferencePreview) conferencePreview.style.display = "none";
        if (recentGamesSection) recentGamesSection.style.display = "none";
        if (top25Container) top25Container.style.display = "none";
        if (topPlayersContainer) topPlayersContainer.style.display = "none";
        
        if (top25Panel) top25Panel.style.display = "none";
        if (topPlayersPanel) topPlayersPanel.style.display = "none";
        renderTeamStats(teamName, pgStatsContainer, conferenceStandingsContainer, GlobalState.displayBoxScore, renderConferenceStats);
    };

    const navigatePlayer = (playerName, playerTeam, push = true) => {
        if (push) history.pushState({ view: "player", player: playerName, team: playerTeam }, "", window.location.pathname);
        currentView = "player";
        
        // Hide home sections
        const heroSection = document.getElementById("hero-section");
        const bracketPromo = document.getElementById("bracket-promo");
        const conferencePreview = document.getElementById("conference-preview");
        const recentGamesSection = document.getElementById("recent-games-section");
        const top25Container = document.querySelector("#top25-panel").parentElement;
        const topPlayersContainer = document.querySelector("#top-players-panel").parentElement;
        
        if (heroSection) heroSection.style.display = "none";
        if (bracketPromo) bracketPromo.style.display = "none";
        if (conferencePreview) conferencePreview.style.display = "none";
        if (recentGamesSection) recentGamesSection.style.display = "none";
        if (top25Container) top25Container.style.display = "none";
        if (topPlayersContainer) topPlayersContainer.style.display = "none";
        
        if (top25Panel) top25Panel.style.display = "none";
        if (topPlayersPanel) topPlayersPanel.style.display = "none";
        renderPlayerPage(
            playerName,
            playerTeam,
            pgStatsContainer,
            conferenceStandingsContainer,
            GlobalState.displayBoxScore,
            renderTeamStats,
            renderConferenceStats
        );
    };

    window.addEventListener("popstate", (event) => {
        const state = event.state || { view: "home" };
        if (state.view === "home") return navigateHome(false, state.scrollPosition || 0);
        if (state.view === "team" && state.team) return navigateTeam(state.team, false);
        if (state.view === "player" && state.player && state.team) return navigatePlayer(state.player, state.team, false);
        if (state.view === "boxscore" && state.gameID && state.gameDate) {
            // Hide home sections
            const heroSection = document.getElementById("hero-section");
            const bracketPromo = document.getElementById("bracket-promo");
            const conferencePreview = document.getElementById("conference-preview");
            const recentGamesSection = document.getElementById("recent-games-section");
            const top25Container = document.querySelector("#top25-panel")?.parentElement;
            const topPlayersContainer = document.querySelector("#top-players-panel")?.parentElement;
            
            if (heroSection) heroSection.style.display = "none";
            if (bracketPromo) bracketPromo.style.display = "none";
            if (conferencePreview) conferencePreview.style.display = "none";
            if (recentGamesSection) recentGamesSection.style.display = "none";
            if (top25Container) top25Container.style.display = "none";
            if (topPlayersContainer) topPlayersContainer.style.display = "none";
            
            if (top25Panel) top25Panel.style.display = "none";
            if (topPlayersPanel) topPlayersPanel.style.display = "none";
            if (pgStatsContainer) pgStatsContainer.style.display = "block";
            if (conferenceStandingsContainer) conferenceStandingsContainer.style.display = "none";
            
            // Pass back context from state if available
            const backContext = state.backContext || {};
            renderBoxScore(state.gameID, state.gameDate, state.teamRanks, backContext);
            return;
        }
        navigateHome(false);
    });

    // initialize history state
    if (!history.state) {
        history.replaceState({ view: "home" }, "", window.location.pathname);
    }

    registerListeners({
        renderTeamStats,
        renderPlayerPage,
        renderConferenceStats,
        navigateTeam,
        navigatePlayer
    });

    // Bracket link handler
    const bracketLink = document.getElementById("bracket-link");
    if (bracketLink) {
        bracketLink.addEventListener("click", async (e) => {
            e.preventDefault();
            
            // Show loading state
            bracketLink.style.opacity = "0.7";
            bracketLink.style.pointerEvents = "none";
            const originalText = bracketLink.textContent;
            bracketLink.textContent = "Updating...";
            
            try {
                // Call the update_bracket endpoint
                await fetch("http://localhost:4000/bracketology/update_bracket");
                // Redirect to bracket page
                window.location.href = "bracket.html";
            } catch (error) {
                console.error("Error updating bracket:", error);
                // Restore original state on error
                bracketLink.textContent = originalText;
                bracketLink.style.opacity = "1";
                bracketLink.style.pointerEvents = "auto";
                alert("Error updating bracket. Please try again.");
            }
        });
    }

    // Rankings navigation handler
    const netRankingsNavItems = document.querySelectorAll('.nav-item');
    netRankingsNavItems.forEach(navItem => {
        if (navItem.textContent.trim() === 'Rankings') {
            navItem.addEventListener('click', async (e) => {
                e.preventDefault();
                currentView = "net-rankings";
                
                // Update active nav item
                document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
                navItem.classList.add('active');
                
                // Hide all home sections
                const heroSection = document.getElementById("hero-section");
                const bracketPromo = document.getElementById("bracket-promo");
                const conferencePreview = document.getElementById("conference-preview");
                const recentGamesSection = document.getElementById("recent-games-section");
                const top25Container = document.querySelector("#top25-panel")?.parentElement;
                const topPlayersContainer = document.querySelector("#top-players-panel")?.parentElement;
                
                if (heroSection) heroSection.style.display = "none";
                if (bracketPromo) bracketPromo.style.display = "none";
                if (conferencePreview) conferencePreview.style.display = "none";
                if (recentGamesSection) recentGamesSection.style.display = "none";
                if (top25Container) top25Container.style.display = "none";
                if (topPlayersContainer) topPlayersContainer.style.display = "none";
                
                pgStatsContainer.style.display = "none";
                conferenceStandingsContainer.style.display = "none";
                
                // Show NET rankings section
                const netRankingsSection = document.getElementById("net-rankings-section");
                if (netRankingsSection) {
                    netRankingsSection.style.display = "block";
                    await renderNETRankings(netRankingsSection);
                }
            });
        }
        
        // Dashboard nav item handler
        if (navItem.textContent.trim() === 'Dashboard') {
            navItem.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Update active nav item
                document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
                navItem.classList.add('active');
                
                navigateHome();
            });
        }
    });

    // Show body and get loading indicator from HTML
    document.body.style.visibility = 'visible';
    const loadingIndicator = document.getElementById('page-loading-overlay');

    // Render top 25 on page load
    const top25Panel = document.getElementById("top25-panel");
    const topPlayersPanel = document.getElementById("top-players-panel");
    const playerStatsPromo = document.getElementById("player-stats-promo");
    const pgStatsContainer = document.getElementById("pg_stats");
    const conferenceStandingsContainer = document.getElementById("conference_standings");
    
    // Ensure per-game stat leaders carousel hides on small screens and shows promo button instead
    const updateCarouselVisibility = () => {
        if (!topPlayersPanel) return; // Guard clause for pages without this element
        const isSmall = window.innerWidth <= 1175;
        const shouldShowCarousel = !isSmall && currentView === "home";
        topPlayersPanel.style.display = shouldShowCarousel ? "block" : "none";
        if (playerStatsPromo) {
            playerStatsPromo.style.display = (isSmall && currentView === "home") ? "block" : "none";
        }
    };
    updateCarouselVisibility();
    window.addEventListener("resize", updateCarouselVisibility);
    
    // Track when both components are ready
    let top25Ready = false;
    let carouselReady = false;

    const checkAllReady = () => {
        if (top25Ready && carouselReady) {
            setTimeout(() => {
                if (loadingIndicator) {
                    loadingIndicator.style.display = "none";
                }
            }, 1000);
        }
    };

    renderTop25(top25Panel, (teamName) => {
        navigateTeam(teamName);
    }).then(() => {
        top25Ready = true;
        checkAllReady();
    }).catch(() => {
        top25Ready = true;
        checkAllReady();
    });

    // Render unified top players carousel with dropdown
    if (topPlayersPanel) {
        topPlayersPanel.innerHTML = "";
    
        const playerStatConfigs = [
            { stat: "pts", label: "PPG", statLabel: "PPG" },
            { stat: "ast", label: "APG", statLabel: "APG" },
            { stat: "orb", label: "ORPG", statLabel: "ORPG" },
            { stat: "drb", label: "DRPG", statLabel: "DRPG" },
            { stat: "trb", label: "RPG", statLabel: "RPG" },
            { stat: "stl", label: "SPG", statLabel: "SPG" },
            { stat: "blk", label: "BPG", statLabel: "BPG" },
            { stat: "fgm", label: "FGM", statLabel: "FGM" },
            { stat: "fga", label: "FGA", statLabel: "FGA" },
            { stat: "fg2m", label: "2PM", statLabel: "2PM" },
            { stat: "fg2a", label: "2PA", statLabel: "2PA" },
            { stat: "fg3m", label: "3PM", statLabel: "3PM" },
            { stat: "fg3a", label: "3PA", statLabel: "3PA" },
            { stat: "ftm", label: "FTM", statLabel: "FTM" },
            { stat: "fta", label: "FTA", statLabel: "FTA" },
            { stat: "fg_pct", label: "FG%", statLabel: "FG%" },
            { stat: "fg3_pct", label: "3P%", statLabel: "3P%" },
            { stat: "ft_pct", label: "FT%", statLabel: "FT%" },
            { stat: "tov", label: "TOPG", statLabel: "TOPG" },
            { stat: "pf", label: "FPG", statLabel: "FPG" },
            { stat: "gmsc", label: "GmSc", statLabel: "GmSc" },
            { stat: "min", label: "MPG", statLabel: "MPG" },
        ];
        
        const teamStatConfigs = [
            { stat: "team_pts", label: "PPG", statLabel: "PPG" },
            { stat: "team_ast", label: "APG", statLabel: "APG" },
            { stat: "team_orb", label: "ORPG", statLabel: "ORPG" },
            { stat: "team_drb", label: "DRPG", statLabel: "DRPG" },
            { stat: "team_trb", label: "RPG", statLabel: "RPG" },
            { stat: "team_stl", label: "SPG", statLabel: "SPG" },
            { stat: "team_blk", label: "BPG", statLabel: "BPG" },
            { stat: "team_fgm", label: "FGM", statLabel: "FGM" },
            { stat: "team_fga", label: "FGA", statLabel: "FGA" },
            { stat: "team_fg2m", label: "2PM", statLabel: "2PM" },
            { stat: "team_fg2a", label: "2PA", statLabel: "2PA" },
            { stat: "team_fg3m", label: "3PM", statLabel: "3PM" },
            { stat: "team_fg3a", label: "3PA", statLabel: "3PA" },
            { stat: "team_ftm", label: "FTM", statLabel: "FTM" },
            { stat: "team_fta", label: "FTA", statLabel: "FTA" },
            { stat: "team_fg_pct", label: "FG%", statLabel: "FG%" },
            { stat: "team_fg3_pct", label: "3P%", statLabel: "3P%" },
            { stat: "team_ft_pct", label: "FT%", statLabel: "FT%" },
            { stat: "team_tov", label: "TOPG", statLabel: "TOPG" },
            { stat: "team_pf", label: "FPG", statLabel: "FPG" },
            { stat: "pts_allowed", label: "PPG Allowed", statLabel: "oPPG" },
            { stat: "ast_allowed", label: "APG Allowed", statLabel: "oAPG" },
            { stat: "orb_allowed", label: "ORPG Allowed", statLabel: "oORPG" },
            { stat: "drb_allowed", label: "DRPG Allowed", statLabel: "oDRPG" },
            { stat: "trb_allowed", label: "RPG Allowed", statLabel: "oRPG" },
            { stat: "stl_allowed", label: "SPG Allowed", statLabel: "oSPG" },
            { stat: "blk_allowed", label: "Shots Blocked", statLabel: "Shots Blocked" },
            { stat: "forced_tov", label: "Forced TOPG", statLabel: "Forced TOPG" },
            { stat: "fgm_allowed", label: "FGM Allowed", statLabel: "oFGM" },
            { stat: "fga_allowed", label: "FGA Allowed", statLabel: "oFGA" },
            { stat: "fg2m_allowed", label: "2PM Allowed", statLabel: "o2PM" },
            { stat: "fg2a_allowed", label: "2PA Allowed", statLabel: "o2PA" },
            { stat: "fg3m_allowed", label: "3PM Allowed", statLabel: "o3PM" },
            { stat: "fg3a_allowed", label: "3PA Allowed", statLabel: "o3PA" },
            { stat: "ftm_allowed", label: "FTM Allowed", statLabel: "oFTM" },
            { stat: "fta_allowed", label: "FTA Allowed", statLabel: "oFTA" },
            { stat: "fg_pct_allowed", label: "FG% Allowed", statLabel: "oFG%" },
            { stat: "fg2_pct_allowed", label: "2P% Allowed", statLabel: "o2P%" },
            { stat: "fg3_pct_allowed", label: "3P% Allowed", statLabel: "o3P%" },
            { stat: "ft_pct_allowed", label: "FT% Allowed", statLabel: "oFT%" },
            { stat: "pf_drawn", label: "FPG Drawn", statLabel: "FPG Drawn" },
        ];

        const onPlayerClick = (playerName, playerTeam) => {
            navigatePlayer(playerName, playerTeam);
        };

        renderTopPlayersUnified(topPlayersPanel, onPlayerClick, playerStatConfigs, teamStatConfigs).then(() => {
            carouselReady = true;
            checkAllReady();
            updateCarouselVisibility();
        }).catch(() => {
            carouselReady = true;
            checkAllReady();
            updateCarouselVisibility();
        });
    } else {
        // If no topPlayersPanel, mark as ready
        carouselReady = true;
        checkAllReady();
    }

    // Initialize new dashboard sections
    renderHeroSection();
    renderConferencePreview();
    renderRecentGames((gameID, gameDate, teamRanks) => {
        // Navigate to box score view with home context
        const scrollPosition = window.scrollY || window.pageYOffset;
        const backContext = { type: "home", scrollPosition };
        history.pushState({ view: "boxscore", gameID, gameDate, teamRanks, backContext }, "", window.location.pathname);
        
        // Hide home sections
        const heroSection = document.getElementById("hero-section");
        const bracketPromo = document.getElementById("bracket-promo");
        const conferencePreview = document.getElementById("conference-preview");
        const recentGamesSection = document.getElementById("recent-games-section");
        const top25Container = document.querySelector("#top25-panel")?.parentElement;
        const topPlayersContainer = document.querySelector("#top-players-panel")?.parentElement;
        
        if (heroSection) heroSection.style.display = "none";
        if (bracketPromo) bracketPromo.style.display = "none";
        if (conferencePreview) conferencePreview.style.display = "none";
        if (recentGamesSection) recentGamesSection.style.display = "none";
        if (top25Container) top25Container.style.display = "none";
        if (topPlayersContainer) topPlayersContainer.style.display = "none";
        
        if (top25Panel) top25Panel.style.display = "none";
        if (topPlayersPanel) topPlayersPanel.style.display = "none";
        if (pgStatsContainer) {
            pgStatsContainer.style.display = "block";
        }
        if (conferenceStandingsContainer) {
            conferenceStandingsContainer.style.display = "none";
        }
        
        // Render box score with home context
        renderBoxScore(gameID, gameDate, teamRanks, backContext);
    });
    
    // Initialize unified search
    initUnifiedSearch({
        navigateTeam,
        navigatePlayer,
        renderConferenceStats
    });
    
    // Bracket promo button
    const promoBracketBtn = document.getElementById("promo-bracket-btn");
    if (promoBracketBtn) {
        promoBracketBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            promoBracketBtn.textContent = "Loading...";
            promoBracketBtn.disabled = true;
            
            try {
                await fetch("http://localhost:4000/bracketology/update_bracket");
                window.location.href = "bracket.html";
            } catch (error) {
                console.error("Error:", error);
                promoBracketBtn.textContent = "View Bracket →";
                promoBracketBtn.disabled = false;
            }
        });
    }

    // Player stats promo button
    const promoPlayerStatsBtn = document.getElementById("promo-player-stats-btn");
    if (promoPlayerStatsBtn) {
        promoPlayerStatsBtn.addEventListener("click", (e) => {
            e.preventDefault();
            // TODO: Navigate to player stats page when it's built
            window.location.href = "player-stats.html";
        });
    }

});
