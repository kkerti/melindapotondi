<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    endpoint: string;
    labels: {
      title?: string;
      selectShipping?: string;
      free?: string;
      loading?: string;
      noMethods?: string;
      addressRequired?: string;
    };
    onSelect?: (method: ShippingMethod) => void;
  }

  interface ShippingMethod {
    id: string;
    code: string;
    name: string;
    description: string;
    price: number;
    priceWithTax: number;
  }

  let { 
    endpoint, 
    labels = {},
    onSelect 
  }: Props = $props();

  const defaultLabels = {
    title: 'Shipping Method',
    selectShipping: 'Select a shipping method',
    free: 'Free',
    loading: 'Loading shipping methods...',
    noMethods: 'No shipping methods available',
    addressRequired: 'Please enter your shipping address first',
  };

  const mergedLabels = { ...defaultLabels, ...labels };

  let shippingMethods = $state<ShippingMethod[]>([]);
  let selectedMethodId = $state<string | null>(null);
  let loading = $state(false);
  let error = $state<string | null>(null);
  let addressSet = $state(false);

  async function fetchShippingMethods() {
    loading = true;
    error = null;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `
            query GetEligibleShippingMethods {
              eligibleShippingMethods {
                id
                code
                name
                description
                price
                priceWithTax
              }
            }
          `,
        }),
      });

      const json = await res.json();

      if (json.errors) {
        error = json.errors[0]?.message || 'Failed to load shipping methods';
        return;
      }

      shippingMethods = json.data?.eligibleShippingMethods || [];

      // Proactively set the first shipping method
      if (shippingMethods.length > 0 && !selectedMethodId) {
        await selectShippingMethod(shippingMethods[0].id);
      }
    } catch (err) {
      error = 'Network error. Please try again.';
      console.error(err);
    } finally {
      loading = false;
    }
  }

  async function selectShippingMethod(methodId: string) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `
            mutation SetOrderShippingMethod($shippingMethodId: [ID!]!) {
              setOrderShippingMethod(shippingMethodId: $shippingMethodId) {
                ... on Order {
                  id
                  shippingWithTax
                  totalWithTax
                }
                ... on ErrorResult {
                  errorCode
                  message
                }
              }
            }
          `,
          variables: { shippingMethodId: [methodId] },
        }),
      });

      const json = await res.json();

      if (json.errors) {
        error = json.errors[0]?.message || 'Failed to set shipping method';
        return;
      }

      const data = json.data?.setOrderShippingMethod;
      if (data?.__typename?.includes('Error')) {
        error = data.message || data.errorCode;
        return;
      }

      selectedMethodId = methodId;
      const selectedMethod = shippingMethods.find(m => m.id === methodId);
      if (selectedMethod) {
        onSelect?.(selectedMethod);
      }
    } catch (err) {
      error = 'Network error. Please try again.';
      console.error(err);
    }
  }

  function handleSelection(event: Event) {
    const target = event.target as HTMLInputElement;
    selectShippingMethod(target.value);
  }

  function formatPrice(cents: number): string {
    if (cents === 0) return mergedLabels.free;
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  }

  // Check if shipping address is set by querying the active order
  async function checkAddressSet() {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `
            query CheckShippingAddress {
              activeOrder {
                id
                shippingAddress {
                  streetLine1
                  city
                  postalCode
                  countryCode
                }
              }
            }
          `,
        }),
      });

      const json = await res.json();
      const shippingAddress = json.data?.activeOrder?.shippingAddress;
      
      // Consider address set if we have at least street and city
      addressSet = !!(shippingAddress?.streetLine1 && shippingAddress?.city);
      
      if (addressSet) {
        await fetchShippingMethods();
      }
    } catch (err) {
      console.error('Failed to check address:', err);
    }
  }

  onMount(() => {
    checkAddressSet();
    
    // Listen for address form submission to refresh shipping methods
    const handleAddressSet = () => {
      addressSet = true;
      fetchShippingMethods();
    };
    
    window.addEventListener('shipping-address-set', handleAddressSet);
    
    return () => {
      window.removeEventListener('shipping-address-set', handleAddressSet);
    };
  });

  // Public method to refresh shipping methods
  export function refresh() {
    if (addressSet) {
      fetchShippingMethods();
    } else {
      checkAddressSet();
    }
  }
</script>

<div class="shipping-selector">
  {#if !addressSet}
    <p class="text-gray-500 italic">{mergedLabels.addressRequired}</p>
  {:else if loading}
    <p class="text-gray-500">{mergedLabels.loading}</p>
  {:else if error}
    <div class="text-red-500 text-sm mb-2">{error}</div>
  {:else if shippingMethods.length === 0}
    <p class="text-gray-500">{mergedLabels.noMethods}</p>
  {:else}
    <fieldset>
      <legend class="sr-only">{mergedLabels.selectShipping}</legend>
      <div class="flex flex-col gap-2">
        {#each shippingMethods as method (method.id)}
          <label 
            class="flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50 transition-colors"
            class:bg-blue-50={selectedMethodId === method.id}
            class:border-blue-500={selectedMethodId === method.id}
          >
            <input
              type="radio"
              name="shipping-method"
              value={method.id}
              checked={selectedMethodId === method.id}
              onchange={handleSelection}
              class="w-4 h-4"
            />
            <div class="flex-1">
              <div class="font-medium">{method.name}</div>
              {#if method.description}
                <div class="text-sm text-gray-500">{method.description}</div>
              {/if}
            </div>
            <div class="font-medium">{formatPrice(method.priceWithTax)}</div>
          </label>
        {/each}
      </div>
    </fieldset>
  {/if}
</div>

<style>
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
</style>
