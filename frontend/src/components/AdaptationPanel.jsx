import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useWebSocketContext } from '../contexts/WebSocketContext';
import { Activity, AlertCircle, Zap, CalendarClock, ShieldAlert, CheckCircle } from 'lucide-react';

const AdaptationPanel = () => {
  const { latestMessage } = useWebSocketContext() || {};

  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [aiRunning, setAiRunning] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get('adaptation/status/');
      setStatusData(response.data);
    } catch (error) {
      console.error('Error fetching adaptation status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (latestMessage) {
      const typesToRefresh = ['task_created', 'task_completed', 'task_deleted', 'task_updated', 'intent_created'];
      if (typesToRefresh.includes(latestMessage.type) || typesToRefresh.includes(latestMessage.event_type)) {
        fetchStatus();
      }
    }
  }, [latestMessage]);

  const handleRunAdaptation = async () => {
    try {
      setRunning(true);
      setRunResult(null);
      setAiResult(null);
      const response = await api.post('adaptation/run/');
      setRunResult(response.data);
      // Refresh status after running
      await fetchStatus();
    } catch (error) {
      console.error('Error running adaptation:', error);
      setRunResult({ error: 'Failed to run adaptation engine.' });
    } finally {
      setRunning(false);
    }
  };

  const handleAiReschedule = async () => {
    try {
      setAiRunning(true);
      setAiResult(null);
      setRunResult(null);
      const response = await api.post('adaptation/ai-reschedule/');
      setAiResult(response.data);
      // Refresh status after running
      await fetchStatus();
    } catch (error) {
      console.error('Error running AI reschedule:', error);
      setAiResult({ error: error.response?.data?.error || 'Failed to run AI Autopilot Reschedule. Verify GEMINI_API_KEY.' });
    } finally {
      setAiRunning(false);
    }
  };

  if (loading && !statusData) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in space-y-8">
      <div>
        <h2 className="text-3xl font-extrabold text-gray-900 flex items-center">
          <Zap className="w-8 h-8 text-amber-500 mr-3" />
          Smart Adjustments
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          The Adaptation Engine dynamically balances your workload based on your behavior.
        </p>
      </div>

      {statusData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Activity className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Workload Limit</h3>
            </div>
            <div>
              <p className="text-4xl font-black text-indigo-600">{statusData.workload_limit}</p>
              <p className="text-sm text-gray-500 mt-1">Maximum tasks per day</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Recent Productivity</h3>
            </div>
            <div>
              <p className="text-4xl font-black text-emerald-600">{statusData.recent_completed}</p>
              <p className="text-sm text-gray-500 mt-1">Completed in last 7 days</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-rose-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Missed Tasks</h3>
            </div>
            <div>
              <p className="text-4xl font-black text-rose-600">{statusData.recent_missed}</p>
              <p className="text-sm text-gray-500 mt-1">Pending past due date</p>
            </div>
          </div>
        </div>
      )}

      {statusData?.needs_recovery && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg flex items-start space-x-3">
          <ShieldAlert className="w-6 h-6 text-amber-600 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-amber-800">Burnout Warning</h4>
            <p className="text-sm text-amber-700 mt-1">
              You have a high number of missed tasks recently. The engine will insert a light recovery day to help you catch up without feeling overwhelmed.
            </p>
          </div>
        </div>
      )}

      {aiRunning && (
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-900 to-purple-900 text-white rounded-xl p-8 shadow-xl border border-indigo-700 animate-pulse">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer" style={{ animationDuration: '1.5s', animationIterationCount: 'infinite' }}></div>
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-indigo-400 border-t-white animate-spin"></div>
              <Zap className="w-6 h-6 text-amber-400 absolute inset-0 m-auto animate-pulse" />
            </div>
            <div>
              <h4 className="text-xl font-bold tracking-wide">AI Autopilot Smart Rescheduling Active</h4>
              <p className="text-sm text-indigo-200 mt-1 max-w-md mx-auto">
                Gemini is analyzing your overdue tasks, assessing workload density over the next 14 days, and custom-crafting a balanced catch-up roadmap to avoid burnout...
              </p>
            </div>
          </div>
          <style>{`
            @keyframes shimmer {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(100%); }
            }
            .animate-shimmer {
              animation: shimmer 1.8s infinite linear;
            }
          `}</style>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="max-w-xl">
            <h3 className="text-lg font-semibold text-gray-900">Schedule Re-Balancing & AI Autopilot</h3>
            <p className="text-sm text-gray-500 mt-1 font-medium">
              Select standard re-balancing to enforce daily limits, or leverage **Gemini AI Smart Autopilot** to dynamically distribute overdue workloads across future free dates with explanations.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <button
              onClick={handleRunAdaptation}
              disabled={running || aiRunning}
              className={`px-5 py-2.5 rounded-lg text-white font-semibold flex items-center justify-center space-x-2 transition-all ${
                running ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg hover:-translate-y-0.5'
              }`}
            >
              {running ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Adapting...</span>
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4" />
                  <span>Standard Adjust</span>
                </>
              )}
            </button>
            <button
              onClick={handleAiReschedule}
              disabled={running || aiRunning}
              className={`px-5 py-2.5 rounded-lg text-white font-semibold flex items-center justify-center space-x-2 transition-all bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-700 hover:via-indigo-700 hover:to-purple-700 shadow-md hover:shadow-lg hover:-translate-y-0.5 border border-indigo-400/20 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300 animate-pulse" />
              <span>🤖 AI Autopilot Smart Reschedule</span>
            </button>
          </div>
        </div>

        {runResult && !runResult.error && (
          <div className="p-6 bg-emerald-50/50 border-t border-emerald-100">
            <div className="flex items-center space-x-2 text-emerald-800 mb-4">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">Adaptation Successful</span>
            </div>
            <ul className="space-y-2 text-sm text-emerald-700">
              <li className="flex items-center"><CalendarClock className="w-4 h-4 mr-2"/> {runResult.rescheduled_count} task(s) rescheduled from the past.</li>
              <li className="flex items-center"><Activity className="w-4 h-4 mr-2"/> Daily workload threshold set to {runResult.workload_limit} tasks.</li>
              {runResult.recovery_days_inserted > 0 && (
                <li className="flex items-center"><ShieldAlert className="w-4 h-4 mr-2"/> {runResult.recovery_days_inserted} recovery day(s) inserted into your schedule.</li>
              )}
            </ul>
          </div>
        )}

        {runResult && runResult.error && (
          <div className="p-6 bg-rose-50/50 border-t border-rose-100">
            <div className="flex items-center space-x-2 text-rose-800">
              <AlertCircle className="w-5 h-5" />
              <span className="font-semibold">Error: {runResult.error}</span>
            </div>
          </div>
        )}

        {aiResult && !aiResult.error && (
          <div className="p-6 bg-indigo-50/40 border-t border-indigo-100 animate-fade-in">
            <div className="flex items-center space-x-2 text-indigo-900 mb-4 font-bold text-base">
              <Zap className="w-5 h-5 text-indigo-600 animate-pulse" />
              <span>AI Smart Autopilot Adjustment Summary</span>
            </div>
            <p className="text-sm text-indigo-800 font-semibold mb-3">{aiResult.message}</p>
            {aiResult.updates && aiResult.updates.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-2 mt-4">
                {aiResult.updates.map((update, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg border border-indigo-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-gray-800 text-sm">{update.task_title}</span>
                      <p className="text-xs text-indigo-600 font-medium mt-1">🤖 {update.reasoning}</p>
                    </div>
                    <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap self-start md:self-center">
                      📅 Due: {update.new_due_date}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic mt-2">All tasks are currently rescheduled properly with balanced workload constraints.</p>
            )}
          </div>
        )}

        {aiResult && aiResult.error && (
          <div className="p-6 bg-rose-50/50 border-t border-rose-100">
            <div className="flex items-center space-x-2 text-rose-800">
              <AlertCircle className="w-5 h-5" />
              <span className="font-bold">AI Reschedule Failed</span>
            </div>
            <p className="text-xs text-rose-700 mt-1">{aiResult.error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdaptationPanel;
