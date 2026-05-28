import { useEffect, useState } from 'react';
import api from '../services/api';
import KanbanBoard from './KanbanBoard';
import TaskDetailModal from './TaskDetailModal';

const API_BASE_URL = 'http://localhost:8000/api';

const TaskPanel = ({ intent, refreshKey, generationNotice, teamMembers = [], teamId = null }) => {
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'kanban'
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    if (!intent) {
      setTasks([]);
      setTitle('');
      setError(null);
      return;
    }

    fetchTasks(intent.id);
  }, [intent, refreshKey]);

  const fetchTasks = async (intentId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`tasks/?intent_id=${intentId}`);
      setTasks(response.data);
    } catch (err) {
      setError('Failed to load tasks. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (event) => {
    event.preventDefault();
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError('Task title cannot be empty.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await api.post(`tasks/`, {
        intent: intent.id,
        title: trimmedTitle,
      });
      setTasks((currentTasks) => [response.data, ...currentTasks]);
      setTitle('');
    } catch (err) {
      setError('Failed to add task. Please try again.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleComplete = async (task) => {
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed';

    try {
      const response = await api.patch(`tasks/${task.id}/`, {
        status: nextStatus,
      });
      setTasks((currentTasks) =>
        currentTasks.map((currentTask) =>
          currentTask.id === task.id ? response.data : currentTask
        )
      );
    } catch (err) {
      setError('Failed to update task. Please try again.');
      console.error(err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await api.delete(`tasks/${taskId}/`);
      setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));
    } catch (err) {
      setError('Failed to delete task. Please try again.');
      console.error(err);
    }
  };

  const [breakingDownId, setBreakingDownId] = useState(null);

  const handleToggleSubtask = async (task, subtaskIndex) => {
    const updatedSubtasks = task.subtasks.map((st, idx) =>
      idx === subtaskIndex ? { ...st, completed: !st.completed } : st
    );

    try {
      const response = await api.patch(`tasks/${task.id}/`, {
        subtasks: updatedSubtasks,
      });
      setTasks((currentTasks) =>
        currentTasks.map((currentTask) =>
          currentTask.id === task.id ? response.data : currentTask
        )
      );
    } catch (err) {
      setError('Failed to update subtask.');
      console.error(err);
    }
  };

  const handleBreakdownTask = async (taskId) => {
    setBreakingDownId(taskId);
    setError(null);
    try {
      const response = await api.post(`tasks/${taskId}/breakdown/`);
      setTasks((currentTasks) =>
        currentTasks.map((currentTask) =>
          currentTask.id === taskId ? response.data : currentTask
        )
      );
    } catch (err) {
      setError('Failed to break down task. Please verify your GEMINI_API_KEY.');
      console.error(err);
    } finally {
      setBreakingDownId(null);
    }
  };

  const handleAssignTask = async (taskId, userId) => {
    try {
      const response = await api.post(`teams/${teamId}/assign-task/`, {
        task_id: taskId,
        user_id: userId === 'unassigned' ? null : userId
      });
      setTasks((currentTasks) =>
        currentTasks.map((currentTask) =>
          currentTask.id === taskId ? response.data : currentTask
        )
      );
    } catch (err) {
      setError('Failed to assign task.');
      console.error(err);
    }
  };

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

  if (!intent) {
    return (
      <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 text-gray-500">
        Select an intent to manage its tasks.
      </section>
    );
  }

  const groupedTasks = tasks.reduce((acc, task) => {
    const dateKey = task.due_date || 'Unscheduled';
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(task);
    return acc;
  }, {});

  const sortedDateKeys = Object.keys(groupedTasks).sort((a, b) => {
    if (a === 'Unscheduled') return -1;
    if (b === 'Unscheduled') return 1;
    return new Date(a) - new Date(b);
  });

  return (
    <section className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-md border border-gray-100 dark:border-slate-800">
      <div className="mb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Tasks for</p>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{intent.title}</h2>
        </div>
        <div className="bg-gray-100 dark:bg-slate-800 p-0.5 rounded-lg flex items-center gap-1 border border-gray-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all duration-200 cursor-pointer ${
              viewMode === 'list'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            ðŸ“‹ List View
          </button>
          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all duration-200 cursor-pointer ${
              viewMode === 'kanban'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            ðŸ“Š Kanban Board
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium">
          {error}
        </div>
      )}

      {generationNotice?.intentId === intent.id && (
        <div
          className={`p-3 rounded-lg mb-4 text-sm font-medium ${
            generationNotice.isError
              ? 'bg-red-50 text-red-600'
              : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          {generationNotice.message}
        </div>
      )}

      <form onSubmit={handleAddTask} className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-750 rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
          placeholder="Add a task"
        />
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Adding...' : 'Add Task'}
        </button>
      </form>

      {loading ? (
        <div className="text-gray-500 text-sm">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="text-gray-500 text-sm border border-dashed border-gray-200 rounded-lg p-4">
          No tasks for this intent yet.
        </div>
      ) : viewMode === 'kanban' ? (
        <KanbanBoard
          tasks={tasks}
          onTaskUpdated={handleTaskUpdated}
          onTaskDeleted={handleDeleteTask}
          teamId={teamId}
          teamMembers={teamMembers}
          onAssignTask={handleAssignTask}
          onTaskClick={handleOpenTaskDetail}
        />
      ) : (
        <div className="space-y-6">
          {sortedDateKeys.map((dateKey) => (
            <div key={dateKey}>
              <h3 className="text-xs font-bold text-gray-700 dark:text-gray-350 bg-gray-50 dark:bg-slate-800 px-3 py-1.5 rounded-md mb-2 border border-gray-100/50 dark:border-slate-700/30">
                {dateKey === 'Unscheduled' ? 'Unscheduled Tasks' : new Date(dateKey).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </h3>
              <ul className="divide-y divide-gray-100 dark:divide-slate-800">
                {groupedTasks[dateKey].map((task) => (
                  <li key={task.id} className="py-3 flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={task.status === 'completed'}
                      onChange={() => handleToggleComplete(task)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        onClick={() => handleOpenTaskDetail(task)}
                        className={`font-semibold cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition ${
                          task.status === 'completed'
                            ? 'text-gray-400 dark:text-gray-555 line-through font-normal'
                            : 'text-gray-800 dark:text-gray-200'
                        }`}
                        title="Click to view details & study guides"
                      >
                        {task.title}
                      </p>

                      {/* Subtasks checklist */}
                      {task.subtasks && task.subtasks.length > 0 && (
                        <div className="mt-2 pl-3 py-1 space-y-1.5 border-l-2 border-indigo-200 dark:border-indigo-850 mb-2 bg-indigo-50/20 dark:bg-indigo-950/15 rounded-r-md">
                          {task.subtasks.map((subtask, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={subtask.completed}
                                onChange={() => handleToggleSubtask(task, idx)}
                                className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                              <span className={`text-xs ${subtask.completed ? 'text-gray-400 dark:text-gray-500 line-through font-light' : 'text-gray-700 dark:text-gray-300 font-medium'}`}>
                                {subtask.title}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {(!task.subtasks || task.subtasks.length === 0) && task.status !== 'completed' && (
                        <div className="mt-1.5 mb-2">
                          <button
                            type="button"
                            onClick={() => handleBreakdownTask(task.id)}
                            disabled={breakingDownId === task.id}
                            className="text-[10px] bg-indigo-50 dark:bg-indigo-950/45 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200/50 dark:border-indigo-800/30 px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            {breakingDownId === task.id ? 'âš¡ Analyzing...' : 'âœ¨ AI Break Down'}
                          </button>
                        </div>
                      )}

                      <div className="flex items-center space-x-2 mt-1">
                        <p className="text-xs text-gray-500 capitalize">
                          {task.status} {task.day_number ? `â€¢ Day ${task.day_number}` : ''}
                        </p>
                        {teamId && (
                          <div className="flex items-center space-x-1">
                            <span className="text-gray-300">â€¢</span>
                            <select
                              value={task.assigned_to || 'unassigned'}
                              onChange={(e) => handleAssignTask(task.id, e.target.value)}
                              className="text-xs bg-transparent text-gray-600 focus:outline-none focus:ring-0"
                            >
                              <option value="unassigned">Unassigned</option>
                              {teamMembers.map(member => (
                                <option key={member.user} value={member.user}>{member.username}</option>
                              ))}
                            </select>
                            {task.assigned_to_username && (
                               <div className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[8px] ml-1" title={task.assigned_to_username}>
                                 {task.assigned_to_username.charAt(0).toUpperCase()}
                               </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      <TaskDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        task={selectedTask}
        onTaskUpdated={handleTaskUpdated}
      />
    </section>
  );
};

export default TaskPanel;
