import { createEl } from "../../utils/dom.js";

/**
 * Create a thermometer-style forecast display showing percentile predictions
 * @param {Object} team1Prediction - Prediction data for team 1
 * @param {Object} team2Prediction - Prediction data for team 2
 * @param {string} team1Name - Team 1 name
 * @param {string} team2Name - Team 2 name
 * @returns {HTMLElement} The thermometer forecast component
 */
export function renderGamePredictionThermometer(team1Prediction, team2Prediction, team1Name, team2Name) {
    const container = createEl("div");
    container.className = "game-forecast-container";
    
    // Title
    const title = createEl("div");
    title.className = "game-forecast-title";
    title.textContent = "Projected Score Ranges";
    container.appendChild(title);
    
    // Team 1 Thermometer
    const team1Thermo = createTeamThermometer(team1Prediction, team1Name, "#00205B");
    container.appendChild(team1Thermo);
    
    // Team 2 Thermometer
    const team2Thermo = createTeamThermometer(team2Prediction, team2Name, "#BA0C2F");
    container.appendChild(team2Thermo);
    
    return container;
}

/**
 * Create a thermometer display with actual results for completed games
 * @param {Object} team1Prediction - Prediction data for team 1
 * @param {Object} team2Prediction - Prediction data for team 2
 * @param {string} team1Name - Team 1 name
 * @param {string} team2Name - Team 2 name
 * @param {number} team1ActualScore - Actual score for team 1
 * @param {number} team2ActualScore - Actual score for team 2
 * @returns {HTMLElement} The thermometer forecast component with results
 */
export function renderGamePredictionThermometerWithResults(
    team1Prediction,
    team2Prediction,
    team1Name,
    team2Name,
    team1ActualScore,
    team2ActualScore
) {

    console.log(team1Prediction, team2Prediction, team1Name, team2Name, team1ActualScore, team2ActualScore);
    const container = createEl("div");
    container.className = "game-forecast-container";
    
    // Title
    const title = createEl("div");
    title.className = "game-forecast-title";
    title.textContent = "Projected Score Ranges vs Actual Results";
    container.appendChild(title);
    
    // Team 1 Thermometer with result
    const team1Thermo = createTeamThermometerWithResult(
        team1Prediction,
        team1Name,
        "#00205B",
        team1ActualScore
    );
    container.appendChild(team1Thermo);
    
    // Team 2 Thermometer with result
    const team2Thermo = createTeamThermometerWithResult(
        team2Prediction,
        team2Name,
        "#BA0C2F",
        team2ActualScore
    );
    container.appendChild(team2Thermo);
    
    // Add performance summary
    const summary = createPerformanceSummary(
        team1Name,
        team1Prediction,
        team1ActualScore,
        team2Name,
        team2Prediction,
        team2ActualScore
    );
    container.appendChild(summary);
    
    return container;
}

/**
 * Create a performance summary comparing results to predictions
 */
