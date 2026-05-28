import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { TrendingUp, Activity, CheckCircle, AlertTriangle, Calendar, Award } from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000/api';

export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [summaryRes, dailyRes, weeklyRes, timelineRes] = await Promise.all([
        api.get(`analytics/summary/`),
        api.get(`analytics/daily/`),
        api.get(`analytics/weekly/`),
        api.get(`analytics/timeline/`)
      ]);
      
      setSummary(summaryRes.data);
      setDailyData(dailyRes.data);
      setWeeklyData(weeklyRes.data);
      setTimeline(timelineRes.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Find max values for chart scaling
  const maxDaily = Math.max(...dailyData.map(d => d.count), 1);
  const maxWeekly = Math.max(...weeklyData.map(w => w.count), 1);

  const getEventIcon = (type) => {
    switch (type) {
      case 'task_completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'task_created': return <Activity className="h-4 w-4 text-blue-500" />;
      case 'intent_created': return <Award className="h-4 w-4 text-purple-500" />;
      case 'task_deleted': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Progress & Analytics</h1>
        <p className="text-gray-500 dark:text-gray-400">Track your productivity and historical performance.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Completion Rate</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{summary?.completion_percentage}%</p>
            </div>
            <div className="rounded-full bg-indigo-50 dark:bg-indigo-950/40 p-3">
              <TrendingUp className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </div>
        
        <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Streak</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{summary?.current_streak} <span className="text-lg font-normal text-gray-500 dark:text-gray-400">days</span></p>
            </div>
            <div className="rounded-full bg-orange-50 dark:bg-orange-950/40 p-3">
              <Award className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Completed</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{summary?.total_completed}</p>
            </div>
            <div className="rounded-full bg-green-50 dark:bg-green-950/40 p-3">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Missed Tasks</p>
              <p className={`text-3xl font-bold ${summary?.missed_tasks_count > 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                {summary?.missed_tasks_count}
              </p>
            </div>
            <div className={`rounded-full p-3 ${summary?.missed_tasks_count > 0 ? 'bg-red-50 dark:bg-red-950/40' : 'bg-gray-50 dark:bg-slate-800'}`}>
              <AlertTriangle className={`h-6 w-6 ${summary?.missed_tasks_count > 0 ? 'text-red-600' : 'text-gray-400 dark:text-gray-500'}`} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Charts Column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Daily Productivity Chart */}
          <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Daily Productivity (Last 14 Days)</h3>
            <div className="flex h-48 items-end gap-2 overflow-x-auto pb-2">
              {dailyData.map((day, i) => {
                const height = maxDaily > 0 ? (day.count / maxDaily) * 100 : 0;
                const dateObj = new Date(day.date);
                const isToday = new Date().toDateString() === dateObj.toDateString();
                
                return (
                  <div key={i} className="group relative flex flex-1 h-full flex-col items-center justify-end">
                    {/* Tooltip */}
                    <div className="absolute -top-8 hidden whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white group-hover:block z-20">
                      {day.count} tasks ({dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })})
                    </div>
                    {/* Bar */}
                    <div 
                      className={`w-full min-w-[20px] max-w-[40px] rounded-t-sm transition-all duration-300 ${isToday ? 'bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.4)]' : 'bg-indigo-200 dark:bg-indigo-950/70 hover:bg-indigo-300 dark:hover:bg-indigo-900/80'}`}
                      style={{ height: `${Math.max(height, 5)}%` }}
                    ></div>
                    {/* Date label */}
                    <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                      {dateObj.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weekly Productivity Chart */}
          <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Weekly Productivity (Last 8 Weeks)</h3>
            <div className="flex h-48 items-end gap-4 overflow-x-auto pb-2">
              {weeklyData.map((week, i) => {
                const height = maxWeekly > 0 ? (week.count / maxWeekly) * 100 : 0;
                const dateObj = new Date(week.week);
                
                return (
                  <div key={i} className="group relative flex flex-1 h-full flex-col items-center justify-end">
                    <div className="absolute -top-8 hidden whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white group-hover:block z-20">
                      {week.count} tasks (Week of {dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})
                    </div>
                    <div 
                      className="w-full min-w-[30px] max-w-[60px] rounded-t-sm bg-emerald-200 dark:bg-emerald-950/60 transition-all duration-300 hover:bg-emerald-300 dark:hover:bg-emerald-900/75"
                      style={{ height: `${Math.max(height, 5)}%` }}
                    ></div>
                    <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                      {dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm lg:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
            <Calendar className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          <div className="h-[450px] overflow-y-auto pr-2">
            {timeline.length === 0 ? (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400">No recent activity.</p>
            ) : (
              <div className="space-y-4">
                {timeline.map((log) => (
                  <div key={log.id} className="relative flex gap-3">
                    <div className="relative mt-1 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-gray-50 dark:bg-slate-800 border border-gray-100/10 dark:border-slate-700/30">
                      {getEventIcon(log.event_type)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {log.event_type_display}
                      </p>
                      {log.task_title && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">Task: {log.task_title}</p>
                      )}
                      {log.intent_title && !log.task_title && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">Intent: {log.intent_title}</p>
                      )}
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(log.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
