import { deepStrictEqual, strictEqual, throws } from 'node:assert/strict';
import { test } from 'node:test';
import { CursorPaginator, DefaultConnectionBuilder } from '../index';
import type { ConnectionBuilder, CursorPaginationArgs } from '../index';
import { listMockPosts, mockDb } from '../examples/mock-pagination';
import type { MockPostQuery } from '../examples/mock-pagination';

type Node = { id: number };
const paginator = new CursorPaginator<Node, Node>();
const cursor = (id: number) => paginator.encode({ id });
const nodes = [1, 2, 3].map(id => ({ id }));
const extract = (node: Node) => ({ id: node.id });

test('순방향 조회는 N+1개를 조회하고 앞의 N개를 응답 순서대로 반환한다', () => {
  const db = {
    findMany(query: MockPostQuery) {
      deepStrictEqual(query, { afterId: 2, beforeId: undefined, order: 'asc', limit: 3 });
      const rows = mockDb.findMany(query);
      deepStrictEqual(rows.map(row => row.id), [3, 4, 5]);
      return rows;
    },
  };
  const result = listMockPosts({ first: 2, after: cursor(2) }, db);
  deepStrictEqual(result.edges.map(edge => edge.node.id), [3, 4]);
  deepStrictEqual(result.pageInfo, {
    startCursor: cursor(3), endCursor: cursor(4), hasNextPage: true, hasPreviousPage: false,
  });
});

test('역방향 조회는 초과 항목을 제거한 뒤 응답 순서를 복원한다', () => {
  const db = {
    findMany(query: MockPostQuery) {
      deepStrictEqual(query, { afterId: undefined, beforeId: 6, order: 'desc', limit: 3 });
      const rows = mockDb.findMany(query);
      deepStrictEqual(rows.map(row => row.id), [5, 4, 3]);
      return rows;
    },
  };
  const result = listMockPosts({ last: 2, before: cursor(6) }, db);
  deepStrictEqual(result.edges.map(edge => edge.node.id), [4, 5]);
  deepStrictEqual(result.pageInfo, {
    startCursor: cursor(4), endCursor: cursor(5), hasNextPage: false, hasPreviousPage: true,
  });
});

// 정확히 N개인 경우와 초과 데이터가 있는 경우를 구분하고, 빈 응답의 커서도 확인합니다.
const pageCases: [string, CursorPaginationArgs, number[], boolean, boolean][] = [
  ['커서 없이 first를 요청하면 첫 페이지를 반환한다', { first: 2 }, [1, 2], true, false],
  ['커서 없이 last를 요청하면 마지막 페이지를 반환한다', { last: 2 }, [6, 7], false, true],
  ['순방향 조회 결과가 정확히 N개이면 다음 페이지가 없다', { first: 2, after: cursor(5) }, [6, 7], false, false],
  ['역방향 조회 결과가 정확히 N개이면 이전 페이지가 없다', { last: 2, before: cursor(3) }, [1, 2], false, false],
  ['순방향 조회 결과가 N개보다 적으면 남은 항목만 반환한다', { first: 3, after: cursor(6) }, [7], false, false],
  ['역방향 조회 결과가 N개보다 적으면 남은 항목만 반환한다', { last: 3, before: cursor(2) }, [1], false, false],
  ['순방향 조회 결과가 없으면 빈 페이지와 null 커서를 반환한다', { first: 2, after: cursor(7) }, [], false, false],
  ['역방향 조회 결과가 없으면 빈 페이지와 null 커서를 반환한다', { last: 2, before: cursor(1) }, [], false, false],
];

for (const [name, args, expected, hasNextPage, hasPreviousPage] of pageCases) {
  test(name, () => {
    const result = listMockPosts(args);
    deepStrictEqual(result.edges.map(edge => edge.node.id), expected);
    deepStrictEqual(result.pageInfo, {
      startCursor: expected.length ? cursor(expected[0]) : null,
      endCursor: expected.length ? cursor(expected[expected.length - 1]) : null,
      hasNextPage,
      hasPreviousPage,
    });
  });
}

