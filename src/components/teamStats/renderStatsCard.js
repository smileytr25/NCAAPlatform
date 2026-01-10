import { createEl, append } from "../../utils/dom.js";

export function renderStatsCard(pgStatsData) {
    const card = createEl("div", {
        width: "320px",
        background: "#FFFFFF",
        padding: "24px",
        borderRadius: "8px",
        border: "1px solid #E8E8E8",
        boxShadow: "0 4px 12px rgba(0, 32, 91, 0.12)",
        overflow : "hidden",
        maxHeight: "858px",
        display: "flex",
        flexDirection: "column"
    });

    const scrollArea = createEl("div", {
        overflowY: "auto",
        maxHeight: "858px",
        scrollbarWidth: "none",
        msOverflowStyle: "none"
    });

    const title = createEl("div", {
        fontSize: "16px",
        fontWeight: "700",
        marginBottom: "20px",
        borderBottom: "3px solid #BA0C2F",
        paddingBottom: "12px",
        color: "#00205B",
        textTransform: "uppercase",
        letterSpacing: "0.5px"
    });

    title.textContent = "Team Stats";

    const grid = createEl("div", {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "16px"
    });

    for (const [key, val] of pgStatsData) {
        if (["Team", "Conference", "W", "L"].includes(key)) continue;

        const box = createEl("div", { display: "flex", flexDirection: "column", gap: "4px" });

        const num = createEl("div", { 
            fontSize: "20px", 
            fontWeight: "800",
            color: "#222222"
        });
        num.textContent = typeof val === "number" ? val.toFixed(2) : val;

        const label = createEl("div", {
            fontSize: "10px",
            fontWeight: "700",
            color: "#666666",
            textTransform: "uppercase"
        });
        label.textContent = key;

        append(box, num, label);
        grid.appendChild(box);
    }

    append(scrollArea, grid);
    append(card, title, scrollArea);
    return card;
}
