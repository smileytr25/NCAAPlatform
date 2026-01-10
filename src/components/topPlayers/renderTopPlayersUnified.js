import { createEl, append } from "../../utils/dom.js";
import { fetchPlayerPhoto, fetchTeamImage } from "../../utils/fetch.js";
import { createSectionTitle } from "../shared/SectionTitle.js";

export async function renderTopPlayersUnified(container, onPlayerSelect, playerStatConfigs = [], teamStatConfigs = []) {
    container.style.display = "block";
    container.innerHTML = "";
    
    // Default stat configs if none provided
    if (!playerStatConfigs || playerStatConfigs.length === 0) {
        playerStatConfigs = [
            { stat: "PTS", label: "PPG", statLabel: "PPG" },
            { stat: "AST", label: "APG", statLabel: "APG" },
            { stat: "TRB", label: "RPG", statLabel: "RPG" },
            { stat: "STL", label: "SPG", statLabel: "SPG" },
            { stat: "BLK", label: "BPG", statLabel: "BPG" },
            { stat: "FG%", label: "FG%", statLabel: "FG%" },
            { stat: "3P%", label: "3P%", statLabel: "3P%" },
            { stat: "FT%", label: "FT%", statLabel: "FT%" }
        ];
    }
    
    if (!teamStatConfigs || teamStatConfigs.length === 0) {
        teamStatConfigs = [
            { stat: "PTS", label: "PPG", statLabel: "PPG" },
            { stat: "AST", label: "APG", statLabel: "APG" },
            { stat: "TRB", label: "RPG", statLabel: "RPG" },
            { stat: "STL", label: "SPG", statLabel: "SPG" },
            { stat: "BLK", label: "BPG", statLabel: "BPG" },
            { stat: "FG%", label: "FG%", statLabel: "FG%" },
            { stat: "3P%", label: "3P%", statLabel: "3P%" },
            { stat: "FT%", label: "FT%", statLabel: "FT%" }
        ];
    }
    
    // Show loading indicator
    const loadingDiv = createEl("div", {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "500px",
        gap: "16px"
    });

    const spinner = createEl("div", {
        width: "50px",
        height: "50px",
        border: "4px solid #E8E8E8",
        borderTop: "4px solid #00205B",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
        boxShadow: "0 4px 12px rgba(0, 32, 91, 0.2)"
    });

    const loadingText = createEl("div", {
        fontSize: "16px",
        color: "#222222",
        fontWeight: "600"
    });
    loadingText.textContent = "Loading player statistics...";

    append(loadingDiv, spinner, loadingText);
    container.appendChild(loadingDiv);

    // Cache for fetched carousel data
    const carouselCache = {};
    let currentStat = playerStatConfigs[0].stat;
    let currentStatConfigs = playerStatConfigs;

    // Main container
    const mainContainer = createEl("div", {
        maxWidth: "1200px",
        marginLeft: "auto",
        marginRight: "auto",
        marginTop: "24px",
        marginBottom: "24px"
    });

    // Section title
    const sectionTitle = createSectionTitle("Per Game Stat Leaders");
    sectionTitle.style.borderBottom = "3px solid #BA0C2F";
    sectionTitle.style.paddingBottom = "12px";
    sectionTitle.style.marginBottom = "24px";
    mainContainer.appendChild(sectionTitle);

    // Stat selector dropdown container
    const selectorContainer = createEl("div", {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "16px",
        marginBottom: "32px",
        maxWidth: "1200px",
        marginLeft: "auto",
        marginRight: "auto"
    });

    // Scope dropdown (Player vs Team)
    const scopeSearchWrapper = createEl("div", {
        position: "relative"
    });

    const selectScopeButton = createEl("div", {
        padding: "14px 16px",
        borderRadius: "8px",
        border: "2px solid #E8E8E8",
        fontSize: "15px",
        fontWeight: "600",
        color: "#222222",
        cursor: "pointer",
        background: "#FFFFFF",
        minWidth: "180px",
        transition: "all 0.2s ease",
        boxShadow: "0 2px 6px rgba(0, 32, 91, 0.08)",
        backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2300205B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/csvg%3e\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 12px center",
        backgroundSize: "20px",
        paddingRight: "40px",
        position: "relative"
    });
    selectScopeButton.textContent = "Players";

    selectScopeButton.onmouseover = () => {
        selectScopeButton.style.borderColor = "#00205B";
        selectScopeButton.style.boxShadow = "0 4px 12px rgba(0, 32, 91, 0.2)";
        selectScopeButton.style.transform = "translateY(-2px)";
    };

    selectScopeButton.onmouseout = () => {
        selectScopeButton.style.borderColor = "#E8E8E8";
        selectScopeButton.style.boxShadow = "0 2px 6px rgba(0, 32, 91, 0.08)";
        selectScopeButton.style.transform = "translateY(0)";
    };

    selectScopeButton.onfocus = () => {
        selectScopeButton.style.outline = "none";
        selectScopeButton.style.borderColor = "#00205B";
        selectScopeButton.style.boxShadow = "0 0 0 3px rgba(0, 32, 91, 0.15)";
    };

    selectScopeButton.onblur = () => {
        selectScopeButton.style.borderColor = "#E8E8E8";
        selectScopeButton.style.boxShadow = "0 2px 6px rgba(0, 32, 91, 0.08)";
    };

    // Scope dropdown menu
    const scopeDropdownMenu = createEl("div", {
        className: "dropdown-menu"
    });
    scopeDropdownMenu.classList.add("dropdown-menu");

    let selectedScope = "players";

    const scopeOptions = [
        { value: "players", label: "Players" },
        { value: "teams", label: "Teams" }
    ];

    scopeOptions.forEach(option => {
        const scopeOption = createEl("div", {
            className: "dropdown-option"
        });
        scopeOption.classList.add("dropdown-option");
        scopeOption.textContent = option.label;
        scopeOption.onclick = (e) => {
            e.stopPropagation();
            selectedScope = option.value;
            selectScopeButton.textContent = option.label;
            scopeDropdownMenu.classList.remove("active");
            
            // Switch stat configs based on scope
            if (selectedScope === "teams") {
                currentStatConfigs = teamStatConfigs;
            } else {
                currentStatConfigs = playerStatConfigs;
            }
            
            // Update stat dropdown with new configs
            updateStatDropdown(currentStatConfigs);
            
            // Reset to first stat of new config
            selectedStat = currentStatConfigs[0].stat;
            selectedStatLabel = currentStatConfigs[0].label;
            selectStatButton.textContent = currentStatConfigs[0].label;
            currentStat = currentStatConfigs[0].stat;
            
            renderCarouselForStat(currentStat, selectedConference, selectedScope);
        };
        scopeOption.onmouseover = () => {
            scopeOption.classList.add("highlighted");
        };
        scopeOption.onmouseout = () => {
            scopeOption.classList.remove("highlighted");
        };
        scopeDropdownMenu.appendChild(scopeOption);
    });

    selectScopeButton.onclick = () => {
        scopeDropdownMenu.classList.toggle("active");
    };

    // Stat dropdown
    const statSearchWrapper = createEl("div", {
        position: "relative"
    });

    // Custom dropdown button for stat
    const selectStatButton = createEl("div", {
        padding: "14px 16px",
        borderRadius: "8px",
        border: "2px solid #E8E8E8",
        fontSize: "15px",
        fontWeight: "600",
        color: "#222222",
        cursor: "pointer",
        background: "#FFFFFF",
        minWidth: "220px",
        transition: "all 0.2s ease",
        boxShadow: "0 2px 6px rgba(0, 32, 91, 0.08)",
        backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2300205B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/csvg%3e\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 12px center",
        backgroundSize: "20px",
        paddingRight: "40px",
        position: "relative"
    });
    selectStatButton.textContent = currentStatConfigs[0].label;

    selectStatButton.onmouseover = () => {
        selectStatButton.style.borderColor = "#00205B";
        selectStatButton.style.boxShadow = "0 4px 12px rgba(0, 32, 91, 0.2)";
        selectStatButton.style.transform = "translateY(-2px)";
    };

    selectStatButton.onmouseout = () => {
        selectStatButton.style.borderColor = "#E8E8E8";
        selectStatButton.style.boxShadow = "0 2px 6px rgba(0, 32, 91, 0.08)";
        selectStatButton.style.transform = "translateY(0)";
    };

    selectStatButton.onfocus = () => {
        selectStatButton.style.outline = "none";
        selectStatButton.style.borderColor = "#00205B";
        selectStatButton.style.boxShadow = "0 0 0 3px rgba(0, 32, 91, 0.15)";
    };

    selectStatButton.onblur = () => {
        selectStatButton.style.borderColor = "#E8E8E8";
        selectStatButton.style.boxShadow = "0 2px 6px rgba(0, 32, 91, 0.08)";
    };

    // Stat dropdown menu
    const statDropdownMenu = createEl("div", {
        className: "dropdown-menu"
    });
    statDropdownMenu.classList.add("dropdown-menu");

    let selectedStat = playerStatConfigs[0].stat;
    let selectedStatLabel = playerStatConfigs[0].label;
    let selectedConference = null;

    const updateStatDropdown = (configs) => {
        statDropdownMenu.innerHTML = "";
        configs.forEach(config => {
            const option = createEl("div", {
                className: "dropdown-option"
            });
            option.classList.add("dropdown-option");
            option.textContent = config.label;
            option.onclick = (e) => {
                e.stopPropagation();
                selectedStat = config.stat;
                selectedStatLabel = config.label;
                selectStatButton.textContent = config.label;
                statDropdownMenu.classList.remove("active");
                currentStat = config.stat;
                renderCarouselForStat(currentStat, selectedConference, selectedScope);
            };
            option.onmouseover = () => {
                option.classList.add("highlighted");
            };
            option.onmouseout = () => {
                option.classList.remove("highlighted");
            };
            statDropdownMenu.appendChild(option);
        });
    };

    updateStatDropdown(currentStatConfigs);

    selectStatButton.onclick = () => {
        statDropdownMenu.classList.toggle("active");
    };

    // Conference dropdown
    const confSearchWrapper = createEl("div", {
        position: "relative"
    });

    const selectConfButton = createEl("div", {
        padding: "14px 16px",
        borderRadius: "8px",
        border: "2px solid #E8E8E8",
        fontSize: "15px",
        fontWeight: "600",
        color: "#222222",
        cursor: "pointer",
        background: "#FFFFFF",
        minWidth: "220px",
        transition: "all 0.2s ease",
        boxShadow: "0 2px 6px rgba(0, 32, 91, 0.08)",
        backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2300205B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/csvg%3e\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 12px center",
        backgroundSize: "20px",
        paddingRight: "40px",
        position: "relative"
    });
    selectConfButton.textContent = "All Conferences";

    selectConfButton.onmouseover = () => {
        selectConfButton.style.borderColor = "#00205B";
        selectConfButton.style.boxShadow = "0 4px 12px rgba(0, 32, 91, 0.2)";
        selectConfButton.style.transform = "translateY(-2px)";
    };

    selectConfButton.onmouseout = () => {
        selectConfButton.style.borderColor = "#E8E8E8";
        selectConfButton.style.boxShadow = "0 2px 6px rgba(0, 32, 91, 0.08)";
        selectConfButton.style.transform = "translateY(0)";
    };

    selectConfButton.onfocus = () => {
        selectConfButton.style.outline = "none";
        selectConfButton.style.borderColor = "#00205B";
        selectConfButton.style.boxShadow = "0 0 0 3px rgba(0, 32, 91, 0.15)";
    };

    selectConfButton.onblur = () => {
        selectConfButton.style.borderColor = "#E8E8E8";
        selectConfButton.style.boxShadow = "0 2px 6px rgba(0, 32, 91, 0.08)";
    };

    // Conference dropdown menu
    const confDropdownMenu = createEl("div", {
        className: "dropdown-menu"
    });
    confDropdownMenu.classList.add("dropdown-menu");

    // Fetch conferences
    const conferences = [];
    try {
        const confRes = await fetch("http://localhost:4000/conferences/all_conference_names");
        if (confRes.ok) {
            const confData = await confRes.json();
            conferences.push(...confData.conferences);
        }
    } catch (e) {
        console.error("Error fetching conferences:", e);
    }

    // Add "All Conferences" option
    const allConfOption = createEl("div", {
        className: "dropdown-option"
    });
    allConfOption.classList.add("dropdown-option");
    allConfOption.textContent = "All Conferences";
    allConfOption.onclick = (e) => {
        e.stopPropagation();
        selectedConference = null;
        selectConfButton.textContent = "All Conferences";
        confDropdownMenu.classList.remove("active");
        renderCarouselForStat(currentStat, selectedConference, selectedScope);
    };
    allConfOption.onmouseover = () => {
        allConfOption.classList.add("highlighted");
    };
    allConfOption.onmouseout = () => {
        allConfOption.classList.remove("highlighted");
    };
    confDropdownMenu.appendChild(allConfOption);

    // Add conference options
    conferences.forEach(conf => {
        const option = createEl("div", {
            className: "dropdown-option"
        });
        option.classList.add("dropdown-option");
        option.textContent = conf;
        option.onclick = (e) => {
            e.stopPropagation();
            selectedConference = conf;
            selectConfButton.textContent = conf;
            confDropdownMenu.classList.remove("active");
            renderCarouselForStat(currentStat, selectedConference, selectedScope);
        };
        option.onmouseover = () => {
            option.classList.add("highlighted");
        };
        option.onmouseout = () => {
            option.classList.remove("highlighted");
        };
        confDropdownMenu.appendChild(option);
    });

    selectConfButton.onclick = () => {
        confDropdownMenu.classList.toggle("active");
    };

    // Close dropdowns when clicking outside
    document.addEventListener("click", (e) => {
        if (!statSearchWrapper.contains(e.target)) {
            statDropdownMenu.classList.remove("active");
        }
        if (!confSearchWrapper.contains(e.target)) {
            confDropdownMenu.classList.remove("active");
        }
        if (!scopeSearchWrapper.contains(e.target)) {
            scopeDropdownMenu.classList.remove("active");
        }
    });

    append(statSearchWrapper, selectStatButton, statDropdownMenu);
    append(confSearchWrapper, selectConfButton, confDropdownMenu);
    append(scopeSearchWrapper, selectScopeButton, scopeDropdownMenu);
    append(selectorContainer, scopeSearchWrapper, statSearchWrapper, confSearchWrapper);
    mainContainer.appendChild(selectorContainer);

    // Carousel container (will be swapped in/out)
    const carouselArea = createEl("div", {
        minHeight: "400px"
    });
    mainContainer.appendChild(carouselArea);

    // Function to render a specific carousel
    const renderCarouselForStat = async (stat, conference, scope = "players") => {
        const config = currentStatConfigs.find(c => c.stat === stat);
        if (!config) return;

        // Show loading while fetching
        carouselArea.innerHTML = "";
        const loadingDiv = createEl("div", {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "400px",
            gap: "16px"
        });

        const spinner = createEl("div", {
            width: "40px",
            height: "40px",
            border: "3px solid #E8E8E8",
            borderTop: "3px solid #00205B",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            boxShadow: "0 4px 12px rgba(0, 32, 91, 0.2)"
        });

        const loadingText = createEl("div", {
            fontSize: "14px",
            color: "#222222",
            fontWeight: "600"
        });
        loadingText.textContent = "Loading...";

        append(loadingDiv, spinner, loadingText);
        carouselArea.appendChild(loadingDiv);

        // Check cache (include conference and scope in cache key)
        const cacheKey = `${stat}|${conference || "national"}|${scope}`;
        if (carouselCache[cacheKey]) {
            carouselArea.innerHTML = "";
            carouselArea.appendChild(carouselCache[cacheKey]);
            return;
        }

        // Fetch data
        try {
            let response;
            if (scope === "teams") {
                // Team leaders endpoints
                if (conference) {
                    response = await fetch(`http://localhost:4000/pg_stats/conference_team_pg_leaders?conference=${encodeURIComponent(conference)}&stat=${stat}`);
                } else {
                    response = await fetch(`http://localhost:4000/pg_stats/national_team_pg_leaders?stat=${stat}`);
                }
            } else {
                // Player leaders endpoints
                if (conference) {
                    response = await fetch(`http://localhost:4000/pg_stats/conference_player_pg_leaders?conference=${encodeURIComponent(conference)}&stat=${stat}&n=25`);
                } else {
                    response = await fetch(`http://localhost:4000/pg_stats/national_player_pg_leaders?stat=${stat}&n=25`);
                }
            }
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            let players = await response.json();
            
            // Determine if this is a defensive stat
            const isDefensiveStat = stat.includes("_allowed") || stat === "shots_blocked" || stat === "team_tov";
            
            // Sort by original unrounded value and take top 25
            const statKey = stat;
            players.sort((a, b) => {
                const valA = parseFloat(a[statKey]);
                const valB = parseFloat(b[statKey]);
                return isDefensiveStat ? (valA - valB) : (valB - valA);
            });
            
            players = players.slice(0, 25);
            
            // Apply T-rank format based on rounded stat value (2 decimals)
            const roundedValues = {};
            
            // Group by rounded value and track positions
            for (let i = 0; i < players.length; i++) {
                const val = parseFloat(players[i][statKey]);
                const rounded = parseFloat(val.toFixed(2));
                if (!roundedValues[rounded]) {
                    roundedValues[rounded] = [];
                }
                roundedValues[rounded].push(i);
            }
            
            // Assign T-ranks (based on rounded values, sorted)
            let currentRank = 1;
            const sortedRoundedValues = Object.keys(roundedValues)
                .map(Number)
                .sort((a, b) => isDefensiveStat ? (a - b) : (b - a));
            
            for (const roundedVal of sortedRoundedValues) {
                const indices = roundedValues[roundedVal];
                if (indices.length === 1) {
                    players[indices[0]].rank = currentRank.toString();
                } else {
                    const tRank = `T${currentRank}`;
                    for (const idx of indices) {
                        players[idx].rank = tRank;
                    }
                }
                currentRank += indices.length;
            }
            
            carouselArea.innerHTML = "";

            // Build carousel DOM
            const carouselContent = createEl("div", {
                display: "flex",
                alignItems: "center",
                minHeight: "400px",
                background: "linear-gradient(135deg, #F0F2F5 0%, #FAFBFC 50%, #F5F7FA 100%)",
                borderRadius: "12px",
                padding: "32px 16px 32px 76px",
                boxShadow: "inset 0 2px 8px rgba(0, 32, 91, 0.06)",
                border: "1px solid #E1E4E8",
                overflow: "visible",
                position: "relative"
            });

            // Vertical tab stripe on the left
            const verticalTabStripe = createEl("div", {
                position: "absolute",
                left: "0",
                top: "0",
                bottom: "0",
                width: "60px",
                background: "linear-gradient(135deg, #00205B 0%, #003087 100%)",
                borderTopLeftRadius: "12px",
                borderBottomLeftRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "2px 0 8px rgba(0, 32, 91, 0.2)"
            });

            // Vertical title inside the stripe
            const verticalTitle = createEl("div", {
                fontSize: "18px",
                fontWeight: "700",
                color: "#FFFFFF",
                writingMode: "vertical-rl",
                textOrientation: "mixed",
                transform: "rotate(180deg)",
                letterSpacing: "2px",
                textTransform: "uppercase"
            });
            verticalTitle.textContent = config.label;
            verticalTabStripe.appendChild(verticalTitle);
            carouselContent.appendChild(verticalTabStripe);

            // Container with arrow buttons
            const controlsContainer = createEl("div", {
                display: "flex",
                alignItems: "center",
                gap: "12px"
            });

            // Left arrow button
            const leftArrow = createEl("button", {
                width: "44px",
                height: "44px",
                borderRadius: "8px",
                border: "2px solid #E8E8E8",
                background: "#FFFFFF",
                color: "#00205B",
                fontSize: "20px",
                fontWeight: "bold",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease",
                flexShrink: 0,
                boxShadow: "0 2px 6px rgba(0, 32, 91, 0.08)"
            });
            leftArrow.textContent = "‹";
            leftArrow.onmouseover = () => {
                leftArrow.style.background = "#00205B";
                leftArrow.style.color = "#FFFFFF";
                leftArrow.style.transform = "translateY(-2px)";
                leftArrow.style.boxShadow = "0 4px 12px rgba(0, 32, 91, 0.2)";
            };
            leftArrow.onmouseout = () => {
                leftArrow.style.background = "#FFFFFF";
                leftArrow.style.color = "#00205B";
                leftArrow.style.transform = "translateY(0)";
                leftArrow.style.boxShadow = "0 2px 6px rgba(0, 32, 91, 0.08)";
            };

            // Right arrow button
            const rightArrow = createEl("button", {
                width: "44px",
                height: "44px",
                borderRadius: "8px",
                border: "2px solid #E8E8E8",
                background: "#FFFFFF",
                color: "#00205B",
                fontSize: "20px",
                fontWeight: "bold",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease",
                flexShrink: 0,
                boxShadow: "0 2px 6px rgba(0, 32, 91, 0.08)"
            });
            rightArrow.textContent = "›";
            rightArrow.onmouseover = () => {
                rightArrow.style.background = "#00205B";
                rightArrow.style.color = "#FFFFFF";
                rightArrow.style.transform = "translateY(-2px)";
                rightArrow.style.boxShadow = "0 4px 12px rgba(0, 32, 91, 0.2)";
            };
            rightArrow.onmouseout = () => {
                rightArrow.style.background = "#FFFFFF";
                rightArrow.style.color = "#00205B";
                rightArrow.style.transform = "translateY(0)";
                rightArrow.style.boxShadow = "0 2px 6px rgba(0, 32, 91, 0.08)";
            };

            // Carousel container
            const carouselContainer = createEl("div", {
                flex: "0 0 auto",
                overflowX: "hidden",
                overflowY: "visible",
                borderRadius: "0px",
                paddingTop: "8px",
                paddingBottom: "8px"
            });

            const playersContainer = createEl("div", {
                display: "flex",
                gap: "16px",
                transition: "transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
            });

            // Carousel state
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

            // Create cards
            for (let i = 0; i < players.length; i++) {
                const item = players[i];
                const rank = item.rank;
                
                // Determine if this is player or team data
                const isTeam = scope === "teams";
                const itemName = isTeam ? item.team : item.player;
                const itemTeam = isTeam ? null : item.team;

                const card = createEl("div", {
                    minWidth: `${cardWidth}px`,
                    maxWidth: `${cardWidth}px`,
                    height: "280px",
                    background: "linear-gradient(135deg, #FFFFFF 0%, #FAFBFC 100%)",
                    borderRadius: "12px",
                    padding: "20px 16px 16px 16px",
                    textAlign: "center",
                    boxShadow: "0 4px 12px rgba(0, 32, 91, 0.12), 0 1px 3px rgba(0, 0, 0, 0.08)",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    border: "2px solid #E1E4E8",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    position: "relative",
                    overflow: "visible",
                    cursor: isTeam ? "default" : (onPlayerSelect ? "pointer" : "default")
                });

                card.onmouseover = () => {
                    card.style.boxShadow = "0 12px 32px rgba(0, 32, 91, 0.2), 0 4px 8px rgba(186, 12, 47, 0.1)";
                    card.style.borderColor = "#00205B";
                    card.style.transform = "translateY(-2px)";
                    card.style.background = "linear-gradient(135deg, #FFFFFF 0%, #F8F9FB 100%)";
                };

                card.onmouseout = () => {
                    card.style.boxShadow = "0 4px 12px rgba(0, 32, 91, 0.12), 0 1px 3px rgba(0, 0, 0, 0.08)";
                    card.style.borderColor = "#E1E4E8";
                    card.style.transform = "translateY(0)";
                    card.style.background = "linear-gradient(135deg, #FFFFFF 0%, #FAFBFC 100%)";
                };

                card.onclick = () => {
                    if (!isTeam && typeof onPlayerSelect === "function") {
                        onPlayerSelect(item.Player, item.Team);
                    }
                };

                // Rank badge
                const rankBadge = createEl("div", {
                    position: "absolute",
                    top: "12px",
                    left: "12px",
                    width: "40px",
                    height: "40px",
                    background: "linear-gradient(135deg, #001740 0%, #00205B 50%, #003087 100%)",
                    color: "#FFFFFF",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "900",
                    fontSize: "15px",
                    border: "2px solid #FFFFFF",
                    boxShadow: "0 4px 12px rgba(0, 32, 91, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2)",
                    zIndex: 10
                });
                rankBadge.textContent = rank;
                card.appendChild(rankBadge);

                // Photo container - only for players
                if (!isTeam) {
                    const photoContainer = createEl("div", {
                        width: "100px",
                        height: "120px",
                        margin: "8px auto 0 auto",
                        borderRadius: "10px",
                        background: "linear-gradient(135deg, #F8F9FB 0%, #FFFFFF 100%)",
                        border: "2px solid",
                        borderImage: "linear-gradient(135deg, #00205B 0%, #003087 100%) 1",
                        borderImageSlice: 1,
                        boxShadow: "0 4px 12px rgba(0, 32, 91, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.8)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden"
                    });

                    // Silhouette SVG fallback
                    const silhouetteSvg = `
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" style="border-radius: 6px; background-color: #F5F5F5;">
                            <circle cx="50" cy="35" r="15" fill="#CCCCCC"/>
                            <path d="M 50 50 Q 30 65 30 80 L 70 80 Q 70 65 50 50 Z" fill="#CCCCCC"/>
                        </svg>
                    `;

                    const showSilhouette = () => {
                        photoContainer.style.border = "2px solid #00205B";
                        photoContainer.style.boxShadow = "0 2px 8px rgba(0, 32, 91, 0.15)";
                        photoContainer.innerHTML = silhouetteSvg;
                    };

                    const showTeamLogo = async () => {
                        try {
                            const logoSrc = await fetchTeamImage(item.team);
                            if (logoSrc) {
                                const logoImg = createEl("img", {
                                    width: "60%",
                                    height: "60%",
                                    objectFit: "contain",
                                    background: "transparent"
                                });
                                logoImg.src = logoSrc;
                                logoImg.onerror = showSilhouette;
                                photoContainer.innerHTML = "";
                                photoContainer.style.border = "none";
                                photoContainer.appendChild(logoImg);
                            } else {
                                showSilhouette();
                            }
                        } catch (error) {
                            showSilhouette();
                        }
                    };

                    try {
                        const photoResult = await fetchPlayerPhoto(item.player, item.team);
                        if (!photoResult || typeof photoResult !== "string" || !photoResult.startsWith("http")) {
                            await showTeamLogo();
                        } else {
                            const photoImg = createEl("img", {
                                width: "100%",
                                height: "100%",
                                borderRadius: "6px",
                                objectFit: "cover"
                            });
                            photoImg.src = photoResult;
                            photoImg.onerror = async () => {
                                await showTeamLogo();
                            };
                            photoContainer.appendChild(photoImg);
                        }
                    } catch (error) {
                        console.error("Error fetching player photo:", error);
                        await showTeamLogo();
                    }

                    card.appendChild(photoContainer);
                } else {
                    // Team logo for team leaders
                    const teamLogoContainer = createEl("div", {
                        width: "100px",
                        height: "120px",
                        margin: "8px auto 0 auto",
                        borderRadius: "8px",
                        background: "transparent",
                        border: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden"
                    });

                    try {
                        const logoSrc = await fetchTeamImage(item.team);
                        if (logoSrc) {
                            const logoImg = createEl("img", {
                                width: "80%",
                                height: "80%",
                                objectFit: "contain"
                            });
                            logoImg.src = logoSrc;
                            teamLogoContainer.appendChild(logoImg);
                        }
                    } catch (error) {
                        // Silently fail if logo not available
                    }

                    card.appendChild(teamLogoContainer);
                }

                // Item name (Player or Team)
                const nameEl = createEl("div", {
                    fontSize: "14px",
                    fontWeight: "700",
                    color: "#222222",
                    marginBottom: "4px",
                    lineHeight: "1.3"
                });
                nameEl.textContent = itemName;
                card.appendChild(nameEl);

                // Team name - only for players, or conference for teams
                if (!isTeam && itemTeam) {
                    const teamEl = createEl("div", {
                        fontSize: "11px",
                        color: "#666666",
                        marginBottom: "10px",
                        fontWeight: "600"
                    });
                    teamEl.textContent = itemTeam;
                    card.appendChild(teamEl);
                } else if (isTeam && item.Conference) {
                    const confEl = createEl("div", {
                        fontSize: "11px",
                        color: "#666666",
                        marginBottom: "10px",
                        fontWeight: "600"
                    });
                    confEl.textContent = item.Conference;
                    card.appendChild(confEl);
                }

                // Stat value
                const statEl = createEl("div", {
                    fontSize: "28px",
                    fontWeight: "800",
                    color: "#00205B"
                });
                const statValue = item[stat] ?? item[stat.toUpperCase()] ?? item[stat.toLowerCase()];
                const statNum = statValue !== undefined ? parseFloat(statValue) : NaN;
                const statText = Number.isFinite(statNum) ? statNum.toFixed(2) : "--";
                statEl.textContent = statText;
                card.appendChild(statEl);

                // Stat label
                const labelEl = createEl("div", {
                    fontSize: "10px",
                    color: "#666666",
                    fontWeight: "700",
                    letterSpacing: "1px",
                    textTransform: "uppercase"
                });
                labelEl.textContent = config.statLabel;
                card.appendChild(labelEl);

                playersContainer.appendChild(card);
            }

            updateCarousel();
            carouselContainer.appendChild(playersContainer);
            append(controlsContainer, leftArrow, carouselContainer, rightArrow);
            carouselContent.appendChild(controlsContainer);

            // Cache and render
            carouselCache[cacheKey] = carouselContent;
            carouselArea.innerHTML = "";
            carouselArea.appendChild(carouselContent);
        } catch (error) {
            console.error(`Error loading ${stat} leaders:`, error);
            carouselArea.innerHTML = "";
            const errorDiv = createEl("div", {
                padding: "20px",
                textAlign: "center",
                color: "#ff4466",
                fontSize: "14px"
            });
            errorDiv.textContent = `Failed to load ${config.label}`;
            carouselArea.appendChild(errorDiv);
        }
    };

    // Render initial stat on load
    await renderCarouselForStat(currentStat);

    // Clear loading and show panel
    container.innerHTML = "";
    container.appendChild(mainContainer);
}
