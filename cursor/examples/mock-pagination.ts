import { CursorPaginator } from '../index';
import type { CursorPaginationArgs, CursorQueryBuilder } from '../index';

export type MockPost = { id: number; title: string };
type PostCursor = { id: number };
export type MockPostQuery = {
  afterId?: number;
  beforeId?: number;
  order: 'asc' | 'desc';
  limit: number;
};

const posts: MockPost[] = Array.from({ length: 7 }, (_, index) => ({
  id: index + 1,
  title: `게시글 ${index + 1}`,
}));

// 이 예제의 최종 응답은 항상 ID 오름차순입니다. ID가 고유하므로 정렬 순서도 유일합니다.
const paginator = new CursorPaginator<PostCursor, MockPost>();
const queryBuilder: CursorQueryBuilder<PostCursor, MockPostQuery> = {
  build(args, cursor) {
    const backward = args.last != null;
    const size = args.first ?? args.last ?? 0;

    // first: id > after를 ASC 조회. last: id < before를 DESC 조회.
    // last도 경계에 가까운 항목부터 조회해야, 끝의 초과 항목을 안전하게 제거할 수 있습니다.
    return {
      afterId: backward ? undefined : cursor?.id,
      beforeId: backward ? cursor?.id : undefined,
      order: backward ? 'desc' : 'asc',
      limit: size + 1,
    };
  },
};

export const mockDb = {
  findMany(query: MockPostQuery): MockPost[] {
    // 목 객체에서만 배열로 WHERE → ORDER BY → LIMIT을 흉내 냅니다.
    // 실제 DB를 연결할 때는 이 조건을 DB에서 처리하고 최대 N+1개만 반환해야 합니다.
    return posts
      .filter(post => (query.afterId == null || post.id > query.afterId)
        && (query.beforeId == null || post.id < query.beforeId))
      .sort((a, b) => query.order === 'asc' ? a.id - b.id : b.id - a.id)
      .slice(0, query.limit);
  },
};

/**
 * 사용 흐름: buildQuery(검증·커서 해석) → 목 DB 조회 → buildConnection(응답 생성).
 * 예: before=6번 커서, last=2 → DB [5, 4, 3] → 초과 3 제거 → 응답 [4, 5].
 * 다음 요청은 endCursor를 after로, 이전 요청은 startCursor를 before로 전달합니다.
 */
export function listMockPosts(args: CursorPaginationArgs, db = mockDb) {
  const query = paginator.buildQuery(args, queryBuilder);
  const nodes = db.findMany(query);
  return paginator.buildConnection(nodes, args, node => ({ id: node.id }));
}
