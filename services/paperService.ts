import { Paper, Topic } from "../types";

// --- Configuration ---

const ARXIV_API_URL = "https://export.arxiv.org/api/query";
const BASE_DELAY_MS = 1000; // ArXiv 建议请求间隔 3秒，我们在 retry 时会有指数退避

// --- Helpers ---

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const cleanTerm = (t: string) => t.replace(/["\\]/g, '').trim();

// --- Mappings (保持不变，这是 ArXiv 的核心分类) ---

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

    // Mathematics (Selected)
    "Combinatorics": "math.CO",
    "Dynamical Systems": "math.DS",
    "Logic": "math.LO",
    "Mathematical Physics": "math.MP",
    "Number Theory": "math.NT",
    "Optimization and Control": "math.OC",
    "Probability": "math.PR",
    "Statistics Theory": "math.ST",

    // Physics (Selected)
    "General Relativity and Quantum Cosmology": "gr-qc",
    "High Energy Physics - Theory": "hep-th",
    "Quantum Physics": "quant-ph",
    "Fluid Dynamics": "physics.flu-dyn",
    "Optics": "physics.optics",

    // Quantitative Biology
    "Genomics": "q-bio.GN",
    "Neurons and Cognition": "q-bio.NC",
    "Quantitative Methods": "q-bio.QM",

    // Quantitative Finance
    "Computational Finance": "q-fin.CP",
    "Portfolio Management": "q-fin.PM",
    "Risk Management": "q-fin.RM",
    "Statistical Finance": "q-fin.ST",
    "Trading and Market Microstructure": "q-fin.TR",

    // Statistics
    "Applications": "stat.AP",
    "Computation": "stat.CO",
    "Methodology": "stat.ME",
    "Other Statistics": "stat.OT"
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

// --- Query Construction ---

const buildTopicQuery = (topic: Topic): string => {
    const code = getCategoryCode(topic);
    
    // 逻辑：如果能找到代码，就用 cat:代码。否则用 all:"名称"。
    const base = code ? `cat:${code}` : `all:"${cleanTerm(topic.subCategory || topic.category)}"`;
    
    // 如果有关键词：(Category) AND (Key1 OR Key2)
    if (topic.keywords && topic.keywords.length > 0) {
        const keywordQuery = topic.keywords.map(k => `all:"${cleanTerm(k)}"`).join(" OR ");
        return `(${base} AND (${keywordQuery}))`;
    }
    
    return base;
};

// --- XML Parsing (健壮的解析器) ---

const parseArxivXml = (xmlText: string, associatedTopicId?: string): Paper[] => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    
    if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
        console.error("XML Parse Error", xmlDoc.getElementsByTagName("parsererror")[0]);
        throw new Error("XML Parser Error");
    }

    const entries = Array.from(xmlDoc.getElementsByTagName("entry"));

    return entries.map(entry => {
        const getText = (tag: string) => entry.getElementsByTagName(tag)[0]?.textContent?.trim() || "";
        
        // ID 清洗: http://arxiv.org/abs/2101.12345v1 -> 2101.12345
        const idRaw = getText("id");
        const cleanId = idRaw.replace(/v\d+$/, '').split('/').pop() || idRaw;
        
        const authors = Array.from(entry.getElementsByTagName("author"))
            .map(n => n.getElementsByTagName("name")[0]?.textContent || "")
            .filter(n => n);

        const published = getText("published").split('T')[0];
        
        // 获取主分类
        const primaryCatCode = entry.getElementsByTagName("arxiv:primary_category")[0]?.getAttribute("term") || "";
        
        // 获取所有 Tag
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
};

// --- Network / Fetching (带重试和代理机制) ---

const executeArxivQuery = async (searchQuery: string, start: number, maxResults: number, signal?: AbortSignal, associatedTopicId?: string): Promise<Paper[]> => {
    if (!searchQuery) return [];

    const queryParams = new URLSearchParams({
        search_query: searchQuery,
        start: start.toString(),
        max_results: maxResults.toString(),
        sortBy: 'submittedDate',
        sortOrder: 'descending'
    });

    const targetUrl = `${ARXIV_API_URL}?${queryParams.toString()}`;

    // 使用多个代理端点以防 CORS 问题或 IP 封锁
    const endpoints = [
        targetUrl, 
        `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
        `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`
    ];

    let lastError: any;

    for (let attempt = 0; attempt < endpoints.length; attempt++) {
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

        try {
            // 指数退避: 0ms, 1000ms, 2000ms...
            if (attempt > 0) await wait(BASE_DELAY_MS * attempt);

            const response = await fetch(endpoints[attempt], { signal });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const xmlText = await response.text();
            
            // 简单验证是否是有效 XML
            if (xmlText.includes("<!DOCTYPE html") || xmlText.length < 50) {
                throw new Error("Received HTML instead of XML (likely proxy block)");
            }

            return parseArxivXml(xmlText, associatedTopicId);

        } catch (e: any) {
            if (e.name === 'AbortError') throw e;
            console.warn(`Attempt ${attempt + 1} failed for ArXiv fetch:`, e);
            lastError = e;
        }
    }

    console.error("All ArXiv fetch attempts failed.", lastError);
    return [];
};

// --- Public API methods ---

// 1. 获取单个 Topic 的论文
export const fetchPapersForTopic = async (topic: Topic, excludeTitles: string[] = [], signal?: AbortSignal): Promise<Paper[]> => {
    const searchQuery = buildTopicQuery(topic);
    // 多抓取一点以便后续去重
    const rawPapers = await executeArxivQuery(searchQuery, 0, 15, signal, topic.id);

    const seenTitles = new Set(excludeTitles.map(t => t.toLowerCase().replace(/[^a-z0-9]/g, '')));
    return rawPapers.filter(p => {
        const nTitle = p.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (seenTitles.has(nTitle)) return false;
        seenTitles.add(nTitle);
        return true;
    });
};

// 2. 获取聚合（推荐）流
// 这里的逻辑已移除 AI，改为“随机组合用户关注的话题”
export const fetchAggregatedPapers = async (topics: Topic[], excludeTitles: string[] = [], signal?: AbortSignal): Promise<Paper[]> => {
    if (topics.length === 0) return [];

    // --- 策略：随机轮询 (Discovery through Rotation) ---
    // 问题：不能一次查询所有 Topic（URL 会太长导致报错）。
    // 解决：随机打乱用户的 Topic 列表，取前 5 个进行查询。
    // 效果：用户每次刷新都能看到不同领域的组合，既新鲜又稳定。

    const shuffledTopics = [...topics].sort(() => 0.5 - Math.random());
    const selectedTopics = shuffledTopics.slice(0, 5); // 取 5 个随机话题

    // 构建一个大的 OR 查询: (cat:cs.AI OR cat:math.CO OR ...)
    const queryParts = selectedTopics.map(t => buildTopicQuery(t));
    const finalQuery = queryParts.length > 0 ? `(${queryParts.join(" OR ")})` : "";

    // 执行查询，一次获取 20 条
    const rawPapers = await executeArxivQuery(finalQuery, 0, 20, signal, "aggregated");

    // --- 去重逻辑 ---
    const seenTitles = new Set(excludeTitles.map(t => t.toLowerCase().replace(/[^a-z0-9]/g, '')));
    const uniquePapers: Paper[] = [];

    for (const p of rawPapers) {
        const nTitle = p.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!seenTitles.has(nTitle)) {
            seenTitles.add(nTitle);
            uniquePapers.push(p);
        }
    }

    // 最终按时间倒序
    return uniquePapers.sort((a, b) => 
        new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
    );
};
