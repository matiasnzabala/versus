const OWNER = "matiasnzabala";
const REPO = "versus";
const WORKFLOW_FILE = "scrape.yml";

export async function POST() {
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  if (!token) {
    return Response.json(
      { ok: false, error: "Falta configurar GITHUB_DISPATCH_TOKEN en el servidor." },
      { status: 500 }
    );
  }

  const res = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: "main" }),
    }
  );

  if (!res.ok) {
    const detail = await res.text();
    return Response.json({ ok: false, error: `GitHub respondió ${res.status}: ${detail}` }, { status: 502 });
  }

  return Response.json({ ok: true });
}
