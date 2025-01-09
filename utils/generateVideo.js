import axios from 'axios';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { exec as Exec } from 'child_process';

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

export async function generateVideo(audio_path, destination) {
    const url = `https://api.pexels.com/videos/search?query=${destination}`;
    const videos = await fetchVideos(url);

    if (!Array.isArray(videos) || videos.length === 0) {
        console.error('No videos found.');
        return;
    }

    const audioDuration = await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(audio_path, (err, metadata) => {
            if (err) reject(err);
            resolve(metadata?.format?.duration || 0);
        });
    });

    let currentTime = 0;
    const videoClips = [];
    let indexVideo = 0;

    while (currentTime < audioDuration) {
        const video = videos[indexVideo % videos.length];
        if (!video) break;

        const clipDuration = Math.min(getRandomDuration(), video.duration);
        const outputClipPath = `clip_${indexVideo}.mp4`;

        await new Promise((resolve, reject) => {
            ffmpeg(video.video_files[0].link)
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
    
    const outputVideoPath = `./videos/${destination}.mp4`;
    
    let cmd = `ffmpeg -f concat -i ${listFilePath} -c copy ${outputVideoPath}`;
    Exec(cmd, function(err, stdout, stderr) {
        if(err) console.log(err)
        else console.log("Done!")
    })
}
