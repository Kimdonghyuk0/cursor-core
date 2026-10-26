import type { CursorExtractor } from './cursor.type';

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
export interface PageInfo { //클라이언트한테 응답시 함께 주는 정보
  startCursor: string | null;
  endCursor: string | null;
  hasNextPage: boolean; // first 조회의 초과 데이터로 판단하며, last 조회에서는 false
  hasPreviousPage: boolean; // last 조회의 초과 데이터로 판단하며, first 조회에서는 false
}
export interface Edge<TNode>{
  node:TNode;
  cursor: string;
}
export interface CursorCodec<TCursor>{//인코더&디코더
  encode(cursor: TCursor): string;
  decode(cursor: string): TCursor;
}

export interface Connection<TNode> {
  edges: Edge<TNode>[];
  pageInfo: PageInfo;
}

export interface CursorQueryBuilder<TCursor, TQuery>{
  // CursorPaginator.buildQuery()가 검증한 요청과 해석한 커서로 조회 조건을 만듭니다.
  // 커서 경계는 제외하고, 요청 개수 + 1개를 조회해야 추가 페이지를 판별할 수 있습니다.
   build(
    args: CursorPaginationArgs,
    cursor: TCursor | null,
  ): TQuery;
}
export interface ConnectionBuilder<TNode, TCursor> {
  build(
    nodes: TNode[],
    args: CursorPaginationArgs,
    extractor: CursorExtractor<TNode, TCursor>,
    codec: CursorCodec<TCursor>,
  ): Connection<TNode>;
}
