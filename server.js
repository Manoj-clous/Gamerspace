const express = require('express');
const { execFile } = require('child_process');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(__dirname));

const backendExe = path.join(__dirname, 'backend.exe');

app.get('/api/score', (req, res) => {
    const { game } = req.query;
    if (!game) return res.status(400).json({ error: "Game parameter required" });

    execFile(backendExe, ['get', game], (error, stdout, stderr) => {
        if (error) {
            console.error(`Backend GET error: ${error.message} - ${stderr}`);
            return res.status(500).json({ error: "Backend error" });
        }
        res.json({ score: parseInt(stdout.trim(), 10) });
    });
});

app.post('/api/score', (req, res) => {
    const { game, score } = req.body;
    if (!game || score === undefined) return res.status(400).json({ error: "Game and score required" });

    execFile(backendExe, ['set', game, score.toString()], (error, stdout, stderr) => {
        if (error) {
            console.error(`Backend SET error: ${error.message} - ${stderr}`);
            return res.status(500).json({ error: "Backend error" });
        }
        res.json({ score: parseInt(stdout.trim(), 10) });
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`C-Powered Backend Server running on http://localhost:${PORT}`);
});
