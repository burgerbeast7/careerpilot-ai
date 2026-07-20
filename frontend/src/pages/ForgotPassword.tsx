import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bot, Mail, ArrowLeft, Send, CheckCircle } from 'lucide-react';
import api from '../services/api';

export const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await api.post('/auth/forgot-password', { email });
      setIsSent(true);
      setTimeout(() => {
        navigate(`/reset-password?email=${encodeURIComponent(email)}`);
      }, 2500);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'An error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-glow-grid flex items-center justify-center px-4 overflow-hidden">
      <div className="absolute top-[20%] left-[30%] w-96 h-96 bg-radial-gradient-blue-glow blur-2xl pointer-events-none opacity-50" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[400px] relative z-10"
      >
        <div className="glass-panel rounded-2xl border border-ibm-border p-8 shadow-glass">
          
          <div className="flex flex-col items-center mb-6">
            <div className="w-11 h-11 rounded-lg bg-gradient-to-tr from-ibm-blue to-ibm-purple p-0.5 shadow-glow-blue flex items-center justify-center mb-3">
              <Bot className="w-5.5 h-5.5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide">Recover Password</h2>
            <p className="text-xs text-gray-400 mt-1 text-center">Enter your email and we'll send recovery links</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              {error}
            </div>
          )}

          {isSent ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6" />
              </div>
              <p className="text-sm text-gray-300">
                Recovery link dispatched to <strong className="text-white">{email}</strong>. Please check your inbox.
              </p>
              <Link 
                to="/login" 
                className="inline-flex items-center gap-2 text-xs font-semibold text-ibm-cyan hover:underline pt-2"
              >
                <ArrowLeft className="w-4.5 h-4.5" />
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] font-semibold text-gray-400 tracking-wider">EMAIL ADDRESS</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                  <input
                    type="email"
                    required
                    placeholder="name@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-black/40 border border-ibm-border rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-ibm-blue focus:shadow-glow-blue transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-gradient-to-r from-ibm-blue to-ibm-purple text-white rounded-lg text-xs font-bold shadow-glow-purple flex items-center justify-center gap-2 hover:scale-[1.01] transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Sending Request...' : 'Send Recovery Link'}
                <Send className="w-3.5 h-3.5" />
              </button>

              <div className="text-center pt-2">
                <Link 
                  to="/login" 
                  className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Login
                </Link>
              </div>
            </form>
          )}

        </div>
      </motion.div>
    </div>
  );
};
export default ForgotPassword;
