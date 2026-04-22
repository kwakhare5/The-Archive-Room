import { WebSocketServer } from 'ws';

const PORT = 8765;
const wss = new WebSocketServer({ port: PORT });

console.log(`Backend Brain active on ws://localhost:${PORT}`);
console.log("Waiting for The Archive Room UI to connect...");

const FURNITURE_TARGETS = [
    'pc_1',
    'pc_2',
    'sofa_top',
    'purge_bin'
];

const COMMANDS = [
    'RAG_SEARCH',
    'FETCH_MEMORY',
    'THINK',
    'TRIM_CONTEXT',
    'GENERATE_CODE',
    'WAIT'
];

// Track agent states to prevent command collisions
const agentStatus = new Map(); // agentId -> { status: 'IDLE' | 'MOVING' | 'WORKING', lastTarget: string }

wss.on('connection', (ws) => {
    console.log("--- [UI Connected] ---");

    ws.on('message', (data) => {
        const event = JSON.parse(data);
        console.log(`[Event Received] ${event.event}:`, event);

        if (event.event === 'CONNECTION_READY') {
            // Register agents and start the first command for each
            event.agents.forEach(id => {
                agentStatus.set(id, { status: 'IDLE', lastTarget: null });
                sendNextCommand(ws, id);
            });
        }

        if (event.event === 'AGENT_ARRIVED') {
            const status = agentStatus.get(event.agentId);
            if (status) {
                console.log(`Agent ${event.agentId} arrived at ${event.target}. Starting work...`);
                status.status = 'WORKING';
                
                // Simulate work duration before sending back to seat or next task
                setTimeout(() => {
                    console.log(`Agent ${event.agentId} finished work. Moving to next task.`);
                    status.status = 'IDLE';
                    sendNextCommand(ws, event.agentId);
                }, 4000);
            }
        }
    });

    ws.on('close', () => {
        console.log("--- [UI Disconnected] ---");
        agentStatus.clear();
    });
});

function sendNextCommand(ws, agentId) {
    const status = agentStatus.get(agentId);
    if (!status || status.status !== 'IDLE') return;

    // Pick a command
    const cmd = COMMANDS[Math.floor(Math.random() * COMMANDS.length)];
    
    // Pick a target that is DIFFERENT from the last one (to force walking)
    let target = status.lastTarget;
    while (target === status.lastTarget) {
        target = FURNITURE_TARGETS[Math.floor(Math.random() * FURNITURE_TARGETS.length)];
    }

    console.log(`Sending Command to Agent ${agentId}: ${cmd} at ${target}`);
    
    const msg = JSON.stringify({
        event: 'COMMAND',
        agentId: agentId,
        command: cmd,
        target: target
    });

    ws.send(msg);
    status.status = 'MOVING';
    status.lastTarget = target;
}
