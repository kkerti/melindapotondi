<script lang="ts">
  import { CalendarDate, type DateValue, today } from "@internationalized/date";
  // Wildcard import (matching calendar.svelte's own convention): the module exports the
  // Root component aliased as `Calendar` alongside its subcomponents (`Day`, `Cell`, ...),
  // so `Calendar.Calendar` is the Root and `Calendar.Day` is the individual day cell.
  import * as Calendar from "@lib/components/ui/calendar";
  import { Button } from "@lib/components/ui/button";
  import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@lib/components/ui/card";
  import type { WorkshopEventDto } from "./workshops";

  interface Props {
    events: WorkshopEventDto[];
    locale: "hu" | "en";
  }

  const { events, locale }: Props = $props();

  const BUDAPEST_TZ = "Europe/Budapest";

  const LABELS = {
    hu: {
      calendarLabel: "Workshop naptár",
      noEvents: "Jelenleg nincs meghirdetett workshop a következő hónapokban. Nézz vissza később!",
      selectPrompt: "Válassz ki egy kiemelt dátumot a naptárban a workshopok megtekintéséhez.",
      noEventsOnDay: "Ezen a napon nincs workshop.",
      inStock: "Van szabad hely",
      lowStock: "Már csak pár hely",
      soldOut: "Betelt",
      reserve: "Foglalás",
      location: "Helyszín",
    },
    en: {
      calendarLabel: "Workshop calendar",
      noEvents: "There are no upcoming workshops scheduled right now. Please check back later.",
      selectPrompt: "Select a highlighted date on the calendar to see its workshops.",
      noEventsOnDay: "No workshops on this day.",
      inStock: "Available",
      lowStock: "Only a few seats left",
      soldOut: "Sold out",
      reserve: "Reserve",
      location: "Location",
    },
  } as const;

  const t = LABELS[locale];
  const calendarLocale = locale === "hu" ? "hu-HU" : "en-GB";
  const dateFormatterLocale = locale === "hu" ? "hu-HU" : "en-GB";

  // Reserve links point at the reservation page, keyed by the ProductVariant id.
  function reserveHref(variantId: string): string {
    return locale === "en" ? `/en/workshops/reserve/${variantId}` : `/workshops/reserve/${variantId}`;
  }

  /** Budapest-local calendar day ("YYYY-MM-DD") that a UTC ISO instant falls on. */
  function toBudapestDateKey(isoString: string): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: BUDAPEST_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(isoString));
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "01";
    return `${get("year")}-${get("month")}-${get("day")}`;
  }

  function dateKeyToCalendarDate(key: string): CalendarDate {
    const [year, month, day] = key.split("-").map(Number);
    return new CalendarDate(year, month, day);
  }

  function stockLabel(event: WorkshopEventDto): string {
    if (event.stockLevel === "OUT_OF_STOCK") return t.soldOut;
    if (event.stockLevel === "LOW_STOCK") return t.lowStock;
    return t.inStock;
  }

  const eventsByDay = $derived.by(() => {
    const map = new Map<string, WorkshopEventDto[]>();
    for (const event of events) {
      if (!event.startsAt) continue;
      const key = toBudapestDateKey(event.startsAt);
      const existing = map.get(key);
      if (existing) {
        existing.push(event);
      } else {
        map.set(key, [event]);
      }
    }
    // Keep each day's events ordered by start time.
    for (const dayEvents of map.values()) {
      dayEvents.sort((a, b) => a.startsAt!.localeCompare(b.startsAt!));
    }
    return map;
  });

  const eventDayKeys = $derived(new Set(eventsByDay.keys()));

  const earliestEventDateKey = $derived.by(() => {
    const keys = [...eventDayKeys].sort();
    return keys[0];
  });

  // Initialized synchronously (not via $effect, which never runs during SSR) so the
  // earliest event day is already selected in the server-rendered HTML, not just after
  // client-side hydration.
  let selected = $state<DateValue | undefined>(
    earliestEventDateKey ? dateKeyToCalendarDate(earliestEventDateKey) : undefined,
  );
  let placeholder = $state<DateValue>(
    earliestEventDateKey ? dateKeyToCalendarDate(earliestEventDateKey) : today(BUDAPEST_TZ),
  );

  function hasEvents(day: DateValue): boolean {
    return eventDayKeys.has(day.toString());
  }

  const selectedDayEvents = $derived.by(() => {
    if (!selected) return [];
    return eventsByDay.get(selected.toString()) ?? [];
  });

  function formatTimeRange(startsAt: string, endsAt: string): string {
    const fmt = new Intl.DateTimeFormat(dateFormatterLocale, {
      timeZone: BUDAPEST_TZ,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return `${fmt.format(new Date(startsAt))}–${fmt.format(new Date(endsAt))}`;
  }

  function formatPrice(cents: number): string {
    if (locale === "hu") {
      return new Intl.NumberFormat("hu-HU", {
        style: "currency",
        currency: "HUF",
        maximumFractionDigits: 0,
      }).format(cents / 100);
    }
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "HUF",
      maximumFractionDigits: 0,
    }).format(cents / 100);
  }
</script>

{#if events.length === 0}
  <p class="text-muted-foreground text-center py-12">{t.noEvents}</p>
{:else}
  <div class="grid gap-8 md:grid-cols-[auto_1fr] md:items-start">
    <Calendar.Calendar
      type="single"
      bind:value={selected}
      bind:placeholder
      locale={calendarLocale}
      calendarLabel={t.calendarLabel}
      class="mx-auto border rounded-lg"
    >
      {#snippet day({ day, outsideMonth })}
        <div class="relative">
          <Calendar.Day />
          {#if hasEvents(day) && !outsideMonth}
            <span
              class="pointer-events-none absolute bottom-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-primary"
              aria-hidden="true"
            ></span>
          {/if}
        </div>
      {/snippet}
    </Calendar.Calendar>

    <div class="space-y-4">
      {#if !selected}
        <p class="text-muted-foreground">{t.selectPrompt}</p>
      {:else}
        <h2 class="text-lg font-medium">
          {new Intl.DateTimeFormat(dateFormatterLocale, {
            timeZone: BUDAPEST_TZ,
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          }).format(selected.toDate(BUDAPEST_TZ))}
        </h2>

        {#if selectedDayEvents.length === 0}
          <p class="text-muted-foreground">{t.noEventsOnDay}</p>
        {:else}
          <div class="space-y-4">
            {#each selectedDayEvents as event (event.id)}
              <Card>
                <CardHeader>
                  <CardTitle>{event.productName}</CardTitle>
                  <CardDescription>
                    {event.startsAt && event.endsAt
                      ? formatTimeRange(event.startsAt, event.endsAt)
                      : event.variantName}
                    {event.location ? ` &middot; ${t.location}: ${event.location}` : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent class="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span class="font-medium">{formatPrice(event.priceWithTax)}</span>
                  <span class={event.stockLevel === "OUT_OF_STOCK" ? "text-destructive" : "text-muted-foreground"}>
                    {stockLabel(event)}
                  </span>
                </CardContent>
                <CardFooter>
                  <Button href={reserveHref(event.id)} disabled={event.stockLevel === "OUT_OF_STOCK"} class="w-full">
                    {event.stockLevel === "OUT_OF_STOCK" ? t.soldOut : t.reserve}
                  </Button>
                </CardFooter>
              </Card>
            {/each}
          </div>
        {/if}
      {/if}
    </div>
  </div>
{/if}