// 1. Mock DB: Developer file ownership mapping
const developerMap = {
    'Suresh': { role: 'Frontend Lead', files: ['cart.js', 'checkout.jsx', 'ui.css'] },
    'Rahul': { role: 'Security & Payments', files: ['auth.ts', 'payment_gateway.py', 'server.js'] },
    'Priya': { role: 'Database Admin', files: ['schema.sql', 'db_migrate.py', 'queries.js'] },
    'Anita': { role: 'Fullstack Eng', files: ['app.jsx', 'utils.js', 'config.json'] },
    'David': { role: 'Mobile Dev', files: ['app.tsx', 'android_build.gradle', 'ios_info.plist'] },
    'Sarah': { role: 'DevOps & Infra', files: ['Dockerfile', 'kubernetes.yaml', 'nginx.conf'] },
    'Alex': { role: 'Backend API', files: ['api.py', 'routes.js', 'controllers.js'] }
};

// Global State
let incomingBugsQueue = [];
let bugCounter = 1001;

// 2. AI Logic for Bug Parsing
async function analyzeBugReport(text) {
    let aiConfig = null;

    try {
        const response = await fetch('/api/triage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.aiConfig) {
                aiConfig = data.aiConfig;
            }
        } else {
            console.error("Backend API returned non-OK status:", response.status);
        }
    } catch (e) {
        console.error("Backend API Error or Parse Error", e);
        // fallback to mock below
    }

    const lowerText = text.toLowerCase();
    let priority = aiConfig?.priority || 'P2';
    let category = aiConfig?.category || 'Unknown';
    let assignedDev = aiConfig?.assignedDev || 'Unassigned';
    let rootCause = aiConfig?.rootCause || 'Requires manual investigation.';
    let foundFile = aiConfig?.component || aiConfig?.foundFile || null;

    // If no AI fallback, determine mock Priority & Category
    if (!aiConfig) {
        if (lowerText.includes('crash') || lowerText.includes('500') || lowerText.includes('critical') || lowerText.includes('uncaught typeerror')) {
            priority = 'P0';
        } else if (lowerText.includes('fails') || lowerText.includes('not working') || lowerText.includes('timeout')) {
            priority = 'P1';
        } else if (lowerText.includes('typo') || lowerText.includes('alignment')) {
            priority = 'P3';
        }

        if (lowerText.includes('ui') || lowerText.includes('css') || lowerText.includes('button') || lowerText.includes('.js') || lowerText.includes('.jsx')) {
            category = 'Frontend';
        }
        if (lowerText.includes('api') || lowerText.includes('py') || lowerText.includes('server') || lowerText.includes('500')) {
            category = 'Backend';
        }
        if (lowerText.includes('sql') || lowerText.includes('db') || lowerText.includes('query')) {
            category = 'DB';
        }
        if (lowerText.includes('mobile') || lowerText.includes('ios') || lowerText.includes('android')) {
            category = 'Mobile';
        }
        if (lowerText.includes('docker') || lowerText.includes('kubernetes') || lowerText.includes('deploy')) {
            category = 'DevOps';
        }

        // Determine File mention
        const allFiles = Object.values(developerMap).flatMap(d => d.files);
        for (const file of allFiles) {
            if (lowerText.includes(file)) {
                foundFile = file;
                break;
            }
        }

        // Generate simulated Root Cause
        if (foundFile) {
            rootCause = `Potential fault located in \`${foundFile}\`. The stack trace or description heavily implicates a recent change to this module.`;
        } else {
            rootCause = `Semantic analysis suggests a malfunction in the ${category} layer. Unable to pin point exact file.`;
        }
    }

    // Determine Developer Assignment based on the found file if not set by AI
    if (foundFile && assignedDev === 'Unassigned') {
        for (const [dev, data] of Object.entries(developerMap)) {
            if (data.files.some(f => foundFile.toLowerCase().includes(f.toLowerCase()) || f.toLowerCase().includes(foundFile.toLowerCase()))) {
                assignedDev = dev;
                break;
            }
        }
    }

    // Default assignee fallback if no exact file was identified
    if (assignedDev === 'Unassigned') {
        if (lowerText.includes('payment') || lowerText.includes('403 forbidden')) {
            assignedDev = 'Rahul';
            category = 'Backend';
        } else if (category === 'Mobile') {
            assignedDev = 'David';
        } else if (category === 'DevOps') {
            assignedDev = 'Sarah';
        } else if (category === 'Backend') {
            assignedDev = 'Alex';
        } else if (category === 'Frontend') {
            assignedDev = 'Suresh';
        } else if (category === 'DB') {
            assignedDev = 'Priya';
        }
    }

    return {
        id: `BUG-${bugCounter++}`,
        priority,
        category,
        assignedDev,
        rootCause,
        foundFile,
        timestamp: new Date().toLocaleTimeString(),
        isAiTriaged: !!aiConfig,
        status: 'Not Completed'
    };
}

