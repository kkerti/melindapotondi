import { ActionError, defineAction } from 'astro:actions';
import { BREVO_API_KEY, BREVO_API_URL } from 'astro:env/server';
import { z } from 'astro:schema';

const subscribeToNewsletter = defineAction({
    accept: 'form',
    input: z.object({
        email: z
        .string()
        .email({ message: 'Invalid email address format' })
        .min(1, { message: 'Email address is required' })
        .max(254, { message: 'Email address is too long' })
        .transform((email) => email.trim().toLowerCase()),
        entry:
            z.string()
            .optional(),
        lang: 
            z.string()
            .length(2, {message: 'Lang must use ISO-2 standard'}),
        firstName: z
        .string()
        .min(1, { message: 'First name cannot be empty' })
        .max(50, { message: 'First name is too long' })
        .regex(/^[a-zA-ZÀ-ÿĀ-žА-я\s'-]+$/, { 
            message: 'First name contains invalid characters' 
        })
        .transform((name) => name.trim())
        .optional(),
        lastName: z
        .string()
        .min(1, { message: 'Last name cannot be empty' })
        .max(50, { message: 'Last name is too long' })
        .regex(/^[a-zA-ZÀ-ÿĀ-žА-я\s'-]+$/, { 
            message: 'Last name contains invalid characters' 
        })
        .transform((name) => name.trim())
        .optional(),
    }),
    handler: async ({ email, firstName, lastName, lang, entry }) => { 

        if (!BREVO_API_KEY) {
            throw new Error('Brevo API key is not configured');
        }

        // Prepare Brevo request
        const brevoRequest: any = {
            email,
            updateEnabled: true,
        };

        // Add attributes if provided
        if (firstName || lastName || lang || entry) {
            brevoRequest.attributes = {};
            if (firstName) brevoRequest.attributes.FIRSTNAME = firstName;
            if (lastName) brevoRequest.attributes.LASTNAME = lastName;
            if (lang) brevoRequest.attributes.LANG = lang;
            if (entry) brevoRequest.attributes.ENTRY = entry;
        }

        // Call Brevo API
        const response = await fetch(`${BREVO_API_URL}/contacts`, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': BREVO_API_KEY,
                'content-type': 'application/json'
            },
            body: JSON.stringify(brevoRequest)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            
            // Handle specific Brevo errors
            if (response.status === 400 && errorData.code === 'duplicate_parameter') {
                throw new ActionError({
                    code: "BAD_REQUEST", 
                    message: 'Already subscribed with this email address'
                });
            }
            
            throw new ActionError({
                code: "EXPECTATION_FAILED", 
                message: errorData.message || 'Failed to subscribe to newsletter'
            });
        }

        return {
            success: true,
            message: response.status === 204 ? "Contact updated" : "Contact created",
            email,
        };
    }
});

export const server = {
  subscribeToNewsletter,
};