/**
 * GitHub App installation + user-authorization callback.
 *
 * The signed PalladiumAI state identifies the authenticated PalladiumAI user.
 * GitHub's temporary user access token is then used only to prove that the
 * installation belongs to the consenting GitHub user. That user token is never
 * stored; only the verified installation id and account label are persisted.
 */
import { createFileRoute } from "@tanstack/react-router";

function done(origin: string, params: Record<string, string>) {
  const url = new URL(`${origin}/integrations`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return new Response(null, { status: 302, headers: { Location: url.toString() } });
}

function redirect(location: string) {
  return new Response(null, { status: 302, headers: { Location: location } });
}

export const Route = createFileRoute("/api/public/integrations/github-callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const state = url.searchParams.get("state") ?? "";
        const code = url.searchParams.get("code") ?? "";
        const suggestedInstallationId = url.searchParams.get("installation_id");
        const providerError = url.searchParams.get("error");

        const { verifyState } = await import("@/lib/integrations/oauth.server");
        const verified = verifyState(state);
        if (!verified || verified.provider !== "github") {
          return new Response("Invalid or expired GitHub authorization state.", { status: 400 });
        }

        const origin = verified.origin || url.origin;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const fail = async (message: string) => {
          await supabaseAdmin
            .from("integrations")
            .update({ status: "error", last_error: message.slice(0, 300) })
            .eq("user_id", verified.userId)
            .eq("provider", "github");
          return done(origin, { integration_error: message.slice(0, 200), provider: "github" });
        };

        if (providerError) return fail("GitHub authorization was declined.");

        try {
          const {
            githubConnectionConfigured,
            normaliseInstallationId,
            exchangeGitHubUserCode,
            resolveVerifiedUserInstallation,
            verifyGitHubInstallation,
          } = await import("@/lib/integrations/github-app.server");
          if (!githubConnectionConfigured()) {
            return fail("GitHub App connection is not configured on this deployment.");
          }

          // If GitHub returns from installation setup before user authorization,
          // persist only the unverified installation id on the pending row and
          // continue into OAuth using GitHub's registered callback URL. The id is
          // never trusted here; it is verified against both the consenting GitHub
          // user and this GitHub App before the connection becomes active.
          if (!code) {
            if (!suggestedInstallationId) {
              return fail("GitHub App installation id is missing.");
            }

            const installationId = normaliseInstallationId(suggestedInstallationId);
            const clientId = process.env["GITHUB_APP_CLIENT_ID"]?.trim();
            if (!clientId) {
              return fail("GitHub App client id is not configured on this deployment.");
            }

            const { error } = await supabaseAdmin
              .from("integrations")
              .update({
                status: "pending",
                config: { pending_installation_id: String(installationId) },
                last_error: null,
              })
              .eq("user_id", verified.userId)
              .eq("provider", "github");
            if (error) throw new Error(error.message);

            const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
            authorizeUrl.searchParams.set("client_id", clientId);
            authorizeUrl.searchParams.set("state", state);
            return redirect(authorizeUrl.toString());
          }

          let installationIdCandidate = suggestedInstallationId;
          if (!installationIdCandidate) {
            const { data, error } = await supabaseAdmin
              .from("integrations")
              .select("config")
              .eq("user_id", verified.userId)
              .eq("provider", "github")
              .maybeSingle();
            if (error) throw new Error(error.message);

            const config = data?.config;
            if (config && typeof config === "object" && !Array.isArray(config)) {
              const pending = (config as Record<string, unknown>)["pending_installation_id"];
              if (typeof pending === "string" || typeof pending === "number") {
                installationIdCandidate = String(pending);
              }
            }
          }

          const redirectUri = `${origin}/api/public/integrations/github-callback`;
          const userAccessToken = await exchangeGitHubUserCode(code, redirectUri);
          const userInstallation = await resolveVerifiedUserInstallation(
            userAccessToken,
            installationIdCandidate,
          );
          const appInstallation = await verifyGitHubInstallation(userInstallation.id);
          if (appInstallation.id !== userInstallation.id) {
            throw new Error("GitHub installation verification did not match the authorized user installation.");
          }

          const accountLabel = appInstallation.accountLogin ?? userInstallation.accountLogin;
          const { error } = await supabaseAdmin.from("integrations").upsert(
            {
              user_id: verified.userId,
              org_id: null,
              provider: "github",
              name: "GitHub",
              integration_type: "github_app",
              status: "connected",
              scopes: ["metadata:read", "contents:read"],
              granted_scopes: ["metadata:read", "contents:read"],
              account_label: accountLabel,
              config: {
                installation_id: String(appInstallation.id),
                repository_selection: appInstallation.repositorySelection,
              },
              last_error: null,
              connected_at: new Date().toISOString(),
              expires_at: null,
            },
            { onConflict: "user_id,provider" },
          );
          if (error) throw new Error(error.message);

          // GitHub App installation tokens are minted on demand; stale generic
          // OAuth credentials for this provider must never be reused.
          await supabaseAdmin
            .from("integration_credentials")
            .delete()
            .eq("user_id", verified.userId)
            .eq("provider", "github");

          return done(origin, { integration_connected: "github" });
        } catch (error) {
          return fail(error instanceof Error ? error.message : "Could not complete the GitHub connection.");
        }
      },
    },
  },
});
