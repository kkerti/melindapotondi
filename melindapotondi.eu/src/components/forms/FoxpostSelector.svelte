<script lang="ts">
  import L from 'leaflet';

  interface FoxpostPoint {
    place_id: number;
    operator_id: string;
    name: string;
    address: string;
    zip: string;
    city: string;
    street: string;
    geolat: number;
    geolong: number;
  }

  interface Props {
    onSelect?: (point: FoxpostPoint) => void;
  }

  let { onSelect }: Props = $props();

  let postalCode = $state('');
  let points = $state<FoxpostPoint[]>([]);
  let filtered = $state<FoxpostPoint[]>([]);
  let selected = $state<FoxpostPoint | null>(null);
  let loading = $state(false);
  let error = $state<string | null>(null);
  
  let mapContainer: HTMLDivElement;
  let map: L.Map | null = null;
  let marker: L.Marker | null = null;

  async function loadPoints() {
    if (points.length > 0) return;
    loading = true;
    error = null;
    try {
      const res = await fetch('https://cdn.foxpost.hu/foxplus.json');
      points = await res.json();
    } catch {
      error = 'Failed to load pickup points';
    } finally {
      loading = false;
    }
  }

  function filterByPostalCode() {
    if (!postalCode || postalCode.length < 2) {
      filtered = [];
      return;
    }
    
    // Sort by postal code proximity (exact match first, then prefix match, then others)
    filtered = points
      .filter(p => p.zip)
      .sort((a, b) => {
        const aExact = a.zip === postalCode;
        const bExact = b.zip === postalCode;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        const aPrefix = a.zip.startsWith(postalCode.slice(0, 2));
        const bPrefix = b.zip.startsWith(postalCode.slice(0, 2));
        if (aPrefix && !bPrefix) return -1;
        if (!aPrefix && bPrefix) return 1;
        
        return Math.abs(parseInt(a.zip) - parseInt(postalCode)) - 
               Math.abs(parseInt(b.zip) - parseInt(postalCode));
      })
      .slice(0, 20);
  }

  function handleSelect(point: FoxpostPoint) {
    selected = point;
    onSelect?.(point);
  }

  $effect(() => {
    if (postalCode) {
      loadPoints().then(filterByPostalCode);
    }
  });


</script>

<div class="foxpost-selector">
  <div class="flex flex-col gap-2">
    <label for="foxpost-zip">Find package point by postal code</label>
    <input 
      id="foxpost-zip"
      type="text" 
      bind:value={postalCode} 
      placeholder="Enter postal code..."
      class="border p-2"
      maxlength="4"
    />
  </div>

  {#if loading}
    <p class="text-gray-500 mt-2">Loading pickup points...</p>
  {/if}

  {#if error}
    <p class="text-red-500 mt-2">{error}</p>
  {/if}

  {#if selected}
    <div class="mt-4 p-3 bg-green-50 border border-green-200 rounded">
      <p class="font-medium">Selected:</p>
      <p>{selected.name}</p>
      <p class="text-sm text-gray-600">{selected.address}</p>
      <button 
        type="button"
        onclick={() => selected = null}
        class="mt-2 text-sm text-blue-600 hover:underline"
      >
        Change
      </button>
    </div>
  {:else if filtered.length > 0}
    <ul class="mt-4 max-h-64 overflow-y-auto border rounded divide-y">
      {#each filtered as point (point.place_id)}
        <li>
          <button
            type="button"
            onclick={() => handleSelect(point)}
            class="w-full text-left p-3 hover:bg-gray-50 cursor-pointer"
          >
            <p class="font-medium text-sm">{point.name}</p>
            <p class="text-xs text-gray-600">{point.address}</p>
          </button>
        </li>
      {/each}
    </ul>
  {:else if postalCode.length >= 2 && !loading}
    <p class="text-gray-500 mt-2">No pickup points found</p>
  {/if}
</div>