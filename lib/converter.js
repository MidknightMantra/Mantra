/**
 * Media Converter Utility
 * Convert audio/video formats using FFmpeg for WhatsApp compatibility
 */

import fs from 'fs';
import path from 'path';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { spawn } from 'child_process';

const ffmpegPath = ffmpegInstaller.path;

/**
 * Generic FFmpeg conversion function
 * @param {Buffer} buffer - Media buffer
 * @param {Array<string>} args - FFmpeg arguments
 * @param {string} ext - Input file extension
 * @param {string} ext2 - Output file extension
 * @returns {Promise<Buffer>} Converted media buffer
 */
export function ffmpeg(buffer, args = [], ext = '', ext2 = '') {
  return new Promise(async (resolve, reject) => {
    try {
      let tmp = path.join(path.dirname(new URL(import.meta.url).pathname), '../src', + new Date + '.' + ext);
      let out = tmp + '.' + ext2;
      await fs.promises.writeFile(tmp, buffer);
      spawn(ffmpegPath, [
        '-y',
        '-i', tmp,
        ...args,
        out
      ])
        .on('error', reject)
        .on('close', async (code) => {
          try {
            await fs.promises.unlink(tmp);
            if (code !== 0) return reject(code);
            resolve(await fs.promises.readFile(out));
            await fs.promises.unlink(out);
          } catch (e) {
            reject(e);
          }
        });
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Convert audio to WhatsApp-playable MP3 format
 * @param {Buffer} buffer - Audio buffer
 * @param {string} ext - Input file extension
 * @returns {Promise<Buffer>} MP3 audio buffer
 */
export function toAudio(buffer, ext) {
  return ffmpeg(buffer, [
    '-vn',
    '-ac', '2',
    '-b:a', '128k',
    '-ar', '44100',
    '-f', 'mp3'
  ], ext, 'mp3');
}

/**
 * Convert audio to WhatsApp PTT (Voice Note) format
 * @param {Buffer} buffer - Audio buffer
 * @param {string} ext - Input file extension
 * @returns {Promise<Buffer>} Opus audio buffer
 */
export function toPTT(buffer, ext) {
  return ffmpeg(buffer, [
    '-vn',
    '-c:a', 'libopus',
    '-b:a', '128k',
    '-vbr', 'on',
    '-compression_level', '10'
  ], ext, 'opus');
}

/**
 * Convert video to WhatsApp-playable MP4 format
 * @param {Buffer} buffer - Video buffer
 * @param {string} ext - Input file extension
 * @returns {Promise<Buffer>} MP4 video buffer
 */
export function toVideo(buffer, ext) {
  return ffmpeg(buffer, [
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-ab', '128k',
    '-ar', '44100',
    '-crf', '32',
    '-preset', 'slow'
  ], ext, 'mp4');
}
