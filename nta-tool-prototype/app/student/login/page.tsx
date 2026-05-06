import { LoginCard } from "@/components/domain/login-card";

export default function StudentLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <LoginCard title="Student Login (R1)" allowedRoles={["R1"]} />
    </main>
  );
}
