export interface Comment {
  id: string;
  selector: string;
  comment: string;
  timestamp: number;
  pageUrl: string;
  elementHtml?: string;
  boundingBox?: DOMRect;
}

export interface StorageData {
  [url: string]: Comment[];
}

export interface Message {
  type: 'TOGGLE_SELECTION_MODE' | 'ELEMENT_SELECTED' | 'SAVE_COMMENT' | 'DELETE_COMMENT' | 'GET_COMMENTS';
  payload?: any;
}