import { z } from "zod";
import type { PaginatedResponse } from "@/types";

export const paginationSchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
): PaginatedResponse<T> {
  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export function paginationOffset(page: number, pageSize: number) {
  return { limit: pageSize, offset: (page - 1) * pageSize };
}
