fetch('http://localhost:5173/api/ytmusic/trending')
  .then(r => r.json())
  .then(d => {
    console.log("Returned size:", d.length);
    if (d.length > 0) {
      console.log("FIRST ITEM:", JSON.stringify(d[0], null, 2));
    }
  }).catch(e => console.error("Error:", e.message));
