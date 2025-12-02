import React, { useState } from 'react';
import { Topic } from '../types';
import { Plus, X, Zap, ChevronRight, ChevronDown, Hash } from 'lucide-react';

interface TopicManagerProps {
  topics: Topic[];
  activeTopicId: string | null;
  onSelectTopic: (id: string | null) => void;
  onAddTopic: (topic: Topic) => void;
  onDeleteTopic: (id: string) => void;
}

// ArXiv Official Taxonomy
// Source: https://arxiv.org/category_taxonomy
const CATEGORY_HIERARCHY: Record<string, string[]> = {
  "Computer Science": [
    "Artificial Intelligence",
    "Hardware Architecture",
    "Computational Complexity",
    "Computational Engineering, Finance, and Science",
    "Computational Geometry",
    "Computation and Language",
    "Cryptography and Security",
    "Computer Vision and Pattern Recognition",
    "Computers and Society",
    "Databases",
    "Distributed, Parallel, and Cluster Computing",
    "Digital Libraries",
    "Discrete Mathematics",
    "Data Structures and Algorithms",
    "Emerging Technologies",
    "Formal Languages and Automata Theory",
    "General Literature",
    "Graphics",
    "Computer Science and Game Theory",
    "Human-Computer Interaction",
    "Information Retrieval",
    "Information Theory",
    "Machine Learning",
    "Logic in Computer Science",
    "Multiagent Systems",
    "Multimedia",
    "Mathematical Software",
    "Numerical Analysis",
    "Neural and Evolutionary Computing",
    "Networking and Internet Architecture",
    "Other Computer Science",
    "Operating Systems",
    "Performance",
    "Programming Languages",
    "Robotics",
    "Symbolic Computation",
    "Sound",
    "Software Engineering",
    "Social and Information Networks",
    "Systems and Control"
  ],
  "Economics": [
    "Econometrics",
    "General Economics",
    "Theoretical Economics"
  ],
  "Electrical Engineering and Systems Science": [
    "Audio and Speech Processing",
    "Image and Video Processing",
    "Signal Processing",
    "Systems and Control"
  ],
  "Mathematics": [
    "Commutative Algebra",
    "Algebraic Geometry",
    "Analysis of PDEs",
    "Algebraic Topology",
    "Classical Analysis and ODEs",
    "Combinatorics",
    "Category Theory",
    "Complex Variables",
    "Differential Geometry",
    "Dynamical Systems",
    "Functional Analysis",
    "General Mathematics",
    "General Topology",
    "Group Theory",
    "Geometric Topology",
    "History and Overview",
    "Information Theory",
    "K-Theory and Homology",
    "Logic",
    "Metric Geometry",
    "Mathematical Physics",
    "Numerical Analysis",
    "Number Theory",
    "Operator Algebras",
    "Optimization and Control",
    "Probability",
    "Quantum Algebra",
    "Rings and Algebras",
    "Representation Theory",
    "Symplectic Geometry",
    "Spectral Theory",
    "Statistics Theory"
  ],
  "Physics": [
    "Astrophysics of Galaxies",
    "Cosmology and Nongalactic Astrophysics",
    "Earth and Planetary Astrophysics",
    "High Energy Astrophysical Phenomena",
    "Instrumentation and Methods for Astrophysics",
    "Solar and Stellar Astrophysics",
    "Disordered Systems and Neural Networks",
    "Mesoscale and Nanoscale Physics",
    "Materials Science",
    "Other Condensed Matter",
    "Quantum Gases",
    "Soft Condensed Matter",
    "Statistical Mechanics",
    "Strongly Correlated Electrons",
    "Superconductivity",
    "General Relativity and Quantum Cosmology",
    "High Energy Physics - Experiment",
    "High Energy Physics - Lattice",
    "High Energy Physics - Phenomenology",
    "High Energy Physics - Theory",
    "Mathematical Physics",
    "Nonlinear Sciences",
    "Nuclear Experiment",
    "Nuclear Theory",
    "Accelerator Physics",
    "Atmospheric and Oceanic Physics",
    "Atomic Physics",
    "Atomic and Molecular Clusters",
    "Biological Physics",
    "Chemical Physics",
    "Classical Physics",
    "Computational Physics",
    "Data Analysis, Statistics and Probability",
    "Physics Education",
    "Fluid Dynamics",
    "General Physics",
    "Geophysics",
    "History and Philosophy of Physics",
    "Instrumentation and Detectors",
    "Medical Physics",
    "Optics",
    "Plasma Physics",
    "Popular Physics",
    "Space Physics",
    "Quantum Physics"
  ],
  "Quantitative Biology": [
    "Biomolecules",
    "Cell Behavior",
    "Genomics",
    "Molecular Networks",
    "Neurons and Cognition",
    "Other Quantitative Biology",
    "Populations and Evolution",
    "Quantitative Methods",
    "Subcellular Processes",
    "Tissues and Organs"
  ],
  "Quantitative Finance": [
    "Computational Finance",
    "Economics",
    "General Finance",
    "Mathematical Finance",
    "Portfolio Management",
    "Pricing of Securities",
    "Risk Management",
    "Statistical Finance",
    "Trading and Market Microstructure"
  ],
  "Statistics": [
    "Applications",
    "Computation",
    "Machine Learning",
    "Methodology",
    "Other Statistics",
    "Statistics Theory"
  ]
};

