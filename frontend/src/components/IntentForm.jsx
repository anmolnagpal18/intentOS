import React, { useState, useRef } from 'react';
import api from '../services/api';
import AIWorkflowPreview from './AIWorkflowPreview';

const IntentForm = ({ onIntentCreated, teamId = null }) => {
  const [naturalInput, setNaturalInput] = useState('');
  const [loadingStep, setLoadingStep] = useState(null); // 'analyzing', 'generating', null
  const [error, setError] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser. Please try Chrome or Edge.');
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setIsListening(true);
    };

    rec.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      setNaturalInput((prev) => prev + (prev ? ' ' : '') + transcript);
    };

    rec.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;
    rec.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };
  
  const [intentData, setIntentData] = useState(null);
  const [workflow, setWorkflow] = useState(null);

  const suggestedPrompts = [
    "I want to crack CEH in 60 days while managing gym and college.",
    "Build a modern React app portfolio over the weekend.",
    "Train for a 10k marathon in 3 months with knee constraints."
  ];

  const handleAIProcess = async (e) => {
    e.preventDefault();
    if (!naturalInput.trim()) return;

    setError(null);
    
    try {
      // Step 1: Analyze Intent
      setLoadingStep('analyzing');
      const analysisRes = await api.post('ai/analyze-intent/', { text: naturalInput });
      const analyzedData = analysisRes.data;
      setIntentData(analyzedData);

      // Step 2: Generate Workflow
      setLoadingStep('generating');
      const workflowRes = await api.post('ai/generate-workflow/', { 
        text: naturalInput, 
        intent_data: analyzedData 
      });
      setWorkflow(workflowRes.data);
      
    } catch (err) {
      setError('AI processing failed. Please ensure GEMINI_API_KEY is configured.');
      console.error(err);
    } finally {
      setLoadingStep(null);
    }
  };

  const handleAccept = async () => {
    setLoadingStep('saving');
    setError(null);

    try {
      // Flatten hierarchy tasks
      const aiTasks = [];
      workflow.hierarchy?.phases?.forEach(phase => {
        phase.tasks?.forEach(task => {
          aiTasks.push({
            title: `[${phase.phase_name}] ${task.title}`,
            description: task.description || ''
          });
        });
      });

      const response = await api.post('intents/', {
        title: `${intentData.category} - ${intentData.timeline}`,
        description: naturalInput,
        ai_tasks: aiTasks,
        team: teamId
      });
      
      onIntentCreated(response.data);
      
      // Reset
      setNaturalInput('');
      setIntentData(null);
      setWorkflow(null);
    } catch (err) {
      setError('Failed to save intent.');
      console.error(err);
    } finally {
      setLoadingStep(null);
    }
  };

  const handleDiscard = () => {
    setIntentData(null);
    setWorkflow(null);
    setNaturalInput('');
  };

  return (
    <div className="w-full max-w-4xl mx-auto mb-8">
      {!workflow ? (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-md border border-gray-100 dark:border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 dark:opacity-5 pointer-events-none">
            <span className="text-6xl">✨</span>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2 tracking-tight">What do you want to achieve?</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">Describe your goal naturally, and our AI will build a complete workflow for you.</p>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleAIProcess} className="space-y-4">
            <div className="relative">
              <textarea
                value={naturalInput}
                onChange={(e) => setNaturalInput(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition resize-none text-gray-800 dark:text-gray-100 pr-14"
                rows="4"
                placeholder="e.g. I want to crack CEH in 60 days while managing gym and college..."
                disabled={loadingStep !== null}
              />
              <button
                type="button"
                onClick={toggleListening}
                className={`absolute bottom-3 right-3 p-2.5 rounded-full transition-all duration-300 border flex items-center justify-center cursor-pointer ${
                  isListening
                    ? 'bg-red-500 text-white border-red-600 scale-110 shadow-lg shadow-red-200 animate-pulse'
                    : 'bg-white dark:bg-slate-750 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700 shadow-sm'
                }`}
                title={isListening ? 'Stop Dictating' : 'Dictate Goal'}
                disabled={loadingStep !== null}
              >
                {isListening ? '🛑' : '🎙️'}
              </button>
            </div>

            {loadingStep ? (
              <div className="flex flex-col items-center justify-center py-4 space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <p className="text-sm font-medium text-indigo-600 animate-pulse">
                  {loadingStep === 'analyzing' ? 'Understanding your constraints...' : 'Building your optimal workflow...'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-gray-400 font-medium py-1">Try:</span>
                  {suggestedPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setNaturalInput(prompt)}
                      className="text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200/50 dark:border-indigo-800/30 px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer"
                    >
                      Prompt {idx + 1}
                    </button>
                  ))}
                </div>
                
                <button
                  type="submit"
                  disabled={!naturalInput.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow flex items-center gap-2 whitespace-nowrap"
                >
                  <span>✨</span> Generate Plan
                </button>
              </div>
            )}
          </form>
        </div>
      ) : (
        <AIWorkflowPreview 
          workflow={workflow} 
          intentData={intentData}
          onAccept={handleAccept}
          onDiscard={handleDiscard}
        />
      )}
    </div>
  );
};

export default IntentForm;
