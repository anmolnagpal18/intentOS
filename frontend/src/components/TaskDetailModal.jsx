import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { X, BookOpen, AlertTriangle, FileText } from 'lucide-react';

const TaskDetailModal = ({ isOpen, onClose, task, onTaskUpdated }) => {
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [guideLoading, setGuideLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (task) {
      setNotes(task.notes || '');
      setError(null);
    }
  }, [task]);

  if (!isOpen || !task) return null;

  const handleSaveNotes = async () => {
    if (notes === task.notes) return;
    setSavingNotes(true);
    setError(null);
    try {
      const response = await api.patch(`tasks/${task.id}/`, {
        notes: notes
      });
      onTaskUpdated(response.data);
    } catch (err) {
      console.error(err);
      setError('Failed to auto-save notes.');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleGenerateStudyGuide = async () => {
    setGuideLoading(true);
    setError(null);
    try {
      const response = await api.post(`tasks/${task.id}/study-guide/`);
      onTaskUpdated(response.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to compile study guide. Ensure GEMINI_API_KEY is configured.');
    } finally {
      setGuideLoading(false);
    }
  };

  // Sleek native Markdown formatter helper
  const renderMarkdown = (text) => {
    if (!text) return null;
    
    return text.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      
      // Headers ###
      if (trimmed.startsWith('###')) {
        return (
          <h4 key={idx} className="text-sm font-bold text-indigo-700 dark:text-indigo-300 mt-4 mb-2 flex items-center gap-1.5 border-b border-indigo-50 dark:border-indigo-950 pb-1">
            {trimmed.replace('###', '').trim()}
          </h4>
        );
      }
      // Headers ##
      if (trimmed.startsWith('##')) {
        return (
          <h3 key={idx} className="text-base font-extrabold text-indigo-800 dark:text-indigo-300 mt-5 mb-2.5 flex items-center gap-1.5 border-b border-indigo-100 dark:border-indigo-900 pb-1">
            {trimmed.replace('##', '').trim()}
          </h3>
        );
      }
      
      // Lists * or -
      if (trimmed.startsWith('*') || trimmed.startsWith('-')) {
        const textContent = trimmed.substring(1).trim();
        // Parse bold inside list
        return (
          <li key={idx} className="text-xs text-gray-700 dark:text-gray-300 list-disc ml-5 mb-1.5 leading-relaxed">
            {parseBoldText(textContent)}
          </li>
        );
      }
      
      // Normal paragraph
      if (trimmed === '') {
        return <div key={idx} className="h-2.5"></div>;
      }
      
      return (
        <p key={idx} className="text-xs text-gray-600 dark:text-gray-300 mb-2 leading-relaxed">
          {parseBoldText(trimmed)}
        </p>
      );
    });
  };

  // Helper to parse **bold** elements in markdown lines
  const parseBoldText = (text) => {
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, i) => {
      // odd indices are bold
      if (i % 2 === 1) {
        return <strong key={i} className="font-bold text-gray-900 dark:text-white bg-indigo-50/40 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">{part}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm transition-opacity">
      <div 
        className="w-full sm:w-[500px] h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-slide-in relative border-l border-gray-200 dark:border-slate-800 text-gray-800 dark:text-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-150 dark:border-slate-800 flex items-start justify-between bg-gray-50/50 dark:bg-slate-900/50">
          <div className="min-w-0 pr-6">
            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
              task.status === 'completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300'
            }`}>
              {task.status}
            </span>
            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base mt-2 leading-snug">{task.title}</h3>
            {task.day_number && (
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Scheduled for Day {task.day_number}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg transition hover:bg-gray-100 cursor-pointer flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-semibold border border-red-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Notes Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Workspace Notes
              </label>
              {savingNotes && (
                <span className="text-[10px] text-indigo-500 font-medium animate-pulse">Saving...</span>
              )}
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleSaveNotes}
              className="w-full p-3.5 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition resize-none text-gray-800 dark:text-gray-100 min-h-[120px]"
              placeholder="Write down details, checklists, ideas or study notes. Automatically saves when you click outside..."
            />
          </div>

          {/* Study Guide Section */}
          <div className="border-t border-gray-100 dark:border-slate-800 pt-5 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> AI Study Guide
              </label>
              
              {!task.study_guide && !guideLoading && (
                <button
                  onClick={handleGenerateStudyGuide}
                  className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition shadow-sm cursor-pointer"
                >
                  ⚡ Generate
                </button>
              )}
            </div>
 
            {guideLoading ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-3">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600"></div>
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 animate-pulse">Compiling study sheets with Gemini...</p>
              </div>
            ) : task.study_guide ? (
              <div className="bg-indigo-50/15 dark:bg-indigo-950/10 border border-indigo-50 dark:border-indigo-900/30 rounded-2xl p-4 max-h-[350px] overflow-y-auto">
                <div className="prose max-w-none">
                  {renderMarkdown(task.study_guide)}
                </div>
                
                <div className="mt-4 pt-3 border-t border-indigo-50/50 dark:border-indigo-950/40 flex justify-end">
                  <button
                    onClick={handleGenerateStudyGuide}
                    className="text-[10px] text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold transition cursor-pointer"
                  >
                    🔄 Regenerate Study Guide
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 border border-dashed border-gray-150 dark:border-slate-800 rounded-2xl text-gray-400 dark:text-gray-500 text-xs">
                <BookOpen className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-700 mb-2" />
                <p>Click "Generate" to have Gemini write a complete study guide and reference guide for this task.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailModal;