const TopicManager: React.FC<TopicManagerProps> = ({ 
  topics, 
  activeTopicId, 
  onSelectTopic, 
  onAddTopic, 
  onDeleteTopic 
}) => {
  const [selectedMainCat, setSelectedMainCat] = useState<string>("Computer Science");
  const [selectedField, setSelectedField] = useState<string>("Artificial Intelligence");
  const [customKeyword, setCustomKeyword] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);

  // Update field default when main category changes
  const handleMainCatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const main = e.target.value;
    setSelectedMainCat(main);
    
    // Find first available field in the new category
    const firstField = CATEGORY_HIERARCHY[main][0];
    setSelectedField(firstField);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    
    const exists = topics.some(t => 
        t.category === selectedMainCat && 
        t.subCategory === selectedField &&
        JSON.stringify(t.keywords) === JSON.stringify(customKeyword ? [customKeyword.trim()] : [])
    );
    
    if (exists) return;

    const newTopic: Topic = {
      id: Date.now().toString() + Math.random().toString(),
      category: selectedMainCat,
      subCategory: selectedField,
      keywords: customKeyword ? [customKeyword.trim()] : [],
    };
    onAddTopic(newTopic);
    setCustomKeyword("");
  };

  return (
    <div className="flex flex-col h-full">
      
      {/* 1. Add New Section */}
      <div className="p-5 border-b border-gray-100 dark:border-zinc-900 space-y-4">
        <div className="flex justify-between items-center cursor-pointer group" onClick={() => setIsExpanded(!isExpanded)}>
             <div>
                <h2 className="font-serif font-bold text-gray-900 dark:text-white text-base tracking-tight">Topics</h2>
                <p className="text-[10px] text-gray-500 dark:text-gray-300 font-medium">ArXiv Categories</p>
            </div>
            <div className={`p-1.5 rounded-full transition-colors ${isExpanded ? 'bg-gray-100 dark:bg-zinc-800' : 'group-hover:bg-gray-100 dark:group-hover:bg-zinc-800'}`}>
                 {isExpanded ? <ChevronDown size={14} className="text-gray-600 dark:text-gray-300"/> : <ChevronRight size={14} className="text-gray-600 dark:text-gray-300"/>}
            </div>
        </div>

        {isExpanded && (
            <form onSubmit={handleAdd} className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="space-y-2.5">
                    {/* Level 1: Main Category */}
                    <select 
                        value={selectedMainCat} 
                        onChange={handleMainCatChange}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all appearance-none"
                    >
                        {Object.keys(CATEGORY_HIERARCHY).map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>

                    {/* Level 2: Sub Fields */}
                    <select 
                        value={selectedField} 
                        onChange={(e) => setSelectedField(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all appearance-none"
                    >
                        {CATEGORY_HIERARCHY[selectedMainCat].map(field => (
                            <option key={field} value={field} className="text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-800">
                                {field}
                            </option>
                        ))}
                    </select>

                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Optional keyword..."
                            value={customKeyword}
                            onChange={(e) => setCustomKeyword(e.target.value)}
                            className="w-full pl-8 pr-10 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg text-xs font-medium outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:text-white transition-all placeholder:text-gray-400"
                        />
                        <Hash size={12} className="absolute left-2.5 top-2.5 text-gray-400" />
                        <button 
                            type="submit"
                            className="absolute right-1 top-1 bottom-1 px-3 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors flex items-center justify-center shadow-sm"
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                </div>
            </form>
        )}
      </div>

      {/* 2. List of Followed Topics */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
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
        <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">My Subscriptions</p>

        {topics.map(topic => (
          <div key={topic.id} className="group relative">
             <button
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
                        Filters: {topic.keywords.join(", ")}
                    </div>
                ) : (
                    <div className="text-[10px] text-gray-500 dark:text-gray-300 truncate mt-0.5">
                        {topic.category}
                    </div>
                )}
              </div>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDeleteTopic(topic.id); }}
              className="absolute top-1/2 -translate-y-1/2 right-2 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-500 rounded-md transition-all"
              title="Unfollow"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopicManager;