<script lang="ts">
  import { InputOTP, InputOTPGroup, InputOTPSlot } from "@lib/components/ui/input-otp";
  import { Button } from "@lib/components/ui/button";

  interface Props {
    /** Path to send the visitor to after a correct password. Always same-origin. */
    redirectTo: string;
    labels: {
      submit: string;
      submitting: string;
      errorIncorrect: string;
      errorNetwork: string;
    };
  }

  const { redirectTo, labels }: Props = $props();

  const PASSWORD_LENGTH = 6;

  let value = $state("");
  let submitting = $state(false);
  let error = $state<string | null>(null);

  // Only ever redirect to a same-origin path, never to an attacker-controlled
  // absolute/protocol-relative URL derived from the `redirect` query param.
  function safeRedirectTarget(target: string): string {
    if (target.startsWith("/") && !target.startsWith("//")) return target;
    return "/workshops";
  }

  async function submitPassword() {
    if (submitting || value.length !== PASSWORD_LENGTH) return;

    submitting = true;
    error = null;

    try {
      const res = await fetch("/api/workshop-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: value }),
      });

      const json = await res.json().catch(() => ({ ok: false }));

      if (!res.ok || !json.ok) {
        error = labels.errorIncorrect;
        value = "";
        submitting = false;
        return;
      }

      // UX-only mirror: lets any future client-only workshop UI do a cheap
      // synchronous check without a server round-trip. The signed cookie set
      // by the server above is the real gate — this has no security role.
      try {
        localStorage.setItem("workshopGateUnlocked", "1");
      } catch {
        // localStorage can throw in private-browsing/blocked-storage contexts; harmless to skip.
      }

      window.location.href = safeRedirectTarget(redirectTo);
    } catch {
      error = labels.errorNetwork;
      submitting = false;
    }
  }

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    void submitPassword();
  }

  function handleComplete() {
    void submitPassword();
  }
</script>

<form onsubmit={handleSubmit} class="flex flex-col items-center gap-4">
  <InputOTP
    maxlength={PASSWORD_LENGTH}
    bind:value
    onComplete={handleComplete}
    disabled={submitting}
  >
    {#snippet children({ cells })}
      <InputOTPGroup>
        {#each cells as cell, i (i)}
          <InputOTPSlot {cell} />
        {/each}
      </InputOTPGroup>
    {/snippet}
  </InputOTP>

  {#if error}
    <p class="text-sm text-destructive" role="alert">{error}</p>
  {/if}

  <Button type="submit" disabled={submitting || value.length !== PASSWORD_LENGTH} class="w-full">
    {submitting ? labels.submitting : labels.submit}
  </Button>
</form>
