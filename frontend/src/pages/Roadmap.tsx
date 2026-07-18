import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Map, Calendar, CheckSquare, Square, Trophy, 
  Star, Loader2 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import api from '../services/api';
import AgentVisualizer from '../components/AgentVisualizer';
import type { AgentLog } from '../components/AgentVisualizer';

interface Task {
  task: string;
  completed: boolean;
}

interface WeekRoadmap {
  week: number;
  title: string;
  tasks: Task[];
}

interface RoadmapItem {
  id: number;
  duration_weeks: string;
  weekly_goals: string[];
  tasks_data: WeekRoadmap[];
  progress_percentage: number;
  created_at: string;
}

export const Roadmap: React.FC = () => {
  const [durationWeeks, setDurationWeeks] = useState('4');
  const [activeWeek, setActiveWeek] = useState(1);
  
  // Streaming state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeAgent, setActiveAgent] = useState('orchestrator');
  const [statusText, setStatusText] = useState('');
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [currentResult, setCurrentResult] = useState<RoadmapItem | null>(null);

  // Load latest roadmap
  const { data: latestRoadmap, refetch: refetchLatest } = useQuery<RoadmapItem>({
    queryKey: ['latest-roadmap'],
    queryFn: async () => {
      const response = await api.get('/roadmap/latest');
      return response.data;
    },
    retry: false
  });

  useEffect(() => {
    if (latestRoadmap) {
      setCurrentResult(latestRoadmap);
      // Auto-set the active week to the first week
      if (latestRoadmap && latestRoadmap.tasks_data && latestRoadmap.tasks_data.length > 0) {
        setActiveWeek(latestRoadmap.tasks_data[0].week);
      }
    }
  }, [latestRoadmap]);

  const handleStartAnalysis = async () => {
    setLogs([]);
    setCurrentResult(null);
    setIsAnalyzing(true);
    setStatusText('Initiating Roadmap Generator Agent...');
    setActiveAgent('orchestrator');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/roadmap/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          duration_weeks: durationWeeks
        })
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('Failed to create stream reader.');

      let buffer = '';
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (cleanLine.startsWith('data: ')) {
            try {
              const dataStr = cleanLine.replace('data: ', '');
              const payload = JSON.parse(dataStr);
              
              const newLog: AgentLog = {
                id: Math.random().toString(),
                timestamp: new Date().toLocaleTimeString(),
                agentName: payload.agent.toUpperCase(),
                message: payload.message,
                type: payload.type
              };

              setLogs(prev => [...prev, newLog]);
              setActiveAgent(payload.agent);
              setStatusText(payload.message);

              if (payload.event === 'complete') {
                setIsAnalyzing(false);
                refetchLatest().then((res) => {
                  if (res.data) {
                    setCurrentResult(res.data);
                    if (res.data.tasks_data && res.data.tasks_data.length > 0) {
                      setActiveWeek(res.data.tasks_data[0].week);
                    }
                  }
                });
                // Trigger celebratory confetti upon generation
                confetti({
                  particleCount: 80,
                  spread: 60,
                  origin: { y: 0.7 }
                });
              }
            } catch (err) {
              console.error('Failed to parse SSE payload', err);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      setIsAnalyzing(false);
      setStatusText('Generation failed.');
    }
  };

  const handleToggleTask = async (weekIdx: number, taskIdx: number, currentCompleted: boolean) => {
    if (!currentResult) return;

    try {
      const response = await api.post('/roadmap/task-toggle', {
        week_index: weekIdx,
        task_index: taskIdx,
        completed: !currentCompleted
      });

      const { progress_percentage, tasks_data } = response.data;
      
      // Update local state
      setCurrentResult(prev => {
        if (!prev) return null;
        return {
          ...prev,
          progress_percentage,
          tasks_data
        };
      });

      // Trigger confetti if task completion results in milestones (e.g. 100%)
      if (!currentCompleted && progress_percentage === 100) {
        confetti({
          particleCount: 150,
          spread: 80,
          colors: ['#0f62fe', '#8a3ffc', '#00f0ff'],
          origin: { y: 0.6 }
        });
      }
    } catch (err) {
      console.error('Failed to toggle task', err);
    }
  };

  return (
    <div className="flex-1 bg-black/95 text-white p-6 md:p-8 relative overflow-hidden">
      <div className="absolute top-[10%] left-[20%] w-96 h-96 bg-ibm-blue/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* Header */}
        <div className="border-b border-ibm-border pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Personalized Roadmap</h1>
            <p className="text-xs text-gray-400 mt-1">
              Follow week-by-week checkpoints, courses, and certifications tailored to resolve your technical portfolio gaps.
            </p>
          </div>
        </div>

        {/* Dynamic visualizer showing agent execution in progress */}
        {(isAnalyzing || logs.length > 0) && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
              Live Agent Collaboration Feed
            </h3>
            <AgentVisualizer 
              activeAgent={activeAgent}
              logs={logs}
              statusText={statusText}
              isAnalyzing={isAnalyzing}
            />
          </motion.div>
        )}

        {/* Layout grid */}
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Left panel: Duration config */}
          <div className="lg:col-span-4 space-y-6">
            <div className="glass-card border border-ibm-border rounded-xl p-6 space-y-5">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-ibm-blue" />
                Plan Configuration
              </h2>
              
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                  Roadmap Duration
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['4', '8', '12'].map((weeks) => (
                    <button
                      key={weeks}
                      onClick={() => setDurationWeeks(weeks)}
                      className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                        durationWeeks === weeks
                          ? 'border-ibm-blue bg-ibm-blue/15 text-ibm-cyan'
                          : 'border-ibm-border bg-white/[0.01] hover:bg-white/5 text-gray-400'
                      }`}
                    >
                      {weeks} Weeks
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-px bg-white/[0.04]" />

              <button
                onClick={handleStartAnalysis}
                disabled={isAnalyzing}
                className="w-full py-2 bg-gradient-to-r from-ibm-blue to-ibm-purple text-white rounded-lg text-xs font-bold shadow-glow-purple hover:scale-[1.01] transition-all"
              >
                {isAnalyzing ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Roadmap...
                  </span>
                ) : (
                  'Generate Dynamic Syllabus'
                )}
              </button>
            </div>

            {/* Quick Tips */}
            <div className="glass-card border border-ibm-border rounded-xl p-6 space-y-3 text-xs text-gray-400">
              <h4 className="font-bold text-white uppercase tracking-wider text-[10px] flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                Progression Milestones
              </h4>
              <p className="leading-relaxed">
                Ticking off tasks helps update your job readiness scores on the dashboard. Complete the entire curriculum to unlock custom cover letters matching your skills.
              </p>
            </div>
          </div>

          {/* Right panel: Active Roadmap Details */}
          <div className="lg:col-span-8">
            {currentResult ? (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* Progress Header Card */}
                <div className="glass-card border border-ibm-border rounded-xl p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-extrabold text-white">Active Placement Curriculum</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{currentResult.duration_weeks}-week syllabus constructed by the Roadmap Agent.</p>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-black text-ibm-cyan">{currentResult.progress_percentage}%</span>
                      <span className="block text-[9px] uppercase font-bold text-gray-500 tracking-wider">Completed</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-white/[0.04] overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-ibm-blue to-ibm-purple"
                      initial={{ width: 0 }}
                      animate={{ width: `${currentResult.progress_percentage}%` }}
                      transition={{ duration: 1 }}
                    />
                  </div>
                </div>

                {/* Weeks navigation and active week items */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Left sub-tabs: Weeks */}
                  <div className="md:col-span-3 flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0">
                    {currentResult.tasks_data && currentResult.tasks_data.map((week) => (
                      <button
                        key={week.week}
                        onClick={() => setActiveWeek(week.week)}
                        className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg border text-left text-xs font-bold transition-all whitespace-nowrap ${
                          activeWeek === week.week
                            ? 'border-ibm-purple bg-ibm-purple/10 text-purple-300 shadow-glow-purple'
                            : 'border-white/[0.04] bg-white/[0.01] hover:bg-white/5 text-gray-400'
                        }`}
                      >
                        Week {week.week}
                      </button>
                    ))}
                  </div>

                  {/* Right sub-content: Week Syllabus */}
                  <div className="md:col-span-9">
                    <AnimatePresence mode="wait">
                      {currentResult.tasks_data && currentResult.tasks_data
                        .filter(w => w.week === activeWeek)
                        .map((week) => (
                          <motion.div 
                            key={week.week}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="glass-card border border-ibm-border rounded-xl p-6 space-y-4"
                          >
                            <h4 className="text-base font-extrabold text-white border-b border-ibm-border pb-3 flex items-center gap-2">
                              <Star className="w-5 h-5 text-ibm-cyan" />
                              {week.title}
                            </h4>
                            
                            <div className="space-y-3">
                              {week.tasks.map((task, tIdx) => (
                                <div 
                                  key={tIdx}
                                  onClick={() => handleToggleTask(week.week, tIdx, task.completed)}
                                  className={`p-3.5 rounded-lg border flex items-start gap-3 cursor-pointer select-none transition-all ${
                                    task.completed 
                                      ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300/80 line-through' 
                                      : 'bg-white/[0.01] border-white/[0.03] hover:bg-white/[0.04] text-gray-200'
                                  }`}
                                >
                                  {task.completed ? (
                                    <CheckSquare className="w-4.5 h-4.5 text-emerald-400 shrink-0 mt-0.5" />
                                  ) : (
                                    <Square className="w-4.5 h-4.5 text-gray-500 shrink-0 mt-0.5" />
                                  )}
                                  <p className="text-xs leading-relaxed">{task.task}</p>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        ))}
                    </AnimatePresence>
                  </div>
                </div>

              </motion.div>
            ) : (
              <div className="glass-card border border-ibm-border rounded-xl p-16 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
                <Map className="w-12 h-12 opacity-30 text-ibm-cyan animate-pulse" />
                <h3 className="text-sm font-bold text-white">No Active Syllabus</h3>
                <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                  Select a duration on the left panel and prompt the agents to construct your weekly career roadmap checklist.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
export default Roadmap;
