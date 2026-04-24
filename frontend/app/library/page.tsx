'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useLibraryStore } from '@/store/libraryStore';
import { FileText, Image as ImageIcon, File, Plus, Trash2, X, Download, BookOpen, Loader2, ExternalLink, Filter, Search, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';

interface Resource {
  _id: string;
  title: string;
  fileUrl: string;
  type: 'pdf' | 'image' | 'ppt' | 'other';
  tags: {
    subject?: string;
    grade?: string;
    chapter?: string;
  };
  aiSummary?: string;
  createdAt: string;
}

export default function LibraryPage() {
  const { user } = useAuthStore();
  const { setResourceCount } = useLibraryStore();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activePreview, setActivePreview] = useState<Resource | null>(null);
  const [resourceToDelete, setResourceToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter and Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortByDate, setSortByDate] = useState<'newest' | 'oldest'>('newest');
  const [filterSubject, setFilterSubject] = useState<string>('All Subjects');
  const [filterClass, setFilterClass] = useState<string>('All Classes');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [chapter, setChapter] = useState('');
  const [aiSummarize, setAiSummarize] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchResources = async () => {
    try {
      const res = await api.get('/resources');
      setResources(res.data.resources);
      setResourceCount(res.data.resources.length);
    } catch (error) {
      console.error('Failed to fetch resources', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      if (!title) {
        // Auto-fill title from filename without extension
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert('Please select a file first.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('subject', subject);
    formData.append('grade', grade);
    formData.append('chapter', chapter);
    formData.append('aiSummarize', aiSummarize.toString());

    try {
      // For Next.js -> Express upload, config headers for multipart/form-data
      await api.post('/resources/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setShowUploadModal(false);
      resetForm();
      fetchResources();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const initiateDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setResourceToDelete(id);
  };

  const confirmDelete = async () => {
    if (!resourceToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/resources/${resourceToDelete}`);
      setResources(prev => {
        const updated = prev.filter(r => r._id !== resourceToDelete);
        setResourceCount(updated.length);
        return updated;
      });
      setActivePreview(null);
      setResourceToDelete(null);
    } catch (err: any) {
      console.error('Delete error:', err);
      alert('Failed to delete resource: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsDeleting(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setTitle('');
    setSubject('');
    setGrade('');
    setChapter('');
    setAiSummarize(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-8 h-8 text-red-500" />;
      case 'image': return <ImageIcon className="w-8 h-8 text-blue-500" />;
      case 'ppt': return <File className="w-8 h-8 text-orange-500" />;
      default: return <FileText className="w-8 h-8 text-gray-500" />;
    }
  };

  const processedResources = resources
    .filter(res => res.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(res => filterSubject === 'All Subjects' || res.tags?.subject === filterSubject)
    .filter(res => filterClass === 'All Classes' || res.tags?.grade === filterClass)
    .sort((a, b) => {
      if (sortByDate === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  const uniqueSubjects = Array.from(new Set(resources.map(r => r.tags?.subject).filter(Boolean))) as string[];
  const subjectOptions = ['All Subjects', ...uniqueSubjects];

  const uniqueClasses = Array.from(new Set(resources.map(r => r.tags?.grade).filter(Boolean))) as string[];
  const classOptions = ['All Classes', ...uniqueClasses];

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Library...</div>;

  return (
    <div className="max-w-7xl mx-auto p-8 h-[calc(100vh-80px)] overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">My Library</h1>
          <p className="text-gray-500 mt-1">Manage all your books, PDFs, and presentations in one place.</p>
        </div>
        <button 
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-orange-700 transition duration-200 shadow-sm"
        >
          <Plus className="w-5 h-5 text-white" />
          Upload Files
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-full p-2 mb-8 flex flex-col sm:flex-row items-center justify-between border border-gray-100 relative">
        <div className="w-full sm:w-auto z-20">
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center justify-center sm:justify-start gap-2 text-gray-500 hover:text-gray-800 font-bold px-4 py-2 w-full sm:w-auto transition-colors focus:outline-none rounded-full hover:bg-gray-50"
          >
            <Filter className="w-5 h-5" />
            <span>Filter By</span>
          </button>
          
          {isFilterOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsFilterOpen(false)}></div>
              <div className="absolute top-[calc(100%+8px)] left-0 w-72 bg-white border border-gray-100 rounded-3xl shadow-xl z-20 p-5">
                
                {/* SORT BY DATE ADDED */}
                <div className="mb-4">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Sort by Date Added</h4>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer group w-fit">
                      <div className={`w-[18px] h-[18px] rounded-full border-[2px] flex items-center justify-center transition-colors ${sortByDate === 'newest' ? 'border-[#2563EB]' : 'border-slate-400 group-hover:border-[#2563EB]'}`}>
                        {sortByDate === 'newest' && <div className="w-2 h-2 bg-[#2563EB] rounded-full"></div>}
                      </div>
                      <input type="radio" value="newest" checked={sortByDate === 'newest'} onChange={(e) => { e.stopPropagation(); setSortByDate('newest'); }} className="hidden" />
                      <span className="text-slate-700 text-[15px] tracking-tight">Newest First (Descending)</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer group w-fit">
                      <div className={`w-[18px] h-[18px] rounded-full border-[2px] flex items-center justify-center transition-colors ${sortByDate === 'oldest' ? 'border-[#2563EB]' : 'border-slate-400 group-hover:border-[#2563EB]'}`}>
                        {sortByDate === 'oldest' && <div className="w-2 h-2 bg-[#2563EB] rounded-full"></div>}
                      </div>
                      <input type="radio" value="oldest" checked={sortByDate === 'oldest'} onChange={(e) => { e.stopPropagation(); setSortByDate('oldest'); }} className="hidden" />
                      <span className="text-slate-700 text-[15px] tracking-tight">Oldest First (Ascending)</span>
                    </label>
                  </div>
                </div>

                <div className="h-px bg-slate-100 my-4"></div>

                {/* FILTER BY SUBJECT */}
                <div className="mb-4">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Filter by Subject</h4>
                  <div className="relative">
                    <select 
                      value={filterSubject}
                      onChange={(e) => setFilterSubject(e.target.value)}
                      className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-slate-700 text-[15px] focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300 cursor-pointer"
                    >
                      {subjectOptions.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  </div>
                </div>

                {/* FILTER BY CLASS */}
                <div>
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Filter by Class</h4>
                  <div className="relative">
                    <select 
                      value={filterClass}
                      onChange={(e) => setFilterClass(e.target.value)}
                      className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-slate-700 text-[15px] focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300 cursor-pointer"
                    >
                      {classOptions.map(cls => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  </div>
                </div>

              </div>
            </>
          )}
        </div>

        <div className="w-full sm:w-[400px] mt-2 sm:mt-0 px-2 sm:px-0">
          <div className="flex items-center gap-2 border border-gray-200 bg-white rounded-full px-5 py-2.5 w-full focus-within:ring-2 focus-within:ring-orange-500 transition-all">
            <Search className="w-5 h-5 text-gray-400" />
            <input 
              type="text"
              placeholder="Search Assignment"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 placeholder:text-gray-400 font-medium w-full"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {processedResources.map((res) => (
          <div 
            key={res._id} 
            onClick={() => setActivePreview(res)}
            className="group block bg-white border border-gray-200 rounded-[28px] p-6 shadow-sm hover:shadow-md hover:border-orange-200 transition-all cursor-pointer relative flex flex-col h-full"
          >
            <button 
              onClick={(e) => initiateDelete(e, res._id)} 
              className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm hover:bg-red-50 text-gray-400 hover:text-red-500 p-2 rounded-full border border-transparent hover:border-red-100 opacity-0 group-hover:opacity-100 transition-all z-10"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="flex items-center justify-center h-28 bg-gray-50 rounded-2xl mb-4 group-hover:scale-[1.02] transition-transform">
              {getIcon(res.type)}
            </div>
            <h3 className="font-bold text-gray-900 line-clamp-2 leading-tight mb-2 flex-1 group-hover:text-orange-600 transition-colors">
              {res.title}
            </h3>
            
            <div className="flex flex-wrap gap-1 mb-4 mt-auto">
              {res.tags?.subject && <span className="bg-gray-100 text-gray-600 text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-md">Subject:- {res.tags.subject}</span>}
              {res.tags?.grade && <span className="bg-gray-100 text-gray-600 text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-md">Grade:- {res.tags.grade}</span>}
            </div>

            <div className="text-xs text-gray-400 font-medium">
              Added {format(new Date(res.createdAt), "MMM d, yyyy 'at' h:mm a")}
            </div>
            {res.aiSummary && res.aiSummary.length > 5 && (
              <div className="absolute top-4 left-4">
                <div className="bg-orange-100 text-orange-600 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm border border-orange-200/50">
                  <BookOpen className="w-3 h-3" /> AI Synced
                </div>
              </div>
            )}
          </div>
        ))}
        {resources.length === 0 ? (
          <div className="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-4 text-center py-20 bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center">
             <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center mb-4">
               <File className="w-8 h-8 text-gray-300" />
             </div>
             <h3 className="text-xl font-bold text-gray-800 tracking-tight">Your library is empty</h3>
             <p className="text-gray-500 mt-2 font-medium max-w-sm">Upload study materials and they will be safely stored here for easy access.</p>
             <button onClick={() => setShowUploadModal(true)} className="mt-6 text-orange-600 font-bold hover:text-orange-700 transition">
               + Upload your first file
             </button>
          </div>
        ) : processedResources.length === 0 ? (
          <div className="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-4 text-center py-20 bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center">
             <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center mb-4">
               <Search className="w-8 h-8 text-gray-300" />
             </div>
             <h3 className="text-xl font-bold text-gray-800 tracking-tight">No results found</h3>
             <p className="text-gray-500 mt-2 font-medium max-w-sm">We couldn't find anything matching your search criteria.</p>
          </div>
        ) : null}
      </div>

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-lg w-full shadow-2xl overflow-hidden relative">
            <button onClick={() => { setShowUploadModal(false); resetForm(); }} className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition text-gray-500">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-extrabold tracking-tight mb-6">Upload to Library</h2>
            
            <form onSubmit={handleUploadSubmit} className="space-y-5">
              
              <div 
                onClick={handleUploadClick}
                className={`border-2 border-dashed rounded-[24px] p-8 text-center cursor-pointer transition-colors ${file ? 'border-orange-500 bg-orange-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'}`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept=".pdf,image/*,.ppt,.pptx"
                />
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                     <File className={`w-8 h-8 ${file ? 'text-orange-500' : 'text-gray-400'}`} />
                  </div>
                  {file ? (
                    <p className="text-sm font-bold text-gray-900">{file.name} <span className="text-xs font-medium text-gray-500 block">{(file.size / 1024 / 1024).toFixed(2)} MB</span></p>
                  ) : (
                    <p className="text-sm font-semibold text-gray-600">Click to browse<span className="text-xs font-medium text-gray-400 block mt-1">PDF, Images, or PPT up to 10MB</span></p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Title</label>
                <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-gray-200 rounded-[16px] px-4 py-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all font-medium" placeholder="File Name" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Subject</label>
                  <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full border border-gray-200 rounded-[16px] px-4 py-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all font-medium" placeholder="e.g. Science" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Grade / Class</label>
                  <input type="text" value={grade} onChange={(e) => setGrade(e.target.value)} className="w-full border border-gray-200 rounded-[16px] px-4 py-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all font-medium" placeholder="e.g. 10th" />
                </div>
              </div>

              <label className="flex items-center gap-3 p-4 bg-orange-50/50 border border-orange-100 rounded-[16px] cursor-pointer hover:bg-orange-50 transition-colors">
                <input type="checkbox" checked={aiSummarize} onChange={(e) => setAiSummarize(e.target.checked)} className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500 border-gray-300" />
                <div>
                  <div className="font-bold text-sm text-gray-900">Auto-Summarize with AI</div>
                  <div className="text-xs text-gray-500 font-medium">Extract key points to quickly preview content later. (PDF only currently)</div>
                </div>
              </label>

              <button 
                type="submit" 
                disabled={uploading || !file}
                className="w-full py-4 bg-gray-900 hover:bg-black text-white rounded-[16px] font-bold text-[15px] transition shadow-md disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Uploading to Cloud...
                  </>
                ) : (
                  'Upload to Library'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* RESOURCE PREVIEWER MODAL */}
      {activePreview && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 lg:p-10 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] w-full h-full max-w-7xl rounded-[32px] flex flex-col md:flex-row overflow-hidden border border-gray-800 shadow-2xl">
            
            {/* Viewer Area */}
            <div className="flex-1 bg-black/20 relative flex flex-col border-r border-gray-800">
              <div className="absolute top-4 left-4 z-10 flex gap-2">
                <button onClick={() => setActivePreview(null)} className="p-3 bg-black/40 hover:bg-black/80 text-white rounded-full backdrop-blur-md transition">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-auto flex items-center justify-center p-4">
                {activePreview.type === 'image' ? (
                  <img src={activePreview.fileUrl} alt={activePreview.title} className="max-w-full max-h-[80vh] rounded-lg object-contain" />
                ) : (
                  <iframe src={activePreview.fileUrl} title={activePreview.title} className="w-full h-full rounded-2xl bg-white" />
                )}
              </div>
              <div className="p-4 bg-black/40 backdrop-blur-md flex justify-center gap-4">
                 <a href={activePreview.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-bold text-white bg-[#2A2B2D] px-6 py-3 rounded-full hover:bg-gray-800 transition">
                   <Download className="w-4 h-4" /> Download Original File
                 </a>
                 <a href={activePreview.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-bold text-white bg-orange-600 px-6 py-3 rounded-full hover:bg-orange-700 transition">
                   <ExternalLink className="w-4 h-4" /> Open in New Tab
                 </a>
              </div>
            </div>

            {/* Details Sidebar */}
            <div className="w-full md:w-[400px] flex-shrink-0 bg-[#1A1A1A] p-8 flex flex-col gap-8 overflow-y-auto">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2 leading-tight tracking-tight">{activePreview.title}</h3>
                <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
                  {getIcon(activePreview.type)}
                  <span className="uppercase tracking-wider text-xs">{(activePreview.type || 'document').toUpperCase()}</span>
                  <span>•</span>
                  <span>Added {format(new Date(activePreview.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
                </div>
              </div>

              {/* Tags */}
              {(activePreview.tags?.subject || activePreview.tags?.grade || activePreview.tags?.chapter) && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {activePreview.tags.subject && <span className="bg-[#2A2B2D] text-gray-300 font-bold px-3 py-1.5 rounded-xl text-xs">Subject:- {activePreview.tags.subject}</span>}
                    {activePreview.tags.grade && <span className="bg-[#2A2B2D] text-gray-300 font-bold px-3 py-1.5 rounded-xl text-xs">Grade:- {activePreview.tags.grade}</span>}
                    {activePreview.tags.chapter && <span className="bg-[#2A2B2D] text-gray-300 font-bold px-3 py-1.5 rounded-xl text-xs">Chapter:- {activePreview.tags.chapter}</span>}
                  </div>
                </div>
              )}

              {/* AI Summary */}
              {activePreview.aiSummary ? (
                 <div className="flex-1 flex flex-col min-h-0 bg-[#2A2B2D] rounded-[24px] p-6 border border-gray-800">
                   <div className="flex items-center gap-2 mb-4 text-orange-400">
                     <BookOpen className="w-5 h-5" />
                     <h4 className="text-sm font-black uppercase tracking-widest">AI Summary</h4>
                   </div>
                   <div className="text-gray-300 text-[15px] leading-relaxed overflow-y-auto flex-1 font-medium pb-4 pr-2">
                     {activePreview.aiSummary}
                   </div>
                 </div>
              ) : (
                <div className="flex-1"></div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {resourceToDelete && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative border border-gray-100">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6 mx-auto">
              <Trash2 className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-extrabold text-center text-gray-900 mb-2">Delete Resource</h2>
            <p className="text-gray-500 text-center text-sm font-medium mb-8">
              Are you sure you want to delete this file? This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setResourceToDelete(null)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-2xl font-bold transition-colors"
                disabled={isDeleting}
              >
                No
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 flex justify-center items-center gap-2 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold transition-colors shadow-sm shadow-red-200"
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Yes'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
