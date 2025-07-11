const { Events, AttachmentBuilder } = require('discord.js')
const generateKanjiImage = require('../utils/generateKanjiImage');
const UserScore = require('../models/UserScore'); // já incluso no topo

module.exports = {
    name: Events.MessageCreate,

    async execute(message) {
        if (message.author.bot || !message.guild) return;

        const client = message.client
        const sessionKey = `${message.guild.id}-${message.author.id}`;

        if (!client.activeQuizzes) client.activeQuizzes = new Map();

        const quiz = client.activeQuizzes.get(sessionKey);
        if (!quiz) return;

        if (quiz.timeout) clearTimeout(quiz.timeout);

        const current = quiz.kanjis[quiz.index];
        const userAnswer = message.content.trim().toLowerCase();
        const correctAnswer = current.meaning || [];

        const timeTaken = ((Date.now() - quiz.startTime) / 1000).toFixed(1);

        if (correctAnswer.includes(userAnswer)) {
            quiz.score++;
            await message.reply(`✅ Correto! Tempo: ${timeTaken}s`);
        } else {
            await message.reply(`❌ Errado! Resposta correta: **${correctAnswer}**`);
        }

        quiz.index++;

        if (quiz.index >= quiz.kanjis.length) {
            await message.reply(`🏁 Fim do quiz! Você acertou ${quiz.score} de ${quiz.kanjis.length}`);
            client.activeQuizzes.delete(sessionKey);

            await UserScore.findOneAndUpdate(
                {
                    userId: message.author.id,
                    guildId: message.guild.id,
                    grade: quiz.grade  // ✅ novo campo
                },
                {
                    $inc: {
                        totalPoints: quiz.score,
                        quizzesPlayed: 1
                    },
                    lastScore: quiz.score,
                    lastPlayedAt: new Date()
                },
                { upsert: true, new: true }
            );

            client.activeQuizzes.delete(sessionKey);
            return;
        } else {
            quiz.startTime = Date.now();

            const nextKanji = quiz.kanjis[quiz.index].kanji;
            const buffer = generateKanjiImage(nextKanji);
            const attachment = new AttachmentBuilder(buffer, { name: 'kanji.png' })

            await message.reply({
                content: `➡️ Próximo kanji: **${nextKanji}**`,
                files: [attachment]
            });

            quiz.timeout = setTimeout(async () => {
                await message.channel.send(`⏰ Tempo esgotado! Fim do quiz. Você acertou ${quiz.score} de ${quiz.kanjis.length}.`);
                client.activeQuizzes.delete(sessionKey);
            }, 15_000);
        }
    }
}