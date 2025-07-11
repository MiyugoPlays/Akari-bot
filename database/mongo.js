const mongoose = require('mongoose');

async function connectToMongo() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ MongoDB conectado na nuvem!');
    } catch (err) {
        console.error('❌ Erro ao conectar no MongoDB Atlas:', err);
    }
}

module.exports = connectToMongo;