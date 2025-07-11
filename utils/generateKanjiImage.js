const { createCanvas } = require('canvas');

/**
 * Gera uma imagem de kanji e retorna o buffer da imagem
 * @param {string} kanji - O caractere kanji para desenhar
 * @returns {Buffer} - Buffer PNG da imagem gerada
 */
function generateKanjiImage(kanji) {
    const canvas = createCanvas(300, 300);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#222222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 200px "Noto Serif JP"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(kanji, canvas.width / 2, canvas.height / 2);

    return canvas.toBuffer('image/png');
}

module.exports = generateKanjiImage;