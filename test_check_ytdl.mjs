import fs from 'fs';
const text = fs.readFileSync('ytdl_log.txt', 'utf16le');
console.log(text.substring(0, 500));
