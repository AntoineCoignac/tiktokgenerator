import axios from 'axios';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { exec as Exec } from 'child_process';
import { get } from 'http';
import { text } from 'stream/consumers';

ffmpeg.setFfprobePath(ffprobeInstaller.path);
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

async function fetchVideos(url) {
    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: process.env.PEXELS_API_KEY
            }
        });
        return response.data?.videos || [];
    } catch (error) {
        console.error('Error fetching videos from Pexels:', error);
        return [];
    }
}

function getRandomDuration() {
    return Math.floor(Math.random() * 5) + 8;
}

function execPromise(cmd) {
    return new Promise((resolve, reject) => {
        Exec(cmd, (err, stdout, stderr) => {
            if (err) {
                reject(err);
            } else {
                resolve(stdout);
            }
        });
    });
}

async function getAudioDuration(path){
    return await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(path, (err, metadata) => {
            if (err) reject(err);
            resolve(metadata?.format?.duration || 0);
        });
    });
}

export async function generateVideo(audio_path, destination, title, timeToFly, language, sentences) {
    const url = `https://api.pexels.com/videos/search?query=${destination}&size=small`;
    const videos = await fetchVideos(url);

    if (!Array.isArray(videos) || videos.length === 0) {
        console.error('No videos found.');
        return;
    }

    const audioDuration = await getAudioDuration(audio_path);

    let currentTime = 0;
    const videoClips = [];
    let indexVideo = 0;

    while (currentTime < audioDuration) {
        const video = videos[indexVideo % videos.length];
        if (!video) break;

        const clipDuration = Math.min(getRandomDuration(), video.duration);
        const outputClipPath = `clip_${indexVideo}.mp4`;

        await new Promise((resolve, reject) => {
            let hdVideoFile = video.video_files.find(file => file?.quality === 'hd');
            !hdVideoFile && (hdVideoFile = video.video_files[0]);

            ffmpeg(hdVideoFile?.link)
                .complexFilter([
                    '[0:v]scale=1080:1920:force_original_aspect_ratio=increase,' +
                    'crop=1080:1920,pad=1080:1920:0:0,setsar=1,fps=30000/1001[v]'
                ])
                .setDuration(clipDuration)
                .outputOptions('-map [v]')
                .output('./temp/'+outputClipPath)
                .on('end', resolve)
                .on('error', reject)
                .run();
        });

        videoClips.push({
            path: outputClipPath,
            duration: clipDuration
        });

        currentTime += clipDuration;
        indexVideo++;
    }

    // Create a list file for the concat demuxer
    const listFilePath = './temp/mylist.txt';
    fs.writeFileSync(listFilePath, videoClips.map(clip => `file ${clip?.path}`).join('\n'));
    
    const outputVideoPath = `./videos/${destination.replaceAll(" ", "").replaceAll("'", "")}.mp4`;
    
    try {
        let cmd = `ffmpeg -f concat -i ${listFilePath} -c copy ${outputVideoPath}`;
        await execPromise(cmd);
        console.log("First command done!");

        const withoutTextOutputPath = `./videos/withouttext_${destination.replaceAll(" ", "").replaceAll("'", "")}.mp4`;
        cmd = `ffmpeg -i ${outputVideoPath} -i ${audio_path} -map 0:v -map 1:a -c:v copy -shortest ${withoutTextOutputPath}`;
        await execPromise(cmd);
        console.log("Second command done!");

        const sentencesArray = [];
        let totalDuration = 0;

        for (let index = 0; index < sentences.length; index++) {
            const sentence = sentences[index];
            const sentencePath = `./audios/audio_${index}.mp3`;
            const sentenceDuration = await getAudioDuration(sentencePath);
            sentencesArray.push({
                text: sentence,
                start: totalDuration,
                end: totalDuration + sentenceDuration
            });
            fs.unlinkSync(sentencePath);
            totalDuration += sentenceDuration;
        }

        console.log(sentencesArray);

        const argsFilePath = './temp/args.txt';
        const drawtextContent = [
            `drawtext=fontfile='fonts/Roboto-Black.ttf':text='${title}':fontcolor=0xF7F6CF:fontsize=96:shadowcolor=black@0.6:shadowx=4:shadowy=2:x=(w-text_w)/2:y=(h-text_h)/2-20`,
            `drawtext=fontfile='fonts/Roboto-Black.ttf':text='-> ${timeToFly}':fontcolor=0xF7F6CF:fontsize=48:shadowcolor=black@0.6:shadowx=4:shadowy=2:x=(w-text_w)/2:y=(h-text_h)/2+100`,
            `drawtext=fontfile='fonts/Roboto-Black.ttf':text='-> ${language}':fontcolor=0xF7F6CF:fontsize=48:shadowcolor=black@0.6:shadowx=4:shadowy=2:x=(w-text_w)/2:y=(h-text_h)/2+180`/*,
            ...sentencesArray.map(sen => `drawtext=fontfile='fonts/Satoshi-Bold.otf':text='${sen.text.replaceAll(`'`, `՚`)}':fontcolor=white:fontsize=32:shadowcolor=black@0.6:shadowx=4:shadowy=2:x=(w-text_w)/2:y=(h-text_h)/2+400:enable='between(t,${Math.floor(sen.start)},${Math.floor(sen.end)})'`)*/
        ].join(',');

        const finalOutputPath = `./videos/final_${destination.replaceAll(" ", "").replaceAll("'", "")}.mp4`;

        fs.writeFileSync(argsFilePath, `-i ${withoutTextOutputPath} -vf "${drawtextContent}" -codec:a copy ${finalOutputPath}`);

        cmd = `xargs -a ${argsFilePath} ffmpeg`;
        await execPromise(cmd);
        console.log("Text added to video!");

        // Delete temporary files
        fs.unlinkSync(listFilePath);
        videoClips.forEach(clip => fs.unlinkSync(`./temp/${clip.path}`));
        fs.unlinkSync(outputVideoPath);
        fs.unlinkSync(withoutTextOutputPath);
        fs.unlinkSync(audio_path);
        fs.unlinkSync(argsFilePath);

        console.log('Temporary files deleted.');
    } catch (err) {
        console.error('Error generating video:', err);
    }
}
