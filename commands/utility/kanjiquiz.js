const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js')
const path = require('path')
const generateKanjiImage = require('../../utils/generateKanjiImage');
const UserScore = require('../../models/UserScore');


async function fetchKanjiInfo(kanji) {
    try {
        const response = await fetch(`https://kanjiapi.dev/v1/kanji/grade-${encodeURIComponent(kanji)}`);
        if (!response.ok) throw new Error(`Erro ao buscar a lista de kanji: ${response.statusText}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Erro na requisição da lista de kanji:', error);
        return null;
    }
}

async function getKanjiMeaning(kanji) {
    try {
        const res = await fetch(`https://kanjiapi.dev/v1/kanji/${encodeURIComponent(kanji)}`);
        if (!res.ok) return null;
        const data = await res.json();
        // data.meanings é um array de significados em inglês
        if (Array.isArray(data.meanings) && data.meanings.length > 0) {
            // Retorna todos os significados em lowercase
            return data.meanings.map(m => m.toLowerCase());
        }
        return null;
    } catch (e) {
        console.error('Erro ao buscar significado:', e);
        return null;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kanjiquiz')
        .setDescription('A kanji quiz for each grade level')

        // Subcomando: /kanjiquiz start grade:1
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Start a kanji quiz')
                .addStringOption(option =>
                    option.setName('grade')
                        .setDescription('Select your grade level')
                        .setRequired(true)
                        .addChoices(
                            { name: '1', value: '1' },
                            { name: '2', value: '2' },
                            { name: '3', value: '3' },
                            { name: '4', value: '4' },
                            { name: '5', value: '5' },
                            { name: '6', value: '6' },
                            { name: 'Secondary School', value: '8' }
                        )
                )
                .addStringOption(option =>
                    option.setName('amount')
                        .setDescription('Set the amount of kanjis')
                )
        )

        // Subcomando: /kanjiquiz ranking
        .addSubcommand(subcommand =>
            subcommand
                .setName('ranking')
                .setDescription('See the leaderboards of the server')
                .addStringOption(option =>
                    option.setName('grade')
                        .setDescription('Select the grade level')
                        .setRequired(true)
                        .addChoices(
                            { name: '1', value: '1' },
                            { name: '2', value: '2' },
                            { name: '3', value: '3' },
                            { name: '4', value: '4' },
                            { name: '5', value: '5' },
                            { name: '6', value: '6' },
                            { name: 'Secondary School', value: '8' }
                        )
                )
        ),
    async execute(interaction) {
        try {
            await interaction.deferReply();

            const subcommand = interaction.options.getSubcommand(false)
            const guildId = interaction.guildId;
            const userId = interaction.user.id;
            const sessionKey = `${guildId}-${userId}`

            if (subcommand === 'ranking') {
                const grade = interaction.options.getString('grade'); // pega o valor da option

                const top = await UserScore.find({ guildId, grade })
                    .sort({ totalPoints: -1 })
                    .limit(10);

                if (!top.length) {
                    return interaction.editReply(`📊 Ainda não há jogadores no ranking para o nível ${grade}.`);
                }

                const leaderboard = await Promise.all(
                    top.map(async (entry, index) => {
                        const user = await interaction.client.users.fetch(entry.userId).catch(() => null);
                        const username = user ? user.username : `Usuário desconhecido (${entry.userId})`;

                        return `**${index + 1}.** ${username} — 🏅 ${entry.totalPoints} pontos (${entry.quizzesPlayed} quizzes)`;
                    })
                );

                await interaction.editReply({
                    content: `🏆 **Ranking de Pontuação - Nível ${grade}**\n\n${leaderboard.join('\n')}`
                });
            } else {
                const grade = interaction.options.getString('grade');
                const amount = parseInt(interaction.options.getString('amount')) || 10;


                const kanjis = await fetchKanjiInfo(grade)
                if (amount > kanjis.length) {
                    return interaction.reply(`❌ Esse nível só tem ${kanjis.length} kanjis. Tente um número menor.`);
                } else {
                    const selectedKanjis = kanjis.sort(() => Math.random() - 0.5).slice(0, amount);

                    const kanjiData = await Promise.all(selectedKanjis.map(async k => ({
                        kanji: k,
                        meaning: await getKanjiMeaning(k)
                    })));

                    // Salva sessão do usuário
                    interaction.client.activeQuizzes ??= new Map();
                    interaction.client.activeQuizzes.set(sessionKey, {
                        index: 0,
                        score: 0,
                        kanjis: kanjiData,
                        startTime: Date.now(),
                        grade
                    });

                    const firstKanji = kanjiData[0].kanji;

                    const buffer = generateKanjiImage(firstKanji);
                    const attachment = new AttachmentBuilder(buffer, { name: 'kanji.png' })
                    await interaction.editReply({
                        content: `🧠 Iniciando quiz com ${amount} kanjis!\nQual o significado do kanji abaixo?`,
                        files: [attachment]
                    });
                }
            }

        } catch (error) {
            console.error(error);

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: '❌ Ocorreu um erro ao iniciar o quiz.',
                    ephemeral: true
                }).catch(console.error);
            } else {
                await interaction.reply({
                    content: '❌ Ocorreu um erro ao iniciar o quiz.',
                    ephemeral: true
                }).catch(console.error);
            }
        }
    }
}