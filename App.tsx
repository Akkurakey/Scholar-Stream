import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Paper, Topic, ViewMode } from './types';
import { fetchPapersForTopic, fetchAggregatedPapers } from './services/paperService';
import PaperCard from './components/PaperCard';
import TopicManager from './components/TopicManager';
import { Moon, Sun, Menu, Bookmark as BookmarkIcon, RotateCcw, LayoutGrid, Loader2, AlertTriangle } from 'lucide-react';

// Custom Interlocking 'S' Logo
const ScholarStreamLogo = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-3">
    <path d="M10 8C10 5.79086 11.7909 4 14 4H20C23.3137 4 26 6.68629 26 10V11C26 14.3137 23.3137 17 20 17H12C8.68629 17 6 19.6863 6 23V24C6 26.2091 7.79086 28 10 28H16" stroke="url(#paint0_linear)" strokeWidth="3" strokeLinecap="round"/>
    <path d="M22 24C22 26.2091 20.2091 28 18 28H12C8.68629 28 6 25.3137 6 22V21C6 17.6863 8.68629 15 12 15H20C23.3137 15 26 12.3137 26 9V8C26 5.79086 24.2091 4 22 4H16" stroke="url(#paint1_linear)" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.6"/>
    <defs>
      <linearGradient id="paint0_linear" x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
        <stop stopColor="#38bdf8"/>
        <stop offset="1" stopColor="#0ea5e9"/>
      </linearGradient>
      <linearGradient id="paint1_linear" x1="26" y1="28" x2="6" y2="4" gradientUnits="userSpaceOnUse">
        <stop stopColor="#7dd3fc"/>
        <stop offset="1" stopColor="#0284c7"/>
      </linearGradient>
    </defs>
  </svg>
);

const DEFAULT_TOPICS: Topic[] = [
  { id: '1', category: 'Computer Science', subCategory: 'Artificial Intelligence', keywords: [] },
  { id: '2', category: 'Computer Science', subCategory: 'Computer Vision and Pattern Recognition', keywords: [] },
  { id: '3', category: 'Physics', subCategory: 'Quantum Physics', keywords: [] },
  { id: '4', category: 'Quantitative Biology', subCategory: 'Genomics', keywords: [] }
];

