import { Paper, Topic } from "../types";
import { GoogleGenAI, Type } from "@google/genai";

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const cleanTerm = (t: string) => t.replace(/["\\]/g, '').trim();

// STRICT MAPPING: Human Readable Subcategory Name -> Official ArXiv Code
// Source: https://arxiv.org/category_taxonomy
const SUB_CATEGORY_TO_CODE: Record<string, string> = {
    // Computer Science
    "Artificial Intelligence": "cs.AI",
    "Hardware Architecture": "cs.AR",
    "Computational Complexity": "cs.CC",
    "Computational Engineering, Finance, and Science": "cs.CE",
    "Computational Geometry": "cs.CG",
    "Computation and Language": "cs.CL",
    "Cryptography and Security": "cs.CR",
    "Computer Vision and Pattern Recognition": "cs.CV",
    "Computers and Society": "cs.CY",
    "Databases": "cs.DB",
    "Distributed, Parallel, and Cluster Computing": "cs.DC",
    "Digital Libraries": "cs.DL",
    "Discrete Mathematics": "cs.DM",
    "Data Structures and Algorithms": "cs.DS",
    "Emerging Technologies": "cs.ET",
    "Formal Languages and Automata Theory": "cs.FL",
    "General Literature": "cs.GL",
    "Graphics": "cs.GR",
    "Computer Science and Game Theory": "cs.GT",
    "Human-Computer Interaction": "cs.HC",
    "Information Retrieval": "cs.IR",
    "Information Theory": "cs.IT", // Also in Math
    "Machine Learning": "cs.LG", // Also in Stat
    "Logic in Computer Science": "cs.LO",
    "Multiagent Systems": "cs.MA",
    "Multimedia": "cs.MM",
    "Mathematical Software": "cs.MS",
    "Numerical Analysis": "cs.NA", // Also in Math
    "Neural and Evolutionary Computing": "cs.NE",
    "Networking and Internet Architecture": "cs.NI",
    "Other Computer Science": "cs.OH",
    "Operating Systems": "cs.OS",
    "Performance": "cs.PF",
    "Programming Languages": "cs.PL",
    "Robotics": "cs.RO",
    "Symbolic Computation": "cs.SC",
    "Sound": "cs.SD",
    "Software Engineering": "cs.SE",
    "Social and Information Networks": "cs.SI",
    "Systems and Control": "cs.SY", // Also in EESS

    // Economics
    "Econometrics": "econ.EM",
    "General Economics": "econ.GN",
    "Theoretical Economics": "econ.TH",

    // EESS
    "Audio and Speech Processing": "eess.AS",
    "Image and Video Processing": "eess.IV",
    "Signal Processing": "eess.SP",
    // "Systems and Control": "eess.SY", // Duplicate name, map to eess.SY generally if selected under EESS

    // Mathematics (Selected common ones)
    "Algebraic Geometry": "math.AG",
    "Analysis of PDEs": "math.AP",
    "Category Theory": "math.CT",
    "Combinatorics": "math.CO",
    "Differential Geometry": "math.DG",
    "Dynamical Systems": "math.DS",
    "Functional Analysis": "math.FA",
    "General Mathematics": "math.GM",
    "General Topology": "math.GN",
    "Group Theory": "math.GR",
    "Geometric Topology": "math.GT",
    "History and Overview": "math.HO",
    "K-Theory and Homology": "math.KT",
    "Logic": "math.LO",
    "Metric Geometry": "math.MG",
    "Mathematical Physics": "math.MP",
    "Number Theory": "math.NT",
    "Operator Algebras": "math.OA",
    "Optimization and Control": "math.OC",
    "Probability": "math.PR",
    "Quantum Algebra": "math.QA",
    "Rings and Algebras": "math.RA",
    "Representation Theory": "math.RT",
    "Symplectic Geometry": "math.SG",
    "Spectral Theory": "math.SP",
    "Statistics Theory": "math.ST",

    // Physics
    "Astrophysics of Galaxies": "astro-ph.GA",
    "Cosmology and Nongalactic Astrophysics": "astro-ph.CO",
    "Earth and Planetary Astrophysics": "astro-ph.EP",
    "High Energy Astrophysical Phenomena": "astro-ph.HE",
    "Instrumentation and Methods for Astrophysics": "astro-ph.IM",
    "Solar and Stellar Astrophysics": "astro-ph.SR",
    "General Relativity and Quantum Cosmology": "gr-qc",
    "High Energy Physics - Experiment": "hep-ex",
    "High Energy Physics - Lattice": "hep-lat",
    "High Energy Physics - Phenomenology": "hep-ph",
    "High Energy Physics - Theory": "hep-th",
    "Quantum Physics": "quant-ph",
    "Nuclear Experiment": "nucl-ex",
    "Nuclear Theory": "nucl-th",
    "Fluid Dynamics": "physics.flu-dyn",
    "Geophysics": "physics.geo-ph",
    "Medical Physics": "physics.med-ph",
    "Optics": "physics.optics",
    "Plasma Physics": "physics.plasm-ph",
    "Space Physics": "physics.space-ph",

    // Quantitative Biology
    "Biomolecules": "q-bio.BM",
    "Cell Behavior": "q-bio.CB",
    "Genomics": "q-bio.GN",
    "Molecular Networks": "q-bio.MN",
    "Neurons and Cognition": "q-bio.NC",
    "Populations and Evolution": "q-bio.PE",
    "Quantitative Methods": "q-bio.QM",
    "Subcellular Processes": "q-bio.SC",
    "Tissues and Organs": "q-bio.TO",

    // Quantitative Finance
    "Computational Finance": "q-fin.CP",
    "Economics": "q-fin.EC", // Duplicate name
    "General Finance": "q-fin.GN",
    "Mathematical Finance": "q-fin.MF",
    "Portfolio Management": "q-fin.PM",
    "Pricing of Securities": "q-fin.PR",
    "Risk Management": "q-fin.RM",
    "Statistical Finance": "q-fin.ST",
    "Trading and Market Microstructure": "q-fin.TR",

    // Statistics
    "Applications": "stat.AP",
    "Computation": "stat.CO",
    // "Machine Learning": "stat.ML", // Duplicate
    "Methodology": "stat.ME",
    "Other Statistics": "stat.OT",
    // "Statistics Theory": "stat.TH"
};

// Create a Reverse Map: Code -> Human Readable Name
const CODE_TO_SUB_CATEGORY: Record<string, string> = Object.entries(SUB_CATEGORY_TO_CODE).reduce((acc, [name, code]) => {
    acc[code] = name;
    return acc;
}, {} as Record<string, string>);


const getCategoryCode = (topic: Topic): string => {
    if (topic.subCategory) {
        if (topic.subCategory === "Systems and Control" && topic.category === "Electrical Engineering and Systems Science") {
             return "eess.SY";
        } else if (topic.subCategory === "Machine Learning" && topic.category === "Statistics") {
             return "stat.ML";
        } else {
             return SUB_CATEGORY_TO_CODE[topic.subCategory] || "";
        }
    }
    return "";
};

// Reusable fetcher for a constructed ArXiv Query String
const executeArxivQuery = async (searchQuery: string, start: number, maxResults: number, signal?: AbortSignal, associatedTopicId?: string): Promise<Paper[]> => {
    // Sort by submittedDate descending (newest first)
    const baseApiUrl = `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(searchQuery)}&start=${start}&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`;

    // Proxy strategy to handle CORS
    // ArXiv export URL generally handles CORS, but can be slow or blocked by some networks.
    const endpoints = [
        baseApiUrl,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(baseApiUrl)}`,
        `https://corsproxy.io/?${encodeURIComponent(baseApiUrl)}`
    ];

    const performFetch = async (attempt: number): Promise<Paper[]> => {
        try {
            if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
            
            // Reduced backoff time for faster UX (300ms instead of 1000ms)
            if (attempt > 0) await wait(300 * attempt); 
            
            const response = await fetch(endpoints[attempt], { signal });
            if (!response.ok) throw new Error("Fetch failed");
            
            const xmlText = await response.text();
            
            if (xmlText.includes("<!DOCTYPE html") || xmlText.length < 50) throw new Error("Invalid XML response");

            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");
            if (xmlDoc.getElementsByTagName("parsererror").length > 0) throw new Error("Parser Error");

            const entries = Array.from(xmlDoc.getElementsByTagName("entry"));
            
            return entries.map(entry => {
                const getText = (tag: string) => entry.getElementsByTagName(tag)[0]?.textContent?.trim() || "";
                
                const idRaw = getText("id");
                const cleanId = idRaw.split('/abs/')[1]?.split('v')[0] || idRaw;
                
                const authors = Array.from(entry.getElementsByTagName("author"))
                    .map(n => n.getElementsByTagName("name")[0]?.textContent || "")
                    .filter(n => n);
                    
                const published = getText("published").split('T')[0];
                const primaryCatCode = entry.getElementsByTagName("arxiv:primary_category")[0]?.getAttribute("term") || "";
                
                // Translate Code (e.g., cs.CV) -> Readable Name (e.g., Computer Vision)
                const humanReadableCategory = CODE_TO_SUB_CATEGORY[primaryCatCode] || primaryCatCode;

                return {
                    id: cleanId,
                    title: getText("title").replace(/[\n\r\s]+/g, ' '),
                    authors: authors.length ? authors : ["Unknown Author"],
                    abstract: getText("summary").replace(/[\n\r\s]+/g, ' '),
                    journal: humanReadableCategory, 
                    source: "ArXiv",
                    publishDate: published, 
                    doi: "", 
                    url: idRaw,
                    tags: [primaryCatCode],
                    topicId: associatedTopicId || "aggregated"
                };
            });

        } catch (e: any) {
            if (e.name === 'AbortError') throw e;
            if (attempt < endpoints.length - 1) return performFetch(attempt + 1);
            console.warn("ArXiv fetch failed after retries", e);
            return [];
        }
    };

    return performFetch(0);
};

// Fetch for a single topic
export const fetchPapersForTopic = async (topic: Topic, excludeTitles: string[] = [], signal?: AbortSignal): Promise<Paper[]> => {
    const queryParts: string[] = [];
    const officialCode = getCategoryCode(topic);

    if (officialCode) {
        queryParts.push(`cat:${officialCode}`);
    } else {
        if (topic.subCategory) queryParts.push(`all:"${cleanTerm(topic.subCategory)}"`);
        else queryParts.push(`all:"${cleanTerm(topic.category)}"`);
    }
    
    // Add Keywords
    const keywordTerms: string[] = [];
    topic.keywords.forEach(k => { if(k) keywordTerms.push(`all:"${cleanTerm(k)}"`) });
    
    if (keywordTerms.length > 0) {
        queryParts.push(...keywordTerms);
    }

    const searchQuery = queryParts.join(" AND ");
    
    const newPapers = await executeArxivQuery(searchQuery, excludeTitles.length, 8, signal, topic.id);

    // Deduplicate
    const uniquePapers: Paper[] = [];
    const seenTitles = new Set(excludeTitles.map(t => t.toLowerCase().replace(/[^a-z0-9]/g, '')));

    for (const p of newPapers) {
        const nTitle = p.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!seenTitles.has(nTitle)) {
            seenTitles.add(nTitle);
            uniquePapers.push(p);
        }
    }

    return uniquePapers.sort((a, b) => 
        new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
    );
};

