<script lang="ts">
    import { initiateBarionPayment, redirectToBarion } from './payment';
    import { cart } from './cart';
    
    let isLoading = false;
    let errorMessage = '';
    
    async function handlePayWithBarion() {
        isLoading = true;
        errorMessage = '';
        
        try {
            const result = await initiateBarionPayment();
            
            if (result.success && result.gatewayUrl) {
                // Redirect to Barion payment page
                redirectToBarion(result.gatewayUrl);
            } else {
                errorMessage = result.errorMessage || 'Payment initialization failed';
            }
        } catch (error) {
            errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        } finally {
            isLoading = false;
        }
    }
    
    $: hasItems = $cart && $cart.lines && $cart.lines.length > 0;
</script>

<div class="barion-payment">
    {#if errorMessage}
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>{errorMessage}</p>
        </div>
    {/if}
    
    <button
        on:click={handlePayWithBarion}
        disabled={isLoading || !hasItems}
        class="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold
               hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed
               transition-colors duration-200 flex items-center justify-center gap-2"
    >
        {#if isLoading}
            <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Processing...</span>
        {:else}
            <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
            </svg>
            <span>Pay with Barion</span>
        {/if}
    </button>
    
    <p class="text-sm text-gray-500 mt-2 text-center">
        You will be redirected to Barion to complete the payment securely.
    </p>
</div>
