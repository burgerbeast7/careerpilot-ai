import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Briefcase, FileText, ChevronRight, Download, 
  Copy, ClipboardCheck, Plus, Loader2
} from 'lucide-react';
import api from '../services/api';

interface DocumentItem {
  id: number;
  doc_type: string;
  title: string;
  content_text: string;
  pdf_path: string | null;
  created_at: string;
}

export const DocGenerator: React.FC = () => {
  const [docType, setDocType] = useState('Cover Letter');
  const [title, setTitle] = useState('');
  const [context, setContext] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [copied, setCopied] = useState(false);

  // Load history list
  const { data: documentList = [], refetch: refetchDocuments, isLoading } = useQuery<DocumentItem[]>({
    queryKey: ['generated-documents'],
    queryFn: async () => {
      const response = await api.get('/documents/list');
      return response.data;
    }
  });

  useEffect(() => {
    if (documentList.length > 0 && !selectedDoc) {
      setSelectedDoc(documentList[0]);
    }
  }, [documentList]);

  // Mutation to generate a new document
  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/documents/generate', {
        doc_type: docType,
        title: title || `${docType} for Target Role`,
        content_text: context
      });
      return response.data;
    },
    onSuccess: (data) => {
      refetchDocuments();
      setSelectedDoc(data);
      setTitle('');
      setContext('');
    }
  });

  const handleCopy = () => {
    if (!selectedDoc) return;
    navigator.clipboard.writeText(selectedDoc.content_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = () => {
    if (!selectedDoc) return;
    // Direct link to backend file download endpoint
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/documents/download/${selectedDoc.id}`;
    
    // Trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${selectedDoc.title.replace(/\s+/g, '_')}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 bg-black/95 text-white p-6 md:p-8 relative overflow-hidden">
      <div className="absolute top-[10%] left-[20%] w-96 h-96 bg-ibm-blue/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* Header */}
        <div className="border-b border-ibm-border pb-6">
          <h1 className="text-3xl font-extrabold tracking-tight">AI Document Builder</h1>
          <p className="text-xs text-gray-400 mt-1">
            Formulate resumes, cover letters, and outreach templates tailored to target placement criteria and download print-ready PDFs.
          </p>
        </div>

        {/* Workspace split grid */}
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Left panel: Creator & History */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Form card */}
            <div className="glass-card border border-ibm-border rounded-xl p-6 space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-ibm-blue" />
                Configure Template
              </h2>

              <div className="space-y-3.5">
                {/* Selector */}
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">Document Type</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-ibm-border rounded-lg text-xs text-white appearance-none focus:outline-none focus:border-ibm-blue transition-all"
                  >
                    <option value="Cover Letter" className="bg-zinc-950">Cover Letter</option>
                    <option value="Resume" className="bg-zinc-950">Tailored Resume Text</option>
                    <option value="LinkedIn" className="bg-zinc-950">LinkedIn Summary</option>
                    <option value="Cold Email" className="bg-zinc-950">Cold Outreach Email</option>
                  </select>
                </div>

                {/* Title */}
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">Document Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cover Letter - IBM Cloud Engineer"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-ibm-border rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-ibm-blue transition-all"
                  />
                </div>

                {/* Context description */}
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">Context Parameters / JD</label>
                  <textarea
                    rows={4}
                    placeholder="Paste job description details or special projects you want highlighted in the document..."
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    className="w-full p-3 bg-black/40 border border-ibm-border rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-ibm-blue transition-all resize-none leading-relaxed"
                  />
                </div>
              </div>

              <div className="h-px bg-white/[0.04]" />

              <button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending || !context.trim()}
                className="w-full py-2 bg-gradient-to-r from-ibm-blue to-ibm-purple text-white rounded-lg text-xs font-bold shadow-glow-purple flex items-center justify-center gap-1.5 hover:scale-[1.01] transition-all disabled:opacity-50"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Document...
                  </>
                ) : (
                  'Generate tailormade Document'
                )}
              </button>
            </div>

            {/* History card */}
            <div className="glass-card border border-ibm-border rounded-xl p-6 space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-ibm-purple" />
                Your Documents
              </h2>

              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-6 h-6 animate-spin text-ibm-purple" />
                </div>
              ) : documentList.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No documents generated yet.</p>
              ) : (
                <div className="space-y-2.5 max-h-[240px] overflow-y-auto pr-1">
                  {documentList.map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => setSelectedDoc(item)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                        selectedDoc?.id === item.id 
                          ? 'border-ibm-purple bg-ibm-purple/10 text-purple-300' 
                          : 'border-white/[0.03] bg-white/[0.01] hover:bg-white/[0.04] text-gray-400'
                      }`}
                    >
                      <div className="space-y-0.5 truncate pr-2">
                        <div className="text-xs font-bold truncate text-white">{item.title}</div>
                        <div className="text-[9px] text-gray-500">{item.doc_type} &bull; {new Date(item.created_at).toLocaleDateString()}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-600 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right panel: Active preview */}
          <div className="lg:col-span-8">
            {selectedDoc ? (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                {/* Actions Toolbar */}
                <div className="glass-card border border-ibm-border rounded-xl px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-white truncate max-w-sm">{selectedDoc.title}</h3>
                    <span className="text-[10px] text-gray-500">{selectedDoc.doc_type} generated by DocAgent</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleCopy}
                      className="px-3.5 py-1.5 border border-ibm-border bg-white/[0.01] hover:bg-white/5 rounded-lg text-xs font-bold text-gray-300 flex items-center gap-1.5 transition-all"
                    >
                      {copied ? (
                        <>
                          <ClipboardCheck className="w-4 h-4 text-emerald-400" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-gray-400" />
                          Copy Text
                        </>
                      )}
                    </button>
                    
                    {selectedDoc.pdf_path && (
                      <button
                        onClick={handleDownloadPDF}
                        className="px-3.5 py-1.5 bg-ibm-blue hover:bg-ibm-blue/80 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-glow-blue transition-all"
                      >
                        <Download className="w-4 h-4" />
                        Download PDF
                      </button>
                    )}
                  </div>
                </div>

                {/* Printable text board */}
                <div className="glass-card border border-ibm-border rounded-xl p-8 shadow-glass min-h-[460px] relative overflow-hidden">
                  {/* Decorative faint background grid lines to resemble stationary */}
                  <div className="absolute inset-0 bg-glow-grid opacity-10 pointer-events-none" />
                  
                  <div className="relative z-10 space-y-4 font-mono text-[11px] leading-relaxed text-gray-300 whitespace-pre-wrap">
                    {/* Header */}
                    <div className="border-b border-white/[0.03] pb-4 mb-6">
                      <h2 className="text-base font-extrabold text-ibm-blue">{selectedDoc.title}</h2>
                      <span className="text-[9px] text-gray-500 uppercase tracking-widest">{selectedDoc.doc_type} Format</span>
                    </div>

                    {/* Document Content */}
                    {selectedDoc.content_text}
                  </div>
                </div>

              </motion.div>
            ) : (
              <div className="glass-card border border-ibm-border rounded-xl p-16 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
                <Briefcase className="w-12 h-12 opacity-30 text-ibm-blue animate-pulse" />
                <h3 className="text-sm font-bold text-white">Workspace Standby</h3>
                <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                  Submit a custom context descriptor on the left panel to begin. The Document Agent will structure your text and compile a PDF.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
export default DocGenerator;
