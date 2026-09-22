import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getGame, getGameDraft } from "@/lib/live-games";
import { listCompanies } from "@/lib/queries";
import GameEditor from "@/components/admin/live/GameEditor";

export const dynamic = "force-dynamic";

export default async function JuegoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = (await currentUser())!;

  const game = await getGame(Number(id), user);
  if (!game) notFound();

  const [questions, companies] = await Promise.all([
    getGameDraft(game.id),
    user.role === "super" ? listCompanies() : Promise.resolve([]),
  ]);

  const readOnlyReason = !game.canEdit
    ? game.company_id === null
      ? "Es un juego global: solo el superadmin lo edita. Duplícalo para tener tu propia versión."
      : "No puedes editar este juego."
    : game.locked
      ? `Ya se jugó ${game.matches === 1 ? "1 partida" : `${game.matches} partidas`} con este juego. Para no alterar sus reportes, las preguntas quedan fijas: duplícalo para hacer cambios.`
      : null;

  return (
    <GameEditor
      gameId={game.id}
      archived={game.archived_at !== null}
      readOnlyReason={readOnlyReason}
      companies={companies.map((c) => ({ id: c.id, name: c.name }))}
      canChooseCompany={user.role === "super"}
      initial={{
        title: game.title,
        description: game.description,
        companyId: game.company_id,
        questions,
      }}
    />
  );
}
