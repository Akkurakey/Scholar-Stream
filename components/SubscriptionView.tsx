import React, { useState } from 'react';
import { Topic } from '../types';
import { Plus, Trash2, Hash, BookOpen, Layers } from 'lucide-react';

interface SubscriptionViewProps {
  topics: Topic[];
  onAddTopic: (topic: Topic) => void;
  onDeleteTopic: (id: string) => void;
}

// ArXiv Official Taxonomy
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

const SubscriptionView: React.FC<SubscriptionViewProps> = ({ topics, onAddTopic, onDeleteTopic }) => {
  const [selectedMainCat, setSelectedMainCat] = useState<string>("Computer Science");
  const [selectedField, setSelectedField] = useState<string>("Artificial Intelligence");
  const [customKeyword, setCustomKeyword] = useState("");

  const handleMainCatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const main = e.target.value;
    setSelectedMainCat(main);
    const firstField = CATEGORY_HIERARCHY[main][0];
    setSelectedField(firstField);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Allow comma separated keywords
    const keywords = customKeyword
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);

    const exists = topics.some(t => 
        t.category === selectedMainCat && 
        t.subCategory === selectedField &&
        JSON.stringify(t.keywords.sort()) === JSON.stringify(keywords.sort())
    );
    
    if (exists) {
        alert("You are already subscribed to this exact topic!");
        return;
    }

    const newTopic: Topic = {
      id: Date.now().toString() + Math.random().toString(),
      category: selectedMainCat,
      subCategory: selectedField,
      keywords: keywords,
    };
    onAddTopic(newTopic);
    setCustomKeyword("");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20">
      
      {/* Header */}
      <div>
        <h2 className="text-3xl font-serif font-bold text-gray-900 dark:text-white mb-2">Manage Subscriptions</h2>
        <p className="text-gray-500 dark:text-gray-400">Customize your feed by following specific research areas and keywords.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        
        {/* CREATE SECTION */}
        <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 md:p-8 border border-gray-100 dark:border-zinc-800 shadow-xl shadow-gray-200/50 dark:shadow-black/20 sticky top-10">
                <div className="flex items-center gap-3 mb-6 text-gray-900 dark:text-white">
                    <div className="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg text-primary-600 dark:text-primary-400">
                        <Plus size={20} />
                    </div>
                    <h3 className="text-lg font-bold">Add New Topic</h3>
                </div>

                <form onSubmit={handleAdd} className="space-y-5">
                    
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Discipline</label>
                        <div className="relative">
                            <select 
                                value={selectedMainCat} 
                                onChange={handleMainCatChange}
                                className="w-full pl-4 pr-10 py-3.5 bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all appearance-none cursor-pointer"
                            >
                                {Object.keys(CATEGORY_HIERARCHY).map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <Layers size={16} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Field of Study</label>
                        <div className="relative">
                            <select 
                                value={selectedField} 
                                onChange={(e) => setSelectedField(e.target.value)}
                                className="w-full pl-4 pr-10 py-3.5 bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all appearance-none cursor-pointer"
                            >
                                {CATEGORY_HIERARCHY[selectedMainCat].map(field => (
                                    <option key={field} value={field}>{field}</option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <BookOpen size={16} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Keywords <span className="text-gray-400 font-normal lowercase ml-1">(Optional, comma separated)</span>
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="e.g. transformer, neural networks"
                                value={customKeyword}
                                onChange={(e) => setCustomKeyword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3.5 bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-medium outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-gray-900 dark:text-white transition-all placeholder:text-gray-400"
                            />
                            <Hash size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                    </div>

                    <button 
                        type="submit"
                        className="w-full py-4 bg-primary-600 hover:bg-primary-700 active:scale-[0.98] text-white rounded-xl font-bold transition-all shadow-lg shadow-primary-500/20 flex items-center justify-center gap-2"
                    >
                        <Plus size={18} />
                        Subscribe
                    </button>

                </form>
            </div>
        </div>

        {/* LIST SECTION */}
        <div className="lg:col-span-7">
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                Active Subscriptions 
                <span className="bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full text-[10px]">{topics.length}</span>
            </h3>
            
            {topics.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-gray-50 dark:bg-zinc-900/50 border border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl">
                    <div className="p-4 bg-white dark:bg-zinc-800 rounded-full mb-4 shadow-sm">
                        <Layers size={24} className="text-gray-300 dark:text-gray-600" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">No subscriptions yet.</p>
                    <p className="text-sm text-gray-400 mt-1">Add a topic on the left to start your feed.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {topics.map(topic => (
                        <div key={topic.id} className="group relative bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 hover:shadow-md transition-all flex flex-col">
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-2 rounded-lg bg-gray-50 dark:bg-zinc-800 text-gray-400 dark:text-gray-500 group-hover:text-primary-500 dark:group-hover:text-primary-400 transition-colors">
                                    <BookOpen size={16} />
                                </div>
                                <button 
                                    onClick={() => onDeleteTopic(topic.id)}
                                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    title="Unsubscribe"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            
                            <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm leading-snug mb-1">
                                {topic.subCategory || topic.category}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{topic.category}</p>
                            
                            {topic.keywords.length > 0 && (
                                <div className="mt-auto pt-3 border-t border-gray-50 dark:border-zinc-800 flex flex-wrap gap-2">
                                    {topic.keywords.map((k, i) => (
                                        <span key={i} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 bg-primary-50 dark:bg-primary-900/10 text-primary-600 dark:text-primary-400 rounded-md">
                                            <Hash size={10} /> {k}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionView;