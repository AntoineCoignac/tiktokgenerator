import { generateAudio } from "./utils/generateAudio.js";
import { generateText } from "./utils/generateText.js";
import dotenv from 'dotenv';
import { generateVideo } from "./utils/generateVideo.js";

dotenv.config();

const destination = process.argv[2];

const title = process.argv[3];
const timeToFly = process.argv[4];
const language = process.argv[5];

if (!destination) {
    console.error('Please provide a destination name as a command-line argument.');
    process.exit(1);
}

generateText(title).then((text) => {
    console.log(text);
    const sentences = text.split('\n').flatMap(sentence => sentence.split('. ')).filter(sentence => sentence.length > 0);
    const correctedSentences = sentences.map(sentence => sentence.endsWith('.') ? sentence : sentence + '.');
    console.log(correctedSentences);
    correctedSentences.forEach((sentence, index) => {
        generateAudio(sentence, `audio_${index}`).then((audioFile) => {
            console.log(`Audio file generated for sentence ${index}: ${audioFile}`);
        }).catch((error) => {
            console.error(`Error generating audio for sentence ${index}:`, error);
        });
    });
    generateAudio(text, "audio").then((audioFile) => {
        console.log(`Audio file generated: ${audioFile}`);
        generateVideo(audioFile, destination, title, timeToFly, language, correctedSentences).then(() => {
            console.log('Video generated successfully.');
        }).catch((error) => {         
            console.error('Error generating video:', error);
        });
    }).catch((error) => {
        console.error('Error:', error);
    });
}).catch((error) => {
    console.error('Error:', error);
});

