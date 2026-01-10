export const statCategories = {
    "Record": { stats: ["W", "L"], color: "#15ff0080" },
    "Playing": { stats: ["GP", "GS", "MP"], color: "black" },
    "Points": { stats: ["PTS"], color: "black" },
    "Assists": { stats: ["AST"], color: "black" },
    "Rebounding": { stats: ["TRB", "DRB", "ORB"], color: "black" },
    "Defense": { stats: ["BLK", "STL"], color: "black" },
    "Miscues": { stats: ["TOV", "PF"], color: "black" },
    "Shooting": {
        stats: ["FG", "FGA", "FG%", "2P", "2PA", "2P%", "3P", "3PA", "3P%", "FT", "FTA", "FT%"],
        color: "black"
    },
    "Impact": { stats: ["GmSc"], color: "black" }
};

export const statColorMap = {};

Object.entries(statCategories).forEach(([cat, info]) => {
    info.stats.forEach(stat => {
        statColorMap[stat] = info.color;
    });
});
