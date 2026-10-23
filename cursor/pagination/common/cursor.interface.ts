export interface CursorPaginationArgs { //클라이언트가 제공하는 정보
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

export interface CursorPayload { //실제 커서 안에 들어가는 정보
  id: string | number;
  createdAt?: string; 
}
export interface PageInfo { //클라이언트한테 응답시 함꼐 주는 정보
  startCursor: string | null;
  endCursor: string | null;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
export interface Edge<TNode>{
  node:TNode;
  cursor:String;
}
export interface CursorCodec<TCursor>{//인코더&디코더
  encode(cursor: TCursor): string;
  decode(cursor: string): TCursor;
}

export interface Connection<TNode> {
  edges: Edge<TNode>[];
  pageInfo: PageInfo;
}