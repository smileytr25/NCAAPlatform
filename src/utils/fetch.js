import { GlobalState } from "../state/globalState.js";

// Base fetch helper
async function getJSON(url) {
    const r = await fetch(url);
    return await r.json();
}

// Generic fetch data export
export async function fetchData(endpoint) {
    const baseUrl = endpoint.startsWith('http') ? '' : 'http://localhost:4000';
    return getJSON(baseUrl + endpoint);
}

// --------------------- TEAM DATA ---------------------
export function fetchTeamPgStats(team) {
    const json = getJSON(`http://localhost:4000/pg_stats/team_pg_stats?team=${encodeURIComponent(team)}`);
    return json;
}

export function fetchTeamImage(team) {
    // If cached and is a string (resolved image), return as a resolved Promise
    if (typeof GlobalState.teamImageCache[team] === "string") {
        return Promise.resolve(GlobalState.teamImageCache[team]);
    }
    // If cached and is a Promise, return the Promise
    if (GlobalState.teamImageCache[team] && typeof GlobalState.teamImageCache[team].then === "function") {
        return GlobalState.teamImageCache[team];
    }
    // Otherwise, fetch and cache the Promise, then cache the resolved image string
    const promise = getJSON(`http://localhost:4000/teams/team_image?team=${encodeURIComponent(team)}`)
        .then(obj => {
            GlobalState.teamImageCache[team] = obj.image;
            return obj.image;
        });
    GlobalState.teamImageCache[team] = promise;
    return promise;
}

export function fetchAllTeams() {
    return getJSON("http://localhost:4000/teams/all_team_names")
        .then(d => d.teams.map(t => t.normalize("NFC")));
}

export function fetchTeamPlayers(team) {
    return getJSON(`http://localhost:4000/players/team_players?team=${encodeURIComponent(team)}`)
        .then(d => d.players.map(p => p.normalize("NFC")));
}

// --------------------- PLAYER DATA ---------------------
export function fetchPlayerStats(player, team) {
    if (team) {
        return getJSON(`http://localhost:4000/pg_stats/player_pg_stats?player=${encodeURIComponent(player)}&team=${encodeURIComponent(team)}`);
    }
    return getJSON(`http://localhost:4000/pg_stats/player_pg_stats?player=${encodeURIComponent(player)}`);
}

export function fetchPlayerPhoto(player, team) {
    const cacheKey = team ? `${player}|${team}` : player;
    if (GlobalState.playerImageCache[cacheKey]) return GlobalState.playerImageCache[cacheKey];
    return getJSON(`http://localhost:4000/players/player_photos?player=${encodeURIComponent(cacheKey)}`)
        .then(obj => GlobalState.playerImageCache[cacheKey] = obj.photo_url);
}

export function fetchAllPlayers() {
    return getJSON("http://localhost:4000/players/all_player_names")
        .then(d => d.players.map(p => p.normalize("NFC")));
}

// --------------------- GAMES ---------------------
export function fetchPastTeamGames(team) {
    return getJSON(`http://localhost:4000/teams/past_team_games?team=${encodeURIComponent(team)}`);
}

export function fetchFutureTeamGames(team, date) {
    return getJSON(`http://localhost:4000/teams/future_team_games?team=${encodeURIComponent(team)}&date=${date}`);
}

export function fetchBoxScore(gameID) {
    return getJSON(`http://localhost:4000/games/box_score?gameID=${encodeURIComponent(gameID)}`);
}

// --------------------- CONFERENCES ---------------------
export function fetchAllConferences() {
    return getJSON("http://localhost:4000/conferences/all_conference_names")
        .then(d => d.conferences.map(c => c.normalize("NFC")));
}

export function fetchConferenceStandings(conf) {
    return getJSON(`http://localhost:4000/standings/conference_standings?conference=${encodeURIComponent(conf)}`);
}

export function fetchTop25() {
    return getJSON("http://localhost:4000/rankings/top_25");
}

// --------------------- RANKINGS ---------------------
export function fetchNationalPlayerRank(stat, player) {
    return getJSON(`http://localhost:4000/pg_stats/national_player_pg_rank?stat=${encodeURIComponent(stat)}&player=${encodeURIComponent(player)}`);
}

export function fetchConferencePlayerRank(stat, player, conference) {
    return getJSON(`http://localhost:4000/pg_stats/conference_player_pg_rank?stat=${encodeURIComponent(stat)}&player=${encodeURIComponent(player)}&conference=${encodeURIComponent(conference)}`);
}

export function fetchTeamPlayerRank(stat, player, team) {
    return getJSON(`http://localhost:4000/pg_stats/team_player_pg_rank?stat=${encodeURIComponent(stat)}&player=${encodeURIComponent(player)}&team=${encodeURIComponent(team)}`);
}

