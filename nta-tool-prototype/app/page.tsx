import { createClient } from "@/utils/supabase/server";

export default async function Home() {
  const renderTime = new Date().toISOString();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    return (
      <main>
        <p>
          <strong>Supabase-Fehler:</strong> {error.message}
        </p>
        <p>Render-Zeit: {renderTime}</p>
      </main>
    );
  }

  return (
    <main>
      <p>Supabase-Verbindung steht</p>
      <p>Render-Zeit: {renderTime}</p>
      {data.session == null && (
        <p>Aktuell keine aktive Session — wie erwartet</p>
      )}
    </main>
  );
}
