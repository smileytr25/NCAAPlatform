import { fetchAllTeams, fetchTeamPlayers } from "../utils/fetch.js";
import { GlobalState } from "../state/globalState.js";

export function initTeamDropdown({
    renderTeamStats,
    renderConferenceStats,
    PgStats,
    conferenceStandings,
    navigateTeam
}) {
    const teamSelect = document.getElementById("team-select");
    const teamOptions = document.getElementById("team-options");

    let allTeams = [];
    let filteredTeams = [];

    // ---------- LOAD ALL TEAMS ----------
    fetchAllTeams().then(teams => {
        allTeams = teams.sort((a,b) => a.localeCompare(b));
        filteredTeams = allTeams;
        updateTeamOptions(allTeams);
    });

    // ---------- RENDER DROPDOWN OPTIONS ----------
    function updateTeamOptions(teams) {
        teamOptions.innerHTML = "";
        teams.forEach(team => {
            const opt = document.createElement("div");
            opt.className = "dropdown-option";
            opt.textContent = team;

            opt.addEventListener("click", async () => {
                teamSelect.value = team;
                teamOptions.classList.remove("active");
                teamOptions.innerHTML = "";

                GlobalState.selectedTeam = team;

                // Reset player dropdown state
                GlobalState.selectedPlayer = null;

                // Load team players
                const players = await fetchTeamPlayers(team);
                GlobalState.filteredPlayersByTeam = players;

                if (navigateTeam) {
                    navigateTeam(team);
                } else {
                    renderTeamStats(team, PgStats, conferenceStandings, GlobalState.displayBoxScore, renderConferenceStats);
                }
            });

            teamOptions.appendChild(opt);
        });
    }

    // ---------- FILTER INPUT ----------
    teamSelect.addEventListener("input", () => {
        const search = teamSelect.value.toLowerCase();

        filteredTeams = search
            ? allTeams.filter(t => t.toLowerCase().includes(search))
            : allTeams;

        updateTeamOptions(filteredTeams);
        teamOptions.classList.add("active");
    });

    // ---------- OPEN ON FOCUS ----------
    teamSelect.addEventListener("focus", () => {
        updateTeamOptions(filteredTeams);
        teamOptions.classList.add("active");
    });

    // ---------- CLOSE ON BLUR ----------
    teamSelect.addEventListener("blur", () => {
        setTimeout(() => teamOptions.classList.remove("active"), 200);
    });
}
