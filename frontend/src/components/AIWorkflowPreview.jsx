import React from 'react';

const AIWorkflowPreview = ({ workflow, intentData, onAccept, onDiscard }) => {
  if (!workflow || !intentData) return null;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-indigo-200 mt-6 animate-fade-in overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <span>✨</span> AI Generated Workflow
        </h3>
        <p className="text-indigo-100 text-sm mt-1">Review the AI's understanding and plan before saving.</p>
      </div>

      <div className="p-6 space-y-6">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <h4 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wider">Goal Analysis</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="block text-xs text-gray-500 mb-1">Category</span>
              <span className="font-medium text-gray-800">{intentData.category}</span>
            </div>
            <div>
              <span className="block text-xs text-gray-500 mb-1">Timeline</span>
              <span className="font-medium text-gray-800">{intentData.timeline}</span>
            </div>
            <div>
              <span className="block text-xs text-gray-500 mb-1">Priority</span>
              <span className={`font-medium ${intentData.priority === 'High' ? 'text-red-600' : intentData.priority === 'Medium' ? 'text-yellow-600' : 'text-green-600'}`}>
                {intentData.priority}
              </span>
            </div>
          </div>
          {intentData.constraints && intentData.constraints.length > 0 && (
            <div className="mt-3">
              <span className="block text-xs text-gray-500 mb-1">Constraints</span>
              <div className="flex flex-wrap gap-2">
                {intentData.constraints.map((c, i) => (
                  <span key={i} className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded-full border border-red-100">{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <h4 className="font-semibold text-gray-700 border-b pb-2 mb-3">Milestones</h4>
          <ul className="list-disc pl-5 space-y-1">
            {workflow.milestones?.map((m, idx) => (
              <li key={idx} className="text-sm text-gray-600">{m}</li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-gray-700 border-b pb-2 mb-3">Workflow Hierarchy</h4>
          <div className="space-y-4">
            {workflow.hierarchy?.phases?.map((phase, idx) => (
              <div key={idx} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <h5 className="font-bold text-gray-800">{phase.phase_name}</h5>
                  <span className="text-xs font-medium px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                    {phase.duration_suggestion}
                  </span>
                </div>
                <ul className="space-y-2 mt-2">
                  {phase.tasks?.map((task, tIdx) => (
                    <li key={tIdx} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-indigo-400 mt-0.5">•</span>
                      <div>
                        <span className="font-medium text-gray-800 block">{task.title}</span>
                        {task.description && <span className="text-xs text-gray-500">{task.description}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-gray-700 border-b pb-2 mb-3">Scheduling Suggestions</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <span className="block text-xs font-bold text-blue-800 uppercase tracking-wide mb-2">Workload</span>
              <p className="text-sm text-blue-900">{workflow.scheduling_suggestions?.workload_distribution}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
              <span className="block text-xs font-bold text-green-800 uppercase tracking-wide mb-2">Recovery</span>
              <p className="text-sm text-green-900">{workflow.scheduling_suggestions?.recovery_days}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
              <span className="block text-xs font-bold text-purple-800 uppercase tracking-wide mb-2">Timing</span>
              <p className="text-sm text-purple-900">{workflow.scheduling_suggestions?.optimal_timings}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-4">
        <button
          onClick={onAccept}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg transition shadow-sm hover:shadow"
        >
          Accept & Save Intent
        </button>
        <button
          onClick={onDiscard}
          className="flex-1 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-medium py-2.5 px-4 rounded-lg transition"
        >
          Discard
        </button>
      </div>
    </div>
  );
};

export default AIWorkflowPreview;
