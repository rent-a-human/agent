import { useEffect, useState } from 'react';
import { getApiUrl } from '../../config';

interface Task {
    id: string;
    level: number;
    description: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'TESTING' | 'DEPLOYING' | 'BLOCKED';
    blockedReason?: string;
}

export const TasksOverlay = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [responses, setResponses] = useState<Record<string, string>>({});

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const res = await fetch(getApiUrl('/tasks'));
                const json = await res.json();
                if (json.success) {
                    setTasks(json.tasks);
                }
            } catch (err) {
                // Silently fail if api is unreachable
            }
        };

        fetchTasks();
        const interval = setInterval(fetchTasks, 5000);
        return () => clearInterval(interval);
    }, []);

    const activeTasks = tasks.filter(t => ['PENDING', 'IN_PROGRESS', 'BLOCKED'].includes(t.status));

    if (activeTasks.length === 0) return null;

    const handleSubmitResponse = async (taskId: string) => {
        const response = responses[taskId];
        if (!response) return;

        try {
            await fetch(getApiUrl(`/tasks/${taskId}/respond`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ response })
            });
            // Clear the local input
            setResponses(prev => {
                const updated = { ...prev };
                delete updated[taskId];
                return updated;
            });
        } catch (err) {
            console.error("Failed to submit response", err);
        }
    };

    return (
        <div className="absolute top-20 right-4 z-40 w-80 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 p-4 shadow-2xl transition-all max-h-[60vh] overflow-y-auto pointer-events-auto">
            <h3 className="text-white/80 font-semibold mb-3 text-sm uppercase tracking-wider">Active Tasks</h3>
            <div className="space-y-3">
                {activeTasks.map(task => (
                    <div key={task.id} className="bg-white/5 rounded p-3 text-sm border border-white/5 hover:bg-white/10 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-white/40 text-[10px] font-mono truncate max-w-[60%] leading-tight">{task.id}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold
                                ${task.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                                  task.status === 'FAILED' ? 'bg-red-500/20 text-red-400' :
                                  task.status === 'BLOCKED' ? 'bg-orange-500/20 text-orange-400 animate-pulse' :
                                  task.status === 'IN_PROGRESS' ? 'bg-blue-500/20 text-blue-400' :
                                  'bg-yellow-500/20 text-yellow-400'}`}>
                                {task.status}
                            </span>
                        </div>
                        <p className="text-white/90 line-clamp-2 leading-relaxed" style={{ overflow: 'auto' }}>{task.description}</p>
                        
                        {task.status === 'BLOCKED' && task.blockedReason && (
                            <div className="mt-3 p-2 bg-black/40 rounded border border-orange-500/30">
                                <p className="text-orange-300 text-xs mb-2 flex gap-2 items-start">
                                    <span className="shrink-0 mt-0.5">⚠️</span>
                                    <span>{task.blockedReason}</span>
                                </p>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        className="flex-1 bg-black/50 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-orange-500/50"
                                        placeholder="Type reply..."
                                        value={responses[task.id] || ''}
                                        onChange={(e) => setResponses(prev => ({ ...prev, [task.id]: e.target.value }))}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSubmitResponse(task.id);
                                        }}
                                    />
                                    <button 
                                        onClick={() => handleSubmitResponse(task.id)}
                                        className="bg-orange-600 hover:bg-orange-500 text-white px-3 py-1 rounded text-xs transition-colors shrink-0"
                                    >
                                        Reply
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
