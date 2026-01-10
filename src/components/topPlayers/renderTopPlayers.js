import { createEl, append } from "../../utils/dom.js";
import { fetchPlayerPhoto } from "../../utils/fetch.js";

export async function renderTopPlayers(container, onPlayerSelect, options = {}) {
    const {
        stat = "PTS",
        label = "PPG LEADERS",
        statLabel = "PPG"
    } = options;
    container.style.display = "block";
    container.innerHTML = "";
    
    const panel = createEl("div", {
        marginTop: "24px",
        marginBottom: "24px",
        background: "linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)",
        borderRadius: "16px",
        padding: "32px",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
        border: "1px solid #e8e8e8"
    });

    // Title
    const title = createEl("div", {
        fontSize: "18px",
        fontWeight: "700",
        color: "#111",
        paddingBottom: "12px",
        borderBottom: "2px solid #1f77b4",
        marginBottom: "16px"
    });
    title.textContent = "PPG Leaders";
    // Removed: panel.appendChild(title);

    // Container with arrow buttons and title
    const controlsContainer = createEl("div", {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        marginBottom: "16px",
        paddingTop: "8px"
    });

    // Vertical title
    const verticalTitle = createEl("div", {
        fontSize: "22px",
        fontWeight: "800",
        background: "linear-gradient(135deg, #1f77b4 0%, #2b8bec 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        writingMode: "vertical-rl",
        textOrientation: "mixed",
        transform: "rotate(180deg)",
        marginRight: "20px",
        flexShrink: 0,
        letterSpacing: "1px"
    });
    verticalTitle.textContent = label;

    // Left arrow button
    const leftArrow = createEl("button", {
        width: "44px",
        height: "44px",
        borderRadius: "12px",
        border: "2px solid #e8e8e8",
        background: "linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)",
        color: "#1f77b4",
        fontSize: "20px",
        fontWeight: "bold",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        flexShrink: 0,
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)"
    });
    leftArrow.textContent = "‹";
    leftArrow.onmouseover = () => {
        leftArrow.style.background = "linear-gradient(135deg, #1f77b4 0%, #2b8bec 100%)";
        leftArrow.style.color = "white";
        leftArrow.style.transform = "translateY(-2px)";
        leftArrow.style.boxShadow = "0 8px 16px rgba(31, 119, 180, 0.25)";
    };
    leftArrow.onmouseout = () => {
        leftArrow.style.background = "linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)";
        leftArrow.style.color = "#1f77b4";
        leftArrow.style.transform = "translateY(0)";
        leftArrow.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.06)";
    };

    // Right arrow button
    const rightArrow = createEl("button", {
        width: "44px",
        height: "44px",
        borderRadius: "12px",
        border: "2px solid #e8e8e8",
        background: "linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)",
        color: "#1f77b4",
        fontSize: "20px",
        fontWeight: "bold",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        flexShrink: 0,
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)"
    });
    rightArrow.textContent = "›";
    rightArrow.onmouseover = () => {
        rightArrow.style.background = "linear-gradient(135deg, #1f77b4 0%, #2b8bec 100%)";
        rightArrow.style.color = "white";
        rightArrow.style.transform = "translateY(-2px)";
        rightArrow.style.boxShadow = "0 8px 16px rgba(31, 119, 180, 0.25)";
    };
    rightArrow.onmouseout = () => {
        rightArrow.style.background = "linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)";
        rightArrow.style.color = "#1f77b4";
        rightArrow.style.transform = "translateY(0)";
        rightArrow.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.06)";
    };

    // Players carousel wrapper - width set after data load to exactly fit 4 cards + gaps
    const carouselContainer = createEl("div", {
        flex: "0 0 auto",
        overflowX: "hidden",
        borderRadius: "0px"
    });

    const playersContainer = createEl("div", {
        display: "flex",
        gap: "16px",
        transition: "transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
    });

    // Fetch and render top PPG players
    try {
        const response = await fetch(`http://localhost:4000/pg_stats/national_player_pg_leaders?stat=${stat}&n=25`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const players = await response.json();
        console.log("Top PPG players loaded:", players.length);

        let currentIndex = 0;
        const cardsPerView = 4;
        const cardWidth = 220;
        const gap = 16;
        const containerWidth = (cardsPerView * (cardWidth + gap)) - gap;
        carouselContainer.style.maxWidth = `${containerWidth}px`;

        const maxIndex = Math.max(players.length - cardsPerView, 0);

        const updateCarousel = () => {
            const offset = currentIndex * (cardWidth + gap);
            playersContainer.style.transform = `translateX(-${offset}px)`;
            leftArrow.style.opacity = currentIndex === 0 ? "0.5" : "1";
            leftArrow.style.cursor = currentIndex === 0 ? "not-allowed" : "pointer";
            rightArrow.style.opacity = currentIndex === maxIndex ? "0.5" : "1";
            rightArrow.style.cursor = currentIndex === maxIndex ? "not-allowed" : "pointer";
        };

        leftArrow.onclick = () => {
            if (currentIndex > 0) {
                currentIndex--;
                updateCarousel();
            }
        };

        rightArrow.onclick = () => {
            if (currentIndex < maxIndex) {
                currentIndex++;
                updateCarousel();
            }
        };

        // Create player cards
        for (let i = 0; i < players.length; i++) {
            const player = players[i];
            const playerKey = `${player.Player}|${player.Team}`;
            const rank = i + 1;

            const card = createEl("div", {
                minWidth: `${cardWidth}px`,
                maxWidth: `${cardWidth}px`,
                height: "280px",
                background: "linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)",
                borderRadius: "16px",
                padding: "20px 16px 16px 16px",
                textAlign: "center",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                border: "2px solid #e8e8e8",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
                overflow: "visible",
                cursor: onPlayerSelect ? "pointer" : "default"
            });

            card.onmouseover = () => {
                card.style.boxShadow = "0 12px 28px rgba(31, 119, 180, 0.25)";
                card.style.borderColor = "#1f77b4";
            };

            card.onmouseout = () => {
                card.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.08)";
                card.style.borderColor = "#e8e8e8";
            };

            card.onclick = () => {
                if (typeof onPlayerSelect === "function") {
                    onPlayerSelect(player.Player, player.Team);
                }
            };

            // Rank badge
            const rankBadge = createEl("div", {
                position: "absolute",
                top: "12px",
                left: "12px",
                width: "36px",
                height: "36px",
                background: "linear-gradient(135deg, #1f77b4 0%, #2b8bec 100%)",
                color: "white",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "800",
                fontSize: "14px",
                border: "2px solid white",
                boxShadow: "0 4px 12px rgba(31, 119, 180, 0.3)",
                zIndex: 10
            });
            rankBadge.textContent = rank;
            card.appendChild(rankBadge);

            // Photo container - centered
            const photoContainer = createEl("div", {
                flex: "1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "0",
                marginTop: "8px"
            });

            const photoImg = createEl("img", {
                width: "100px",
                height: "100px",
                borderRadius: "12px",
                objectFit: "cover",
                border: "3px solid #f0f0f0",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)"
            });

            try {
                const photoUrl = await fetchPlayerPhoto(playerKey);
                photoImg.src = photoUrl;
                photoImg.onerror = () => {
                    photoImg.style.display = "none";
                };
            } catch (e) {
                photoImg.style.display = "none";
            }

            photoContainer.appendChild(photoImg);
            card.appendChild(photoContainer);

            // Player name
            const nameEl = createEl("div", {
                fontSize: "14px",
                fontWeight: "700",
                color: "#333",
                marginBottom: "4px",
                lineHeight: "1.3"
            });
            nameEl.textContent = player.Player;
            card.appendChild(nameEl);

            // Team
            const teamEl = createEl("div", {
                fontSize: "11px",
                color: "#888",
                marginBottom: "10px",
                fontWeight: "600"
            });
            teamEl.textContent = player.Team;
            card.appendChild(teamEl);

            // PPG stat - rounded to 2 decimal places
            const ptsEl = createEl("div", {
                fontSize: "28px",
                fontWeight: "800",
                background: "linear-gradient(135deg, #1f77b4 0%, #2b8bec 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text"
            });
            const statValue = player[stat] ?? player[stat.toUpperCase()] ?? player[stat.toLowerCase()];
            const statNum = statValue !== undefined ? parseFloat(statValue) : NaN;
            const statText = Number.isFinite(statNum) ? statNum.toFixed(2) : "--";
            ptsEl.textContent = statText;
            card.appendChild(ptsEl);

            // PPG label
            const labelEl = createEl("div", {
                fontSize: "10px",
                color: "#999",
                fontWeight: "700",
                letterSpacing: "1px"
            });
            labelEl.textContent = statLabel;
            card.appendChild(labelEl);

            playersContainer.appendChild(card);
        }

        updateCarousel();
        carouselContainer.appendChild(playersContainer);
        append(controlsContainer, verticalTitle, leftArrow, carouselContainer, rightArrow);
        panel.appendChild(controlsContainer);

    } catch (error) {
        console.error("Error loading top PPG players:", error);
        const errorDiv = createEl("div", {
            padding: "20px",
            textAlign: "center",
            color: "#d62728",
            fontSize: "14px"
        });
        errorDiv.textContent = "Failed to load top players";
        panel.appendChild(errorDiv);
    }

    container.appendChild(panel);
}
