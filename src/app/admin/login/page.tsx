import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import AdminLoginScreen from "@/components/AdminLoginScreen";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await currentUser()) redirect("/admin");
  return <AdminLoginScreen />;
}
