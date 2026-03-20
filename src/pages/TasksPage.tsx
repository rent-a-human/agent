import { useEffect, useState, useRef } from 'react';
import { getApiUrl } from '../config';
import { Loader2, RefreshCcw, CheckCircle2, XCircle, Clock, AlertCircle, TerminalSquare, ChevronDown, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
// @ts-ignore
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// @ts-ignore
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export interface TaskLog {
    timestamp: number;
    message: string;
    thinking?: string;
    content?: string;
}

export interface Task {
    id: string;
    level: number;
    description: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'TESTING' | 'DEPLOYING' | 'BLOCKED';
    blockedReason?: string;
    logs?: TaskLog[]; // Optional in case older tasks don't have it
}

const LogEntry = ({ log, timeStr, isSystem }: { log: TaskLog, timeStr: string, isSystem: boolean }) => {
    const [expanded, setExpanded] = useState(false);
    
    const hasNewlines = log.message.includes('\n');
    let title = log.message;
    let body = '';
    
    if (hasNewlines) {
        const parts = log.message.split('\n');
        title = parts[0];
        body = parts.slice(1).join('\n');
    } else if (log.message.length > 200) {
        title = log.message.substring(0, 150) + '...';
        body = log.message;
    }

    // Force body explicitly on meta data so they expand even without newlines
    const hasBody = !!body || !!log.content || !!log.thinking;

    return (
        <div className="flex gap-4 group w-full">
            <div className="text-cyan-500/50 shrink-0 select-none">[{timeStr}]</div>
            <div className={`flex-1 min-w-0 flex flex-col ${isSystem ? 'text-white/50 italic' : 'text-cyan-100'}`}>
                <div 
                    className={`leading-relaxed break-words flex items-start gap-1 ${hasBody ? 'cursor-pointer hover:text-white transition-colors' : ''}`}
                    onClick={() => hasBody && setExpanded(!expanded)}
                >
                    {hasBody && (
                        <div className="shrink-0 mt-1 opacity-60">
                            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        {title}
                        {log.content && (
                            <span className="ml-2 px-1.5 py-0.5 rounded bg-cyan-900/40 text-cyan-300 text-[10px] break-words">
                                {log.content}
                            </span>
                        )}
                    </div>
                </div>
                {hasBody && expanded && (
                    <div className="mt-2 p-3 bg-black/40 rounded border border-cyan-500/10 text-white/70 whitespace-pre-wrap break-words text-[11px] font-mono w-full overflow-x-auto">
                        <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                                code({node, inline, className, children, ...props}: any) {
                                  const match = /language-(\w+)/.exec(className || '');
                                  return !inline && match ? (
                                    <SyntaxHighlighter
                                      style={vscDarkPlus as any}
                                      language={match[1]}
                                      PreTag="div"
                                      {...props}
                                    >
                                      {String(children).replace(/\n$/, '')}
                                    </SyntaxHighlighter>
                                  ) : (
                                    <code className={className} {...props}>
                                      {children}
                                    </code>
                                  );
                                }
                            }}
                        >
                            {body}
                        </ReactMarkdown>
                    </div>
                )}
                {log.thinking && (
                    <div className="mt-2 p-3 bg-indigo-900/20 rounded border border-indigo-500/20 text-indigo-200/80 whitespace-pre-wrap break-words text-[11px] font-mono w-full overflow-x-auto italic">
                        <span className="font-bold text-indigo-400 block mb-1">Internal Thinking:</span>
                        {log.thinking}
                    </div>
                )}
            </div>
        </div>
    );
};

const TasksPage = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const logsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const res = await fetch(getApiUrl('/tasks'));
                const json = await res.json();
                if (json.success) {
                    setTasks(json.tasks);
                }
            } catch (err) {
                console.error("Failed to fetch tasks");
            }
        };

        fetchTasks();
        const interval = setInterval(fetchTasks, 5000);
        return () => clearInterval(interval);
    }, []);

    const PENDING_STATUSES = ['PENDING'];
    const EXECUTING_STATUSES = ['IN_PROGRESS', 'TESTING', 'DEPLOYING', 'BLOCKED'];

    const pendingTasks = tasks.filter(t => PENDING_STATUSES.includes(t.status));
    const executingTasks = tasks.filter(t => EXECUTING_STATUSES.includes(t.status));
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED');
    const failedTasks = tasks.filter(t => t.status === 'FAILED');

    const selectedTask = tasks.find(t => t.id === selectedTaskId);

    // Auto-scroll logs
    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [selectedTask?.logs?.length]);

    const getStatusIcon = (status: Task['status']) => {
        switch (status) {
            case 'COMPLETED': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
            case 'FAILED': return <XCircle className="w-4 h-4 text-red-400" />;
            case 'BLOCKED': return <AlertCircle className="w-4 h-4 text-orange-400 animate-pulse" />;
            case 'PENDING': return <Clock className="w-4 h-4 text-gray-400" />;
            default: return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
        }
    };

    const getStatusColor = (status: Task['status']) => {
        switch (status) {
            case 'COMPLETED': return 'border-green-500/30 bg-green-500/10 text-green-300';
            case 'FAILED': return 'border-red-500/30 bg-red-500/10 text-red-300';
            case 'BLOCKED': return 'border-orange-500/30 bg-orange-500/10 text-orange-300';
            case 'PENDING': return 'border-gray-500/30 bg-gray-500/10 text-gray-300';
            default: return 'border-blue-500/30 bg-blue-500/10 text-blue-300';
        }
    };

    const TaskCard = ({ task }: { task: Task }) => {
        const isSelected = task.id === selectedTaskId;
        return (
            <div 
                onClick={() => setSelectedTaskId(task.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                    isSelected 
                        ? 'border-cyan-400 bg-cyan-900/40 shadow-[0_0_15px_rgba(0,255,255,0.2)]' 
                        : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                }`}
            >
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-white/50">{task.id.split('-')[0]}</span>
                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(task.status)}`}>
                        {getStatusIcon(task.status)}
                        {task.status}
                    </div>
                </div>
                <div className="text-sm text-white/90 line-clamp-2 leading-relaxed">
                    {task.description}
                </div>
            </div>
        );
    };

    return (
        <div className="h-screen max-h-screen bg-jarvis-dark text-white p-6 font-sans overflow-hidden flex flex-col relative w-full" style={{ zoom: 0.75 }}>
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#001020] via-black to-[#000510] -z-10" />
            <div className="absolute top-0 left-0 w-full h-32 bg-cyan-900/20 blur-[100px] -z-10 rounded-full mix-blend-screen" />
            
            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-cyan-500/20 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-500/20 rounded-lg border border-cyan-500/30">
                        <TerminalSquare className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 uppercase">
                            Jarvis Data Hub
                        </h1>
                        <p className="text-xs text-cyan-400/60 uppercase tracking-[0.2em] font-mono">Agent Execution Matrix</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-white/40">
                    <RefreshCcw className="w-3 h-3 animate-spin duration-3000" />
                    <span>LIVE SYNC</span>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex gap-6" style={{ height: '80vh' }}>
                {/* Left Column: Task Lists */}
                <div className="w-1/3 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar min-h-0">
                    
                    {/* Executing Section */}
                    <div className="flex flex-col gap-3">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-blue-400 flex items-center gap-2">
                            <Loader2 className="w-3 h-3 animate-spin" /> In Progress ({executingTasks.length})
                        </h2>
                        {executingTasks.map(t => <TaskCard key={t.id} task={t} />)}
                        {executingTasks.length === 0 && (
                            <div className="text-xs text-white/30 italic px-3 py-2 border border-dashed border-white/10 rounded-lg">No active tasks</div>
                        )}
                    </div>

                    {/* Pending Section */}
                    <div className="flex flex-col gap-3">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                            <Clock className="w-3 h-3" /> Pending ({pendingTasks.length})
                        </h2>
                        {pendingTasks.map(t => <TaskCard key={t.id} task={t} />)}
                    </div>

                    {/* Completed Section */}
                    <div className="flex flex-col gap-3">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-green-400 flex items-center gap-2">
                            <CheckCircle2 className="w-3 h-3" /> Completed ({completedTasks.length})
                        </h2>
                        {completedTasks.map(t => <TaskCard key={t.id} task={t} />)}
                    </div>

                    {/* Failed Section */}
                    {failedTasks.length > 0 && (
                        <div className="flex flex-col gap-3 mt-4">
                            <h2 className="text-xs font-bold uppercase tracking-widest text-red-400 flex items-center gap-2">
                                <XCircle className="w-3 h-3" /> Failed ({failedTasks.length})
                            </h2>
                            {failedTasks.map(t => <TaskCard key={t.id} task={t} />)}
                        </div>
                    )}

                </div>

                {/* Right Column: Logs */}
                <div className="flex-1 min-h-0 bg-black/40 rounded-xl border border-cyan-500/20 flex flex-col overflow-hidden backdrop-blur-md relative shadow-2xl">
                    {/* Glass sheen */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

                    {!selectedTask ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-white/20">
                            <TerminalSquare className="w-16 h-16 mb-4 opacity-20" />
                            <p className="font-mono text-sm uppercase tracking-widest">Select a task to view execution logs</p>
                        </div>
                    ) : (
                        <>
                            <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between shrink-0">
                                <h3 className="font-mono text-sm text-cyan-300 font-bold tracking-wider">
                                    Execution Logs <span className="text-white/30">/</span> {selectedTask.id.split('-')[0]}
                                </h3>
                                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(selectedTask.status)}`}>
                                    {getStatusIcon(selectedTask.status)}
                                    {selectedTask.status}
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs custom-scrollbar">
                                <div className="space-y-3 pb-8">
                                    {selectedTask.logs && selectedTask.logs.length > 0 ? (
                                        selectedTask.logs.map((log, i) => {
                                            const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
                                            // Highlight agent output/system messages slightly differently
                                            const isSystem = log.message.startsWith('Status updated');
                                            
                                            return <LogEntry key={i} log={log} timeStr={timeStr} isSystem={isSystem} />;
                                        })
                                    ) : (
                                        <div className="text-white/30 italic">No logs generated yet.</div>
                                    )}
                                    <div ref={logsEndRef} />
                                </div>
                            </div>
                            
                            {/* Running indicator at bottom of logs if active */}
                            {EXECUTING_STATUSES.includes(selectedTask.status) && selectedTask.status !== 'BLOCKED' && (
                                <div className="absolute bottom-4 left-4 right-4 p-2 bg-cyan-900/60 border border-cyan-500/40 rounded flex items-center gap-3 backdrop-blur-md animate-pulse">
                                    <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                                    <span className="text-xs font-mono text-cyan-300">Agent is currently processing...</span>
                                </div>
                            )}

                            {/* Human Intervention Input */}
                            {selectedTask.status === 'BLOCKED' && (
                                <div className="absolute flex flex-col items-center justify-center bottom-4 left-4 right-4 p-4 bg-orange-950/80 border border-orange-500/60 rounded-xl gap-3 backdrop-blur-xl shadow-2xl z-10">
                                    <div className="flex items-start gap-3 w-full">
                                        <AlertCircle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5 animate-pulse" />
                                        <div className="flex-1">
                                            <h4 className="text-sm font-bold text-orange-300 tracking-wider uppercase">Human Intervention Required</h4>
                                            <p className="text-xs text-orange-200/90 mt-1 leading-relaxed">{selectedTask.blockedReason || "The agent has paused execution and requires your input to continue."}</p>
                                        </div>
                                    </div>
                                    <form 
                                        className="flex gap-2 mt-1 w-full"
                                        onSubmit={async (e) => {
                                            e.preventDefault();
                                            const form = e.target as HTMLFormElement;
                                            const input = form.elements.namedItem('response') as HTMLInputElement;
                                            if (!input.value.trim()) return;
                                            
                                            try {
                                                const res = await fetch(getApiUrl(`/tasks/${selectedTask.id}/respond`), {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ response: input.value })
                                                });
                                                if (res.ok) {
                                                    input.value = '';
                                                }
                                            } catch (err) {
                                                console.error("Failed to submit response", err);
                                            }
                                        }}
                                    >
                                        <input 
                                            name="response"
                                            type="text" 
                                            placeholder="Type your response to the agent..." 
                                            className="flex-1 bg-black/60 border border-orange-500/40 rounded px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-orange-400 focus:bg-black/80 transition-all font-mono"
                                            required
                                            autoComplete="off"
                                        />
                                        <button 
                                            type="submit"
                                            className="px-6 py-2.5 bg-orange-500 hover:bg-orange-400 text-black text-sm font-bold uppercase tracking-wider rounded transition-colors shadow-[0_0_15px_rgba(249,115,22,0.4)]"
                                        >
                                            Send
                                        </button>
                                    </form>
                                </div>
                            )}

                            {/* Failed Task Retry Input */}
                            {selectedTask.status === 'FAILED' && (
                                <div className="absolute flex flex-col items-center justify-center bottom-4 left-4 right-4 p-4 bg-red-950/80 border border-red-500/60 rounded-xl gap-3 backdrop-blur-xl shadow-2xl z-10">
                                    <div className="flex items-start gap-3 w-full">
                                        <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <h4 className="text-sm font-bold text-red-400 tracking-wider uppercase">Task Execution Failed</h4>
                                            <p className="text-xs text-red-200/90 mt-1 leading-relaxed">The agent encountered a critical error or service disruption. Would you like to retry?</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 w-full justify-end">
                                        <button 
                                            onClick={async () => {
                                                try {
                                                    await fetch(getApiUrl(`/tasks/${selectedTask.id}/retry`), { method: 'POST' });
                                                } catch (err) {
                                                    console.error("Failed to retry task", err);
                                                }
                                            }}
                                            className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-black text-sm font-bold uppercase tracking-wider rounded transition-colors shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                                        >
                                            Retry Task
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(0,0,0,0.2);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(0, 255, 255, 0.2);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(0, 255, 255, 0.4);
                }
            `}</style>
        </div>
    );
};

export { TasksPage };
