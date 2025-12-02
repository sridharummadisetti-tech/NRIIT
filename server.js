const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the dist directory created by Vite
app.use(express.static(path.join(__dirname, 'dist')));

// Handle SPA routing: serve index.html for all non-static file requests
// This allows React Router (if used) or client-side routing to work on refresh
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});