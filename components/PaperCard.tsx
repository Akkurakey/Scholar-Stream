import React from 'react';
import { Paper } from '../types';
import { Bookmark, ExternalLink, Calendar, BookOpen } from 'lucide-react';

interface PaperCardProps {
  paper: Paper;
  isBookmarked: boolean;
  onToggleBookmark: (id: string) => void;
  showCategory?: boolean;
  highlightedTags?: Set<string>;
}

const PaperCard: React.FC<PaperCardProps> = ({ 
  paper, 
  isBookmarked, 
  onToggleBookmark, 
  showCategory = false,
  highlightedTags = new Set()
}) => {
  const hasUrl = paper.url && paper.url.length > 0;
  
  // Construct PDF URL by replacing /abs/ with /pdf/
  // ArXiv URLs: https://arxiv.org/abs/2101.00000 -> https://arxiv.org/pdf/2101.00000
  const pdfUrl = paper.url ? paper.url.replace('/abs/', '/pdf/') : null;

  const CardWrapper = hasUrl ? 'a' : 'div';
  const wrapperProps = hasUrl ? {
    href: paper.url,
    target: "_blank",
    rel: "noopener noreferrer"
  } : {};

  const authorText = paper.authors.length > 0 ? paper.authors.join(", ") : "Unknown Author";

  const handlePdfClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (pdfUrl) {
      window.open(pdfUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <CardWrapper 
      {...wrapperProps}
      className={`
        relative flex flex-col h-full p-6 rounded-2xl transition-all duration-300 group
        bg-white dark:bg-zinc-900/80 
        border border-gray-100 dark:border-zinc-800
        hover:shadow-xl hover:shadow-primary-500/5 dark:hover:shadow-primary-900/10
        ${hasUrl ? 'cursor-pointer hover:-translate-y-1' : ''}
      `}
    >
      {/* Top Meta Row */}
      <div className="flex items-center justify-between mb-4">
         <div className="flex items-center gap-3 min-w-0">
             {/* Date */}
             <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-400 shrink-0">
                <Calendar size={12} />
                <span>{paper.publishDate}</span>
             </div>
             
             {/* Journal/Category Badge - Only shown in aggregated feed */}
             {showCategory && paper.journal && (
                 <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 min-w-0">
                     <BookOpen size={10} className="text-primary-600 dark:text-primary-400 shrink-0" />
                     <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[150px]">
                         {paper.journal}
                     </span>
                 </div>
             )}
         </div>
         
         {hasUrl && (
             <ExternalLink size={14} className="text-gray-300 dark:text-gray-600 group-hover:text-primary-500 transition-colors shrink-0 ml-2" />
         )}
      </div>

      {/* Title */}
      <h3 className="text-lg md:text-xl font-bold font-serif text-gray-900 dark:text-gray-100 leading-tight mb-3 group-hover:text-primary-600 dark:group-hover:text-primary-300 transition-colors">
        {paper.title}
      </h3>

      {/* Authors */}
      <div className="mb-4 text-xs text-gray-500 dark:text-gray-400 font-medium italic truncate">
        {authorText}
      </div>

      {/* Abstract */}
      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-4 mb-6 flex-1">
        {paper.abstract}
      </p>

      {/* Footer Area */}
      <div className="mt-auto pt-4 border-t border-gray-50 dark:border-zinc-800 flex items-center justify-between" onClick={e => hasUrl && e.preventDefault()}>
        
        {/* Tags */}
        <div className="flex flex-wrap gap-2 flex-1 mr-4">
            {paper.tags.map(tag => {
                const isHighlighted = highlightedTags.has(tag);
                return (
                    <span 
                        key={tag} 
                        className={`text-[10px] font-medium px-2 py-1 rounded-md border transition-colors ${
                            isHighlighted 
                            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border-primary-200 dark:border-primary-800'
                            : 'bg-gray-50 dark:bg-zinc-800/50 text-gray-600 dark:text-gray-400 border-transparent dark:border-zinc-700'
                        }`}
                    >
                        #{tag}
                    </span>
                );
            })}
        </div>

        {/* Actions */}
        <div className="flex gap-2 shrink-0">
            {pdfUrl && (
                <button
                    onClick={handlePdfClick}
                    className="p-2 rounded-full transition-colors text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="View PDF"
                >
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <text x="12" y="15" fill="currentColor" textAnchor="middle" fontSize="8" fontWeight="bold" strokeWidth="0">PDF</text>
                    </svg>
                </button>
            )}

            <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleBookmark(paper.id); }}
                className={`p-2 rounded-full transition-colors ${
                    isBookmarked 
                    ? 'text-primary-600 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/20' 
                    : 'text-gray-400 dark:text-gray-500 hover:text-primary-600 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                }`}
                title="Bookmark"
            >
                <Bookmark size={18} fill={isBookmarked ? "currentColor" : "none"} />
            </button>
        </div>
      </div>
    </CardWrapper>
  );
};

export default PaperCard;
