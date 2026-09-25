export type Estado = "activo" | "pausado" | "vencido";


// Módulo en vivo: deben coincidir con los CHECK de db/schema.sql.
export type LiveQuestionType = "quiz" | "vf" | "encuesta" | "nube";

export type LiveMatchStatus = "lobby" | "question" | "reveal" | "leaderboard" | "finished";
