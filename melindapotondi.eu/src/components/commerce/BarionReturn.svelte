<script lang="ts">
    import { VENDURE_SHOP_API_URL } from 'astro:env/client';
    import { onMount } from 'svelte';

    interface Props {
        orderCode: string | null;
    }

    let { orderCode }: Props = $props();

    type PaymentState = 'loading' | 'success' | 'pending' | 'error';
    
    let state = $state<PaymentState>('loading');
    let errorMessage = $state('There was an issue with your payment.');

    onMount(() => {
        if (!orderCode) {
            state = 'error';
            errorMessage = 'No order code provided';
            return;
        }

        // Start checking order status after a brief delay
        setTimeout(checkOrderStatus, 1000);
    });

    async function checkOrderStatus() {
        if (!orderCode) return;
        try {
            const response = await fetch(VENDURE_SHOP_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Only the workshops channel is live right now, so this is hardcoded.
                    // Once the physical-goods shop reopens, this needs to pick the right
                    // channel token per order type instead of assuming "workshops".
                    'vendure-token': 'workshops',
                },
                credentials: 'include',
                body: JSON.stringify({
                    query: `
                        query GetOrderByCode($code: String!) {
                            orderByCode(code: $code) {
                                id
                                code
                                state
                                payments {
                                    id
                                    state
                                    method
                                }
                            }
                        }
                    `,
                    variables: { code: orderCode },
                }),
            });


            const result = await response.json();
            const order = result.data?.orderByCode;

            if (!order) {
                // Order not found yet, keep polling
                setTimeout(checkOrderStatus, 2000);
                return;
            }

            // Check payment status
            const barionPayment = order.payments?.find((p: { method: string }) => p.method === 'barion');

            if (barionPayment?.state === 'Settled') {
                state = 'success';
            } else if (barionPayment?.state === 'Authorized') {
                // Payment authorized but not yet settled (waiting for webhook)
                state = 'pending';
            } else if (barionPayment?.state === 'Error' || barionPayment?.state === 'Declined') {
                state = 'error';
                errorMessage = 'Your payment was declined or failed.';
            } else {
                // Keep polling for a while
                setTimeout(checkOrderStatus, 2000);
            }
        } catch (error) {
            console.error('Error checking order status:', error);
            state = 'error';
            errorMessage = 'Failed to check payment status';
        }
    }
</script>

<div class="min-h-[60vh] flex items-center justify-center p-4">
    <div class="max-w-md w-full text-center">
        {#if state === 'loading'}
            <div class="space-y-4">
                <div class="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
                <h1 class="text-2xl font-bold text-gray-800">Processing Payment</h1>
                <p class="text-gray-600">Please wait while we verify your payment...</p>
            </div>
        {:else if state === 'success'}
            <div class="space-y-4">
                <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                </div>
                <h1 class="text-2xl font-bold text-green-800">Payment Successful!</h1>
                <p class="text-gray-600">Thank you for your order.</p>
                <p class="text-sm text-gray-500">Order code: <span class="font-mono">{orderCode}</span></p>
                <a href="/" class="inline-block mt-4 bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors">
                    Continue Shopping
                </a>
            </div>
        {:else if state === 'pending'}
            <div class="space-y-4">
                <div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
                    <svg class="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </div>
                <h1 class="text-2xl font-bold text-yellow-800">Payment Processing</h1>
                <p class="text-gray-600">Your payment is being processed. You will receive a confirmation email shortly.</p>
                <p class="text-sm text-gray-500">Order code: <span class="font-mono">{orderCode}</span></p>
                <a href="/" class="inline-block mt-4 bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors">
                    Continue Shopping
                </a>
            </div>
        {:else if state === 'error'}
            <div class="space-y-4">
                <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                    <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </div>
                <h1 class="text-2xl font-bold text-red-800">Payment Failed</h1>
                <p class="text-gray-600">{errorMessage}</p>
                <a href="/checkout" class="inline-block mt-4 bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors">
                    Try Again
                </a>
            </div>
        {/if}
    </div>
</div>
