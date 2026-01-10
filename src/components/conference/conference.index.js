import { renderConferenceTable } from "./renderConferenceTable.js";
import { showLoadingOverlay, hideLoadingOverlay } from "../../utils/loading.js";
export function renderConferenceStats(conference, PgStats, standings, onTeamClick) {
    const loadingOverlay = showLoadingOverlay("Loading conference standings...");
    renderConferenceTable(conference, PgStats, standings, onTeamClick);
    hideLoadingOverlay();
}
