import { statColorMap } from "../../utils/statColors.js";
import { createEl, append } from "../../utils/dom.js";

export function renderPlayerStatGrid(pgStats) {

    const card = createEl("div", {
        background: "#FFFFFF",
        borderRadius: "8px",
        padding: "24px",
        boxShadow: "0 4px 12px rgba(0, 32, 91, 0.12)",
        border: "1px solid #E8E8E8"
    });

    const title = createEl("div", {
        fontSize: "16px",
        fontWeight: "700",
        color: "#00205B",
        marginBottom: "20px",
        paddingBottom: "12px",
        borderBottom: "3px solid #BA0C2F",
        textTransform: "uppercase",
        letterSpacing: "0.5px"
    });
    title.textContent = "Player Stats";
    card.appendChild(title);

    const grid = createEl("div", {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "16px"
    });

    for (const [k,v] of pgStats) {
        if (["Player","Team","Conference"].includes(k)) continue;

        const box = createEl("div", {
            display: "flex",
            flexDirection: "column",
            gap: "4px"
        });

        const val = createEl("div", {
            fontSize: "20px",
            fontWeight: "800",
            color: "#00205B"
        });
        val.textContent = typeof v === "number" ? v.toFixed(2) : v;

        const label = createEl("div", {
            fontSize: "10px",
            fontWeight: "700",
            color: "#666666",
            textTransform: "uppercase",
            letterSpacing: "0.5px"
        });
        label.textContent = k;

        append(box, val, label);
        grid.appendChild(box);
    }

    append(card, grid);
    return card;
}
