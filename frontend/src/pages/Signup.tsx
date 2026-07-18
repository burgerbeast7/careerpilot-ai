import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Bot, Mail, Lock, User, Briefcase, Building, ChevronDown, Loader2 } from 'lucide-react';

export const Signup: React.FC = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [targetCompany, setTargetCompany] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('Internship');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      setError('Please fill in all core credentials.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await signup(
        fullName,
        email,
        password,
        targetRole || undefined,
        targetCompany || undefined,
        experienceLevel || undefined
      );
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create account. Email might be in use.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-glow-grid flex items-center justify-center px-4 py-8 overflow-hidden">
      {/* Glow overlays */}
      <div className="absolute top-[10%] left-[20%] w-[350px] h-[350px] bg-radial-gradient-blue-glow blur-2xl pointer-events-none opacity-40" />
      <div className="absolute bottom-[10%] right-[20%] w-[350px] h-[350px] bg-radial-gradient-cyan-glow blur-2xl pointer-events-none opacity-40" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[500px] relative z-10"
      >
        <div className="glass-panel rounded-2xl border border-ibm-border p-8 shadow-glass">
          
          {/* Header */}
          <div className="flex flex-col items-center mb-6">
            <Link to="/" className="w-11 h-11 rounded-lg bg-gradient-to-tr from-ibm-blue to-ibm-purple p-0.5 shadow-glow-blue flex items-center justify-center mb-2">
              <Bot className="w-5.5 h-5.5 text-white" />
            </Link>
            <h2 className="text-xl font-bold text-white tracking-wide">Create AI Profile</h2>
            <p className="text-xs text-gray-400 mt-0.5">Initialize your agentic career companion parameters</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Split layout for Auth */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-semibold text-gray-400 tracking-wider">FULL NAME</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    required
                    placeholder="Kunal Sen"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-black/40 border border-ibm-border rounded-lg text-xs text-white focus:outline-none focus:border-ibm-blue focus:shadow-glow-blue transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-semibold text-gray-400 tracking-wider">EMAIL ADDRESS</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    required
                    placeholder="student@ibm.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-black/40 border border-ibm-border rounded-lg text-xs text-white focus:outline-none focus:border-ibm-blue focus:shadow-glow-blue transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-semibold text-gray-400 tracking-wider">PASSWORD</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-black/40 border border-ibm-border rounded-lg text-xs text-white focus:outline-none focus:border-ibm-blue focus:shadow-glow-blue transition-all"
                />
              </div>
            </div>

            <div className="h-px bg-white/[0.04] my-2" />

            {/* Target Job Prefs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-semibold text-gray-400 tracking-wider">TARGET CAREER ROLE</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Software Engineer"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-black/40 border border-ibm-border rounded-lg text-xs text-white focus:outline-none focus:border-ibm-blue focus:shadow-glow-blue transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-semibold text-gray-400 tracking-wider">TARGET COMPANY</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="IBM Research"
                    value={targetCompany}
                    onChange={(e) => setTargetCompany(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-black/40 border border-ibm-border rounded-lg text-xs text-white focus:outline-none focus:border-ibm-blue focus:shadow-glow-blue transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Dropdown for level */}
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-semibold text-gray-400 tracking-wider">EXPERIENCE PREFERENCE</label>
              <div className="relative">
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 bg-black/40 border border-ibm-border rounded-lg text-xs text-white appearance-none focus:outline-none focus:border-ibm-blue focus:shadow-glow-blue transition-all"
                >
                  <option value="Internship" className="bg-zinc-950 text-white">Internship (placement target)</option>
                  <option value="Entry-level" className="bg-zinc-950 text-white">Entry-level Engineer (0-2 yrs)</option>
                  <option value="Mid-level" className="bg-zinc-950 text-white">Associate / Mid-level Engineer (2+ yrs)</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 bg-gradient-to-r from-ibm-blue to-ibm-purple text-white rounded-lg text-xs font-bold shadow-glow-purple flex items-center justify-center gap-2 hover:scale-[1.01] transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating AI profile...
                </>
              ) : (
                'Create Profile'
              )}
            </button>
          </form>

          {/* Footer Navigation */}
          <div className="mt-6 pt-4 border-t border-white/[0.04] text-center text-xs text-gray-400">
            Already have an profile?{' '}
            <Link to="/login" className="text-ibm-cyan hover:underline font-medium">Sign In</Link>
          </div>

        </div>
      </motion.div>
    </div>
  );
};
export default Signup;
