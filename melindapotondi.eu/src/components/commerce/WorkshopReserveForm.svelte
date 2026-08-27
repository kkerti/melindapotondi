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
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
    email: z.string().email(),
  });

  const LABELS = {
    hu: {
      firstNameLabel: "Keresztnév",
      firstNamePlaceholder: "Anna",
      lastNameLabel: "Vezetéknév",
      lastNamePlaceholder: "Kovács",
      nameInvalid: "Add meg a neved.",
      emailLabel: "E-mail cím",
      emailPlaceholder: "te@example.com",
      emailInvalid: "Adj meg egy érvényes e-mail címet.",
      submit: "Tovább a fizetéshez",
      submitting: "Feldolgozás...",
      redirecting: "Átirányítás a Barionhoz...",
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
      firstNameLabel: "First name",
      firstNamePlaceholder: "Anna",
      lastNameLabel: "Last name",
      lastNamePlaceholder: "Smith",
      nameInvalid: "Please enter your name.",
      emailLabel: "Email address",
      emailPlaceholder: "you@example.com",
      emailInvalid: "Please enter a valid email address.",
      submit: "Continue to payment",
      submitting: "Processing...",
      redirecting: "Redirecting to Barion...",
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

  let firstName = $state("");
  let lastName = $state("");
  let email = $state("");
  let nameError = $state<string | null>(null);
  let emailError = $state<string | null>(null);
  let formError = $state<string | null>(null);
  let submitting = $state(false);
  // Set right before redirectToBarion and never reset — window.location.href navigation
  // doesn't stop script execution, so without this the button would briefly re-enable
  // (and revert to its normal label) while the browser is still loading the Barion page.
  let redirecting = $state(false);
  let policyOpen = $state(false);

  // Tracks whether addWorkshopTicketToOrder already succeeded, so a retry after a later
  // step fails (customer/payment) doesn't call addItemToOrder a second time — Vendure
  // increments an existing line's quantity rather than being a no-op, which would double
  // the ticket count (and price) on the order.
  let orderAdded = $state(false);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (submitting || redirecting) return;

    nameError = null;
    emailError = null;
    formError = null;

    const result = schema.safeParse({ firstName, lastName, email });
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      if (fieldErrors.firstName || fieldErrors.lastName) {
        nameError = t.nameInvalid;
      }
      if (fieldErrors.email) {
        emailError = t.emailInvalid;
      }
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

      const customerResult = await setWorkshopOrderCustomer(
        result.data.email,
        result.data.firstName,
        result.data.lastName,
      );
      if (!customerResult.success) {
        formError = customerResult.message || t.genericError;
        return;
      }

      const paymentResult = await initiateWorkshopTicketPayment();
      if (paymentResult.success && paymentResult.gatewayUrl) {
        redirecting = true;
        redirectToBarion(paymentResult.gatewayUrl);
        return;
      }
      formError = paymentResult.errorMessage || t.paymentError;
    } catch (err) {
      console.error("Workshop reserve flow failed", err);
      formError = t.genericError;
    } finally {
      if (!redirecting) {
        submitting = false;
      }
    }
  }
</script>

<form onsubmit={handleSubmit} class="space-y-4">
  {#if formError}
    <div class="text-sm text-destructive" role="alert">{formError}</div>
  {/if}

  <div class="grid grid-cols-2 gap-3">
    <div class="space-y-1.5">
      <Label for="workshop-reserve-first-name">{t.firstNameLabel}</Label>
      <Input
        id="workshop-reserve-first-name"
        type="text"
        placeholder={t.firstNamePlaceholder}
        bind:value={firstName}
        disabled={submitting || redirecting}
        aria-invalid={nameError ? "true" : undefined}
      />
    </div>
    <div class="space-y-1.5">
      <Label for="workshop-reserve-last-name">{t.lastNameLabel}</Label>
      <Input
        id="workshop-reserve-last-name"
        type="text"
        placeholder={t.lastNamePlaceholder}
        bind:value={lastName}
        disabled={submitting || redirecting}
        aria-invalid={nameError ? "true" : undefined}
      />
    </div>
  </div>
  {#if nameError}
    <p class="text-sm text-destructive">{nameError}</p>
  {/if}

  <div class="space-y-1.5">
    <Label for="workshop-reserve-email">{t.emailLabel}</Label>
    <Input
      id="workshop-reserve-email"
      type="email"
      placeholder={t.emailPlaceholder}
      bind:value={email}
      disabled={submitting || redirecting}
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

  <Button type="submit" class="w-full" disabled={submitting || redirecting}>
    {redirecting ? t.redirecting : submitting ? t.submitting : t.submit}
  </Button>
</form>
