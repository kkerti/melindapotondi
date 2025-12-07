<script lang="ts">
  import { z } from 'zod';
  import FormSection from './FormSection.svelte';

  interface Props {
    endpoint: string;
    labels: {
      streetLine1: string;
      streetLine2: string;
      city: string;
      province: string;
      postalCode: string;
      country: string;
    };
    countries?: { code: string; name: string }[];
    onSuccess?: (data: AddressData) => void;
  }

  let { 
    endpoint, 
    labels, 
    countries = [
      { code: 'HU', name: 'Hungary' },
      { code: 'AT', name: 'Austria' },
      { code: 'DE', name: 'Germany' },
    ],
    onSuccess 
  }: Props = $props();

  const schema = z.object({
    streetLine1: z.string().min(1, 'Street address is required'),
    streetLine2: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    province: z.string().optional(),
    postalCode: z.string().min(1, 'Postal code is required'),
    countryCode: z.string().min(1, 'Country is required'),
  });

  type AddressData = z.infer<typeof schema>;

  let committed = $state<AddressData | null>(null);
  let errors = $state<Record<string, string>>({});
  let formError = $state<string | null>(null);
  let submitting = $state(false);

  let form = $state<AddressData>({
    streetLine1: '',
    streetLine2: '',
    city: '',
    province: '',
    postalCode: '',
    countryCode: '',
  });

  function getCountryName(code: string): string {
    return countries.find(c => c.code === code)?.name || code;
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    errors = {};
    formError = null;

    const result = schema.safeParse(form);

    if (!result.success) {
      errors = Object.fromEntries(
        result.error.issues.map((i) => [i.path[0], i.message])
      );
      return;
    }

    submitting = true;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `
            mutation SetShippingAddress($input: CreateAddressInput!) {
              setOrderShippingAddress(input: $input) {
                ... on Order { id }
                ... on ErrorResult { errorCode message }
              }
            }
          `,
          variables: { input: result.data },
        }),
      });

      const json = await res.json();

      if (json.errors) {
        formError = json.errors[0]?.message || 'An error occurred';
        return;
      }

      const data = json.data?.setOrderShippingAddress;
      if (data?.__typename?.includes('Error')) {
        formError = data.message || data.errorCode;
        return;
      }

      committed = result.data;
      onSuccess?.(result.data);
    } catch (err) {
      formError = 'Network error. Please try again.';
      console.error(err);
    } finally {
      submitting = false;
    }
  }

  function editMode() {
    committed = null;
  }

  // Public method to set initial data
  export function setInitialData(data: AddressData) {
    form = { ...data };
    committed = data;
  }
</script>

<FormSection {committed} onEdit={editMode}>
  {#snippet committedView(data)}
    <p>{data.streetLine1}</p>
    {#if data.streetLine2}<p>{data.streetLine2}</p>{/if}
    <p>{data.city}{data.province ? `, ${data.province}` : ''} {data.postalCode}</p>
    <p>{getCountryName(data.countryCode)}</p>
  {/snippet}

  <form onsubmit={handleSubmit} class="flex flex-col gap-2">
    {#if formError}
      <div class="text-red-500 text-sm mb-2">{formError}</div>
    {/if}

    <div class="flex flex-col">
      <label>{labels.streetLine1}</label>
      <input bind:value={form.streetLine1} class="border p-1" />
      {#if errors.streetLine1}<span class="text-red-500 text-sm">{errors.streetLine1}</span>{/if}
    </div>

    <div class="flex flex-col">
      <label>{labels.streetLine2}</label>
      <input bind:value={form.streetLine2} class="border p-1" />
      {#if errors.streetLine2}<span class="text-red-500 text-sm">{errors.streetLine2}</span>{/if}
    </div>

    <div class="flex flex-col">
      <label>{labels.city}</label>
      <input bind:value={form.city} class="border p-1" />
      {#if errors.city}<span class="text-red-500 text-sm">{errors.city}</span>{/if}
    </div>

    <div class="flex flex-col">
      <label>{labels.province}</label>
      <input bind:value={form.province} class="border p-1" />
      {#if errors.province}<span class="text-red-500 text-sm">{errors.province}</span>{/if}
    </div>

    <div class="flex flex-col">
      <label>{labels.postalCode}</label>
      <input bind:value={form.postalCode} class="border p-1" />
      {#if errors.postalCode}<span class="text-red-500 text-sm">{errors.postalCode}</span>{/if}
    </div>

    <div class="flex flex-col">
      <label>{labels.country}</label>
      <select bind:value={form.countryCode} class="border p-1">
        <option value="">Select country</option>
        {#each countries as country}
          <option value={country.code}>{country.name}</option>
        {/each}
      </select>
      {#if errors.countryCode}<span class="text-red-500 text-sm">{errors.countryCode}</span>{/if}
    </div>

    <button 
      type="submit" 
      disabled={submitting}
      class="mt-4 cursor-pointer border px-4 py-2 hover:bg-gray-100 disabled:opacity-50"
    >
      {submitting ? 'Saving...' : 'Save Address'}
    </button>
  </form>
</FormSection>
