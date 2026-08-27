import { defineDashboardExtension } from '@vendure/dashboard';
import { CalendarIcon } from 'lucide-react';
import { workshopDetail } from './workshop-detail';
import { workshopEventDetail } from './workshop-event-detail';
import { workshopList } from './workshop-list';

// WorkshopEvent has no standalone list route or nav entry - its events are only ever
// reached via the nested list on their parent Workshop's detail page (see
// workshop-event-list.tsx), matching the core dashboard's own `tax-categories_.$id.tsx`
// convention for detail-only routes.
defineDashboardExtension({
    navSections: [
        {
            id: 'workshops',
            title: 'Workshops',
            icon: CalendarIcon,
            order: 250,
        },
    ],
    routes: [workshopList, workshopDetail, workshopEventDetail],
});