// 3. UI Interactions & App Logic
document.addEventListener('DOMContentLoaded', () => {

    // Tab Navigation
    const navLinks = document.querySelectorAll('.nav-links li');
    const views = document.querySelectorAll('.view');

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            // Remove active from all
            navLinks.forEach(nl => nl.classList.remove('active'));
            views.forEach(v => v.classList.remove('active', 'hidden'));

            // Add active to clicked
            link.classList.add('active');
            const targetId = link.getAttribute('data-tab');
            document.getElementById(targetId).classList.add('active');

            // Hide others completely (for accessibility & layout)
            views.forEach(v => {
                if (v.id !== targetId) v.classList.add('hidden');
            });
        });
    });

    // Populate Dev Map
    const devMapGrid = document.getElementById('dev-map-grid');
    const colors = [
        { bg: 'linear-gradient(135deg, #f59e0b, #ef4444)', shadow: 'rgba(239,68,68,0.4)' },
        { bg: 'linear-gradient(135deg, #10b981, #059669)', shadow: 'rgba(16,185,129,0.4)' },
        { bg: 'linear-gradient(135deg, #3b82f6, #6366f1)', shadow: 'rgba(59,130,246,0.4)' },
        { bg: 'linear-gradient(135deg, #ec4899, #8b5cf6)', shadow: 'rgba(236,72,153,0.4)' },
        { bg: 'linear-gradient(135deg, #06b6d4, #2563eb)', shadow: 'rgba(6,182,212,0.4)' },
        { bg: 'linear-gradient(135deg, #8b5cf6, #d946ef)', shadow: 'rgba(139,92,246,0.4)' }
    ];
    let colorIndex = 0;

    Object.entries(developerMap).forEach(([dev, info]) => {
        const char = dev.charAt(0);
        const color = colors[colorIndex % colors.length];
        colorIndex++;
        const filesHtml = info.files.map(f => `<span class="file-tag">${f}</span>`).join('');

        devMapGrid.innerHTML += `
            <div class="dev-card">
                <div class="dev-avatar" style="background: ${color.bg}; box-shadow: 0 4px 15px ${color.shadow};">${char}</div>
                <h3>${dev}</h3>
                <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px;">${info.role}</p>
                <div class="dev-files">${filesHtml}</div>
            </div>
        `;
    });

    // Handle Bug Submission
    const submitBtn = document.getElementById('submit-bug');
    const bugInput = document.getElementById('bug-input');
    const actionLogContainer = document.getElementById('action-log-container');
    const actionLog = document.getElementById('action-log');

    submitBtn.addEventListener('click', async () => {
        const text = bugInput.value.trim();
        if (!text) return;

        submitBtn.disabled = true;
        actionLogContainer.classList.remove('hidden');
        actionLog.innerHTML = '';

        // 4. Simulated GitHub Actions Flow
        const addLog = (msg, status = 'done') => {
            const li = document.createElement('li');
            li.className = `action-item ${status}`;
            const icon = status === 'analyzing' ? '⚙️' : '✅';
            li.innerHTML = `<i>${icon}</i> <span>${msg}</span>`;
            actionLog.appendChild(li);
        };

        addLog('🔍 Agent 1 (Triage): Analyzing impact...', 'analyzing');

        // Simulate network/AI delay or wait for actual fetch
        const result = await analyzeBugReport(text);
        actionLog.innerHTML = ''; // Clear analyzing


        addLog(`🔍 Agent 1 (Triage): Analyzing impact and setting Priority to <span class="tag tag-${result.priority.toLowerCase()}">${result.priority}</span>`);

        await new Promise(r => setTimeout(r, 1000));
        addLog(`🛡️ Agent 2 (Investigator): Mapping technical context to Developer Ownership...`);

        await new Promise(r => setTimeout(r, 1000));
        addLog(`🎫 Ticket System: Successfully raised ticket #${result.id} and assigned to <b>@${result.assignedDev}</b>.`);

        await new Promise(r => setTimeout(r, 1000));
        addLog(`✅ GitHub Bot: Posted AI Root Cause Analysis to the repository.`);


        // Store result
        incomingBugsQueue.unshift(result);

        // Simulate Status Change after 8 seconds
        setTimeout(() => {
            const bugIndex = incomingBugsQueue.findIndex(b => b.id === result.id);
            if (bugIndex !== -1) {
                incomingBugsQueue[bugIndex].status = 'Completed Successfully';
                updateIncomingBugsTable();
            }
        }, 8000);

        // Update Triage Status View
        updateTriageStatus(result);
        // Update Table
        updateIncomingBugsTable();

        submitBtn.disabled = false;

        setTimeout(() => {
            bugInput.value = '';
            // Optionally auto-nav to Triage Status
            document.querySelector('[data-tab="triage-status"]').click();
        }, 1500);
    });

    function updateTriageStatus(data) {
        const container = document.getElementById('latest-triage');
        container.innerHTML = `
            <div class="glass-panel text-left triage-card fadeIn">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="font-size: 1.5rem; color: var(--accent-color);">${data.id} Triaged</h3>
                    <span style="font-size: 0.85rem; color: var(--text-secondary);">${data.timestamp}</span>
                </div>
                
                <div class="triage-grid">
                    <div class="triage-detail-box">
                        <h4>Priority</h4>
                        <span class="tag tag-${data.priority.toLowerCase()}">${data.priority}</span>
                    </div>
                    <div class="triage-detail-box">
                        <h4>Category</h4>
                        <span class="tag" style="background: rgba(255,255,255,0.1); border: 1px solid var(--glass-border);">${data.category}</span>
                    </div>
                    <div class="triage-detail-box">
                        <h4>Assigned Dev</h4>
                        <span style="font-weight: 600; color: #fff;">🧑‍💻 ${data.assignedDev}</span>
                    </div>
                </div>

                <div class="triage-detail-box" style="margin-top: 10px;">
                    <h4>${data.isAiTriaged ? '✨ Gemini AI Root Cause Analysis' : 'Heuristic Root Cause Analysis'}</h4>
                    <p style="line-height: 1.5; color: var(--text-primary); font-family: monospace;">> ${data.rootCause}</p>
                </div>
            </div>
        `;
    }

    function updateIncomingBugsTable() {
        const tbody = document.getElementById('bugs-tbody');
        tbody.innerHTML = '';

        incomingBugsQueue.forEach(bug => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="color: var(--accent-color); font-weight: 600;">${bug.id}</td>
                <td><span class="tag tag-${bug.priority.toLowerCase()}">${bug.priority}</span></td>
                <td>${bug.category}</td>
                <td style="font-family: monospace; color: var(--text-secondary);">${bug.foundFile || 'N/A'}</td>
                <td>${bug.assignedDev}</td>
                <td><span class="tag tag-${bug.status === 'Completed Successfully' ? 'completed' : 'not-completed'}">${bug.status}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Settings Logic
    const apiKeyInput = document.getElementById('gemini-key');
    const saveKeyBtn = document.getElementById('save-key-btn');
    const saveStatus = document.getElementById('save-status');

    if (localStorage.getItem('gemini_api_key')) {
        apiKeyInput.value = localStorage.getItem('gemini_api_key');
    }

    if (saveKeyBtn) {
        saveKeyBtn.addEventListener('click', () => {
            const key = apiKeyInput.value.trim();
            if (key) {
                localStorage.setItem('gemini_api_key', key);
                saveStatus.textContent = 'Key saved securely in your browser.';
                saveStatus.style.color = 'var(--priority-p3)';
                saveStatus.style.display = 'block';
            } else {
                localStorage.removeItem('gemini_api_key');
                saveStatus.textContent = 'Key removed from local storage.';
                saveStatus.style.color = 'var(--priority-p1)';
                saveStatus.style.display = 'block';
            }
            setTimeout(() => saveStatus.style.display = 'none', 3000);
        });
    }

    // --- Live AI Simulation ---
    const feedContainer = document.getElementById('ai-feed');
    const statTotal = document.getElementById('stat-total');
    let totalBugs = 42091;

    const dummyLogs = [
        { text: "Anomaly in payment flow. Routing to Rahul.", class: "feed-p0", keyword: "P0" },
        { text: "Duplicate detected (issue #891). Merging automatically.", class: "feed-item", keyword: "INFO" },
        { text: "High latency in Redis. Re-assigned to Priya.", class: "feed-p1", keyword: "P1" },
        { text: "Jenkins build failure analyzed. Root cause identified.", class: "feed-p1", keyword: "P1" },
        { text: "Auto-resolved minor CSS discrepancy.", class: "feed-item", keyword: "P3" },
        { text: "System memory spike in kubernetes. Routing to Sarah.", class: "feed-p0", keyword: "P0" }
    ];

    if (feedContainer) {
        setInterval(() => {
            const log = dummyLogs[Math.floor(Math.random() * dummyLogs.length)];
            const el = document.createElement('div');
            el.className = `feed-item ${log.class || ''}`;
            el.innerHTML = `[${new Date().toLocaleTimeString()}] <strong style="color:var(--accent-color)">${log.keyword}</strong>: ${log.text}`;
            
            feedContainer.prepend(el);
            if(feedContainer.children.length > 6) feedContainer.lastChild.remove();
            
            totalBugs += Math.floor(Math.random() * 3);
            if(statTotal) statTotal.textContent = totalBugs.toLocaleString();
        }, 3000);
    }
});

// --- tsParticles Fluid / Water Network Animation ---
if (typeof tsParticles !== 'undefined') {
    tsParticles.load("tsparticles", {
        background: { color: { value: "transparent" } },
        fpsLimit: 60,
        interactivity: {
            events: {
                onHover: { enable: true, mode: "grab" },
                resize: true
            },
            modes: {
                grab: { distance: 250, links: { opacity: 0.6, color: "#06b6d4" } }
            }
        },
        particles: {
            color: { value: ["#06b6d4", "#8b5cf6"] },
            links: { color: "random", distance: 150, enable: true, opacity: 0.3, width: 2 },
            move: { direction: "none", enable: true, outModes: { default: "bounce" }, random: true, speed: 0.8, straight: false },
            number: { density: { enable: true, area: 800 }, value: 70 },
            opacity: { value: 0.6 },
            shape: { type: "circle" },
            size: { value: { min: 2, max: 4 } }
        },
        detectRetina: true
    });
}