function createPerformanceSummary(team1Name, team1Pred, team1Score, team2Name, team2Pred, team2Score) {
    team1Pred = team1Pred[team1Name];
    team2Pred = team2Pred[team2Name];
    
    const wrapper = createEl("div", {
        marginTop: "20px",
        padding: "16px",
        background: "#F8F9FA",
        borderRadius: "8px",
        border: "1px solid #E8E8E8"
    });
    
    const summaryTitle = createEl("div", {
        fontSize: "14px",
        fontWeight: "700",
        color: "#222222",
        marginBottom: "12px"
    });
    summaryTitle.textContent = "Performance Analysis";
    wrapper.appendChild(summaryTitle);
    
    // Game outcome comparison
    const outcomeComparison = createEl("div", {
        padding: "12px",
        background: "#FFFFFF",
        borderRadius: "6px",
        border: "1px solid #E8E8E8",
        marginBottom: "12px"
    });
    
    const outcomeTitle = createEl("div", {
        fontSize: "13px",
        fontWeight: "700",
        color: "#222222",
        marginBottom: "8px"
    });
    outcomeTitle.textContent = "Game Outcome";
    outcomeComparison.appendChild(outcomeTitle);
    
    const outcomeGrid = createEl("div", {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "12px"
    });
    
    // Predicted winner and spread
    const predictedMedian1 = team1Pred.median_pts;
    const predictedMedian2 = team2Pred.median_pts;
    const predictedSpread = Math.abs(predictedMedian1 - predictedMedian2);
    const predictedWinner = predictedMedian1 > predictedMedian2 ? team1Name : team2Name;
    
    const predictedBox = createEl("div", {
        padding: "8px",
        background: "#F0F7FF",
        borderRadius: "4px",
        border: "1px solid #00205B20"
    });
    
    const predictedLabel = createEl("div", {
        fontSize: "11px",
        color: "#666666",
        marginBottom: "4px",
        fontWeight: "600",
        textTransform: "uppercase"
    });
    predictedLabel.textContent = "Predicted";
    predictedBox.appendChild(predictedLabel);
    
    const predictedWinnerText = createEl("div", {
        fontSize: "13px",
        color: "#00205B",
        fontWeight: "700"
    });
    predictedWinnerText.textContent = predictedWinner;
    predictedBox.appendChild(predictedWinnerText);
    
    const predictedSpreadText = createEl("div", {
        fontSize: "12px",
        color: "#666666",
        marginTop: "2px"
    });
    predictedSpreadText.textContent = `by ${predictedSpread.toFixed(1)} pts`;
    predictedBox.appendChild(predictedSpreadText);
    
    outcomeGrid.appendChild(predictedBox);
    
    // Actual winner and spread
    const actualSpread = Math.abs(team1Score - team2Score);
    const actualWinner = team1Score > team2Score ? team1Name : team2Name;
    const correctPrediction = predictedWinner === actualWinner;
    
    const actualBox = createEl("div", {
        padding: "8px",
        background: correctPrediction ? "#F0FFF4" : "#FFF5F5",
        borderRadius: "4px",
        border: correctPrediction ? "1px solid #28A74520" : "1px solid #DC354520"
    });
    
    const actualLabel = createEl("div", {
        fontSize: "11px",
        color: "#666666",
        marginBottom: "4px",
        fontWeight: "600",
        textTransform: "uppercase"
    });
    actualLabel.textContent = "Actual";
    actualBox.appendChild(actualLabel);
    
    const actualWinnerText = createEl("div", {
        fontSize: "13px",
        color: correctPrediction ? "#28A745" : "#DC3545",
        fontWeight: "700"
    });
    actualWinnerText.textContent = actualWinner;
    actualBox.appendChild(actualWinnerText);
    
    const actualSpreadText = createEl("div", {
        fontSize: "12px",
        color: "#666666",
        marginTop: "2px"
    });
    actualSpreadText.textContent = `by ${actualSpread.toFixed(1)} pts`;
    actualBox.appendChild(actualSpreadText);
    
    outcomeGrid.appendChild(actualBox);
    outcomeComparison.appendChild(outcomeGrid);
    
    // Prediction accuracy note
    const accuracyNote = createEl("div", {
        fontSize: "11px",
        color: correctPrediction ? "#28A745" : "#DC3545",
        marginTop: "8px",
        fontWeight: "600",
        textAlign: "center"
    });
    if (correctPrediction) {
        const spreadDiff = Math.abs(actualSpread - predictedSpread);
        accuracyNote.textContent = `✓ Predicted winner correctly (spread off by ${spreadDiff.toFixed(1)} pts)`;
    } else {
        accuracyNote.textContent = `✗ Predicted winner incorrectly`;
    }
    outcomeComparison.appendChild(accuracyNote);
    
    wrapper.appendChild(outcomeComparison);
    
    const analysisGrid = createEl("div", {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "12px"
    });
    
    // Team 1 analysis
    const team1Analysis = createEl("div", {
        padding: "12px",
        background: "#FFFFFF",
        borderRadius: "6px",
        border: "1px solid #E8E8E8"
    });
    
    const team1Title = createEl("div", {
        fontSize: "13px",
        fontWeight: "700",
        color: "#00205B",
        marginBottom: "6px"
    });
    team1Title.textContent = team1Name;
    team1Analysis.appendChild(team1Title);
    
    const team1Diff = team1Score - team1Pred.median_pts;
    const team1Text = createEl("div", {
        fontSize: "12px",
        color: "#666666"
    });
    
    if (team1Diff > 0) {
        team1Text.innerHTML = `Scored <strong style="color: #28A745;">+${team1Diff.toFixed(1)}</strong> above median projection`;
    } else if (team1Diff < 0) {
        team1Text.innerHTML = `Scored <strong style="color: #DC3545;">${team1Diff.toFixed(1)}</strong> below median projection`;
    } else {
        team1Text.innerHTML = `Scored <strong>exactly</strong> the median projection`;
    }
    team1Analysis.appendChild(team1Text);
    
    // Percentile
    let team1Percentile = "";
    if (team1Score < team1Pred.q10) team1Percentile = "below 10th percentile (unexpected underperformance)";
    else if (team1Score < team1Pred.q25) team1Percentile = "10th-25th percentile (below expectations)";
    else if (team1Score < team1Pred.median_pts) team1Percentile = "25th-50th percentile (slightly below expectations)";
    else if (team1Score < team1Pred.q75) team1Percentile = "50th-75th percentile (slightly above expectations)";
    else if (team1Score < team1Pred.q90) team1Percentile = "75th-90th percentile (above expectations)";
    else team1Percentile = "above 90th percentile (exceptional performance)";
    
    const team1PercentileText = createEl("div", {
        fontSize: "11px",
        color: "#888888",
        marginTop: "4px",
        fontStyle: "italic"
    });
    team1PercentileText.textContent = team1Percentile;
    team1Analysis.appendChild(team1PercentileText);
    
    analysisGrid.appendChild(team1Analysis);
    
    // Team 2 analysis
    const team2Analysis = createEl("div", {
        padding: "12px",
        background: "#FFFFFF",
        borderRadius: "6px",
        border: "1px solid #E8E8E8"
    });
    
    const team2Title = createEl("div", {
        fontSize: "13px",
        fontWeight: "700",
        color: "#BA0C2F",
        marginBottom: "6px"
    });
    team2Title.textContent = team2Name;
    team2Analysis.appendChild(team2Title);
    
    const team2Diff = team2Score - team2Pred.median_pts;
    const team2Text = createEl("div", {
        fontSize: "12px",
        color: "#666666"
    });
    
    if (team2Diff > 0) {
        team2Text.innerHTML = `Scored <strong style="color: #28A745;">+${team2Diff.toFixed(1)}</strong> above median projection`;
    } else if (team2Diff < 0) {
        team2Text.innerHTML = `Scored <strong style="color: #DC3545;">${team2Diff.toFixed(1)}</strong> below median projection`;
    } else {
        team2Text.innerHTML = `Scored <strong>exactly</strong> the median projection`;
    }
    team2Analysis.appendChild(team2Text);
    
    // Percentile
    let team2Percentile = "";
    if (team2Score < team2Pred.q10) team2Percentile = "below 10th percentile (unexpected underperformance)";
    else if (team2Score < team2Pred.q25) team2Percentile = "10th-25th percentile (below expectations)";
    else if (team2Score < team2Pred.median_pts) team2Percentile = "25th-50th percentile (slightly below expectations)";
    else if (team2Score < team2Pred.q75) team2Percentile = "50th-75th percentile (slightly above expectations)";
    else if (team2Score < team2Pred.q90) team2Percentile = "75th-90th percentile (above expectations)";
    else team2Percentile = "above 90th percentile (exceptional performance)";
    
    const team2PercentileText = createEl("div", {
        fontSize: "11px",
        color: "#888888",
        marginTop: "4px",
        fontStyle: "italic"
    });
    team2PercentileText.textContent = team2Percentile;
    team2Analysis.appendChild(team2PercentileText);
    
    analysisGrid.appendChild(team2Analysis);
    
    wrapper.appendChild(analysisGrid);
    return wrapper;
}

