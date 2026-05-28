const IntentList = ({
  intents,
  selectedIntentId,
  onSelectIntent,
  onGenerateTasks,
  generatingIntentId,
  onGenerateSchedule,
  schedulingIntentId,
}) => {
  if (intents.length === 0) {
    return (
      <div className="w-full max-w-md mx-auto text-center p-6 text-gray-500 bg-white rounded-xl shadow-sm border border-gray-100">
        No intents documented yet. Create one above!
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      {intents.map((intent) => (
        <article
          key={intent.id}
          className={`w-full bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border transition-all duration-200 ${
            selectedIntentId === intent.id
              ? 'border-indigo-500 dark:border-indigo-500 ring-2 ring-indigo-100 dark:ring-indigo-950/50'
              : 'border-gray-100 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 hover:shadow-md'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-2">
            <button
              type="button"
              onClick={() => onSelectIntent(intent)}
              className="min-w-0 flex-1 text-left cursor-pointer"
            >
              <h3 className="text-lg font-bold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">{intent.title}</h3>
            </button>
            <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-gray-100/50 dark:border-slate-750/30 whitespace-nowrap">
              {new Date(intent.created_at).toLocaleDateString()}
            </span>
          </div>
          {intent.description && (
            <p className="text-gray-600 dark:text-gray-300 text-xs mt-2 leading-relaxed">
              {intent.description}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2.5 justify-end border-t border-gray-50 dark:border-slate-850 pt-3.5">
            <button
              type="button"
              onClick={() => onGenerateTasks(intent)}
              disabled={generatingIntentId === intent.id || schedulingIntentId === intent.id}
              className="text-xs bg-indigo-50 dark:bg-indigo-950/45 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200/40 dark:border-indigo-800/30 px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>⚡</span> {generatingIntentId === intent.id ? 'Generating...' : 'Generate Tasks'}
            </button>
            <button
              type="button"
              onClick={() => onGenerateSchedule(intent)}
              disabled={generatingIntentId === intent.id || schedulingIntentId === intent.id}
              className="text-xs bg-purple-50 dark:bg-purple-950/45 text-purple-600 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-purple-200/40 dark:border-purple-800/30 px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>📅</span> {schedulingIntentId === intent.id ? 'Scheduling...' : 'Generate Schedule'}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
};

export default IntentList;
