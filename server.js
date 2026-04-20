const express = require('express');
const si = require('systeminformation');
const cors = require('cors');
const path = require('path');
const { exec } = require('child_process');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/system', async (req, res) => {
    try {
        const cpu = await si.currentLoad();
        const mem = await si.mem();
        const processes = await si.processes();

        res.json({
            cpu: cpu.currentLoad,
            memory: (mem.used / mem.total) * 100,
            processes: processes.list
                .sort((a, b) => b.cpu - a.cpu)
                .slice(0, 100)
                .map(p => ({
                    pid: p.pid,
                    name: p.name,
                    cpu: p.cpu,
                    mem: p.mem,
                    state: p.state
                }))
        });
    } catch {
        res.status(500).send("Error");
    }
});

app.post('/api/kill/:pid', (req, res) => {
    const pid = req.params.pid;

    exec(`taskkill /PID ${pid} /F`, (err) => {
        if (err) {
            return res.json({
                success: false,
                message: "Cannot terminate system/protected process"
            });
        }
        res.json({ success: true });
    });
});

app.listen(3000, () => console.log("http://localhost:3000"));