/**
 * Create a thermometer display for a single team
 * @param {Object} prediction - Prediction data with q10, q25, median_pts, q75, q90
 * @param {string} teamName - Team name
 * @param {string} color - Color for the thermometer
 * @returns {HTMLElement} The team thermometer element
 */
function createTeamThermometer(prediction, teamName, color) {
    const wrapper = createEl("div");
    wrapper.className = "team-thermometer-wrapper";
    
    // Team label
    const label = createEl("div");
    label.className = "thermometer-team-label";
    label.textContent = teamName;
    wrapper.appendChild(label);
    
    // Use fixed scale for all thermometers
    const minVal = 40;
    const maxVal = 110;
    const range = maxVal - minVal;
    
    // Thermometer container
    const thermoContainer = createEl("div");
    thermoContainer.className = "thermometer-container";
    
    // Background track
    const track = createEl("div");
    track.className = "thermometer-track";
    
    // 90% range markers (q5 and q95) - simple vertical lines at the ends
    const q5Marker = createEl("div");
    q5Marker.className = "thermometer-marker";
    const q5Left = ((prediction.q5 - minVal) / range) * 100;
    q5Marker.style.left = `${q5Left}%`;
    q5Marker.style.background = color;
    track.appendChild(q5Marker);
    
    const q95Marker = createEl("div");
    q95Marker.className = "thermometer-marker";
    const q95Left = ((prediction.q95 - minVal) / range) * 100;
    q95Marker.style.left = `${q95Left}%`;
    q95Marker.style.background = color;
    track.appendChild(q95Marker);
    
    // 80% range (q10 to q90) - light color
    const range80 = createEl("div");
    range80.className = "thermometer-range thermometer-range-80";
    const range80Left = ((prediction.q10 - minVal) / range) * 100;
    const range80Width = ((prediction.q90 - prediction.q10) / range) * 100;
    range80.style.left = `${range80Left}%`;
    range80.style.width = `${range80Width}%`;
    range80.style.background = `${color}40`;
    track.appendChild(range80);
    
    // 50% range (q25 to q75) - medium color
    const range50 = createEl("div");
    range50.className = "thermometer-range thermometer-range-50";
    const range50Left = ((prediction.q25 - minVal) / range) * 100;
    const range50Width = ((prediction.q75 - prediction.q25) / range) * 100;
    range50.style.left = `${range50Left}%`;
    range50.style.width = `${range50Width}%`;
    range50.style.background = `${color}60`;
    track.appendChild(range50);
    
    // Median line (50th percentile)
    const medianLine = createEl("div");
    medianLine.className = "thermometer-median";
    const medianLeft = ((prediction.median_pts - minVal) / range) * 100;
    medianLine.style.left = `${medianLeft}%`;
    medianLine.style.background = color;
    track.appendChild(medianLine);
    
    // Median value label (positioned below)
    const medianLabel = createEl("div");
    medianLabel.className = "thermometer-median-label";
    medianLabel.textContent = Math.round(prediction.median_pts);
    medianLabel.style.left = `${medianLeft}%`;
    medianLabel.style.color = color;
    medianLabel.style.top = "auto";
    medianLabel.style.bottom = "-22px";
    track.appendChild(medianLabel);
    
    thermoContainer.appendChild(track);
    wrapper.appendChild(thermoContainer);
    
    // Percentile legend
    const legend = createEl("div");
    legend.className = "thermometer-legend";
    legend.innerHTML = `
        <span class="legend-item">
            <span class="legend-marker-box" style="background: ${color};"></span>
            90% Range (${Math.round(prediction.q5)}-${Math.round(prediction.q95)})
        </span>
        <span class="legend-item">
            <span class="legend-box" style="background: ${color}40;"></span>
            80% Range (${Math.round(prediction.q10)}-${Math.round(prediction.q90)})
        </span>
        <span class="legend-item">
            <span class="legend-box" style="background: ${color}60;"></span>
            50% Range (${Math.round(prediction.q25)}-${Math.round(prediction.q75)})
        </span>
    `;
    wrapper.appendChild(legend);
    
    return wrapper;
}

