import { GlobalState } from "../state/globalState.js";

export function registerListeners({
    renderTeamStats,
    renderPlayerPage,
    renderConferenceStats,
    navigateTeam,
    navigatePlayer
}) {
    const PgStats = document.getElementById("pg_stats");
    const conferenceStandings = document.getElementById("conference_standings");

    // Allow box-score component to call displayBoxScore globally
    GlobalState.displayBoxScore = (box, gameID, date, venue, ranks) => {
        import("../components/boxScore/renderBoxScore.js").then(module => {
            module.renderBoxScore(box, gameID, date, venue, ranks);
        });
    };

    // Old dropdowns removed - now using unified search in navbar
    // initTeamDropdown, initPlayerDropdown, initConferenceDropdown are no longer needed
}
