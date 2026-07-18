import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  FileText, Upload, CheckCircle2, 
  XCircle, AlertCircle, BarChart2 
} from 'lucide-react';
import api from '../services/api';
import AgentVisualizer from '../components/AgentVisualizer';
import type { AgentLog } from '../components/AgentVisualizer';

interface ResumeHistoryItem {
  id: number;
  file_name: string;
  ats_score: number;
  sections_data: any;
  keyword_analysis: any;
  analyzed_at: string;
}

export const ResumeAnalyzer: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [targetRole, setTargetRole] = useState('');
  const [targetCompany, setTargetCompany] = useState('');
  const [dragActive, setDragActive] = useState(false);
  
  // Streaming state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeAgent, setActiveAgent] = useState('orchestrator');
  const [statusText, setStatusText] = useState('');
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [currentResult, setCurrentResult] = useState<any | null>(null);

  // Fetch history query
  const { data: history = [], refetch: refetchHistory } = useQuery<ResumeHistoryItem[]>({
    queryKey: ['resume-history'],
    queryFn: async () => {
      const response = await api.get('/resume/history');
      return response.data;
    }
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleStartAnalysis = async () => {
    if (!file) return;

    setLogs([]);
    setCurrentResult(null);
    setIsAnalyzing(true);
    setStatusText('Orchestrating AI agents...');
    setActiveAgent('orchestrator');

    const formData = new FormData();
    formData.append('file', file);
    if (targetRole) formData.append('target_role', targetRole);
    if (targetCompany) formData.append('target_company', targetCompany);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/resume/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('Stream reader failed to initialize.');

      let buffer = '';
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        // Keep the last partial line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (cleanLine.startsWith('data: ')) {
            try {
              const dataStr = cleanLine.replace('data: ', '');
              const payload = JSON.parse(dataStr);
              
              // 1. Create a log object
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

              // 2. Capture final payload
              if (payload.event === 'complete') {
                setCurrentResult(payload.result);
                setIsAnalyzing(false);
                refetchHistory();
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

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
    if (score >= 60) return 'text-amber-400 border-amber-500/20 bg-amber-500/5';
    return 'text-red-400 border-red-500/20 bg-red-500/5';
  };

  return (
    <div className="flex-1 bg-black/95 text-white p-6 md:p-8 relative overflow-hidden">
      <div className="absolute top-[10%] left-[20%] w-96 h-96 bg-ibm-blue/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* Header */}
        <div className="border-b border-ibm-border pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Resume AI Analyzer</h1>
            <p className="text-xs text-gray-400 mt-1">
              Optimize your portfolio layout and keyword index under the supervision of multiple collaborative agents.
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

        {/* Upload Interface and Results Panel */}
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Left panel: Upload Form & History */}
          <div className="lg:col-span-4 space-y-6">
            <div className="glass-card border border-ibm-border rounded-xl p-6 space-y-4">
              <h2 className="text-base font-bold text-white">Target Job Parameters</h2>
              
              <div className="space-y-3">
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
                    placeholder="e.g. IBM Research"
                    value={targetCompany}
                    onChange={(e) => setTargetCompany(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-ibm-border rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-ibm-blue transition-all"
                  />
                </div>
              </div>

              <div className="h-px bg-white/[0.04]" />

              {/* Upload area */}
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer relative ${
                  dragActive ? 'border-ibm-blue bg-ibm-blue/5' : 'border-ibm-border hover:border-ibm-blue/40 bg-white/[0.01]'
                }`}
              >
                <input
                  type="file"
                  id="resume-file-input"
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="resume-file-input" className="cursor-pointer space-y-3 block">
                  <div className="w-10 h-10 rounded-full bg-white/5 border border-ibm-border flex items-center justify-center mx-auto text-gray-400">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="text-xs">
                    {file ? (
                      <span className="text-ibm-cyan font-bold block truncate max-w-[200px] mx-auto">{file.name}</span>
                    ) : (
                      <>
                        <span className="text-white font-medium hover:underline">Click to upload</span> or drag and drop
                        <span className="block text-[10px] text-gray-500 mt-1">PDF or DOCX (max 5MB)</span>
                      </>
                    )}
                  </div>
                </label>
              </div>

              <button
                onClick={handleStartAnalysis}
                disabled={!file || isAnalyzing}
                className="w-full py-2 bg-gradient-to-r from-ibm-blue to-ibm-purple text-white rounded-lg text-xs font-bold shadow-glow-purple hover:scale-[1.01] transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                {isAnalyzing ? 'Analyzing Resume...' : 'Analyze Resume Profile'}
              </button>
            </div>

            {/* History List */}
            <div className="glass-card border border-ibm-border rounded-xl p-6 space-y-4">
              <h2 className="text-base font-bold text-white">Analysis History</h2>
              {history.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No previous resume uploads found.</p>
              ) : (
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {history.map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => setCurrentResult(item)}
                      className="p-3 rounded-lg border border-white/[0.03] bg-white/[0.01] hover:bg-white/[0.04] cursor-pointer flex items-center justify-between transition-all"
                    >
                      <div className="space-y-0.5 truncate pr-2">
                        <div className="text-xs font-semibold text-gray-200 truncate">{item.file_name}</div>
                        <div className="text-[10px] text-gray-500">{new Date(item.analyzed_at).toLocaleDateString()}</div>
                      </div>
                      <div className={`px-2 py-0.5 rounded border text-[10px] font-bold ${getScoreColor(item.ats_score)}`}>
                        {item.ats_score}%
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                {/* Score Summary Card */}
                <div className="glass-card border border-ibm-border rounded-xl p-6 grid md:grid-cols-12 gap-6 items-center">
                  <div className="md:col-span-4 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-ibm-border pb-6 md:pb-0 md:pr-6">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                      {/* Circular Gauge */}
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="52"
                          stroke="rgba(255,255,255,0.03)"
                          strokeWidth="10"
                          fill="transparent"
                        />
                        <motion.circle
                          cx="64"
                          cy="64"
                          r="52"
                          stroke={currentResult.ats_score >= 80 ? '#10b981' : currentResult.ats_score >= 60 ? '#f59e0b' : '#ef4444'}
                          strokeWidth="10"
                          fill="transparent"
                          strokeDasharray={2 * Math.PI * 52}
                          initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                          animate={{ strokeDashoffset: (2 * Math.PI * 52) * (1 - currentResult.ats_score / 100) }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                        />
                      </svg>
                      <div className="absolute text-center">
                        <span className="text-3xl font-extrabold text-white">{currentResult.ats_score}</span>
                        <span className="block text-[9px] uppercase font-bold text-gray-500 tracking-wider">ATS Score</span>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-8 space-y-3">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <BarChart2 className="w-5 h-5 text-ibm-blue" />
                      ATS Diagnostics Analysis
                    </h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Your resume contains strong technical terms but has section gaps. Recommended match score threshold for {targetRole || 'Software Engineer'} is 80%. Follow the agent instructions below to optimize.
                    </p>
                  </div>
                </div>

                {/* Keywords Heatmap */}
                <div className="glass-card border border-ibm-border rounded-xl p-6 space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Keyword Heatmap Analysis</h3>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Matched */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Matched Keywords ({currentResult.keyword_analysis?.matched?.length || 0})
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {currentResult.keyword_analysis?.matched?.map((kw: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-medium">
                            {kw}
                          </span>
                        )) || <span className="text-xs text-gray-600">None detected.</span>}
                      </div>
                    </div>

                    {/* Missing */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5" />
                        Missing High-Priority Keywords ({currentResult.keyword_analysis?.missing?.length || 0})
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {currentResult.keyword_analysis?.missing?.map((kw: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-[10px] text-red-400 font-medium">
                            {kw}
                          </span>
                        )) || <span className="text-xs text-gray-600">None detected.</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Agent Actionable Recommendations */}
                <div className="glass-card border border-ibm-border rounded-xl p-6 space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-ibm-purple" />
                    Agent Improvement Checklist
                  </h3>
                  <div className="space-y-2">
                    {currentResult.keyword_analysis?.recommendations?.map((rec: string, i: number) => (
                      <div key={i} className="flex gap-3 items-start p-3 bg-white/[0.01] border border-white/[0.03] rounded-lg">
                        <span className="w-5 h-5 rounded-full bg-ibm-purple/10 border border-ibm-purple/30 text-ibm-purple flex items-center justify-center text-[10px] font-bold shrink-0">
                          {i + 1}
                        </span>
                        <p className="text-xs text-gray-300 leading-relaxed pt-0.5">{rec}</p>
                      </div>
                    )) || <p className="text-xs text-gray-500">No improvements generated.</p>}
                  </div>
                </div>

              </motion.div>
            ) : (
              <div className="glass-card border border-ibm-border rounded-xl p-16 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
                <FileText className="w-12 h-12 opacity-30 text-ibm-blue animate-pulse" />
                <h3 className="text-sm font-bold text-white">Awaiting Analysis</h3>
                <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                  Configure your target career parameters on the left and upload your resume. The multi-agent pipeline will render results here.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
export default ResumeAnalyzer;
