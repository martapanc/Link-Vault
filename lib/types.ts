export interface LinkResult {
  originalUrl: string;
  archiveUrl: string | null;
  archiveError: string | null;
  shortUrl: string | null;
  shortError: string | null;
  status: "success" | "partial" | "error";
}