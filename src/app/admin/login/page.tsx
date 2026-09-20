import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import AdminLoginScreen from "@/components/AdminLoginScreen";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  if (await currentUser()) redirect("/admin");
  return <AdminLoginScreen />;
}
