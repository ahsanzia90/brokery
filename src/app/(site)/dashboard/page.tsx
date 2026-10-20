import { redirect } from "next/navigation";
import { requireUserPage } from "@/lib/authz/guards";

export default async function DashboardIndex() {
  const user = await requireUserPage("/dashboard");
  redirect(user.isSeller ? "/dashboard/seller" : "/dashboard/buyer");
}
