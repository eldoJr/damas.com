import { Request, Response, NextFunction } from "express";
import { supabase } from "../config/supabase";
import { AuthRequest } from "../middleware/auth";

function generateRoomId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function createRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId     = (req as AuthRequest).user?.sub ?? null;
    const { timeControl } = req.body as { timeControl?: string };
    const roomId     = generateRoomId();

    const { data, error } = await supabase
      .from("rooms")
      .insert({
        id:           roomId,
        host_id:      userId,
        time_control: timeControl ?? "5+0",
        status:       "waiting",
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ room: data });
  } catch (err) {
    next(err);
  }
}

export async function getRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("rooms")
      .select("*, games(*)")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) { res.status(404).json({ error: "Sala não encontrada" }); return; }
    res.json({ room: data });
  } catch (err) {
    next(err);
  }
}

export async function getMatchHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthRequest).user!.sub;
    const page   = Math.max(1, Number(req.query.page ?? 1));
    const limit  = 20;

    // Step 1: fetch games rows
    const { data: rows, error: gErr, count } = await supabase
      .from("games")
      .select("id, room_id, white_id, black_id, winner_id, time_control, moves_count, ended_at, draw_reason, bot_level", { count: "exact" })
      .or(`white_id.eq.${userId},black_id.eq.${userId}`)
      .order("ended_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (gErr) { console.error("getMatchHistory games error:", gErr); throw gErr; }

    // Step 2: collect unique user ids and fetch their usernames
    const userIds = [...new Set(
      (rows ?? []).flatMap(g => [g.white_id, g.black_id]).filter(Boolean) as string[]
    )];

    const userMap: Record<string, { username: string; elo: number }> = {};
    if (userIds.length > 0) {
      const { data: users, error: uErr } = await supabase
        .from("users")
        .select("id, username, elo")
        .in("id", userIds);
      if (uErr) console.error("getMatchHistory users error:", uErr);
      for (const u of users ?? []) userMap[u.id] = { username: u.username, elo: u.elo };
    }

    const games = (rows ?? []).map(g => ({
      ...g,
      white: g.white_id ? (userMap[g.white_id] ?? null) : null,
      black: g.black_id ? (userMap[g.black_id] ?? null) : null,
    }));

    res.json({ games, total: count ?? 0, page, limit });
  } catch (err) {
    next(err);
  }
}

export async function saveBotGame(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthRequest).user!.sub;
    const { winner, level, moves, draw_reason } = req.body as {
      winner: "light" | "dark" | null;
      level: string;
      moves: number;
      draw_reason: string | null;
    };

    // human plays light (white), bot plays dark (black)
    const winnerId = winner === "light" ? userId
                   : winner === "dark"  ? null   // bot has no user id
                   : null;
    const isDraw   = winner === null;
    const isWin    = winner === "light";
    const isLoss   = winner === "dark";

    await supabase.from("games").insert({
      white_id:    userId,
      black_id:    null,
      winner_id:   winnerId,
      moves_count: moves,
      draw_reason: draw_reason ?? null,
      bot_level:   level,
      ended_at:    new Date().toISOString(),
    });

    await supabase.rpc("update_player_stats", {
      p_user_id: userId,
      p_win:     isWin,
      p_loss:    isLoss,
      p_draw:    isDraw,
    });

    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
}
