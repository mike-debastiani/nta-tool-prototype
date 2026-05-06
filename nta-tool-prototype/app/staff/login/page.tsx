import { LoginCard } from "@/components/domain/login-card";

export default function StaffLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <LoginCard title="Staff Login (R2-R6)" allowedRoles={["R2", "R3", "R5", "R6"]} />
    </main>
  );
}
