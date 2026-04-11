import { exec } from 'child_process';
import path from 'path';

const videoId = 'dQw4w9WgXcQ';
const ytDlpPath = path.join(process.cwd(), 'yt-dlp.exe');
exec("" -g -f bestaudio "https://www.youtube.com/watch?v=", (error, stdout, stderr) => {
  if (error) {
    console.error('Error:', error.message);
    return;
  }
  const url = stdout.trim();
  console.log('Stream URL:', url.substring(0, 80));
});
