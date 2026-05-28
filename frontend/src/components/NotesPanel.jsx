import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  BookOpen, Plus, Trash2, Edit3, Search, Sparkles, 
  ChevronRight, FileText, Calendar, ChevronLeft, 
  X, HelpCircle, Save, Check, Copy, FileUp
} from 'lucide-react';

const NotesPanel = () => {
  // Sync local isDarkMode with global HTML classList mutations (Tailwind Theme)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    const checkTheme = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    
    // Initial check
    checkTheme();
    
    // Set up a MutationObserver to listen for class attribute changes on <html>
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          checkTheme();
        }
      });
    });
    
    observer.observe(document.documentElement, { attributes: true });
    
    return () => observer.disconnect();
  }, []);

  // Load initial notes data from localStorage or fallback presets
  const [subjects, setSubjects] = useState(() => {
    const saved = localStorage.getItem('intentos_notes_subjects');
    return saved ? JSON.parse(saved) : [
      { id: 'sub_1', name: 'Web Development', emoji: '💻', color: 'indigo' },
      { id: 'sub_2', name: 'General Study', emoji: '📝', color: 'emerald' },
      { id: 'sub_3', name: 'Machine Learning', emoji: '🧠', color: 'purple' }
    ];
  });

  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem('intentos_notes_data');
    return saved ? JSON.parse(saved) : [
      { id: 'note_1', subjectId: 'sub_1', title: 'React State Management', content: '### React State Management\n\nState is a built-in React object that stores data or information about the component.\n\n* **useState**: Simple state hooks.\n* **useContext**: Global state management without prop drilling.\n* **Redux/Zustand**: Sophisticated external state libraries.', updatedAt: new Date().toISOString() },
      { id: 'note_2', subjectId: 'sub_1', title: 'CSS Grid vs Flexbox', content: '### CSS Grid vs Flexbox\n\n* **Flexbox** is one-dimensional (row OR column).\n* **Grid** is two-dimensional (rows AND columns).\n\nUse Grid for page layouts, and Flexbox for component alignment!', updatedAt: new Date().toISOString() },
      { id: 'note_3', subjectId: 'sub_2', title: 'Active Recall Guide', content: '### Active Recall & Spaced Repetition\n\nActive recall involves testing your memory immediately after learning, rather than passively re-reading notes.\n\nCombined with spaced repetition systems (like Anki flashcards), it guarantees long-term retention!', updatedAt: new Date().toISOString() }
    ];
  });

  const [activeSubjectId, setActiveSubjectId] = useState(() => {
    return subjects.length > 0 ? subjects[0].id : '';
  });
  
  const [activeNoteId, setActiveNoteId] = useState(() => {
    const initialNotes = notes.filter(n => n.subjectId === (subjects.length > 0 ? subjects[0].id : ''));
    return initialNotes.length > 0 ? initialNotes[0].id : '';
  });

  // Editor states
  const [noteSearch, setNoteSearch] = useState('');
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorTab, setEditorTab] = useState('write'); // 'write' | 'preview'
  
  // Modals / Quick Actions
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectEmoji, setNewSubjectEmoji] = useState('📚');
  const [newSubjectColor, setNewSubjectColor] = useState('indigo');

  // AI Copilot Note Helper states
  const [aiLoading, setAiLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('intentos_notes_subjects', JSON.stringify(subjects));
  }, [subjects]);

  useEffect(() => {
    localStorage.setItem('intentos_notes_data', JSON.stringify(notes));
  }, [notes]);

  // Synchronize state when the active note changes
  useEffect(() => {
    const activeNote = notes.find(n => n.id === activeNoteId);
    if (activeNote) {
      setEditorTitle(activeNote.title);
      setEditorContent(activeNote.content);
    } else {
      setEditorTitle('');
      setEditorContent('');
    }
  }, [activeNoteId, notes]);

  // Auto-save active note content on modification
  const handleContentChange = (val) => {
    setEditorContent(val);
    setNotes(prev => prev.map(note => 
      note.id === activeNoteId 
        ? { ...note, content: val, updatedAt: new Date().toISOString() }
        : note
    ));
  };

  const handleTitleChange = (val) => {
    setEditorTitle(val);
    setNotes(prev => prev.map(note => 
      note.id === activeNoteId 
        ? { ...note, title: val, updatedAt: new Date().toISOString() }
        : note
    ));
  };

  // Add a brand-new note inside the active subject
  const handleAddNote = () => {
    if (!activeSubjectId) return;
    
    const newNote = {
      id: 'note_' + Date.now(),
      subjectId: activeSubjectId,
      title: 'Untitled Note',
      content: '',
      updatedAt: new Date().toISOString()
    };

    setNotes(prev => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
    setEditorTab('write');
  };

  // Delete active note
  const handleDeleteNote = (noteId, e) => {
    if (e) e.stopPropagation();
    if (!confirm('Are you sure you want to delete this note?')) return;
    
    const nextNotes = notes.filter(n => n.id !== noteId);
    setNotes(nextNotes);

    if (activeNoteId === noteId) {
      const remaining = nextNotes.filter(n => n.subjectId === activeSubjectId);
      if (remaining.length > 0) {
        setActiveNoteId(remaining[0].id);
      } else {
        setActiveNoteId('');
      }
    }
  };

  // Add a new subject
  const handleAddSubject = (e) => {
    if (e) e.preventDefault();
    if (!newSubjectName.trim()) return;

    const newSub = {
      id: 'sub_' + Date.now(),
      name: newSubjectName.trim(),
      emoji: newSubjectEmoji,
      color: newSubjectColor
    };

    setSubjects(prev => [...prev, newSub]);
    setActiveSubjectId(newSub.id);
    setNewSubjectName('');
    setShowAddSubject(false);
  };

  // Delete subject (and all its notes!)
  const handleDeleteSubject = (subId, e) => {
    if (e) e.stopPropagation();
    if (!confirm('Deleting this subject will permanently remove all of its notes. Proceed?')) return;

    setSubjects(prev => prev.filter(s => s.id !== subId));
    setNotes(prev => prev.filter(n => n.subjectId !== subId));

    if (activeSubjectId === subId) {
      const remainingSubs = subjects.filter(s => s.id !== subId);
      if (remainingSubs.length > 0) {
        setActiveSubjectId(remainingSubs[0].id);
        const firstNote = notes.find(n => n.subjectId === remainingSubs[0].id);
        if (firstNote) setActiveNoteId(firstNote.id);
      } else {
        setActiveSubjectId('');
        setActiveNoteId('');
      }
    }
  };

  // AI Helper: Auto-expand, summarize or improve notes using Django Copilot
  const handleAiNoteAssist = async (mode) => {
    if (!editorContent.trim()) return;
    setAiLoading(true);

    try {
      const prompt = `You are a study helper inside the Notes Panel of Intent-OS.
      Please help me improve this note.
      Note Title: "${editorTitle}"
      Current content: "${editorContent}"
      
      Task: Please perform the following action: "${mode === 'expand' ? 'Expand and add detailed explanations with examples' : 'Create a highly concise bulleted summary and active recall flashcards'}" on this note content.
      
      Format your response in beautiful markdown (using ### headers, lists, and bold text). Return ONLY the direct response content (no intros, no chatty meta-explanations). Keep the response useful, educational, and clean.`;

      const response = await api.post('ai/copilot/', {
        prompt,
        history: []
      });

      const result = response.data.reply;
      
      // Append or replace content based on choice
      if (confirm(`AI content generated successfully! Would you like to APPEND it to the end of your note? (Click Cancel to REPLACE the note content instead)`)) {
        handleContentChange(editorContent + '\n\n---\n### 🤖 AI Study Assistant Upgrade\n\n' + result);
      } else {
        handleContentChange(result);
      }
    } catch (err) {
      console.error(err);
      alert('⚠️ Failed to communicate with Django AI assistant. Please verify your GEMINI_API_KEY settings.');
    } finally {
      setAiLoading(false);
    }
  };

  // Render HTML preview of Markdown content
  const renderMarkdownPreview = () => {
    if (!editorContent) return <p className="text-xs italic text-gray-500">No content written yet. Start typing to see a preview!</p>;

    const lines = editorContent.split('\n');
    let inCodeBlock = false;
    let codeLines = [];

    return lines.map((line, idx) => {
      const trimmed = line.trim();

      // Fenced Code Block
      if (trimmed.startsWith('```')) {
        if (inCodeBlock) {
          inCodeBlock = false;
          const codeText = codeLines.join('\n');
          codeLines = [];
          return (
            <pre key={idx} className="bg-slate-950 text-emerald-400 font-mono p-4 rounded-xl text-xs overflow-x-auto my-3 shadow-inner select-all leading-relaxed">
              <code>{codeText}</code>
            </pre>
          );
        } else {
          inCodeBlock = true;
          return null;
        }
      }

      if (inCodeBlock) {
        codeLines.push(line);
        return null;
      }

      // Headers
      if (trimmed.startsWith('###')) {
        return (
          <h4 key={idx} className={`text-sm font-black mt-5 mb-2 flex items-center gap-1.5 border-b pb-1 ${
            isDarkMode ? 'text-white border-slate-800/60' : 'text-slate-850 border-gray-100'
          }`}>
            {trimmed.replace(/^###\s*/, '')}
          </h4>
        );
      }
      if (trimmed.startsWith('##') || trimmed.startsWith('#')) {
        return (
          <h3 key={idx} className={`text-base font-black mt-6 mb-3 border-b pb-1.5 ${
            isDarkMode ? 'text-indigo-400 border-slate-800/80' : 'text-indigo-650 border-indigo-50/50'
          }`}>
            {trimmed.replace(/^#+\s*/, '')}
          </h3>
        );
      }

      // Lists
      if (trimmed.startsWith('*') || trimmed.startsWith('-')) {
        const text = trimmed.substring(1).trim();
        return (
          <li key={idx} className={`text-xs list-disc ml-5 mb-1.5 leading-relaxed ${
            isDarkMode ? 'text-slate-300' : 'text-slate-600'
          }`}>
            {parseBoldText(text)}
          </li>
        );
      }

      if (trimmed === '') {
        return <div key={idx} className="h-2"></div>;
      }

      return (
        <p key={idx} className={`text-xs mb-2 leading-relaxed ${
          isDarkMode ? 'text-slate-350' : 'text-slate-650'
        }`}>
          {parseBoldText(trimmed)}
        </p>
      );
    });
  };

  const parseBoldText = (text) => {
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className={`font-bold px-1.5 py-0.5 rounded ${
          isDarkMode ? 'text-white bg-indigo-950/40' : 'text-slate-950 bg-indigo-50/50'
        }`}>{part}</strong>;
      }
      return part;
    });
  };

  // Copy Note to Clipboard
  const handleCopyNote = () => {
    navigator.clipboard.writeText(editorContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeSubject = subjects.find(s => s.id === activeSubjectId);
  const activeNote = notes.find(n => n.id === activeNoteId);

  // Filter notes belonging to the active subject AND matching the search query
  const filteredNotes = notes.filter(note => 
    note.subjectId === activeSubjectId &&
    (note.title.toLowerCase().includes(noteSearch.toLowerCase()) || 
     note.content.toLowerCase().includes(noteSearch.toLowerCase()))
  );

  // Colors mapping for premium borders/backgrounds
  const colors = {
    indigo: 'border-indigo-500/25 bg-indigo-500/10 text-indigo-400 focus:ring-indigo-500',
    emerald: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400 focus:ring-emerald-500',
    purple: 'border-purple-500/25 bg-purple-500/10 text-purple-400 focus:ring-purple-500',
    amber: 'border-amber-500/25 bg-amber-500/10 text-amber-400 focus:ring-amber-500',
    rose: 'border-rose-500/25 bg-rose-500/10 text-rose-400 focus:ring-rose-500'
  };

  return (
    <div className={`py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col gap-6 font-sans relative overflow-x-hidden animate-fade-in transition-colors duration-200 ${
      isDarkMode ? 'text-slate-100' : 'text-slate-800'
    }`}>
      
      {/* Top Header Card */}
      <div className={`z-10 flex flex-col sm:flex-row items-center justify-between gap-4 border p-5 rounded-3xl shadow-xl backdrop-blur-xl transition duration-200 ${
        isDarkMode 
          ? 'border-slate-800/80 bg-slate-900/60 shadow-black/20 shadow-xl' 
          : 'border-gray-200 bg-white shadow-gray-200/40 shadow-lg'
      }`}>
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 shadow-inner">
            <BookOpen className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
              Subjects Notebook <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                isDarkMode ? 'bg-indigo-950/40 text-indigo-400 border border-indigo-900/30' : 'bg-indigo-50 text-indigo-650 border border-indigo-100'
              }`}>Workspace</span>
            </h1>
            <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-450' : 'text-gray-500'}`}>Organize study materials, type clean notes in Markdown, and boost learning with integrated AI study partners.</p>
          </div>
        </div>
      </div>

      {/* Main Container Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1fr_1.8fr] gap-6 items-start">
        
        {/* Panel 1: Subjects List */}
        <div className={`border rounded-3xl p-5 shadow-2xl backdrop-blur-xl min-h-[500px] flex flex-col gap-4 transition duration-200 ${
          isDarkMode 
            ? 'border-slate-800/80 bg-slate-900/40 shadow-black/25' 
            : 'border-gray-200 bg-white/80 shadow-gray-200/20'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Subjects</span>
            <button
              onClick={() => setShowAddSubject(prev => !prev)}
              className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg hover:scale-105 active:scale-95 transition cursor-pointer flex items-center justify-center shadow-md shadow-indigo-500/10"
              title="Add New Subject"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add Subject quick form */}
          {showAddSubject && (
            <form onSubmit={handleAddSubject} className={`p-3 border rounded-2xl flex flex-col gap-2.5 shadow-inner animate-fade-in select-none ${
              isDarkMode ? 'border-slate-800 bg-slate-950/80' : 'border-gray-150 bg-gray-50/50'
            }`}>
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Create Category</p>
              <input
                type="text"
                placeholder="Subject name (e.g. Science)..."
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                className={`px-3 py-1.5 text-xs border rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 transition ${
                  isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-250 text-slate-800'
                }`}
              />
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <label className="text-[8px] text-gray-500 uppercase font-black block mb-1">Emoji</label>
                  <select
                    value={newSubjectEmoji}
                    onChange={(e) => setNewSubjectEmoji(e.target.value)}
                    className={`w-full px-2 py-1 border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 transition ${
                      isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-250 text-slate-800'
                    }`}
                  >
                    <option value="📚">📚 Books</option>
                    <option value="💻">💻 Code</option>
                    <option value="🧠">🧠 ML / Brain</option>
                    <option value="🔬">🔬 Science</option>
                    <option value="📝">📝 Note</option>
                    <option value="🚀">🚀 Launch</option>
                    <option value="🎨">🎨 Art</option>
                  </select>
                </div>
                <div>
                  <label className="text-[8px] text-gray-500 uppercase font-black block mb-1">Badge Color</label>
                  <select
                    value={newSubjectColor}
                    onChange={(e) => setNewSubjectColor(e.target.value)}
                    className={`w-full px-2 py-1 border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 transition ${
                      isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-250 text-slate-800'
                    }`}
                  >
                    <option value="indigo">💜 Purple/Indigo</option>
                    <option value="emerald">💚 Emerald/Green</option>
                    <option value="purple">🔮 Purple/Pink</option>
                    <option value="amber">💛 Amber/Yellow</option>
                    <option value="rose">❤️ Rose/Red</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-1">
                <button
                  type="submit"
                  disabled={!newSubjectName.trim()}
                  className="flex-1 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-650 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl text-[9px] uppercase tracking-wider transition cursor-pointer disabled:opacity-50"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddSubject(false)}
                  className={`px-2.5 py-1.5 border rounded-xl text-[9px] cursor-pointer transition ${
                    isDarkMode ? 'border-slate-800 text-slate-400 hover:text-white' : 'border-gray-200 text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Subjects menu list */}
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[380px] pr-1 select-none">
            {subjects.map(sub => {
              const isActive = sub.id === activeSubjectId;
              const subNotesCount = notes.filter(n => n.subjectId === sub.id).length;
              const badgeClass = colors[sub.color] || colors.indigo;

              return (
                <div
                  key={sub.id}
                  onClick={() => {
                    setActiveSubjectId(sub.id);
                    const subNotes = notes.filter(n => n.subjectId === sub.id);
                    if (subNotes.length > 0) {
                      setActiveNoteId(subNotes[0].id);
                    } else {
                      setActiveNoteId('');
                    }
                  }}
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-2.5 transition duration-150 cursor-pointer hover:scale-[1.01] ${
                    isActive 
                      ? (isDarkMode ? 'bg-slate-900 border-indigo-500/40 text-white shadow' : 'bg-indigo-50/60 border-indigo-200 text-indigo-705 font-bold shadow-sm')
                      : (isDarkMode ? 'bg-slate-900/10 border-slate-800/60 text-slate-450 hover:bg-slate-900/30' : 'bg-gray-50/50 border-gray-150/50 text-slate-550 hover:bg-gray-100/50')
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="text-base">{sub.emoji}</span>
                    <span className={`text-xs font-bold truncate ${isActive ? (isDarkMode ? 'text-white' : 'text-indigo-700 font-extrabold') : (isDarkMode ? 'text-slate-400' : 'text-slate-600')}`}>{sub.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${badgeClass}`}>
                      {subNotesCount} {subNotesCount === 1 ? 'note' : 'notes'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSubject(sub.id, e)}
                      className={`p-0.5 rounded transition ${
                        isDarkMode ? 'text-gray-650 hover:text-red-405 hover:bg-slate-500/10' : 'text-gray-400 hover:text-red-500 hover:bg-gray-200/50'
                      }`}
                      title="Delete Subject"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel 2: Notes in Selected Subject */}
        <div className={`border rounded-3xl p-5 shadow-2xl backdrop-blur-xl min-h-[500px] flex flex-col gap-4 transition duration-200 ${
          isDarkMode 
            ? 'border-slate-800/80 bg-slate-900/40 shadow-black/25' 
            : 'border-gray-200 bg-white/80 shadow-gray-200/20'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Notes List</span>
            {activeSubjectId && (
              <button
                onClick={handleAddNote}
                className="px-2.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-650 text-white rounded-xl hover:scale-105 active:scale-95 transition cursor-pointer flex items-center gap-1 shadow-md shadow-indigo-500/10 text-[9px] uppercase tracking-wider font-bold"
              >
                <Plus className="w-3.5 h-3.5" /> Add Note
              </button>
            )}
          </div>

          {/* Search notes bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              placeholder="Search subject notes..."
              value={noteSearch}
              onChange={(e) => setNoteSearch(e.target.value)}
              className={`w-full pl-9 pr-4 py-2 text-xs border rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 transition ${
                isDarkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600' : 'bg-white border-gray-250 text-slate-850 placeholder-slate-400'
              }`}
            />
          </div>

          {/* Notes mapping list */}
          <div className="flex-1 flex flex-col gap-2 overflow-y-auto max-h-[380px] pr-1 select-none">
            {filteredNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-slate-800 rounded-2xl">
                <FileText className="w-8 h-8 text-slate-700 mb-2" />
                <p className="text-xs font-bold text-slate-400">No notes found!</p>
                <p className="text-[8px] text-slate-550 mt-1 max-w-[140px]">Create a new note or change search filters.</p>
              </div>
            ) : (
              filteredNotes.map(note => {
                const isActive = note.id === activeNoteId;
                const snippet = note.content ? note.content.replace(/[#*`_-]/g, '').substring(0, 45) + '…' : 'Empty note...';
                
                return (
                  <div
                    key={note.id}
                    onClick={() => setActiveNoteId(note.id)}
                    className={`p-3 rounded-2xl border text-left transition duration-150 cursor-pointer flex flex-col gap-1.5 hover:scale-[1.01] ${
                      isActive 
                        ? (isDarkMode ? 'bg-slate-900 border-indigo-500/35 text-white' : 'bg-indigo-50/20 border-indigo-200 text-indigo-750')
                        : (isDarkMode ? 'bg-slate-900/10 border-slate-800/60 text-slate-400 hover:bg-slate-900/30' : 'bg-white border-gray-150 hover:bg-gray-50/50')
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-bold truncate ${isActive ? (isDarkMode ? 'text-white font-black' : 'text-indigo-700 font-extrabold') : (isDarkMode ? 'text-slate-350' : 'text-slate-700')}`}>
                        {note.title || 'Untitled Note'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteNote(note.id, e)}
                        className={`p-0.5 rounded transition flex-shrink-0 ${
                          isDarkMode ? 'text-gray-650 hover:text-red-405 hover:bg-slate-500/10' : 'text-gray-400 hover:text-red-500 hover:bg-gray-200/50'
                        }`}
                        title="Delete Note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className={`text-[9px] truncate leading-relaxed ${isDarkMode ? 'text-gray-500' : 'text-gray-450'}`}>{snippet}</span>
                    <span className={`text-[7.5px] font-semibold uppercase tracking-wider block mt-0.5 ${isDarkMode ? 'text-gray-600' : 'text-gray-450'}`}>
                      Updated: {new Date(note.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Panel 3: Live Notes Editor Panel */}
        <div className={`border rounded-3xl p-5 shadow-2xl backdrop-blur-xl min-h-[500px] flex flex-col gap-4 transition duration-200 ${
          isDarkMode 
            ? 'border-slate-800/80 bg-slate-900/40 shadow-black/25' 
            : 'border-gray-200 bg-white/80 shadow-gray-200/20'
        }`}>
          {activeNote ? (
            <div className="flex-1 flex flex-col gap-4 animate-fade-in">
              
              {/* Header Editor Toolbar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                <input
                  type="text"
                  placeholder="Note Title..."
                  value={editorTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="text-sm font-black bg-transparent border-b border-transparent hover:border-slate-800 focus:border-indigo-500 focus:outline-none text-white w-full sm:max-w-xs transition pb-0.5"
                />

                <div className="flex items-center gap-2 select-none self-end flex-wrap">
                  {/* Write / Preview Tab Toggles */}
                  <div className={`p-1 rounded-xl border flex items-center gap-1 transition ${
                    isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-gray-100 border-gray-200'
                  }`}>
                    <button
                      onClick={() => setEditorTab('write')}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all duration-150 cursor-pointer ${
                        editorTab === 'write'
                          ? (isDarkMode ? 'bg-slate-800 text-indigo-400 shadow shadow-black/10' : 'bg-white text-indigo-650 shadow border border-gray-150')
                          : (isDarkMode ? 'text-gray-450 hover:text-white' : 'text-gray-550 hover:text-gray-900')
                      }`}
                    >
                      Write
                    </button>
                    <button
                      onClick={() => setEditorTab('preview')}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all duration-150 cursor-pointer ${
                        editorTab === 'preview'
                          ? (isDarkMode ? 'bg-slate-800 text-indigo-400 shadow shadow-black/10' : 'bg-white text-indigo-650 shadow border border-gray-150')
                          : (isDarkMode ? 'text-gray-455 hover:text-white' : 'text-gray-550 hover:text-gray-900')
                      }`}
                    >
                      Preview
                    </button>
                  </div>

                  {/* Copy note */}
                  <button
                    onClick={handleCopyNote}
                    className={`p-1.5 border rounded-xl transition cursor-pointer flex items-center justify-center active:scale-95 shadow-sm ${
                      isDarkMode ? 'bg-slate-950/40 border-slate-850 text-gray-450 hover:text-white' : 'bg-white border-gray-200 text-gray-550 hover:bg-gray-100 hover:text-gray-800'
                    }`}
                    title={copied ? "Copied!" : "Copy Note to Clipboard"}
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  {/* AI Assistance Buttons */}
                  <div className={`p-1 rounded-xl border flex items-center gap-1 transition ${
                    isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-gray-100 border-gray-200'
                  }`}>
                    <button
                      onClick={() => handleAiNoteAssist('expand')}
                      disabled={aiLoading || !editorContent.trim()}
                      className="px-2 py-1 text-[9px] font-bold bg-indigo-600/10 hover:bg-indigo-600/90 text-indigo-400 hover:text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                      title="AI Expand Note with explanations & examples"
                    >
                      <Sparkles className="w-2.5 h-2.5 animate-pulse" />
                      <span>AI Expand</span>
                    </button>
                    <button
                      onClick={() => handleAiNoteAssist('summarize')}
                      disabled={aiLoading || !editorContent.trim()}
                      className="px-2 py-1 text-[9px] font-bold bg-purple-600/10 hover:bg-purple-600/90 text-purple-400 hover:text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                      title="AI Summarize & Generate Active Recall Cards"
                    >
                      <Save className="w-2.5 h-2.5" />
                      <span>AI Summarize</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Loader indicator */}
              {aiLoading && (
                <div className="p-3 border border-indigo-500/20 bg-indigo-600/5 rounded-2xl flex items-center gap-2.5 animate-pulse select-none">
                  <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-indigo-450"></div>
                  <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Study partner co-pilot is thinking and rewriting notes...</span>
                </div>
              )}

              {/* Editor Workspace Text Canvas */}
              <div className="flex-1 flex flex-col h-[320px] min-h-[300px]">
                {editorTab === 'write' ? (
                  <textarea
                    value={editorContent}
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder="Type your study notes here (Markdown is fully supported! Use # Headers, * lists, or code blocks)..."
                    className={`w-full flex-1 p-4 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-xs leading-relaxed resize-none font-mono ${
                      isDarkMode ? 'bg-slate-950/60 border-slate-850 text-gray-200 placeholder-slate-650' : 'bg-white border-gray-200 text-slate-800 placeholder-slate-400 shadow-inner'
                    }`}
                  />
                ) : (
                  <div className={`w-full flex-1 p-4 border rounded-2xl overflow-y-auto text-left leading-relaxed max-h-[320px] transition ${
                    isDarkMode ? 'bg-slate-950/30 border-slate-850' : 'bg-gray-50/40 border-gray-200 shadow-inner'
                  }`}>
                    {renderMarkdownPreview()}
                  </div>
                )}
              </div>

              {/* Footer metrics bar */}
              <div className="flex justify-between items-center text-[8.5px] font-black uppercase tracking-wider text-slate-500 select-none">
                <div className="flex items-center gap-3">
                  <span>Words: {editorContent ? editorContent.trim().split(/\s+/).filter(Boolean).length : 0}</span>
                  <span>Chars: {editorContent ? editorContent.length : 0}</span>
                </div>
                <div className={`flex items-center gap-1 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Autosaved to workstation</span>
                </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-24 text-center select-none">
              <FileUp className="w-14 h-14 text-slate-850 mb-4 animate-bounce" style={{ animationDuration: '4s' }} />
              <h4 className="text-sm font-black text-slate-400 uppercase tracking-wider">No active study note selected</h4>
              <p className="text-[10px] text-slate-500 mt-2 max-w-[240px] leading-relaxed">
                Click a note from the explorer, select a subject category on the left, or create a fresh note to begin writing!
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default NotesPanel;
