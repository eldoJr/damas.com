import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout }      from "@/components/ui/Layout";
import { Home }        from "@/pages/Home";
import { Play }        from "@/pages/Play";
import { Game }        from "@/pages/Game";
import { BotGame }     from "@/pages/BotGame";
import { Leaderboard } from "@/pages/Leaderboard";
import { Profile }     from "@/pages/Profile";
import { Tournaments } from "@/pages/Tournaments";
import { Login }       from "@/pages/Login";
import { Register }    from "@/pages/Register";
import { NotFound }    from "@/pages/NotFound";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/"             element={<Home />}        />
          <Route path="/play"         element={<Play />}        />
          <Route path="/game/:roomId" element={<Game />}        />
          <Route path="/bot/:level"   element={<BotGame />}     />
          <Route path="/leaderboard"  element={<Leaderboard />} />
          <Route path="/profile"      element={<Profile />}     />
          <Route path="/tournaments"  element={<Tournaments />} />
          <Route path="/login"        element={<Login />}       />
          <Route path="/register"     element={<Register />}    />
          <Route path="*"             element={<NotFound />}    />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
