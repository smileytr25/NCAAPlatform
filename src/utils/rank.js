import { fetchTeamPgStats, fetchConferenceStandings } from "./fetch.js";
import { GlobalState } from "../state/globalState.js";

export async function getTeamRank(team) {
    const pg = await fetchTeamPgStats(team);

    let conf = "Unknown";
    for (const [k,v] of pg) {
        if (k === "team_conference") conf = v;
    }
    // Cache standings per conference
    if (!GlobalState.standingsCache[conf]) {
        GlobalState.standingsCache[conf] = await fetchConferenceStandings(conf);
    }

    console.log(GlobalState.standingsCache[conf]);

    for (const row of GlobalState.standingsCache[conf]) {
        if (row.Team === team && row.rank !== "NR") {
            return row.rank;
        }
    }

    return null;
}

