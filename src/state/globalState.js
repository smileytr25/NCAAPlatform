export const GlobalState = {
    selectedTeam: null,
    selectedPlayer: null,
    selectedConference: null,

    // a reference to displayBoxScore so listeners can call it
    displayBoxScore: null,

    // caches
    standingsCache: {},
    teamImageCache: {},
    playerImageCache: {},
};
