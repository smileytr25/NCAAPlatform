import { renderConferenceTable } from "./renderConferenceTable.js";
import { showLoadingOverlay } from "../../utils/loading.js";
export async function renderConferenceStats(conference, PgStats, standings, onTeamClick) {
    const loadingOverlay = showLoadingOverlay("Loading conference standings...");
    try {
        console.log("Starting conference stats render for:", conference);
        await renderConferenceTable(conference, PgStats, standings, onTeamClick);
        console.log("Conference stats render completed");
    } catch (err) {
        console.error("Error rendering conference standings:", err);
        console.error("Stack trace:", err.stack);
    } finally {
        console.log("Hiding loading overlay");
        if (loadingOverlay && loadingOverlay.parentNode) {
            loadingOverlay.remove();
        }
    }
}
