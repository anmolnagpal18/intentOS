import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useWebSocketContext } from '../contexts/WebSocketContext';
import { Calendar, ChevronLeft, ChevronRight, Info, AlertTriangle, Clock, CheckCircle2, Circle } from 'lucide-react';
import TaskDetailModal from './TaskDetailModal';

const TimelineRoadmap = () => {
  const { latestMessage } = useWebSocketContext() || {};

  const [intents, setIntents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewRange, setViewRange] = useState(14); // 14, 30, or 60 days
  const [startDate, setStartDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fetchTimelineData = async () => {
    try {
      setLoading(true);
      const [intentsRes, tasksRes] = await Promise.all([
        api.get('intents/'),
        api.get('tasks/')
      ]);
      setIntents(intentsRes.data);
      setTasks(tasksRes.data);
    } catch (error) {
      console.error('Error fetching timeline data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimelineData();
  }, []);

  useEffect(() => {
    if (latestMessage) {
      const typesToRefresh = ['task_created', 'task_completed', 'task_deleted', 'task_updated', 'intent_created'];
      if (typesToRefresh.includes(latestMessage.type) || typesToRefresh.includes(latestMessage.event_type)) {
        fetchTimelineData();
      }
    }
  }, [latestMessage]);

  const handleTaskUpdated = (updatedTask) => {
    setTasks((currentTasks) =>
      currentTasks.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    );
    setSelectedTask((prev) => (prev && prev.id === updatedTask.id ? updatedTask : prev));
  };

  const handleOpenTaskDetail = (task) => {
    setSelectedTask(task);
    setIsDetailModalOpen(true);
  };

  const handleToggleTaskComplete = async (task) => {
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
    
    // Optimistic UI update for instantaneous reaction!
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: nextStatus } : t));
    
    try {
      const response = await api.patch(`tasks/${task.id}/`, {
        status: nextStatus,
      });
      // Synchronize with real backend response
      setTasks(prev => prev.map(t => t.id === task.id ? response.data : t));
    } catch (err) {
      console.error(err);
      // Revert if API failed
      setTasks(prev => prev.map(t => t.id === task.id ? task : t));
    }
  };

  // Helper to shift timeline start date
  const shiftTime = (days) => {
    const nextDate = new Date(startDate);
    nextDate.setDate(nextDate.getDate() + days);
    setStartDate(nextDate);
  };

  const resetToToday = () => {
    setStartDate(new Date());
  };

  // Generate date array for the grid columns
  const getDates = () => {
    const dates = [];
    const tempDate = new Date(startDate);
    // Align starting date to midnight local time
    tempDate.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < viewRange; i++) {
      dates.push(new Date(tempDate));
      tempDate.setDate(tempDate.getDate() + 1);
    }
    return dates;
  };

  const activeDates = getDates();

  const formatDateKey = (date) => {
    return date.toISOString().split('T')[0];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Group tasks by intent in memory
  const intentTimelineMap = intents.map(intent => {
    const intentTasks = tasks
      .filter(t => t.intent === intent.id)
      .sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date) - new Date(b.due_date);
      });
    
    // Calculate intent start/end bounds based on task due dates
    let earliestDate = null;
    let latestDate = null;

    intentTasks.forEach(t => {
      if (t.due_date) {
        const d = new Date(t.due_date);
        d.setHours(0,0,0,0);
        if (!earliestDate || d < earliestDate) earliestDate = d;
        if (!latestDate || d > latestDate) latestDate = d;
      }
    });

    return {
      ...intent,
      tasks: intentTasks,
      earliestDate,
      latestDate
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2.5">
            <Calendar className="w-8 h-8 text-indigo-600" />
            Timeline Roadmap
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            A visual Gantt representation of your intents and scheduling horizons.
          </p>
        </div>

        {/* View Range Selection */}
        <div className="bg-gray-100 dark:bg-slate-800 p-0.5 rounded-lg flex items-center gap-1 border border-gray-200 dark:border-slate-700">
          {[14, 30, 60].map(days => (
            <button
              key={days}
              type="button"
              onClick={() => setViewRange(days)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all duration-200 cursor-pointer ${
                viewRange === days
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {days} Days
            </button>
          ))}
        </div>
      </div>

      {/* Date Navigation & Controls */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-150 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftTime(-7)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-700 transition cursor-pointer"
            title="Back 1 week"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-slate-800 px-3 py-1.5 rounded-md border border-gray-100 dark:border-slate-750">
            {activeDates[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            {' — '}
            {activeDates[activeDates.length - 1].toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <button
            onClick={() => shiftTime(7)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-700 transition cursor-pointer"
            title="Forward 1 week"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={resetToToday}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 px-3 py-1.5 rounded-lg transition cursor-pointer"
        >
          📍 Today
        </button>
      </div>

      {/* Grid Timeline Scroll Wrapper */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-150 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto min-w-full">
          <div className="min-w-[900px] select-none">
            {/* Header Columns */}
            <div className="grid grid-cols-[250px_1fr] border-b border-gray-150 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
              <div className="p-4 font-bold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider self-center">
                Intents & Milestones
              </div>
              <div className="grid" style={{ gridTemplateColumns: `repeat(${viewRange}, minmax(0, 1fr))` }}>
                {activeDates.map((date, idx) => {
                  const isToday = formatDateKey(date) === formatDateKey(new Date());
                  return (
                    <div
                      key={idx}
                      className={`py-3 text-center flex flex-col items-center justify-center border-l border-gray-100 dark:border-slate-800/60 ${
                        isToday ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''
                      }`}
                    >
                      <span className={`text-[10px] uppercase font-bold tracking-wider ${isToday ? 'text-indigo-600 dark:text-indigo-300' : 'text-gray-400 dark:text-gray-500'}`}>
                        {date.toLocaleDateString(undefined, { weekday: 'short' })}
                      </span>
                      <span className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center mt-0.5 ${
                        isToday ? 'bg-indigo-600 text-white' : 'text-gray-800 dark:text-gray-200'
                      }`}>
                        {date.getDate()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Timelines Rows */}
            {intentTimelineMap.length === 0 ? (
              <div className="p-12 text-center text-gray-400 dark:text-gray-500">
                No intents defined yet. Capture a new intent to see your roadmap timeline.
              </div>
            ) : (
              <div className="divide-y divide-gray-150 dark:divide-slate-800">
                {intentTimelineMap.map((intent, intentIdx) => {
                  // Determine intent visual bar boundaries
                  let startGridCol = null;
                  let endGridCol = null;
                  let showIntentBar = false;

                  if (intent.earliestDate && intent.latestDate) {
                    const timelineStart = activeDates[0];
                    const timelineEnd = activeDates[activeDates.length - 1];

                    // Only show if overlaps with active range
                    if (intent.latestDate >= timelineStart && intent.earliestDate <= timelineEnd) {
                      showIntentBar = true;
                      
                      const startDiff = Math.ceil((intent.earliestDate - timelineStart) / (1000 * 60 * 60 * 24));
                      const endDiff = Math.ceil((intent.latestDate - timelineStart) / (1000 * 60 * 60 * 24));
                      
                      startGridCol = Math.max(0, startDiff);
                      endGridCol = Math.min(viewRange - 1, endDiff);
                    }
                  }

                  return (
                    <div key={intent.id} className="group/intent">
                      {/* Intent Parent Row */}
                      <div className="grid grid-cols-[250px_1fr] bg-gray-50/20 dark:bg-slate-900/10 group-hover/intent:bg-indigo-50/10 dark:group-hover/intent:bg-indigo-950/10 transition duration-150">
                        <div className="p-4 border-r border-gray-100 dark:border-slate-800 flex flex-col justify-center">
                          <span className="font-bold text-gray-900 dark:text-white text-sm tracking-tight truncate" title={intent.title}>
                            🎯 {intent.title}
                          </span>
                          <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                            {intent.tasks.length} subtasks
                          </span>
                        </div>
                        
                        <div className="grid relative items-center py-4" style={{ gridTemplateColumns: `repeat(${viewRange}, minmax(0, 1fr))` }}>
                          {/* Grid background lines */}
                          <div className="absolute inset-0 grid pointer-events-none" style={{ gridTemplateColumns: `repeat(${viewRange}, minmax(0, 1fr))` }}>
                            {activeDates.map((_, i) => (
                              <div key={i} className="border-l border-gray-100 dark:border-slate-800/50 h-full" />
                            ))}
                          </div>

                          {/* Horizontal Gantt bar */}
                          {showIntentBar && startGridCol !== null && endGridCol !== null && (
                            <div
                              style={{
                                gridColumnStart: startGridCol + 1,
                                gridColumnEnd: endGridCol + 2
                              }}
                              className="h-7 bg-gradient-to-r from-indigo-500/80 to-purple-500/80 hover:from-indigo-600/90 hover:to-purple-600/90 backdrop-blur-xs text-white rounded-lg shadow-sm border border-indigo-400/20 flex items-center justify-between px-3 text-xs font-bold transition-all relative z-10 mx-1 cursor-default select-none truncate"
                            >
                              <span>Milestone Timeline</span>
                              <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded-full">
                                {intent.tasks.filter(t => t.status === 'completed').length}/{intent.tasks.length} Done
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Tasks Nested Rows */}
                      {intent.tasks.map(task => {
                        const taskDateStr = task.due_date;
                        let taskColIdx = -1;
                        
                        if (taskDateStr) {
                          const taskDate = new Date(taskDateStr);
                          taskDate.setHours(0,0,0,0);
                          
                          taskColIdx = activeDates.findIndex(date => {
                            const d = new Date(date);
                            d.setHours(0,0,0,0);
                            return d.getTime() === taskDate.getTime();
                          });
                        }

                        // Determine task status decoration
                        const isCompleted = task.status === 'completed';
                        const isInProgress = task.status === 'in_progress';
                        const isOverdue = !isCompleted && task.due_date && new Date(task.due_date) < new Date(new Date().setHours(0,0,0,0));

                        let statusColor = 'bg-slate-400 border-slate-500/20';
                        if (isCompleted) statusColor = 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/10 border-emerald-400/20';
                        else if (isOverdue) statusColor = 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/10 border-rose-400/20 animate-pulse';
                        else if (isInProgress) statusColor = 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/10 border-indigo-400/20';

                        return (
                          <div key={task.id} className="grid grid-cols-[250px_1fr] hover:bg-gray-50/50 dark:hover:bg-slate-850/30 transition">
                            <div className="p-3 pl-8 border-r border-gray-100 dark:border-slate-800 flex items-center justify-between gap-2 group">
                              <div className="flex items-center gap-2 truncate">
                                {/* Interactive Checkbox */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleTaskComplete(task);
                                  }}
                                  className="focus:outline-none cursor-pointer transition hover:scale-110 active:scale-95 flex-shrink-0"
                                >
                                  {isCompleted ? (
                                    <div className="w-4 h-4 rounded-md bg-emerald-500 text-white flex items-center justify-center shadow-sm shadow-emerald-500/20 border border-emerald-400">
                                      <svg className="w-2.5 h-2.5 stroke-current stroke-[3.5]" fill="none" viewBox="0 0 24 24">
                                        <polyline points="20 6 9 17 4 12" />
                                      </svg>
                                    </div>
                                  ) : (
                                    <div className="w-4 h-4 rounded-md border-2 border-gray-300 dark:border-slate-650 hover:border-indigo-500 dark:hover:border-indigo-400 transition-all bg-transparent" />
                                  )}
                                </button>
                                
                                <span
                                  onClick={() => handleOpenTaskDetail(task)}
                                  className={`text-xs font-semibold cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition truncate ${
                                    isCompleted ? 'text-gray-400 dark:text-gray-500 line-through font-normal' : 'text-gray-700 dark:text-gray-205'
                                  }`}
                                  title="Click to view details"
                                >
                                  {task.title}
                                </span>
                              </div>
                              
                              {isOverdue && (
                                <span className="text-[9px] font-bold text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse flex-shrink-0">
                                  Overdue
                                </span>
                              )}
                            </div>

                            <div className="grid relative items-center py-2 min-h-12" style={{ gridTemplateColumns: `repeat(${viewRange}, minmax(0, 1fr))` }}>
                              {/* Grid background lines */}
                              <div className="absolute inset-0 grid pointer-events-none" style={{ gridTemplateColumns: `repeat(${viewRange}, minmax(0, 1fr))` }}>
                                {activeDates.map((_, i) => (
                                  <div key={i} className="border-l border-gray-100 dark:border-slate-800/50 h-full" />
                                ))}
                              </div>

                              {/* Task Node representation inside the specific day */}
                              {taskColIdx !== -1 && (
                                <div
                                  style={{ gridColumnStart: taskColIdx + 1 }}
                                  onClick={() => handleOpenTaskDetail(task)}
                                  className={`h-8 mx-1.5 rounded-lg border flex items-center justify-center cursor-pointer relative z-10 transition shadow-sm text-white px-2 truncate ${statusColor}`}
                                  title={`${task.title} (${task.status}) - Due: ${task.due_date}`}
                                >
                                  <span className="text-[10px] font-black tracking-tight leading-none uppercase truncate">
                                    {task.title}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend & Help Info */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-150 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
        <div className="flex items-center gap-2.5 text-gray-500 dark:text-gray-400 font-medium">
          <Info className="w-4 h-4 text-indigo-500" />
          <span>Click any task block or title to inspect subtasks, personal notes, or generate AI Study Guides.</span>
        </div>
        
        <div className="flex flex-wrap gap-4 font-bold text-gray-600 dark:text-gray-300">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-emerald-500 border border-emerald-400/20" />
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-indigo-500 border border-indigo-400/20" />
            <span>In Progress</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-slate-400 border border-slate-500/20" />
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-rose-500 border border-rose-400/20" />
            <span>Overdue (Missed)</span>
          </div>
        </div>
      </div>

      <TaskDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        task={selectedTask}
        onTaskUpdated={handleTaskUpdated}
      />
    </div>
  );
};

export default TimelineRoadmap;
