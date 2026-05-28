import { useState, useEffect } from 'react';
import api from '../services/api';
import IntentForm from '../components/IntentForm';
import IntentList from '../components/IntentList';
import TaskPanel from '../components/TaskPanel';
import Sidebar from '../components/Sidebar';
import Dashboard from '../components/Dashboard';
import Analytics from '../components/Analytics';
import AdaptationPanel from '../components/AdaptationPanel';
import NotificationPanel from '../components/NotificationPanel';
import TeamWorkspace from '../components/TeamWorkspace';
import { useAuth } from '../contexts/AuthContext';
import AICopilot from '../components/AICopilot';
import FocusSanctuary from '../components/FocusSanctuary';
import TimelineRoadmap from '../components/TimelineRoadmap';
import NotesPanel from '../components/NotesPanel';

export default function MainApp() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [intents, setIntents] = useState([]);
  const [selectedIntent, setSelectedIntent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingIntentId, setGeneratingIntentId] = useState(null);
  const [schedulingIntentId, setSchedulingIntentId] = useState(null);
  const [taskRefreshKey, setTaskRefreshKey] = useState(0);
  const [generationNotice, setGenerationNotice] = useState(null);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  const { user } = useAuth();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    fetchIntents();
  }, []);

  const fetchIntents = async () => {
    try {
      const response = await api.get('intents/');
      setIntents(response.data);
    } catch (error) {
      console.error('Error fetching intents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIntentCreated = (newIntent) => {
    setIntents((prevIntents) => [newIntent, ...prevIntents]);
    setSelectedIntent(newIntent);
    setTaskRefreshKey((currentKey) => currentKey + 1);
    setGenerationNotice({
      intentId: newIntent.id,
      message: 'Tasks generated successfully',
      isError: false,
    });
  };

  const handleGenerateTasks = async (intent) => {
    setGeneratingIntentId(intent.id);
    setSelectedIntent(intent);
    setGenerationNotice(null);

    try {
      const response = await api.post(`intents/${intent.id}/generate-tasks/`);
      setGenerationNotice({
        intentId: intent.id,
        message: response.data.message,
        isError: false,
      });
      setTaskRefreshKey((currentKey) => currentKey + 1);
    } catch (error) {
      setGenerationNotice({
        intentId: intent.id,
        message: 'Failed to generate tasks. Please try again.',
        isError: true,
      });
      console.error('Error generating tasks:', error);
    } finally {
      setGeneratingIntentId(null);
    }
  };

  const handleGenerateSchedule = async (intent) => {
    setSchedulingIntentId(intent.id);
    setSelectedIntent(intent);
    setGenerationNotice(null);

    try {
      const response = await api.post(`intents/${intent.id}/schedule/`);
      setGenerationNotice({
        intentId: intent.id,
        message: response.data.message,
        isError: false,
      });
      setTaskRefreshKey((currentKey) => currentKey + 1);
    } catch (error) {
      setGenerationNotice({
        intentId: intent.id,
        message: 'Failed to generate schedule. Please try again.',
        isError: true,
      });
      console.error('Error generating schedule:', error);
    } finally {
      setSchedulingIntentId(null);
    }
  };

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-end px-6 flex-shrink-0 z-10 gap-4">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg hover:bg-gray-100 transition text-lg cursor-pointer flex items-center justify-center bg-gray-50 border border-gray-200 shadow-sm"
            title="Toggle Theme"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
          <NotificationPanel />
        </header>
        
        <div className="flex-1 overflow-y-auto relative">
          {activeTab === 'dashboard' ? (
          <Dashboard activeTab={activeTab} />
        ) : activeTab === 'analytics' ? (
          <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-fade-in">
            <Analytics />
          </div>
        ) : activeTab === 'adaptation' ? (
          <AdaptationPanel />
        ) : activeTab === 'focus' ? (
          <FocusSanctuary />
        ) : activeTab === 'notes' ? (
          <NotesPanel />
        ) : activeTab === 'timeline' ? (
          <TimelineRoadmap />
        ) : activeTab === 'teams' ? (
          <TeamWorkspace />
        ) : (
          <div className="py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto text-center mb-10 py-8 bg-gradient-to-b from-indigo-500/5 to-transparent dark:from-indigo-950/10 dark:to-transparent rounded-2xl border border-indigo-500/5 dark:border-indigo-800/10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/30 dark:border-indigo-800/20 text-[10px] font-bold text-indigo-600 dark:text-indigo-300 mb-4 animate-pulse">
                <span>⚡</span> AI Intent OS Active
              </div>
              <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 dark:from-indigo-400 dark:via-indigo-300 dark:to-purple-400 tracking-tight">
                Welcome, {user?.username}
              </h1>
              <p className="mt-3 text-xs font-semibold text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
                Capture your goals naturally, generate structured checklists, and let the AI balance your workload roadmap.
              </p>
            </div>

            <IntentForm onIntentCreated={handleIntentCreated} />
            
            {loading ? (
              <div className="text-center text-gray-500 mt-8">Loading your intents...</div>
            ) : (
              <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-6 items-start mt-8">
                <IntentList
                  intents={intents}
                  selectedIntentId={selectedIntent?.id}
                  onSelectIntent={setSelectedIntent}
                  onGenerateTasks={handleGenerateTasks}
                  generatingIntentId={generatingIntentId}
                  onGenerateSchedule={handleGenerateSchedule}
                  schedulingIntentId={schedulingIntentId}
                />
                <TaskPanel
                  intent={selectedIntent}
                  refreshKey={taskRefreshKey}
                  generationNotice={generationNotice}
                />
              </div>
            )}
          </div>
        )}
        </div>

        {/* Floating AI Action Button */}
        <button
          onClick={() => setIsCopilotOpen(!isCopilotOpen)}
          className="fixed bottom-6 right-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition z-40 flex items-center justify-center gap-2 group animate-bounce"
          style={{ animationDuration: '3s' }}
        >
          <span className="text-xl">🤖</span>
          <span className="max-w-0 overflow-hidden group-hover:max-w-[120px] transition-all duration-300 ease-in-out text-sm font-semibold whitespace-nowrap">
            AI Co-pilot
          </span>
        </button>

        {/* AI Goal Co-pilot Drawer */}
        <AICopilot 
          isOpen={isCopilotOpen} 
          onClose={() => setIsCopilotOpen(false)} 
          activeIntent={selectedIntent} 
        />
      </main>
    </div>
  );
}
