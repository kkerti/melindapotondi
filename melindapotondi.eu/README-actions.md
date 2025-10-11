# Newsletter Subscription Action

This project uses Astro Actions with built-in Zod validation for newsletter subscriptions via the Brevo API.

## Setup

### 1. Environment Variables

Add these to your `.env` file:

```env
BREVO_API_KEY=your_brevo_api_key_here
BREVO_LIST_IDS=[1,2,3]  # JSON array of list IDs (optional)
```

### 2. Action Definition

The action is defined in `src/actions/index.ts`:

```typescript
import { defineAction } from 'astro:actions';
import { z } from 'astro:schema';

const subscribeToNewsletter = defineAction({
  input: z.object({
    email: z.string().email().transform(email => email.trim().toLowerCase()),
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
  }),
  handler: async ({ email, firstName, lastName }) => {
    // Calls Brevo API
  }
});
```

## Usage

### Option 1: Using the Reusable Component

Import and use the `NewsletterForm` component:

```astro
---
import NewsletterForm from '../components/NewsletterForm.astro';
---

<Layout>
  <NewsletterForm class="max-w-md mx-auto" />
</Layout>
```

### Option 2: Server-Side Form Action

```astro
---
import { actions } from 'astro:actions';

if (Astro.request.method === 'POST') {
  const result = await actions.subscribeToNewsletter(Astro.request);
  
  if (result.data) {
    console.log('Success:', result.data);
  } else {
    console.error('Error:', result.error);
  }
}
---

<form method="POST">
  <input type="email" name="email" required />
  <input type="text" name="firstName" />
  <input type="text" name="lastName" />
  <button type="submit">Subscribe</button>
</form>
```

### Option 3: Client-Side JavaScript

```javascript
// Using fetch to call the action endpoint
const response = await fetch('/_actions/subscribeToNewsletter', {
  method: 'POST',
  body: new FormData(form)
});

const result = await response.json();

if (response.ok && result.success) {
  console.log('Subscribed:', result.message);
} else {
  console.error('Error:', result.message);
}
```

## Validation

The action automatically validates:

- **Email**: Required, valid format, max 254 characters, normalized (lowercase, trimmed)
- **Names**: Optional, 1-50 characters, valid characters only (letters, spaces, hyphens, apostrophes)
- **International Support**: Supports accented characters (À-ÿ, Ā-ž, А-я)

## Error Handling

Validation errors are returned with detailed messages:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "email": ["Invalid email address format"],
    "firstName": ["Name is too long"]
  }
}
```

## Features

- ✅ **Built-in Zod validation** with Astro's `z` from `astro:schema`
- ✅ **Type-safe** with full TypeScript support
- ✅ **Automatic data transformation** (email normalization)
- ✅ **International character support** in names
- ✅ **Minimal setup** - no external validation libraries needed
- ✅ **Production ready** with proper error handling
- ✅ **Brevo API integration** with configurable list IDs