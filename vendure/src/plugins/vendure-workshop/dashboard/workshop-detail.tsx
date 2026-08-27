import { DashboardRouteDefinition, DetailPage, detailPageRouteLoader } from '@vendure/dashboard';
import { createWorkshopDocument, updateWorkshopDocument, workshopDetailDocument } from './workshop.graphql';

export const workshopDetail: DashboardRouteDefinition = {
    path: '/workshops/$id',
    loader: detailPageRouteLoader({
        queryDocument: workshopDetailDocument,
        breadcrumb: (isNew, entity) => [
            { path: '/workshops', label: 'Workshops' },
            isNew ? 'New workshop' : entity?.title,
        ],
    }),
    component: route => (
        <DetailPage
            pageId="workshop-detail"
            queryDocument={workshopDetailDocument}
            createDocument={createWorkshopDocument}
            updateDocument={updateWorkshopDocument}
            route={route}
            title={w => w?.title ?? 'New workshop'}
            setValuesForUpdate={w => ({
                id: w.id,
                title: w.title,
                description: w.description,
                slug: w.slug,
                defaultDurationMinutes: w.defaultDurationMinutes,
                defaultCapacity: w.defaultCapacity,
                defaultPriceInCents: w.defaultPriceInCents,
                isActive: w.isActive,
            })}
        />
    ),
};
