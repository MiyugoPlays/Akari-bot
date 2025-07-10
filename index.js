const dotenv = require('dotenv');
dotenv.config();

const fs = require('node:fs');
const path = require('node:path');
const { createCanvas, registerFont } = require('canvas');
const { Client, Collection, GatewayIntentBits } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
client.activeQuizzes = new Map();

client.commands = new Collection();
client.cooldowns = new Collection();

registerFont(path.join(__dirname, '/fonts', 'NotoSerifJP-VariableFont_wght.ttf'), {
    family: 'Noto Serif JP',
});
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for(const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        }else {
            console.log(`[WARNING] the command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for(const file of eventFiles){
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once){
        client.once(event.name, (...args) => event.execute(...args));
    }else {
        client.on(event.name, (...args) => event.execute(...args))
    }
}

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    const sessionKey = `${message.guild.id}-${message.author.id}`;
    if (!client.activeQuizzes) client.activeQuizzes = new Map();
    const quiz = client.activeQuizzes.get(sessionKey);

    if (!quiz) return;

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
    // Aqui você pode salvar no MongoDB
  } else {
    quiz.startTime = Date.now();

    const canvas = createCanvas(300, 300);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#222222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 200px "Noto Serif JP"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const nextKanji = quiz.kanjis[quiz.index].kanji;
    ctx.fillText(nextKanji, canvas.width / 2, canvas.height / 2);


    await message.reply({
        content: `➡️ Próximo kanji: **${nextKanji}**`,
        files: [{ attachment: canvas.toBuffer(), name: 'kanji.png' }]
    });
  }
});


client.login(process.env.DISCORD_TOKEN)

