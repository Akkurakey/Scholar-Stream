
export interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  journal: string;
  source: string; 
  publishDate: string;
  doi: string;
  url: string;
  tags: string[];
  topicId: string;
}

export interface Topic {
  id: string;
  category: string; 
  subCategory?: string; 
  keywords: string[]; 
}

export enum ViewMode {
  FEED = 'FEED',
  BOOKMARKS = 'BOOKMARKS',
  MANAGE = 'MANAGE',
}
