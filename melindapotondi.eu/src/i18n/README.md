# i18n Setup for Melinda Potondi Website

This project uses a custom i18n implementation with Hungarian (HU) as the default language and English (EN) as an alternative.

## Directory Structure

```
src/
├── i18n/
│   ├── index.ts              # i18n utilities and functions
│   └── locales/
│       ├── hu.json           # Hungarian translations
│       └── en.json           # English translations
├── pages/
│   ├── index.astro           # Hungarian home page (/)
│   ├── about.astro           # Hungarian about page (/about)
│   └── en/
│       ├── index.astro       # English home page (/en/)
│       └── about.astro       # English about page (/en/about)
├── components/
│   ├── Navigation.astro      # Multilingual navigation component
│   ├── Button.astro          # Translatable button component
│   └── Hero.astro            # Translatable hero section
└── layouts/
    └── Layout.astro          # Main layout with dynamic locale detection
```

## URL Structure

- **Hungarian (Default)**: `/`, `/about`, `/contact`, `/services`
- **English**: `/en/`, `/en/about`, `/en/contact`, `/en/services`

## How to Use

### 1. Adding New Translations

Add your translation keys to both `src/i18n/locales/hu.json` and `src/i18n/locales/en.json`:

```json
{
  "ui": {
    "navigation": {
      "newPage": "Új Oldal"  // Hungarian
    }
  }
}
```

```json
{
  "ui": {
    "navigation": {
      "newPage": "New Page"  // English
    }
  }
}
```

### 2. Using Translations in Components

In any `.astro` file:

```astro
---
import { getLangFromUrl, loadTranslations } from '../i18n';

const lang = getLangFromUrl(Astro.url);
const translations = await loadTranslations(lang);

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

<h1>{t('ui.navigation.newPage')}</h1>
```

### 3. Creating New Pages

For each new page, create both Hungarian and English versions:

- **Hungarian**: `src/pages/newpage.astro`
- **English**: `src/pages/en/newpage.astro`

### 4. Using the Reusable Components

#### Navigation Component
```astro
<Navigation />
```
Automatically includes language switcher and translated navigation items.

#### Button Component
```astro
<Button 
  textKey="ui.buttons.contact" 
  href="/contact"
  variant="primary"
/>
```

#### Hero Component
```astro
<Hero 
  titleKey="pages.home.title"
  subtitleKey="pages.home.description"
  backgroundImage="/path/to/image.jpg"
>
  <!-- Optional slot content -->
</Hero>
```

### 5. Language Switching

The navigation component automatically includes language switcher buttons. Users can switch between languages, and the system will redirect them to the equivalent page in the selected language.

## Key Features

- ✅ **Automatic locale detection** from URL
- ✅ **Dynamic HTML lang attribute** 
- ✅ **Reusable translation components**
- ✅ **Language switcher with proper redirects**
- ✅ **Fallback to default language** if translations missing
- ✅ **SEO-friendly URL structure**
- ✅ **Tailwind CSS integration**

## Configuration

The i18n configuration is in `astro.config.mjs`:

```javascript
i18n: {
  locales: ["en", "hu"],
  defaultLocale: "hu",
  routing: {
    prefixDefaultLocale: false
  }
}
```

This means:
- Hungarian pages don't have language prefix (`/`)
- English pages have the `/en/` prefix
- Hungarian is the default fallback language