export function SmallRankBadge() {
    const b = document.createElement("div");
    Object.assign(b.style, {
        position: "absolute",
        top: "-8px",
        right: "-8px",
        width: "22px",
        height: "22px",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "10px",
        fontWeight: "700",
        background: "#00205B",
        border: "2px solid #FFFFFF",
        color: "#FFFFFF",
        boxShadow: "0 2px 6px rgba(0, 32, 91, 0.3)",
        visibility: "hidden",
    });
    return b;
}
