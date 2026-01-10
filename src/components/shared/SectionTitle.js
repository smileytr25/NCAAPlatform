// components/shared/SectionTitle.js

export function createSectionTitle(text) {
    const title = document.createElement("div");
    title.textContent = text;

    title.style.fontSize = "16px";
    title.style.fontWeight = "700";
    title.style.marginBottom = "20px";
    title.style.paddingBottom = "12px";
    title.style.borderBottom = "3px solid #BA0C2F";
    title.style.color = "#00205B";
    title.style.textTransform = "uppercase";
    title.style.letterSpacing = "0.5px";

    return title;
}
