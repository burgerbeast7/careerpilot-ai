import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Bot, Cpu, FileText, BarChart2, Compass, 
  Map, MessageSquare, Briefcase, Award, Zap 
} from 'lucide-react';

export interface AgentLog {
  id: string;
  timestamp: string;
  agentName: string;
  message: string;
  type: 'info' | 'thought' | 'success' | 'warning';
}

interface AgentVisualizerProps {
  activeAgent: string; // 'orchestrator' | 'resume' | 'ats' | 'skill_gap' | 'roadmap' | 'interview' | 'recommendation' | 'doc_gen' | 'chat'
  logs: AgentLog[];
  statusText: string;
  isAnalyzing: boolean;
}

const AGENTS_LIST = [
  { id: 'orchestrator', name: 'Master Orchestrator', icon: Cpu, color: 'text-ibm-blue border-ibm-blue/30 bg-ibm-blue/5 shadow-glow-blue' },
  { id: 'resume', name: 'Resume Parser', icon: FileText, color: 'text-purple-400 border-purple-400/30 bg-purple-400/5' },
  { id: 'ats', name: 'ATS Evaluator', icon: BarChart2, color: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/5' },
  { id: 'skill_gap', name: 'Skill Gap Detector', icon: Award, color: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5' },
  { id: 'roadmap', name: 'Roadmap Generator', icon: Map, color: 'text-amber-400 border-amber-400/30 bg-amber-400/5' },
  { id: 'interview', name: 'Interview Coach', icon: MessageSquare, color: 'text-indigo-400 border-indigo-400/30 bg-indigo-400/5' },
  { id: 'recommendation', name: 'Job Recommender', icon: Compass, color: 'text-rose-400 border-rose-400/30 bg-rose-400/5' },
  { id: 'doc_gen', name: 'Doc Builder', icon: Briefcase, color: 'text-pink-400 border-pink-400/30 bg-pink-400/5' }
];

export const AgentVisualizer: React.FC<AgentVisualizerProps> = ({
  activeAgent,
  logs,
  statusText,
  isAnalyzing
}) => {
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  return (
    <div className="w-full glass-card border border-ibm-border rounded-xl p-5 overflow-hidden flex flex-col md:flex-row gap-6 shadow-glass relative">
      {/* Glow Effect */}
      <div className="absolute -top-12 -left-12 w-48 h-48 bg-ibm-blue/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-ibm-purple/10 rounded-full blur-3xl pointer-events-none" />

      {/* Left: Dynamic SVG Graph View */}
      <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-2 border-b md:border-b-0 md:border-r border-ibm-border pb-6 md:pb-0 md:pr-6 min-h-[300px]">
        <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2 self-start">
          <Zap className="w-4 h-4 text-ibm-cyan animate-pulse" />
          Agent Collaboration Mesh
        </h4>

        <div className="relative w-full aspect-square max-w-[280px] flex items-center justify-center">
          {/* Master Orchestrator Node (Center) */}
          <div className="relative z-10">
            <motion.div
              animate={activeAgent === 'orchestrator' || isAnalyzing ? {
                scale: [1, 1.08, 1],
                boxShadow: ["0 0 10px rgba(15, 98, 254, 0.2)", "0 0 25px rgba(15, 98, 254, 0.6)", "0 0 10px rgba(15, 98, 254, 0.2)"]
              } : {}}
              transition={{ repeat: Infinity, duration: 2.5 }}
              className={`w-16 h-16 rounded-full border-2 flex items-center justify-center glass-panel shadow-glass text-ibm-blue border-ibm-blue ${
                activeAgent === 'orchestrator' ? 'bg-ibm-blue/20 ring-4 ring-ibm-blue/10' : 'bg-ibm-blue/5'
              }`}
            >
              <Cpu className="w-7 h-7" />
            </motion.div>
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] uppercase font-bold tracking-wider text-ibm-blue">
              Orchestrator
            </div>
          </div>

          {/* Satellite Nodes */}
          {AGENTS_LIST.filter(a => a.id !== 'orchestrator').map((agent, index) => {
            const angle = (index * 2 * Math.PI) / 7;
            const radius = 100; // Radius in pixels
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const isActive = activeAgent === agent.id;
            const Icon = agent.icon;

            return (
              <div 
                key={agent.id}
                className="absolute"
                style={{
                  transform: `translate(${x}px, ${y}px)`
                }}
              >
                {/* SVG connection lines between Orchestrator and agent */}
                <svg className="absolute top-1/2 left-1/2 w-[150px] h-[150px] pointer-events-none -translate-x-1/2 -translate-y-1/2 overflow-visible">
                  <motion.line
                    x1="75"
                    y1="75"
                    x2={75 - x}
                    y2={75 - y}
                    stroke={isActive ? '#00f0ff' : 'rgba(255, 255, 255, 0.08)'}
                    strokeWidth={isActive ? '2' : '1'}
                    strokeDasharray={isActive ? '5 5' : '0'}
                    animate={isActive ? { strokeDashoffset: -20 } : {}}
                    transition={{ repeat: Infinity, ease: "linear", duration: 1 }}
                  />
                  {isActive && (
                    <motion.circle
                      cx={75 - x / 2}
                      cy={75 - y / 2}
                      r="3"
                      fill="#00f0ff"
                      animate={{
                        cx: [75, 75 - x],
                        cy: [75, 75 - y],
                        opacity: [1, 1, 0]
                      }}
                      transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                    />
                  )}
                </svg>

                {/* Node bubble */}
                <div className="relative z-10">
                  <motion.div
                    animate={isActive ? {
                      scale: 1.15,
                      borderColor: '#00f0ff',
                      boxShadow: '0 0 15px rgba(0, 240, 255, 0.4)'
                    } : { scale: 1 }}
                    className={`w-11 h-11 rounded-full border flex items-center justify-center glass-panel shadow-glass text-gray-400 ${
                      isActive ? 'bg-ibm-cyan/15 text-ibm-cyan border-ibm-cyan ring-4 ring-ibm-cyan/10' : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </motion.div>
                  <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] uppercase tracking-wider text-gray-500 font-medium">
                    {agent.name.split(' ')[0]}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <div className="text-xs text-gray-500 mb-1">Current State</div>
          <div className="text-sm font-semibold tracking-wide text-ibm-cyan animate-pulse">
            {statusText || (isAnalyzing ? "Processing agent pipeline..." : "System Idle")}
          </div>
        </div>
      </div>

      {/* Right: Agent thought and execution log console */}
      <div className="w-full md:w-1/2 flex flex-col h-[320px] md:h-[380px] bg-black/50 border border-ibm-border rounded-lg p-3 font-mono text-[11px] leading-relaxed relative">
        <div className="flex items-center justify-between border-b border-ibm-border pb-2 mb-2 text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="ml-2 text-[10px] tracking-wider uppercase font-semibold">Orchestrator Terminal</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Bot className="w-3.5 h-3.5 text-ibm-blue" />
              <span>Agents: 8/8</span>
            </div>
            {isAnalyzing && (
              <span className="text-ibm-cyan text-[10px] animate-pulse">RUNNING</span>
            )}
          </div>
        </div>

        {/* Scrollable Logs Body */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-1.5">
              <Cpu className="w-8 h-8 opacity-40 animate-pulse text-ibm-purple" />
              <span>Awaiting agent task payload execution...</span>
            </div>
          ) : (
            logs.map((log) => {
              let tagColor = 'bg-ibm-blue/20 text-ibm-blue border-ibm-blue/40';
              let textColor = 'text-gray-300';
              
              if (log.type === 'thought') {
                tagColor = 'bg-ibm-purple/20 text-ibm-purple border-ibm-purple/40';
                textColor = 'text-purple-200/90 italic';
              } else if (log.type === 'success') {
                tagColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
                textColor = 'text-emerald-300';
              } else if (log.type === 'warning') {
                tagColor = 'bg-amber-500/20 text-amber-400 border-amber-500/40';
                textColor = 'text-amber-300';
              }

              return (
                <div key={log.id} className="border-b border-white/[0.02] pb-1.5">
                  <div className="flex items-center gap-2 mb-0.5 text-gray-500 text-[9px]">
                    <span>[{log.timestamp}]</span>
                    <span className={`px-1.5 py-0.2 rounded border text-[8px] font-bold ${tagColor}`}>
                      {log.agentName}
                    </span>
                  </div>
                  <div className={`pl-2 ${textColor}`}>
                    {log.type === 'thought' ? `↳ Thought: "${log.message}"` : log.message}
                  </div>
                </div>
              );
            })
          )}

          {/* Streaming Loader / Cursor */}
          {isAnalyzing && (
            <div className="flex items-center gap-2 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-ibm-cyan animate-ping" />
              <span className="text-ibm-cyan italic streaming-cursor text-[10px]">
                {activeAgent ? `${AGENTS_LIST.find(a => a.id === activeAgent)?.name || activeAgent} processing...` : 'Orchestrating...'}
              </span>
            </div>
          )}
          <div ref={terminalEndRef} />
        </div>

        {/* Info overlay inside console */}
        <div className="mt-2 pt-2 border-t border-ibm-border flex justify-between text-[9px] text-gray-500">
          <span>Latency: ~120ms</span>
          <span>Tokens: {logs.length * 45} usage</span>
          <span>Model: Gemini / WatsonX</span>
        </div>
      </div>
    </div>
  );
};
export default AgentVisualizer;
