<script lang="ts">
  import { z } from 'zod';
  import FormSection from './FormSection.svelte';
  import { onMount } from 'svelte';

  interface Props {
    endpoint?: string;
    labels: {
      firstName: string;
      lastName: string;
      emailAddress: string;
      phoneNumber: string;
    };
    initialData?: ContactData;
    onSuccess?: (data: ContactData) => void;
  }

  let { endpoint, labels, initialData, onSuccess }: Props = $props();

  const schema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    emailAddress: z.string().email('Invalid email address'),
    phoneNumber: z.string().min(1, 'Phone number is required'),
  });

  type ContactData = z.infer<typeof schema>;

  let committed = $state<ContactData | null>(null);
  let errors = $state<Record<string, string>>({});
  let formError = $state<string | null>(null);
  let submitting = $state(false);

  let form = $state<ContactData>(initialData ?? {
    firstName: '',
    lastName: '',
    emailAddress: '',
    phoneNumber: '',
  });

  onMount(() => {
    const handler = (e: CustomEvent<ContactData>) => {
      form = { ...e.detail };
    };
    window.addEventListener('fill-contact-form', handler as EventListener);
    return () => window.removeEventListener('fill-contact-form', handler as EventListener);
  });

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
            mutation SetCustomerForOrder($input: CreateCustomerInput!) {
              setCustomerForOrder(input: $input) {
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

      const data = json.data?.setCustomerForOrder;
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
  export function setInitialData(data: ContactData) {
    form = { ...data };
    committed = data;
  }
</script>

<FormSection {committed} onEdit={editMode}>
  {#snippet committedView(data)}
    <p class="font-medium">{data.firstName} {data.lastName}</p>
    <p class="text-gray-600">{data.emailAddress}</p>
    <p class="text-gray-600">{data.phoneNumber}</p>
  {/snippet}

  <form onsubmit={handleSubmit} class="flex flex-col gap-2">
    {#if formError}
      <div class="text-red-500 text-sm mb-2">{formError}</div>
    {/if}

    <div class="flex flex-col">
      <label for="firstName">{labels.firstName}</label>
      <input id="firstName" bind:value={form.firstName} name="firstName" class="border p-1" />
      {#if errors.firstName}<span class="text-red-500 text-sm">{errors.firstName}</span>{/if}
    </div>

    <div class="flex flex-col">
      <label for="lastName">{labels.lastName}</label>
      <input id="lastName" bind:value={form.lastName} name="lastName" class="border p-1" />
      {#if errors.lastName}<span class="text-red-500 text-sm">{errors.lastName}</span>{/if}
    </div>

    <div class="flex flex-col">
      <label for="emailAddress">{labels.emailAddress}</label>
      <input id="emailAddress" bind:value={form.emailAddress} name="emailAddress" type="email" class="border p-1" />
      {#if errors.emailAddress}<span class="text-red-500 text-sm">{errors.emailAddress}</span>{/if}
    </div>

    <div class="flex flex-col">
      <label for="phoneNumber">{labels.phoneNumber}</label>
      <input id="phoneNumber" bind:value={form.phoneNumber} name="phoneNumber" type="tel" class="border p-1" />
      {#if errors.phoneNumber}<span class="text-red-500 text-sm">{errors.phoneNumber}</span>{/if}
    </div>

    <button 
      type="submit" 
      disabled={submitting}
      class="mt-4 cursor-pointer border px-4 py-2 hover:bg-gray-100 disabled:opacity-50"
    >
      {submitting ? 'Saving...' : 'Save Contact'}
    </button>
  </form>
</FormSection>
