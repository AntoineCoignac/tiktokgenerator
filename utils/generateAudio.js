import gTTs from 'gtts';

export async function generateAudio(text, destination) {
    const gtts = new gTTs(text, 'fr');
    const output = `./audios/${destination}.mp3`;

    return new Promise((resolve, reject) => {
        gtts.save(output, function (err, result) {
            if (err) {
                reject(null);
            } else {
                resolve(output);
            }
        });
    });
}