test('응답 커서로 다음 페이지에 갔다가 돌아와도 항목과 정렬 순서가 같다', () => {
  const first = listMockPosts({ first: 2 });
  // Edge.cursor가 string이 아니면 다음 요청을 구성할 때 타입 검사도 통과하지 못합니다.
  const nextArgs: CursorPaginationArgs = { first: 2, after: first.edges[1].cursor };
  const second = listMockPosts(nextArgs);
  const previous = listMockPosts({ last: 2, before: second.edges[0].cursor });
  deepStrictEqual(second.edges.map(edge => edge.node.id), [3, 4]);
  deepStrictEqual(previous.edges, first.edges);
  strictEqual(previous.pageInfo.startCursor, first.pageInfo.startCursor);
  strictEqual(previous.pageInfo.endCursor, first.pageInfo.endCursor);
});

test('빌더는 원본 배열을 보존하고 반환할 항목의 커서만 인코딩한다', () => {
  const rows = [5, 4, 3].map(id => ({ id }));
  Object.freeze(rows);
  const encodedIds: number[] = [];
  const builder = new DefaultConnectionBuilder<Node, Node>();
  const result = builder.build(rows, { last: 2 }, extract, {
    encode(value) { encodedIds.push(value.id); return `c${value.id}`; },
    decode(value) { return { id: Number(value.slice(1)) }; },
  });
  deepStrictEqual(rows.map(row => row.id), [5, 4, 3]);
  deepStrictEqual(encodedIds, [4, 5]);
  deepStrictEqual(result.edges.map(edge => edge.node.id), [4, 5]);
});

test('응답 정렬 기준이 내림차순이어도 순방향과 역방향 모두 그 순서를 유지한다', () => {
  // 최종 응답이 내림차순이면 last의 DB 조회 순서는 오름차순이 됩니다.
  const forward = paginator.buildConnection([9, 8, 7].map(id => ({ id })), { first: 2 }, extract);
  const backward = paginator.buildConnection([3, 4, 5].map(id => ({ id })), { last: 2 }, extract);
  deepStrictEqual(forward.edges.map(edge => edge.node.id), [9, 8]);
  deepStrictEqual(backward.edges.map(edge => edge.node.id), [4, 3]);
});

const invalidArgs: CursorPaginationArgs[] = [
  {}, { first: 2, last: 2 }, { first: 2, before: cursor(3) }, { last: 2, after: cursor(1) },
];
for (const name of ['first', 'last'] as const) {
  for (const value of [0, -1, 1.5, NaN, Infinity, -Infinity]) {
    invalidArgs.push({ [name]: value });
  }
}

test('잘못된 요청은 모든 공개 진입점과 직접 호출한 기본 빌더에서 거부한다', () => {
  const builder = new DefaultConnectionBuilder<Node, Node>();
  let queryCalls = 0;
  for (const args of invalidArgs) {
    throws(() => paginator.validate(args));
    throws(() => paginator.buildConnection(nodes, args, extract));
    throws(() => paginator.buildConnection([], args, extract));
    throws(() => builder.build(nodes, args, extract, paginator));
    throws(() => paginator.buildQuery(args, { build() { queryCalls++; return {}; } }));
  }
  strictEqual(queryCalls, 0);
});

test('잘못된 요청은 목 DB를 호출하기 전에 거부한다', () => {
  let queryCalls = 0;
  const db = { findMany() { queryCalls++; return []; } };
  for (const args of invalidArgs) {
    throws(() => listMockPosts(args, db));
  }
  strictEqual(queryCalls, 0);
});

test('사용자 정의 빌더를 주입해도 CursorPaginator의 검증을 건너뛸 수 없다', () => {
  let builderCalls = 0;
  const builder: ConnectionBuilder<Node, Node> = {
    build() {
      builderCalls++;
      return { edges: [], pageInfo: {
        startCursor: null, endCursor: null, hasNextPage: false, hasPreviousPage: false,
      } };
    },
  };
  const customPaginator = new CursorPaginator<Node, Node>(undefined, builder);
  throws(() => customPaginator.buildConnection(nodes, { first: -1 }, extract));
  strictEqual(builderCalls, 0);
});
