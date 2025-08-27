module.exports = {
    type: 'check',

    check: {
        token: process.env.CHECK_API_TOKEN,
        teamSlug: process.env.CHECK_TEAM_SLUG,
        apiUrl: process.env.CHECK_API_URL,
        interval: parseInt(process.env.CHECK_API_INTERVAL),
        enabled: true
    }
};
