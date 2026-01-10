import { fetchAllPlayers, fetchPlayerStats } from "../utils/fetch.js";
import { GlobalState } from "../state/globalState.js";

export function initPlayerDropdown({
    renderPlayerPage,
    renderTeamStats,
    renderConferenceStats,
    PgStats,
    conferenceStandings,
    navigatePlayer
}) {
    const playerSelect = document.getElementById("player-select");
    const playerOptions = document.getElementById("player-options");

    let allPlayers = [];
    let filteredPlayers = [];

    // ---------- LOAD ALL PLAYERS ----------
    fetchAllPlayers().then(players => {
        allPlayers = players.sort((a,b) => a.localeCompare(b));
        filteredPlayers = allPlayers;
        updateOptions(allPlayers);
    });

    // ---------- UPDATE OPTIONS ----------
    function updateOptions(players) {
        playerOptions.innerHTML = "";
        players.forEach(player => {
            const opt = document.createElement("div");
            opt.className = "dropdown-option";
            // Parse composite key to display player name with team
            const [playerName, teamName] = player.split("|");
            opt.textContent = `${playerName} (${teamName})`;
            // Store the full composite key as data attribute
            opt.dataset.value = player;

            opt.addEventListener("click", async () => {
                const compositeKey = opt.dataset.value;
                const [playerName, teamName] = compositeKey.split("|");
                // Only show player name in input, not the team
                playerSelect.value = playerName;
                playerOptions.classList.remove("active");
                playerOptions.innerHTML = "";

                GlobalState.selectedPlayer = playerName;

                if (navigatePlayer) {
                    navigatePlayer(playerName, teamName);
                } else {
                    renderPlayerPage(playerName, teamName, PgStats, conferenceStandings, GlobalState.displayBoxScore, renderTeamStats, renderConferenceStats);
                }
            });

            playerOptions.appendChild(opt);
        });
    }

    // ---------- FILTER INPUT ----------
    playerSelect.addEventListener("input", () => {
        const search = playerSelect.value.toLowerCase();
        const source = GlobalState.filteredPlayersByTeam?.length
            ? GlobalState.filteredPlayersByTeam
            : allPlayers;

        filteredPlayers = search
            ? source.filter(p => p.toLowerCase().includes(search))
            : source;

        updateOptions(filteredPlayers);
        if (filteredPlayers.length) playerOptions.classList.add("active");
    });

    // ---------- OPEN ON FOCUS ----------
    playerSelect.addEventListener("focus", () => {
        const source = GlobalState.filteredPlayersByTeam?.length
            ? GlobalState.filteredPlayersByTeam
            : allPlayers;

        updateOptions(source);
        playerOptions.classList.add("active");
    });

    // ---------- CLOSE ON BLUR ----------
    playerSelect.addEventListener("blur", () => {
        setTimeout(() => playerOptions.classList.remove("active"), 200);
    });
}
