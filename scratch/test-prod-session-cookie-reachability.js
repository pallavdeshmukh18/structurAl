const https = require('https');

async function testSession() {
  console.log('Testing session flow on production backend...');
  const backendUrl = 'https://structur-al-4m32.onrender.com';
  
  // We can't easily trigger the GitHub OAuth flow without a real user, 
  // but we can check if the server sets a session on a request that might initialize it.
  // Wait, express-session with saveUninitialized: false won't set a cookie unless session is modified.
  // Is there any public endpoint that modifies the session? No.
  
  // So we just check the health endpoint to see if the server is even reachable.
  try {
    const res = await fetch(`${backendUrl}/api/health`);
    console.log(`Health status: ${res.status}`);
    const text = await res.text();
    console.log(`Health body: ${text}`);
  } catch (err) {
    console.error(`Failed to reach health endpoint:`, err.message);
  }
}

testSession();
