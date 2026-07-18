import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Compass, ChevronRight, ChevronLeft, 
  Target, Loader2, Sparkles
} from 'lucide-react';
import api from '../services/api';

interface JobRecommendation {
  id: number;
  job_title: string;
  company: string;
  match_score: string;
  match_explanation: string;
  required_skills: string[];
  status: string; // "Recommended" | "Applied" | "Interviewing" | "Offered" | "Rejected"
}

const COLUMNS = [
  { id: 'Recommended', name: 'Recommended', color: 'text-ibm-cyan border-ibm-cyan/20 bg-ibm-cyan/5' },
  { id: 'Applied', name: 'Applied', color: 'text-ibm-blue border-ibm-blue/20 bg-ibm-blue/5' },
  { id: 'Interviewing', name: 'Interviewing', color: 'text-ibm-purple border-ibm-purple/20 bg-ibm-purple/5' },
  { id: 'Offered', name: 'Offered', color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' },
  { id: 'Rejected', name: 'Rejected', color: 'text-red-400 border-red-500/20 bg-red-500/5' }
];

export const Recommendations: React.FC = () => {
  // Query recommendations
  const { data: jobList = [], refetch: refetchJobs, isLoading } = useQuery<JobRecommendation[]>({
    queryKey: ['job-recommendations'],
    queryFn: async () => {
      const response = await api.get('/recommendations/list');
      return response.data;
    }
  });

  // Mutation to generate recommendations
  const recommendMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/recommendations/recommend');
      return response.data;
    },
    onSuccess: () => {
      refetchJobs();
    }
  });

  // Mutation to update application status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await api.post(`/recommendations/update-status?recommendation_id=${id}`, {
        status
      });
      return response.data;
    },
    onSuccess: () => {
      refetchJobs();
    }
  });

  const handleMoveStatus = (id: number, currentStatus: string, direction: 'forward' | 'backward') => {
    const statusOrder = COLUMNS.map(c => c.id);
    const currentIndex = statusOrder.indexOf(currentStatus);
    
    let newIndex = currentIndex;
    if (direction === 'forward' && currentIndex < statusOrder.length - 1) {
      newIndex += 1;
    } else if (direction === 'backward' && currentIndex > 0) {
      newIndex -= 1;
    }
    
    if (newIndex !== currentIndex) {
      updateStatusMutation.mutate({ id, status: statusOrder[newIndex] });
    }
  };

  return (
    <div className="flex-1 bg-black/95 text-white p-6 md:p-8 relative overflow-hidden">
      <div className="absolute top-[10%] left-[20%] w-96 h-96 bg-ibm-blue/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* Header */}
        <div className="border-b border-ibm-border pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Internship Tracker</h1>
            <p className="text-xs text-gray-400 mt-1">
              Track recommended internships and update your pipeline stages inside the Kanban tracker board.
            </p>
          </div>
          
          <button
            onClick={() => recommendMutation.mutate()}
            disabled={recommendMutation.isPending || isLoading}
            className="px-5 py-2.5 bg-gradient-to-r from-ibm-blue to-ibm-purple text-white rounded-lg text-xs font-bold shadow-glow-purple flex items-center gap-1.5 hover:scale-[1.01] transition-all disabled:opacity-50"
          >
            {recommendMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Matching Roles...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Recommend Internships
              </>
            )}
          </button>
        </div>

        {/* Loading / Empty / Board States */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-9 h-9 animate-spin text-ibm-blue" />
            <span className="text-xs text-gray-500 font-mono">Querying matched vacancies...</span>
          </div>
        ) : jobList.length === 0 ? (
          <div className="glass-card border border-ibm-border rounded-xl p-16 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
            <Compass className="w-12 h-12 opacity-30 text-ibm-blue animate-pulse" />
            <h3 className="text-sm font-bold text-white">No Vacancies Loaded</h3>
            <p className="text-xs text-gray-400 max-w-sm leading-relaxed mx-auto">
              Tap the recommendation button above to invoke the Career Placement Agent. It will analyze your profile and match internships.
            </p>
          </div>
        ) : (
          /* Kanban Board layout */
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start overflow-x-auto pb-4">
            {COLUMNS.map((col) => {
              const colJobs = jobList.filter(job => job.status === col.id);
              
              return (
                <div 
                  key={col.id}
                  className="glass-card border border-ibm-border rounded-xl p-4 space-y-4 min-h-[460px] flex flex-col"
                >
                  {/* Column Header */}
                  <div className={`p-2.5 rounded-lg border text-center text-xs font-black tracking-wider uppercase ${col.color}`}>
                    {col.name} ({colJobs.length})
                  </div>

                  {/* Column Jobs List */}
                  <div className="flex-1 space-y-3 overflow-y-auto max-h-[400px] pr-1">
                    <AnimatePresence mode="popLayout">
                      {colJobs.map((job) => (
                        <motion.div
                          key={job.id}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="p-4 bg-white/[0.01] border border-white/[0.03] rounded-lg space-y-3 hover:border-ibm-purple/20 hover:bg-white/[0.02] transition-all relative group"
                        >
                          {/* Top: title */}
                          <div className="space-y-0.5">
                            <h4 className="text-xs font-bold text-white line-clamp-1">{job.job_title}</h4>
                            <span className="text-[10px] text-gray-500 font-semibold">{job.company}</span>
                          </div>

                          {/* Matching indicator */}
                          <div className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-ibm-cyan/10 border border-ibm-cyan/20 text-[9px] text-ibm-cyan font-bold">
                            <Target className="w-3 h-3" />
                            <span>{job.match_score} Match</span>
                          </div>

                          <p className="text-[10px] text-gray-400 leading-relaxed line-clamp-2">
                            {job.match_explanation}
                          </p>

                          {/* Skill badges */}
                          <div className="flex flex-wrap gap-1">
                            {job.required_skills.slice(0, 3).map((s, idx) => (
                              <span key={idx} className="px-1.5 py-0.2 rounded bg-white/5 border border-white/[0.04] text-[8px] text-gray-400">
                                {s}
                              </span>
                            ))}
                          </div>

                          {/* Control arrows to move status columns */}
                          <div className="flex justify-between items-center pt-2 border-t border-white/[0.03]">
                            <button
                              onClick={() => handleMoveStatus(job.id, job.status, 'backward')}
                              disabled={job.status === 'Recommended'}
                              className="p-1 rounded hover:bg-white/5 text-gray-500 hover:text-white disabled:opacity-30 transition"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            
                            <span className="text-[8px] text-gray-600 font-mono">MOVE</span>

                            <button
                              onClick={() => handleMoveStatus(job.id, job.status, 'forward')}
                              disabled={job.status === 'Rejected'}
                              className="p-1 rounded hover:bg-white/5 text-gray-500 hover:text-white disabled:opacity-30 transition"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};
export default Recommendations;
