import React, { useState } from 'react';
import { Topic } from '../types';
import { Zap, ChevronRight, ChevronDown, Settings } from 'lucide-react';

interface TopicManagerProps {
  topics: Topic[];
  activeTopicId: string | null;
  onSelectTopic: (id: string | null) => void;
  onManage: () => void;
}

const TopicManager: React.FC<TopicManagerProps> = ({ 
  topics, 
  activeTopicId, 
  onSelectTopic,
  onManage
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="flex flex-col h-full">
      
      {/* Header Section */}
      <div className="p-5 border-b border-gray-100 dark:border-zinc-900">
        <div className="flex justify-between items-center mb-1">
            <h2 className="font-serif font-bold text-gray-900 dark:text-white text-base tracking-tight">Topics</h2>
            <button 
                onClick={onManage}
                className="p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
                title="Manage Subscriptions"
            >
                <Settings size={16} />
            </button>
        </div>
        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
             {topics.length} active sources
        </p>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        <button
          onClick={() => onSelectTopic(null)}
          className={`w-full text-left px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-3 group ${
            activeTopicId === null
              ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/20'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-900'
          }`}
        >
          <div className={`p-1.5 rounded-lg ${activeTopicId === null ? 'bg-white/20' : 'bg-gray-100 dark:bg-zinc-800 group-hover:bg-white dark:group-hover:bg-black transition-colors'}`}>
             <Zap size={14} className={activeTopicId === null ? "text-white" : "text-amber-500"} fill={activeTopicId === null ? "currentColor" : "currentColor"} />
          </div>
          <span className="flex-1">Explore</span>
        </button>

        <div className="h-4"></div>
        
        <div 
            className="flex items-center justify-between px-3 mb-2 cursor-pointer group"
            onClick={() => setIsExpanded(!isExpanded)}
        >
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">My Subscriptions</p>
            {isExpanded ? <ChevronDown size={12} className="text-gray-400"/> : <ChevronRight size={12} className="text-gray-400"/>}
        </div>

        {isExpanded && topics.map(topic => (
          <button
            key={topic.id}
            onClick={() => onSelectTopic(topic.id)}
            className={`w-full flex items-center text-left px-3 py-2.5 rounded-xl transition-all duration-200 border ${
              activeTopicId === topic.id
                ? 'bg-white dark:bg-zinc-900 border-primary-100 dark:border-zinc-700 shadow-sm'
                : 'hover:bg-gray-50 dark:hover:bg-zinc-900/50 border-transparent text-gray-500 dark:text-gray-500'
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className={`font-semibold text-xs truncate flex items-center gap-2 ${activeTopicId === topic.id ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  {topic.subCategory || topic.category}
              </div>
              {topic.keywords.length > 0 ? (
                  <div className="text-[10px] text-primary-500/80 truncate mt-0.5 font-medium">
                      + {topic.keywords.length} filters
                  </div>
              ) : (
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                      {topic.category}
                  </div>
              )}
            </div>
          </button>
        ))}
        
        {isExpanded && topics.length === 0 && (
            <div className="px-3 py-4 text-center">
                <p className="text-xs text-gray-400 italic">No topics yet.</p>
                <button 
                    onClick={onManage}
                    className="mt-2 text-xs font-semibold text-primary-600 hover:underline"
                >
                    Add Topic
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default TopicManager;
