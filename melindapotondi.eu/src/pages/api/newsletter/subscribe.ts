// subscribe.ts
// API endpoint to handle newsletter subscriptions via Brevo API

import type { APIRoute } from 'astro';

// Type definitions for Brevo API
interface BrevoSubscribeRequest {
  email: string;
  attributes?: {
    FNAME?: string;
    LNAME?: string;
    [key: string]: any;
  };
  listIds?: number[];
  updateEnabled?: boolean;
}

interface BrevoContact {
  email: string;
  firstName?: string;
  lastName?: string;
}

interface SubscriptionRequestBody {
  email: string;
  firstName?: string;
  lastName?: string;
}

// Validation function
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Function to prepare Brevo API request
function prepareBrevoRequest(contact: BrevoContact): BrevoSubscribeRequest {
  const brevoRequest: BrevoSubscribeRequest = {
    email: contact.email,
    updateEnabled: true,
  };

  // Add attributes if provided
  if (contact.firstName || contact.lastName) {
    brevoRequest.attributes = {};
    if (contact.firstName) {
      brevoRequest.attributes.FNAME = contact.firstName;
    }
    if (contact.lastName) {
      brevoRequest.attributes.LNAME = contact.lastName;
    }
  }

  // Add list IDs from environment variable
  const listIds = import.meta.env.BREVO_LIST_IDS;
  if (listIds) {
    try {
      brevoRequest.listIds = JSON.parse(listIds);
    } catch (error) {
      console.warn('Invalid BREVO_LIST_IDS format, using default empty array');
      brevoRequest.listIds = [];
    }
  }

  return brevoRequest;
}

// Function to call Brevo API (placeholder - actual implementation would make HTTP request)
async function callBrevoAPI(brevoRequest: BrevoSubscribeRequest): Promise<{ success: boolean; error?: string }> {
  const apiKey = import.meta.env.BREVO_API_KEY;
  const apiUrl = 'https://api.brevo.com/v3/contacts';

  if (!apiKey) {
    throw new Error('BREVO_API_KEY not configured');
  }

  try {
    // PLACEHOLDER: This is where you would make the actual HTTP request to Brevo
    // For now, we'll just simulate the API call structure
    console.log('Would call Brevo API with:', {
      url: apiUrl,
      headers: {
        'accept': 'application/json',
        'api-key': '***REDACTED***',
        'content-type': 'application/json'
      },
      body: brevoRequest
    });

    // Simulate API response
    // In real implementation, replace this with actual fetch call:
    /*
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify(brevoRequest)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to subscribe to newsletter');
    }

    return { success: true };
    */

    // Simulate successful response for now
    return { success: true };
    
  } catch (error) {
    console.error('Brevo API error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse request body
    let body: SubscriptionRequestBody;
    
    try {
      body = await request.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate required fields
    if (!body.email) {
      return new Response(
        JSON.stringify({ error: 'Email address is required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate email format
    if (!validateEmail(body.email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address format' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Prepare contact data
    const contact: BrevoContact = {
      email: body.email.trim().toLowerCase(),
      firstName: body.firstName?.trim(),
      lastName: body.lastName?.trim(),
    };

    // Prepare Brevo API request
    const brevoRequest = prepareBrevoRequest(contact);

    // Call Brevo API
    const result = await callBrevoAPI(brevoRequest);

    if (result.success) {
      return new Response(
        JSON.stringify({ 
          message: 'Successfully subscribed to newsletter!',
          email: contact.email
        }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } else {
      return new Response(
        JSON.stringify({ error: result.error || 'Failed to subscribe to newsletter' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    console.error('Newsletter subscription error:', error);
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};