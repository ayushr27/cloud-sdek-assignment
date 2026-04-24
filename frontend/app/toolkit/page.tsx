'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Sparkles, ScrollText, Table, Loader2, ArrowRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function ToolkitPage() {
  const [topic, setTopic] = useState('');
  const [grade, setGrade] = useState('');
  const [type, setType] = useState<'lesson-plan' | 'rubric'>('lesson-plan');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic || !grade) return;
    
    setLoading(true);
    try {
      const res = await api.post('/toolkit/generate', { type, topic, grade, additionalInfo });
      setResult(res.data.content);
    } catch (err) {
      alert('Failed to generate content');
    } finally {
      setLoading(false);
    }
  };

  const handlePdfAction = async (action: 'view' | 'download') => {
    if (!result) return;
    setPdfLoading(true);
    try {
      const res = await api.post('/toolkit/pdf', { content: result }, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      if (action === 'view') {
        window.open(url, '_blank');
      } else {
        const safeTopic = topic.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'Content';
        const a = document.createElement('a');
        a.href = url;
        a.download = `VedaAI-${type}-${safeTopic}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // Do not revoke object URL to allow mobile Safari confirmation prompts to succeed
      }
    } catch (err) {
      alert('Failed to generate PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-8 h-[calc(100vh-80px)] overflow-y-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-orange-600" /> AI Teacher's Toolkit
        </h1>
        <p className="text-gray-500 mt-2 text-lg">Generate comprehensive lesson plans and rubrics instantly.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Editor Form */}
        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex flex-col h-max">
          <h2 className="text-xl font-bold mb-6">What properties do you need?</h2>
          <form onSubmit={handleGenerate} className="space-y-6 flex-1 flex flex-col">
            
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setType('lesson-plan')}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${type === 'lesson-plan' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-100 hover:border-orange-200 text-gray-500'}`}
              >
                <ScrollText className={`w-8 h-8 ${type === 'lesson-plan' ? 'text-orange-600' : ''}`} />
                <span className="font-bold">Lesson Plan</span>
              </button>
              
              <button
                type="button"
                onClick={() => setType('rubric')}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${type === 'rubric' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-100 hover:border-orange-200 text-gray-500'}`}
              >
                <Table className={`w-8 h-8 ${type === 'rubric' ? 'text-orange-600' : ''}`} />
                <span className="font-bold">Grading Rubric</span>
              </button>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Subject & Topic</label>
              <input 
                required 
                type="text" 
                value={topic} 
                onChange={(e) => setTopic(e.target.value)} 
                className="w-full border border-gray-200 rounded-[16px] px-4 py-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all font-medium" 
                placeholder="e.g. Photosynthesis in Plants" 
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Target Grade Level</label>
              <input 
                required 
                type="text" 
                value={grade} 
                onChange={(e) => setGrade(e.target.value)} 
                className="w-full border border-gray-200 rounded-[16px] px-4 py-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all font-medium" 
                placeholder="e.g. 10th Grade" 
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Additional Information (For better output)</label>
              <textarea 
                value={additionalInfo} 
                onChange={(e) => setAdditionalInfo(e.target.value)} 
                rows={3}
                className="w-full border border-gray-200 rounded-[16px] px-4 py-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all font-medium resize-none" 
                placeholder="Include any specific requirements, chapters, or textbook references..." 
              />
            </div>

            <button 
              type="submit" 
              disabled={loading || !topic || !grade}
              className="mt-auto w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-[16px] font-bold text-[16px] transition shadow-md disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Generating...</>
              ) : (
                <>Generate Content <ArrowRight className="w-5 h-5" /></>
              )}
            </button>
          </form>
        </div>

        {/* Output Area */}
        <div className="bg-[#1A1A1A] p-8 rounded-[32px] shadow-2xl flex flex-col h-[70vh] lg:h-auto overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-white bg-white/10 w-max px-4 py-2 rounded-full border border-white/10">
              <Sparkles className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-bold tracking-widest uppercase">Output View</span>
            </div>
            {result && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePdfAction('view')}
                  disabled={pdfLoading}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm font-bold transition flex items-center gap-2 border border-white/10 disabled:opacity-50"
                >
                  {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'View PDF'}
                </button>
                <button
                  onClick={() => handlePdfAction('download')}
                  disabled={pdfLoading}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-full text-sm font-bold transition flex items-center gap-2 disabled:opacity-50"
                >
                  Download PDF
                </button>
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            {!result ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 opacity-50 px-8">
                {type === 'lesson-plan' ? <ScrollText className="w-16 h-16 mb-4" /> : <Table className="w-16 h-16 mb-4" />}
                <p className="text-lg">Fill out the prompt details on the left to generate {type === 'lesson-plan' ? 'a comprehensive lesson plan' : 'a detailed grading rubric'}.</p>
              </div>
            ) : (
              <div className="prose prose-invert prose-orange max-w-none pb-8 text-gray-300 w-full prose-headings:text-white prose-a:text-orange-400 prose-strong:text-white prose-td:border-gray-700 prose-th:bg-gray-800 prose-th:border-gray-700 prose-th:text-white prose-table:border-gray-700 prose-table:border prose-td:p-3 prose-th:p-3 prose-tr:border-b-gray-700">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