// Generate AI keywords for better discovery
const getAiEnhancedKeywords = async (topics: Topic[], bookmarks: Paper[]): Promise<string[]> => {
    // If no API key or no significant data, skip
    if (!process.env.API_KEY || (topics.length === 0 && bookmarks.length === 0)) return [];

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Prepare context
        const topicNames = topics.map(t => t.subCategory || t.category).slice(0, 5).join(", ");
        const bookmarkTitles = bookmarks.map(b => b.title).slice(0, 3).join("; ");
        
        const prompt = `
            Based on these research interests: [${topicNames}] 
            and these recently bookmarked papers: [${bookmarkTitles}],
            generate 3 highly specific, technical search phrases (keywords only, no explanations) 
            to find relevant new scientific papers on ArXiv.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });
        
        const jsonText = response.text || "[]";
        const keywords = JSON.parse(jsonText);
        return Array.isArray(keywords) ? keywords.slice(0, 3) : [];
        
    } catch (e) {
        console.warn("AI keyword generation failed", e);
        return [];
    }
}

// Fetch aggregated papers from ALL subscribed topics + AI enhancement
export const fetchAggregatedPapers = async (topics: Topic[], bookmarkedPapers: Paper[] = [], excludeTitles: string[] = [], signal?: AbortSignal): Promise<Paper[]> => {
    if (topics.length === 0) return [];

    // 1. Construct standard category query
    const categoryTerms: string[] = [];
    
    topics.forEach(topic => {
        const code = getCategoryCode(topic);
        if (code) {
             categoryTerms.push(`cat:${code}`);
        } else {
             const term = topic.subCategory || topic.category;
             categoryTerms.push(`all:"${cleanTerm(term)}"`);
        }
    });

    // 2. Get AI Suggested Keywords (Optional, parallel fetch if possible but here sequential for simplicity/stability)
    let aiKeywords: string[] = [];
    // Only fetch AI keywords if we have bookmarks to guide it, or purely based on topics if bookmarks are empty
    // To save latency, only do this if not aborted
    if (!signal?.aborted) {
        // We do a "fire and forget" style or small timeout race could be better, but let's just await quickly
        // We only use AI if we have bookmarks to truly "personalize", otherwise categories are sufficient
        if (bookmarkedPapers.length > 0) {
             aiKeywords = await getAiEnhancedKeywords(topics, bookmarkedPapers);
        }
    }

    // 3. Add AI keywords to the query pool
    // Note: ArXiv "all" searches title and abstract.
    aiKeywords.forEach(k => {
        if(k) categoryTerms.unshift(`all:"${cleanTerm(k)}"`); // Add to front for priority
    });

    // Limit query complexity.
    const limitedTerms = categoryTerms.slice(0, 15); 
    const searchQuery = limitedTerms.length > 0 ? `(${limitedTerms.join(" OR ")})` : "all:science";

    const newPapers = await executeArxivQuery(searchQuery, excludeTitles.length, 12, signal, "aggregated");

    // Deduplicate
    const uniquePapers: Paper[] = [];
    const seenTitles = new Set(excludeTitles.map(t => t.toLowerCase().replace(/[^a-z0-9]/g, '')));

    for (const p of newPapers) {
        const nTitle = p.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!seenTitles.has(nTitle)) {
            seenTitles.add(nTitle);
            uniquePapers.push(p);
        }
    }

    return uniquePapers.sort((a, b) => 
        new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
    );
};
