import { generateAudio } from "./utils/generateAudio.js";
import { generateText } from "./utils/generateText.js";
import dotenv from 'dotenv';
import { generateVideo } from "./utils/generateVideo.js";

dotenv.config();

const destination = process.argv[2];

if (!destination) {
    console.error('Please provide a destination name as a command-line argument.');
    process.exit(1);
}


generateText(destination).then((text) => {
    console.log(text);
    generateAudio(text, destination).then((audioFile) => {
        console.log(`Audio file generated: ${audioFile}`);
        generateVideo(audioFile, destination).then(() => {
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

