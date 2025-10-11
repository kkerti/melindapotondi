# Centralized Translation System

## Overview

The translation system has been refactored to use a single, centralized `t` function instead of duplicating the translation logic across multiple components.

## New Architecture

### Before (Duplicated Code)
Each component had its own `t` function implementation:

```astro
---
import { getLangFromUrl, loadTranslations } from '../i18n';

const lang = getLangFromUrl(Astro.url);
const translations = await loadTranslations(lang);

// Duplicated in every component
function t(key: string): string {
  const keys = key.split('.');
  let value = translations;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return key;
    }
  }
  
  return typeof value === 'string' ? value : key;
}
---
```

### After (Centralized Function)
Single import with ready-to-use translation function:

```astro
---
import { createTranslationFunction } from '../i18n';

const t = await createTranslationFunction(Astro.url);
---
```

## Updated i18n Functions

### `createTranslationFunction(url: URL)`
Creates a translation function for a specific URL context:

```typescript
export async function createTranslationFunction(url: URL): Promise<(key: string) => string> {
  const lang = getLangFromUrl(url);
  const translations = await loadTranslations(lang);
  
  return (key: string): string => {
    return t(translations, key);
  };
}
```

## Benefits

### 1. **DRY (Don't Repeat Yourself)**
- No more duplicated translation logic
- Single source of truth for translation implementation
- Consistent behavior across all components

### 2. **Maintainability**
- Changes to translation logic only need to be made in one place
- Easier to debug and test
- Reduced code complexity in components

### 3. **Performance**
- Slightly better performance (no function re-definition per component)
- More efficient memory usage
- Consistent caching behavior

### 4. **Type Safety**
- Better TypeScript support
- Consistent return types
- Centralized error handling

## Usage Examples

### In Components
```astro
---
import { createTranslationFunction } from '../i18n';

const t = await createTranslationFunction(Astro.url);
---

<h1>{t('pages.home.title')}</h1>
<p>{t('pages.home.description')}</p>
<button>{t('ui.buttons.submit')}</button>
```

### In Layouts
```astro
---
import { getLangFromUrl, createTranslationFunction } from '../i18n';

const lang = getLangFromUrl(Astro.url);
const t = await createTranslationFunction(Astro.url);

const pageTitle = title || t('meta.siteTitle');
---
```

## Refactored Components

The following components have been updated:

- ✅ **NewsletterForm.astro** - Newsletter subscription form
- ✅ **Navigation.astro** - Main navigation component  
- ✅ **Button.astro** - Reusable button component
- ✅ **Hero.astro** - Hero section component
- ✅ **Layout.astro** - Main layout component

## Migration Guide

### For Existing Components:

**Old Pattern:**
```astro
---
import { getLangFromUrl, loadTranslations } from '../i18n';

const lang = getLangFromUrl(Astro.url);
const translations = await loadTranslations(lang);

function t(key: string): string {
  // ... duplicate implementation
}
---
```

**New Pattern:**
```astro
---
import { createTranslationFunction } from '../i18n';

const t = await createTranslationFunction(Astro.url);
---
```

### For New Components:

Simply import and use the centralized function:

```astro
---
import { createTranslationFunction } from '../i18n';

const t = await createTranslationFunction(Astro.url);
---

<div>
  <h2>{t('component.title')}</h2>
  <p>{t('component.description')}</p>
</div>
```

## Alternative Functions

The i18n system still provides other translation utilities for specific use cases:

### `useTranslations(url)` - For Hook-like Usage
```javascript
const { lang, t, createT } = useTranslations(Astro.url);
```

### `t(translations, key)` - For Direct Usage
```javascript
const translations = await loadTranslations('en');
const text = t(translations, 'ui.buttons.submit');
```

## Backward Compatibility

The existing `loadTranslations` and `t` functions remain available for specific use cases, ensuring no breaking changes for advanced implementations.