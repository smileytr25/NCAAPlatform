import { SmallRankBadge } from "./SmallRankBadge.js";

export function LogoWithRank(logoURL) {
    const container = document.createElement("div");
    Object.assign(container.style, {
        position: "relative",
        width: "40px",
        height: "40px"
    });

    const img = document.createElement("img");
    Object.assign(img.style, {
        width: "100%",
        height: "100%",
        objectFit: "contain"
    });
    img.src = logoURL;

    const badge = SmallRankBadge();

    container.appendChild(badge);
    container.appendChild(img);

    return { container, badge };
}
