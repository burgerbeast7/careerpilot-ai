import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Bot, Mail, Lock, Loader2 } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all credentials.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Incorrect email or password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-glow-grid flex items-center justify-center px-4 overflow-hidden">
      {/* Decorative Glow Circles */}
      <div className="absolute top-[20%] left-[30%] w-96 h-96 bg-radial-gradient-blue-glow blur-2xl pointer-events-none opacity-55" />
      <div className="absolute bottom-[20%] right-[30%] w-96 h-96 bg-radial-gradient-purple-glow blur-2xl pointer-events-none opacity-55" style={{ background: 'radial-gradient(circle, rgba(138, 63, 252, 0.08) 0%, transparent 60%)' }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[420px] relative z-10"
      >
        <div className="glass-panel rounded-2xl border border-ibm-border p-8 shadow-glass">
          
          {/* Logo Header */}
          <div className="flex flex-col items-center mb-8">
            <Link to="/" className="w-12 h-12 rounded-xl bg-gradient-to-tr from-ibm-blue to-ibm-purple p-0.5 shadow-glow-blue flex items-center justify-center mb-3">
              <Bot className="w-6 h-6 text-white" />
            </Link>
            <h2 className="text-2xl font-bold text-white tracking-wide">Welcome Back</h2>
            <p className="text-xs text-gray-400 mt-1">Sign in to access your CareerPilot dashboard</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 tracking-wider">EMAIL ADDRESS</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                <input
                  type="email"
                  required
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-black/40 border border-ibm-border rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-ibm-blue focus:shadow-glow-blue transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-gray-400 tracking-wider">PASSWORD</label>
                <Link to="/forgot-password" className="text-[10px] text-ibm-cyan hover:underline">Forgot?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-black/40 border border-ibm-border rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-ibm-blue focus:shadow-glow-blue transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-gradient-to-r from-ibm-blue to-ibm-purple text-white rounded-lg text-sm font-bold shadow-glow-purple flex items-center justify-center gap-2 hover:scale-[1.01] transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Footer Navigation */}
          <div className="mt-8 pt-4 border-t border-white/[0.04] text-center text-xs text-gray-400">
            Don't have an account?{' '}
            <Link to="/signup" className="text-ibm-cyan hover:underline font-medium">Create Account</Link>
          </div>

        </div>
      </motion.div>
    </div>
  );
};
export default Login;
