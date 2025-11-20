const API_KEY = 'API Key Here';

document.getElementById('analyzeBtn').onclick = async() => {
  const file = document.getElementById('imageUpload').files[0];
  if (!file) return alert('Select an image!');

  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = async (e) => {
    const base64 = e.target.result.split(',')[1];
    const response = await fetch(
          `https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              requests: [{ 
                image: { content: base64 },
                features: [{ type: 'LABEL_DETECTION' }]
              }]
            })
          }
    );
    const data = await response.json();
    const labels = data.responses[0].labelAnnotations;
    
    // Display results
    document.getElementById('results').innerHTML = 
      labels.map(label => `<p>${label.description}</p>`).join('');
  };
};
