<script lang="ts">
  import { cart, getActiveOrder } from './cart';
  import { onMount } from 'svelte';

  interface OrderLine {
    id: string;
    quantity: number;
    productVariant: {
      id: string;
      sku: string;
      name: string;
    };
    unitPriceWithTax: number;
    linePriceWithTax: number;
  }

  interface Order {
    id: string;
    code: string;
    totalWithTax: number;
    lines: OrderLine[];
  }

  let order = $state<Order | null>(null);

  onMount(() => {
    getActiveOrder();
    return cart.subscribe((value) => {
      order = value;
    });
  });

  function formatPrice(cents: number): string {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  }
</script>

<div class="order-summary">
  {#if order && order.lines.length > 0}
    <ul class="divide-y">
      {#each order.lines as line (line.id)}
        <li class="py-3 flex justify-between gap-4">
          <div class="flex-1 min-w-0">
            <p class="font-medium truncate">{line.productVariant.name}</p>
            <p class="text-sm text-gray-500">Qty: {line.quantity}</p>
          </div>
          <p class="font-medium whitespace-nowrap">{formatPrice(line.linePriceWithTax)}</p>
        </li>
      {/each}
    </ul>
    <div class="pt-3 mt-3 border-t flex justify-between font-bold">
      <span>Total</span>
      <span>{formatPrice(order.totalWithTax)}</span>
    </div>
  {:else}
    <p class="text-gray-500">Your cart is empty</p>
  {/if}
</div>
