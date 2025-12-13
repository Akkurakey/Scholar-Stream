import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Paper, Topic, ViewMode } from './types';
import { fetchPapersForTopic, fetchAggregatedPapers, getCategoryCode } from './services/paperService';
import PaperCard from './components/PaperCard';
import TopicManager from './components/TopicManager';
import SubscriptionView from './components/SubscriptionView';
import { Moon, Sun, Menu, Bookmark as BookmarkIcon, RotateCcw, LayoutGrid, Loader2, AlertTriangle, Settings } from 'lucide-react';

// Streamlined 'S' Logo (Fluid Gradient)
const ScholarStreamLogo = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-3 shrink-0">
    <defs>
      <linearGradient id="grad_S1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop stopColor="#38bdf8"/>
        <stop offset="1" stopColor="#0284c7"/>
      </linearGradient>
    </defs>
    <path 
      d="M21 9H11C8.23858 9 6 11.2386 6 14C6 16.7614 8.23858 19 11 19H21C23.7614 19 26 21.2386 26 24C26 26.7614 23.7614 29 21 29H11" 
      stroke="url(#grad_S1)" 
      strokeWidth="5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
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

  // --- Helper: Robust Set Item (Critical Data) ---
  const saveCriticalData = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.code === 22 || localStorage.length === 0) {
         console.warn("Storage full while saving critical data. Clearing cache to make space.");
         localStorage.removeItem('ss_cache');
         try {
            localStorage.setItem(key, value);
         } catch (retryError) {
            console.error("Critical storage failure. Cannot save settings.", retryError);
         }
      }
    }
  };

  // --- State Initialization ---

  const [darkMode, setDarkMode] = useState<boolean>(() => safeParse('ss_theme', false));
  const [sidebarOpen, setSidebarOpen] = useState(false); 
  
  const [topics, setTopics] = useState<Topic[]>(() => safeParse('ss_topics', DEFAULT_TOPICS));

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('ss_viewMode');
    return (saved as ViewMode) || ViewMode.FEED;
  });

  const [activeTopicId, setActiveTopicId] = useState<string | null>(() => {
    const saved = localStorage.getItem('ss_activeTopicId');
    if (saved === 'null') return null;
    return saved || null;
  });

  const [papersCache, setPapersCache] = useState<Record<string, Paper[]>>(() => safeParse<Record<string, Paper[]>>('ss_cache', {}));
  
  const [papers, setPapers] = useState<Paper[]>(() => {
    try {
      const cacheKey = activeTopicId || "all";
      const cached = papersCache[cacheKey];
      return cached || [];
    } catch (e) {
      return [];
    }
  });

  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => {
    const saved = safeParse<string[]>('ss_bookmarks', []);
    return new Set(saved);
  });
  
  const [initialLoading, setInitialLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const observerTarget = useRef<HTMLDivElement>(null);

  // --- Persistence Effects ---

  useEffect(() => {
    saveCriticalData('ss_theme', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    saveCriticalData('ss_topics', JSON.stringify(topics));
  }, [topics]);

  useEffect(() => {
    saveCriticalData('ss_viewMode', viewMode as string);
  }, [viewMode]);

  useEffect(() => {
    saveCriticalData('ss_activeTopicId', activeTopicId === null ? 'null' : activeTopicId);
  }, [activeTopicId]);

  useEffect(() => {
    saveCriticalData('ss_bookmarks', JSON.stringify([...bookmarkedIds]));
  }, [bookmarkedIds]);

  useEffect(() => {
    const timer = setTimeout(() => {
        try {
            localStorage.setItem('ss_cache', JSON.stringify(papersCache));
        } catch (e) {
            console.warn("Storage full during cache save. Attempting to prune...");
            try {
                const currentKey = activeTopicId || 'all';
                const reducedCache: Record<string, Paper[]> = {};
                if (papersCache[currentKey]) {
                    reducedCache[currentKey] = papersCache[currentKey].slice(0, 20);
                }
                localStorage.setItem('ss_cache', JSON.stringify(reducedCache));
            } catch (retryError) {
                console.error("Cache prune failed. Clearing cache entirely.", retryError);
                localStorage.removeItem('ss_cache');
            }
        }
    }, 800); 

    return () => clearTimeout(timer);
  }, [papersCache, activeTopicId]);

  // --- Validation Effect ---
  useEffect(() => {
      if (activeTopicId !== null) {
          const exists = topics.find(t => t.id === activeTopicId);
          if (!exists) {
              setActiveTopicId(null);
          }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topics.length, activeTopicId]); 

  // --- Data Logic ---

  const fetchPapers = useCallback(async (isLoadMore: boolean = false, forceRefresh: boolean = false, signal?: AbortSignal) => {
    const cacheKey = activeTopicId || "all";
    if (cacheKey !== "all" && !topics.find(t => t.id === activeTopicId)) return;

    if (isLoadMore) setLoadingMore(true);
    else setInitialLoading(true);
    setError(null);

    try {
      const currentPapers = isLoadMore ? (papersCache[cacheKey] || []) : [];
      const excludeTitles = currentPapers.map(p => p.title);

      let newPapers: Paper[] = [];

      if (cacheKey === "all") {
          // Get bookmarks for AI analysis
          const allCached = (Object.values(papersCache) as Paper[][]).flat();
          const uniqueMap = new Map<string, Paper>();
          allCached.forEach(p => uniqueMap.set(p.id, p));
          const bookmarkedPapers = Array.from(uniqueMap.values()).filter(p => bookmarkedIds.has(p.id));

          newPapers = await fetchAggregatedPapers(topics, bookmarkedPapers, excludeTitles, signal);
      } else {
          const topic = topics.find(t => t.id === activeTopicId)!;
          newPapers = await fetchPapersForTopic(topic, excludeTitles, signal);
      }
      
      setPapersCache(prevCache => {
        const prevPapers = forceRefresh ? [] : (prevCache[cacheKey] || []);
        const existingIds = new Set(prevPapers.map(p => p.id));
        const uniqueNew = newPapers.filter(p => !existingIds.has(p.id));
        const updatedList = [...prevPapers, ...uniqueNew];
        return { ...prevCache, [cacheKey]: updatedList };
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
  }, [activeTopicId, topics, papersCache, bookmarkedIds]);

  // Sync papers state
  useEffect(() => {
    if (viewMode === ViewMode.FEED) {
       const cacheKey = activeTopicId || "all";
       const cachedPapers = papersCache[cacheKey];

       if (cachedPapers !== undefined) {
           setPapers(cachedPapers);
           if (cachedPapers.length > 0) setInitialLoading(false);
           setError(null);
       } 
       if (cachedPapers === undefined) {
           setPapers([]); 
           const controller = new AbortController();
           const timeoutId = setTimeout(() => {
                fetchPapers(false, false, controller.signal);
           }, 50); 
           return () => {
               clearTimeout(timeoutId);
               controller.abort();
           };
       }
    }
  }, [activeTopicId, viewMode, papersCache, fetchPapers]); 


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
    if (observerTarget.current) observer.observe(observerTarget.current);
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
    // Allow user to stay on subscription page to add more
  };

  const handleDeleteTopic = (id: string) => {
    setTopics(prev => prev.filter(t => t.id !== id));
    setPapersCache(prev => {
        const newCache = {...prev};
        delete newCache[id];
        return newCache;
    });
    if (activeTopicId === id) setActiveTopicId(null);
  };

  // Derive Displayed Papers
  const displayedPapers = (() => {
    if (viewMode === ViewMode.BOOKMARKS) {
      const allPapers = (Object.values(papersCache) as Paper[][]).flat();
      const uniqueMap = new Map<string, Paper>();
      allPapers.forEach((p) => uniqueMap.set(p.id, p));
      
      // Return papers in reverse order of addition (newest bookmarks first)
      // JS Set preserves insertion order, so we reverse the array.
      return Array.from(bookmarkedIds)
        .reverse()
        .map(id => uniqueMap.get(id))
        .filter((p): p is Paper => p !== undefined);
    }
    return papers;
  })();

  const activeTopic = topics.find(t => t.id === activeTopicId);
  
  // Calculate subscribed topic codes for highlighting
  const subscribedCodes = new Set(topics.map(t => getCategoryCode(t)).filter(Boolean));

  let headerTitle = "Explore"; 
  let headerSubtitle = "Papers you might be interested in";
  
  if (viewMode === ViewMode.BOOKMARKS) {
      headerTitle = "Library";
      headerSubtitle = `${displayedPapers.length} saved items`;
  } else if (viewMode === ViewMode.MANAGE) {
      headerTitle = "Subscriptions";
      headerSubtitle = "Manage your research topics";
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
        <div className="h-20 flex items-center px-6 cursor-pointer" onClick={() => setViewMode(ViewMode.FEED)}>
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
                My Feed
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
            <button 
                onClick={() => { setViewMode(ViewMode.MANAGE); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    viewMode === ViewMode.MANAGE
                    ? 'bg-gray-100 dark:bg-zinc-900 text-gray-900 dark:text-white' 
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-900/50 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
            >
                <Settings size={18} />
                Manage Subscriptions
            </button>
        </div>

        <div className="border-t border-gray-100 dark:border-zinc-900 mt-2 flex-1 overflow-hidden">
             <TopicManager 
                topics={topics}
                activeTopicId={activeTopicId}
                viewMode={viewMode}
                onSelectTopic={(id) => { setActiveTopicId(id); setViewMode(ViewMode.FEED); if (window.innerWidth < 768) setSidebarOpen(false); }}
                onManage={() => { setViewMode(ViewMode.MANAGE); setSidebarOpen(false); }}
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
          <span className="font-serif font-bold text-gray-900 dark:text-white truncate max-w-[200px]">{headerTitle}</span>
          <div className="w-8"></div>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 md:p-10 scroll-smooth">
            
            {/* MANAGE VIEW */}
            {viewMode === ViewMode.MANAGE ? (
                 <SubscriptionView 
                    topics={topics}
                    onAddTopic={handleAddTopic}
                    onDeleteTopic={handleDeleteTopic}
                 />
            ) : (
                 /* FEED / BOOKMARKS VIEW */
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
                          highlightedTags={subscribedCodes}
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
            )}

        </div>
      </main>
    </div>
  );
};

export default App;
