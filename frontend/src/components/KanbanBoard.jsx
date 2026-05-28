import React, { useState } from 'react';
import api from '../services/api';

const KanbanBoard = ({ tasks, onTaskUpdated, onTaskDeleted, teamId, teamMembers, onAssignTask, onTaskClick }) => {
  const [draggingId, setDraggingId] = useState(null);

  const columns = [
    { id: 'pending', title: 'To Do', color: 'border-t-slate-400 bg-slate-500/5 text-slate-800' },
    { id: 'in_progress', title: 'In Progress', color: 'border-t-indigo-500 bg-indigo-500/5 text-indigo-800' },
    { id: 'completed', title: 'Completed', color: 'border-t-emerald-500 bg-emerald-500/5 text-emerald-800' }
  ];

  const handleDragStart = (e, id) => {
    setDraggingId(id);
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    try {
      const response = await api.patch(`tasks/${taskId}/`, {
        status: targetStatus
      });
      onTaskUpdated(response.data);
    } catch (err) {
      console.error('Error updating task status on drop:', err);
    } finally {
      setDraggingId(null);
    }
  };

  const handleMoveColumn = async (taskId, currentStatus, direction) => {
    const statusOrder = ['pending', 'in_progress', 'completed'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    let nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= statusOrder.length) return;

    const nextStatus = statusOrder[nextIndex];
    try {
      const response = await api.patch(`tasks/${taskId}/`, {
        status: nextStatus
      });
      onTaskUpdated(response.data);
    } catch (err) {
      console.error('Error shifting task column:', err);
    }
  };

  // Group tasks by status
  const groupedTasks = {
    pending: tasks.filter(t => t.status === 'pending'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    completed: tasks.filter(t => t.status === 'completed')
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start mt-6 min-h-[500px]">
      {columns.map(col => {
        const colTasks = groupedTasks[col.id] || [];
        return (
          <div
            key={col.id}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
            className={`flex flex-col bg-white rounded-xl shadow-sm border border-gray-150 overflow-hidden min-h-[450px] transition-all duration-300 ${
              draggingId ? 'border-dashed border-indigo-300' : ''
            }`}
          >
            {/* Column Header */}
            <div className={`p-4 border-t-4 ${col.color} border-b border-gray-100 flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wide uppercase">{col.title}</span>
                <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 font-semibold px-2 py-0.5 rounded-full text-xs">
                  {colTasks.length}
                </span>
              </div>
            </div>

            {/* Column Body / Droppable Area */}
            <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[600px] min-h-[350px]">
              {colTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 border border-dashed border-gray-100 rounded-lg text-gray-400 text-xs">
                  <span>Drop tasks here</span>
                </div>
              ) : (
                colTasks.map(task => {
                  // Calculate subtasks completion
                  const totalSubtasks = task.subtasks?.length || 0;
                  const completedSubtasks = task.subtasks?.filter(st => st.completed).length || 0;
                  const progressPercentage = totalSubtasks > 0 
                    ? Math.round((completedSubtasks / totalSubtasks) * 100) 
                    : 0;

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      className={`p-4 bg-white border border-gray-150 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-300 cursor-grab active:cursor-grabbing transition-all duration-200 group relative ${
                        task.status === 'completed' ? 'border-l-4 border-l-emerald-500' : 
                        task.status === 'in_progress' ? 'border-l-4 border-l-indigo-500' : 'border-l-4 border-l-gray-400'
                      }`}
                    >
                      <h4 
                        onClick={() => onTaskClick?.(task)}
                        className={`font-semibold text-sm text-gray-800 mb-1 cursor-pointer hover:text-indigo-600 transition ${
                          task.status === 'completed' ? 'line-through text-gray-400 font-normal' : ''
                        }`}
                        title="Click to view details & study guides"
                      >
                        {task.title}
                      </h4>

                      {/* Subtask Progress bar */}
                      {totalSubtasks > 0 && (
                        <div className="mt-2.5 mb-2">
                          <div className="flex justify-between items-center text-[10px] text-gray-500 mb-1">
                            <span>Checklist ({completedSubtasks}/{totalSubtasks})</span>
                            <span className="font-semibold text-indigo-600">{progressPercentage}%</span>
                          </div>
                          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                              style={{ width: `${progressPercentage}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Team Assignment selection if team exists */}
                      {teamId && (
                        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-50 text-[10px] text-gray-500">
                          <span>Assignee:</span>
                          <select
                            value={task.assigned_to || 'unassigned'}
                            onChange={(e) => onAssignTask(task.id, e.target.value)}
                            className="bg-transparent font-medium text-gray-700 outline-none cursor-pointer"
                          >
                            <option value="unassigned">None</option>
                            {teamMembers.map(member => (
                              <option key={member.user} value={member.user}>{member.username}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Card Footer Actions */}
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
                        {/* Status Shift Buttons for Mobile/Alternative */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={col.id === 'pending'}
                            onClick={() => handleMoveColumn(task.id, task.status, -1)}
                            className="p-1 text-gray-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-gray-400 rounded hover:bg-gray-50 transition text-xs"
                            title="Move Left"
                          >
                            ◀
                          </button>
                          <button
                            type="button"
                            disabled={col.id === 'completed'}
                            onClick={() => handleMoveColumn(task.id, task.status, 1)}
                            className="p-1 text-gray-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-gray-400 rounded hover:bg-gray-50 transition text-xs"
                            title="Move Right"
                          >
                            ▶
                          </button>
                        </div>

                        {/* Delete Action */}
                        <button
                          type="button"
                          onClick={() => onTaskDeleted(task.id)}
                          className="text-[11px] font-semibold text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KanbanBoard;
