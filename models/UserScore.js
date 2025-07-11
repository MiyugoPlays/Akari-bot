const { Schema, model } = require('mongoose');

const userScoreSchema = new Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    grade: { type: String, required: true }, // ✅ novo campo
    totalPoints: { type: Number, default: 0 },
    quizzesPlayed: { type: Number, default: 0 },
    lastScore: { type: Number, default: 0 },
    lastPlayedAt: { type: Date, default: Date.now }
});

module.exports = model('UserScore', userScoreSchema);
