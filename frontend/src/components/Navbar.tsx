import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Bot, LayoutDashboard, FileText, Award, 
  Map, MessageSquare, Briefcase, LogOut, Menu, X, User, Compass
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = React.useState(false);

  if (!isAuthenticated) return null;

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Resume AI', path: '/resume-analyzer', icon: FileText },
    { name: 'Skill Gap', path: '/skill-gap', icon: Award },
    { name: 'Roadmap', path: '/roadmap', icon: Map },
    { name: 'Interview', path: '/interview-coach', icon: MessageSquare },
    { name: 'Docs', path: '/doc-generator', icon: Briefcase },
    { name: 'Jobs', path: '/recommendations', icon: Compass },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 w-full px-4 py-3 bg-black/40 backdrop-blur-md border-b border-ibm-border">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/dashboard" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-ibm-blue to-ibm-purple p-0.5 shadow-glow-blue flex items-center justify-center">
            <Bot className="w-5 h-5 text-white animate-pulse" />
          </div>
          <span className="font-bold text-lg tracking-wider bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent group-hover:from-ibm-cyan group-hover:to-ibm-blue transition-all duration-300">
            CareerPilot <span className="text-ibm-cyan text-xs font-semibold px-1 py-0.5 rounded bg-ibm-cyan/10 border border-ibm-cyan/20">AI</span>
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden lg:flex items-center gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'text-ibm-cyan bg-ibm-cyan/10 border border-ibm-cyan/20 shadow-glow-cyan'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* User Actions */}
        <div className="hidden lg:flex items-center gap-4">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-white/5 border border-ibm-border">
            <User className="w-4 h-4 text-ibm-purple" />
            <span className="text-xs font-semibold text-gray-300">{user?.full_name || 'Student'}</span>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-200"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>

        {/* Mobile menu toggle */}
        <div className="flex lg:hidden items-center gap-3">
          <span className="text-xs text-gray-400 truncate max-w-[80px]">{user?.full_name?.split(' ')[0]}</span>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded-lg border border-ibm-border text-gray-400 hover:text-white"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="lg:hidden absolute top-full left-0 w-full px-4 py-4 bg-black/95 backdrop-blur-lg border-b border-ibm-border shadow-2xl flex flex-col gap-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium ${
                  active
                    ? 'text-ibm-cyan bg-ibm-cyan/10 border border-ibm-cyan/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4.5 h-4.5" />
                {item.name}
              </Link>
            );
          })}
          <div className="h-px bg-ibm-border my-1" />
          <button
            onClick={() => {
              setIsOpen(false);
              logout();
            }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10"
          >
            <LogOut className="w-4.5 h-4.5" />
            Sign Out
          </button>
        </div>
      )}
    </nav>
  );
};
export default Navbar;
