export const DEFAULT_PAGE_SIZE = 20

/** Normalize V1 list API response `{ items, total, page, pageSize }`. */
export function parseListResponse(data) {
  if (Array.isArray(data)) {
    return {
      items: data,
      total: data.length,
      page: 1,
      pageSize: data.length || DEFAULT_PAGE_SIZE
    }
  }
  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    pageSize: data?.pageSize ?? DEFAULT_PAGE_SIZE
  }
}
