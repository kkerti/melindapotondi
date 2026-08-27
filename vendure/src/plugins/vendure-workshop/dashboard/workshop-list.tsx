import { Button, DashboardRouteDefinition, DetailPageButton, ListPage, PageActionBarRight } from '@vendure/dashboard';
import { Link } from '@tanstack/react-router';
import { PlusIcon } from 'lucide-react';
import { deleteWorkshopDocument, workshopListDocument } from './workshop.graphql';

export const workshopList: DashboardRouteDefinition = {
    path: '/workshops',
    navMenuItem: {
        sectionId: 'workshops',
        id: 'workshops',
        url: '/workshops',
        title: 'Workshops',
    },
    loader: () => ({ breadcrumb: 'Workshops' }),
    component: route => (
        <ListPage
            pageId="workshop-list"
            title="Workshops"
            listQuery={workshopListDocument}
            deleteMutation={deleteWorkshopDocument}
            route={route}
            customizeColumns={{
                title: {
                    cell: ({ row }) => <DetailPageButton id={row.original.id} label={row.original.title} />,
                },
            }}
        >
            <PageActionBarRight>
                <Button asChild>
                    <Link to="./new">
                        <PlusIcon className="mr-2 h-4 w-4" />
                        New workshop
                    </Link>
                </Button>
            </PageActionBarRight>
        </ListPage>
    ),
};
