import { defineDashboardExtension } from '@vendure/dashboard';
import { CalendarIcon } from 'lucide-react';
import { workshopDetail } from './workshop-detail';
import { workshopList } from './workshop-list';

// WorkshopEvent's list/detail routes (nested under a Workshop's detail page)
// are added in a later slice, on top of this Workshop CRUD scaffolding.
defineDashboardExtension({
    navSections: [
        {
            id: 'workshops',
            title: 'Workshops',
            icon: CalendarIcon,
            order: 250,
        },
    ],
    routes: [workshopList, workshopDetail],
});
