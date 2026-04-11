const ANDROID_KEY = "AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w";
const payload = {
  videoId: "dQw4w9WgXcQ",
  context: {
    client: { clientName: "IOS", clientVersion: "17.13.3", hl: "en" }
  }
};
fetch("https://music.youtube.com/youtubei/v1/player?key=" + ANDROID_KEY, {
  method: "POST",
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36"
  },
  body: JSON.stringify(payload)
}).then(r => r.json()).then(data => {
  console.log("Status:", data.playabilityStatus?.status);
  const audio = (data.streamingData?.adaptiveFormats || []).find(f => f.mimeType && f.mimeType.includes("audio"));
  if (audio?.url) console.log("Direct URL obtained!");
  else if (audio?.signatureCipher) console.log("Has cipher");
}).catch(console.error);
