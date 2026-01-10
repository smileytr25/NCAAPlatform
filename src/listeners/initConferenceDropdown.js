import { fetchAllConferences, fetchConferenceStandings } from "../utils/fetch.js";
import { GlobalState } from "../state/globalState.js";

export function initConferenceDropdown({
    renderConferenceStats,
    PgStats,
    conferenceStandings,
    renderTeamStats
}) {
    const confSelect = document.getElementById("conference-select");
    const confOptions = document.getElementById("conference-options");

    let allConfs = [];
    let filteredConfs = [];

    // ---------- LOAD ALL CONFERENCES ----------
    fetchAllConferences().then(confs => {
        allConfs = confs.sort((a,b) => a.localeCompare(b));
        filteredConfs = allConfs;
        updateConferenceOptions(allConfs);
    });

    function updateConferenceOptions(list) {
        confOptions.innerHTML = "";
        list.forEach(conf => {
            const opt = document.createElement("div");
            opt.className = "dropdown-option";
            opt.textContent = conf;

            opt.addEventListener("click", async () => {
                confSelect.value = conf;
                confOptions.classList.remove("active");
                confOptions.innerHTML = "";

                // Hide top 25 panel and carousel when viewing conference
                const top25Panel = document.getElementById("top25-panel");
                if (top25Panel) top25Panel.style.display = "none";
                
                const topPlayersPanel = document.getElementById("top-players-panel");
                if (topPlayersPanel) topPlayersPanel.style.display = "none";

                GlobalState.selectedConference = conf;

                renderConferenceStats(
                    conf,
                    PgStats,
                    conferenceStandings,
                    (teamName) => {
                        confSelect.value = conf;
                        renderTeamStats(teamName, PgStats, conferenceStandings, GlobalState.displayBoxScore, renderConferenceStats);
                    }
                );
            });

            confOptions.appendChild(opt);
        });
    }

    // ---------- FILTER ----------
    confSelect.addEventListener("input", () => {
        const search = confSelect.value.toLowerCase();
        filteredConfs = search
            ? allConfs.filter(c => c.toLowerCase().includes(search))
            : allConfs;

        updateConferenceOptions(filteredConfs);
        confOptions.classList.add("active");
    });

    // ---------- OPEN ON FOCUS ----------
    confSelect.addEventListener("focus", () => {
        updateConferenceOptions(filteredConfs);
        confOptions.classList.add("active");
    });

    // ---------- CLOSE ON BLUR ----------
    confSelect.addEventListener("blur", () => {
        setTimeout(() => confOptions.classList.remove("active"), 200);
    });
}