/**
 * Create a thermometer display for a single team with actual result marker
 * @param {Object} prediction - Prediction data with q10, q25, median_pts, q75, q90
 * @param {string} teamName - Team name
 * @param {string} color - Color for the thermometer
 * @param {number} actualScore - The actual score achieved
 * @returns {HTMLElement} The team thermometer element with result
 */
function createTeamThermometerWithResult(prediction, teamName, color, actualScore) {
    const wrapper = createEl("div");
    wrapper.className = "team-thermometer-wrapper";
    
    const teamPrediction = prediction[teamName];

    // Team label
    const label = createEl("div");
    label.className = "thermometer-team-label";
    label.textContent = teamName;
    wrapper.appendChild(label);
    
    // Use fixed scale for all thermometers
    const minVal = 40;
    const maxVal = 110;
    const range = maxVal - minVal;
    
    // Thermometer container
    const thermoContainer = createEl("div");
    thermoContainer.className = "thermometer-container";
    
    // Background track
    const track = createEl("div");
    track.className = "thermometer-track";
    
    // 90% range markers (q5 and q95) - simple vertical lines at the ends
    const q5Marker = createEl("div");
    q5Marker.className = "thermometer-marker";
    const q5Left = ((teamPrediction.q5 - minVal) / range) * 100;

    q5Marker.style.left = `${q5Left}%`;
    q5Marker.style.background = color;
    track.appendChild(q5Marker);
    
    const q95Marker = createEl("div");
    q95Marker.className = "thermometer-marker";
    const q95Left = ((teamPrediction.q95 - minVal) / range) * 100;

    q95Marker.style.left = `${q95Left}%`;
    q95Marker.style.background = color;
    track.appendChild(q95Marker);
    
    // 80% range (q10 to q90) - light color
    const range80 = createEl("div");
    range80.className = "thermometer-range thermometer-range-80";
    const range80Left = ((teamPrediction.q10 - minVal) / range) * 100;
    const range80Width = ((teamPrediction.q90 - teamPrediction.q10) / range) * 100;
    range80.style.left = `${range80Left}%`;
    range80.style.width = `${range80Width}%`;
    range80.style.background = `${color}40`;
    track.appendChild(range80);
    
    // 50% range (q25 to q75) - medium color
    const range50 = createEl("div");
    range50.className = "thermometer-range thermometer-range-50";
    const range50Left = ((teamPrediction.q25 - minVal) / range) * 100;
    const range50Width = ((teamPrediction.q75 - teamPrediction.q25) / range) * 100;
    range50.style.left = `${range50Left}%`;
    range50.style.width = `${range50Width}%`;
    range50.style.background = `${color}60`;
    track.appendChild(range50);
    
    // Median line (50th percentile)
    const medianLine = createEl("div");
    medianLine.className = "thermometer-median";
    const medianLeft = ((teamPrediction.median_pts - minVal) / range) * 100;
    medianLine.style.left = `${medianLeft}%`;
    medianLine.style.background = color;
    track.appendChild(medianLine);
    
    // Median value label (positioned below)
    const medianLabel = createEl("div");
    medianLabel.className = "thermometer-median-label";
    medianLabel.textContent = Math.round(teamPrediction.median_pts);
    medianLabel.style.left = `${medianLeft}%`;
    medianLabel.style.color = color;
    medianLabel.style.top = "auto";
    medianLabel.style.bottom = "-22px";
    track.appendChild(medianLabel);
    
    // Actual result marker - prominent star or diamond shape
    const actualMarker = createEl("div");
    actualMarker.className = "thermometer-actual-result";
    const actualLeft = Math.max(0, Math.min(100, ((actualScore - minVal) / range) * 100));
    actualMarker.style.left = `${actualLeft}%`;
    actualMarker.style.background = "#FFD700"; // Gold color
    actualMarker.style.border = "3px solid #222222";
    actualMarker.style.width = "16px";
    actualMarker.style.height = "16px";
    actualMarker.style.borderRadius = "50%";
    actualMarker.style.position = "absolute";
    actualMarker.style.top = "50%";
    actualMarker.style.transform = "translate(-50%, -50%)";
    actualMarker.style.zIndex = "20";
    actualMarker.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.3)";
    track.appendChild(actualMarker);
    
    // Actual result label (positioned above)
    const actualLabel = createEl("div");
    actualLabel.className = "thermometer-actual-label";
    actualLabel.textContent = `${Math.round(actualScore)} (Actual)`;
    actualLabel.style.left = `${actualLeft}%`;
    actualLabel.style.position = "absolute";
    actualLabel.style.top = "-32px";
    actualLabel.style.transform = "translateX(-50%)";
    actualLabel.style.fontSize = "12px";
    actualLabel.style.fontWeight = "700";
    actualLabel.style.color = "#222222";
    actualLabel.style.background = "#FFD700";
    actualLabel.style.padding = "4px 8px";
    actualLabel.style.borderRadius = "4px";
    actualLabel.style.whiteSpace = "nowrap";
    actualLabel.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.15)";
    actualLabel.style.zIndex = "20";
    track.appendChild(actualLabel);
    
    thermoContainer.appendChild(track);
    wrapper.appendChild(thermoContainer);
    
    // Percentile legend with actual result indicator
    const legend = createEl("div");
    legend.className = "thermometer-legend";
    legend.innerHTML = `
        <span class="legend-item">
            <span class="legend-marker-box" style="background: ${color};"></span>
            90% Range (${Math.round(teamPrediction.q5)}-${Math.round(teamPrediction.q95)})
        </span>
        <span class="legend-item">
            <span class="legend-box" style="background: ${color}40;"></span>
            80% Range (${Math.round(teamPrediction.q10)}-${Math.round(teamPrediction.q90)})
        </span>
        <span class="legend-item">
            <span class="legend-box" style="background: ${color}60;"></span>
            50% Range (${Math.round(teamPrediction.q25)}-${Math.round(teamPrediction.q75)})
        </span>
        <span class="legend-item">
            <span style="display: inline-block; width: 12px; height: 12px; background: #FFD700; border: 2px solid #222; border-radius: 50%; vertical-align: middle;"></span>
            Actual Result
        </span>
    `;
    wrapper.appendChild(legend);
    
    return wrapper;
}
