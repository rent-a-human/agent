import Agent, { type AppConfig } from 'agent-neo';
import { useStore } from '../../store/useStore';

export const AgentOverlay = () => {
    // If VITE_API_URL is supplied (i.e. Railway URL in GitHub Pages), use it explicitly. Otherwise (local dev) fallback to relative proxy.
    const apiUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : '';

    const agentConfig: AppConfig = {
        showStopButton: true,
        agentName: 'Jarvis',
        mcpServers: [apiUrl ? `${apiUrl}/mcp/sse` : '/mcp/sse'],
        actionLabel: 'Commands',
        systemRole: `You are Jarvis, a highly capable AI assistant controlling a 3D dashboard.
        CRITICAL DIRECTIVES:
        1. Fulfill requests smoothly.
        2. When asked to talk to Eve or focus on Eve, trigger the focusAssistant tool.
        3. Be concise and professional.`,
        initialStepId: 'welcome',
        intents: [
            {
                keywords: ['talk to eve', 'eve', 'focus eve', 'show eve'],
                nextStepId: 'focus_eve_step'
            },
            {
                keywords: ['reset camera', 'unfocus', 'back to desk', 'dashboard'],
                nextStepId: 'reset_camera_step'
            }
        ],
        workflow: [
            {
                id: 'welcome',
                message: 'Systems online. How may I assist you?',
                options: [
                    { label: "Talk to Eve", nextStepId: 'focus_eve_step' },
                    { label: "Reset View", nextStepId: 'reset_camera_step' }
                ]
            },
            {
                id: 'focus_eve_step',
                message: 'Initiating connection with Eve...',
                triggerAction: 'focusAssistant',
                actionType: 'api',
                // CAM_POS: -5.38, 1.10, 3.37 tracking LOOK_AT: -4.02, 0.00, -1.44
                // Vector FROM lookAT TO camera: dx=-1.36, dz=4.81
                fixedPayload: { targetId: 'eve', position: [-4.02, 0.00, -1.44], radius: 5.0, theta: -0.275, camY: 1.10 },
                nextStepId: 'eve_ready'
            },
            {
                id: 'eve_ready',
                message: 'Eve is listening.',
                options: [
                    { label: "Reset View", nextStepId: 'reset_camera_step' }
                ]
            },
            {
                id: 'reset_camera_step',
                message: 'Resetting camera view to manual mode.',
                triggerAction: 'resetCamera',
                actionType: 'api',
                nextStepId: 'welcome'
            }
        ],
        llms: [
            { name: "Local Agent (minimax)", provider: 'api-llm', apiKey: 'none', baseUrl: apiUrl ? `${apiUrl}/agent` : import.meta.env.BASE_URL + 'local-api/agent' },
            { name: "Gemini 2.5 Flash", provider: 'gemini', model: 'gemini-2.5-flash', apiKey: localStorage.getItem('GEMINI_API_KEY') || import.meta.env.VITE_GEMINI_API || '', baseUrl: import.meta.env.DEV ? '/gemini-api/v1beta/models' : 'https://generativelanguage.googleapis.com/v1beta/models' },
            { name: "Claude 3.5 Sonnet", provider: 'claude', model: 'claude-3-5-sonnet-20240620', apiKey: localStorage.getItem('CLAUDE_API_KEY') || import.meta.env.VITE_CLAUDE_API || '', baseUrl: import.meta.env.DEV ? '/claude-api/v1/messages' : 'https://api.anthropic.com/v1/messages' },
            { name: "Grok 2.0", provider: 'xai', model: 'grok-2-latest', apiKey: localStorage.getItem('XAI_API_KEY') || import.meta.env.VITE_XAI_API_KEY || '', baseUrl: import.meta.env.DEV ? '/xai-api/v1/chat/completions' : 'https://api.x.ai/v1/chat/completions' }
        ],
        endpoints: [
            {
                name: 'focusAssistant',
                description: 'Gradually displaces the camera to focus on an assistant in the 3D scene.',
                handler: (payload: any) => {
                    const { position, radius, theta, camY } = payload;
                    if (position) {
                        useStore.getState().setCameraGoal({
                            target: { x: position[0], y: position[1], z: position[2] }, // Exact target
                            radius: radius ?? 3.5, 
                            theta: theta ?? -0.2,
                            camY: camY // Can be undefined, handled gracefully by CameraController
                        });
                        // Ensure Eve is visible if we want to talk to her
                        if (payload.targetId === 'eve') {
                            useStore.getState().setShowRealisticAssistant(true);
                        }
                        return { success: true, message: `Focused on ${payload.targetId}` };
                    }
                    return { success: false, message: 'Position required' };
                }
            },
            {
                name: 'resetCamera',
                description: 'Releases the camera from cinematic tracking.',
                handler: () => {
                    useStore.getState().setCameraGoal(null);
                    return { success: true, message: 'Camera released' };
                }
            }
        ]
    };

    return (
        <div style={{ position: 'absolute', zIndex: 50 }}>
            {/* The agent-neo CSS usually positions its toggle/window absolutely. We just wrap it here. */}
            <Agent config={agentConfig} />
        </div>
    );
};
