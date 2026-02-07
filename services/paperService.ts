import { Paper, Topic } from "../types";

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const cleanTerm = (t: string) => t.replace(/["\\]/g, '').trim();

// STRICT MAPPING: Human Readable Subcategory Name -> Official ArXiv Code
export const SUB_CATEGORY_TO_CODE: Record<string, string> = {
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
    "Information Theory": "cs.IT",
    "Machine Learning": "cs.LG",
    "Logic in Computer Science": "cs.LO",
    "Multiagent Systems": "cs.MA",
    "Multimedia": "cs.MM",
    "Mathematical Software": "cs.MS",
    "Numerical Analysis": "cs.NA",
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
    "Systems and Control": "cs.SY",

    // Economics
    "Econometrics": "econ.EM",
    "General Economics": "econ.GN",
    "Theoretical Economics": "econ.TH",

    // EESS
    "Audio and Speech Processing": "eess.AS",
    "Image and Video Processing": "eess.IV",
    "Signal Processing": "eess.SP",

    // Mathematics
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
    "Economics": "q-fin.EC",
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
    "Methodology": "stat.ME",
    "Other Statistics": "stat.OT",
};

const CODE_TO_SUB_CATEGORY: Record<string, string> = Object.entries(SUB_CATEGORY_TO_CODE).reduce((acc, [name, code]) => {
    acc[code] = name;
    return acc;
}, {} as Record<string, string>);

export const getCategoryCode = (topic: Topic): string => {
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

const buildTopicQuery = (topic: Topic): string => {
    const code = getCategoryCode(topic);
    const base = code ? `cat:${code}` : `all:"${cleanTerm(topic.subCategory || topic.category)}"`;
    
    if (topic.keywords.length > 0) {
        const keywordQuery = topic.keywords.map(k => `all:"${cleanTerm(k)}"`).join(" OR ");
        return `(${base} AND (${keywordQuery}))`;
    }
    
    return base;
};

const executeArxivQuery = async (searchQuery: string, start: number, maxResults: number, signal?: AbortSignal, associatedTopicId?: string): Promise<Paper[]> => {
    if (!searchQuery) return [];

    const baseApiUrl = `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(searchQuery)}&start=${start}&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`;

    const endpoints = [
        baseApiUrl,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(baseApiUrl)}`,
        `https://corsproxy.io/?${encodeURIComponent(baseApiUrl)}`
    ];

    const performFetch = async (attempt: number): Promise<Paper[]> => {
        try {
            if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
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
                
                const allCategories = Array.from(entry.getElementsByTagName("category"));
                const tags = allCategories.map(c => c.getAttribute("term") || "").filter(t => t);

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
                    tags: tags,
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

export const fetchPapersForTopic = async (topic: Topic, excludeTitles: string[] = [], signal?: AbortSignal): Promise<Paper[]> => {
    const searchQuery = buildTopicQuery(topic);
    const newPapers = await executeArxivQuery(searchQuery, excludeTitles.length, 8, signal, topic.id);

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

export const fetchAggregatedPapers = async (topics: Topic[], _bookmarkedPapers: Paper[] = [], excludeTitles: string[] = [], signal?: AbortSignal): Promise<Paper[]> => {
    if (topics.length === 0) return [];

    // Simple rotation strategy: Pick 4 random topics and query them from ArXiv.
    const shuffledTopics = [...topics].sort(() => 0.5 - Math.random());
    const selectedTopics = shuffledTopics.slice(0, 4);

    const subscriptionQueryParts = selectedTopics.map(t => buildTopicQuery(t));
    const subscriptionQuery = subscriptionQueryParts.length > 0 ? `(${subscriptionQueryParts.join(" OR ")})` : "";

    if (!subscriptionQuery) return [];

    const allFetched = await executeArxivQuery(subscriptionQuery, 0, 12, signal, "aggregated");

    const uniquePapers: Paper[] = [];
    const seenTitles = new Set(excludeTitles.map(t => t.toLowerCase().replace(/[^a-z0-9]/g, '')));

    for (const p of allFetched) {
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
