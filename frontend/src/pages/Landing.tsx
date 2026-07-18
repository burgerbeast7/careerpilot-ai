import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Bot, ArrowRight, Zap, Target, Cpu, Shield, 
  BarChart, Map, MessageSquare, FileText, ChevronRight
} from 'lucide-react';

// Canvas Particle background component
const ParticleCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
    }> = [];

    const colors = ['#0f62fe', '#8a3ffc', '#00f0ff'];

    // Create particles
    for (let i = 0; i < 75; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        radius: Math.random() * 2 + 1.5,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    let mouseX = 0;
    let mouseY = 0;
    let isMouseActive = false;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      isMouseActive = true;
    };

    const handleMouseLeave = () => {
      isMouseActive = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw and update particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        // Boundary collision
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        // Mouse attraction
        if (isMouseActive) {
          const dx = mouseX - p.x;
          const dy = mouseY - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            p.x += dx * 0.01;
            p.y += dy * 0.01;
          }
        }
      });

      // Connect close particles with lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 * (1 - dist / 110)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none opacity-60" />;
};

export const Landing: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    { title: "1. Resume Parsing", desc: "Extract structures, keywords, and history automatically." },
    { title: "2. ATS Diagnostics", desc: "Compare contents against enterprise match algorithms." },
    { title: "3. Skill Mapping", desc: "Highlight code gaps and prioritize targets." },
    { title: "4. Roadmap Flowing", desc: "Auto-construct weekly plans, coursework and projects." },
    { title: "5. Simulator Coaching", desc: "Conduct active behavioral and technical mocks." }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative min-h-screen bg-glow-grid flex flex-col justify-between overflow-x-hidden">
      {/* Particles layer */}
      <ParticleCanvas />

      {/* Decorative Glow Circles */}
      <div className="absolute top-[10%] left-[5%] w-96 h-96 bg-radial-gradient-blue-glow blur-2xl pointer-events-none" />
      <div className="absolute bottom-[20%] right-[5%] w-96 h-96 bg-radial-gradient-cyan-glow blur-2xl pointer-events-none" />
      <div className="absolute top-[40%] right-[15%] w-[450px] h-[450px] bg-radial-gradient-glow blur-3xl pointer-events-none opacity-40" />

      {/* Global Landing Header */}
      <header className="relative z-10 w-full px-6 py-5 max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-ibm-blue to-ibm-purple p-0.5 shadow-glow-blue flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-wider text-white">
            CareerPilot <span className="text-ibm-cyan text-xs px-1 py-0.5 rounded bg-ibm-cyan/10 border border-ibm-cyan/20">AI</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm font-semibold text-gray-300 hover:text-white transition">
            Sign In
          </Link>
          <Link 
            to="/signup" 
            className="text-xs px-4 py-2 rounded-lg font-bold bg-gradient-to-r from-ibm-blue to-ibm-purple text-white shadow-glow-purple hover:scale-105 transition-all"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col justify-center max-w-7xl mx-auto px-6 py-12 lg:py-20 w-full">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          
          {/* Hero Left Content */}
          <div className="lg:col-span-7 flex flex-col space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-ibm-blue/30 bg-ibm-blue/5 self-start text-xs font-semibold text-ibm-cyan">
              <Zap className="w-3.5 h-3.5" />
              <span>Multi-Agent Career Framework v1.0</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] text-white">
              The AI-Powered
              <span className="block bg-gradient-to-r from-ibm-blue via-ibm-purple to-ibm-cyan bg-clip-text text-transparent">
                Career Agentic Platform
              </span>
              for Placements.
            </h1>

            <p className="text-base sm:text-lg text-gray-400 max-w-xl">
              CareerPilot AI coordinates specialized AI agents in real-time to analyze your resume, optimize ATS match metrics, outline learning plans, and coach you through realistic mock interviews.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-3">
              <Link 
                to="/signup" 
                className="flex items-center justify-center gap-2 text-sm px-6 py-3 rounded-lg font-bold bg-gradient-to-r from-ibm-blue to-ibm-purple text-white shadow-glow-purple hover:translate-x-1 transition duration-300"
              >
                Launch App Console
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a 
                href="#features" 
                className="flex items-center justify-center gap-2 text-sm px-6 py-3 rounded-lg font-bold border border-ibm-border bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition duration-300"
              >
                Explore Features
              </a>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-ibm-border max-w-md">
              <div>
                <div className="text-2xl font-bold text-white">94%</div>
                <div className="text-xs text-gray-500">ATS Optimization</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">10x</div>
                <div className="text-xs text-gray-500">Prep Efficiency</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">8+</div>
                <div className="text-xs text-gray-500">Cooperating Agents</div>
              </div>
            </div>
          </div>

          {/* Hero Right: Live Interactive Workflow Animation */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <div className="w-full max-w-[420px] glass-panel border border-ibm-border rounded-xl p-5 shadow-glass relative">
              <div className="flex items-center justify-between border-b border-ibm-border pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-ibm-cyan animate-ping" />
                  <span className="text-xs font-semibold tracking-wider text-gray-400 uppercase">Agent Flow Visualizer</span>
                </div>
                <span className="text-[10px] text-gray-500 font-mono">Status: active</span>
              </div>

              {/* Dynamic steps path */}
              <div className="space-y-3">
                {steps.map((step, idx) => {
                  const active = idx === activeStep;
                  return (
                    <motion.div 
                      key={idx}
                      animate={active ? { scale: 1.02, x: 4 } : { scale: 1, x: 0 }}
                      className={`p-3 rounded-lg border transition-all duration-300 ${
                        active 
                          ? 'bg-ibm-purple/10 border-ibm-purple/40 text-white shadow-glow-purple' 
                          : 'bg-white/5 border-white/[0.04] text-gray-500'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${active ? 'text-ibm-cyan' : 'text-gray-400'}`}>
                          {step.title}
                        </span>
                        {active && <ChevronRight className="w-4 h-4 text-ibm-cyan" />}
                      </div>
                      {active && (
                        <p className="text-[10px] text-gray-300 mt-1">
                          {step.desc}
                        </p>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Tiny Code Panel */}
              <div className="mt-4 p-3 bg-black/60 rounded border border-ibm-border font-mono text-[9px] text-ibm-cyan/80">
                <span className="text-gray-500">// Master Orchestrator dispatching tasks:</span>
                <div className="mt-1 flex items-center justify-between">
                  <span>&gt; pipeline.execute(user_resume)</span>
                  <span className="text-emerald-400 animate-pulse">Running</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Feature Showcase Grid Section */}
      <section id="features" className="relative z-10 w-full px-6 py-20 bg-black/60 border-t border-ibm-border">
        <div className="max-w-7xl mx-auto flex flex-col items-center">
          
          <div className="text-center max-w-2xl mb-16">
            <h2 className="text-3xl font-extrabold text-white mb-4">
              Equipped with Specialized AI Agents
            </h2>
            <p className="text-gray-400 text-sm">
              Our orchestrator splits tasks among deep-domain agents designed to refine portfolios, trace gaps, and guide workflows.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            {/* Feature 1 */}
            <div className="glass-card glass-card-interactive rounded-xl p-6 flex flex-col space-y-4">
              <div className="w-10 h-10 rounded-lg bg-ibm-blue/10 border border-ibm-blue/20 flex items-center justify-center text-ibm-blue">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">ATS Parsing & Scores</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Scan resumes, extract section structures, detect formatting errors, and output an official ATS score complete with targeted keywords.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-card glass-card-interactive rounded-xl p-6 flex flex-col space-y-4">
              <div className="w-10 h-10 rounded-lg bg-ibm-purple/10 border border-ibm-purple/20 flex items-center justify-center text-ibm-purple">
                <BarChart className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Skill Gap Analysis</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Compare your capabilities with placement needs at top tech firms (IBM, Stripe, Google) and list what skills are missing.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-card glass-card-interactive rounded-xl p-6 flex flex-col space-y-4">
              <div className="w-10 h-10 rounded-lg bg-ibm-cyan/10 border border-ibm-cyan/20 flex items-center justify-center text-ibm-cyan">
                <Map className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">4/8/12-Week Roadmaps</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Construct clear learning curves containing week-by-week benchmarks, course suggestions, certificates, and projects.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="glass-card glass-card-interactive rounded-xl p-6 flex flex-col space-y-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Interview Simulator</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Practice typing answers to coding, behavioral, and system questions, and get feedback scored against the STAR framework.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="glass-card glass-card-interactive rounded-xl p-6 flex flex-col space-y-4">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Application Auto-Generator</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Generate tailored resumes, cover letters, and cold email outreach sheets matching specific roles, exportable as PDFs.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="glass-card glass-card-interactive rounded-xl p-6 flex flex-col space-y-4">
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Internship Tracker</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Get custom recommendations ranking target positions and track your pipeline progress via an interactive Kanban board.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Security Banner */}
      <section className="relative z-10 py-12 max-w-7xl mx-auto px-6 text-center border-t border-white/[0.04]">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-gray-500 text-xs">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-ibm-blue" />
            <span>GDPR and Privacy Compliant File Handling</span>
          </div>
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-ibm-purple" />
            <span>Powered by watsonx & Gemini Models</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 w-full px-6 py-8 border-t border-ibm-border bg-black">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <div>
            &copy; {new Date().getFullYear()} CareerPilot AI. Built for IBM Research & Placement Mocks.
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-white transition">Privacy Policy</a>
            <a href="#" className="hover:text-white transition">Terms of Service</a>
            <a href="https://github.com" className="hover:text-white transition" target="_blank" rel="noreferrer">GitHub Project</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default Landing;
