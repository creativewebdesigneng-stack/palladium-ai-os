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

          // GitHub's App installation setup redirect normally contains
          // installation_id + setup_action + state, but no OAuth code. Continue
          // into the GitHub App user-authorization flow and carry the untrusted
          // installation id in the redirect URI. It is verified against both the
          // consenting GitHub user and this GitHub App before it is persisted.
          if (!code) {
            if (!suggestedInstallationId) {
              return fail("GitHub App installation id is missing.");
            }

            const installationId = normaliseInstallationId(suggestedInstallationId);
            const clientId = process.env["GITHUB_APP_CLIENT_ID"]?.trim();
            if (!clientId) {
              return fail("GitHub App client id is not configured on this deployment.");
            }

            const redirectUri = new URL(`${origin}/api/public/integrations/github-callback`);
            redirectUri.searchParams.set("installation_id", String(installationId));

            const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
            authorizeUrl.searchParams.set("client_id", clientId);
            authorizeUrl.searchParams.set("redirect_uri", redirectUri.toString());
            authorizeUrl.searchParams.set("state", state);
            return redirect(authorizeUrl.toString());
          }

          const redirectUri = new URL(`${origin}/api/public/integrations/github-callback`);
          if (suggestedInstallationId) {
            redirectUri.searchParams.set(
              "installation_id",
              String(normaliseInstallationId(suggestedInstallationId)),
            );
          }

          const userAccessToken = await exchangeGitHubUserCode(code, redirectUri.toString());
          const userInstallation = await resolveVerifiedUserInstallation(
            userAccessToken,
            suggestedInstallationId,
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
