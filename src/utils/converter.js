import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import ffmpeg from 'fluent-ffmpeg';
import { log } from './logger.js';

/**
 * Get buffer from URL
 * @param {string} url 
 * @param {object} options 
 */
export const getBuffer = async (url, options = {}) => {
    try {
        const res = await axios({
            method: "get",
            url,
            headers: {
                'DNT': 1,
                'Upgrade-Insecure-Requests': 1
            },
            ...options,
            responseType: 'arraybuffer'
        });
        return res.data;
    } catch (e) {
        log.error(`getBuffer error: ${e}`);
        return null;
    }
};

/**
 * Convert buffer to file
 * @param {Buffer} buffer 
 * @param {string} ext 
 */
const bufferToFile = async (buffer, ext) => {
    const filename = path.join('./temp_media', Date.now() + '.' + ext);
    if (!fs.existsSync('./temp_media')) fs.mkdirSync('./temp_media');
    await fs.promises.writeFile(filename, buffer);
    return filename;
};

/**
 * Convert Audio to PTT (OGG Opus)
 * @param {Buffer} buffer 
 * @param {String} ext 
 */
export const toPtt = async (buffer, ext = 'mp3') => {
    return new Promise(async (resolve, reject) => {
        try {
            const inputPath = await bufferToFile(buffer, ext);
            const outputPath = inputPath.replace('.' + ext, '.ogg');

            ffmpeg(inputPath)
                .outputOptions([
                    '-vn',
                    '-c:a', 'libopus',
                    '-b:a', '128k',
                    '-vbr', 'on',
                    '-compression_level', '10'
                ])
                .toFormat('ogg')
                .save(outputPath)
                .on('error', (err) => {
                    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                    reject(err);
                })
                .on('end', async () => {
                    const buff = await fs.promises.readFile(outputPath);
                    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                    resolve(buff);
                });
        } catch (e) {
            reject(e);
        }
    });
};

/**
 * Convert to Audio (MP3)
 * @param {Buffer} buffer 
 * @param {String} ext 
 */
export const toAudio = async (buffer, ext = 'mp4') => {
    return new Promise(async (resolve, reject) => {
        try {
            const inputPath = await bufferToFile(buffer, ext);
            const outputPath = inputPath.replace('.' + ext, '.mp3');

            ffmpeg(inputPath)
                .outputOptions([
                    '-vn',
                    '-c:a', 'libmp3lame',
                    '-b:a', '128k'
                ])
                .toFormat('mp3')
                .save(outputPath)
                .on('error', (err) => {
                    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                    reject(err);
                })
                .on('end', async () => {
                    const buff = await fs.promises.readFile(outputPath);
                    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                    resolve(buff);
                });
        } catch (e) {
            reject(e);
        }
    });
};

/**
 * Convert to Video (MP4)
 * @param {Buffer} buffer 
 * @param {String} ext 
 */
export const toVideo = async (buffer, ext = 'webp') => {
    return new Promise(async (resolve, reject) => {
        try {
            const inputPath = await bufferToFile(buffer, ext);
            const outputPath = inputPath.replace('.' + ext, '.mp4');

            ffmpeg(inputPath)
                .outputOptions([
                    '-c:v', 'libx264',
                    '-c:a', 'aac',
                    '-ab', '128k',
                    '-ar', '44100',
                    '-crf', '32',
                    '-preset', 'ultrafast' // Optimized for speed
                ])
                .toFormat('mp4')
                .save(outputPath)
                .on('error', (err) => {
                    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                    reject(err);
                })
                .on('end', async () => {
                    const buff = await fs.promises.readFile(outputPath);
                    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                    resolve(buff);
                });
        } catch (e) {
            reject(e);
        }
    });
};

/**
 * Convert Sticker to Image
 * @param {Buffer} buffer 
 */
export const stickerToImage = async (buffer) => {
    return new Promise(async (resolve, reject) => {
        try {
            const inputPath = await bufferToFile(buffer, 'webp');
            const outputPath = inputPath.replace('.webp', '.png');

            ffmpeg(inputPath)
                .on('error', reject)
                .on('end', async () => {
                    const buff = await fs.promises.readFile(outputPath);
                    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                    resolve(buff);
                })
                .save(outputPath);
        } catch (e) {
            reject(e);
        }
    });
};

/**
 * Run FFmpeg command
 */
export const runFFmpeg = async (input, output, size = 320, fps = 15, duration = 10) => {
    return new Promise((resolve, reject) => {
        ffmpeg(input)
            .size(`${size}x${size}`)
            .fps(fps)
            .duration(duration)
            .on('error', reject)
            .on('end', () => resolve(output))
            .save(output);
    });
};

/**
 * Get Video Duration
 */
export const getVideoDuration = async (file) => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(file, (err, metadata) => {
            if (err) resolve(0); // Fallback to 0 if ffprobe fails or no duration
            resolve(metadata?.format?.duration || 0);
        });
    });
};

/**
 * Format bytes to human readable string
 */
export const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Runtime formatter
 */
export const runtime = (seconds) => {
    seconds = Number(seconds);
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor(seconds % (3600 * 24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);
    return `${d > 0 ? d + 'd ' : ''}${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'm ' : ''}${s > 0 ? s + 's' : ''}`;
};

// Aliases for compatibility
export const formatAudio = toAudio;
export const formatVideo = toVideo;

export default {
    getBuffer,
    toPtt,
    toAudio,
    toVideo,
    stickerToImage,
    runFFmpeg,
    getVideoDuration,
    formatAudio,
    formatVideo,
    formatBytes,
    runtime
};
