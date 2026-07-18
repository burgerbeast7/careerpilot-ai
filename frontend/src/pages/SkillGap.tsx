import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Award as AwardIcon, Plus as PlusIcon, X as XIcon, 
  Clock as ClockIcon, Zap as ZapIcon, 
  BookOpen as BookOpenIcon
} from 'lucide-react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, 
  PolarRadiusAxis, ResponsiveContainer 
} from 'recharts';
import api from '../services/api';
import AgentVisualizer from '../components/AgentVisualizer';
import type { AgentLog } from '../components/AgentVisualizer';

interface SkillGapItem {
  id: number;
  target_role: string;
  target_company: string;
  current_skills: string[];
  missing_skills: Record<string, { priority: string; time: string; difficulty: string }>;
  recommendations: Array<{ skill: string; resource: string; sequence: number }>;
  analyzed_at: string;
}

export const SkillGap: React.FC = () => {
  const [currentSkills, setCurrentSkills] = useState<string[]>(['React', 'JavaScript', 'HTML5', 'CSS3', 'Python', 'Git']);
  const [skillInput, setSkillInput] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [targetCompany, setTargetCompany] = useState('');
  
  // Streaming state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeAgent, setActiveAgent] = useState('orchestrator');
  const [statusText, setStatusText] = useState('');
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [currentResult, setCurrentResult] = useState<any | null>(null);

  // Load latest report
  const { data: latestReport, refetch: refetchLatest } = useQuery<SkillGapItem>({
    queryKey: ['latest-skill-gap'],
    queryFn: async () => {
      const response = await api.get('/skill-gap/latest');
      return response.data;
    },
    retry: false
  });

  useEffect(() => {
    if (latestReport) {
      setCurrentResult(latestReport);
      if (latestReport.current_skills && latestReport.current_skills.length > 0) {
        setCurrentSkills(latestReport.current_skills);
      }
      setTargetRole(latestReport.target_role || '');
      setTargetCompany(latestReport.target_company || '');
    }
  }, [latestReport]);

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !currentSkills.includes(trimmed)) {
      setCurrentSkills([...currentSkills, trimmed]);
      setSkillInput('');
    }
  };

  const removeSkill = (indexToRemove: number) => {
    setCurrentSkills(currentSkills.filter((_, idx) => idx !== indexToRemove));
  };

  const handleStartAnalysis = async () => {
    if (currentSkills.length === 0) return;

    setLogs([]);
    setCurrentResult(null);
    setIsAnalyzing(true);
    setStatusText('Contacting Master Orchestrator...');
    setActiveAgent('orchestrator');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/skill-gap/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          target_role: targetRole || undefined,
          target_company: targetCompany || undefined,
          current_skills: currentSkills
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
                setCurrentResult(payload.result);
                setIsAnalyzing(false);
                refetchLatest();
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
      setStatusText('Analysis failed.');
    }
  };

  // Prepare radar chart data
  const getRadarData = () => {
    // Generate typical radar axis categories based on target role
    return [
      { subject: 'Coding Core', A: 90, B: 95, fullMark: 100 },
      { subject: 'Cloud & Containers', A: currentSkills.some(s => s.toLowerCase().includes('docker') || s.toLowerCase().includes('kubernetes')) ? 80 : 25, B: 85, fullMark: 100 },
      { subject: 'Relational DBs', A: currentSkills.some(s => s.toLowerCase().includes('sql') || s.toLowerCase().includes('postgres')) ? 85 : 30, B: 80, fullMark: 100 },
      { subject: 'Backend / APIs', A: currentSkills.some(s => s.toLowerCase().includes('node') || s.toLowerCase().includes('fastapi') || s.toLowerCase().includes('python')) ? 75 : 40, B: 90, fullMark: 100 },
      { subject: 'Frontend MVCs', A: currentSkills.some(s => s.toLowerCase().includes('react') || s.toLowerCase().includes('angular') || s.toLowerCase().includes('vue')) ? 95 : 35, B: 85, fullMark: 100 },
      { subject: 'Testing & Devops', A: currentSkills.some(s => s.toLowerCase().includes('jest') || s.toLowerCase().includes('pytest') || s.toLowerCase().includes('ci')) ? 70 : 20, B: 75, fullMark: 100 }
    ];
  };

  const getPriorityColor = (prio: string) => {
    const p = prio.toLowerCase();
    if (p === 'high') return 'text-red-400 border-red-500/20 bg-red-500/5';
    if (p === 'medium') return 'text-amber-400 border-amber-500/20 bg-amber-500/5';
    return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
  };

  return (
    <div className="flex-1 bg-black/95 text-white p-6 md:p-8 relative overflow-hidden">
      <div className="absolute top-[10%] left-[20%] w-96 h-96 bg-ibm-purple/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* Header */}
        <div className="border-b border-ibm-border pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Skill Gap Analyzer</h1>
            <p className="text-xs text-gray-400 mt-1">
              Audit your portfolio against target requirements at top placement entities and map missing competencies.
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

        {/* Core Layout Split */}
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Left panel: Skill setup */}
          <div className="lg:col-span-4 space-y-6">
            <div className="glass-card border border-ibm-border rounded-xl p-6 space-y-4">
              <h2 className="text-base font-bold text-white">Target Selection</h2>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">Target Job Role</label>
                  <input
                    type="text"
                    placeholder="e.g. Software Engineer"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-ibm-border rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-ibm-blue transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">Target Company</label>
                  <input
                    type="text"
                    placeholder="e.g. IBM"
                    value={targetCompany}
                    onChange={(e) => setTargetCompany(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-ibm-border rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-ibm-blue transition-all"
                  />
                </div>
              </div>

              <div className="h-px bg-white/[0.04]" />

              {/* Skills adder */}
              <div className="space-y-3">
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                  Your Current Skills ({currentSkills.length})
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type skill & press Add..."
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addSkill()}
                    className="flex-1 px-3 py-2 bg-black/40 border border-ibm-border rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-ibm-blue transition-all"
                  />
                  <button 
                    onClick={addSkill}
                    className="p-2 bg-ibm-blue hover:bg-ibm-blue/80 rounded-lg text-white transition-all flex items-center justify-center"
                  >
                    <PlusIcon className="w-4.5 h-4.5" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto pt-1 pr-1">
                  {currentSkills.map((skill, idx) => (
                    <span 
                      key={idx} 
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/5 border border-ibm-border text-[10px] text-gray-300 font-medium hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 cursor-pointer group transition-all"
                      onClick={() => removeSkill(idx)}
                    >
                      {skill}
                      <XIcon className="w-3 h-3 text-gray-500 group-hover:text-red-400 transition" />
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={handleStartAnalysis}
                disabled={currentSkills.length === 0 || isAnalyzing}
                className="w-full py-2 bg-gradient-to-r from-ibm-blue to-ibm-purple text-white rounded-lg text-xs font-bold shadow-glow-purple hover:scale-[1.01] transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                {isAnalyzing ? 'Evaluating Skill Gaps...' : 'Compute Competency Gaps'}
              </button>
            </div>
          </div>

          {/* Right panel: Main Scoring results */}
          <div className="lg:col-span-8">
            {currentResult ? (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* Visual Radar comparison block */}
                <div className="glass-card border border-ibm-border rounded-xl p-6 grid md:grid-cols-12 gap-6 items-center">
                  
                  {/* Radar component on left */}
                  <div className="md:col-span-6 h-[260px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={getRadarData()}>
                        <PolarGrid stroke="rgba(255,255,255,0.05)" />
                        <PolarAngleAxis dataKey="subject" stroke="#888" fontSize={9} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="rgba(255,255,255,0.1)" tick={false} />
                        <Radar name="Current Skills" dataKey="A" stroke="#0f62fe" fill="#0f62fe" fillOpacity={0.2} />
                        <Radar name="Target Expectation" dataKey="B" stroke="#8a3ffc" fill="#8a3ffc" fillOpacity={0.15} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="md:col-span-6 space-y-3.5 pr-2">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <ZapIcon className="w-5 h-5 text-ibm-cyan" />
                      Radar Competency Analysis
                    </h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      The radar highlights gaps in **Cloud & DevOps** and **Backend Systems** relative to standard engineering benchmarks for {targetRole || 'Software Engineer'} roles.
                    </p>
                    <div className="flex gap-4 text-[10px] font-bold tracking-wider uppercase">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-ibm-blue" />
                        <span className="text-gray-300">You ({currentSkills.length})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-ibm-purple" />
                        <span className="text-gray-300">Industry Standards</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Priority Cards block */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Missing Skills Breakdown</h3>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    {Object.entries(currentResult.missing_skills || {}).map(([skill, details]: [string, any]) => (
                      <div 
                        key={skill}
                        className="glass-card border border-ibm-border rounded-xl p-4 flex flex-col justify-between hover:border-ibm-purple/30 transition-all"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-sm font-extrabold text-white">{skill}</h4>
                          <span className={`px-2 py-0.5 rounded border text-[9px] font-bold ${getPriorityColor(details.priority)}`}>
                            {details.priority} Priority
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t border-white/[0.02]">
                          <div className="flex items-center gap-1">
                            <ClockIcon className="w-3.5 h-3.5 text-ibm-cyan" />
                            <span>{details.time}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <AwardIcon className="w-3.5 h-3.5 text-ibm-purple" />
                            <span>{details.difficulty} difficulty</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommended Study Sequence */}
                <div className="glass-card border border-ibm-border rounded-xl p-6 space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <BookOpenIcon className="w-4 h-4 text-ibm-purple" />
                    Learning Progression Roadmap
                  </h3>
                  
                  <div className="relative border-l border-white/10 pl-6 ml-3 space-y-5">
                    {currentResult.recommendations?.map((rec: any, i: number) => (
                      <div key={i} className="relative">
                        {/* Timeline bubble */}
                        <span className="absolute -left-9.5 top-0.5 w-6 h-6 rounded-full bg-black border border-ibm-purple shadow-glow-purple flex items-center justify-center text-[10px] font-mono text-ibm-cyan">
                          {rec.sequence}
                        </span>
                        
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-white">{rec.skill} Core study</h4>
                          <p className="text-xs text-gray-400 leading-relaxed">
                            Recommended curriculum: <span className="text-gray-300 font-semibold italic">"{rec.resource}"</span>
                          </p>
                        </div>
                      </div>
                    )) || <p className="text-xs text-gray-500">No learning curves generated.</p>}
                  </div>
                </div>

              </motion.div>
            ) : (
              <div className="glass-card border border-ibm-border rounded-xl p-16 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
                <AwardIcon className="w-12 h-12 opacity-30 text-ibm-purple animate-pulse" />
                <h3 className="text-sm font-bold text-white">Awaiting Audit</h3>
                <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                  Enter your current capabilities and set target roles on the left panel to begin. The agents will compute matches.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
export default SkillGap;
