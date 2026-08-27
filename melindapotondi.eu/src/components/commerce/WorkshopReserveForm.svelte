<script lang="ts">
  import { z } from "zod";
  import { Input } from "@lib/components/ui/input";
  import { Label } from "@lib/components/ui/label";
  import { Button } from "@lib/components/ui/button";
  import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
  } from "@lib/components/ui/dialog";
  import { addWorkshopTicketToOrder, setWorkshopOrderCustomer, initiateWorkshopTicketPayment } from "./workshopOrder";
  import { redirectToBarion } from "./payment";

  interface Props {
    productVariantId: string;
    locale: "hu" | "en";
  }

  const { productVariantId, locale }: Props = $props();

  const schema = z.object({
    email: z.string().email(),
  });

  const LABELS = {
    hu: {
      emailLabel: "E-mail cím",
      emailPlaceholder: "te@example.com",
      emailInvalid: "Adj meg egy érvényes e-mail címet.",
      submit: "Tovább a fizetéshez",
      submitting: "Feldolgozás...",
      policyButton: "Feltételek",
      policyTitle: "Foglalási feltételek",
      policyBody: [
        "A „Foglalás” gombra kattintva helyet foglalsz a kiválasztott workshopon.",
        "A fizetés a helyed biztosításához most, teljes összegben, online történik a Barion fizetési rendszerén keresztül.",
        "Az online kifizetett összeg biztosítja a helyedet a workshopon.",
        "Bármilyen esetlegesen felmerülő további egyeztetés (pl. anyaghasználat, extra igények) a helyszínen, személyesen történik.",
      ],
      soldOutDuringSubmit: "Sajnáljuk, ez az időpont épp betelt. Válassz egy másik dátumot.",
      genericError: "Hiba történt. Kérjük, próbáld újra.",
      paymentError: "Nem sikerült elindítani a fizetést. Kérjük, próbáld újra.",
    },
    en: {
      emailLabel: "Email address",
      emailPlaceholder: "you@example.com",
      emailInvalid: "Please enter a valid email address.",
      submit: "Continue to payment",
      submitting: "Processing...",
      policyButton: "Policy",
      policyTitle: "Booking policy",
      policyBody: [
        "Clicking “Reserve” books your spot at the selected workshop.",
        "Payment to secure your spot happens now, in full, online via the Barion payment gateway.",
        "The amount paid online secures your seat at the workshop.",
        "Any further arrangements that may come up (e.g. materials, special requests) are handled in person at the workshop.",
      ],
      soldOutDuringSubmit: "Sorry, this workshop just sold out. Please pick another date.",
      genericError: "Something went wrong. Please try again.",
      paymentError: "Could not start payment. Please try again.",
    },
  } as const;

  const t = LABELS[locale];

  let email = $state("");
  let emailError = $state<string | null>(null);
  let formError = $state<string | null>(null);
  let submitting = $state(false);
  let policyOpen = $state(false);

  // Tracks whether addWorkshopTicketToOrder already succeeded, so a retry after a later
  // step fails (customer/payment) doesn't call addItemToOrder a second time — Vendure
  // increments an existing line's quantity rather than being a no-op, which would double
  // the ticket count (and price) on the order.
  let orderAdded = $state(false);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (submitting) return;

    emailError = null;
    formError = null;

    const result = schema.safeParse({ email });
    if (!result.success) {
      emailError = t.emailInvalid;
      return;
    }

    submitting = true;
    try {
      if (!orderAdded) {
        const addResult = await addWorkshopTicketToOrder(productVariantId);
        if (!addResult.success) {
          formError =
            addResult.errorCode === "INSUFFICIENT_STOCK_ERROR"
              ? t.soldOutDuringSubmit
              : addResult.message || t.genericError;
          return;
        }
        orderAdded = true;
      }

      const customerResult = await setWorkshopOrderCustomer(result.data.email);
      if (!customerResult.success) {
        formError = customerResult.message || t.genericError;
        return;
      }

      const paymentResult = await initiateWorkshopTicketPayment();
      if (paymentResult.success && paymentResult.gatewayUrl) {
        redirectToBarion(paymentResult.gatewayUrl);
        return;
      }
      formError = paymentResult.errorMessage || t.paymentError;
    } catch (err) {
      console.error("Workshop reserve flow failed", err);
      formError = t.genericError;
    } finally {
      submitting = false;
    }
  }
</script>

<form onsubmit={handleSubmit} class="space-y-4">
  {#if formError}
    <div class="text-sm text-destructive" role="alert">{formError}</div>
  {/if}

  <div class="space-y-1.5">
    <Label for="workshop-reserve-email">{t.emailLabel}</Label>
    <Input
      id="workshop-reserve-email"
      type="email"
      placeholder={t.emailPlaceholder}
      bind:value={email}
      disabled={submitting}
      aria-invalid={emailError ? "true" : undefined}
    />
    {#if emailError}
      <p class="text-sm text-destructive">{emailError}</p>
    {/if}
  </div>

  <Dialog bind:open={policyOpen}>
    <DialogTrigger>
      {#snippet child({ props })}
        <Button type="button" variant="link" class="h-auto px-0" {...props}>{t.policyButton}</Button>
      {/snippet}
    </DialogTrigger>
    <DialogContent class="max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{t.policyTitle}</DialogTitle>
      </DialogHeader>
      <div class="space-y-3 text-sm text-muted-foreground">
        {#each t.policyBody as paragraph}
          <p>{paragraph}</p>
        {/each}
      </div>
    </DialogContent>
  </Dialog>

  <Button type="submit" class="w-full" disabled={submitting}>
    {submitting ? t.submitting : t.submit}
  </Button>
</form>
