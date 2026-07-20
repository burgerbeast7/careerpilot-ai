import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bot, Mail, Key, Lock, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import api from '../services/api';

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !code || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post('/auth/reset-password', { email, code, password });
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Reset failed. Please check your recovery code.');
    } finally {
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
            <h2 className="text-xl font-bold text-white tracking-wide">Reset Password</h2>
            <p className="text-xs text-gray-400 mt-1 text-center">Enter your verification code and new password</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              {error}
            </div>
          )}

          {isSuccess ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6" />
              </div>
              <p className="text-sm text-gray-300">
                Password updated successfully! You can now log in with your new password.
              </p>
              <Link 
                to="/login" 
                className="inline-flex items-center gap-2 text-xs font-semibold text-ibm-cyan hover:underline pt-2"
              >
                <ArrowLeft className="w-4.5 h-4.5" />
                Go to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
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

              {/* Recovery Code */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] font-semibold text-gray-400 tracking-wider">VERIFICATION CODE (6-DIGIT)</label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                  <input
                    type="text"
                    required
                    placeholder="123456"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-black/40 border border-ibm-border rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-ibm-blue focus:shadow-glow-blue transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] font-semibold text-gray-400 tracking-wider">NEW PASSWORD</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-black/40 border border-ibm-border rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-ibm-blue focus:shadow-glow-blue transition-all"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] font-semibold text-gray-400 tracking-wider">CONFIRM NEW PASSWORD</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-black/40 border border-ibm-border rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-ibm-blue focus:shadow-glow-blue transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-gradient-to-r from-ibm-blue to-ibm-purple text-white rounded-lg text-xs font-bold shadow-glow-purple flex items-center justify-center gap-2 hover:scale-[1.01] transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>

              <div className="text-center pt-2">
                <Link 
                  to="/forgot-password" 
                  className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </Link>
              </div>
            </form>
          )}

        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
