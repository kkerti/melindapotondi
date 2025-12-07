<script lang="ts" generics="T extends Record<string, any>">
  import type { Snippet } from 'svelte';
  
  interface Props {
    committed: T | null;
    onEdit: () => void;
    editButtonLabel?: string;
    committedView: Snippet<[T]>;
    children: Snippet;
  }

  let { 
    committed, 
    onEdit, 
    editButtonLabel = 'Edit',
    committedView,
    children 
  }: Props = $props();
</script>

{#if committed}
  <div class="committed-view bg-gray-50 p-4 rounded">
    {@render committedView(committed)}
    <button 
      type="button" 
      onclick={onEdit}
      class="mt-3 cursor-pointer border px-3 py-1 hover:bg-gray-100"
    >
      {editButtonLabel}
    </button>
  </div>
{:else}
  {@render children()}
{/if}
