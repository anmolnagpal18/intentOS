import React, { useState, useEffect } from 'react';
import api from '../services/api';

const RecommendationPanel = () => {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const res = await api.get('ai/recommendations/');
        setRecommendations(res.data);
      } catch (err) {
        console.error('Failed to fetch recommendations:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecommendations();
  }, []);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (!recommendations || (!recommendations.insights?.length && !recommendations.productivity_advice?.length)) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl shadow-sm border border-indigo-100">
      <h3 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
        <span>💡</span> AI Insights
      </h3>
      
      <div className="space-y-4">
        {recommendations.insights && recommendations.insights.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-indigo-800 mb-2">Observations</h4>
            <ul className="space-y-2">
              {recommendations.insights.map((insight, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-indigo-900/80">
                  <span className="text-indigo-400 mt-0.5">●</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {recommendations.productivity_advice && recommendations.productivity_advice.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-indigo-800 mb-2">Advice</h4>
            <ul className="space-y-2">
              {recommendations.productivity_advice.map((advice, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-indigo-900/80">
                  <span className="text-indigo-400 mt-0.5">→</span>
                  <span>{advice}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendationPanel;
