import { Request, Response, NextFunction } from "express";
import { supabase } from "../config/supabase";

export async function getLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const limit = 50;
    const page  = Math.max(1, Number(req.query.page ?? 1));

    const { data, error, count } = await supabase
      .from("users")
      .select("id, username, elo, wins, losses, draws", { count: "exact" })
      .order("elo", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;

    const ranked = (data ?? []).map((u, i) => ({
      ...u,
      rank:    (page - 1) * limit + i + 1,
      winRate: u.wins + u.losses + u.draws > 0
        ? Math.round((u.wins / (u.wins + u.losses + u.draws)) * 1000) / 10
        : 0,
    }));

    res.json({ players: ranked, total: count, page, limit });
  } catch (err) {
    next(err);
  }
}
