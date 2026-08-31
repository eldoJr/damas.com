import "dotenv/config";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function main() {
  const email    = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error("Uso: npx ts-node scripts/reset-password.ts <email> <nova-senha>");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("Senha deve ter pelo menos 8 caracteres.");
    process.exit(1);
  }

  const { data: user, error: findErr } = await supabase
    .from("users")
    .select("id, username")
    .eq("email", email.trim())
    .maybeSingle();

  if (findErr) { console.error("Erro ao buscar usuário:", findErr.message); process.exit(1); }
  if (!user)   { console.error(`Usuário não encontrado: ${email}`);          process.exit(1); }

  const hash = await bcrypt.hash(password, 12);

  const { error: updateErr } = await supabase
    .from("users")
    .update({ password_hash: hash })
    .eq("id", user.id);

  if (updateErr) { console.error("Erro ao atualizar senha:", updateErr.message); process.exit(1); }

  console.log(`Senha atualizada para ${user.username} (${email})`);
}

main();
