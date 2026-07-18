import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  MessageSquare, Send, ChevronRight, ChevronLeft, 
  Award, Loader2 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';
import api from '../services/api';
import AgentVisualizer from '../components/AgentVisualizer';
import type { AgentLog } from '../components/AgentVisualizer';

interface QuestionAnswer {
  id: number;
  type: string;
  question: string;
  user_answer: string | null;
  score: number;
  feedback: {
    situation: string;
    task: string;
    action: string;
    result: string;
    improvements: string;
  } | null;
}

interface InterviewItem {
  id: number;
  session_type: string;
  question_answers: QuestionAnswer[];
  overall_score: number;
  performance_metrics: {
    accuracy: number;
    confidence: number;
    communication: number;
  };
  created_at: string;
}

export const InterviewCoach: React.FC = () => {
  const [sessionType, setSessionType] = useState('Technical');
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  
  // Streaming state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeAgent, setActiveAgent] = useState('orchestrator');
  const [statusText, setStatusText] = useState('');
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [currentResult, setCurrentResult] = useState<InterviewItem | null>(null);
  
  // Grading state
  const [isGrading, setIsGrading] = useState(false);

  // Load latest interview session
  const { data: latestSession, refetch: refetchLatest } = useQuery<InterviewItem>({
    queryKey: ['latest-interview'],
    queryFn: async () => {
      const response = await api.get('/interview/latest');
      return response.data;
    },
    retry: false
  });

  useEffect(() => {
    if (latestSession) {
      setCurrentResult(latestSession);
      // Find the first unanswered question
      const unansweredIdx = latestSession.question_answers.findIndex(q => q.user_answer === null);
      if (unansweredIdx !== -1) {
        setActiveQuestionIdx(unansweredIdx);
      } else {
        setActiveQuestionIdx(latestSession.question_answers.length); // All answered, show summary
      }
    }
  }, [latestSession]);

  const handleStartInterview = async () => {
    setLogs([]);
    setCurrentResult(null);
    setIsAnalyzing(true);
    setStatusText('Contacting Mock Interview Orchestrator...');
    setActiveAgent('orchestrator');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/interview/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          session_type: sessionType
        })
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('Stream initialization failed.');

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
                  }
                });
                setActiveQuestionIdx(0);
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
      setStatusText('Start failed.');
    }
  };

  const handleSubmitAnswer = async () => {
    if (!currentResult || !userAnswer.trim()) return;
    
    setIsGrading(true);
    try {
      const response = await api.post('/interview/submit-answer', {
        question_index: activeQuestionIdx,
        user_answer: userAnswer
      });

      const { overall_score, performance_metrics, question_answers } = response.data;
      
      setCurrentResult(prev => {
        if (!prev) return null;
        return {
          ...prev,
          overall_score,
          performance_metrics,
          question_answers
        };
      });

      setUserAnswer('');
    } catch (err) {
      console.error('Answer submission failed', err);
    } finally {
      setIsGrading(false);
    }
  };

  const getMetricData = () => {
    if (!currentResult || !currentResult.performance_metrics) return [];
    return [
      { name: 'Accuracy', percentage: currentResult.performance_metrics.accuracy || 0 },
      { name: 'Confidence', percentage: currentResult.performance_metrics.confidence || 0 },
      { name: 'Clarity', percentage: currentResult.performance_metrics.communication || 0 }
    ];
  };

  const isAllAnswered = currentResult && currentResult.question_answers && currentResult.question_answers.every(q => q.user_answer !== null);
  const activeQuestion = currentResult && currentResult.question_answers && activeQuestionIdx < currentResult.question_answers.length 
    ? currentResult.question_answers[activeQuestionIdx] 
    : null;

  return (
    <div className="flex-1 bg-black/95 text-white p-6 md:p-8 relative overflow-hidden">
      <div className="absolute top-[10%] left-[20%] w-96 h-96 bg-ibm-purple/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* Header */}
        <div className="border-b border-ibm-border pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Interview Coach</h1>
            <p className="text-xs text-gray-400 mt-1">
              Conduct challenging mock interviews tailored to your target company and receive instant STAR critiques.
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
          
          {/* Left panel: Mode select */}
          <div className="lg:col-span-4 space-y-6">
            <div className="glass-card border border-ibm-border rounded-xl p-6 space-y-5">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-ibm-blue" />
                Session Setup
              </h2>
              
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                  Interview Category
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Technical', 'Behavioral', 'Coding'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setSessionType(type)}
                      className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                        sessionType === type
                          ? 'border-ibm-blue bg-ibm-blue/15 text-ibm-cyan'
                          : 'border-ibm-border bg-white/[0.01] hover:bg-white/5 text-gray-400'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-px bg-white/[0.04]" />

              <button
                onClick={handleStartInterview}
                disabled={isAnalyzing}
                className="w-full py-2.5 bg-gradient-to-r from-ibm-blue to-ibm-purple text-white rounded-lg text-xs font-bold shadow-glow-purple hover:scale-[1.01] transition-all disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Spawning Session...
                  </span>
                ) : (
                  'Start Interview Session'
                )}
              </button>
            </div>

            {/* Performance status widgets (If active interview exists) */}
            {currentResult && (
              <div className="glass-card border border-ibm-border rounded-xl p-6 space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Session Progress</h3>
                
                <div className="space-y-3">
                  {currentResult.question_answers && currentResult.question_answers.map((qa, index) => (
                    <div 
                      key={qa.id}
                      onClick={() => {
                        if (qa.user_answer !== null || index === currentResult.question_answers.findIndex(q => q.user_answer === null)) {
                          setActiveQuestionIdx(index);
                        }
                      }}
                      className={`p-3 rounded-lg border text-xs font-bold cursor-pointer transition-all flex items-center justify-between ${
                        activeQuestionIdx === index
                          ? 'border-ibm-purple bg-ibm-purple/10 text-purple-300 shadow-glow-purple'
                          : qa.user_answer !== null
                          ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
                          : 'border-white/[0.04] bg-white/[0.01] text-gray-500'
                      }`}
                    >
                      <span>Question {index + 1}</span>
                      {qa.user_answer !== null && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded border border-emerald-500/40 bg-emerald-500/10">
                          {qa.score}/10
                        </span>
                      )}
                    </div>
                  ))}
                  
                  <div 
                    onClick={() => isAllAnswered && setActiveQuestionIdx(currentResult.question_answers ? currentResult.question_answers.length : 0)}
                    className={`p-3 rounded-lg border text-xs font-bold cursor-pointer text-center transition-all ${
                      activeQuestionIdx === (currentResult.question_answers ? currentResult.question_answers.length : -1)
                        ? 'border-ibm-cyan bg-ibm-cyan/10 text-ibm-cyan shadow-glow-cyan'
                        : isAllAnswered
                        ? 'border-white/[0.04] bg-white/[0.01] hover:bg-white/5 text-gray-300'
                        : 'border-white/[0.02] bg-transparent text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    View Overall Summary
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right panel: Active Interview Room or Session Summary */}
          <div className="lg:col-span-8">
            {currentResult ? (
              <div className="space-y-6">
                
                {/* Check if active question room is showing */}
                {currentResult.question_answers && activeQuestionIdx < currentResult.question_answers.length ? (
                  activeQuestion && (
                    <motion.div 
                      key={activeQuestion.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      {/* Question panel */}
                      <div className="glass-card border border-ibm-border rounded-xl p-6 space-y-3">
                        <span className="text-[10px] uppercase font-bold text-ibm-cyan tracking-wider">
                          Question {activeQuestionIdx + 1} &bull; {activeQuestion.type}
                        </span>
                        <h3 className="text-base font-extrabold text-white leading-relaxed">
                          {activeQuestion.question}
                        </h3>
                      </div>

                      {/* Answer Input or Answer results */}
                      {activeQuestion.user_answer === null ? (
                        <div className="glass-card border border-ibm-border rounded-xl p-6 space-y-4">
                          <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                            Your Response
                          </label>
                          <textarea
                            rows={6}
                            placeholder="Draft your answer here using the STAR format (Situation, Task, Action, Result)..."
                            value={userAnswer}
                            onChange={(e) => setUserAnswer(e.target.value)}
                            disabled={isGrading}
                            className="w-full p-4 bg-black/40 border border-ibm-border rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-ibm-blue focus:shadow-glow-blue transition-all resize-none leading-relaxed"
                          />
                          <div className="flex justify-end">
                            <button
                              onClick={handleSubmitAnswer}
                              disabled={!userAnswer.trim() || isGrading}
                              className="px-6 py-2 bg-gradient-to-r from-ibm-blue to-ibm-purple text-white rounded-lg text-xs font-bold shadow-glow-purple flex items-center gap-1.5 hover:scale-[1.01] transition-all disabled:opacity-50"
                            >
                              {isGrading ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Grading Answer...
                                </>
                              ) : (
                                <>
                                  Submit Answer
                                  <Send className="w-3.5 h-3.5" />
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Question Feedback details */
                        <div className="space-y-6">
                          {/* Answer review */}
                          <div className="glass-card border border-ibm-border rounded-xl p-6 space-y-3">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Your Submitted Answer</h4>
                            <p className="text-xs text-gray-300 leading-relaxed italic">
                              "{activeQuestion.user_answer}"
                            </p>
                          </div>

                          {/* STAR Critique */}
                          {activeQuestion.feedback && (
                            <div className="glass-card border border-ibm-border rounded-xl p-6 space-y-5">
                              <div className="flex justify-between items-center border-b border-ibm-border pb-3">
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                                  STAR Critique Feedback
                                </h3>
                                <div className="px-2.5 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/5 text-xs font-extrabold text-emerald-400">
                                  Score: {activeQuestion.score}/10
                                </div>
                              </div>

                              <div className="space-y-4 text-xs">
                                <div className="grid md:grid-cols-2 gap-4">
                                  <div className="space-y-1 p-3 bg-white/[0.01] border border-white/[0.03] rounded-lg">
                                    <span className="text-[10px] font-bold text-ibm-cyan uppercase tracking-widest block">Situation</span>
                                    <p className="text-gray-300 leading-relaxed">{activeQuestion.feedback.situation}</p>
                                  </div>
                                  <div className="space-y-1 p-3 bg-white/[0.01] border border-white/[0.03] rounded-lg">
                                    <span className="text-[10px] font-bold text-ibm-purple uppercase tracking-widest block">Task</span>
                                    <p className="text-gray-300 leading-relaxed">{activeQuestion.feedback.task}</p>
                                  </div>
                                </div>
                                
                                <div className="grid md:grid-cols-2 gap-4">
                                  <div className="space-y-1 p-3 bg-white/[0.01] border border-white/[0.03] rounded-lg">
                                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">Action</span>
                                    <p className="text-gray-300 leading-relaxed">{activeQuestion.feedback.action}</p>
                                  </div>
                                  <div className="space-y-1 p-3 bg-white/[0.01] border border-white/[0.03] rounded-lg">
                                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">Result</span>
                                    <p className="text-gray-300 leading-relaxed">{activeQuestion.feedback.result}</p>
                                  </div>
                                </div>

                                <div className="h-px bg-white/[0.04]" />

                                <div className="space-y-1.5 p-3.5 bg-ibm-purple/5 border border-ibm-purple/20 rounded-lg">
                                  <span className="text-[10px] font-bold text-purple-300 uppercase tracking-widest block">Agent Suggestions for Improvement</span>
                                  <p className="text-gray-200 leading-relaxed italic">
                                    {activeQuestion.feedback.improvements}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Navigation buttons */}
                          <div className="flex justify-between items-center">
                            <button
                              onClick={() => setActiveQuestionIdx(prev => Math.max(0, prev - 1))}
                              className="px-4 py-2 border border-ibm-border bg-white/[0.01] rounded-lg text-xs font-bold text-gray-400 hover:text-white transition-all flex items-center gap-1"
                            >
                              <ChevronLeft className="w-4 h-4" />
                              Previous
                            </button>
                            
                            {currentResult.question_answers && activeQuestionIdx < currentResult.question_answers.length - 1 ? (
                              <button
                                onClick={() => {
                                  setActiveQuestionIdx(prev => prev + 1);
                                }}
                                className="px-5 py-2 bg-ibm-blue hover:bg-ibm-blue/80 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                              >
                                Next Question
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => setActiveQuestionIdx(currentResult.question_answers ? currentResult.question_answers.length : 0)}
                                className="px-5 py-2 bg-gradient-to-r from-ibm-blue to-ibm-purple text-white rounded-lg text-xs font-bold shadow-glow-purple transition-all flex items-center gap-1"
                              >
                                View Final Summary
                                <Award className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )
                ) : (
                  /* Overall Summary Screen */
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-6 text-center"
                  >
                    <div className="glass-card border border-ibm-border rounded-xl p-8 space-y-5 flex flex-col items-center">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-ibm-blue to-ibm-purple p-0.5 shadow-glow-purple flex items-center justify-center text-white">
                        <Award className="w-7 h-7" />
                      </div>
                      
                      <div className="space-y-1">
                        <h3 className="text-xl font-extrabold text-white">Mock Session Completed</h3>
                        <p className="text-xs text-gray-400">STAR framework evaluation analysis complete.</p>
                      </div>

                      <div className="text-center py-2 px-6 bg-white/[0.02] border border-ibm-border rounded-xl">
                        <span className="text-5xl font-black text-ibm-cyan">{currentResult.overall_score}</span>
                        <span className="text-gray-500 font-bold"> / 10</span>
                        <span className="block text-[9px] uppercase font-bold text-gray-500 tracking-wider mt-1">Aggregate Score</span>
                      </div>
                    </div>

                    {/* Chart Analysis Card */}
                    <div className="glass-card border border-ibm-border rounded-xl p-6 space-y-4">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest text-left">
                        Performance Metric Indices
                      </h4>
                      <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={getMetricData()}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                            <XAxis dataKey="name" stroke="#888" fontSize={10} />
                            <YAxis domain={[0, 100]} stroke="#888" fontSize={10} />
                            <Tooltip contentStyle={{ background: '#030303', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '11px' }} />
                            <Bar dataKey="percentage" fill="url(#barGradient)" radius={[4, 4, 0, 0]}>
                              {/* Custom gradient color */}
                              <defs>
                                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#8a3ffc" stopOpacity={0.8}/>
                                  <stop offset="100%" stopColor="#0f62fe" stopOpacity={0.3}/>
                                </linearGradient>
                              </defs>
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </motion.div>
                )}

              </div>
            ) : (
              <div className="glass-card border border-ibm-border rounded-xl p-16 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
                <MessageSquare className="w-12 h-12 opacity-30 text-ibm-blue animate-pulse" />
                <h3 className="text-sm font-bold text-white">Coach Simulator Standby</h3>
                <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                  Select your practice category on the left and start the mock session. The AI agent will feed questions in real time.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
export default InterviewCoach;