const App: React.FC = () => {
  // --- Helper: Safe JSON Parse ---
  const safeParse = <T,>(key: string, fallback: T): T => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallback;
    } catch (e) {
      console.warn(`Error parsing ${key} from localStorage`, e);
      return fallback;
    }
  };

  // --- State Initialization ---

  // 1. Dark Mode
  const [darkMode, setDarkMode] = useState<boolean>(() => safeParse('ss_theme', false));
  const [sidebarOpen, setSidebarOpen] = useState(false); 
  
  // 2. Topics
  const [topics, setTopics] = useState<Topic[]>(() => safeParse('ss_topics', DEFAULT_TOPICS));

  // 3. View Mode
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('ss_viewMode');
    return (saved as ViewMode) || ViewMode.FEED;
  });

  // 4. Active Topic
  const [activeTopicId, setActiveTopicId] = useState<string | null>(() => {
    const saved = localStorage.getItem('ss_activeTopicId');
    // Ensure we correctly interpret 'null' string vs null value
    if (saved === 'null') return null;
    return saved || null; // Default to null (Explore) initially if nothing saved
  });

  // 5. Bookmarks
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => {
    const saved = safeParse<string[]>('ss_bookmarks', []);
    return new Set(saved);
  });
  
  // 6. Cache
  const [papersCache, setPapersCache] = useState<Record<string, Paper[]>>(() => safeParse('ss_cache', {}));
  
  // Current display papers
  const [papers, setPapers] = useState<Paper[]>([]);
  
  // Loading/Error State
  const [initialLoading, setInitialLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Infinite Scroll Refs
  const observerTarget = useRef<HTMLDivElement>(null);

  // --- Persistence Effects ---

  useEffect(() => {
    localStorage.setItem('ss_theme', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('ss_topics', JSON.stringify(topics));
  }, [topics]);

  useEffect(() => {
    localStorage.setItem('ss_viewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('ss_activeTopicId', activeTopicId === null ? 'null' : activeTopicId);
  }, [activeTopicId]);

  useEffect(() => {
    localStorage.setItem('ss_bookmarks', JSON.stringify([...bookmarkedIds]));
  }, [bookmarkedIds]);

  useEffect(() => {
    try {
      localStorage.setItem('ss_cache', JSON.stringify(papersCache));
    } catch (e) {
      console.warn("Cache limit reached or error saving cache", e);
    }
  }, [papersCache]);

  // --- Validation Effect ---
  // If the activeTopicId loaded from storage doesn't exist in the current topics list, reset to Explore.
  useEffect(() => {
      if (activeTopicId !== null) {
          const exists = topics.find(t => t.id === activeTopicId);
          if (!exists) {
              setActiveTopicId(null);
          }
      }
      // Only run on mount or when topics/id change
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topics.length, activeTopicId]); 

  // --- Data Logic ---

  const fetchPapers = useCallback(async (isLoadMore: boolean = false, forceRefresh: boolean = false, signal?: AbortSignal) => {
    const cacheKey = activeTopicId || "all";
    
    // Safety check: if topic doesn't exist and not aggregated, don't fetch
    if (cacheKey !== "all" && !topics.find(t => t.id === activeTopicId)) return;

    if (isLoadMore) setLoadingMore(true);
    else setInitialLoading(true);
    
    setError(null);

    try {
      const currentPapers = isLoadMore ? (papersCache[cacheKey] || []) : [];
      const excludeTitles = currentPapers.map(p => p.title);

      let newPapers: Paper[] = [];

      if (cacheKey === "all") {
          newPapers = await fetchAggregatedPapers(topics, excludeTitles, signal);
      } else {
          const topic = topics.find(t => t.id === activeTopicId)!;
          newPapers = await fetchPapersForTopic(topic, excludeTitles, signal);
      }
      
      setPapersCache(prevCache => {
        const prevPapers = forceRefresh ? [] : (prevCache[cacheKey] || []);
        
        // Deduplicate
        const existingIds = new Set(prevPapers.map(p => p.id));
        const uniqueNew = newPapers.filter(p => !existingIds.has(p.id));
        const updatedList = [...prevPapers, ...uniqueNew];
        
        return {
            ...prevCache,
            [cacheKey]: updatedList
        };
      });

    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error(err);
      setError("Unable to load papers. Please check your connection.");
    } finally {
      if (!signal?.aborted) {
          setInitialLoading(false);
          setLoadingMore(false);
      }
    }
  }, [activeTopicId, topics, papersCache]);

  // Sync 'papers' state with 'papersCache' + Auto-fetch if needed
  useEffect(() => {
    if (viewMode === ViewMode.FEED) {
       const cacheKey = activeTopicId || "all";
       const cachedPapers = papersCache[cacheKey];

       // 1. If we have data in cache (even if empty array, meaning we fetched 0 results), show it.
       if (cachedPapers !== undefined) {
           setPapers(cachedPapers);
           setInitialLoading(false);
           setError(null);
       } 
       
       // 2. If undefined (never fetched), trigger fetch
       // We use a timeout to avoid strict-mode double invocation issues and debounce
       if (cachedPapers === undefined) {
           setPapers([]); 
           const controller = new AbortController();
           const timeoutId = setTimeout(() => {
                fetchPapers(false, false, controller.signal);
           }, 100);
           return () => {
               clearTimeout(timeoutId);
               controller.abort();
           };
       }
    }
    // We intentionally include papersCache here so UI updates immediately when fetch completes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTopicId, viewMode, papersCache]); 


  // Infinite Scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !initialLoading && !loadingMore && !error && viewMode === ViewMode.FEED && papers.length > 0) {
          fetchPapers(true, false);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) observer.unobserve(observerTarget.current);
    };
  }, [initialLoading, loadingMore, error, viewMode, fetchPapers, papers.length]);


  // --- Handlers ---

  const handleToggleBookmark = (id: string) => {
    setBookmarkedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleManualRefresh = () => {
      fetchPapers(false, true);
  };

  const handleAddTopic = (topic: Topic) => {
    setTopics(prev => [...prev, topic]);
    setActiveTopicId(topic.id);
    setViewMode(ViewMode.FEED);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleDeleteTopic = (id: string) => {
    setTopics(prev => prev.filter(t => t.id !== id));
    setPapersCache(prev => {
        const newCache = {...prev};
        delete newCache[id];
        return newCache;
    });
    // If we deleted the current topic, go to feed
    if (activeTopicId === id) {
        setActiveTopicId(null);
    }
  };

  // Derive Displayed Papers
  const displayedPapers = (() => {
    let filtered = papers;
    
    if (viewMode === ViewMode.BOOKMARKS) {
      // Aggregate all known papers to find bookmarks (in case they aren't in current feed view)
      const allPapers = Object.values(papersCache).flat();
      // Deduplicate by ID
      const uniqueMap = new Map();
      allPapers.forEach(p => uniqueMap.set(p.id, p));
      const unique = Array.from(uniqueMap.values()) as Paper[];
      
      filtered = unique.filter(p => bookmarkedIds.has(p.id));
    }
    return filtered;
  })();

  const activeTopic = topics.find(t => t.id === activeTopicId);
  
  let headerTitle = "Explore";
  let headerSubtitle = "Papers you might be interested in";
  
  if (viewMode === ViewMode.BOOKMARKS) {
      headerTitle = "Library";
      headerSubtitle = `${displayedPapers.length} saved items`;
  } else if (activeTopic) {
      headerTitle = activeTopic.subCategory || activeTopic.category;
      headerSubtitle = activeTopic.keywords.length > 0 ? `Filters: ${activeTopic.keywords.join(", ")}` : "Recent submissions";
  }

  return (
    <div className="flex h-screen bg-white dark:bg-black overflow-hidden font-sans text-gray-900 dark:text-gray-100 selection:bg-primary-500/30">
      
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed md:relative z-40 w-72 h-full transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
        flex flex-col bg-white dark:bg-black border-r border-gray-100 dark:border-zinc-900
      `}>
        <div className="h-20 flex items-center px-6">
          <ScholarStreamLogo />
          <span className="text-lg font-bold font-serif tracking-tight text-gray-900 dark:text-white">
              ScholarStream
          </span>
        </div>

        <div className="px-3 py-2 space-y-1">
            <button 
                onClick={() => { setViewMode(ViewMode.FEED); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    viewMode === ViewMode.FEED 
                    ? 'bg-gray-100 dark:bg-zinc-900 text-gray-900 dark:text-white' 
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-900/50 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
            >
                <LayoutGrid size={18} />
                Explore Feed
            </button>
            <button 
                onClick={() => { setViewMode(ViewMode.BOOKMARKS); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    viewMode === ViewMode.BOOKMARKS 
                    ? 'bg-gray-100 dark:bg-zinc-900 text-gray-900 dark:text-white' 
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-900/50 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
            >
                <BookmarkIcon size={18} />
                My Library
            </button>
        </div>

        <div className="border-t border-gray-100 dark:border-zinc-900 mt-2 flex-1 overflow-hidden">
             <TopicManager 
                topics={topics}
                activeTopicId={activeTopicId}
                onSelectTopic={(id) => { setActiveTopicId(id); setViewMode(ViewMode.FEED); if (window.innerWidth < 768) setSidebarOpen(false); }}
                onAddTopic={handleAddTopic}
                onDeleteTopic={handleDeleteTopic}
             />
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-zinc-900">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="flex items-center justify-between w-full py-2.5 px-4 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-transparent dark:border-zinc-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all"
          >
            <span className="text-xs font-semibold">Appearance</span>
            {darkMode ? (
              <div className="flex items-center gap-2">
                 <span className="text-[10px] text-gray-500">Dark</span>
                 <Moon size={14} className="text-primary-400" />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                 <span className="text-[10px] text-gray-400">Light</span>
                 <Sun size={14} className="text-primary-600" />
              </div>
            )}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full w-full relative">
        <header className="h-16 md:hidden flex items-center justify-between px-4 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-100 dark:border-zinc-900 shrink-0 sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-gray-900 dark:text-white">
            <Menu size={20} />
          </button>
          <span className="font-serif font-bold text-gray-900 dark:text-white truncate">{headerTitle}</span>
          <div className="w-8"></div>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 md:p-10 scroll-smooth">
          <div className="max-w-5xl mx-auto min-h-full flex flex-col">
            
            <div className="hidden md:flex items-end justify-between mb-10">
              <div>
                <h2 className="text-4xl font-serif font-bold text-gray-900 dark:text-white tracking-tight">
                  {headerTitle}
                </h2>
                <div className="h-2"></div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium flex items-center gap-2">
                  {headerSubtitle}
                </p>
              </div>
              
              {viewMode === ViewMode.FEED && (
                <button 
                    onClick={handleManualRefresh}
                    disabled={initialLoading || loadingMore}
                    className="group flex items-center gap-2 px-5 py-2.5 bg-gray-50 dark:bg-zinc-900 rounded-full text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all disabled:opacity-50"
                >
                    <RotateCcw size={14} className={`text-gray-400 group-hover:text-primary-500 transition-colors ${initialLoading ? "animate-spin" : ""}`} />
                    Refresh
                </button>
              )}
            </div>

            {error && (
              <div className="mb-8 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-200 rounded-xl text-sm font-medium flex items-center gap-3">
                <AlertTriangle size={18} className="shrink-0" />
                <span>{error}</span>
                <button 
                    onClick={handleManualRefresh}
                    className="ml-auto px-3 py-1 bg-white dark:bg-amber-900/40 rounded-md shadow-sm text-xs font-bold hover:bg-amber-50 transition-colors border border-amber-100 dark:border-amber-800"
                >
                    Retry
                </button>
              </div>
            )}

            <div className={`grid grid-cols-1 ${displayedPapers.length > 0 ? 'lg:grid-cols-2' : ''} gap-6`}>
              
              {!initialLoading && !error && displayedPapers.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-32 text-center">
                  <div className="w-16 h-16 bg-gray-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-6">
                    {viewMode === ViewMode.BOOKMARKS ? <BookmarkIcon size={24} className="text-gray-300"/> : <LayoutGrid size={24} className="text-gray-300"/>}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                      {viewMode === ViewMode.BOOKMARKS ? "Library is empty" : "No recent papers found"}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-500 max-w-sm mx-auto text-sm">
                      {viewMode === ViewMode.BOOKMARKS 
                          ? "Bookmark papers from your feed to access them here." 
                          : "Try refreshing or adding broader keywords to your topic."}
                  </p>
                  {viewMode === ViewMode.FEED && (
                      <button onClick={handleManualRefresh} className="mt-6 text-primary-600 hover:text-primary-700 font-semibold text-sm">
                          Try Again
                      </button>
                  )}
                </div>
              )}

              {displayedPapers.map(paper => (
                <PaperCard 
                  key={paper.id} 
                  paper={paper} 
                  isBookmarked={bookmarkedIds.has(paper.id)}
                  onToggleBookmark={handleToggleBookmark}
                  showCategory={activeTopicId === null || viewMode === ViewMode.BOOKMARKS}
                />
              ))}

              {initialLoading && Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white dark:bg-zinc-900 rounded-2xl p-6 h-64 animate-pulse flex flex-col border border-gray-100 dark:border-zinc-800">
                    <div className="flex justify-between mb-6">
                        <div className="h-3 bg-gray-100 dark:bg-zinc-800 rounded w-20"></div>
                        <div className="h-3 bg-gray-100 dark:bg-zinc-800 rounded w-16"></div>
                    </div>
                    <div className="h-6 bg-gray-100 dark:bg-zinc-800 rounded w-3/4 mb-3"></div>
                    <div className="h-6 bg-gray-100 dark:bg-zinc-800 rounded w-1/2 mb-6"></div>
                    <div className="space-y-3 flex-1">
                        <div className="h-2 bg-gray-100 dark:bg-zinc-800 rounded w-full"></div>
                        <div className="h-2 bg-gray-100 dark:bg-zinc-800 rounded w-full"></div>
                        <div className="h-2 bg-gray-100 dark:bg-zinc-800 rounded w-2/3"></div>
                    </div>
                  </div>
              ))}
            </div>

            {viewMode === ViewMode.FEED && !initialLoading && displayedPapers.length > 0 && !error && (
                <div ref={observerTarget} className="col-span-full py-12 flex justify-center items-center">
                    {loadingMore ? (
                         <div className="flex items-center gap-2 text-gray-500 dark:text-gray-500 bg-white dark:bg-zinc-900 px-5 py-2.5 rounded-full shadow-sm border border-gray-100 dark:border-zinc-800">
                             <Loader2 size={16} className="animate-spin text-primary-500" />
                             <span className="text-xs font-semibold uppercase tracking-wider">Loading</span>
                         </div>
                    ) : (
                        <div className="h-10"></div>
                    )}
                </div>
            )}
            
            <div className="h-10"></div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
