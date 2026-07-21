import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Bot, Mail, Lock, User, Briefcase, Building, ChevronDown, Loader2 } from 'lucide-react';

declare global {
  interface Window {
    google?: any;
  }
}

export const Signup: React.FC = () => {
  const { signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [targetCompany, setTargetCompany] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('Internship');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Google sign in states
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [showMockGoogleModal, setShowMockGoogleModal] = useState(false);

  // Dynamically load Google GSI script if client ID is set
  useEffect(() => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (googleClientId) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);

      script.onload = () => {
        if (window.google) {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: (response: any) => {
              handleGoogleCredential(response.credential);
            },
          });
        }
      };

      return () => {
        document.body.removeChild(script);
      };
    }
  }, []);

  const handleGoogleCredential = async (credential: string) => {
    setIsGoogleSubmitting(true);
    setError(null);
    try {
      await loginWithGoogle(credential);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Google sign-up failed. Please try again.');
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const handleGoogleButtonClick = () => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (googleClientId && window.google) {
      window.google.accounts.id.prompt();
    } else {
      setShowMockGoogleModal(true);
    }
  };

  const handleMockGoogleSelect = async (mockEmail: string, mockName: string) => {
    setShowMockGoogleModal(false);
    setIsGoogleSubmitting(true);
    setError(null);
    try {
      await loginWithGoogle(undefined, mockEmail, mockName);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Simulation Google sign-in failed.');
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

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
                    placeholder="name@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-black/40 border border-ibm-border rounded-lg text-xs text-white focus:outline-none focus:border-ibm-blue focus:shadow-glow-blue transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-semibold text-gray-400 tracking-wider">PASSWORD</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-black/40 border border-ibm-border rounded-lg text-xs text-white focus:outline-none focus:border-ibm-blue focus:shadow-glow-blue transition-all"
                />
              </div>
            </div>

            {/* Split layout for Targets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-semibold text-gray-400 tracking-wider">TARGET ROLE</label>
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
              disabled={isSubmitting || isGoogleSubmitting}
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

          {/* Separator */}
          <div className="flex items-center my-4">
            <div className="flex-1 h-[1px] bg-white/[0.06]"></div>
            <span className="text-[9px] font-semibold text-gray-500 px-3 tracking-wider">OR SIGN UP WITH</span>
            <div className="flex-1 h-[1px] bg-white/[0.06]"></div>
          </div>

          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogleButtonClick}
            disabled={isSubmitting || isGoogleSubmitting}
            className="w-full py-2 bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 hover:scale-[1.01] transition-all disabled:opacity-50"
          >
            {isGoogleSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
                />
              </svg>
            )}
            {isGoogleSubmitting ? 'Connecting...' : 'Sign up with Google'}
          </button>

          {/* Footer Navigation */}
          <div className="mt-6 pt-4 border-t border-white/[0.04] text-center text-xs text-gray-400">
            Already have an profile?{' '}
            <Link to="/login" className="text-ibm-cyan hover:underline font-medium">Sign In</Link>
          </div>

        </div>
      </motion.div>

      {/* Simulated Google SSO Modal */}
      <AnimatePresence>
        {showMockGoogleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMockGoogleModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-[360px] bg-[#1e1e1e] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-10 p-6"
            >
              {/* Header */}
              <div className="text-center mb-6">
                <svg className="w-8 h-8 mx-auto mb-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"/>
                </svg>
                <h3 className="text-sm font-semibold text-white">Sign up with Google</h3>
                <p className="text-xs text-gray-400 mt-1">Select an account to authorize CareerPilot AI</p>
              </div>

              {/* Account Selection Options */}
              <div className="space-y-3.5">
                <button
                  onClick={() => handleMockGoogleSelect('kunal.das@gmail.com', 'Kunal Das')}
                  className="w-full flex items-center gap-3 p-3 bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05] hover:border-white/[0.1] rounded-lg text-left transition-all group"
                >
                  <div className="w-8 h-8 rounded-full bg-ibm-blue/20 text-ibm-blue font-bold text-xs flex items-center justify-center border border-ibm-blue/25 group-hover:scale-105 transition-transform">
                    KD
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">Kunal Das</h4>
                    <p className="text-[10px] text-gray-400">kunal.das@gmail.com</p>
                  </div>
                </button>

                <button
                  onClick={() => handleMockGoogleSelect('ibm.innovator@gmail.com', 'IBM Innovator')}
                  className="w-full flex items-center gap-3 p-3 bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05] hover:border-white/[0.1] rounded-lg text-left transition-all group"
                >
                  <div className="w-8 h-8 rounded-full bg-ibm-purple/20 text-ibm-purple font-bold text-xs flex items-center justify-center border border-ibm-purple/25 group-hover:scale-105 transition-transform">
                    II
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">IBM Innovator</h4>
                    <p className="text-[10px] text-gray-400">ibm.innovator@gmail.com</p>
                  </div>
                </button>
              </div>

              {/* Close footer button */}
              <button
                onClick={() => setShowMockGoogleModal(false)}
                className="w-full text-center text-xs text-gray-500 hover:text-gray-300 mt-5 pt-3 border-t border-white/[0.04] transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default Signup;
