import { deepStrictEqual, ok, strictEqual, throws } from 'node:assert/strict';
import { CursorPaginator } from './cursor';
import type { CursorPaginationArgs, CursorQueryBuilder } from './cursor';

// 1. 사용자가 조회할 데이터, 커서에 담을 값, DB에 전달할 조회 조건을 정의합니다.
type Post = { id: number; title: string };
type PostCursor = { id: number };
type SortOrder = 'asc' | 'desc';
type PostQuery = {
  idGreaterThan?: number;
  idLessThan?: number;
  order: SortOrder;
  limit: number;
};

// 2. 사용자는 CursorPaginator를 다시 구현하지 않고, QueryBuilder의 build()를 구현합니다.
class PostQueryBuilder implements CursorQueryBuilder<PostCursor, PostQuery> {
  constructor(private readonly order: SortOrder) {}

  build(args: CursorPaginationArgs, cursor: PostCursor | null): PostQuery {
    // 공통 검증은 paginator.buildQuery()가 먼저 실행합니다.
    // 이 예제는 단방향만 제공하므로, 라이브러리가 지원하는 last 요청도 여기서는 받지 않습니다.
    if (args.first == null) {
      throw new Error('이 예제는 first와 after로 다음 페이지를 조회합니다.');
    }
    // 커서 문자열을 해석하는 일은 라이브러리가, 도메인에 맞는 값인지 확인하는 일은 사용자가 맡습니다.
    if (args.after != null && (cursor == null || !Number.isInteger(cursor.id))) {
      throw new Error('게시글 커서에는 정수 id가 필요합니다.');
    }

    // after는 정렬된 목록에서의 다음 위치입니다. DESC에서는 더 작은 ID를 조회합니다.
    return {
      idGreaterThan: this.order === 'asc' ? cursor?.id : undefined,
      idLessThan: this.order === 'desc' ? cursor?.id : undefined,
      order: this.order,
      limit: args.first + 1, // 초과 1개로 다음 페이지가 있는지 판별합니다.
    };
  }
}

// 3. 실제 DB 대신 사용하는 목 객체입니다. 실제 서비스에서는 ORM 등의 조회로 교체합니다.
const posts: Post[] = Array.from({ length: 5 }, (_, index) => ({
  id: index + 1,
  title: `게시글 ${index + 1}`,
}));
const db = {
  findMany(query: PostQuery): Post[] {
    // 목 DB에서만 배열로 WHERE → ORDER BY → LIMIT을 흉내 냅니다.
    // 실제 DB에서는 같은 조건을 쿼리에 적용해 필요한 N+1개만 받아야 합니다.
    return posts
      .filter(post => (query.idGreaterThan == null || post.id > query.idGreaterThan)
        && (query.idLessThan == null || post.id < query.idLessThan))
      .sort((a, b) => query.order === 'asc' ? a.id - b.id : b.id - a.id)
      .slice(0, query.limit);
  },
};

// Codec과 ConnectionBuilder를 전달하지 않으면 라이브러리의 기본 구현을 사용합니다.
const paginator = new CursorPaginator<PostCursor, Post>();

// 4. 서비스 함수에서 조회 조건 생성 → DB 호출 → 응답 생성을 연결합니다.
function listPosts(args: { first: number; after?: string }, order: SortOrder) {
  const queryBuilder = new PostQueryBuilder(order);
  const query = paginator.buildQuery(args, queryBuilder); // 요청 검증·커서 해석 후 사용자 build() 호출
  const nodes = db.findMany(query);
  // 세 번째 인수가 extractor입니다. 이 예제는 ID 정렬이므로 커서에도 ID만 담습니다.
  return paginator.buildConnection(nodes, args, node => ({ id: node.id }));
}



