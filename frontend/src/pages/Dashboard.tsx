import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Activity, ArrowRight, Calendar, Loader2 
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip
} from 'recharts';
import api from '../services/api';
import ChatWidget from '../components/ChatWidget';

interface DashboardSummary {
  readiness_score: number;
  ats_score: number;
  resume_score: number;
  interview_score: number;
  learning_progress: number;
  missing_skills_count: number;
  upcoming_tasks: Array<{ week: number; title: string; task: string }>;
  recent_activity: Array<{ title: string; desc: string; time: string }>;
}

export const Dashboard: React.FC = () => {
  // Query dashboard summary stats
  const { data: summary, isLoading } = useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const response = await api.get('/dashboard/summary');
      return response.data;
    }
  });

  if (isLoading) {
    return (
      <div className="flex-1 bg-black/95 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-ibm-blue" />
          <span className="text-xs font-mono text-gray-500 animate-pulse">Loading dashboard telemetry...</span>
        </div>
      </div>
    );
  }

  // Sample historical progress metrics chart data
  const progressHistory = [
    { day: 'Day 1', score: 0 },
    { day: 'Day 2', score: summary?.ats_score ? Math.round(summary.ats_score * 0.4) : 10 },
    { day: 'Day 3', score: summary?.ats_score ? Math.round(summary.ats_score * 0.7) : 30 },
    { day: 'Day 4', score: summary?.readiness_score || 50 }
  ];

  // getScoreColor helper removed

  return (
    <div className="flex-1 bg-black/95 text-white p-6 md:p-8 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[10%] left-[20%] w-96 h-96 bg-ibm-blue/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[10%] right-[20%] w-[450px] h-[450px] bg-ibm-purple/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* Welcome Header */}
        <div className="border-b border-ibm-border pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Career readiness panel</h1>
            <p className="text-xs text-gray-400 mt-1">
              Verify your metrics, check off syllabus targets, and converse with agents to resolve placements.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link 
              to="/resume-analyzer" 
              className="px-4 py-2 border border-ibm-border bg-white/[0.01] hover:bg-white/5 text-xs font-bold rounded-lg transition"
            >
              Analyze Resume
            </Link>
            <Link 
              to="/interview-coach" 
              className="px-4 py-2 bg-gradient-to-r from-ibm-blue to-ibm-purple hover:scale-[1.01] text-white text-xs font-bold rounded-lg shadow-glow-purple transition"
            >
              Practice Mocks
            </Link>
          </div>
        </div>

        {/* Top Scores Dashboard Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Main gauge: Readiness score */}
          <div className="md:col-span-4 glass-card border border-ibm-border rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-glass relative">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest absolute top-6 left-6">Readiness Score</h3>
            
            <div className="relative w-36 h-36 flex items-center justify-center mt-6">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="72"
                  cy="72"
                  r="56"
                  stroke="rgba(255,255,255,0.03)"
                  strokeWidth="10"
                  fill="transparent"
                />
                <motion.circle
                  cx="72"
                  cy="72"
                  r="56"
                  stroke="url(#readinessGradient)"
                  strokeWidth="10"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 56}
                  initial={{ strokeDashoffset: 2 * Math.PI * 56 }}
                  animate={{ strokeDashoffset: (2 * Math.PI * 56) * (1 - (summary?.readiness_score || 0) / 100) }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
                <defs>
                  <linearGradient id="readinessGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0f62fe" />
                    <stop offset="50%" stopColor="#8a3ffc" />
                    <stop offset="100%" stopColor="#00f0ff" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute text-center">
                <span className="text-4xl font-black text-white">{summary?.readiness_score || 0}%</span>
                <span className="block text-[8px] uppercase font-bold text-gray-500 tracking-widest mt-1">Readiness Index</span>
              </div>
            </div>

            <p className="text-[10px] text-gray-400 mt-6 leading-relaxed max-w-[200px]">
              Aggregate readiness composite score computed by CareerPilot Master Orchestrator.
            </p>
          </div>

          {/* Three side gauges: ATS, Resume, Interview */}
          <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Metric 1 */}
            <div className="glass-card border border-ibm-border rounded-xl p-6 flex flex-col items-center justify-center text-center">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-3">ATS Compatibility</span>
              <div className="relative w-20 h-20 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="40" cy="40" r="32" stroke="rgba(255,255,255,0.02)" strokeWidth="6" fill="transparent" />
                  <circle cx="40" cy="40" r="32" stroke="#00f0ff" strokeWidth="6" fill="transparent" 
                    strokeDasharray={2 * Math.PI * 32}
                    strokeDashoffset={(2 * Math.PI * 32) * (1 - (summary?.ats_score || 0) / 100)}
                    className="transition-all duration-1000"
                  />
                </svg>
                <span className="absolute text-base font-bold text-white">{summary?.ats_score || 0}%</span>
              </div>
              <span className="text-[9px] text-ibm-cyan font-bold uppercase tracking-widest mt-4">Keyword Match</span>
            </div>

            {/* Metric 2 */}
            <div className="glass-card border border-ibm-border rounded-xl p-6 flex flex-col items-center justify-center text-center">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-3">Learning Syllabus</span>
              <div className="relative w-20 h-20 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="40" cy="40" r="32" stroke="rgba(255,255,255,0.02)" strokeWidth="6" fill="transparent" />
                  <circle cx="40" cy="40" r="32" stroke="#8a3ffc" strokeWidth="6" fill="transparent"
                    strokeDasharray={2 * Math.PI * 32}
                    strokeDashoffset={(2 * Math.PI * 32) * (1 - (summary?.learning_progress || 0) / 100)}
                    className="transition-all duration-1000"
                  />
                </svg>
                <span className="absolute text-base font-bold text-white">{summary?.learning_progress || 0}%</span>
              </div>
              <span className="text-[9px] text-ibm-purple font-bold uppercase tracking-widest mt-4">Roadmap Progress</span>
            </div>

            {/* Metric 3 */}
            <div className="glass-card border border-ibm-border rounded-xl p-6 flex flex-col items-center justify-center text-center">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-3">Interview Coach</span>
              <div className="relative w-20 h-20 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="40" cy="40" r="32" stroke="rgba(255,255,255,0.02)" strokeWidth="6" fill="transparent" />
                  <circle cx="40" cy="40" r="32" stroke="#10b981" strokeWidth="6" fill="transparent"
                    strokeDasharray={2 * Math.PI * 32}
                    strokeDashoffset={(2 * Math.PI * 32) * (1 - (summary?.interview_score || 0) / 100)}
                    className="transition-all duration-1000"
                  />
                </svg>
                <span className="absolute text-base font-bold text-white">{summary?.interview_score || 0}%</span>
              </div>
              <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest mt-4">Mocks Readiness</span>
            </div>
          </div>

        </div>

        {/* Charts & checklists row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Recharts progress history chart */}
          <div className="lg:col-span-8 glass-card border border-ibm-border rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Readiness Progression Timeline</h3>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={progressHistory}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f62fe" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#0f62fe" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="#555" fontSize={10} />
                  <YAxis domain={[0, 100]} stroke="#555" fontSize={10} />
                  <Tooltip contentStyle={{ background: '#030303', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '11px' }} />
                  <Area type="monotone" dataKey="score" stroke="#0f62fe" fillOpacity={1} fill="url(#colorScore)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Checklist of upcoming goals */}
          <div className="lg:col-span-4 glass-card border border-ibm-border rounded-xl p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4.5 h-4.5 text-ibm-cyan" />
                Upcoming Syllabus Checklist
              </h3>
              
              <div className="space-y-2">
                {summary?.upcoming_tasks && summary.upcoming_tasks.length > 0 ? (
                  summary.upcoming_tasks.map((item, idx) => (
                    <div key={idx} className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-lg space-y-1">
                      <span className="text-[8px] font-bold text-ibm-cyan uppercase tracking-widest">
                        Week {item.week} &bull; {item.title}
                      </span>
                      <p className="text-[11px] text-gray-300 leading-relaxed font-mono">{item.task}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-gray-500 italic text-xs">
                    No tasks loaded. Initialize your roadmap.
                  </div>
                )}
              </div>
            </div>
            
            <Link 
              to="/roadmap" 
              className="text-xs font-bold text-ibm-purple hover:text-white flex items-center gap-1 mt-2 self-start transition-all"
            >
              View Full Syllabus Calendar
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>

        {/* Activity history timeline row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-12 glass-card border border-ibm-border rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-4.5 h-4.5 text-ibm-purple" />
              Recent Agent Activity Log
            </h3>
            
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
              {summary?.recent_activity?.map((act, idx) => (
                <div key={idx} className="p-4 bg-white/[0.01] border border-white/[0.03] rounded-lg flex flex-col justify-between">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-white">{act.title}</h4>
                    <p className="text-[10px] text-gray-500 leading-relaxed">{act.desc}</p>
                  </div>
                  <span className="text-[9px] text-gray-600 mt-3 font-mono">{act.time}</span>
                </div>
              )) || <div className="text-xs text-gray-500 italic">No recent log entries.</div>}
            </div>
          </div>
        </div>

      </div>

      {/* Floating Chat Assistant Widget */}
      <ChatWidget />
    </div>
  );
};
export default Dashboard;
