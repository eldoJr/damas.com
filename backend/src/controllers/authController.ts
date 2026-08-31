import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { supabase } from "../config/supabase";
import { signToken } from "../config/jwt";

const registerSchema = z.object({
  username: z.string().min(3).max(20).regex(/^\w+$/, "Apenas letras, números e _"),
  email:    z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = registerSchema.parse(req.body);

    // Check uniqueness
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .or(`email.eq.${body.email},username.eq.${body.username}`)
      .maybeSingle();

    if (existing) {
      res.status(409).json({ error: "E-mail ou nome de usuário já em uso" });
      return;
    }

    const passwordHash = await bcrypt.hash(body.password, 12);

    const { data: user, error } = await supabase
      .from("users")
      .insert({ username: body.username, email: body.email, password_hash: passwordHash })
      .select("id, username, email, elo, created_at")
      .single();

    if (error) throw error;

    const token = signToken({ sub: user.id, username: user.username });
    res.status(201).json({ token, user });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.issues[0].message });
      return;
    }
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = loginSchema.parse(req.body);

    const { data: user } = await supabase
      .from("users")
      .select("id, username, email, password_hash, elo")
      .eq("email", body.email)
      .maybeSingle();

    if (!user) {
      res.status(401).json({ error: "Credenciais inválidas" });
      return;
    }

    const valid = await bcrypt.compare(body.password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Credenciais inválidas" });
      return;
    }

    const token = signToken({ sub: user.id, username: user.username });
    const { password_hash: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.issues[0].message });
      return;
    }
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as import("../middleware/auth").AuthRequest).user!.sub;

    const { data: user, error } = await supabase
      .from("users")
      .select("id, username, email, elo, wins, losses, draws, created_at")
      .eq("id", userId)
      .single();

    if (error || !user) { res.status(404).json({ error: "Usuário não encontrado" }); return; }
    res.json({ user });
  } catch (err) {
    next(err);
  }
}
